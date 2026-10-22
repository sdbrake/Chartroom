'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = path.join(__dirname, '../src/converter.js');
const converter = fs.existsSync(source) ? require(source) : {};
const parser = require('../src/parser.js');
function compiled(result) {
  const model = parser.parse(result.notes);
  assert.deepEqual(model.diagnostics.filter(d => d.severity === 'error'), []);
  return model;
}
test('text becomes a cover and ordered draft slides with list hierarchy', () => {
  assert.equal(typeof converter.fromText, 'function');
  const result = converter.fromText('# Exact title\n\n## Opening\nFirst paragraph.\n\n1. First claim\n   - Child claim\n2. Second claim\n\n## Closing\nLast words.');
  assert.equal(result.title, 'Exact title');
  const model = compiled(result);
  assert.deepEqual(model.slides.map(s => s.title), ['Exact title', 'Opening', 'Closing']);
  assert.equal(model.slides[1].items[0].text, 'First paragraph.');
  assert.equal(model.slides[1].items[1].text, '1. First claim');
  assert.equal(model.slides[1].items[1].children[0].text, 'Child claim');
  assert.equal(model.slides[1].items[2].text, '2. Second claim');
  assert.ok(result.warnings.some(w => /draft|review/i.test(w)));
});
test('private and ambiguous author markup is retained only as opaque notes, never silently consumed', () => {
  const result = converter.fromText('# Safe\n## Public\n- **Visible bold**\n@notes SECRET explicit * %% <tag>\n- Text *SECRET inline* tail\n- %%SECRET multiline\nSECRET continuation\nend%%\n- 2 * 3\nSECRET unmatched tail', {title:'Risk @unknown'});
  const model = compiled(result);
  const publicModel = JSON.stringify(model.slides.map(({notes, ...slide}) => slide));
  assert.doesNotMatch(publicModel, /SECRET|@unknown/);
  const privateText = model.slides.flatMap(s => s.notes).join('\n');
  for (const text of ['SECRET explicit * %% <tag>', 'Text *SECRET inline* tail', 'SECRET continuation', 'SECRET unmatched tail', 'Risk @unknown']) assert.ok(privateText.includes(text), text);
  assert.ok(publicModel.includes('Visible bold'));
  assert.ok(result.warnings.some(w => /private.*review|quarantin/i.test(w)));
  assert.doesNotMatch(result.warnings.join(' '), /SECRET|@unknown/);
});

const {chromium} = require('playwright');
let browser, page;
test.before(async () => {
  browser = await chromium.launch({headless:true, ...(process.env.BROWSER_PATH ? {executablePath:process.env.BROWSER_PATH} : {})});
  page = await browser.newPage();
  await page.addScriptTag({path:source});
});
test.after(async () => { if (browser) await browser.close(); });
test('HTML slide extraction is inert and keeps speaker notes private', async () => {
  let requests = 0;
  await page.route('**/*', route => { requests++; return route.abort(); });
  const result = await page.evaluate(() => window.ChartroomConverter.fromHTML(`
    <title>HTML lecture</title><script>window.CONVERTER_INJECTED=1</script>
    <link rel="stylesheet" href="https://invalid.example/style.css">
    <nav>Not teaching content</nav><div class="reveal"><div class="slides">
    <section><section><h2>First slide</h2><p>Exact <b>words</b> &amp; symbols.</p>
    <ul><li>Parent<ul><li>Child</li></ul></li><li>Last</li></ul>
    <aside class="notes">PRIVATE speaker <b>words</b> * %%</aside>
    <p hidden>Hidden UI</p><img src="https://invalid.example/pixel.png" onerror="window.CONVERTER_INJECTED=2">
    <iframe src="https://invalid.example/frame"></iframe></section></section>
    <section><h2>Second slide</h2><table><tr><td>A</td><td>B</td></tr></table></section>
    </div></div>`));
  const model = compiled(result);
  assert.equal(result.title, 'HTML lecture');
  assert.deepEqual(model.slides.map(s => s.title), ['HTML lecture', 'First slide', 'Second slide']);
  assert.equal(model.slides[1].items[0].text, 'Exact words & symbols.');
  assert.equal(model.slides[1].items[1].children[0].text, 'Child');
  assert.ok(model.slides[1].notes.join(' ').includes('PRIVATE speaker words * %%'));
  assert.equal(model.slides[2].items[0].text, 'A | B');
  assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)), /PRIVATE|Hidden UI|Not teaching/);
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.CONVERTER_INJECTED), undefined);
  assert.equal(requests, 0);
});

