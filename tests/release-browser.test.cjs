'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{pathToFileURL,fileURLToPath}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),offline=path.join(root,'tests/tmp/release-offline'),repository=path.join(root,'tests/tmp/release-repository');
assert.ok(fs.existsSync(path.join(offline,'index.html')),'Run scripts/check-release.py to extract both ZIPs first.');
const hosted=spawnSync(process.execPath,[path.join(__dirname,'hosted.test.cjs')],{cwd:root,env:{...process.env,APP_ROOT:repository,CHECK_OFFLINE_DOWNLOAD:'1'},stdio:'inherit'});
assert.equal(hosted.status,0,'Actual extracted GitHub ZIP passes hosted subdirectory checks and its download works.');
process.env.TMP=process.env.TEMP=path.join(root,'tests/tmp');
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const c=await b.newContext({offline:true,acceptDownloads:true,viewport:{width:1600,height:1000}}),p=await c.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{const u=r.url();if(/^https?:/.test(u)||(u.startsWith('file:')&&!path.resolve(fileURLToPath(u)).startsWith(path.resolve(offline)+path.sep)))requests.push(u);});p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.join(offline,'index.html')).href);assert.equal(await p.locator('.brand p').textContent(),'Slideshow generator and converter.');assert.equal(await p.locator('#offline-download').isVisible(),false);
  await p.locator('#open-project-input').setInputFiles(path.join(offline,'examples/demo.chartroom.json'));await p.waitForFunction(()=>document.querySelector('#notes').value.includes('Chartroom workshop'));
  const notes=p.locator('#notes');await notes.fill((await notes.inputValue())+'\n\n*PRIVATE_RELEASE_CHECK*\n');await p.locator('#rebuild').click();
  await p.locator('#present-lecture').focus();await p.locator('#present-lecture').press('Enter');await p.waitForFunction(()=>document.querySelector('#presentation').dataset.ready==='true');
  const f=await(await p.locator('#presentation iframe').elementHandle()).contentFrame();await f.waitForLoadState();await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));assert.ok(!(await f.content()).includes('PRIVATE_RELEASE_CHECK'));
  await p.keyboard.press('ArrowRight');await f.waitForFunction(()=>ChartroomPlayer.getState().index===1);await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#presentation').hidden);assert.ok((await notes.inputValue()).includes('PRIVATE_RELEASE_CHECK'));
  for(const id of ['save-project','export-student','export-teaching']){await p.locator('#'+id).scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const event=p.waitForEvent('download');await p.locator('#'+id).click();const d=await event;assert.equal(await d.failure(),null);assert.ok(fs.statSync(await d.path()).size>0);}
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS: actual extracted offline ZIP, reopened project/images, privacy, presentation/navigation/exit and all downloads; zero network/original-folder requests or JavaScript errors.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
