/* Chartroom Studio packaging. No dependencies, network calls, or compression library. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChartroomPackage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const utf8 = new TextEncoder();
  const crcTable = Array.from({length:256}, (_, i) => {
    let n = i;
    for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function join(chunks) {
    const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  }
  function safePath(value) {
    return typeof value === 'string' && value.length > 0 && value.length <= 240 &&
      !/[\\\\:*?"<>|\x00-\x1f\x7f%#]/.test(value) &&
      value.split('/').every(part => part && part !== '.' && part !== '..' &&
        !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part));
  }
  function decodeBase64(value) {
    if (typeof value !== 'string' || value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
      throw new Error('Invalid image base64 data.');
    }
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }
  function imageMime(bytes) {
    const starts = prefix => prefix.every((byte,i) => bytes[i] === byte);
    if (starts([137,80,78,71,13,10,26,10])) return 'image/png';
    if (starts([255,216,255])) return 'image/jpeg';
    if (starts([71,73,70,56,55,97]) || starts([71,73,70,56,57,97])) return 'image/gif';
    if (starts([82,73,70,70]) && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) return 'image/webp';
    throw new Error('Image signature is not a supported PNG, JPEG, GIF or WebP.');
  }
  function validateProject(value) {
    const fail = message => { throw new Error(message); };
    const str = (s, label, max=1000) => typeof s === 'string' && s.length <= max ? s : fail('Invalid '+label+'.');
    if (!value || value.format !== 'chartroom-studio' || value.version !== 1) fail('Unsupported project format or version (expected Chartroom Studio v1).');
    if (!value.course || !Array.isArray(value.lectures) || !value.lectures.length || value.lectures.length > 200 || !Array.isArray(value.assets) || value.assets.length > 2000) fail('Project needs 1–200 lectures and at most 2,000 assets.');
    const course = {title:str(value.course.title,'course title'),code:str(value.course.code,'course code',100),palette:engines().renderer.paletteId(value.course.palette)};
    const ids = new Set();
    const lectures = value.lectures.map(lecture => {
      if (!lecture || typeof lecture.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(lecture.id) || !safePath(lecture.id) || ids.has(lecture.id)) fail('Invalid, unsafe or duplicate lecture identifier.');
      ids.add(lecture.id);
      if (typeof lecture.available !== 'boolean') fail('Lecture availability must be true or false.');
      return {id:lecture.id,title:str(lecture.title,'lecture title'),notes:str(lecture.notes,'lecture notes',2000000),available:lecture.available};
    });
    let total = 0;
    const names = new Set();
    const assets = value.assets.map(asset => {
      if (!asset || !ids.has(asset.lectureId)) fail('Image refers to an unknown lecture.');
      if (!safePath(asset.path) || !/\.(png|jpe?g|gif|webp)$/i.test(asset.path)) fail('Invalid image path. Use a relative raster-image path.');
      const key = asset.lectureId+'/'+asset.path.toLowerCase();
      if (names.has(key)) fail('Duplicate image path: '+asset.path);
      names.add(key);
      if (typeof asset.data !== 'string' || asset.data.length > 28000000) fail('Image exceeds 20 MB. Resize it before import.');
      const bytes = decodeBase64(asset.data);
      total += bytes.length;
      if (bytes.length > 20*1024*1024 || total > 100*1024*1024) fail('Images exceed the 20 MB per image / 100 MB per project limit.');
      const mime = imageMime(bytes);
      const extensionMime = /\.png$/i.test(asset.path) ? 'image/png' : /\.jpe?g$/i.test(asset.path) ? 'image/jpeg' : /\.gif$/i.test(asset.path) ? 'image/gif' : 'image/webp';
      if (asset.mime !== mime || mime !== extensionMime) fail('Image MIME, signature and filename extension must agree: '+asset.path);
      return {lectureId:asset.lectureId,path:asset.path,mime,data:asset.data};
    });
    return {format:'chartroom-studio',version:1,course,lectures,assets};
  }
  function zip(files) {
    if (!Array.isArray(files) || files.length > 65535) throw new Error('ZIP file count limit exceeded.');
    const names = new Set();
    let size = 0;
    for (const file of files) {
      if (!safePath(file.path)) throw new Error('Unsafe ZIP path: '+file.path);
      if (names.has(file.path.toLowerCase())) throw new Error('Duplicate ZIP path: '+file.path);
      names.add(file.path.toLowerCase());
      if (typeof file.data !== 'string' && !(file.data instanceof Uint8Array)) throw new Error('ZIP data must be text or bytes.');
      size += typeof file.data === 'string' ? utf8.encode(file.data).length : file.data.length;
    }
    if (size > 250*1024*1024) throw new Error('ZIP exceeds the 250 MB safety limit.');
    const local = [], central = [];
    let offset = 0;
    for (const file of files) {
      const name = utf8.encode(file.path);
      const data = typeof file.data === 'string' ? utf8.encode(file.data) : file.data;
      const crc = crc32(data);
      const header = new Uint8Array(30 + name.length);
      const h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true);
      h.setUint16(6, 0x800, true); h.setUint16(12, 33, true); // UTF-8; Jan 1, 1980
      h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      header.set(name, 30); local.push(header, data);
      const record = new Uint8Array(46 + name.length);
      const c = new DataView(record.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
      c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
      record.set(name, 46); central.push(record); offset += header.length + data.length;
    }
    const directory = join(central), end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, directory.length, true); e.setUint32(16, offset, true);
    return join([...local, directory, end]);
  }
  function engines() {
    return typeof module === 'object' && module.exports ?
      {parser:require('./parser.js'),renderer:require('./renderer.js')} :
      {parser:globalThis.ChartroomParser,renderer:globalThis.ChartroomRenderer};
  }
  function compile(project) {
    const {parser} = engines();
    const diagnostics = [];
    const lectures = project.lectures.map(lecture => {
      if (!lecture.available) return {id:lecture.id,title:lecture.title,model:null};
      const model = parser.parse(lecture.notes);
      for (const diagnostic of model.diagnostics) diagnostics.push({...diagnostic,lectureId:lecture.id,lectureTitle:lecture.title});
      for (const assetPath of model.assets) {
        if (!project.assets.some(asset => asset.lectureId === lecture.id && asset.path === assetPath)) {
          diagnostics.push({severity:'error',code:'MISSING_ASSET',line:model.slides.find(s=>s.image===assetPath)?.line || 1,
            message:'Missing local image: '+assetPath,lectureId:lecture.id,lectureTitle:lecture.title});
        }
      }
      return {id:lecture.id,title:lecture.title,model};
    });
    return {lectures,diagnostics};
  }
  function build(input, target) {
    if (!['student','teaching'].includes(target)) throw new Error('Unknown export target.');
    const project = validateProject(input), {renderer} = engines();
    const {lectures,diagnostics} = compile(project);
    const errors = diagnostics.filter(d => d.severity === 'error');
    if (errors.length) throw new Error(errors.map(d=>`${d.lectureTitle}, line ${d.line}: ${d.message}`).join('\n'));
    const files = [], maps = Object.create(null);
    for (const lecture of lectures.filter(l=>l.model)) {
      maps[lecture.id] = Object.create(null);
      for (const name of lecture.model.assets) {
        const asset = project.assets.find(a=>a.lectureId===lecture.id && a.path===name);
        const assetPath = target === 'student' ? `images/${lecture.id}/${name}` : `lectures/${lecture.id}/${name}`;
        maps[lecture.id][name] = target === 'student' ? assetPath : name;
        files.push({path:assetPath,data:decodeBase64(asset.data)});
      }
      if (target === 'teaching') files.push({path:`lectures/${lecture.id}/index.html`,data:renderer.renderDeck(lecture.model,{mode:'teaching',deckId:lecture.id,palette:project.course.palette,assetUrls:maps[lecture.id]})});
    }
    if (target === 'student') files.unshift({path:'index.html',data:renderer.renderLibrary({...project.course,lectures},{assetUrls:maps})});
    files.push({path:'README.txt',data:target === 'student' ?
      'STUDENT REVIEW LIBRARY\nExtract this entire ZIP before opening index.html. Keep the images folder alongside it. No installation or Internet needed. Select a lecture to start at slide one. All points are visible for review. Arrows or Previous/Next move slides. For small screens use landscape/fullscreen.\n\nThis export excludes source notes and private speaker asides. It does include visible slides, image credits and referenced images. Check your rights before distributing. No access controls are provided.\n\nTo update: edit the original Chartroom Studio project and export a new ZIP. This snapshot does not sync with the project, old exports, or a live website. To publish, upload ALL extracted files together. No Apps Script needed.\n' :
      'TEACHING DECKS\nExtract this entire ZIP. Open the index.html within the required lectures/<id>/ folder. Keep that folder and all its images together. Space/right arrow reveals the next fact then moves slides; left reverses. Home/End jump to the beginning/end. Position resumes when browser storage is available.\n\nNo on-slide navigation buttons. Use the browser fullscreen control (usually F11) for class. Print from the browser to include all slides and bullets. Speaker notes are kept in the private Studio project, not in these HTML files.\n\nEdit annotated notes in the project and export again to revise. Direct HTML edits are possible, but regeneration replaces them. These are snapshots, not synced copies.\n\nIncluded lectures:\n'+lectures.filter(l=>l.model).map(l=>`${l.title}: lectures/${l.id}/index.html`).join('\n')});
    return {files,diagnostics};
  }
  return {zip, crc32, safePath, decodeBase64, imageMime, validateProject, compile, build};
});
