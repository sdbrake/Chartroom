/* Studio-only presentation shell. The iframe contains generated public HTML only. */
(function () {
  'use strict';
  const P=window.ChartroomPackage,R=window.ChartroomRenderer,Preflight=window.ChartroomPreflight;
  const shell=document.getElementById('presentation'),status=document.getElementById('presentation-status'),exit=document.getElementById('presentation-exit');
  // Only Tab is added to the generated player, keeping focus inside this Studio shell.
  // This script contains no source notes or project data and never changes exports.
  function presentationKeys() {
    document.addEventListener('keydown',event=>{
      if(event.key==='Tab'){event.preventDefault();parent.postMessage({type:'chartroom-presenter-tab'},'*');}
    });
  }
  let active=null,entering=null,leaving=null,returnFocus=null;
  function leaveFullscreen() {
    if(leaving)return leaving;
    if(document.fullscreenElement!==shell||!document.exitFullscreen)return entering||Promise.resolve();
    try {
      leaving=Promise.resolve(document.exitFullscreen()).catch(()=>{}).finally(()=>{leaving=null;});
      return leaving;
    }catch(_){return Promise.resolve();}
  }
  function enterFullscreen(session) {
    // Never let a replacement session inherit a native transition from its predecessor.
    const pending=entering||leaving;
    if(pending){pending.then(()=>{if(active===session)enterFullscreen(session);});return;}
    // With no transition pending, request synchronously within the user activation.
    try {
      if(shell.requestFullscreen){
        session.requestedFullscreen=true;
        entering=Promise.resolve(shell.requestFullscreen()).then(()=>{
          if(active===session)session.hadFullscreen=document.fullscreenElement===shell;
          else if(document.fullscreenElement===shell)return leaveFullscreen();
        }).catch(()=>{}).finally(()=>{entering=null;});
      }
    }catch(_){/* Page-fill fallback. */}
    // Rejected or activation-expired requests leave the opaque page-fill shell usable.
  }
  function close() {
    const session=active;if(!session)return;
    active=null;returnFocus=session.focus;clearTimeout(session.timeout);clearTimeout(session.hintTimer);
    const leaving=leaveFullscreen();
    session.frame?.remove();shell.hidden=true;shell.dataset.ready='false';
    document.body.classList.toggle('presenting',session.bodyClass);
    session.outside.forEach(([el,value])=>{el.inert=value;});
    const restore=()=>{if(!active&&session.focus?.isConnected)session.focus.focus();};
    restore();
    // Native fullscreen teardown can restore its own old focus after this handler.
    leaving.then(()=>requestAnimationFrame(()=>requestAnimationFrame(restore)));
  }
  function fail(session,error) {
    if(active!==session)return;
    clearTimeout(session.timeout);session.frame?.remove();session.frame=null;
    status.hidden=false;status.textContent='This lecture could not be presented. Exit to Studio to review the problem.';
    shell.dataset.ready='false';exit.focus();
    // Detailed compiler errors belong in the private editor, never on the projector.
    session.onError(error.message || String(error));
  }
  async function open(input,lectureId,onError) {
    if(active)return;
    // Native exit may temporarily prevent the previous close from focusing Studio.
    const focus=(entering||leaving)&&returnFocus?.isConnected?returnFocus:document.activeElement;
    const session={focus,bodyClass:document.body.classList.contains('presenting'),outside:[],onError,frame:null,ready:false,hadFullscreen:false};
    active=session;
    session.outside=[...document.body.children].filter(el=>el!==shell&&!/^(SCRIPT|STYLE)$/.test(el.tagName)).map(el=>[el,el.inert]);
    session.outside.forEach(([el])=>{el.inert=true;});
    shell.hidden=false;shell.classList.remove('quiet');shell.dataset.ready='false';status.hidden=false;status.textContent='Checking this lecture’s slides and images…';
    document.body.classList.add('presenting');exit.focus();
    enterFullscreen(session);
    try {
      const selected=input.lectures.find(l=>l.id===lectureId);
      if(!selected)throw new Error('Select a lecture first.');
      // Validate/copy only the selected lecture. Student availability is unrelated to presenting.
      const snapshot=P.validateProject({...input,lectures:[{...selected,available:true}],assets:input.assets.filter(a=>a.lectureId===lectureId)});
      const issues=await Preflight.check(snapshot);
      if(active!==session)return;
      if(issues.length)throw new Error(issues.map(d=>`Line ${d.line}: ${d.message}`).join('\n'));
      const model=P.compile(snapshot).lectures[0].model;
      if(!model?.slides.length)throw new Error('The selected lecture has no slides.');
      session.count=model.slides.length;
      const assets=Object.fromEntries(snapshot.assets.map(a=>[a.path,`data:${a.mime};base64,${a.data}`]));
      const frame=document.createElement('iframe');session.frame=frame;
      frame.name='presentation-frame';frame.title='Lecture presentation';frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('aria-hidden','true');frame.inert=true;
      frame.srcdoc=R.renderDeck(model,{mode:'teaching',palette:snapshot.course.palette,assetUrls:assets,deckId:lectureId}).replace('</body>','<script>('+presentationKeys.toString()+')();</script>\n</body>');
      session.timeout=setTimeout(()=>fail(session,new Error('Presentation startup timed out. Try again or use an exported teaching deck.')),12000);
      shell.prepend(frame);
    }catch(error){fail(session,error);}
  }
  window.addEventListener('message',event=>{
    const s=active;if(!s?.frame||event.source!==s.frame.contentWindow||event.origin!=='null')return;
    const state=event.data;
    if(state?.type==='chartroom-presenter-tab'){exit.focus();return;}
    if(state?.type==='chartroom-escape'){close();return;}
    if(state?.type!=='chartroom-state'||!Number.isInteger(state.index)||state.index<0||state.index>=s.count||state.count!==s.count||!Number.isInteger(state.step)||state.step<0||state.step>10000||typeof state.resourcesReady!=='boolean'||!Number.isInteger(state.failedImages)||state.failedImages<0)return;
    if(state.failedImages){fail(s,new Error('A presentation image could not load.'));return;}
    if(state.resourcesReady&&!s.ready){
      s.ready=true;clearTimeout(s.timeout);status.hidden=true;shell.dataset.ready='true';
      s.frame.inert=false;s.frame.removeAttribute('aria-hidden');s.frame.focus();
      s.hintTimer=setTimeout(()=>{if(active===s)shell.classList.add('quiet');},3000);
    }
  });
  exit.addEventListener('click',close);
  document.addEventListener('fullscreenchange',()=>{
    if(!active?.requestedFullscreen)return;
    if(document.fullscreenElement===shell)active.hadFullscreen=true;
    else if(active.hadFullscreen)close();
  });
  document.addEventListener('keydown',event=>{
    if(!active)return;
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key==='Tab'){
      event.preventDefault();
      if(active.ready&&document.activeElement===exit)active.frame.focus();else exit.focus();
    }
  });
  document.addEventListener('focusin',event=>{if(active&&!shell.contains(event.target))exit.focus();});
  window.ChartroomPresenter={open};
})();
