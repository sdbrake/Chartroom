/* Offline workshop controller. Notes and assets stay on this device. */
(function () {
  'use strict';
  const P = window.ChartroomPackage, Parser = window.ChartroomParser, R = window.ChartroomRenderer;
  const $ = id => document.getElementById(id);
  $('offline-download').hidden = !/^https?:$/.test(location.protocol);
  for(const [id,palette] of Object.entries(R.palettes)) $('palette').add(new Option(palette.name,id));
  function showPaletteHelp() {
    const descriptions = {
      atlantic:'Atlantic: cool white, deep blue, teal and burnt orange. A versatile everyday palette.',
      'field-notes':'Field Notes: warm paper, forest green and earthy accents. A bookish alternative.',
      aubergine:'Aubergine: porcelain, dark plum, teal and terracotta. Distinctive but restrained.',
      'night-seminar':'Night Seminar: dark slides, soft-white text, aqua and apricot. Check it on your classroom projector; bright lighting can wash out dark backgrounds.'
    };
    $('palette-help').textContent=(descriptions[$('palette').value] || 'Your selected palette')+' Applies to every lecture and the student review page.';
  }
  const storageKey = 'chartroom-studio-project-v1';
  const starter = '# Your lecture title\n\n## A slide heading\n- Your exact words.\n- Your next point.\n\n*Your spoken aside stays in the project, not the shared deck.*\n';
  const blank = () => ({format:'chartroom-studio',version:1,course:{title:'My course',code:''},lectures:[{id:'lecture-1',title:'My first lecture',notes:starter,available:true}],assets:[]});
  let project = blank(), selected = 0, timer, libraryPreview = false, downloaded = true, recoveryRaw = null;
  const lecture = () => project.lectures[selected];
  const notice = message => { $('notice').textContent = message; };
  const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function download(name, data, mime) {
    const url = URL.createObjectURL(new Blob([data],{type:mime}));
    const link = document.createElement('a'); link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }
  function autosave() {
    if (recoveryRaw !== null) { $('save-status').textContent = 'Unreadable draft preserved — Save recovery copy before autosave can resume'; return; }
    try { localStorage.setItem(storageKey,JSON.stringify(project)); $('save-status').textContent = 'Draft autosaved in this browser'; }
    catch (_) { $('save-status').textContent = 'Browser autosave unavailable/full — use Save project now'; }
  }
  function changed() {
    downloaded = false;
    clearTimeout(timer);
    timer = setTimeout(()=>{autosave();rebuild();},450);
  }
  function readFields() {
    project.course.title=$('course-title').value; project.course.code=$('course-code').value;
    project.course.palette=$('palette').value;
    Object.assign(lecture(),{title:$('lecture-title').value,notes:$('notes').value,available:$('available').checked});
  }
  function drawList() {
    $('lecture-list').replaceChildren();
    project.lectures.forEach((entry,index)=>{
      const li=document.createElement('li'), button=document.createElement('button'), text=document.createElement('span');
      text.textContent=entry.title || '(Untitled library label)';
      if (!entry.available) {const small=document.createElement('small');small.textContent='Coming soon';text.append(small);}
      button.append(text);button.className=index===selected?'selected':'';
      if(index===selected)button.setAttribute('aria-current','true');
      button.addEventListener('click',()=>{readFields();selected=index;libraryPreview=false;showLecture();});
      li.append(button);$('lecture-list').append(li);
    });
    $('move-up').disabled=selected===0;$('move-down').disabled=selected===project.lectures.length-1;
    $('remove-lecture').disabled=project.lectures.length===1;
  }
  function jumpToLine(line) {
    const text=$('notes').value, offset=text.split('\n').slice(0,Math.max(0,line-1)).join('\n').length + (line>1?1:0);
    $('notes').focus();$('notes').setSelectionRange(offset,offset);
    $('notes').scrollTop=Math.max(0,(line-3)*23);
  }
  function showAssets() {
    $('assets').replaceChildren();
    const assets=project.assets.filter(a=>a.lectureId===lecture().id);
    $('asset-count').textContent=`(${assets.length})`;
    assets.forEach(asset=>{
      const li=document.createElement('li'), label=document.createElement('label'), input=document.createElement('input'), remove=document.createElement('button');
      label.textContent='Path used in annotations';input.value=asset.path;input.setAttribute('aria-label','Image path: '+asset.path);
      input.addEventListener('change',()=>{
        const old=asset.path;asset.path=input.value.trim();
        try{P.validateProject(project);notice('Image path updated. Update any matching annotation too.');changed();}
        catch(error){asset.path=old;input.value=old;notice(error.message);}
      });
      remove.textContent='Remove image';remove.addEventListener('click',()=>{project.assets=project.assets.filter(a=>a!==asset);showAssets();changed();});
      label.append(input);li.append(label,remove);$('assets').append(li);
    });
  }
  function showLecture() {
    clearTimeout(timer);
    $('course-title').value=project.course.title;$('course-code').value=project.course.code;
    $('palette').value=project.course.palette || 'classic';showPaletteHelp();
    $('lecture-title').value=lecture().title;$('notes').value=lecture().notes;$('available').checked=lecture().available;
    drawList();showAssets();autosave();rebuild();
  }
  function assetUrls(id) {
    return Object.fromEntries(project.assets.filter(a=>a.lectureId===id).map(a=>[a.path,`data:${a.mime};base64,${a.data}`]));
  }
  let previousPreviewHTML = '';
  function setPreview(html) {
    // Keep slide position when a save, reorder or metadata edit leaves the
    // generated deck unchanged. Avoid unnecessary iframe work while writing.
    if (html === previousPreviewHTML) return;
    previousPreviewHTML = html;
    $('preview-count').textContent='—';$('preview').srcdoc=html;
  }
  function rebuild() {
    clearTimeout(timer);readFields();drawList();
    try {
      const validated=P.validateProject(project), compiled=P.compile(validated), active=Parser.parse(lecture().notes);
      const ownAssets=new Set(project.assets.filter(a=>a.lectureId===lecture().id).map(a=>a.path));
      const ownMissing=active.assets.filter(path=>!ownAssets.has(path));
      const issues=compiled.diagnostics.slice();
      if(!lecture().available) active.diagnostics.forEach(d=>issues.push({...d,severity:'warning',lectureId:lecture().id,lectureTitle:lecture().title}));
      const errors=compiled.diagnostics.filter(d=>d.severity==='error');
      $('export-student').disabled=$('export-teaching').disabled=errors.length>0;
      $('build-status').textContent=`${active.slides.length} slides · ${errors.length} export errors · ${issues.filter(d=>d.severity==='warning').length} warnings`;
      $('diagnostics').replaceChildren();
      issues.forEach(issue=>{
        const li=document.createElement('li'),button=document.createElement('button');li.className=issue.severity;
        button.textContent=`${issue.lectureTitle}, line ${issue.line}: ${issue.message}`;
        button.addEventListener('click',()=>{readFields();selected=project.lectures.findIndex(l=>l.id===issue.lectureId);showLecture();jumpToLine(issue.line);});
        li.append(button);$('diagnostics').append(li);
      });
      $('slide-map').replaceChildren();
      active.slides.forEach((slide,i)=>{
        const button=document.createElement('button');button.textContent=`${i+1}. ${slide.title || slide.kind} · line ${slide.line}`;
        button.addEventListener('click',()=>jumpToLine(slide.line));$('slide-map').append(button);
        if(slide.notes.length){const p=document.createElement('p');p.textContent='Private: '+slide.notes.join('\n');$('slide-map').append(p);}
      });
      $('preview-wrap').classList.toggle('library-preview',libraryPreview);
      document.querySelector('.preview-nav').hidden=libraryPreview;
      if(libraryPreview && !errors.length){
        const maps=Object.fromEntries(project.lectures.map(l=>[l.id,assetUrls(l.id)]));
        setPreview(R.renderLibrary({...project.course,lectures:compiled.lectures},{assetUrls:maps}));
      }else if(!active.diagnostics.some(d=>d.severity==='error') && !ownMissing.length){
        setPreview(R.renderDeck(active,{mode:$('preview-mode').value,palette:project.course.palette,assetUrls:assetUrls(lecture().id),deckId:lecture().id}));
      }else{
        setPreview('<!doctype html><html lang="en"><meta charset="utf-8"><body style="background:#f2efe9;color:#1f2933;font:18px Georgia;padding:30px"><h2>Fix the annotations to preview.</h2><p>Use the line-numbered messages below. No content has been rewritten.</p></body></html>');
      }
    }catch(error){
      $('build-status').textContent='Export blocked: '+error.message;
      $('export-student').disabled=$('export-teaching').disabled=true;notice(error.message);
    }
  }
  function command(commandName) {$('preview').contentWindow.postMessage({type:'chartroom-command',command:commandName},'*');}
  window.addEventListener('message',event=>{
    if(event.source!==$('preview').contentWindow || event.origin!=='null')return;
    const state=event.data;
    if(state?.type==='chartroom-state' && Number.isInteger(state.index) && Number.isInteger(state.count) && state.index>=0 && state.index<state.count && state.count<=10000){
      $('preview-count').textContent=`${state.index+1} / ${state.count}`;
    }
  });
  ['course-title','course-code','lecture-title','notes','available'].forEach(id=>$(id).addEventListener('input',()=>{readFields();changed();}));
  $('rebuild').addEventListener('click',()=>{readFields();autosave();rebuild();});
  $('palette').addEventListener('change',()=>{showPaletteHelp();readFields();downloaded=false;autosave();rebuild();notice(R.palettes[project.course.palette].name+' selected for every lecture and both exports. Save project to keep the choice in your portable copy.');});
  $('preview-mode').addEventListener('change',()=>{libraryPreview=false;rebuild();});
  $('preview-library').addEventListener('click',()=>{libraryPreview=!libraryPreview;rebuild();});
  $('present-lecture').addEventListener('click',()=>{
    // Flush the pending edit so the workspace is current when presentation ends.
    clearTimeout(timer);readFields();autosave();rebuild();
    window.ChartroomPresenter.open(project,lecture().id,message=>notice('Presentation blocked: '+message));
  });
  $('preview-home').addEventListener('click',()=>command('home'));
  $('preview-prev').addEventListener('click',()=>command('previous'));
  $('preview-next').addEventListener('click',()=>command('next'));
  $('save-project').addEventListener('click',()=>{
    readFields();autosave();
    try {download('my-course.chartroom.json',JSON.stringify(P.validateProject(project),null,2),'application/json');downloaded=true;notice('Project download requested. Keep this private: it includes your source notes and images.');}
    catch(error){notice(error.message);}
  });
  $('open-project').addEventListener('click',()=>$('open-project-input').click());
  $('open-project-input').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>150*1024*1024)throw new Error('Project exceeds 150 MB.');
      const next=P.validateProject(JSON.parse(await file.text()));
      if(!downloaded && !confirm('Replace this unsaved project? Cancel and use Save project to keep a backup.'))return;
      project=next;selected=0;downloaded=true;libraryPreview=false;showLecture();notice('Project opened. Notes and images restored.');
    }catch(error){notice('Could not open project: '+error.message);}finally{event.target.value='';}
  });
  $('add-lecture').addEventListener('click',()=>{
    readFields();if(project.lectures.length>=200){notice('Maximum 200 lectures per project.');return;}
    let n=project.lectures.length+1;while(project.lectures.some(l=>l.id===`lecture-${n}`))n++;
    project.lectures.push({id:`lecture-${n}`,title:'New lecture',notes:starter,available:true});
    selected=project.lectures.length-1;downloaded=false;libraryPreview=false;showLecture();
  });
  function move(delta){readFields();const next=selected+delta;if(next<0||next>=project.lectures.length)return;[project.lectures[selected],project.lectures[next]]=[project.lectures[next],project.lectures[selected]];selected=next;downloaded=false;showLecture();}
  $('move-up').addEventListener('click',()=>move(-1));$('move-down').addEventListener('click',()=>move(1));
  $('remove-lecture').addEventListener('click',()=>{
    if(project.lectures.length<2||!confirm('Remove this lecture and its images from this project?'))return;
    const id=lecture().id;project.lectures.splice(selected,1);project.assets=project.assets.filter(a=>a.lectureId!==id);selected=Math.min(selected,project.lectures.length-1);downloaded=false;showLecture();
  });
  function replaceProject(next){if(!downloaded&&!confirm('Replace the current project? Save a project backup first if you need it.'))return;project=next;selected=0;downloaded=false;libraryPreview=false;showLecture();notice('New working copy opened. Nothing has been published.');}
  $('new-project').addEventListener('click',()=>replaceProject(blank()));
  $('load-demo').addEventListener('click',()=>replaceProject(P.validateProject(window.ChartroomDemo)));
  let exportInProgress=false;
  ['student','teaching'].forEach(target=>$('export-'+target).addEventListener('click',async()=>{
    if(exportInProgress)return;
    exportInProgress=true;
    try{
      readFields();rebuild();
      // Snapshot first: editing during validation cannot change the checked export.
      const snapshot=P.validateProject(project);
      $('export-student').disabled=$('export-teaching').disabled=true;
      notice('Checking every slide for overflow and testing image decoding…');
      const issues=await window.ChartroomPreflight.check(snapshot);
      if(issues.length)throw new Error(issues.map(d=>`${d.lectureTitle}, line ${d.line}: ${d.message}`).join('\n'));
      const result=P.build(snapshot,target);
      download(`chartroom-${target}.zip`,P.zip(result.files),'application/zip');
      notice('Export checked and download requested. Extract the entire ZIP before opening. This is a snapshot, not a synced copy.');
    }catch(error){notice('Export blocked: '+error.message);}
    finally{exportInProgress=false;rebuild();}
  }));
  $('save-notes').addEventListener('click',()=>{readFields();download(lecture().id+'.md',lecture().notes,'text/markdown;charset=utf-8');});
  // Imports and slide templates are deliberately explicit; the compiler never guesses.
  $('import-notes').addEventListener('click',()=>$('import-notes-input').click());
  $('import-images').addEventListener('click',()=>$('import-images-input').click());
  $('import-notes-input').addEventListener('change',async event=>{
    const files=Array.from(event.target.files), current=project;
    try{
      if(current.lectures.length+files.length>200)throw new Error('Maximum 200 lectures per project.');
      const added=[];
      for(const file of files){
        if(!/\.(md|txt)$/i.test(file.name)||file.size>2000000)throw new Error('Use .md or .txt files smaller than 2 MB.');
        const notes=await file.text();
        let n=current.lectures.length+added.length+1;
        while([...current.lectures,...added].some(l=>l.id===`lecture-${n}`))n++;
        added.push({id:`lecture-${n}`,title:file.name.replace(/\.(md|txt)$/i,''),notes,available:true});
      }
      if(project!==current)throw new Error('Project changed during import. Please import again.');
      const candidate=P.validateProject({...current,lectures:[...current.lectures,...added]});
      project=candidate;selected=project.lectures.length-added.length;downloaded=false;libraryPreview=false;showLecture();notice(`${added.length} notes file(s) imported as new lectures. Original files were not modified.`);
    }catch(error){notice('Notes import stopped: '+error.message);}finally{event.target.value='';}
  });
  $('import-images-input').addEventListener('change',async event=>{
    const files=Array.from(event.target.files), current=project, id=lecture().id;
    try{
      const added=[];
      const required=Parser.parse(lecture().notes).assets;
      for(const file of files){
        if(file.size>20*1024*1024)throw new Error('Image exceeds 20 MB. Resize it first.');
        const bytes=new Uint8Array(await file.arrayBuffer()), mime=P.imageMime(bytes);
        const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read image.'));reader.readAsDataURL(file);});
        const image=new Image();image.src=url;
        try{await image.decode();}catch(_){throw new Error('Cannot decode image: '+file.name);}
        if(image.naturalWidth*image.naturalHeight>80000000)throw new Error('Image exceeds 80 megapixels. Resize it first.');
        const matches=required.filter(path=>path.split('/').pop()===file.name);
        const assetPath=matches.length===1?matches[0]:'images/'+file.name;
        added.push({lectureId:id,path:assetPath,mime,data:String(url).split(',')[1]});
      }
      if(project!==current)throw new Error('Project changed during import. Please import again.');
      const assets=current.assets.filter(a=>!added.some(n=>n.lectureId===a.lectureId && n.path===a.path));
      const candidate=P.validateProject({...current,assets:[...assets,...added]});
      project=candidate;downloaded=false;showAssets();autosave();rebuild();notice(`${added.length} local image(s) added. Check their paths under Local images; matching paths replace previous images.`);
    }catch(error){notice('Image import stopped: '+error.message);}finally{event.target.value='';}
  });
  const templates={
    facts:'## A slide heading\n- Your first point.\n- Your next point.\n',
    cards:'## Two ideas @cards\n- **First idea:** Your words.\n- **Second idea:** Your words.\n',
    'two-col':'## A comparison @two-col\n### Left column\n- Your words.\n### Right column\n- Your words.\n',
    quote:'## A quotation @quote\nYour verbatim quotation.\n@attribution Your verified attribution\n',
    big:'## Your statement @big\n',part:'## Your major section @part\n',
    photo:'## Your chapter @photo images/your-photo.jpg\n@alt Describe the photo\n@credit Add source and license\n',
    somber:'## Your solemn moment @somber images/your-photo.jpg\n@alt Describe the photo\n@credit Add source and license\n',
    img:'## Your figure @img images/your-figure.png\n@alt Describe the figure\n@credit Add source and license\n',
    lens:'## The thematic spectrum @lens\n',
    duo:'## Two people @duo\n@portrait images/one.jpg | Person One | Source and license | Portrait of Person One\n@portrait images/two.jpg | Person Two | Source and license | Portrait of Person Two\n',
    scholar:'## An authored reference @scholar images/portrait.jpg\n@alt Portrait description\n@citation Your verified citation\n@takeaway Your exact takeaway\n@credit Image source and license\n'
  };
  $('insert-slide').addEventListener('click',()=>{
    const textarea=$('notes'), at=textarea.selectionStart;
    textarea.setRangeText('\n\n'+templates[$('insert-kind').value]+'\n',at,textarea.selectionEnd,'end');
    readFields();changed();textarea.focus();notice('Template inserted. Replace its sample words with your own.');
  });
  const Insert = window.ChartroomInsert;
  let elementGroup;
  for (const item of Insert.catalog) {
    if (!elementGroup || elementGroup.label !== item.group) {
      elementGroup = document.createElement('optgroup');elementGroup.label = item.group;
      $('insert-element-kind').append(elementGroup);
    }
    elementGroup.append(new Option(item.label,item.id));
  }
  function elementHelp() {
    const item = Insert.catalog.find(entry=>entry.id===$('insert-element-kind').value);
    $('element-help').textContent=item.help;
    $('element-syntax').textContent=item.text;
    $('element-status').textContent='';
  }
  $('insert-element-kind').addEventListener('change',elementHelp);
  elementHelp();
  $('insert-element').addEventListener('click',()=>{
    const textarea=$('notes');
    const edit=Insert.plan(textarea.value,textarea.selectionStart,textarea.selectionEnd,$('insert-element-kind').value);
    if(edit.error){$('element-status').textContent=edit.error;notice(edit.error);return;}
    textarea.focus();textarea.setSelectionRange(edit.start,edit.end);
    // Chromium's native edit command retains Ctrl+Z history. Fall back for other browsers.
    const previous=textarea.value;
    try{document.execCommand('insertText',false,edit.text);}catch(_){/* fallback below */}
    if(textarea.value===previous)textarea.setRangeText(edit.text,edit.start,edit.end,'end');
    textarea.setSelectionRange(edit.selectionStart,edit.selectionEnd);
    readFields();changed();
    const message='Element inserted. Replace the highlighted sample text where provided.';
    $('element-status').textContent=message;notice(message);
  });
  $('notes').addEventListener('keydown',event=>{
    if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();const t=event.target;t.setRangeText('  ',t.selectionStart,t.selectionEnd,'end');readFields();changed();}
  });
  $('save-recovery').addEventListener('click',()=>{
    if(recoveryRaw===null)return;
    download('chartroom-recovery.json',recoveryRaw,'application/json');
    recoveryRaw=null;$('save-recovery').hidden=true;autosave();
    notice('Recovery download requested. Keep that original file private. Autosave has resumed; use Save project for the current working copy.');
  });
  let savedDraft=null;
  try {
    savedDraft=localStorage.getItem(storageKey);
    if(savedDraft){project=P.validateProject(JSON.parse(savedDraft));downloaded=false;notice('Restored your local draft. Use Save project for a portable backup.');}
  }catch(error){
    recoveryRaw=savedDraft;
    $('save-recovery').hidden=recoveryRaw===null;
    notice('Local draft could not be restored and has NOT been overwritten. Use Save recovery copy to keep its original text. '+error.message);
  }
  showLecture();
  window.addEventListener('beforeunload',event=>{if(!downloaded){event.preventDefault();event.returnValue='';}});
})();