// All OOXML/ZIP fixtures are synthetic and generated in memory; no private files.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(files, method = 0) {
  const locals = [], directory = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const bytes = Buffer.from(text), filename = Buffer.from(name);
    const data = method === 8 ? require('node:zlib').deflateRawSync(bytes) : bytes;
    const local = Buffer.alloc(30), central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc32(bytes), 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(filename.length, 26);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc32(bytes), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, filename, data); directory.push(central, filename); offset += local.length + filename.length + data.length;
  }
  const dir = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(directory.length / 2, 8); end.writeUInt16LE(directory.length / 2, 10); end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function rels(items) { return `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join('')}</Relationships>`; }
function para(text, level = 0) { return `<a:p><a:pPr lvl="${level}"/><a:r><a:t>${text}</a:t></a:r></a:p>`; }
function shape(text, type = '', level = 0) { return `<p:sp><p:nvSpPr><p:nvPr>${type ? `<p:ph type="${type}"/>` : ''}</p:nvPr></p:nvSpPr><p:txBody>${para(text, level)}</p:txBody></p:sp>`; }
function slide(content) { return `<p:sld xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree>${content}</p:spTree></p:cSld></p:sld>`; }
function presentationFiles() {
  return {
    '_rels/.rels':rels([['doc', 'officeDocument', 'ppt/presentation.xml']]),
    'ppt/presentation.xml':`<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst><p:sldId id="2" r:id="second"/><p:sldId id="1" r:id="first"/></p:sldIdLst></p:presentation>`,
    'ppt/_rels/presentation.xml.rels':rels([['first','slide','slides/slide1.xml'], ['second','slide','slides/slide2.xml']]),
    'ppt/slides/slide1.xml':slide(shape('Last slide','title') + shape('Final words')),
    'ppt/slides/slide2.xml':slide(shape('First slide','ctrTitle') + shape('Parent') + shape('Child', '', 1) + shape('FOOTER OMIT','ftr') + shape('12345','sldNum') + `<p:graphicFrame><a:tbl><a:tr><a:tc><a:txBody>${para('Cell A')}</a:txBody></a:tc><a:tc><a:txBody>${para('Cell B')}</a:txBody></a:tc></a:tr></a:tbl></p:graphicFrame>`),
    'ppt/slides/_rels/slide2.xml.rels':rels([['notes','notesSlide','../notesSlides/notesSlide2.xml']]),
    'ppt/notesSlides/notesSlide2.xml':`<p:notes xmlns:p="${P}" xmlns:a="${A}"><p:cSld><p:spTree>${shape('PRIVATE pptx notes * %%','body')}${shape('12345','sldNum')}</p:spTree></p:cSld></p:notes>`
  };
}
async function pptxInBrowser(bytes, options = {}) {
  return page.evaluate(async ({bytes, options}) => window.ChartroomConverter.fromPptx(Uint8Array.from(bytes).buffer, options), {bytes:Array.from(bytes), options});
}
test('PPTX follows presentation relationships, retaining paragraphs, tables and private notes', async () => {
  const result = await pptxInBrowser(zip(presentationFiles()), {title:'Synthetic lecture'});
  const model = compiled(result);
  assert.deepEqual(model.slides.map(s => s.title), ['Synthetic lecture', 'First slide', 'Last slide']);
  assert.equal(model.slides[1].items[0].text, 'Parent');
  assert.equal(model.slides[1].items[0].children[0].text, 'Child');
  assert.equal(model.slides[1].items[1].text, 'Cell A | Cell B');
  assert.ok(model.slides[1].notes.includes('PRIVATE pptx notes * %%'));
  assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)), /PRIVATE|FOOTER OMIT|12345/);
  assert.equal(model.slides[2].items[0].text, 'Final words');
});

test('browser-native deflate-raw conversion matches stored ZIP without dependencies or network', async () => {
  const stored = await pptxInBrowser(zip(presentationFiles()));
  const compressed = await pptxInBrowser(zip(presentationFiles(), 8));
  assert.deepEqual(compressed, stored);
});

