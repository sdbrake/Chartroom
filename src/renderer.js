/* Chartroom Studio: generated-only, offline HTML. No source model is embedded. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartroomRenderer = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function inline(value) { return escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
  // Named palettes are trusted constants, never arbitrary CSS from project files.
  // Semantic hue names remain compatible with existing annotated lecture notes.
  const palettes = Object.freeze({
    classic: Object.freeze({name:'Chartroom Classic'}),
    buster: Object.freeze({name:'Buster', paper:'#f3f0eb', paper2:'#ffffff', ink:'#000000', muted:'#595959',
      navy:'#990026', olive:'#497791', violet:'#990026', rust:'#990026', amber:'#2E9FC9', 'label-open':'#416a81',
      brand:'#990026', light:'#ffffff', rule:'#999999', hero:'#2E9FC9', progress:'#990026', veil:'153,0,38'}),
    agnar: Object.freeze({name:'Agnar', paper:'#FFFFFF', paper2:'#f1f3f7', ink:'#00275D', muted:'#596273',
      navy:'#00275D', olive:'#3C5383', violet:'#B2223B', rust:'#B2223B', amber:'#ABADB0', 'label-open':'#3C5383',
      brand:'#00275D', light:'#FFFFFF', rule:'#ABADB0', hero:'#B2223B', progress:'#B2223B', veil:'0,39,93'}),
    atlantic: Object.freeze({name:'Atlantic', paper:'#F4F7FA', paper2:'#E5EDF3', ink:'#172A3A', muted:'#506274',
      navy:'#174A7E', olive:'#006D77', violet:'#174A7E', rust:'#B64B2C', amber:'#885E21', 'label-open':'#006D77',
      brand:'#174A7E', light:'#F4F7FA', rule:'#8396A6', hero:'#E8A36C', progress:'#B64B2C', veil:'14,27,40'}),
    'field-notes': Object.freeze({name:'Field Notes', paper:'#F4F1E8', paper2:'#E6E8DC', ink:'#263B32', muted:'#59665D',
      navy:'#264C3B', olive:'#376B63', violet:'#4C586F', rust:'#9B542C', amber:'#806020', 'label-open':'#376B63',
      brand:'#264C3B', light:'#F4F1E8', rule:'#8B988A', hero:'#CBA55A', progress:'#9B542C', veil:'20,34,27'}),
    aubergine: Object.freeze({name:'Aubergine', paper:'#F7F1ED', paper2:'#EBE2E8', ink:'#352B37', muted:'#6C5968',
      navy:'#51344D', olive:'#286B68', violet:'#51344D', rust:'#A64B35', amber:'#836020', 'label-open':'#286B68',
      brand:'#51344D', light:'#F7F1ED', rule:'#A18C9B', hero:'#D4A38A', progress:'#286B68', veil:'31,20,30'}),
    'night-seminar': Object.freeze({name:'Night Seminar', paper:'#17212B', paper2:'#243444', ink:'#EEF2F3', muted:'#B3C0CC',
      navy:'#101820', olive:'#7FCBC4', violet:'#B8B2E0', rust:'#E8A36C', amber:'#E5CD87', 'label-open':'#7FCBC4',
      brand:'#EEF2F3', light:'#EEF2F3', rule:'#6E8393', hero:'#E8A36C', progress:'#7FCBC4', veil:'16,24,32'})
  });
  function paletteId(value) {
    if (value === undefined) return 'classic';
    if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(palettes,value)) throw new Error('Unknown palette. Choose a named option from Deck palette.');
    return value;
  }
  function paletteCSS(value, library) {
    const id=paletteId(value);
    if(id==='classic')return ''; // Keep the original art direction unchanged.
    const p=palettes[id];
    const tokens=Object.entries(p).filter(([key])=>key!=='name').map(([key,color])=>'--'+key+':'+color).join(';');
    const description=['buster','agnar'].includes(id) ? 'exact school colors, with readable supporting neutrals.' : 'editorial palette with readable supporting surfaces.';
    return '\n/* '+p.name+' — '+description+' */\n:root{'+tokens+';--brass:'+p.hero+'}\n'+(library ? `
