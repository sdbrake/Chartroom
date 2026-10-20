'use strict';
/* Development only: run the same real verification from any copied workspace. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'tests/artifacts');
fs.mkdirSync(artifacts,{recursive:true});fs.mkdirSync(path.join(root,'tests/tmp'),{recursive:true});
const env={...process.env,TMP:path.join(root,'tests/tmp'),TEMP:path.join(root,'tests/tmp'),TMPDIR:path.join(root,'tests/tmp')};
const {chromium}=require(env.PLAYWRIGHT_PATH||'playwright');
if(!env.BROWSER_PATH)env.BROWSER_PATH=chromium.executablePath();
const steps=[
 ['node',['--test','tests/parser.test.cjs','tests/package.test.cjs','tests/cli.test.cjs','tests/player.test.cjs','tests/palettes.test.cjs','tests/insert.test.cjs']],
 ['node',['tests/convert-old-deck.test.cjs']],
 ['node',['scripts/build-demo.cjs']],
 ['node',['scripts/build-palette-samples.cjs']],
 ...['studio','preview-position','imports','preflight','recovery','palettes-ui','insert-ui','presentation','presentation-boundaries','presentation-portable'].map(s=>['node',['tests/'+s+'.test.cjs']]),
 [env.PYTHON||'python',['scripts/check-exports.py']],
 ['node',['tests/exports.test.cjs']],
 ['node',['tests/palettes-exports.test.cjs']],
 ...['editorial-palettes','editorial-exports','palette-samples'].map(s=>['node',['tests/'+s+'.test.cjs']]),
 ['node',['tests/reviewer-probes.cjs']],
 ['node',['tests/hosted.test.cjs']],
 [env.PYTHON||'python',['tests/public-release.test.py']]
];
let log='',all=true;const results=[];
for(const [command,args] of steps){
 console.log('\n> '+command+' '+args.join(' '));
 const r=cp.spawnSync(command==='node'?process.execPath:command,args,{cwd:root,env,encoding:'utf8',timeout:180000,maxBuffer:10000000});
 const output=(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error):'');process.stdout.write(output);log+='\n> '+command+' '+args.join(' ')+'\n'+output;
 results.push({command:[command,...args],exitCode:r.status});if(r.status!==0){all=false;break;}
}
fs.writeFileSync(path.join(artifacts,'verification.log'),log);
const sources=['index.html','cli.cjs',...fs.readdirSync(path.join(root,'src')).map(f=>'src/'+f)];
const hashes=Object.fromEntries(sources.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify({passed:all,node:process.version,platform:process.platform,browserExecutable:env.BROWSER_PATH,results,hashes},null,2));
process.exitCode=all?0:1;
