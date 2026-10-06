'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.join(__dirname,'artifacts');process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});try{
 const c=await b.newContext({offline:true}),p=await c.newPage(),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 const project=JSON.parse(fs.readFileSync(path.join(root,'palette-project.chartroom.json')));
 assert.equal(project.course.palette,'agnar');
 async function checkFrame(f){
  await f.waitForFunction(()=>window.ChartroomPlayer);
  assert.equal(await f.locator('.cover').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 39, 93)');
  assert.equal(await f.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
  await f.evaluate(async()=>{for(const image of document.images)await image.decode();});
  assert.deepEqual(await f.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
 }
 await p.goto(pathToFileURL(path.join(root,'extracted-palette-student/index.html')).href);
 assert.equal(await p.locator('#sidebar').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 39, 93)');
 await checkFrame(p.frames().find(f=>f.parentFrame()===p.mainFrame()));
 for(const lecture of project.lectures.filter(l=>l.available)){
  await p.goto(pathToFileURL(path.join(root,'extracted-palette-teaching/lectures',lecture.id,'index.html')).href);
  await checkFrame(p.mainFrame());
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log('PASS: actual palette-selected GUI ZIPs extracted and opened offline; school colors in library shell + review slides + teaching decks, all images decoded, no overflowing slides, network requests or JS errors.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
