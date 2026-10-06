'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(process.env.APP_ROOT||path.join(__dirname,'..'));process.env.TMP=process.env.TEMP=path.join(root,'tests/tmp');fs.mkdirSync(process.env.TMP,{recursive:true});
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),rel=decodeURIComponent(url.pathname).replace(/^\/chartroom-studio\//,'');
 if(!/^(index\.html|src\/.+|examples\/.+|docs\/.+|downloads\/.+)$/.test(rel)||rel.split('/').includes('..')){res.writeHead(404);return res.end();}
 const f=path.join(root,rel);if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.zip':'application/zip'})[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(f));
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let b;
try{
 b=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH||chromium.executablePath()});const c=await b.newContext({acceptDownloads:true,viewport:{width:1600,height:1000}}),p=await c.newPage(),errors=[],external=[],uploads=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))external.push(r.url());if(r.method()!=='GET')uploads.push(r.url());});p.on('dialog',d=>d.accept());
 await p.goto(origin+'/chartroom-studio/index.html');
 assert.equal(await p.locator('.brand p').textContent(),'Slideshow generator and converter.');
 assert.match(await p.locator('.course-panel').textContent(),/Lecture notes and slideshows output separately\./);
 assert.ok(!(await p.locator('body').textContent()).includes('No AI rewriting.'));
 assert.equal(await p.locator('#offline-download').count(),1,'hosted app offers the current offline download');
 assert.equal(await p.locator('#offline-download').isVisible(),true);
 // Packaging test exercises the linked ZIP; the ordinary runtime suite can run before packaging.
 if(process.env.CHECK_OFFLINE_DOWNLOAD==='1'){
  const d=p.waitForEvent('download');await p.locator('#offline-download').click();const download=await d;assert.equal(await download.failure(),null);assert.ok(fs.statSync(await download.path()).size>0);
 }
 await p.locator('#open-project-input').setInputFiles(path.join(root,'examples/demo.chartroom.json'));
 await p.waitForFunction(()=>document.querySelector('#notes').value.includes('Chartroom workshop'));
 await p.locator('#palette').selectOption('atlantic');await p.locator('#rebuild').click();await p.reload();await p.waitForFunction(()=>document.querySelector('#palette').value==='atlantic');
 await c.setOffline(true);
 for(const id of ['save-project','export-student','export-teaching']){
  await p.locator('#'+id).scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const done=p.waitForEvent('download');await p.locator('#'+id).click();const d=await done;assert.equal(await d.failure(),null);assert.ok(fs.statSync(await d.path()).size>0);
 }
 await p.locator('#present-lecture').focus();await p.locator('#present-lecture').press('Enter');await p.waitForFunction(()=>document.querySelector('#presentation').dataset.ready==='true');
 const f=await(await p.locator('#presentation iframe').elementHandle()).contentFrame();await f.waitForLoadState();
 await f.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));await p.keyboard.press('ArrowRight');await f.waitForFunction(()=>ChartroomPlayer.getState().index===1);await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#presentation').hidden);
 const local=await c.newPage();await local.goto(pathToFileURL(path.join(root,'index.html')).href);assert.equal(await local.locator('#offline-download').isVisible(),false,'offline copy does not offer a nonexistent nested ZIP');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(uploads,[]);
 console.log('PASS: hosted subdirectory, exact UI wording, portable project import, autosave/reload, local exports/presentation after disconnect, images, hosted-only download link, no uploads/external requests/JS errors.');
}finally{if(b)await b.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
