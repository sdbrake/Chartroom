'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(__dirname,'tmp'),{recursive:true});process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
try{
 const context=await browser.newContext({offline:true,viewport:{width:1600,height:1100}}),page=await context.newPage();page.on('dialog',d=>d.accept());
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 await page.locator('#notes').fill('# Too much\n## Deliberately overloaded\n'+Array.from({length:60},(_,i)=>'- Test fact '+i+'. This deliberate stress fixture must not silently be clipped.').join('\n'));
 await page.locator('#rebuild').click();
 let downloads=0;page.on('download',()=>downloads++);
 await page.locator('#export-student').scrollIntoViewIfNeeded();await page.locator('#export-student').boundingBox();await page.locator('#export-student').click();
 await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Export blocked:'),{}, {timeout:6000});
 assert.match(await page.locator('#notice').textContent(),/overflow|does not fit|too dense/i);
 assert.equal(downloads,0,'Overflow blocks student export');
 const result=await page.evaluate(async()=>{
  const p={format:'chartroom-studio',version:1,course:{title:'Corrupt raster',code:''},lectures:[{id:'one',title:'One',available:true,notes:'# Image\n## Exhibit @img images/x.png\n@alt Corrupt test'}],assets:[{lectureId:'one',path:'images/x.png',mime:'image/png',data:'iVBORw0KGgo='}]};
  return ChartroomPreflight.check(p);
 });
 assert.ok(result.some(r=>/image|decode/i.test(r.message)),'Truncated raster fails actual browser decoding');
 console.log('PASS: browser preflight blocks clipping and invalid raster decoding before export.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
