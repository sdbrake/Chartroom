'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/converter.js'),P=require('../src/parser.js'),R=require('../src/renderer.js');
const fs=require('node:fs'),vm=require('node:vm');
test('unmatched bracket runs cannot stall local text conversion',()=>{
 const source=fs.readFileSync(require.resolve('../src/converter.js'),'utf8');
 const context={TextEncoder,input:'# Public title\n\n'+ '['.repeat(60000)};
 const result=vm.runInNewContext(source+'\nChartroomConverter.fromText(input);',context,{timeout:2000});
 assert.ok(result.notes.includes('# Public title'));
});
test('private multiline headings cannot become public slide titles during rough conversion',()=>{
 for(const [open,close] of [['%%','%%'],['*','*'],['<!--','-->']]){
  const result=C.fromText('# Public title\n'+open+'PRIVATE_START\n## PRIVATE_HEADING\nPRIVATE_BODY\n'+close+'\n## Public topic\n- Public point');
  const model=P.parse(result.notes),publicHTML=R.renderDeck(model);
  assert.equal(/PRIVATE_/.test(publicHTML),false,'private source stays private across heading lines');
  assert.match(publicHTML,/Public topic/);assert.match(publicHTML,/Public point/);
  assert.deepEqual(model.diagnostics.filter(d=>d.severity==='error'),[]);
 }
});
test('raw outline uses short standalone source headings rather than repeated generic titles',()=>{
 const result=C.fromText('The politics of trade\n\nThree approaches\n- Liberalism\n- Nationalism\n- Marxism\n\nLiberalism\nMarkets create gains.\nInstitutions support cooperation.');
 const model=P.parse(result.notes);
 assert.equal(model.title,'The politics of trade');
 assert.deepEqual(model.slides.map(s=>s.title),['The politics of trade','Three approaches','Liberalism']);
 assert.deepEqual(model.slides[1].items.map(i=>i.text),['Liberalism','Nationalism','Marxism']);
 assert.ok(result.notes.includes('Markets create gains.'));
 assert.deepEqual(model.diagnostics.filter(d=>d.severity==='error'),[]);
});
