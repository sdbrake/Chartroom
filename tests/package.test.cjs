'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const modulePath = path.resolve(__dirname, '../src/package.js');
function pkg() { assert.ok(fs.existsSync(modulePath), 'Offline packaging module exists'); return require(modulePath); }
const sample = () => ({format:'chartroom-studio',version:1,course:{title:'Test course',code:''},lectures:[{id:'lecture-1',title:'Test',notes:'# Test\n## Fact\n- Words.',available:true}],assets:[]});
test('ZIP rejects traversal, Windows-dangerous names and duplicate paths', () => {
  for (const name of ['../out','/out','C:/out','a/../out','a\\out','a//out','CON.txt','x.','x:bad']) {
    assert.throws(() => pkg().zip([{path:name,data:'x'}]), /path/i, name);
  }
  assert.throws(() => pkg().zip([{path:'x',data:'a'},{path:'X',data:'b'}]), /duplicate/i);
});
test('project import validates version, types, identifiers, uniqueness and limits', () => {
  assert.equal(typeof pkg().validateProject, 'function');
  assert.deepEqual(pkg().validateProject(sample()), {...sample(),course:{...sample().course,palette:'classic'}});
  for (const change of [p=>p.version=2,p=>p.lectures[0].id='../evil',p=>p.lectures.push(p.lectures[0]),p=>p.course.title=null,p=>p.lectures[0].notes=42,p=>p.assets.push({lectureId:'absent',path:'x.png',mime:'image/png',data:'x'})]) {
    const project = sample(); change(project); assert.throws(()=>pkg().validateProject(project));
  }
});
test('image data must match an allowed raster MIME signature and safe file path', () => {
  const project = sample();
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  project.assets.push({lectureId:'lecture-1',path:'images/a.png',mime:'image/png',data:png});
  assert.equal(pkg().validateProject(project).assets[0].data,png);
  project.assets[0].data = Buffer.from('<script>evil()</script>').toString('base64');
  assert.throws(()=>pkg().validateProject(project), /image|signature/i);
  project.assets[0].data=png; project.assets[0].path='../a.png';
  assert.throws(()=>pkg().validateProject(project), /path/i);
});
test('course export blocks syntax errors and missing assets, and omits private notes from student files', () => {
  assert.equal(typeof pkg().build,'function','Shared export pipeline exists');
  const project = sample();
  project.lectures[0].notes += '\n%%PRIVATE ANSWER FOR TEACHER%%';
  project.lectures.push({id:'soon',title:'Next lecture',notes:'',available:false});
  const result = pkg().build(project,'student');
  assert.ok(result.files.find(f=>f.path==='index.html'));
  assert.ok(!result.files.some(f=>String(f.data).includes('PRIVATE ANSWER')));
  assert.match(result.files[0].data,/Next lecture/);
  const teaching = pkg().build(project,'teaching');
  assert.ok(teaching.files.some(f=>f.path==='lectures/lecture-1/index.html'));
  project.lectures[0].notes+='\n## Figure @img images/missing.png\n@alt A missing image';
  assert.throws(()=>pkg().build(project,'student'),/missing/i);
  project.lectures[0].notes='# Test\n## Wrong @bogus';
  assert.throws(()=>pkg().build(project,'student'),/error|unknown|unsupported/i);
});
test('ZIP writer creates deterministic, UTF-8, uncompressed records for text and binary', () => {
  const p = pkg();
  const bytes = p.zip([{path:'café.txt',data:'Exact words — unchanged.'},{path:'images/pixel.png',data:new Uint8Array([0,1,255])}]);
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(Buffer.from(bytes).readUInt32LE(0),0x04034b50);
  assert.deepEqual(bytes,p.zip([{path:'café.txt',data:'Exact words — unchanged.'},{path:'images/pixel.png',data:new Uint8Array([0,1,255])}]));
  fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'artifacts/zip-roundtrip.zip'),bytes);
});
