'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/package.js'),R=require('../src/renderer.js'),Parser=require('../src/parser.js');
const project=()=>({format:'chartroom-studio',version:1,course:{title:'School course',code:'TEST'},lectures:[{id:'one',title:'Exact lecture',available:true,notes:'# Exact title\n## Exact facts\n- Exact point.\n*PRIVATE_PALETTE_NOTE*'}],assets:[]});
test('palette IDs reject unknown values rather than accepting arbitrary CSS',()=>{
 for(const palette of ['',null,{},'__proto__','constructor','Buster','red;}</style><script>']){
  const p=project();p.course.palette=palette;
  assert.throws(()=>P.validateProject(p),/palette/i);
  assert.throws(()=>R.renderDeck(Parser.parse('# T'),{palette}),/Choose a named option from Deck palette/);
  assert.throws(()=>R.renderLibrary({title:'T',palette,lectures:[]}),/palette/i);
 }
});
test('four editorial palettes retain proposed colors and round-trip through both exports',()=>{
 const expected={
  atlantic:['Atlantic','#F4F7FA','#172A3A','#174A7E','#006D77','#B64B2C'],
  'field-notes':['Field Notes','#F4F1E8','#263B32','#264C3B','#376B63','#9B542C'],
  aubergine:['Aubergine','#F7F1ED','#352B37','#51344D','#286B68','#A64B35'],
  'night-seminar':['Night Seminar','#17212B','#EEF2F3','#101820','#7FCBC4','#E8A36C']
 };
 for(const [id,[name,paper,ink,navy,cool,warm]] of Object.entries(expected)){
  assert.ok(R.palettes[id],id+' is registered');
  assert.equal(R.palettes[id].name,name);
  for(const color of [paper,ink,navy,cool,warm])assert.ok(Object.values(R.palettes[id]).includes(color),id+' '+color);
  assert.ok(Object.isFrozen(R.palettes[id]));
  const input=project();input.course.palette=id;
  const saved=P.validateProject(JSON.parse(JSON.stringify(input)));
  assert.equal(saved.course.palette,id);assert.equal(saved.lectures[0].notes,input.lectures[0].notes);
  for(const target of ['student','teaching']){
   const built=P.build(saved,target),html=built.files.find(f=>f.path.endsWith('index.html')).data;
   assert.ok(html.includes('--paper:'+paper));assert.ok(html.includes('--ink:'+ink));
   assert.ok(html.includes('Exact point.'));assert.ok(!html.includes('PRIVATE_PALETTE_NOTE'));
   assert.deepEqual(P.zip(built.files),P.zip(P.build(saved,target).files));
  }
 }
});
test('explicit Classic matches the unchanged default output',()=>{
 const model=Parser.parse('# T\n## Facts\n- Words.');
 assert.equal(R.renderDeck(model),R.renderDeck(model,{palette:'classic'}));
 const course={title:'T',code:'C',lectures:[{id:'one',title:'T',model}]};
 assert.equal(R.renderLibrary(course),R.renderLibrary({...course,palette:'classic'}));
});
test('school palette constants retain every exact supplied color',()=>{
 for(const [id,colors] of [['buster',['#990026','#ffffff','#000000','#999999','#497791','#2E9FC9','#f3f0eb']],['agnar',['#00275D','#B2223B','#3C5383','#ABADB0','#FFFFFF']]]){
  for(const color of colors)assert.ok(Object.values(R.palettes[id]).includes(color),id+' '+color);
  assert.ok(Object.isFrozen(R.palettes[id]));
 }
});
test('named course palette survives validation and drives both exports without rewriting notes',()=>{
 assert.equal(P.validateProject(project()).course.palette,'classic','Old projects default to Classic');
 for(const [palette,navy,paper] of [['classic','#182030','#f2efe9'],['buster','#990026','#f3f0eb'],['agnar','#00275D','#FFFFFF']]){
  const p=project();p.course.palette=palette;
  const saved=P.validateProject(JSON.parse(JSON.stringify(p)));
  assert.equal(saved.course.palette,palette);assert.equal(saved.lectures[0].notes,p.lectures[0].notes);
  for(const target of ['student','teaching']){
   const html=P.build(saved,target).files.find(f=>f.path.endsWith('index.html')).data;
   assert.ok(html.includes('--navy:'+navy),target+' contains the selected school color');
   assert.ok(html.includes('--paper:'+paper),target+' contains the selected paper');
   assert.ok(html.includes('Exact point.'));assert.ok(!html.includes('PRIVATE_PALETTE_NOTE'));
  }
 }
});
