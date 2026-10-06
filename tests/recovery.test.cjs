'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
process.env.TMP=process.env.TEMP=path.join(__dirname,'tmp');
(async()=>{const b=await chromium.launch({executablePath:process.env.BROWSER_PATH||chromium.executablePath(),headless:true});try{
 const c=await b.newContext({offline:true,acceptDownloads:true}),p=await c.newPage();const raw='{"version":99,"notes":"IRREPLACEABLE_RECOVERY_TEXT"}';
 await p.addInitScript(raw=>localStorage.setItem('chartroom-studio-project-v1',raw),raw);
 await p.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
 assert.equal(await p.evaluate(()=>localStorage.getItem('chartroom-studio-project-v1')),raw);
 assert.equal(await p.locator('#save-recovery').isVisible(),true);
 const event=p.waitForEvent('download');await p.locator('#save-recovery').click();const d=await event;
 const stream=await d.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
 assert.equal(Buffer.concat(chunks).toString('utf8'),raw,'Recovery download preserves exact original bytes/text');
 assert.equal(await p.locator('#save-recovery').isVisible(),false);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('chartroom-studio-project-v1')).version),1,'Autosave resumes only after explicit recovery download');
 console.log('PASS: unreadable local draft is preserved and downloadable before autosave resumes.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
