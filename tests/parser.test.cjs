'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let parser = {};
try { parser = require('../src/parser.js'); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
const errors = model => model.diagnostics.filter(d => d.severity === 'error');

test('image and quotation shorthand can omit a visible heading without inventing one', () => {
  for (const source of ['# T\n## @quote\nExact quotation.', '# T\n## @img images/x.png', '# T\n## @somber images/x.png']) {
    const result = parser.parse(source);
    assert.deepEqual(errors(result), []);
    assert.equal(result.slides[1].title, '');
  }
});

test('basic notes preserve wording and recursive facts in the complete model', () => {
  assert.equal(typeof parser.parse, 'function');
  const model = parser.parse('# Author’s title\n\n## A section\n\n## Why?\nThe author says: <not HTML>.\n- **Exactly** this.\n  - Child!\n    - Grandchild?\n- Next.');
  assert.equal(model.version, 1);
  assert.equal(model.title, 'Author’s title');
  assert.deepEqual(model.assets, []);
  assert.deepEqual(model.diagnostics, []);
  assert.deepEqual(model.slides.map(s => s.kind), ['cover', 'divider', 'facts']);
  const slide = model.slides[2];
  assert.equal(slide.line, 5);
  assert.deepEqual(slide.body, ['The author says: <not HTML>.']);
  assert.deepEqual(slide.items, [{text:'**Exactly** this.',line:7,children:[{text:'Child!',line:8,children:[{text:'Grandchild?',line:9,children:[]}]}]},{text:'Next.',line:10,children:[]}]);
  for (const field of ['eyebrow','hue','footer','image','alt','credit','attribution','citation','takeaway']) assert.equal(typeof slide[field], 'string');
  for (const field of ['notes','columns','meters','portraits']) assert.deepEqual(slide[field], []);
  assert.equal(slide.reveal, true);
  assert.equal(slide.polarity, false);
});

test('private annotations are multiline-aware without changing public bold wording', () => {
  const model = parser.parse('<!-- preface\n comment -->\n# Public *private title*\n## Visible\nA<!-- hidden\ncomment -->B\n- Before %%secret\ncontinued%% after **bold** *spoken*\n%%whole\naside%%\n@notes explicit secret\n*spoken across\nlines*');
  assert.equal(model.title, 'Public');
  assert.equal(model.slides[1].items[0].text, 'Before  after **bold**');
  assert.equal(model.slides[1].items[0].line, 7);
  assert.deepEqual(model.slides[1].body, ['AB']);
  assert.deepEqual(model.slides[1].notes, ['secret\ncontinued','spoken','whole\naside','explicit secret','spoken across\nlines']);
  assert.deepEqual(errors(model), []);
  assert.equal(parser.cleanInline(' X *private* **B** %%aside%% Y '), 'X  **B**  Y');
  assert.equal(parser.cleanInline('Two * signs'), 'Two * signs');
});

test('kind selectors and standalone modifiers preserve section context', () => {
  const model = parser.parse('# Cover\n@eyebrow Course\n## One @part\n## Facts\n- A\n@norev\n## Cards\n@cards\n- B\n## Two\n## Quotation @quote\nThe exact quotation.\n@attribution Author\n@citation Source\n@takeaway My conclusion\n@footer Footer\n@hue amber\n@eyebrow Override\n@polarity\n## Statement @big @flash\n## Framework @lens');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides.map(s => s.kind), ['cover','part','facts','cards','divider','quote','big','lens']);
  assert.equal(model.slides[0].eyebrow, 'Course');
  assert.deepEqual(model.slides.slice(1, 5).map(s => s.hue), ['olive','olive','olive','violet']);
  assert.equal(model.slides[2].eyebrow, 'One');
  assert.equal(model.slides[2].reveal, false);
  assert.equal(model.slides[3].reveal, false);
  const quote = model.slides[5];
  assert.equal(quote.title, 'Quotation');
  for (const [field,value] of Object.entries({attribution:'Author',citation:'Source',takeaway:'My conclusion',footer:'Footer',hue:'amber',eyebrow:'Override',polarity:true})) assert.equal(quote[field],value);
  assert.equal(model.slides[6].reveal, false);
  assert.equal(model.slides[6].eyebrow, 'Two');
  assert.equal(model.slides[7].hue, 'violet');
  assert.deepEqual(model.slides[7].meters, []);
});

