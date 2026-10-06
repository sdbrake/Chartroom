'use strict';
// Independent read-only release review. Only browser-owned scratch under tests/tmp.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const P=require('../src/package.js'),Parser=require('../src/parser.js');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
process.env.TEMP=process.env.TMP=path.join(__dirname,'tmp');
const root=path.resolve(__dirname,'..'),url=pathToFileURL(path.join(root,'index.html')).href;
const sample=(notes='# Title\n## Facts\n- Visible')=>({format:'chartroom-studio',version:1,course:{title:'Course',code:''},lectures:[{id:'one',title:'One',notes,available:true}],assets:[]});
const result={passed:true,security_concerns:[],logic_errors:[],suggestions:[],controls:[]};
function issue(kind,id,evidence){result.passed=false;result[kind].push({id,evidence});}
async function main(){
 const source='# T\n## X\n- First\n- *PRIVATE_PARENT*\n  - Visible child';
 const model=Parser.parse(source);
 if(!model.diagnostics.some(d=>d.severity==='error')&&model.slides[1].items[0].children.some(c=>c.text==='Visible child'))issue('logic_errors','private-parent-reparenting',{source,diagnostics:model.diagnostics,items:model.slides[1].items});
 const privacy=sample('# T *SECRET_TITLE*\n## X %%SECRET_HEADING%%\nVisible *SECRET_BODY*\n- Point %%SECRET_BULLET%%\n@footer Footer *SECRET_FOOTER*\n@notes SECRET_NOTES **unbalanced %% <script>\n<!--SECRET_COMMENT-->');
 for(const target of ['student','teaching']){const files=P.build(privacy,target).files;assert.ok(!files.some(f=>typeof f.data==='string'&&f.data.includes('SECRET_')));assert.deepEqual(P.zip(files),P.zip(P.build(privacy,target).files));}
 result.controls.push('Both exports exclude private sentinels from title, heading, body, bullet, footer, @notes and comment; ZIP bytes deterministic.');
 for(const name of ['../escape.png','/escape.png','C:/escape.png','x/../escape.png','x\\escape.png','x%2fescape.png','CON.png','nul/x.png'])assert.throws(()=>P.zip([{path:name,data:'x'}]));
 result.controls.push('Traversal, absolute, backslash, percent-encoded and reserved-device ZIP paths rejected.');
 const reserved=sample();reserved.lectures[0].id='con';let accepted=true;
 try{P.validateProject(reserved);}catch(_){accepted=false;}
 if(accepted){const built=P.build(reserved,'teaching');try{P.zip(built.files);}catch(error){issue('logic_errors','accepted-id-cannot-export',{id:'con',validation:'accepted',buildPaths:built.files.map(f=>f.path),zipError:error.message});}}
 const many='# T\n## X\n'+Array.from({length:150000},()=>'*p*').join(' ');
 try{Parser.parse(many);}catch(error){issue('logic_errors','bounded-input-parser-crash',{sourceRecipe:"'# T\\n## X\\n'+Array.from({length:150000},()=>'*p*').join(' ')",characters:many.length,error:error.name+': '+error.message});}
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1600,height:1100}});let page=await context.newPage();
  let dialogs=0;const onDialog=async d=>{dialogs++;await d.accept();};page.on('dialog',onDialog);
  await page.goto(url);await page.locator('#notes').fill('# UNSAVED_DRAFT_SENTINEL\n## X\n- Exact draft');await page.locator('#rebuild').click();
  // Installed Chrome/Playwright disagree on beforeunload dialog routing. Closing
  // and reopening a tab tests the same durable recovery boundary without a mock.
  await page.close();page=await context.newPage();page.on('dialog',onDialog);await page.goto(url);
  assert.match(await page.locator('#notes').inputValue(),/UNSAVED_DRAFT_SENTINEL/);
  const before=dialogs;await page.locator('#new-project').click();
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('chartroom-studio-project-v1')).lectures[0].notes);
  if(dialogs===before&&!after.includes('UNSAVED_DRAFT_SENTINEL'))issue('logic_errors','restored-draft-replaced-without-warning',{steps:'Edit notes; Rebuild to autosave; reload; New project (no portable save at any point).',replacementConfirmations:dialogs-before,storedNotes:after});
  const context2=await browser.newContext({offline:true}),page2=await context2.newPage();
  const corrupt=JSON.stringify({...sample('# IRREPLACEABLE_RECOVERY_TEXT'),version:99});
  await page2.addInitScript(raw=>localStorage.setItem('chartroom-studio-project-v1',raw),corrupt);await page2.goto(url);
  const recover=await page2.evaluate(()=>({notice:document.querySelector('#notice').textContent,stored:localStorage.getItem('chartroom-studio-project-v1')}));
  if(!recover.stored.includes('IRREPLACEABLE_RECOVERY_TEXT'))issue('logic_errors','unreadable-draft-destroyed-on-startup',{steps:'Seed local draft with otherwise valid project and unsupported version 99; open Studio.',notice:recover.notice,recoveryTextRetained:false});
  const actualPreflight=await page.evaluate(async input=>({valid:await ChartroomPreflight.check(input),bad:await ChartroomPreflight.check({...input,lectures:[{...input.lectures[0],notes:'# T\n## I @img images/a.png'}],assets:[{lectureId:'one',path:'images/a.png',mime:'image/png',data:'iVBORw0KGgo='}]})}),sample());
  assert.deepEqual(actualPreflight.valid,[]);assert.ok(actualPreflight.bad.some(d=>/decod/i.test(d.message)));result.controls.push('Real browser preflight accepts simple valid deck and rejects PNG-signature-only corrupt image.');
  // Deterministically pause AFTER real preflight, then edit before the export resumes.
  await page.locator('#notes').fill('# SNAPSHOT_ORIGINAL\n## X\n- Original');await page.locator('#rebuild').click();
  await page.evaluate(()=>{const real=ChartroomPreflight.check;ChartroomPreflight.check=async p=>{const checked=await real(p);window.probeChecked=true;await new Promise(resolve=>window.probeRelease=resolve);return checked;};});
  await page.locator('#export-teaching').dispatchEvent('click');await page.waitForFunction(()=>window.probeChecked);
  await page.locator('#notes').fill('# EDIT_AFTER_CHECK\n## X\n- New edit');
  const download=page.waitForEvent('download');await page.evaluate(()=>window.probeRelease());const dl=await download;
  const stream=await dl.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const zipText=Buffer.concat(chunks).toString('utf8');
  assert.ok(zipText.includes('SNAPSHOT_ORIGINAL'));assert.ok(!zipText.includes('EDIT_AFTER_CHECK'));result.controls.push('Editing after real preflight does not change exported snapshot.');
 }finally{await browser.close();}
 console.log(JSON.stringify(result,null,2));process.exitCode=result.passed?0:1;
}
main().catch(error=>{console.error(error);process.exitCode=2;});
