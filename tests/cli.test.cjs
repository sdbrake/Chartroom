'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(__dirname, '.cli-'));
  t.after(() => fs.rmSync(dir, {recursive:true, force:true}));
  return dir;
}
function run(args, cwd=root) {
  return spawnSync(process.execPath, [path.join(root, 'cli.cjs'), ...args], {cwd, encoding:'utf8'});
}
const source = '# A lecture\n\n## A point\n- Exact **words**.\n%%PRIVATE_SENTINEL%%\n';
function project(notes=source) {
  return {format:'chartroom-studio',version:1,course:{title:'Course',code:'C1'},lectures:[{id:'lecture-1',title:'A lecture',notes,available:true}],assets:[]};
}
test('force rejects linked or directory output targets before writing any archive', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'project.json'),JSON.stringify(project()));
  fs.mkdirSync(path.join(dir,'real')); fs.symlinkSync(path.join(dir,'real'),path.join(dir,'linked'),process.platform === 'win32' ? 'junction' : 'dir');
  let result = run(['build','project.json','--out','linked','--force'],dir);
  assert.equal(result.status,1); assert.match(result.stderr,/symbolic|junction|link/i);
  assert.deepEqual(fs.readdirSync(path.join(dir,'real')),[]);
  fs.mkdirSync(path.join(dir,'out')); fs.writeFileSync(path.join(dir,'keep.txt'),'keep');
  fs.linkSync(path.join(dir,'keep.txt'),path.join(dir,'out','student.zip'));
  result = run(['build','project.json','--out','out','--force'],dir);
  assert.equal(result.status,1); assert.match(result.stderr,/link/i);
  assert.equal(fs.readFileSync(path.join(dir,'keep.txt'),'utf8'),'keep');
  assert.equal(fs.existsSync(path.join(dir,'out','teaching.zip')),false);
  fs.unlinkSync(path.join(dir,'out','student.zip')); fs.mkdirSync(path.join(dir,'out','student.zip'));
  result = run(['build','project.json','--out','out','--force'],dir);
  assert.equal(result.status,1); assert.equal(fs.existsSync(path.join(dir,'out','teaching.zip')),false);
});
test('force cannot overwrite the source project when its name collides with a report', t => {
  const dir = fixture(t); const text = JSON.stringify(project()); fs.writeFileSync(path.join(dir,'checks.json'),text);
  const result = run(['build','checks.json','--out','.','--force'],dir);
  assert.equal(result.status,1); assert.match(result.stderr,/input|source/i);
  assert.equal(fs.readFileSync(path.join(dir,'checks.json'),'utf8'),text);
  assert.deepEqual(fs.readdirSync(dir),['checks.json']);
});
test('markdown build rejects images escaping the notes directory through a junction', t => {
  const dir = fixture(t); fs.mkdirSync(path.join(dir,'notes')); fs.mkdirSync(path.join(dir,'outside'));
  fs.writeFileSync(path.join(dir,'outside','secret.png'), Buffer.from([137,80,78,71,13,10,26,10]));
  fs.symlinkSync(path.join(dir,'outside'),path.join(dir,'notes','images'),process.platform === 'win32' ? 'junction' : 'dir');
  fs.writeFileSync(path.join(dir,'notes','lecture.md'),'# Title\n## Photo @photo images/secret.png\n@alt Scene\n');
  const result = run(['build','notes/lecture.md','--out','out'],dir);
  assert.equal(result.status,1); assert.match(result.stderr,/outside.*notes directory/i);
  assert.equal(fs.existsSync(path.join(dir,'out')),false);
});
test('markdown build embeds referenced local images relative to the notes directory', t => {
  const dir = fixture(t); const notesDir = path.join(dir,'notes'); fs.mkdirSync(path.join(notesDir,'images'),{recursive:true});
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jDk8AAAAASUVORK5CYII=','base64');
  fs.writeFileSync(path.join(notesDir,'images','one pixel.png'),png);
  fs.writeFileSync(path.join(notesDir,'lecture.md'),'# Photo lecture\n## Photo @photo "images/one pixel.png"\n@alt A pixel\n%%PRIVATE_SENTINEL%%\n');
  const result = run(['build','notes/lecture.md','--out','out'],dir);
  assert.equal(result.status,0,result.stderr+result.stdout);
  const bytes = fs.readFileSync(path.join(dir,'out','student.zip'));
  assert.ok(bytes.includes(png)); assert.ok(bytes.includes('Photo lecture')); assert.ok(!bytes.includes('PRIVATE_SENTINEL'));
});
test('build reports all validation errors and leaves existing outputs untouched', t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir,'bad.json'),JSON.stringify(project('# Title\n## Photo @photo images/missing.png\n@alt Scene\n@imaginary nope\n')));
  fs.mkdirSync(path.join(dir,'out')); fs.writeFileSync(path.join(dir,'out','student.zip'),'old');
  const result = run(['build','bad.json','--out','out','--force'],dir);
  assert.equal(result.status,1);
  assert.match(result.stdout,/UNKNOWN_DIRECTIVE.*line 4/); assert.match(result.stdout,/MISSING_ASSET.*line 2/);
  assert.deepEqual(fs.readdirSync(path.join(dir,'out')),['student.zip']);
  assert.equal(fs.readFileSync(path.join(dir,'out','student.zip'),'utf8'),'old');
});
test('help and strict argument validation prevent accidental commands', t => {
  const dir = fixture(t);
  const help = run(['--help'],dir); assert.equal(help.status,0); assert.match(help.stdout,/Usage:/);
  for (const args of [[],['wat'],['check'],['check','x','--force'],['build','x'],['build','x','--otu','out'],['build','x','--out','out','--force=false'],['build','x','--out','--force']]) {
    const result = run(args,dir); assert.equal(result.status,2,JSON.stringify(args)); assert.match(result.stderr,/Usage:/);
  }
});
test('build refuses nonempty output unless --force and never removes unrelated files', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'project.json'),JSON.stringify(project()));
  fs.mkdirSync(path.join(dir,'out')); fs.writeFileSync(path.join(dir,'out','keep.txt'),'keep');
  fs.writeFileSync(path.join(dir,'out','student.zip'),'old');
  let result = run(['build','project.json','--out','out'],dir);
  assert.equal(result.status,1); assert.match(result.stderr,/nonempty.*--force/i);
  assert.equal(fs.readFileSync(path.join(dir,'out','student.zip'),'utf8'),'old');
  result = run(['build','project.json','--out','out','--force'],dir);
  assert.equal(result.status,0,result.stderr);
  assert.equal(fs.readFileSync(path.join(dir,'out','keep.txt'),'utf8'),'keep');
  assert.equal(fs.readFileSync(path.join(dir,'out','student.zip')).readUInt32LE(),0x04034b50);
});
test('build produces byte-identical private-note-free archives and a checks report', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'project.chartroom.json'), JSON.stringify(project()));
  for (const out of ['one','two']) {
    const result = run(['build','project.chartroom.json','--out',out], dir);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Built/);
  }
  const P = require('../src/package.js');
  for (const target of ['teaching','student']) {
    const bytes = fs.readFileSync(path.join(dir,'one',target+'.zip'));
    assert.deepEqual(bytes, fs.readFileSync(path.join(dir,'two',target+'.zip')));
    assert.deepEqual(bytes, Buffer.from(P.zip(P.build(project(),target).files)));
    assert.ok(!bytes.includes('PRIVATE_SENTINEL'));
  }
  const report = JSON.parse(fs.readFileSync(path.join(dir,'one','checks.json'),'utf8'));
  assert.equal(report.ok, true); assert.deepEqual(report.diagnostics, []);
  assert.deepEqual(fs.readdirSync(path.join(dir,'one')).sort(), ['checks.json','student.zip','teaching.zip']);
});
test('check reports syntax errors with source lines and a failing exit status', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'bad.md'), '# Title\n## Point\n@imaginary nope\n');
  const result = run(['check','bad.md'], dir);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /error.*UNKNOWN_DIRECTIVE.*line 3/i);
  assert.doesNotMatch(result.stdout, /check passed/);
});
test('check warns about unverified images without requiring them to exist', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'image.md'), '# Title\n## Photo @photo images/absent.png\n@alt A scene\n');
  const result = run(['check','image.md'], dir);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /warning ASSET_NOT_CHECKED/);
});
test('check accepts valid annotated notes without installing packages', t => {
  const dir = fixture(t); fs.writeFileSync(path.join(dir,'notes.md'), source);
  const result = run(['check','notes.md'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Syntax check passed/);
  assert.match(result.stdout, /does not check.*image/i);
});
