'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const R=require('../src/renderer.js'),Parser=require('../src/parser.js');
const root=path.resolve(__dirname,'..'),artifacts=path.join(__dirname,'artifacts');
process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
const ids=['atlantic','field-notes','aubergine','night-seminar'];
const source='# Palette sample\n@eyebrow Cover label\n\n## Facts\n- Your exact words.\n@citation Citation placeholder\n@credit Credit placeholder\n@slider 50%\n\n## Cards @cards\n- First idea\n- Second idea\n@takeaway A short takeaway.\n\n## Compare @two-col\n### Closed\n- First position\n### Open\n- Second position\n@polarity\n\n## Quotation @quote\nYour exact quotation.\n@attribution Attribution placeholder\n\n## A statement @big\n@takeaway Takeaway on a dark slide.\n@slider 50%\n@citation Citation on a dark slide.';
const lum=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});
 try{
  const c=await b.newContext({offline:true,viewport:{width:1600,height:900}}),p=await c.newPage(),errors=[],requests=[],results=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  for(const id of ids){
   const model=Parser.parse(source);assert.deepEqual(model.diagnostics.filter(d=>d.severity==='error'),[]);
   await p.setContent(R.renderDeck(model,{palette:id,mode:'review'}));
   await p.evaluate(()=>ChartroomPlayer.go(2));
   const panelGap=await p.evaluate(()=>document.querySelector('.cards .takeaway').getBoundingClientRect().top-document.querySelector('.cards-list').getBoundingClientRect().bottom);
   assert.ok(panelGap>=20,id+' takeaway stays visually separate from cards');
   const pairs=await p.evaluate(()=>{
    const color=s=>getComputedStyle(document.querySelector(s)).color;
    const bg=s=>getComputedStyle(document.querySelector(s)).backgroundColor;
    const paper=bg('body'),cover=bg('.cover'),big=bg('.big');
    return [
     ['body',color('.facts .rail'),paper],['heading',color('.facts h1'),paper],
     ['citation',color('.facts .citation'),paper],['credit',color('.facts .credit'),paper],
     ['attribution',color('.quote .attribution'),paper],['cards',color('.cards-list>li'),bg('.cards-list>li')],
     ['takeaway',color('.cards .takeaway'),bg('.cards .takeaway')],
     ['left column',color('.column:first-child h2'),paper],['right column',color('.column:last-child h2'),paper],
     ['closed meter',color('.facts .axis-labels span:first-child'),paper],['open meter',color('.facts .axis-labels span:last-child'),paper],
     ['cover label',color('.cover .eyebrow'),cover],['cover heading',color('.cover h1'),cover],
     ['dark takeaway',color('.big .takeaway'),bg('.big .takeaway')],['dark citation',color('.big .citation'),big],
     ['dark closed meter',color('.big .axis-labels span:first-child'),big],['dark open meter',color('.big .axis-labels span:last-child'),big]
    ];
   });
   for(const [label,fg,bg] of pairs){const ratio=contrast(fg,bg);results.push({palette:id,label,ratio});assert.ok(ratio>=4.5,`${id} ${label}: ${ratio.toFixed(2)} (${fg} on ${bg})`);}
   assert.deepEqual(await p.evaluate(()=>ChartroomPlayer.audit().filter(s=>s.overflow)),[],id+' fit');
   if(id==='night-seminar'){
    assert.equal(await p.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'dark');
    assert.equal(await p.locator('.cards-list>li').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(36, 52, 68)');
   }
   for(const [type,index] of [['cover',0],['facts',1],['cards',2],['comparison',3],['quote',4]]){
    await p.evaluate(i=>ChartroomPlayer.go(i),index);
    await p.screenshot({path:path.join(artifacts,`editorial-${id}-${type}.png`)});
   }
   await p.setContent(R.renderLibrary({title:'Palette sample',code:'DEMO',palette:id,lectures:[]}));
   const libraryPairs=await p.evaluate(()=>{
    const el=s=>getComputedStyle(document.querySelector(s));
    return [['library heading',el('#sidebar h1').color,el('#sidebar').backgroundColor],['library controls',el('#fullscreen').color,el('body').backgroundColor],['library status',el('#slide-status').color,el('body').backgroundColor],['skip link',el('.skip-link').color,el('.skip-link').backgroundColor]];
   });
   for(const [label,fg,bg] of libraryPairs){const ratio=contrast(fg,bg);results.push({palette:id,label,ratio});assert.ok(ratio>=4.5,`${id} ${label}: ${ratio.toFixed(2)}`);}
   if(id==='night-seminar')assert.equal(await p.locator('html').evaluate(el=>getComputedStyle(el).colorScheme),'dark');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  fs.writeFileSync(path.join(artifacts,'editorial-contrast.json'),JSON.stringify(results,null,2));
  console.log('PASS: four palettes, computed text contrast on light/dark/callout surfaces and library controls, dark color-scheme, card colors, slide fit and screenshots; no network or JS errors. Browser '+b.version());
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