const zipMutations = [
  ['encrypted', (b,c) => b.writeUInt16LE(1,c+8), /encrypted/i],
  ['unsupported compression', (b,c) => b.writeUInt16LE(99,c+10), /compression/i],
  ['oversized entry', (b,c) => b.writeUInt32LE(200*1024*1024,c+24), /size|limit|large/i],
  ['ZIP64', (b,c) => b.writeUInt32LE(0xffffffff,c+24), /ZIP64|size|limit/i],
  ['too many entries', b => {b.writeUInt16LE(5000,b.length-14);b.writeUInt16LE(5000,b.length-12);}, /entries|limit/i],
  ['truncated central directory', (b,c) => b.writeUInt32LE(b.length,c+42), /invalid|malformed|truncat/i],
  ['bad local signature', b => b.writeUInt32LE(0,0), /invalid|malformed/i],
  ['CRC mismatch', (b,c) => {b.writeUInt32LE(0,c+16);b.writeUInt32LE(0,14);}, /CRC|checksum|corrupt/i],
  ['multidisk', b => b.writeUInt16LE(1,b.length-18), /multidisk|split|unsupported/i]
];
for (const [label, mutate, expected] of zipMutations) test('rejects unsafe ZIP: '+label, async () => {
  const bytes = zip(presentationFiles());
  mutate(bytes, bytes.readUInt32LE(bytes.length-6));
  await assert.rejects(pptxInBrowser(bytes), expected);
});
test('rejects highly compressed ZIP bomb metadata before expanding it', async () => {
  const files = presentationFiles(); files['huge.xml'] = ' '.repeat(2*1024*1024);
  await assert.rejects(pptxInBrowser(zip(files,8)), /ratio|bomb|limit/i);
});
test('rejects truncated/random and unsafe-path ZIPs with actionable errors', async () => {
  await assert.rejects(pptxInBrowser(Buffer.from('not a zip')), /PPTX|pptx/);
  const files = presentationFiles(); files['../escape.xml'] = '<data/>';
  await assert.rejects(pptxInBrowser(zip(files)), /path|unsafe|invalid/i);
});

for (const [label, change, expected] of [
  ['malformed XML', files => files['ppt/slides/slide2.xml'] = '<broken>', /XML|malformed/i],
  ['DTD entities', files => files['ppt/slides/slide2.xml'] = '<!DOCTYPE foo [<!ENTITY secret "PRIVATE ENTITY">]>' + files['ppt/slides/slide2.xml'], /DTD|DOCTYPE|entit/i],
  ['external slide relationship', files => files['ppt/_rels/presentation.xml.rels'] = files['ppt/_rels/presentation.xml.rels'].replace('Id="second"', 'Id="second" TargetMode="External"'), /external|relationship/i],
  ['escaping relationship path', files => files['ppt/_rels/presentation.xml.rels'] = files['ppt/_rels/presentation.xml.rels'].replace('slides/slide2.xml', '../../ppt/slides/slide2.xml'), /path|relationship/i],
  ['missing notes part', files => delete files['ppt/notesSlides/notesSlide2.xml'], /missing|referenced/i],
  ['duplicate relationship IDs', files => files['ppt/_rels/presentation.xml.rels'] = files['ppt/_rels/presentation.xml.rels'].replace('Id="first"', 'Id="second"'), /duplicate|relationship/i]
]) test('PPTX rejects '+label+' without exposing source text', async () => {
  const files = presentationFiles(); change(files);
  await assert.rejects(pptxInBrowser(zip(files)), error => expected.test(error.message) && !error.message.includes('PRIVATE ENTITY'));
});

