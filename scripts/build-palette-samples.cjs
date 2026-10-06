'use strict';
/* Regenerate the public, offline comparison from the existing demonstration only. */
const fs=require('node:fs'),path=require('node:path'),R=require('../src/renderer.js'),P=require('../src/parser.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/palette-samples');
fs.mkdirSync(out,{recursive:true});
const project=JSON.parse(fs.readFileSync(path.join(root,'examples/demo.chartroom.json'),'utf8'));
const lecture=project.lectures.find(l=>l.available),model=P.parse(lecture.notes);
if(model.diagnostics.some(d=>d.severity==='error'))throw new Error('Demonstration has parser errors.');
const assetUrls=Object.fromEntries(project.assets.filter(a=>a.lectureId===lecture.id).map(a=>[a.path,'data:'+a.mime+';base64,'+a.data]));
const entries=[
 ['atlantic','Cool white, deep blue, teal and burnt orange.','A versatile everyday palette: a quiet cool family, with warmth reserved for contrast.'],
 ['field-notes','Unbleached paper, forest green and earthy rust.','Bookish and subdued. Strong light–dark contrast does the reading work.'],
 ['aubergine','Porcelain, dark plum, petrol teal and terracotta.','A distinctive plum anchor, with restrained warm/cool comparison accents.'],
 ['night-seminar','Charcoal blue, soft white, pale aqua and apricot.','A complete dark treatment. Try it on your classroom projector; bright rooms can wash it out.']
];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [id] of entries)fs.writeFileSync(path.join(out,id+'.html'),R.renderDeck(model,{palette:id,mode:'review',assetUrls}));
const options=[[0,'Cover'],[1,'Facts'],[3,'Cards'],[4,'Two-column comparison'],[6,'Quotation'],[8,'Meter'],[9,'Image'],[10,'Photo beat']];
const page=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compare deck palettes — Chartroom Studio</title>
<style>
:root{color-scheme:light;--paper:#f2efe9;--ink:#1f2933;--rule:#bdbbb4}*{box-sizing:border-box}body{margin:0;padding:28px 32px 56px;background:var(--paper);color:var(--ink);font:17px/1.5 Arial,Helvetica,sans-serif}main{max-width:1600px;margin:auto}a{color:#245d45}a:focus-visible,select:focus-visible{outline:3px solid #245d45;outline-offset:4px}nav{font-size:15px;margin-bottom:20px}h1,h2{font-family:Georgia,'Times New Roman',serif;font-weight:400;line-height:1.15}h1{font-size:40px;margin:0 0 12px}header>p{max-width:850px;margin:0 0 20px}.controls{display:flex;align-items:center;gap:14px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:16px 0;margin:22px 0}select{font:inherit;padding:10px 14px;min-height:44px;border:1px solid #70756e;background:#fff;color:var(--ink)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 28px}article{min-width:0}article h2{font-size:28px;margin:0 0 5px}article p{margin:6px 0 12px}article .colors{font-size:15px}.sample{border:1px solid var(--rule);background:#17212B;aspect-ratio:16/9}iframe{display:block;width:100%;height:100%;border:0}.sample-link{display:inline-block;padding:8px 0;min-height:44px}footer{border-top:1px solid var(--rule);margin-top:30px;padding-top:18px;font-size:15px;max-width:1000px}@media(max-width:760px){body{padding:20px 16px 40px}h1{font-size:32px}.grid{grid-template-columns:1fr}.controls{align-items:flex-start;flex-direction:column;gap:8px}select{width:100%}}
</style></head><body><main>
<nav><a href="../index.html" target="_blank" rel="noopener">Open Studio</a> · <a href="README.html">Handbook</a></nav>
<header><h1>Four palettes. The same slide.</h1><p>Compare the real demonstration deck, not just color swatches. Choose a slide type to change all four previews together. This page does not read or change your project.</p></header>
<div class="controls"><label for="sample-slide">Slide to compare</label><select id="sample-slide">${options.map(([i,label])=>`<option value="${i}"${i===1?' selected':''}>${label}</option>`).join('')}</select></div>
<div class="grid">${entries.map(([id,colors,description])=>`<article><h2>${escape(R.palettes[id].name)}</h2><p class="colors">${escape(colors)}</p><div class="sample"><iframe src="palette-samples/${id}.html" title="${escape(R.palettes[id].name)} demonstration" sandbox="allow-scripts"></iframe></div><p>${escape(description)}</p><a class="sample-link" href="palette-samples/${id}.html" target="_blank" rel="noopener">Open ${escape(R.palettes[id].name)} full size</a></article>`).join('\n')}</div>
<footer>These are public demonstration slides, not your lecture files. The type, layout and words are identical across palettes. In Studio, choose <strong>Deck palette</strong> to apply a palette to your course; save your project and export again when you want updated teaching decks or a student library. Always review photo slides and test legibility on your actual classroom display.</footer>
<script>
const chooser=document.getElementById('sample-slide'),frames=[...document.querySelectorAll('iframe')];
function sync(frame){frame.contentWindow.postMessage({type:'chartroom-command',command:'go',index:Number(chooser.value)},'*');}
frames.forEach(frame=>frame.addEventListener('load',()=>sync(frame)));
chooser.addEventListener('change',()=>frames.forEach(sync));
</script></main></body></html>`;
fs.writeFileSync(path.join(root,'docs/PALETTES.html'),page);
console.log('Built docs/PALETTES.html and four public sample decks (embedded local images, no private notes).');
