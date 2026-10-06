'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts');process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});try{
 const c=await b.newContext({offline:true,acceptDownloads:true,viewport:{width:1600,height:1150}}),p=await c.newPage(),errors=[],network=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await p.goto(pathToFileURL(path.join(root,'index.html')).href);
 assert.equal(await p.locator('#palette').count(),1,'Named palette selector exists');
 assert.deepEqual(await p.locator('#palette option').allTextContents(),['Chartroom Classic','Buster','Agnar','Atlantic','Field Notes','Aubergine','Night Seminar']);
 assert.equal(await p.locator('#palette').inputValue(),'classic');
 await p.locator('#load-demo').click();const original=await p.locator('#notes').inputValue();
 for(const [id,color,paper] of [['buster','rgb(153, 0, 38)','rgb(243, 240, 235)'],['agnar','rgb(0, 39, 93)','rgb(255, 255, 255)'],['classic','rgb(24, 32, 48)','rgb(242, 239, 233)']]){
  await p.locator('#palette').selectOption(id);
  const frame=()=>p.frames().find(f=>f.parentFrame()===p.mainFrame());
  await frame().waitForFunction(color=>window.ChartroomPlayer&&getComputedStyle(document.querySelector('.cover')).backgroundColor===color,color);
  assert.equal(await p.locator('#notes').inputValue(),original);
  assert.equal(await frame().evaluate(()=>getComputedStyle(document.body).backgroundColor),paper);
  assert.deepEqual(await frame().evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[]);
  await frame().locator('#canvas').screenshot({path:path.join(artifacts,'palette-'+id+'-cover.png')});
  await frame().evaluate(()=>ChartroomPlayer.go(1));
  if(id!=='classic')assert.equal(await frame().locator('.slide').nth(1).locator('h1').evaluate(el=>getComputedStyle(el).color),color,'School color headlines');
  await frame().locator('#canvas').screenshot({path:path.join(artifacts,'palette-'+id+'-facts.png')});
  // Inspect rendered review shell AND its generated child, not just serialized CSS.
  await p.locator('#preview-library').click();
  await frame().waitForFunction(color=>document.querySelector('#sidebar')&&getComputedStyle(document.querySelector('#sidebar')).backgroundColor===color,color);
  const nested=()=>p.frames().find(f=>f.parentFrame()===frame());
  await p.waitForFunction(()=>document.querySelector('#preview').srcdoc.includes('course-config'));
  await nested().waitForFunction(color=>window.ChartroomPlayer&&getComputedStyle(document.querySelector('.cover')).backgroundColor===color,color);
  await p.locator('#preview-library').click();
 }
 await p.locator('#palette').selectOption('agnar');
 const restored=await c.newPage();await restored.goto(pathToFileURL(path.join(root,'index.html')).href);
 assert.equal(await restored.locator('#palette').inputValue(),'agnar','Autosaved palette survives reopening Studio');await restored.close();
 const saved=p.waitForEvent('download');await p.locator('#save-project').click();const d=await saved;const file=path.join(artifacts,'palette-project.chartroom.json');await d.saveAs(file);
 assert.equal(JSON.parse(fs.readFileSync(file)).course.palette,'agnar');
 await p.locator('#new-project').click();assert.equal(await p.locator('#palette').inputValue(),'classic');
 // New blank project is unsaved: accept explicit replace confirmation.
 p.on('dialog',d=>d.accept());await p.locator('#open-project-input').setInputFiles(file);
 await p.waitForFunction(()=>document.querySelector('#palette').value==='agnar');
 await p.evaluate(()=>{
  window.preflightFrames=[];
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.tagName==='IFRAME'&&node.style.left==='-20000px')window.preflightFrames.push({visibility:getComputedStyle(node).visibility,school:node.srcdoc.includes('--navy:#00275D')});}).observe(document.body,{childList:true});
 });
 for(const target of ['student','teaching']){
  const button=p.locator('#export-'+target);
  await button.focus();
  assert.equal(await p.evaluate(()=>document.activeElement.id),'export-'+target,'Export control has keyboard focus');
  const event=p.waitForEvent('download').catch(async error=>{console.error('Export state',target,await p.locator('#notice').textContent(),errors);throw error;});
  await button.press('Enter');await (await event).saveAs(path.join(artifacts,'palette-'+target+'.zip'));
 }
 const measured=await p.evaluate(()=>window.preflightFrames);assert.ok(measured.length>=2);
 assert.ok(measured.every(f=>f.visibility==='visible'&&f.school),'Preflight tests selected school colors offscreen without hidden-frame decode throttling');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 const R=require('../src/renderer.js');
 const luminance=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 const probe=await c.newPage();
 for(const palette of ['buster','agnar']){
  await probe.setContent(R.renderDeck({title:'Contrast probe',slides:[{kind:'cover',title:'School colors',credit:'Credit on dark cover'},{kind:'two-col',title:'Meter',polarity:true,columns:[{title:'Closed',items:[]},{title:'Open',items:[]}],meters:[{label:'Test',value:50}]}]},{palette,mode:'review'}));
  const pairs=await probe.evaluate(()=>{
   const style=s=>getComputedStyle(document.querySelector(s));
   if(style('.polarity .column:first-child h2').color===style('.polarity .column:last-child h2').color)throw new Error('Polarity columns must retain distinct warm/cool school colors');
   return [['cover credit',style('.credit').color,style('.cover').backgroundColor],['open label',style('.axis-labels span:last-child').color,style('body').backgroundColor],['closed label',style('.axis-labels span:first-child').color,style('body').backgroundColor]];
  });
  for(const [label,foreground,background] of pairs)assert.ok(contrast(foreground,background)>=4.5,`${palette} ${label}: contrast ${contrast(foreground,background)}`);
 }
 console.log('PASS: seven palette choices, exact computed cover/paper colors, unchanged notes, all demo slides fit, live review shell + child, save/reopen, both checked ZIP exports, zero network/JS errors.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