test('fromFile dispatches supported local formats and rejects legacy/binary/oversized inputs', async () => {
  assert.equal(typeof converter.fromFile, 'function');
  for (const extension of ['txt','md','html','htm']) {
    const result = await page.evaluate(async extension => {
      const content = ['html','htm'].includes(extension) ? '<h1>Source heading</h1><p>Words</p>' : '# Source heading\n\nWords';
      return window.ChartroomConverter.fromFile(new File([content], 'draft.'+extension), {title:'Chosen title'});
    }, extension);
    assert.equal(result.title, 'Chosen title'); compiled(result);
    assert.ok(result.notes.includes('Source heading'));
  }
  const pptx = await page.evaluate(async bytes => window.ChartroomConverter.fromFile(new File([Uint8Array.from(bytes)], 'deck.PPTX')), Array.from(zip(presentationFiles(),8)));
  compiled(pptx);
  for (const extension of ['ppt','pdf','exe']) await assert.rejects(page.evaluate(async extension => window.ChartroomConverter.fromFile(new File(['text'],'file.'+extension)),extension), /pptx|paste text/i);
  await assert.rejects(converter.fromFile({name:'huge.pptx',size:40*1024*1024,arrayBuffer(){throw Error('must not read');}}), /limit|large|MiB/i);
  await assert.rejects(page.evaluate(() => window.ChartroomConverter.fromFile(new File([new Uint8Array([0xff,0xfe,0,0])],'bad.txt'))), /UTF-8|encoding|binary/i);
});
test('direct text input has bounded size and actionable empty/binary errors', () => {
  assert.throws(() => converter.fromText(' '), /empty|text/i);
  assert.throws(() => converter.fromText('x'.repeat(3*1024*1024)), /limit|MiB|large/i);
  assert.throws(() => converter.fromText('a\0b'), /binary|NUL/i);
});

test('multiline private annotations protect headings and cover inference too', () => {
  for (const sourceText of ['%%\n# PRIVATE cover\n## PRIVATE slide\n%%\nVisible.', '# Cover\n## Safe\n%%PRIVATE start\n## PRIVATE slide\nend%%\nVisible.']) {
    const result = converter.fromText(sourceText), model = compiled(result);
    assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)), /PRIVATE/);
    assert.ok(model.slides.flatMap(s => s.notes).join(' ').includes('PRIVATE'));
    assert.ok(result.notes.includes('Visible.'));
  }
});
test('HTML never promotes nested hidden/notes text into inferred titles or table cells', async () => {
  const result = await page.evaluate(() => window.ChartroomConverter.fromHTML('<aside class="notes"><h1>PRIVATE inferred</h1></aside><div class="slide"><h2>Visible <span hidden>PRIVATE title</span><span class="notes">PRIVATE heading note</span></h2><table><tr><td>Cell<span hidden>PRIVATE cell</span><aside class="notes">PRIVATE table note</aside></td></tr></table></div>'));
  const model = compiled(result);
  assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)), /PRIVATE/);
  assert.ok(model.slides.flatMap(s => s.notes).join(' ').includes('PRIVATE heading note'));
  assert.ok(model.slides.flatMap(s => s.notes).join(' ').includes('PRIVATE table note'));
});

test('PPTX embedded newlines cannot activate notes grammar and malformed depth stays compilable', async () => {
  const files = presentationFiles();
  files['ppt/slides/slide2.xml'] = slide(shape('Title','title') + shape('Line one\n## Not a new slide', '', 0) + shape('Fractional indent', '', 0.5) + shape('End', '', 99999));
  const model = compiled(await pptxInBrowser(zip(files)));
  assert.equal(model.slides.length, 3);
  assert.equal(model.slides[1].items[0].text, 'Line one ## Not a new slide');
});
test('HTML attribute speaker notes do not erase the public slide they annotate', async () => {
  const result = await page.evaluate(() => window.ChartroomConverter.fromHTML('<section class="slide" data-notes="PRIVATE attribute"><h2>Public title</h2><p>Public words</p><div hidden><aside class="notes">PRIVATE nested notes</aside></div></section>'));
  const model = compiled(result);
  assert.equal(model.slides[1].title, 'Public title');
  assert.equal(model.slides[1].items[0].text, 'Public words');
  assert.ok(model.slides[1].notes.includes('PRIVATE attribute'));
  assert.ok(model.slides[1].notes.includes('PRIVATE nested notes'));
});
test('slide and output limits bound repeat-expansion from small source inputs', async () => {
  assert.throws(() => converter.fromText('# Title\n' + '## Heading\n'.repeat(1001)), /slide.*limit|1000/i);
  const files = presentationFiles();
  files['ppt/presentation.xml'] = `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst>${'<p:sldId id="1" r:id="first"/>'.repeat(1001)}</p:sldIdLst></p:presentation>`;
  await assert.rejects(pptxInBrowser(zip(files,8)), /slide.*limit|1000/i);
});