html,body{color:var(--ink)}#sidebar,#lecture-list button{color:var(--light)}
.course-code{color:var(--light)}#lecture-list li{color:var(--rule)}
#viewer-controls button,#viewer-header button{color:var(--ink);border-color:var(--rule)}
#slide-status{color:var(--muted)}button:focus-visible,a:focus-visible{outline-color:var(--rust)}
` : `
.slide h1{color:var(--brand)}
.cover h1,.part h1,.big h1,.photo h1,.somber h1{color:var(--light)}
.rail>li{border-color:var(--rule)}.eyebrow,.column h2{color:var(--brand)}
.axis-labels span:last-child{color:var(--label-open)}
.polarity .column:first-child h2{color:var(--rust)}.polarity .column:last-child h2{color:var(--label-open)}
.cover,.part,.big,.photo,.somber{--muted:var(--light)}
.cover,.part,.big{color:var(--light);border-top:12px solid var(--hero)}
.cover .eyebrow,.part .eyebrow,.big .eyebrow,.photo .eyebrow,.somber .eyebrow{color:var(--light)}
.photo,.somber,.photo .credit,.somber .credit{color:var(--light)}
.photo:after{background:rgba(var(--veil),.34)}.somber:after{background:rgba(var(--veil),.62)}
.photo h1,.somber h1{text-shadow:0 3px 16px var(--navy)}
#progress{background:var(--progress)}
`) + (['atlantic','field-notes','aubergine','night-seminar'].includes(id) ? `
/* Editorial palettes: keep text readable on every surface, including dark slides. */
:root{color-scheme:${id==='night-seminar'?'dark':'light'}}
${library ? `
.skip-link{color:var(--ink)}
#lecture-list li{color:var(--light)}
#sidebar button:focus-visible{outline-color:var(--hero)}
` : `
.takeaway{color:var(--ink)}
.cards .takeaway{margin-top:.65em}
:is(.cover,.part,.big){--rust:#F2BC8C;--olive:#7FCBC4;--label-open:#7FCBC4}
`}
` : '');
  }
  function list(items, className, reveal) {
    if (!items || !items.length) return '';
    return '<ul class="' + (className || 'children') + '">\n' + items.map(item => '<li' + (reveal ? ' data-reveal' : '') + '>' + inline(item.text) + list(item.children) + '</li>').join('\n') + '\n</ul>';
  }
  const styles = `
