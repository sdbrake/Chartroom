'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
const url=pathToFileURL(path.join(root,'index.html')).href;
const original='# SNAPSHOT_ORIGINAL\n\n## Discussion\n- One.\n- Two.\n\n*BOUNDARY_PRIVATE_SENTINEL*\n';
async function realClick(p,selector){const el=p.locator(selector);await el.scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await el.click();}
async function ready(p){await p.waitForFunction(()=>document.querySelector('#presentation').dataset.ready==='true');const f=await(await p.locator('#presentation iframe').elementHandle()).contentFrame();await f.waitForLoadState();return f;}
async function exited(p){await p.waitForFunction(()=>document.querySelector('#presentation').hidden);await p.waitForFunction(()=>document.activeElement.id==='present-lecture');}
async function gate(p){await p.evaluate(()=>{const check=ChartroomPreflight.check;window.originalCheck=check;ChartroomPreflight.check=async project=>{const result=await check(project);window.realCheckFinished=true;await new Promise(r=>window.releaseCheck=r);return result;};});}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()}),errors=[],requests=[];
 async function page(mode='denied',viewport={width:1000,height:750}){
  const c=await b.newContext({offline:true,viewport});
  await c.addInitScript(mode=>{if(mode==='denied')Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Fullscreen refused'));if(mode==='missing')Element.prototype.requestFullscreen=undefined;},mode);
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});p.on('dialog',d=>d.accept());await p.goto(url);return p;
 }
 try{
  // A real selected-only preflight, delayed at its completion, proves snapshot isolation.
  const p=await page();await p.locator('#notes').fill(original);await p.locator('#available').uncheck();await p.locator('#palette').selectOption('atlantic');
  await p.locator('#add-lecture').click();await p.locator('#notes').fill('# Other\n## Broken @unknown\n');await p.locator('#rebuild').click();
  await p.locator('#lecture-list button').first().click();await p.locator('#preview-library').click();
  await p.evaluate(()=>{document.querySelector('#save-project').inert=true;});
  await gate(p);await realClick(p,'#present-lecture');await p.waitForFunction(()=>window.realCheckFinished);
  // Simulate a delayed/background editor update: no user-facing controls are operable.
  await p.evaluate(()=>{const n=document.querySelector('#notes');n.value='# EDIT_AFTER_START\n## New words\n- Not the projected snapshot';n.dispatchEvent(new Event('input',{bubbles:true}));const s=document.querySelector('#palette');s.value='aubergine';s.dispatchEvent(new Event('change',{bubbles:true}));window.releaseCheck();});
  const f=await ready(p);
  assert.equal(await p.evaluate(()=>document.fullscreenElement),null);
  assert.match(await f.locator('body').innerText(),/SNAPSHOT_ORIGINAL/);assert.ok(!(await f.content()).includes('EDIT_AFTER_START'));assert.ok(!(await f.content()).includes('BOUNDARY_PRIVATE_SENTINEL'));
  assert.equal(await f.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(244, 247, 250)');
  assert.equal(await p.locator('#presentation').evaluate(el=>{const r=el.getBoundingClientRect();return r.width===innerWidth&&r.height===innerHeight&&r.left===0&&r.top===0;}),true);
  assert.equal(await p.locator('#presentation iframe').getAttribute('sandbox'),'allow-scripts');
  const state=await f.evaluate(()=>ChartroomPlayer.getState());
  await p.evaluate(state=>{
   const live=document.querySelector('#presentation iframe').contentWindow,other=document.querySelector('#preview').contentWindow;
   for(const [source,origin] of [[other,'null'],[live,'https://wrong.example']])for(const data of [{...state,type:'chartroom-state',resourcesReady:true,failedImages:1},{...state,type:'chartroom-escape'}])window.dispatchEvent(new MessageEvent('message',{source,origin,data}));
  },state);
  assert.equal(await p.locator('#presentation').getAttribute('data-ready'),'true','forged source/origin messages cannot fail or close presentation');
  await p.keyboard.press('PageDown');await f.waitForFunction(()=>ChartroomPlayer.getState().index===1);
  await p.keyboard.press('PageDown');await f.waitForFunction(()=>ChartroomPlayer.getState().step===1);
  await p.keyboard.press('PageUp');await f.waitForFunction(()=>ChartroomPlayer.getState().step===0);
  await p.keyboard.press('Escape');await exited(p);
  assert.match(await p.locator('#notes').inputValue(),/EDIT_AFTER_START/);assert.equal(await p.locator('#available').isChecked(),false);assert.equal(await p.locator('#palette').inputValue(),'aubergine');
  assert.equal(await p.locator('#save-project').evaluate(el=>el.inert),true,'existing inert state preserved');
  assert.equal(await p.locator('.workspace').evaluate(el=>el.inert),false);
  console.log('PASS: rejected fullscreen fallback; selected unavailable lecture despite other errors/library preview; real checked snapshot immutable; forged messages rejected; editor/inert state restored.');
  await p.context().close();

  // No Fullscreen API, narrow viewport, real pointer exit and keyboard focus containment.
  const mobile=await page('missing',{width:390,height:844});await mobile.locator('#notes').fill(original);await realClick(mobile,'#present-lecture');const mf=await ready(mobile);
  for(const key of ['Tab','Shift+Tab','Tab','Shift+Tab']){await mobile.keyboard.press(key);assert.equal(await mobile.evaluate(()=>{const a=document.activeElement;return a.id==='presentation-exit'||a===document.querySelector('#presentation iframe');}),true);}
  await mobile.screenshot({path:path.join(__dirname,'artifacts/presentation-mobile.png')});
  assert.equal(await mobile.locator('#presentation').evaluate(el=>el.scrollWidth<=innerWidth),true);
  assert.deepEqual(await mf.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
  await realClick(mobile,'#presentation-exit');await exited(mobile);assert.equal(await mobile.locator('#notes').inputValue(),original);
  const resumedPreview=await(await mobile.locator('#preview').elementHandle()).contentFrame();
  await resumedPreview.waitForFunction(()=>document.body.innerText.includes('SNAPSHOT_ORIGINAL'),{},{timeout:4000});
  console.log('PASS: absent Fullscreen API, narrow page-fill, bidirectional focus containment and visible exit control.');await mobile.context().close();

  // Cancel checking, reopen immediately, then deliver the old async result.
  const cancel=await page();await cancel.locator('#notes').fill(original);await gate(cancel);await realClick(cancel,'#present-lecture');await cancel.waitForFunction(()=>window.realCheckFinished);
  await realClick(cancel,'#presentation-exit');await exited(cancel);
  await cancel.evaluate(()=>{ChartroomPreflight.check=window.originalCheck;});await cancel.locator('#notes').fill('# SECOND_SESSION\n## Second\n- Visible');await realClick(cancel,'#present-lecture');const current=await ready(cancel);
  await cancel.evaluate(()=>window.releaseCheck());await current.waitForFunction(()=>document.body.innerText.includes('SECOND_SESSION'));
  assert.equal(await cancel.locator('#presentation iframe').count(),1);assert.ok(!(await current.content()).includes('SNAPSHOT_ORIGINAL'));
  await realClick(cancel,'#presentation-exit');await exited(cancel);console.log('PASS: canceled preflight cannot revive or overwrite a newer presentation.');await cancel.context().close();

  const bad=await page();
  const failures=[['# Bad\n## Unknown @not-real',/annotation|unknown/i],['# Bad\n## Figure @img images/missing.png',/missing/i],['# Bad\n## Too much\n'+Array.from({length:60},(_,i)=>'- Point '+i).join('\n'),/overflow/i]];
  for(const [notes,expected] of failures){await bad.locator('#notes').fill(notes);await realClick(bad,'#present-lecture');await bad.waitForFunction(()=>document.querySelector('#presentation-status').textContent.includes('could not be presented'));
   assert.equal(await bad.locator('#presentation iframe').count(),0);assert.ok(!(await bad.locator('#presentation').innerText()).includes('not-real'),'public failure screen hides raw diagnostics');
   await realClick(bad,'#presentation-exit');await exited(bad);assert.match(await bad.locator('#notice').innerText(),expected);assert.equal(await bad.locator('#notes').inputValue(),notes);
  }
  // Feed a real corrupt image through the actual project-open UI.
  const project={format:'chartroom-studio',version:1,course:{title:'Test',code:''},lectures:[{id:'one',title:'One',notes:'# Bad\n## Figure @img images/a.png',available:true}],assets:[{lectureId:'one',path:'images/a.png',mime:'image/png',data:'iVBORw0KGgo='}]};
  await bad.locator('#open-project-input').setInputFiles({name:'bad.chartroom.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await bad.waitForFunction(()=>document.querySelector('#lecture-title').value==='One');
  await realClick(bad,'#present-lecture');await bad.waitForFunction(()=>document.querySelector('#presentation-status').textContent.includes('could not be presented'));await realClick(bad,'#presentation-exit');await exited(bad);assert.match(await bad.locator('#notice').innerText(),/decod/i);
  console.log('PASS: annotation errors, missing images, overflowing slides and corrupt images blocked using real preflight; diagnostics kept off projected screen.');await bad.context().close();

  const native=await page('native');await realClick(native,'#present-lecture');await ready(native);assert.equal(await native.evaluate(()=>document.fullscreenElement?.id),'presentation');
  await native.evaluate(()=>document.exitFullscreen());await exited(native);assert.equal(await native.locator('#presentation iframe').count(),0);
  await realClick(native,'#present-lecture');await ready(native);
  // Exercise a second Present before the real native exit promise settles.
  await native.evaluate(()=>{
   const exit=document.exitFullscreen.bind(document);document.exitFullscreen=()=>window.pendingNativeExit=exit();
   document.querySelector('#presentation-exit').click();document.querySelector('#present-lecture').click();
   return window.pendingNativeExit;
  });
  await native.waitForFunction(()=>document.querySelector('#presentation').dataset.ready==='true',{},{timeout:6000});
  assert.equal(await native.locator('#presentation').isVisible(),true,'rapid native close/reopen must not close the replacement session');
  await realClick(native,'#presentation-exit');await exited(native);await native.context().close();
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS: native fullscreenchange cleanup and rapid native close/reopen with restored focus; zero network requests or JavaScript errors. Browser '+b.version());
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
