'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname,'..');
const artifacts = path.join(root,'tests/artifacts');
fs.mkdirSync(path.join(root,'tests/tmp'),{recursive:true});
fs.mkdirSync(artifacts,{recursive:true});
process.env.TEMP=process.env.TMP=path.join(root,'tests/tmp');
(async()=>{
  assert.ok(fs.existsSync(path.join(root,'index.html')),'Offline Studio entry point exists');
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || chromium.executablePath(),headless:true});
  const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true,offline:true});
  const page=await context.newPage();
  page.on('dialog',dialog=>dialog.accept());
  const errors=[], network=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
  try {
    await page.goto(process.env.STUDIO_URL || pathToFileURL(path.join(root,'index.html')).href);
    await page.locator('#notes').fill('# Browser test\n## Exact words\n- First point.\n  - Child point.\n- Second point.\n%%PRIVATE BROWSER NOTE%%');
    await page.locator('#rebuild').click();
    await page.waitForFunction(()=>document.querySelector('#build-status').textContent.includes('2 slides'));
    assert.equal(await page.locator('#export-student').isDisabled(),false);
    let downloadEvent=page.waitForEvent('download');
    await page.locator('#save-project').click();
    let download=await downloadEvent;
    const saved=path.join(artifacts,'browser-project.chartroom.json'); await download.saveAs(saved);
    const project=JSON.parse(fs.readFileSync(saved,'utf8'));
    assert.match(project.lectures[0].notes,/PRIVATE BROWSER NOTE/);
    // Chrome 154 can retain the preview iframe's old hit-test region just after
    // auto-scrolling. Let the compositor paint before sending the real mouse click.
    await page.locator('#export-student').scrollIntoViewIfNeeded();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    downloadEvent=page.waitForEvent('download'); await page.locator('#export-student').click();
    download=await downloadEvent; await download.saveAs(path.join(artifacts,'browser-student.zip'));
    downloadEvent=page.waitForEvent('download'); await page.locator('#export-teaching').click();
    download=await downloadEvent; await download.saveAs(path.join(artifacts,'browser-teaching.zip'));
    await page.locator('#notes').fill('# Invalid\n## Example @not-a-real-tag');
    await page.locator('#rebuild').click();
    await page.waitForFunction(()=>document.querySelector('#export-student').disabled);
    assert.match(await page.locator('#diagnostics').textContent(),/line 2/i);
    await page.locator('#open-project-input').setInputFiles(saved);
    await page.waitForFunction(()=>document.querySelector('#notes').value.includes('PRIVATE BROWSER NOTE'));
    await page.locator('#add-lecture').click();
    await page.locator('#lecture-title').fill('Coming next');
    await page.locator('#available').uncheck();
    await page.locator('#rebuild').click();
    await page.locator('#preview-library').click();
    assert.equal(await page.locator('.preview-nav').isVisible(),false,'Hide deck controls when the library provides its own');
    await page.waitForTimeout(150);
    await page.screenshot({path:path.join(artifacts,'studio-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No mobile horizontal page overflow');
    await page.screenshot({path:path.join(artifacts,'studio-mobile.png'),fullPage:true});
    assert.deepEqual(errors,[],'No browser JavaScript errors');
    assert.deepEqual(network,[],'No network requests in offline Studio');
    console.log('PASS: real file:// offline Studio edits, validates, saves/imports project, downloads teaching/student ZIPs, coming-soon lecture, mobile fit; no network or JS errors.');
  } catch(error) {
    console.error('Studio failure diagnostics:', JSON.stringify({browser:browser.version(),notice:await page.locator('#notice').textContent(),status:await page.locator('#build-status').textContent(),errors,network}));
    throw error;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