test('raster assets use validated relative paths and explicit portrait metadata', () => {
  assert.equal(typeof parser.safeAssetPath, 'function');
  for (const path of ['images/a.jpg','images/My photo.PNG','写真.webp','x.gif','a.jpeg']) assert.equal(parser.safeAssetPath(path), true, path);
  for (const path of ['',null,4,'../x.png','a/../x.png','./x.jpg','/a.png','//evil/x.png','C:/a.jpg','C:\\a.jpg','https://x/a.png','data:image/png;base64,a','a.svg','a.png?x','a.png#x','a%2epng','a//b.jpg','a\\b.jpg','a\u0000.jpg','a\n.jpg','a/ x.png','a./x.png','a/<x>.png']) assert.equal(parser.safeAssetPath(path), false, String(path));
  const model = parser.parse('# T\n## Photo @photo "images/My photo.PNG"\n@alt Exact alt\n@credit Credit\n## S\n@somber images/a.jpg\n## Exhibit @img images/a.jpg\n## Person @scholar images/a.jpg\n## Pair @duo\n@portrait images/a.jpg | A | Source A | Alt A\n@portrait "images/My photo.PNG" | B | Source B | Alt B');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.assets, ['images/My photo.PNG','images/a.jpg']);
  assert.equal(model.slides[1].image, 'images/My photo.PNG');
  assert.equal(model.slides[1].alt, 'Exact alt');
  assert.equal(model.slides[1].credit, 'Credit');
  assert.deepEqual(model.slides[5].portraits, [{image:'images/a.jpg',name:'A',credit:'Source A',alt:'Alt A'},{image:'images/My photo.PNG',name:'B',credit:'Source B',alt:'Alt B'}]);
  const unsafe = parser.parse('# T\n## Bad @img ../x.png');
  assert.equal(unsafe.slides[1].image, '');
  assert.deepEqual(unsafe.assets, []);
  assert.ok(errors(unsafe).some(d => d.code === 'UNSAFE_ASSET' && d.line === 2));
});

test('two-col groups preserve recursive items and reject indent-only migration', () => {
  const model = parser.parse('# T\n## Compare @two-col\n@polarity\n### Closed\n- A\n  - Detail\n### Open\n- B');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides[1].columns, [{title:'Closed',items:[{text:'A',line:5,children:[{text:'Detail',line:6,children:[]}]}]},{title:'Open',items:[{text:'B',line:8,children:[]}]}]);
  assert.equal(model.slides[1].reveal, false);
  assert.equal(model.slides[1].polarity, true);
  const bad = parser.parse('# T\n## Ambiguous @two-col\n- Old left\n  - Old right');
  assert.ok(errors(bad).some(d => d.code === 'COLUMN_REQUIRED' && d.line === 3 && d.message.includes('###')));
  assert.ok(errors(bad).some(d => d.code === 'COLUMN_COUNT' && d.line === 2));
  for (const source of ['# T\n## X\n### Wrong','# T\n## X @two-col\n### A\n### B\n### C']) assert.ok(errors(parser.parse(source)).length);
});

test('explicit meters validate percentages without inventing axis positions', () => {
  const model = parser.parse('# T\n## Axis @lens\n@slider 78%\n@slider1 Immigration at 90%\n@slider2 Trade at 10.5%');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides[1].meters, [{label:'',value:78},{label:'Immigration',value:90},{label:'Trade',value:10.5}]);
  for (const value of ['-1%','101%','NaN%','78','78%%','78% trailing','1e2%','Infinity%','']) {
    const bad = parser.parse('# T\n## X @lens\n@slider ' + value);
    assert.deepEqual(bad.slides[1].meters, [], value);
    assert.ok(errors(bad).some(d => d.code === 'INVALID_METER' && d.line === 3), value);
  }
  assert.ok(errors(parser.parse('# T\n## X\n@slider1 80%')).some(d => d.code === 'INVALID_METER'));
  assert.ok(errors(parser.parse('# T\n## X\n@slider 0%\n@slider 100%')).some(d => d.code === 'DUPLICATE_DIRECTIVE'));
});

