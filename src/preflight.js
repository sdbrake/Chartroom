/* Browser-only export gate: exercise the real renderer, not text-length guesses. */
(function () {
  'use strict';
  const P=window.ChartroomPackage, R=window.ChartroomRenderer;
  // Serialized into a sandboxed, offscreen generated deck. No project/source notes.
  async function measureDeck() {
    const broken=[];
    await Promise.all(Array.from(document.images).map(async (image,index)=>{
      try {await image.decode();if(!image.naturalWidth || !image.naturalHeight)broken.push(index);}
      catch(_){broken.push(index);}
    }));
    if(document.fonts)await document.fonts.ready;
    const audit=window.ChartroomPlayer ? window.ChartroomPlayer.audit() : null;
    parent.postMessage({type:'chartroom-preflight',broken,audit},'*');
  }
  function checkLecture(entry,project) {
    return new Promise(resolve=>{
      const frame=document.createElement('iframe');
      frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
      // Offscreen, but CSS-visible: Chromium/Edge can leave image.decode()
      // pending in visibility:hidden frames even after naturalWidth is available.
      // Geometry remains real; left:-20000px keeps the frame out of view.
      frame.style.cssText='position:fixed;left:-20000px;top:0;width:1600px;height:900px;border:0;pointer-events:none';
      const messages=[];
      const error=(message,line=1)=>({severity:'error',lectureId:entry.id,lectureTitle:entry.title,line,message});
      let timeout;
      function finish(){clearTimeout(timeout);window.removeEventListener('message',receive);frame.remove();resolve(messages);}
      function receive(event){
        if(event.source!==frame.contentWindow || event.origin!=='null' || event.data?.type!=='chartroom-preflight')return;
        const {broken,audit}=event.data;
        if(!Array.isArray(broken)||!Array.isArray(audit)){messages.push(error('Slide layout check could not run.'));finish();return;}
        if(broken.length)messages.push(error('Image decoding failed. Replace the damaged or unsupported local image.'));
        for(const item of audit){if(item.overflow)messages.push(error(`Slide ${item.slide+1} does not fit (overflow). Split its content across slides; no wording was cut.`,entry.model.slides[item.slide]?.line||1));}
        finish();
      }
      try{
        const assetUrls=Object.fromEntries(project.assets.filter(a=>a.lectureId===entry.id).map(a=>[a.path,`data:${a.mime};base64,${a.data}`]));
        const html=R.renderDeck(entry.model,{mode:'review',assetUrls,deckId:entry.id,palette:project.course.palette});
        frame.srcdoc=html.replace('</body>','<script>('+measureDeck.toString()+')();</script>\n</body>');
        window.addEventListener('message',receive);
        timeout=setTimeout(()=>{messages.push(error('Slide/image check timed out. Reduce image sizes or split a very large lecture.'));finish();},10000);
        document.body.append(frame);
      }catch(e){messages.push(error('Slide check failed: '+e.message));finish();}
    });
  }
  async function check(input) {
    const project=P.validateProject(input), compiled=P.compile(project);
    const errors=compiled.diagnostics.filter(d=>d.severity==='error');
    if(errors.length)return errors;
    for(const entry of compiled.lectures){if(entry.model)errors.push(...await checkLecture(entry,project));}
    return errors;
  }
  window.ChartroomPreflight={check};
})();
