#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const P = require('./src/package.js');

function fromNotes(notes) {
  return {format:'chartroom-studio',version:1,course:{title:'Lecture',code:''},
    lectures:[{id:'lecture-1',title:'Lecture',notes,available:true}],assets:[]};
}
function readProject(input) {
  const text = fs.readFileSync(input, 'utf8');
  if (!/\.(md|txt)$/i.test(input)) return P.validateProject(JSON.parse(text));
  const project = fromNotes(text);
  const {model} = P.compile(project).lectures[0];
  project.course.title = project.lectures[0].title = model.title;
  const notesDir = fs.realpathSync(path.dirname(path.resolve(input)));
  for (const assetPath of model.assets) {
    const filename = fs.realpathSync(path.resolve(notesDir, assetPath));
    const relative = path.relative(notesDir, filename);
    if (relative === '..' || relative.startsWith('..'+path.sep) || path.isAbsolute(relative)) {
      throw new Error('Image is outside the notes directory: '+assetPath);
    }
    const bytes = fs.readFileSync(filename);
    project.assets.push({lectureId:'lecture-1',path:assetPath,mime:P.imageMime(bytes),data:bytes.toString('base64')});
  }
  return P.validateProject(project);
}
const usage = `Usage:
  node cli.cjs check notes.md
  node cli.cjs build project.chartroom.json --out outputdir [--force]
  node cli.cjs build notes.md --out outputdir [--force]
  node cli.cjs --help

Offline, no packages. check validates syntax only; images are NOT verified.
build writes teaching.zip, student.zip and checks.json. Extract ZIPs to use.
--force replaces only these named outputs; it never clears unrelated files.
Exit codes: 0 success (warnings allowed), 1 validation/I/O failure, 2 usage.
Use the browser index.html to edit/save a private project. Exports never sync.`;
function main(args) {
  if (args.length === 1 && args[0] === '--help') { console.log(usage); return; }
  const [command, input] = args;
  const valid = input && !input.startsWith('--') && (
    (command === 'check' && args.length === 2) ||
    (command === 'build' && args[2] === '--out' && args[3] && !args[3].startsWith('--') &&
      (args.length === 4 || (args.length === 5 && args[4] === '--force'))));
  if (!valid) { console.error(usage); process.exitCode = 2; return; }
  if (command === 'build') {
    const project = readProject(input);
    const result = P.compile(project);
    for (const d of result.diagnostics) console.log(`${d.lectureId}: ${d.severity} ${d.code} line ${d.line}: ${d.message}`);
    if (result.diagnostics.some(d => d.severity === 'error')) throw new Error('Build blocked by validation errors; no outputs written.');
    const teaching = P.zip(P.build(project, 'teaching').files);
    const student = P.zip(P.build(project, 'student').files);
    const output = path.resolve(args[3]);
    const inputPath = fs.realpathSync(input);
    for (let directory = output; ; directory = path.dirname(directory)) {
      const stat = fs.lstatSync(directory, {throwIfNoEntry:false});
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error('Output path must be a directory without symbolic links or junctions: '+directory);
      if (directory === path.dirname(directory)) break;
    }
    for (const name of ['teaching.zip','student.zip','checks.json']) {
      const destination = path.join(output, name);
      const stat = fs.lstatSync(destination, {throwIfNoEntry:false});
      if (stat && (stat.isSymbolicLink() || !stat.isFile() || stat.nlink > 1)) throw new Error('Output must be a regular, unlinked file: '+destination);
      if (fs.existsSync(destination) && fs.realpathSync(destination) === inputPath) {
        throw new Error('Refusing to overwrite the source input: '+destination);
      }
    }
    if (fs.existsSync(output) && fs.readdirSync(output).length && !args.includes('--force')) {
      throw new Error('Output directory is nonempty. Choose a new directory or use --force explicitly.');
    }
    fs.mkdirSync(output, {recursive:true});
    fs.writeFileSync(path.join(output, 'teaching.zip'), teaching);
    fs.writeFileSync(path.join(output, 'student.zip'), student);
    fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify({ok:true,diagnostics:result.diagnostics}, null, 2)+'\n');
    console.log('Built teaching.zip, student.zip and checks.json in '+output);
  }
  if (command === 'check') {
    const project = fromNotes(fs.readFileSync(input, 'utf8'));
    const diagnostics = P.compile(project).diagnostics.map(d => d.code === 'MISSING_ASSET' ?
      {...d,severity:'warning',code:'ASSET_NOT_CHECKED',message:d.message.replace('Missing local image:', 'Image not checked:')} : d);
    for (const d of diagnostics) console.log(`${d.severity} ${d.code} line ${d.line}: ${d.message}`);
    if (diagnostics.some(d => d.severity === 'error')) { process.exitCode = 1; return; }
    console.log('Syntax check passed. This does not check local image existence or contents.');
  }
}
try { main(process.argv.slice(2)); }
catch (error) { console.error('Error: '+error.message); process.exitCode = 1; }