for (const [name, source, code, line] of [
  ['missing cover','## X\n- A','COVER_REQUIRED',1],
  ['empty input','','COVER_REQUIRED',1],
  ['leading content','Lead\n# T','COVER_FIRST',1],
  ['duplicate cover','# T\n# Again','MULTIPLE_COVER',2],
  ['cover body','# T\nVisible','COVER_CONTENT',2],
  ['cover bullets','# T\n- Visible','COVER_CONTENT',2],
  ['orphan child','# T\n## X\n  - Orphan','ORPHAN_BULLET',3],
  ['skipped nesting','# T\n## X\n- A\n    - Skip','ORPHAN_BULLET',4],
  ['odd indentation','# T\n## X\n - Odd','BULLET_INDENT',3],
  ['tab indentation','# T\n## X\n\t- Tab','BULLET_INDENT',3],
  ['unsupported list','# T\n## X\n1. List','UNSUPPORTED_NOTATION',3],
  ['heading depth','# T\n## X\n#### Bad','HEADING_MISUSE',3],
  ['empty heading','# T\n##','HEADING_MISUSE',2],
  ['unknown directive','# T\n## X\n@typo words','UNKNOWN_DIRECTIVE',3],
  ['conflicting kinds','# T\n## X @quote @cards','CONFLICTING_KIND',2],
  ['kind arguments','# T\n## X @cards stray','DIRECTIVE_ARGUMENT',2],
  ['modifier arguments','# T\n## X\n@norev stray','DIRECTIVE_ARGUMENT',3],
  ['invalid hue','# T\n## X\n@hue blue','INVALID_HUE',3],
  ['duplicate field','# T\n## X\n@footer A\n@footer B','DUPLICATE_DIRECTIVE',4],
  ['empty metadata','# T\n## X\n@credit','DIRECTIVE_ARGUMENT',3],
  ['image required','# T\n## X @img','IMAGE_REQUIRED',2],
  ['quote required','# T\n## X @quote','QUOTE_REQUIRED',2],
  ['pair required','# T\n## X @duo','PORTRAIT_COUNT',2],
  ['portrait misuse','# T\n## X\n@portrait a.jpg | A | C | Alt','PORTRAIT_KIND',3],
  ['column body','# T\n## X @two-col\n### A\nPlain\n### B','COLUMN_BODY',4],
  ['part content','# T\n## X @part\n- Hidden','KIND_CONTENT',3],
  ['body after bullets','# T\n## X\n- A\nAfter','CONTENT_ORDER',4]
]) test('diagnostic: ' + name, () => {
  let model;
  assert.doesNotThrow(() => { model = parser.parse(source); });
  assert.ok(errors(model).some(d => d.code === code && d.line === line), JSON.stringify(model.diagnostics));
  for (const d of model.diagnostics) { assert.equal(typeof d.message,'string'); assert.ok(d.message.length); assert.ok(Number.isInteger(d.line) && d.line > 0); }
});

test('unterminated private spans fail closed with source-line diagnostics', () => {
  for (const [span,code] of [['%%secret\nmore','UNTERMINATED_ASIDE'],['<!-- secret\nmore','UNTERMINATED_COMMENT'],['*secret\nmore','UNTERMINATED_ASIDE']]) {
    const model = parser.parse('# T\n## X\nVisible ' + span);
    assert.ok(errors(model).some(d => d.code === code && d.line === 3), JSON.stringify(model));
    assert.deepEqual(model.slides[1].body, ['Visible']);
    assert.ok(!JSON.stringify({...model.slides[1],notes:[]}).includes('secret'));
  }
  const model = parser.parse('# T\n## X\n- *private bullet*\n@notes Keep **markers** and %%literal%% here.\n%%private only%%\n- Visible');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides[1].items.map(i => i.text), ['Visible']);
  assert.deepEqual(model.slides[1].notes, ['private bullet','Keep **markers** and %%literal%% here.','private only']);
  assert.ok(errors(parser.parse('%%before cover%%\n# T')).some(d => d.code === 'COVER_FIRST' && d.line === 1));
});

test('heading directive tokenization respects quoted asset names and rejects missing titles', () => {
  const model = parser.parse('# Author’s T\n## Photo @photo "images/a @person.png" @norev\n## Another @img \'images/b @name.jpg\'');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.assets, ['images/a @person.png','images/b @name.jpg']);
  assert.equal(model.slides[1].title, 'Photo');
  for (const [source, code] of [['# T\n## @cards','HEADING_MISUSE'],['# T\n## X @Unknown','UNKNOWN_DIRECTIVE'],['# T\n## X @footer Words','DIRECTIVE_PLACEMENT'],['# T\n@footer Hidden','COVER_DIRECTIVE'],['# T\n## X\n- A\n@part','KIND_CONTENT'],['# T\n## X\n- A\n@two-col\n### L\n### R','COLUMN_REQUIRED']]) assert.ok(errors(parser.parse(source)).some(d => d.code === code), source);
});

test('public rules and density warnings preserve all author text in Node and browser', () => {
  assert.ok(Array.isArray(parser.rules) && parser.rules.length >= 6);
  assert.ok(Object.isFrozen(parser.rules));
  const title = 'A long author headline '.repeat(10).trim();
  const source = '# T\n## ' + title + '\n' + Array.from({length:15},(_,i) => '- Exact fact ' + i).join('\n');
  const model = parser.parse(source);
  assert.deepEqual(errors(model), []);
  assert.equal(model.slides[1].title,title);
  assert.equal(model.slides[1].items.length,15);
  for (const code of ['LONG_TITLE','DENSE_SLIDE']) assert.ok(model.diagnostics.some(d => d.severity === 'warning' && d.code === code && d.line === 2));
  const context = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/parser.js'),'utf8'),context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.ChartroomParser.parse(source))),model);
  assert.equal(context.ChartroomParser.safeAssetPath('images/x.png'),true);
});
