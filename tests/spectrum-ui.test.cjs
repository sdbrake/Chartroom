'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||chromium.executablePath(),headless:true});
 try{
  const context=await browser.newContext({offline:!/^https?:/.test(process.env.STUDIO_URL||''),acceptDownloads:true});const page=await context.newPage();
  page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.STUDIO_URL||pathToFileURL(path.join(root,'index.html')).href);
  await page.waitForFunction(()=>document.querySelector('#build-status').textContent.includes('slides'));
  await page.locator('#notes').fill('# Spectrum lesson\n\n');
  await page.locator('#notes').evaluate(t=>t.setSelectionRange(t.value.length,t.value.length));
  await page.locator('#insert-kind').selectOption('lens');await page.locator('#insert-slide').click();
  assert.match(await page.locator('#notes').inputValue(),/@spectrum Closed \| Open/,'New spectrum templates expose editable endpoint words');
  const notes='# Spectrum lesson\n\n## Policy spectrum @lens\n@spectrum Decisions made by markets | Decisions made by the state\n\n## A policy mix\n- Discuss the position.\n@spectrum Decisions made by markets | Decisions made by the state\n@slider 60%';
  await page.locator('#notes').fill(notes);await page.locator('#rebuild').click();
  await page.waitForFunction(()=>document.querySelector('#preview-count').textContent==='1 / 3');
  await page.locator('#preview-next').click();
  let frame=page.frames().find(f=>f.parentFrame());
  await frame.waitForFunction(()=>document.body.textContent.includes('Decisions made by markets'));
  await frame.waitForFunction(()=>window.ChartroomPlayer.getState().index===1);
  assert.match(await frame.locator('.slide:not([hidden])').innerText(),/Decisions made by the state/);
  const checks=await frame.evaluate(()=>window.ChartroomPlayer.audit().filter(s=>s.overflow));assert.deepEqual(checks,[]);
  await page.locator('#preview-next').click();await frame.waitForFunction(()=>window.ChartroomPlayer.getState().index===2);
  assert.match(await frame.locator('.slide:not([hidden])').innerText(),/Decisions made by markets/);
  const saved=page.waitForEvent('download');await page.locator('#save-project').click();
  const download=await saved, json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(json.lectures[0].notes,notes);
  for(const target of ['teaching','student']) {
    const ready=page.waitForEvent('download');
    await page.locator('#export-'+target).focus();await page.locator('#export-'+target).press('Enter');
    const file=await ready, bytes=fs.readFileSync(await file.path());
    assert.ok(bytes.includes(Buffer.from('Decisions made by markets')),'Custom left endpoint is in '+target+' export');
    assert.ok(bytes.includes(Buffer.from('Decisions made by the state')),'Custom right endpoint is in '+target+' export');
  }
  await page.reload();await page.waitForFunction(()=>document.querySelector('#notes').value.includes('@spectrum Decisions'));
  assert.equal(await page.locator('#notes').inputValue(),notes);
  assert.deepEqual(errors,[]);
  console.log('PASS: spectrum template editable labels, lens and meter preview, phrase fit, project save and autosave reload.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
