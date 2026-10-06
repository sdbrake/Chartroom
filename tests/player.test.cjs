'use strict';
const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const r = require('../src/renderer.js');
// Explicitly synthetic fixtures; not lecture material.
function slide(kind, more = {}) { return {kind,title:'Synthetic heading',eyebrow:'',hue:'olive',reveal:true,items:[],body:[],columns:[],notes:['PRIVATE SENTINEL'],meters:[],portraits:[],...more}; }
function model(slides) { return {version:1,title:'Synthetic test deck',slides,diagnostics:[],assets:[]}; }
const tmp = path.join(__dirname,'tmp'); const artifacts = path.join(__dirname,'artifacts');
fs.mkdirSync(tmp,{recursive:true});fs.mkdirSync(artifacts,{recursive:true});
let browser, serial = 0;
async function withPage(html, run, options={}) {
  if (!browser) { const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright'); browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || chromium.executablePath(),headless:true,env:{...process.env,TMP:tmp,TEMP:tmp,TMPDIR:tmp}}); }
  const context = await browser.newContext({viewport:{width:1280,height:800},offline:!options.url});

  if (options.init) await context.addInitScript(options.init);
  if (options.setup) await options.setup(context);
  const page = await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));

  const file = path.join(artifacts,'renderer-'+(++serial)+'.html');fs.writeFileSync(file,html);

  await page.goto(options.url || pathToFileURL(file).href,{waitUntil:options.waitUntil || 'load'});
  try { await run(page,context,file);assert.deepEqual(errors,[],'no browser runtime errors'); } finally {await context.close();}
}
after(async()=>{if(browser)await browser.close();});
const navModel = () => model([slide('cover'),slide('facts',{items:[{text:'Synthetic first',children:[{text:'Synthetic child',children:[]}]},{text:'Synthetic second',children:[]}]}),slide('cards',{items:[{text:'Whole card',children:[]}]}),slide('facts',{reveal:false,items:[{text:'No reveal',children:[]}]})]);
test('offline teaching player advances and reverses parent-group reveals with bounded keyboard navigation',async()=>{
  await withPage(r.renderDeck(navModel()),async page=>{
    assert.equal(await page.evaluate(()=>typeof window.ChartroomPlayer),'object');
    const state=()=>page.evaluate(()=>ChartroomPlayer.getState());
    assert.deepEqual(await state(),{index:0,step:0,count:4});
    await page.keyboard.press('ArrowRight');assert.deepEqual(await state(),{index:1,step:0,count:4});
    assert.equal(await page.locator('[data-slide="0"]').evaluate(e=>e.hidden && e.inert),true);
    assert.equal(await page.locator('[data-reveal]').first().evaluate(e=>getComputedStyle(e).visibility),'hidden');
    await page.keyboard.press('Space');assert.deepEqual(await state(),{index:1,step:1,count:4});
    assert.equal(await page.locator('[data-reveal] .children').first().isVisible(),true);
    await page.keyboard.press('ArrowLeft');assert.deepEqual(await state(),{index:1,step:0,count:4});
    await page.keyboard.press('PageDown');await page.keyboard.press('PageDown');await page.keyboard.press('PageDown');
    assert.deepEqual(await state(),{index:2,step:0,count:4});
    assert.equal(await page.getByText('Whole card',{exact:true}).isVisible(),true);
    await page.keyboard.press('PageUp');assert.deepEqual(await state(),{index:1,step:2,count:4});
    await page.keyboard.press('End');assert.deepEqual(await state(),{index:3,step:0,count:4});
    await page.keyboard.press('ArrowRight');assert.deepEqual(await state(),{index:3,step:0,count:4});
    await page.keyboard.press('Home');await page.keyboard.press('ArrowLeft');assert.deepEqual(await state(),{index:0,step:0,count:4});
    await page.evaluate(()=>ChartroomPlayer.go(999));assert.equal((await state()).index,3);
    await page.evaluate(()=>ChartroomPlayer.go(NaN));assert.equal((await state()).index,3);
    assert.equal(await page.locator('#progress').evaluate(e=>getComputedStyle(e).height),'4px');
  });
});
test('teaching resumes bounded content-keyed state, but review ignores saves and shows every reveal',async()=>{
  await withPage(r.renderDeck(navModel()),async page=>{
    await page.evaluate(()=>{ChartroomPlayer.next();ChartroomPlayer.next();});
    await page.reload();assert.deepEqual(await page.evaluate(()=>ChartroomPlayer.getState()),{index:1,step:1,count:4});
    const key=await page.evaluate(()=>Object.keys(localStorage).find(k=>k.startsWith('chartroom:')));assert.ok(key);
    await page.evaluate(k=>localStorage.setItem(k,JSON.stringify({index:999,step:999})),key);
    await page.reload();assert.deepEqual(await page.evaluate(()=>ChartroomPlayer.getState()),{index:3,step:0,count:4});
    await page.evaluate(k=>localStorage.setItem(k,'not JSON'),key);await page.reload();assert.equal(await page.evaluate(()=>ChartroomPlayer.getState().index),0);
    const changed=navModel();changed.slides[1].items[0].text+=' changed';
    const changedHtml=r.renderDeck(changed);const oldKey=key;
    await page.setContent(changedHtml);assert.notEqual(await page.evaluate(()=>document.body.dataset.storageKey),oldKey);
  });
  await withPage(r.renderDeck(navModel(),{mode:'review'}),async page=>{
    assert.deepEqual(await page.evaluate(()=>ChartroomPlayer.getState()),{index:0,step:0,count:4});
    await page.keyboard.press('ArrowRight');assert.equal(await page.getByText('Synthetic second',{exact:true}).isVisible(),true);
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>ChartroomPlayer.getState().index),2);
    await page.reload();assert.equal(await page.evaluate(()=>ChartroomPlayer.getState().index),0);
  },{init:()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}});}});
});
test('canvas scales inside desktop/mobile viewports, fits representative slides, and reports unfit density without cutting text',async()=>{
  const representative=model([slide('cover',{title:'Synthetic representative title'}),slide('facts',{title:'Synthetic representative facts',eyebrow:'Synthetic section',items:Array.from({length:5},(_,i)=>({text:'Synthetic point '+i+' preserves exact wording.',children:i===1?[{text:'Synthetic dependent child',children:[]}]:[]})),meters:[{label:'Synthetic axis',value:78}],footer:'Synthetic discussion question?'}),slide('quote',{body:['Synthetic quotation for a layout test. This is not an actual authored lecture quotation.'],attribution:'Synthetic attribution'}),slide('two-col',{columns:[{title:'Synthetic left',items:[{text:'Synthetic left argument',children:[]}]},{title:'Synthetic right',items:[{text:'Synthetic right argument',children:[]}]}]}),slide('facts',{title:'Synthetic impossible density',items:Array.from({length:65},()=>({text:'Synthetic deliberately excessive content which must be reported, never removed.',children:[]}))})]);
  await withPage(r.renderDeck(representative),async page=>{
    assert.equal(await page.evaluate(()=>typeof ChartroomPlayer.audit),'function');
    const audit=await page.evaluate(()=>ChartroomPlayer.audit());
    assert.ok(audit.slice(0,4).every(a=>!a.overflow),JSON.stringify(audit));
    assert.equal(audit[4].overflow,true);assert.equal(await page.locator('[data-slide="4"]').getAttribute('data-overflow'),'true');
    assert.equal(await page.locator('[data-slide="4"] li').count(),65);
    for(const size of [{width:1280,height:800},{width:390,height:844}]) {
      await page.setViewportSize(size);
      await page.waitForFunction(()=>{const r=document.querySelector('#canvas').getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;});
    }
    await page.setViewportSize({width:1600,height:900});await page.evaluate(()=>ChartroomPlayer.go(1));
    await page.screenshot({path:path.join(artifacts,'renderer-facts.png')});
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.slide:visible').count(),5);
    assert.equal(await page.locator('[data-reveal]').first().evaluate(e=>getComputedStyle(e).visibility),'visible');
  });
});
test('sandbox srcdoc bridge accepts its real parent, rejects wrong source/origin, and returns state',async()=>{
  const html=r.renderDeck(navModel(),{mode:'review'}).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
  await withPage('<!doctype html><iframe sandbox="allow-scripts" srcdoc="'+html+'"></iframe>',async page=>{
    const frame=page.frames().find(f=>f!==page.mainFrame());
    await frame.waitForFunction(()=>!!window.ChartroomPlayer);
    await page.evaluate(()=>{window.states=[];addEventListener('message',e=>{if(e.data.type==='chartroom-state')states.push(e.data);});document.querySelector('iframe').contentWindow.postMessage({type:'chartroom-command',command:'next'},'*');});
    await frame.waitForFunction(()=>ChartroomPlayer.getState().index===1);
    await frame.evaluate(()=>{dispatchEvent(new MessageEvent('message',{source:parent,origin:'https://evil.invalid',data:{type:'chartroom-command',command:'next'}}));dispatchEvent(new MessageEvent('message',{source:window,origin:'null',data:{type:'chartroom-command',command:'next'}}));});
    assert.equal(await frame.evaluate(()=>ChartroomPlayer.getState().index),1);
    await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'chartroom-command',command:'state'},'*'));
    await page.waitForFunction(()=>states.some(s=>s.index===1 && s.count===4));
  });
});
const course=()=>({title:'Synthetic course',code:'TEST',lectures:[{id:'one',title:'Synthetic lecture one',model:navModel()},{id:'later',title:'Synthetic future lecture',model:null},{id:'two',title:'Synthetic lecture two',model:model([slide('cover',{title:'Synthetic other cover'}),slide('facts',{items:[{text:'Synthetic other fact',children:[]}]})])}]});
test('offline review library selects in source order, starts at zero on reselection, and bounds controls',async()=>{
  assert.equal(typeof r.renderLibrary,'function');
  const html=r.renderLibrary(course());assert.doesNotMatch(html,/PRIVATE SENTINEL/);
  await withPage(html,async page=>{
    await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 4');
    assert.deepEqual(await page.locator('#lecture-list button').allTextContents(),['Synthetic lecture one','Synthetic future lecture — Coming soon','Synthetic lecture two']);
    assert.equal(await page.getByRole('button',{name:'Synthetic future lecture — Coming soon'}).isDisabled(),true);
    assert.equal(await page.getByRole('button',{name:'Previous',exact:true}).isDisabled(),true);
    assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts allow-same-origin');
    await page.getByRole('button',{name:'Next',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 4');
    const frame=page.frames().find(f=>f!==page.mainFrame());assert.equal(await frame.getByText('Synthetic second',{exact:true}).isVisible(),true);
    await page.getByRole('button',{name:'Synthetic lecture one',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 4');
    await page.getByRole('button',{name:'Synthetic lecture two',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
    await page.getByRole('button',{name:'Next',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 2');assert.equal(await page.getByRole('button',{name:'Next',exact:true}).isDisabled(),true);
    await page.locator('h1').click();await page.keyboard.press('Home');await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
    await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{source:window,origin:'null',data:{type:'chartroom-state',index:999,step:0,count:1000,resourcesReady:true,failedImages:0}})));
    assert.equal(await page.locator('#slide-status').textContent(),'Slide 1 of 2');
    await page.screenshot({path:path.join(artifacts,'renderer-library.png')});
  });
});
test('mobile Lectures toggle and fullscreen fallback remain accessible, including Escape inside the iframe',async()=>{
  await withPage(r.renderLibrary(course()),async page=>{
    await page.setViewportSize({width:390,height:844});
    const toggle=page.getByRole('button',{name:'Lectures',exact:true});assert.equal(await toggle.isVisible(),true);
    assert.equal(await page.locator('#sidebar').isVisible(),false);
    await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#sidebar').isVisible(),true);
    await page.getByRole('button',{name:'Synthetic lecture two',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
    assert.equal(await page.locator('#sidebar').isVisible(),false);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    const full=page.getByRole('button',{name:'Fullscreen',exact:true});await full.click();
    const exit=page.getByRole('button',{name:'Exit fullscreen',exact:true});assert.equal(await exit.isVisible(),true);
    assert.equal(await page.locator('#viewer').evaluate(e=>e.classList.contains('page-fill')),true);
    assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),true);
    const frame=page.frames().find(f=>f!==page.mainFrame());await frame.locator('.slide:not([hidden]) h1').click();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 2');
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#viewer').classList.contains('page-fill'));
    assert.equal(await full.isVisible(),true);assert.equal(await full.evaluate(e=>e===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:path.join(artifacts,'renderer-library-mobile.png')});
  },{init:()=>{Element.prototype.requestFullscreen=undefined;}});
});
test('fullscreen fallback contains focus, restores prior inert/menu state, and handles rejected native requests',async()=>{
  await withPage(r.renderLibrary(course()),async page=>{
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 4');
    await page.locator('#lectures-toggle').click();
    await page.evaluate(()=>document.querySelector('#sidebar').inert=true);
    await page.locator('#fullscreen').click();
    assert.equal(await page.locator('.skip-link').evaluate(e=>e.inert),true);
    assert.equal(await page.locator('#lectures-toggle').evaluate(e=>e.inert),true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.querySelector('#viewer').contains(document.activeElement)),true);
    await page.locator('.skip-link').evaluate(e=>e.focus());
    assert.equal(await page.evaluate(()=>document.querySelector('#viewer').contains(document.activeElement)),true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),true);
    assert.equal(await page.locator('.skip-link').evaluate(e=>e.inert),false);
    assert.equal(await page.locator('#lectures-toggle').evaluate(e=>e.inert),false);
    assert.equal(await page.locator('#lectures-toggle').getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator('#fullscreen').evaluate(e=>e===document.activeElement),true);
  },{init:()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Denied'));}});
});
test('sandboxed offline library loads embedded raster assets and navigates image slides after readiness',async()=>{
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
  const c={title:'Synthetic images',lectures:[{id:'images',title:'Images',model:model([slide('cover'),slide('img',{image:'images/sample.png',alt:'Synthetic pixel'})])}]};
  await withPage(r.renderLibrary(c,{assetUrls:{images:{'images/sample.png':png}}}),async page=>{
    await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
    const frame=page.frames().find(f=>f!==page.mainFrame());
    await frame.waitForFunction(()=>document.querySelector('img').complete);
    assert.equal(await frame.locator('img').evaluate(e=>e.naturalWidth),1);
    await page.locator('#next').click();
    await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 2');
    assert.equal(await frame.getByAltText('Synthetic pixel').isVisible(),true);
    await page.evaluate(()=>dispatchEvent(new MessageEvent('message',{source:document.querySelector('iframe').contentWindow,origin:'https://evil.invalid',data:{type:'chartroom-state',index:0,step:0,count:99,resourcesReady:true,failedImages:0}})));
    assert.equal(await page.locator('#slide-status').textContent(),'Slide 2 of 2');
  });
});
test('local review library loads separate relative images without a server',async()=>{
  const folder=path.join(artifacts,'images');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'sample.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'));
  const c={title:'Synthetic relative images',lectures:[{id:'images',title:'Images',model:model([slide('cover'),slide('img',{image:'images/sample.png',alt:'Synthetic pixel'})])}]};
  await withPage(r.renderLibrary(c),async page=>{
    const frame=page.frames().find(f=>f!==page.mainFrame());
    await frame.waitForFunction(()=>document.querySelector('img').complete);
    assert.equal(await frame.locator('img').evaluate(e=>e.naturalWidth),1,'local exported images must decode');
    assert.equal(await page.locator('#library-error').isVisible(),false);
    await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 2');
    assert.equal(await page.locator('#library-error').isVisible(),false);
  });
});
test('HTTP sandbox waits for images, accepts the real HTTP parent, and rejects forged commands',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const c={title:'Synthetic readiness',lectures:[{id:'images',title:'Images',model:model([slide('cover'),slide('img',{image:'images/sample.png',alt:'Synthetic pixel'})])}]};
  // A real loopback server also exercises out-of-process sandbox frames, whose
  // requests may bypass interception with the installed Playwright/Chrome pair.
  const server=require('node:http').createServer(async(req,res)=>{
    if(req.url==='/library.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(r.renderLibrary(c));return;}
    if(req.url!=='/images/sample.png'){res.writeHead(404);res.end();return;}
    await gate;res.writeHead(200,{'Content-Type':'image/png'});
    res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64'));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  try {await withPage(r.renderLibrary(c),async page=>{
    await page.waitForFunction(()=>document.querySelector('iframe'));
    const frame=page.frames().find(f=>f!==page.mainFrame());await frame.waitForFunction(()=>!!window.ChartroomPlayer);

    assert.equal(await page.locator('#next').isDisabled(),true);
    assert.equal(await page.locator('#slide-status').textContent(),'Loading lecture…');
    release();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
    assert.equal(await frame.locator('img').evaluate(e=>e.naturalWidth),1);
    await page.locator('#next').click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 2 of 2');
    await frame.evaluate(origin=>{
      dispatchEvent(new MessageEvent('message',{source:parent,origin:'null',data:{type:'chartroom-command',command:'home'}}));
      dispatchEvent(new MessageEvent('message',{source:window,origin,data:{type:'chartroom-command',command:'home'}}));
    },origin);
    assert.equal(await frame.evaluate(()=>ChartroomPlayer.getState().index),1);
    await page.locator('#previous').click();await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 2');
  },{url:origin+'/library.html',waitUntil:'domcontentloaded'});
  } finally {release();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('native fullscreen exit restores library focus and inert state',async()=>{
  await withPage(r.renderLibrary(course()),async page=>{
    await page.waitForFunction(()=>document.querySelector('#slide-status').textContent==='Slide 1 of 4');
    await page.locator('#fullscreen').click();
    await page.waitForFunction(()=>document.fullscreenElement===document.querySelector('#viewer'));
    await page.evaluate(()=>document.exitFullscreen());
    await page.waitForFunction(()=>!document.querySelector('#viewer').classList.contains('page-fill'));
    assert.equal(await page.locator('#sidebar').evaluate(e=>e.inert),false);
    assert.equal(await page.locator('#fullscreen').evaluate(e=>document.activeElement===e),true);
  });
});
test('renderDeck preserves public wording and bold while excluding private fields and escaping injection', () => {
  const html = r.renderDeck(model([slide('cover',{title:'Synthetic <title> & **bold**'}),slide('facts',{body:['literal </script><script>alert(1)</script>'],items:[{text:'A **bold** point & <img onerror=x>',children:[{text:'Exact child—punctuation',children:[]}]}]})]),{deckId:'</script><script>evil</script>'});
  assert.match(html,/^<!doctype html>/i);assert.match(html,/<strong>bold<\/strong>/);assert.match(html,/Exact child—punctuation/);assert.match(html,/&lt;img onerror=x&gt;/);assert.doesNotMatch(html,/PRIVATE SENTINEL|<script>alert|<script>evil/);assert.match(html,/<html lang="en">/);
});
test('all archetypes render their explicit public fields in fixed Chartroom layouts', () => {
  const kinds=['cover','divider','part','facts','cards','two-col','quote','big','photo','somber','img','lens','duo','scholar'];
  const html=r.renderDeck(model(kinds.map(kind=>slide(kind,{image:'images/test.png',alt:'Synthetic exhibit',credit:'Synthetic credit',body:['Synthetic body'],columns:[{title:'Left',items:[{text:'Column item',children:[]}]},{title:'Right',items:[]}],portraits:[{image:'a.jpg',name:'Person A',credit:'Credit A',alt:'Portrait A'},{image:'b.png',name:'Person B',credit:'Credit B',alt:'Portrait B'}],meters:[{label:'Synthetic axis',value:78}],attribution:'Synthetic attribution',citation:'Synthetic citation',takeaway:'Synthetic takeaway',footer:'Synthetic footer',polarity:true}))),{});
  for(const kind of kinds)assert.match(html,new RegExp('class="slide '+kind));
  for(const field of ['Column item','Person A','Person B','Credit A','Synthetic citation','Synthetic takeaway','Synthetic attribution','Synthetic footer','Synthetic credit','Synthetic axis'])assert.ok(html.includes(field),field);
  assert.match(html,/width:1600px/);assert.match(html,/height:900px/);assert.match(html,/object-fit:contain/);assert.match(html,/#f2efe9/);assert.match(html,/data-value="78"/);
  assert.doesNotMatch(r.renderDeck(model([slide('facts')])),/<div class="meter"/);
});
test('rejects unsafe image locations while accepting safe relative raster and explicit raster data assets',()=>{
  for(const bad of ['https://tracker.invalid/x.png','../x.png','/root.png','x.svg','javascript:alert(1)','data:image/svg+xml;base64,AAAA','images/%2e%2e/x.png','x.png?evil=1']) {
    assert.throws(()=>r.renderDeck(model([slide('img',{image:bad})])),/asset|image|unsafe/i,bad);
    assert.throws(()=>r.renderDeck(model([slide('img',{image:'safe.png'})]),{assetUrls:{'safe.png':bad}}),/asset|image|unsafe/i,bad);
  }
  assert.match(r.renderDeck(model([slide('img',{image:'images/a b.png',alt:'" < &'} )])),/src="images\/a b.png"/);
  assert.match(r.renderDeck(model([slide('img',{image:'a.png'})]),{assetUrls:{'a.png':'data:image/png;base64,iVBORw0KGgo='}}),/data:image\/png;base64/);
});
