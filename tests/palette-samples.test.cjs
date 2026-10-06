'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const c=await b.newContext({offline:true,viewport:{width:1500,height:1150}}),p=await c.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await p.goto(pathToFileURL(path.join(root,'index.html')).href);
  assert.equal(await p.getByRole('link',{name:'Compare palettes'}).count(),1);
  await p.goto(pathToFileURL(path.join(root,'docs/PALETTES.html')).href);
  assert.equal(await p.locator('iframe').count(),4);
  for(const i of [1,6,4,3,0]){
   await p.locator('#sample-slide').selectOption(String(i));
   for(const f of p.frames().filter(f=>f.parentFrame()===p.mainFrame())){
    await f.waitForFunction(i=>window.ChartroomPlayer&&ChartroomPlayer.getState().index===i,i);
    await f.evaluate(async()=>{await Promise.all([...document.images].map(image=>image.decode()));});
    assert.deepEqual(await f.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
   }
  }
  await p.locator('#sample-slide').selectOption('4');
  for(const f of p.frames().filter(f=>f.parentFrame()===p.mainFrame()))await f.waitForFunction(()=>ChartroomPlayer.getState().index===4);
  await p.screenshot({path:path.join(__dirname,'artifacts/editorial-comparison-desktop.png'),fullPage:true});
  await p.setViewportSize({width:390,height:844});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Edge may omit offscreen iframe layers in full-page captures after resize.
  // Scroll each sample into the real viewport and allow paint before recording it.
  for(let i=0;i<4;i++){
   await p.locator('article').nth(i).scrollIntoViewIfNeeded();
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await p.screenshot({path:path.join(__dirname,'artifacts/editorial-comparison-mobile-'+i+'.png')});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS: Studio comparison link, four synchronized offline palette samples, all sample layouts fit, image decoding, mobile width; zero network or JS errors.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
