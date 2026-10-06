'use strict';
// Copy only public runtime/help assets, then use a fresh browser on that copy.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),copy=path.join(__dirname,'tmp/presentation-portable');
process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');fs.mkdirSync(copy,{recursive:true});
for(const name of ['index.html','START HERE.html','src','docs','examples','LICENSE'])fs.cpSync(path.join(root,name),path.join(copy,name),{recursive:true});
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const c=await b.newContext({offline:true,viewport:{width:1366,height:768}}),p=await c.newPage(),errors=[],requests=[],prefix=pathToFileURL(copy+path.sep).href;
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(prefix)&&!/^data:|^about:/.test(r.url()))requests.push(r.url());});p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.join(copy,'index.html')).href);
  await p.locator('#open-project-input').setInputFiles(path.join(copy,'examples/demo.chartroom.json'));
  await p.waitForFunction(()=>document.querySelector('#notes').value.includes('Chartroom workshop'));
  const before=await p.locator('#notes').inputValue();await p.locator('#present-lecture').focus();await p.locator('#present-lecture').press('Enter');
  await p.waitForFunction(()=>document.querySelector('#presentation').dataset.ready==='true');
  const f=await(await p.locator('#presentation iframe').elementHandle()).contentFrame();await f.waitForLoadState();
  const result=await f.evaluate(async()=>{await Promise.all([...document.images].map(i=>i.decode()));return{state:ChartroomPlayer.getState(),images:document.images.length,overflow:ChartroomPlayer.audit().filter(s=>s.overflow)};});
  assert.ok(result.state.count>1);assert.ok(result.images>0);assert.deepEqual(result.overflow,[]);
  await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#presentation').hidden);assert.equal(await p.locator('#notes').inputValue(),before);
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS: copied standalone Studio folder + reopened portable project presents with decoded images; no original-folder resources, network requests or JS errors. '+JSON.stringify(result));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
