'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts');process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
const ids=['atlantic','field-notes','aubergine','night-seminar'];
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const c=await b.newContext({offline:true,acceptDownloads:true,viewport:{width:1600,height:1150}}),p=await c.newPage(),errors=[],requests=[];
  c.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});});
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.join(root,'index.html')).href);
  assert.deepEqual(await p.locator('#palette option').allTextContents(),['Chartroom Classic','Buster','Agnar','Atlantic','Field Notes','Aubergine','Night Seminar']);
  await p.locator('#load-demo').click();
  const notes=await p.locator('#notes').inputValue()+'\n## A divider\n\n## Paired portraits @duo\n@portrait images/chartroom-demo.png | First person | Example credit | Example portrait\n@portrait images/chartroom-demo.png | Second person | Example credit | Example portrait\n\n## Scholar @scholar images/chartroom-demo.png\n@alt Example illustration\n@citation Citation placeholder\n@takeaway Your exact takeaway\n@credit Example credit\n';
  await p.locator('#notes').fill(notes);await p.locator('#rebuild').click();
  const probe=await c.newPage();
  for(const id of ids){
   await p.locator('#palette').selectOption(id);
   assert.equal(await p.locator('#notes').inputValue(),notes);
   if(id==='night-seminar')assert.match(await p.locator('#palette-help').textContent(),/projector|lighting/i,'Dark palette guidance');
   const restored=await c.newPage();await restored.goto(pathToFileURL(path.join(root,'index.html')).href);
   assert.equal(await restored.locator('#palette').inputValue(),id,'Autosave '+id);await restored.close();
   const saved=p.waitForEvent('download');await p.locator('#save-project').click();
   const projectFile=path.join(artifacts,`editorial-${id}.chartroom.json`);await (await saved).saveAs(projectFile);
   const project=JSON.parse(fs.readFileSync(projectFile));assert.equal(project.course.palette,id);assert.equal(project.lectures[0].notes,notes);
   await p.locator('#palette').selectOption('classic');await p.locator('#open-project-input').setInputFiles(projectFile);
   await p.waitForFunction(id=>document.querySelector('#palette').value===id,id);
   const palette=require('../src/renderer.js').palettes[id];
   async function checkDeck(frame){
    await frame.waitForFunction(()=>window.ChartroomPlayer&&document.images.length>0);
    assert.equal(await frame.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--paper').trim()),palette.paper);
    assert.equal(await frame.locator('.cover').evaluate(el=>getComputedStyle(el).getPropertyValue('--navy').trim()),palette.navy);
    await frame.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    assert.equal(await frame.locator('.slide').count(),16,'Every supported layout is present');
    assert.deepEqual(await frame.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
   }
   await checkDeck(p.frames().find(f=>f.parentFrame()===p.mainFrame()));
   for(const target of ['student','teaching']){
    const button=p.locator('#export-'+target);await button.focus();
    const event=p.waitForEvent('download');await button.press('Enter');
    const zip=path.join(artifacts,`editorial-${id}-${target}.zip`),dir=path.join(artifacts,`extracted-editorial-${id}-${target}`);
    await (await event).saveAs(zip);
    cp.execFileSync(process.env.PYTHON||'python',['-c','import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; z.extractall(sys.argv[2])',zip,dir]);
    const file=target==='student'?path.join(dir,'index.html'):path.join(dir,'lectures/workshop/index.html');
    await probe.goto(pathToFileURL(file).href);
    if(target==='student'){
     assert.equal(await probe.locator('#sidebar').evaluate(el=>getComputedStyle(el).getPropertyValue('--navy').trim()),palette.navy);
     await probe.waitForFunction(()=>document.querySelector('#slide-status').textContent.startsWith('Slide 1'));
     await checkDeck(probe.frames().find(f=>f.parentFrame()===probe.mainFrame()));
     await probe.locator('#next').click();await probe.waitForFunction(()=>document.querySelector('#slide-status').textContent.startsWith('Slide 2'));
     await probe.screenshot({path:path.join(artifacts,`editorial-${id}-library.png`)});
     if(id==='night-seminar'){
      await probe.setViewportSize({width:390,height:844});await probe.locator('#lectures-toggle').click();
      assert.ok(await probe.locator('#sidebar').isVisible());
      assert.ok(await probe.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await probe.screenshot({path:path.join(artifacts,'editorial-night-mobile.png')});
      await probe.setViewportSize({width:1600,height:1150});
     }
    }else await checkDeck(probe.mainFrame());
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  console.log('PASS: four editorial palettes in Studio, guidance, unchanged notes, autosave, portable project reopen; eight real GUI ZIPs downloaded/extracted, all 16 layout examples fit and images decode; dark mobile library; no network or JS errors. Browser '+b.version());
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