:root{--paper:#f2efe9;--paper2:#e6e2d9;--ink:#1f2933;--muted:#77808c;--olive:#2f7d5b;--rust:#c1502f;--amber:#b07d2b;--violet:#4a6fa5;--navy:#182030}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:var(--paper);color:var(--ink)}body{font-family:Arial,Helvetica,sans-serif;overflow:hidden}#viewport{position:fixed;inset:0;display:grid;place-items:center}#canvas{position:relative;width:1600px;height:900px;flex-shrink:0;transform-origin:center center;background:var(--paper)}
.slide{position:absolute;inset:0;padding:76px 100px 68px;--accent:var(--olive);--fit:1;overflow:visible}.slide[hidden]{display:none!important}.slide-inner{height:100%;display:flex;flex-direction:column;gap:24px;position:relative;z-index:1}.slide h1{font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:calc(80px * var(--fit));line-height:1.08;margin:0;letter-spacing:-.025em;overflow-wrap:break-word}.eyebrow{color:var(--accent);font-size:calc(22px * var(--fit));font-weight:bold;letter-spacing:.14em;text-transform:uppercase;margin:0}.content{font-size:calc(36px * var(--fit));line-height:1.32;min-height:0;flex:1}.content p{margin:0 0 .65em}.content ul{margin:0;padding:0;list-style:none}.rail>li{padding:.43em 0;border-top:1px solid #b9bab6}.children{padding-left:1.1em!important;margin-top:.25em!important;font-size:.82em;list-style:disc!important}.children>li{padding:.15em 0}.content strong{font-weight:700}.cards-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}.cards-list>li{padding:30px;background:var(--paper2);border-top:5px solid var(--accent)}.columns{display:grid;grid-template-columns:1fr 1fr;gap:64px}.column h2{font-family:Georgia,serif;font-weight:400;font-size:calc(44px * var(--fit));margin:0 0 20px;color:var(--accent)}.polarity .column:first-child{--accent:var(--rust)}.polarity .column:last-child{--accent:var(--olive)}
.cover,.part,.big{background:var(--navy);color:var(--paper)}.cover .slide-inner,.part .slide-inner,.divider .slide-inner,.big .slide-inner{justify-content:center}.cover h1,.part h1,.divider h1,.big h1{font-size:calc(116px * var(--fit));max-width:1300px}.cover .content:empty,.part .content:empty,.divider .content:empty,.big .content:empty{display:none}.quote .body{font-family:Georgia,serif;font-style:italic;font-size:calc(58px * var(--fit));line-height:1.22}.attribution,.credit,.citation{font-size:calc(23px * var(--fit));line-height:1.35;color:var(--muted)}.attribution{letter-spacing:.04em}.footer{font-family:Georgia,serif;font-style:italic;font-size:calc(27px * var(--fit));margin:0}.takeaway{border-left:5px solid var(--accent);padding:15px 24px;background:var(--paper2)}
.photo,.somber{background:var(--navy);color:var(--paper)}.background-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.photo:after,.somber:after{content:'';position:absolute;inset:0;background:rgba(24,32,48,.34)}.somber:after{background:rgba(24,32,48,.62)}.photo h1,.somber h1{font-size:calc(112px * var(--fit));text-shadow:0 3px 16px #182030}.photo .slide-inner,.somber .slide-inner{justify-content:center}.photo .content:empty,.somber .content:empty{display:none}.photo .credit,.somber .credit{color:var(--paper)}
.exhibit{margin:0;min-height:0;height:100%;display:flex;flex-direction:column;gap:12px}.exhibit img{width:100%;height:100%;min-height:0;object-fit:contain}.exhibit figcaption{flex:none}.img .content{display:flex;flex-direction:column;gap:16px}.img .exhibit{flex:1}.portraits{display:grid;grid-template-columns:1fr 1fr;gap:60px;height:100%;min-height:0}.portrait{margin:0;display:flex;flex-direction:column;min-height:0;gap:12px}.portrait img{width:100%;height:360px;object-fit:contain}.portrait figcaption{font-family:Georgia,serif;font-size:calc(38px * var(--fit))}.scholar-grid{display:grid;grid-template-columns:390px 1fr;gap:54px;height:100%;min-height:0}.scholar-grid img{width:100%;max-height:480px;object-fit:contain}.scholar-copy{min-width:0}.scholar-copy .citation{margin-bottom:28px}
.meters{display:flex;gap:60px;margin-top:auto;padding-top:12px}.meter{flex:1;min-width:0}.meter-label{font-size:calc(21px * var(--fit));margin-bottom:12px}.axis-labels{display:flex;justify-content:space-between;gap:24px;font-size:calc(18px * var(--fit));letter-spacing:.06em;margin-bottom:14px}.axis-labels span{flex:1;min-width:0;overflow-wrap:anywhere}.axis-labels span:first-child{color:var(--rust)}.axis-labels span:last-child{color:var(--olive);text-align:right}.track{height:7px;position:relative;background:linear-gradient(to right,var(--rust),var(--paper2),var(--olive));margin:0 9px 10px}.marker{position:absolute;left:var(--position);top:50%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:var(--ink);border:3px solid var(--paper)}.lens-axis{margin:80px 0}.lens-axis .track{height:14px}.lens-axis .axis-labels{font-size:calc(28px * var(--fit))}
#progress{position:fixed;left:0;bottom:0;height:4px;background:var(--amber);width:0;z-index:10}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media print{@page{size:1600px 900px;margin:0}html,body{height:auto;overflow:visible}#viewport{position:static;display:block}#canvas{transform:none!important;height:auto} .slide,.slide[hidden]{display:block!important;position:relative;width:1600px;height:900px;break-after:page;page-break-after:always} [data-reveal]{visibility:visible!important;opacity:1!important}#progress,#player-status{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
  function safeRelative(path) {
    return typeof path === 'string' && !!path && !/[\x00-\x1f\x7f\\:%?#<>"|]/.test(path) && !path.startsWith('/') && !path.split('/').some(p => !p || p === '.' || p === '..') && /\.(png|jpe?g|gif|webp)$/i.test(path);
  }
  function safeUrl(url) {
    return safeRelative(url) || (typeof url === 'string' && (/^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(url) || /^blob:(?:https?:\/\/[^\s/<>"']+|null|file:\/\/)\/[0-9a-f-]{36}$/i.test(url)));
  }
  function imageTag(path, alt, options, className) {
    if (path && !safeRelative(path)) throw new Error('Unsafe image asset path: ' + path);
    const src = options.assetUrls && Object.prototype.hasOwnProperty.call(options.assetUrls,path) ? options.assetUrls[path] : path;
    if (src && !safeUrl(src)) throw new Error('Unsafe image asset URL');
    return src ? '<img class="' + (className || '') + '" src="' + escape(src) + '" alt="' + escape(alt) + '">' : '';
  }
  function slideHTML(s, index, options) {
    const kinds = ['cover','divider','part','facts','cards','two-col','quote','big','photo','somber','img','lens','duo','scholar'];
    const kind = kinds.includes(s.kind) ? s.kind : 'facts';
    const hue = ['olive','violet','rust','amber'].includes(s.hue) ? s.hue : 'olive';
    const body = (s.body || []).map(p => '<p>' + inline(p) + '</p>').join('\n');
    const items = list(s.items,kind === 'cards' ? 'cards-list' : 'rail',kind === 'facts' && s.reveal !== false && s.reveal !== 'none' && s.reveal !== 'flash');
    let content = body ? '<div class="body">' + body + '</div>' : '';
    content += items;
    if (s.columns && s.columns.length) content += '<div class="columns">' + s.columns.map(c => '<div class="column"><h2>' + inline(c.title) + '</h2>' + list(c.items,'rail') + '</div>').join('\n') + '</div>';
    if (kind === 'img') content += '<figure class="exhibit">' + imageTag(s.image,s.alt,options) + '</figure>';
    if (kind === 'duo') content += '<div class="portraits">' + (s.portraits || []).map(p => '<figure class="portrait">' + imageTag(p.image,p.alt,options) + '<figcaption>' + inline(p.name) + '</figcaption><div class="credit">' + inline(p.credit) + '</div></figure>').join('\n') + '</div>';
    if (s.citation) content += '<p class="citation">' + inline(s.citation) + '</p>';
    if (s.takeaway) content += '<p class="takeaway">' + inline(s.takeaway) + '</p>';
    if (s.attribution) content += '<p class="attribution">' + inline(s.attribution) + '</p>';
    if (kind === 'scholar') content = '<div class="scholar-grid">' + imageTag(s.image,s.alt,options) + '<div class="scholar-copy">' + content + '</div></div>';
    const spectrum = s.spectrum || {left:'Closed', right:'Open'};
    const axisLabels = '<div class="axis-labels"><span>' + inline(spectrum.left) + '</span><span>' + inline(spectrum.right) + '</span></div>';
    if (kind === 'lens') content += '<div class="lens-axis">' + axisLabels + '<div class="track"></div></div>';
    const meters = (s.meters || []).map(m => '<div class="meter" data-value="' + Number(m.value) + '"><div class="meter-label">' + inline(m.label) + '</div>' + axisLabels + '<div class="track" role="meter" aria-label="' + escape(m.label || (s.spectrum ? spectrum.left + ' to ' + spectrum.right : 'Closed to open')) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Number(m.value) + '"><span class="marker" style="--position:' + Number(m.value) + '%"></span></div></div>').join('\n');
    return '<section class="slide ' + kind + (s.polarity ? ' polarity' : '') + '" data-slide="' + index + '" style="--accent:var(--' + hue + ')" aria-labelledby="slide-title-' + index + '"' + (index ? ' hidden inert' : '') + '>\n' + (kind === 'photo' || kind === 'somber' ? imageTag(s.image,s.alt,options,'background-image') : '') + '<div class="slide-inner">\n' + (s.eyebrow ? '<p class="eyebrow">' + inline(s.eyebrow) + '</p>\n' : '') + '<h1 id="slide-title-' + index + '">' + inline(s.title) + '</h1>\n<div class="content">' + content + '</div>\n' + (meters ? '<div class="meters">' + meters + '</div>' : '') + (s.credit ? '<div class="credit">' + inline(s.credit) + '</div>' : '') + (s.footer ? '<p class="footer">' + inline(s.footer) + '</p>' : '') + '\n</div>\n</section>';
  }
  // This function is serialized verbatim; it reads only generated public DOM.
  function deckPlayer() {
    'use strict';
    const slides = Array.from(document.querySelectorAll('.slide'));
    const review = document.body.dataset.mode === 'review';
    let index = 0, step = 0;
    const max = i => review || !slides[i] ? 0 : slides[i].querySelectorAll('[data-reveal]').length;
    const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
    const getState = () => ({index,step,count:slides.length});
    let parentOrigin = location.origin;
    try {parentOrigin = document.referrer ? new URL(document.referrer).origin : (location.ancestorOrigins && location.ancestorOrigins[0]) || location.origin;} catch (_) {}
    // Chromium reports file:// in ancestorOrigins but serializes message origins as null.
    if (parentOrigin === 'file://') parentOrigin = 'null';
    const images=Array.from(document.images);
    const post = type => {if (parent !== window) parent.postMessage({type,...getState(),previewId:document.body.dataset.previewId,resourcesReady:images.every(img=>img.complete),failedImages:images.filter(img=>img.complete && !img.naturalWidth).length},parentOrigin === 'null' ? '*' : parentOrigin);};
    window.addEventListener('message',event=>{
      if(parent === window || event.source !== parent || event.origin !== parentOrigin || !event.data || event.data.type !== 'chartroom-command')return;
      const actions={next,previous,home,end,go:()=>go(event.data.index),state:()=>post('chartroom-state'),escape:()=>post('chartroom-escape')};
      if(Object.prototype.hasOwnProperty.call(actions,event.data.command))actions[event.data.command]();
    });
    const storageKey = document.body.dataset.storageKey;
    if (!review) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved && Number.isInteger(saved.index) && Number.isInteger(saved.step) && slides.length) {
          index=clamp(saved.index,0,slides.length-1);step=clamp(saved.step,0,max(index));
        }
      } catch (_) { /* Local-file privacy settings and corrupt saves are harmless. */ }
    }
    // Studio supplies an ephemeral position for rebuilt previews only. Exported
    // decks keep their existing content-keyed storage and review-start behavior.
    const previewIndex = Number(document.body.dataset.previewIndex);
    const previewStep = Number(document.body.dataset.previewStep);
    if (Number.isInteger(previewIndex) && Number.isInteger(previewStep) && slides.length) {
      index=clamp(previewIndex,0,slides.length-1);step=clamp(previewStep,0,max(index));
    }
    function show() {
      if (!review) {try {localStorage.setItem(storageKey,JSON.stringify(getState()));} catch (_) {}}
      slides.forEach((s,i) => {
        s.hidden = i !== index; s.inert = i !== index;
        s.setAttribute('aria-hidden',String(i !== index));
        s.querySelectorAll('[data-reveal]').forEach((el,j) => {
          const visible = review || j < (i === index ? step : 0);
          el.style.visibility = visible ? 'visible' : 'hidden';
          el.setAttribute('aria-hidden',String(!visible));
        });
      });
      post('chartroom-state');
      document.getElementById('progress').style.width = (slides.length ? (index + 1) / slides.length * 100 : 0) + '%';
      document.getElementById('player-status').textContent = slides.length ? 'Slide ' + (index + 1) + ' of ' + slides.length + ': ' + slides[index].querySelector('h1').textContent : 'No slides';
    }
    function go(n) { if (Number.isFinite(n) && slides.length) {index=clamp(Math.trunc(n),0,slides.length-1);step=0;show();} return getState(); }
    function next() {if(step<max(index)){step++;show();}else if(index<slides.length-1)go(index+1);return getState();}
    function previous() {if(step>0){step--;show();}else if(index>0){index--;step=max(index);show();}return getState();}
    function home(){return go(0);}
    function end(){if(slides.length){index=slides.length-1;step=max(index);show();}return getState();}
    function resize() {
      const canvas=document.getElementById('canvas');
      canvas.style.position='absolute';canvas.style.left='50%';canvas.style.top='50%';
      canvas.style.transform='translate(-50%,-50%) scale(' + Math.min(innerWidth/1600,innerHeight/900) + ')';
    }
    function measure(s) {
      const inner=s.querySelector('.slide-inner'),content=s.querySelector('.content');
      const overflowX=Math.max(0,inner.scrollWidth-inner.clientWidth,content.scrollWidth-content.clientWidth);
      const overflowY=Math.max(0,inner.scrollHeight-inner.clientHeight,content.scrollHeight-content.clientHeight);
      return {overflow:overflowX>2 || overflowY>2,overflowX,overflowY};
    }
    function audit() {
      const results=slides.map((s,i)=>{
        const wasHidden=s.hidden;s.hidden=false;
        s.style.setProperty('--fit',1);
        let fit=1,overflow=measure(s);
        while(overflow.overflow && fit>.751){fit=Math.max(.75,fit-.025);s.style.setProperty('--fit',fit.toFixed(3));overflow=measure(s);}
        s.dataset.overflow=String(overflow.overflow);s.dataset.fit=fit.toFixed(3);s.hidden=wasHidden;
        return {slide:i,title:s.querySelector('h1').textContent,fit:Number(fit.toFixed(3)),...overflow};
      });
      document.body.dataset.overflow=String(results.some(r=>r.overflow));
      return results;
    }
    window.ChartroomPlayer = {next,previous,home,end,go,getState,audit};
    window.addEventListener('resize',resize);
    window.addEventListener('load',()=>{resize();audit();post('chartroom-state');});
    images.forEach(img=>{const settled=()=>{audit();post('chartroom-state');};img.addEventListener('load',settled);img.addEventListener('error',settled);});
    resize();audit();
    document.addEventListener('keydown',event => {
      if(event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target.tagName) || event.target.isContentEditable)return;
      const action = {ArrowRight:next,ArrowDown:next,' ':next,PageDown:next,ArrowLeft:previous,ArrowUp:previous,PageUp:previous,Home:home,End:end,Escape:()=>post('chartroom-escape')}[event.key];
      if(action){event.preventDefault();action();}
    });
    show();
  }
  function contentHash(text) {
    let hash = 14695981039346656037n;
    for (let i=0;i<text.length;i++) hash = BigInt.asUintN(64,(hash ^ BigInt(text.charCodeAt(i))) * 1099511628211n);
    return hash.toString(16);
  }
  function renderDeck(model, options) {
    options = options || {};
    const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + escape(model.title) + '</title>\n<style>\n' + styles + paletteCSS(options.palette,false) + '</style>\n</head>\n<body data-mode="' + (options.mode === 'review' ? 'review' : 'teaching') + '" data-deck-id="' + escape(options.deckId || '') + '" data-storage-key="CHARTROOM_CONTENT_KEY">\n<main id="viewport" aria-label="Lecture slides"><div id="canvas">\n' + model.slides.map((s,i) => slideHTML(s,i,options)).join('\n\n') + '\n</div></main>\n<div id="progress" aria-hidden="true"></div>\n<p id="player-status" class="sr-only" role="status" aria-live="polite"></p>\n<script>\n(' + deckPlayer.toString() + ')();\n</script>\n</body>\n</html>';
    return html.replace('data-storage-key="CHARTROOM_CONTENT_KEY"','data-storage-key="chartroom:' + contentHash(html) + '"');
  }
  const libraryStyles = `
:root{color-scheme:light;--paper:#f2efe9;--navy:#182030;--brass:#b07d2b}*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--paper);color:#1f2933;font-family:Arial,Helvetica,sans-serif}body{display:grid;grid-template-columns:290px minmax(0,1fr)}button{font:inherit;cursor:pointer}button:disabled{cursor:default;opacity:.46}button:focus-visible,a:focus-visible{outline:3px solid #4a6fa5;outline-offset:3px}#sidebar{background:var(--navy);color:var(--paper);padding:38px 24px;overflow:auto}#sidebar h1{font:400 30px/1.15 Georgia,serif;margin:12px 0 32px}.course-code{font-size:12px;letter-spacing:.16em;color:#c2b591}#lecture-list{padding-left:24px}#lecture-list li{padding:0 0 12px 0;color:#b5bbc4}#lecture-list button{display:block;border:0;border-left:3px solid transparent;background:none;color:var(--paper);text-align:left;padding:12px 14px;width:100%;line-height:1.4}#lecture-list button[aria-current=true]{border-color:var(--brass);background:#ffffff0b}#viewer{height:100dvh;min-width:0;display:flex;flex-direction:column;padding:28px;gap:16px}#viewer-header{display:flex;align-items:center;gap:18px;min-height:38px}#lecture-title{font:400 23px Georgia,serif;margin:0;flex:1}#frame-wrap{position:relative;flex:1;min-height:0;background:var(--paper)}#frame-wrap iframe{width:100%;height:100%;border:0;display:block}#viewer-controls{display:flex;align-items:center;justify-content:center;gap:22px;min-height:48px}#viewer-controls button,#viewer-header button{background:transparent;border:1px solid #b6b4ad;border-radius:3px;padding:10px 18px;color:#1f2933}#slide-status{font-size:14px;color:#53606c;text-align:center;min-width:110px}#library-error{padding:14px;border-left:3px solid var(--brass)}#library-error[hidden]{display:none}.skip-link{position:absolute;left:12px;top:-100px;background:var(--paper);padding:12px;z-index:20}.skip-link:focus{top:12px}#lectures-toggle{display:none}#lecture-title{min-width:0;overflow-wrap:anywhere}#viewer.page-fill,#viewer:fullscreen{position:fixed;inset:0;width:100%;height:100dvh;z-index:30;background:var(--paper)}#viewer.page-fill #lectures-toggle{display:none}body:has(#viewer.page-fill){overflow:hidden}
@media(max-width:720px){body{display:block}#viewer{padding:12px;gap:10px}#viewer-header{flex-wrap:wrap;gap:10px}#lecture-title{font-size:20px;flex-basis:100%;order:1}#lectures-toggle{display:block}#viewer-header button{padding:10px 12px}#fullscreen{margin-left:auto}#sidebar{display:none;position:fixed;top:112px;bottom:0;left:0;width:min(320px,100%);z-index:25;padding:24px;box-shadow:8px 0 24px #18203044}body.menu-open #sidebar{display:block}#viewer-controls{gap:10px}#viewer-controls button{padding:10px 12px}#slide-status{min-width:90px}}
`;
  function libraryPlayer() {
    'use strict';
    const config=JSON.parse(document.getElementById('course-config').textContent);
    const buttons=Array.from(document.querySelectorAll('#lecture-list button'));
    const wrap=document.getElementById('frame-wrap'),status=document.getElementById('slide-status'),error=document.getElementById('library-error');
    const previous=document.getElementById('previous'),next=document.getElementById('next');
    let frame=null,timer=null,ready=false;
    const viewer=document.getElementById('viewer'),sidebar=document.getElementById('sidebar'),toggle=document.getElementById('lectures-toggle'),full=document.getElementById('fullscreen');
    function menu(open){document.body.classList.toggle('menu-open',open);toggle.setAttribute('aria-expanded',String(open));}
    toggle.addEventListener('click',()=>menu(toggle.getAttribute('aria-expanded')!=='true'));
    let fullscreenState=null;
    function leaveFullscreen(){
      if(!fullscreenState)return;
      const saved=fullscreenState;fullscreenState=null;
      viewer.classList.remove('page-fill');
      saved.inert.forEach(([element,inert])=>{element.inert=inert;});
      menu(saved.menu);full.textContent='Fullscreen';full.setAttribute('aria-pressed','false');
      if(saved.focus && saved.focus.isConnected)saved.focus.focus();else full.focus();
      if(document.fullscreenElement===viewer && document.exitFullscreen)document.exitFullscreen().catch(()=>{});
    }
    full.addEventListener('click',async()=>{
      if(fullscreenState)return leaveFullscreen();
      const outside=[...document.body.children].filter(el=>el!==viewer && !/^(SCRIPT|TEMPLATE)$/.test(el.tagName));
      fullscreenState={focus:document.activeElement,menu:toggle.getAttribute('aria-expanded')==='true',inert:[...outside,toggle].map(el=>[el,el.inert])};
      menu(false);viewer.classList.add('page-fill');
      fullscreenState.inert.forEach(([el])=>{el.inert=true;});
      full.textContent='Exit fullscreen';full.setAttribute('aria-pressed','true');full.focus();
      try {if(viewer.requestFullscreen)await viewer.requestFullscreen();} catch (_) { /* Page-fill is the accessible fallback. */ }
    });
    document.addEventListener('focusin',event=>{if(fullscreenState && !viewer.contains(event.target))full.focus();});
    document.addEventListener('keydown',event=>{
      if(!fullscreenState || event.key!=='Tab')return;
      const focusable=[...viewer.querySelectorAll('button:not(:disabled),iframe,a[href],[tabindex="0"]')].filter(el=>!el.inert && el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey && (document.activeElement===first || document.activeElement===viewer)){event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
    });
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement && fullscreenState)leaveFullscreen();});
    function command(command,index){if(frame && (ready || command==='state'))frame.contentWindow.postMessage({type:'chartroom-command',command,index},'*');}
    function select(index) {
      const lecture=config.lectures[index];if(!lecture || !lecture.available)return;
      if(toggle.getAttribute('aria-expanded')==='true'){menu(false);toggle.focus();}
      clearTimeout(timer);ready=false;previous.disabled=true;next.disabled=true;status.textContent='Loading lecture…';error.hidden=true;
      buttons.forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));
      document.getElementById('lecture-title').textContent=lecture.title;
      frame=document.createElement('iframe');frame.title=lecture.title;
      // Chromium blocks sibling file images in an opaque srcdoc frame. Local
      // exports contain only our escaped, generated documents, so file: enables
      // same-origin access for those images. Hosted copies keep opaque isolation.
      frame.setAttribute('sandbox',location.protocol==='file:'?'allow-scripts allow-same-origin':'allow-scripts');
      frame.addEventListener('load',()=>command('state'));
      frame.srcdoc=document.getElementById(lecture.template).content.textContent;
      wrap.replaceChildren(frame);
      timer=setTimeout(()=>{error.hidden=false;error.textContent='This lecture could not start. Reselect it to retry, or open a fresh exported copy.';status.textContent='Lecture unavailable';},5000);
    }
    window.addEventListener('message',event=>{
      // Source identity is required; hosted frames are opaque, and file: also
      // serializes its origin as null even with local-image access enabled.
      if(!frame || event.source!==frame.contentWindow || event.origin!=='null' || !event.data)return;
      const s=event.data;
      if(s.type==='chartroom-escape'){if(viewer.classList.contains('page-fill'))leaveFullscreen();else menu(false);return;}
      if(s.type!=='chartroom-state' || !Number.isInteger(s.index) || !Number.isInteger(s.step) || !Number.isInteger(s.count) || s.count<0 || s.index<0 || (s.count ? s.index>=s.count : s.index!==0) || s.step<0 || typeof s.resourcesReady!=='boolean' || !Number.isInteger(s.failedImages) || s.failedImages<0)return;
      if(!s.resourcesReady)return;
      clearTimeout(timer);ready=true;error.hidden=s.failedImages===0;
      if(s.failedImages)error.textContent=s.failedImages+' image(s) could not load. Extract the whole export and keep its images folder in place, or replace the damaged image in Studio and export again.';
      status.textContent=s.count ? 'Slide '+(s.index+1)+' of '+s.count : 'No slides';
      previous.disabled=s.index===0;next.disabled=!s.count || s.index===s.count-1;
    });
    buttons.forEach((b,i)=>b.addEventListener('click',()=>select(i)));
    previous.addEventListener('click',()=>command('previous'));next.addEventListener('click',()=>command('next'));
    document.addEventListener('keydown',event=>{
      if(event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable)return;
      if(event.key==='Escape'){if(viewer.classList.contains('page-fill'))leaveFullscreen();else {menu(false);toggle.focus();}return;}
      if(event.key===' ' && event.target.tagName==='BUTTON')return;
      const key={ArrowRight:'next',ArrowDown:'next',' ':'next',PageDown:'next',ArrowLeft:'previous',ArrowUp:'previous',PageUp:'previous',Home:'home',End:'end'}[event.key];
      if(key){event.preventDefault();command(key);}
    });
    const first=config.lectures.findIndex(l=>l.available);
    if(first>=0)select(first);else {status.textContent='No lectures available';error.hidden=false;error.textContent='Lectures will appear here when they are available.';}
  }
  function scriptJSON(value) {return JSON.stringify(value,null,2).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
  function renderLibrary(course, options) {
    options=options || {};
    const lectures=(course.lectures || []).map((l,i)=>({id:l.id,title:l.title,available:!!l.model,template:'deck-'+i}));
    const config={title:course.title,code:course.code,lectures};
    const templates=(course.lectures || []).map((l,i)=>l.model ? '<template id="deck-'+i+'">\n'+escape(renderDeck(l.model,{mode:'review',deckId:l.id,palette:course.palette,assetUrls:options.assetUrls && options.assetUrls[l.id]}))+'\n</template>' : '').join('\n\n');
    return '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(course.title)+'</title>\n<style>'+libraryStyles+paletteCSS(course.palette,true)+'</style>\n</head>\n<body>\n<a class="skip-link" href="#viewer">Skip to lecture</a>\n<aside id="sidebar"><div class="course-code">'+escape(course.code)+'</div><h1>'+inline(course.title)+'</h1><nav aria-label="Lectures"><ol id="lecture-list">'+lectures.map(l=>'<li><button type="button"'+(l.available?'':' disabled')+'>'+escape(l.title)+(l.available?'':' — Coming soon')+'</button></li>').join('\n')+'</ol></nav></aside>\n<main id="viewer" tabindex="-1"><header id="viewer-header"><button id="lectures-toggle" type="button" aria-controls="sidebar" aria-expanded="false">Lectures</button><h2 id="lecture-title"></h2><button id="fullscreen" type="button" aria-pressed="false">Fullscreen</button></header><div id="frame-wrap"></div><p id="library-error" role="alert" hidden></p><footer id="viewer-controls"><button id="previous" type="button" disabled>Previous</button><span id="slide-status" role="status" aria-live="polite"></span><button id="next" type="button" disabled>Next</button></footer></main>\n<!-- Public course configuration. Generated review documents below contain no source notes. -->\n<script type="application/json" id="course-config">\n'+scriptJSON(config)+'\n</script>\n'+templates+'\n<script>\n('+libraryPlayer.toString()+')();\n</script>\n</body>\n</html>';
  }
  return {renderDeck,renderLibrary,styles,palettes,paletteId};
});
