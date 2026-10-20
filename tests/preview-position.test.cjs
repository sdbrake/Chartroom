'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH || chromium.executablePath(),headless:true});
  const context=await browser.newContext({offline:!process.env.STUDIO_URL,viewport:{width:1600,height:1000}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  const frame=()=>page.frameLocator('#preview');
  const count=async text=>page.waitForFunction(value=>document.querySelector('#preview-count').textContent===value,text);
  const current=()=>frame().locator('.slide:not([hidden])');
  const notes='# Synthetic cover\n## Synthetic middle\n- First point\n- Second point\n## Synthetic last\n- Last point';
  try{
    await page.goto(process.env.STUDIO_URL || pathToFileURL(path.join(root,'index.html')).href);
    await page.locator('#notes').fill(notes);
    await page.locator('#rebuild').click();await count('1 / 3');
    await page.locator('#preview-next').click();await count('2 / 3');
    // Use the actual debounced typing path, not just the rebuild button.
    await page.locator('#notes').fill(notes.replace('First point','Edited first point'));
    await frame().getByText('Edited first point',{exact:true}).waitFor({state:'attached'});
    assert.equal(await current().locator('h1').textContent(),'Synthetic middle','editing must retain the visible slide');
    await count('2 / 3');
    await page.locator('#palette').selectOption('atlantic');await count('2 / 3');
    await page.locator('#preview-mode').selectOption('teaching');await count('2 / 3');
    await page.locator('#preview-next').click();
    await frame().getByText('Edited first point',{exact:true}).waitFor({state:'visible'});
    await page.locator('#notes').fill(notes.replace('First point','Edited again'));
    await frame().getByText('Edited again',{exact:true}).waitFor({state:'visible'});
    assert.equal(await current().locator('[data-reveal]').nth(1).evaluate(el=>getComputedStyle(el).visibility),'hidden','keep the teaching reveal step too');
    await page.locator('#preview-mode').selectOption('review');await count('2 / 3');
    // Temporary invalid annotations must not discard the last good position.
    await page.locator('#notes').fill(notes+'\n## Bad @not-a-real-tag');
    await frame().getByText('Fix the annotations to preview.').waitFor();
    await page.locator('#notes').fill(notes);await count('2 / 3');
    // If the current slide is removed, use the nearest remaining slide.
    await page.locator('#preview-next').click();await count('3 / 3');
    await page.locator('#notes').fill(notes.split('## Synthetic last')[0]);await count('2 / 2');
    assert.equal(await current().locator('h1').textContent(),'Synthetic middle');
    await page.locator('#preview-home').click();await count('1 / 2');
    await page.locator('#preview-next').click();await count('2 / 2');
    await page.locator('#add-lecture').click();await count('1 / 2');
    await page.locator('#lecture-list button').first().click();await count('1 / 2');
    await page.locator('#preview-next').click();await count('2 / 2');
    await page.locator('#new-project').click();await count('1 / 2');
    assert.deepEqual(errors,[]);
    assert.equal(await page.locator('#preview').getAttribute('sandbox'),'allow-scripts');
    console.log('PASS: preview retains slide/reveal across edits and palette/mode changes, recovers after invalid annotations, bounds deleted slides, and resets for another lecture/project; no JS errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
