'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'tests/artifacts');
process.env.TMP=process.env.TEMP=path.join(root,'tests/tmp');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||chromium.executablePath(),headless:true});
 const context=await browser.newContext({offline:true,viewport:{width:1600,height:1000}});
 const page=await context.newPage(),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 let lectures=0,slides=0,images=0;
 try{
  for(const folder of ['tests/artifacts/extracted-browser-student','tests/artifacts/extracted-image-student','demo/student']){
   await page.goto(pathToFileURL(path.join(root,folder,'index.html')).href);
   const buttons=page.locator('#lecture-list button:not([disabled])');
   const count=await buttons.count();assert.ok(count>0);
   for(let i=0;i<count;i++){
    await buttons.nth(i).click();
    await page.waitForFunction(()=>/^Slide 1 of \d+$/.test(document.querySelector('#slide-status').textContent));
    const child=page.frames().find(f=>f.parentFrame()===page.mainFrame());
    await child.waitForFunction(()=>window.ChartroomPlayer&&document.readyState==='complete');
    const result=await child.evaluate(async()=>{
     const images=Array.from(document.images);
     for(const im of images){try{await im.decode();}catch(e){throw new Error('Image decode failed: '+im.src+' base='+document.baseURI+' ('+e.message+')');}if(!im.naturalWidth)throw new Error('Image failed: '+im.getAttribute('src'));}
     const audit=ChartroomPlayer.audit();
     return {state:ChartroomPlayer.getState(),audit,images:images.length,broken:images.filter(i=>!i.complete||!i.naturalWidth).length};
    });
    assert.equal(result.state.index,0);assert.deepEqual(result.audit.filter(s=>s.overflow),[]);assert.equal(result.broken,0);
    images+=result.images;lectures++;
    for(let n=0;n<result.state.count;n++){
     await child.evaluate(n=>ChartroomPlayer.go(n),n);
     assert.equal(await child.locator('.slide:not([hidden])').count(),1);
     const notRevealed=await child.locator('.slide:not([hidden]) [data-reveal]').evaluateAll(items=>items.filter(i=>getComputedStyle(i).visibility==='hidden').length);
     assert.equal(notRevealed,0,'Every review point is visible');slides++;
    }
    await buttons.nth(i).click();
    await page.waitForFunction(()=>/^Slide 1 of \d+$/.test(document.querySelector('#slide-status').textContent));
   }
   assert.equal(await page.locator('#library-error').isVisible(),false);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.screenshot({path:path.join(artifacts,'finished-review-library.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(artifacts,'finished-review-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1600,height:900});
  await page.goto(pathToFileURL(path.join(root,'demo/teaching/lectures/workshop/index.html')).href);
  await page.waitForFunction(()=>window.ChartroomPlayer&&document.readyState==='complete');
  await page.evaluate(async()=>{for(const im of document.images)await im.decode();});
  assert.deepEqual(await page.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
  const count=await page.evaluate(()=>ChartroomPlayer.getState().count);
  for(let n=0;n<count;n++){
   await page.evaluate(n=>{ChartroomPlayer.go(n);const points=document.querySelector('.slide:not([hidden])').querySelectorAll('[data-reveal]').length;for(let i=0;i<points;i++)ChartroomPlayer.next();if(ChartroomPlayer.getState().index!==n)throw new Error('Screenshot navigation advanced past target slide');},n);
   await page.screenshot({path:path.join(artifacts,'deck-'+String(n+1).padStart(2,'0')+'.png')});
  }
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.slide').evaluateAll(items=>items.filter(i=>getComputedStyle(i).display!=='none').length),count,'Print exposes every slide');
  assert.deepEqual(errors,[],'No JavaScript errors across extracted products');assert.deepEqual(network,[],'No attempted network access');
  const report={browser:browser.version(),lectures,slides,images,teachingSlides:count,networkRequests:network.length,javascriptErrors:errors.length};
  fs.writeFileSync(path.join(artifacts,'exports-result.json'),JSON.stringify(report,null,2));
  console.log('PASS: actual extracted offline libraries, images, review all-points/reselection, teaching fit, print, desktop/mobile.',JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