test('generated output size is bounded before repeated headings exhaust memory', () => {
  assert.throws(() => converter.fromText('Paragraph.\n\n'.repeat(900), {title:'T'.repeat(6000)}), /output|limit/i);
});
test('adversarial bracket sequences are scanned in bounded time', () => {
  const vm = require('node:vm');
  const context = vm.createContext({TextEncoder,TextDecoder});
  vm.runInContext(fs.readFileSync(source,'utf8'),context);
  vm.runInContext(`ChartroomConverter.fromText('['.repeat(150000))`, context, {timeout:1500});
});

test('HTML excludes navigation slides and headings under hidden ancestors', async () => {
  const result = await page.evaluate(() => window.ChartroomConverter.fromHTML('<nav><div class="slide"><h2>PRIVATE nav</h2></div></nav><section class="slide" hidden><div hidden><h2>PRIVATE hidden heading</h2></div><h2>Public title</h2><p>Public body</p></section>'));
  const model = compiled(result);
  assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)), /PRIVATE/);
  assert.deepEqual(model.slides.map(s => s.title), ['Public title','Public title']);
});
test('legacy/encrypted Office containers get a specific actionable error', async () => {
  const ole = Buffer.alloc(512); Buffer.from('d0cf11e0a1b11ae1','hex').copy(ole);
  await assert.rejects(pptxInBrowser(ole), /encrypt.*pptx|legacy.*pptx/i);
});

test('repeated relationship reads cannot multiply the XML expansion budget', async () => {
  const files = presentationFiles();
  files['ppt/slides/slide1.xml'] = slide(shape('Small visible title','title') + '<!--' + 'x'.repeat(800000) + '-->');
  files['ppt/presentation.xml'] = `<p:presentation xmlns:p="${P}" xmlns:r="${R}"><p:sldIdLst>${'<p:sldId id="1" r:id="first"/>'.repeat(200)}</p:sldIdLst></p:presentation>`;
  await assert.rejects(pptxInBrowser(zip(files,8)), /read|budget|limit/i);
});
test('HTML structural complexity is bounded before extraction', async () => {
  await assert.rejects(page.evaluate(() => window.ChartroomConverter.fromHTML('<h1>Title</h1>' + '<i></i>'.repeat(50001))), /HTML.*limit|complex/i);
});

// Verification of already implemented boundaries (not new feature RED cycles).
test('classic browser and CommonJS exports agree and support repeat script loading', async () => {
  await page.addScriptTag({path:source});
  const text = '# Unicode — café\n## 講義\n- Exact wording & punctuation: “yes.”\n  - child';
  const result = await page.evaluate(text => window.ChartroomConverter.fromText(text),text);
  assert.deepEqual(result,converter.fromText(text)); compiled(result);
  assert.ok(Object.isFrozen(converter.limits));
});
test('missing browser decompression support gives an actionable fallback', async () => {
  const message = await page.evaluate(async bytes => {
    const original = globalThis.DecompressionStream;
    try {
      globalThis.DecompressionStream = undefined;
      await window.ChartroomConverter.fromPptx(Uint8Array.from(bytes).buffer);
    } catch (error) { return error.message; }
    finally { globalThis.DecompressionStream = original; }
  },Array.from(zip(presentationFiles(),8)));
  assert.match(message,/Chrome.*Edge.*paste text/i);
});
test('text conversion compiles deterministically across structural and markup samples', () => {
  const samples = ['plain\nwrapped\n\nsecond paragraph','## No cover\n- First\n    - Nested','### Heading\n+ bullet\n* bullet','<!--PRIVATE\n## PRIVATE\n-->\nPublic','[link](url)\n_underlined_\n`code`','- Before\n- *PRIVATE*\n    - Child','@unknown literal\n# Title @directive','**bold** and ordinary 50%'];
  for (const text of samples) {
    const result = converter.fromText(text);
    compiled(result); assert.deepEqual(result,converter.fromText(text));
  }
});

test('HTML cover inference cannot expose a heading inside a multiline annotation', async () => {
  const result = await page.evaluate(() => window.ChartroomConverter.fromHTML('<p>%%</p><h1>PRIVATE heading</h1><p>end%%</p><p>Public words</p>'));
  const model = compiled(result);
  assert.doesNotMatch(JSON.stringify(model.slides.map(({notes,...s}) => s)),/PRIVATE/);
  assert.ok(model.slides.flatMap(s => s.notes).join(' ').includes('PRIVATE heading'));
});
