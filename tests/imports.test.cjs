'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'), artifacts=path.join(__dirname,'artifacts');
fs.mkdirSync(path.join(__dirname,'tmp'),{recursive:true});process.env.TEMP=process.env.TMP=path.join(__dirname,'tmp');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||chromium.executablePath(),headless:true});
 try{
  const context=await browser.newContext({offline:true,acceptDownloads:true});const page=await context.newPage();page.on('dialog',d=>d.accept());
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.locator('#import-notes-input').setInputFiles(path.join(root,'examples/blank-lecture.md'));
  await page.waitForFunction(()=>document.querySelectorAll('#lecture-list li').length===2,{}, {timeout:3000});
  assert.match(await page.locator('#notes').inputValue(),/Your first slide/);
  await page.locator('#notes').fill('# Image test\n## Whole figure @img images/chartroom-demo.png\n@alt Abstract graphic\n@credit Original test fixture');
  await page.locator('#rebuild').click();assert.equal(await page.locator('#export-student').isDisabled(),true);
  await page.locator('#import-images-input').setInputFiles(path.join(root,'examples/images/chartroom-demo.png'));
  await page.waitForFunction(()=>!document.querySelector('#export-student').disabled,{}, {timeout:5000});
  assert.equal(await page.locator('#assets input').inputValue(),'images/chartroom-demo.png');
  let event=page.waitForEvent('download');await page.locator('#save-project').click();await (await event).saveAs(path.join(artifacts,'image-project.chartroom.json'));
  const stored=JSON.parse(fs.readFileSync(path.join(artifacts,'image-project.chartroom.json'),'utf8'));assert.equal(stored.assets.length,1);assert.match(stored.assets[0].data,/^iVBOR/);
  await page.locator('#insert-kind').selectOption('cards');await page.locator('#insert-slide').click();
  assert.match(await page.locator('#notes').inputValue(),/## .*@cards/);
  await page.locator('#rebuild').click();
  assert.equal(await page.locator('#export-student').isDisabled(),false);
  await page.locator('#move-up').click();
  assert.match(await page.locator('#lecture-list button').first().textContent(),/blank-lecture/);
  // Exercise keyboard activation here; the studio suite separately covers pointer export.
  await page.locator('#export-student').focus();
  await page.evaluate(()=>{window.exportEvents=[];document.addEventListener('click',e=>window.exportEvents.push(e.target.id),true);});
  event=page.waitForEvent('download').catch(async error=>{console.error('Export diagnostics',await page.evaluate(()=>({notice:document.querySelector('#notice').textContent,focus:document.activeElement.id,events:window.exportEvents})));throw error;});
  await page.locator('#export-student').press('Enter');await (await event).saveAs(path.join(artifacts,'image-student.zip'));
  assert.deepEqual(errors,[]);
  console.log('PASS: import Markdown as new lecture, missing-image gate, local raster import, project retains bytes, insert archetype and reorder, export with images.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
