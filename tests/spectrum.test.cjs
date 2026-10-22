'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Parser = require('../src/parser.js');
const Renderer = require('../src/renderer.js');
const Insert = require('../src/insert.js');
const Package = require('../src/package.js');
const errors = model => model.diagnostics.filter(d => d.severity === 'error');
const apply = (source, edit) => source.slice(0, edit.start) + edit.text + source.slice(edit.end);

test('spectrum is nullable per-slide metadata with trimmed, verbatim endpoints', () => {
  const model = Parser.parse('# Lecture\n## Axis @lens\n@spectrum   Collective responsibility  |  Individual autonomy  \n@slider 25%\n## Next\n- Unchanged');
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides.map(s => s.spectrum), [null, {left:'Collective responsibility',right:'Individual autonomy'}, null]);
  assert.deepEqual(model.slides[1].meters, [{label:'',value:25}]);
});

test('duplicate spectrum directives retain the first endpoints and report the second line', () => {
  const model = Parser.parse('# Lecture\n## Axis @lens\n@spectrum First | Second\n@spectrum Other | More');
  assert.ok(errors(model).some(d => d.code === 'DUPLICATE_DIRECTIVE' && d.line === 4));
  assert.deepEqual(model.slides[1].spectrum, {left:'First',right:'Second'});
});

test('spectrum requires a standalone directive on a non-cover slide', () => {
  for (const [source, index, code, line] of [
    ['# Lecture\n@spectrum Left | Right', 0, 'COVER_DIRECTIVE', 2],
    ['# Lecture\n## Axis @lens @spectrum Left | Right', 1, 'DIRECTIVE_PLACEMENT', 2]
  ]) {
    const model = Parser.parse(source);
    assert.ok(errors(model).some(d => d.code === code && d.line === line));
    assert.equal(model.slides[index].spectrum, null);
  }
});

test('custom endpoints render safely on the lens and every meter in both modes', () => {
  const model = Parser.parse('# Lecture\n## Axis @lens\n@spectrum **Less** & <script> | More "choice"\n@slider 25%\n@slider1 First dimension at 0%\n@slider2 Second dimension at 100%');
  assert.deepEqual(errors(model), []);
  const labels = '<div class="axis-labels"><span><strong>Less</strong> &amp; &lt;script&gt;</span><span>More &quot;choice&quot;</span></div>';
  for (const mode of ['teaching','review']) {
    const html = Renderer.renderDeck(model, {mode});
    assert.equal(html.split(labels).length - 1, 4);
    assert.ok(html.includes('aria-label="**Less** &amp; &lt;script&gt; to More &quot;choice&quot;"'));
    assert.ok(html.includes('aria-label="First dimension"'));
    assert.ok(html.includes('aria-valuenow="25"'));
    assert.ok(html.includes('aria-valuenow="0"'));
    assert.ok(html.includes('aria-valuenow="100"'));
    assert.ok(!html.includes('<span>Closed</span>'));
  }
});

test('spectrum label insertion offers editable endpoints and preserves neighboring slides', () => {
  const item = Insert.catalog.find(x => x.id === 'spectrum');
  assert.ok(item, 'spectrum menu element exists');
  assert.equal(item.group, 'Spectrum');
  assert.equal(item.label, 'Spectrum labels');
  assert.equal(item.text, '@spectrum Left endpoint | Right endpoint');
  assert.ok(item.help.includes('Closed') && item.help.includes('Open'));
  const source = '# Lecture\n## First @lens\n@slider 25%\n\n## Next\n- Keep me.\n';
  const at = source.indexOf('@slider');
  const edit = Insert.plan(source, at, at, 'spectrum');
  assert.equal(edit.error, undefined);
  const result = apply(source, edit);
  assert.equal(result, source.replace('@slider 25%\n', '@slider 25%\n@spectrum Left endpoint | Right endpoint\n'));
  assert.equal(result.slice(edit.selectionStart, edit.selectionEnd), 'Left endpoint');
  assert.deepEqual(errors(Parser.parse(result)), []);
  assert.equal(Parser.parse(result).slides[2].spectrum, null);
  for (const id of ['slider','sliders']) {
    const meter = Insert.catalog.find(x => x.id === id);
    assert.equal(meter.group, 'Spectrum');
    assert.doesNotMatch(meter.help, /closed-to-open/i);
  }
  assert.equal(Insert.catalog.find(x => x.id === 'polarity').label, 'Spectrum column colors');
});

test('long spectrum endpoints wrap within the lens and side-by-side meters in a real browser', async () => {
  const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
  const browser = await chromium.launch({executablePath:process.env.BROWSER_PATH || chromium.executablePath(),headless:true});
  const left = 'Shared responsibility across generations '.repeat(4).trim();
  const right = 'IndividualAutonomy'.repeat(14);
  const source = '# Lecture\n## Spectrum @lens\n@spectrum '+left+' | '+right+'\n## Meters\n@spectrum '+left+' | '+right+'\n@slider1 First at 25%\n@slider2 Second at 75%';
  try {
    const page = await browser.newPage({viewport:{width:1600,height:900}});
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.setContent(Renderer.renderDeck(Parser.parse(source), {mode:'review'}));
    for (const width of [1600,390]) {
      await page.setViewportSize({width,height:900});
      for (const index of [1,2]) {
        const result = await page.evaluate(index => {
          ChartroomPlayer.go(index);
          const audit = ChartroomPlayer.audit();
          const slide = document.querySelector('.slide:not([hidden])');
          const labels = Array.from(slide.querySelectorAll('.axis-labels')).map(axis => {
            const [left,right] = axis.children;
            const a = axis.getBoundingClientRect(), l = left.getBoundingClientRect(), r = right.getBoundingClientRect();
            return {text:[left.textContent,right.textContent],wraps:axis.scrollWidth <= axis.clientWidth+1,
              contained:l.left >= a.left-1 && r.right <= a.right+1, separated:l.right <= r.left+1};
          });
          return {labels,overflow:audit[index].overflow};
        }, index);
        assert.equal(result.labels.length, index === 1 ? 1 : 2);
        for (const labels of result.labels) {
          assert.deepEqual(labels.text, [left,right]);
          assert.ok(labels.wraps && labels.contained && labels.separated, 'endpoint columns fit without overlapping: '+JSON.stringify(labels));
        }
        assert.equal(result.overflow, false, 'long labels fit without truncation');
      }
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
});

test('defaults remain Closed/Open for legacy models and do not inherit custom endpoints', () => {
  const model = Parser.parse('# Lecture\n## Custom @lens\n@spectrum Left | Right\n## Default @lens\n@slider 50%');
  assert.equal(model.slides[2].spectrum, null);
  for (const legacy of [false,true]) {
    if (legacy) delete model.slides[2].spectrum;
    const html = Renderer.renderDeck(model);
    assert.equal(html.split('<span>Closed</span><span>Open</span>').length-1, 2);
    assert.ok(html.includes('aria-label="Closed to open"'));
  }
});

test('spectrum uses the shared private scanner before parsing endpoints or directives', () => {
  const source = '# Lecture\n## Axis @lens\n@spectrum Left*SECRET_STAR* | Right%%SECRET_PERCENT\ncontinued%%<!--SECRET_COMMENT-->\n@notes SECRET_NOTE @spectrum Fake | Fake\n%%SECRET_BLOCK\n@spectrum SECRET_HIDDEN | SECRET_HIDDEN\n%%\n@slider 50%';
  const model = Parser.parse(source);
  assert.deepEqual(errors(model), []);
  assert.deepEqual(model.slides[1].spectrum, {left:'Left',right:'Right'});
  const publicModel = JSON.stringify({...model,slides:model.slides.map(s => ({...s,notes:[]}))});
  assert.doesNotMatch(publicModel, /SECRET_/);
  for (const mode of ['teaching','review']) assert.doesNotMatch(Renderer.renderDeck(model,{mode}), /SECRET_/);
  for (const marker of ['*','%%','<!--']) {
    const close = marker === '<!--' ? '-->' : marker;
    const malformed = Parser.parse('# Lecture\n## Axis @lens\n@spectrum '+marker+'SECRET_EMPTY'+close+' | Right');
    assert.equal(malformed.slides[1].spectrum, null);
    assert.ok(errors(malformed).some(d => d.code === 'INVALID_SPECTRUM'));
    const unclosed = Parser.parse('# Lecture\n## Axis @lens\n@spectrum Left | '+marker+'SECRET_UNCLOSED');
    assert.equal(unclosed.slides[1].spectrum, null);
    assert.ok(errors(unclosed).some(d => d.code.startsWith('UNTERMINATED_')));
    for (const item of [malformed,unclosed]) {
      assert.doesNotMatch(JSON.stringify({...item,slides:item.slides.map(s => ({...s,notes:[]}))}), /SECRET_/);
    }
  }
});

const projectWith = notes => ({format:'chartroom-studio',version:1,course:{title:'Spectrum course',code:'SC'},
  lectures:[{id:'spectrum',title:'Spectrum lecture',notes,available:true}],assets:[]});

test('package compile and both public builds preserve spectrum labels without private source', () => {
  const source = '# Lecture\n## Axis @lens\n@spectrum Public & shared *SECRET_EXPORT* | Individual choice\n@slider 37.5%\n@notes SECRET_NOTE';
  const project = projectWith(source);
  const compiled = Package.compile(project);
  assert.deepEqual(compiled.diagnostics, []);
  assert.deepEqual(compiled.lectures[0].model.slides[1].spectrum, {left:'Public & shared',right:'Individual choice'});
  for (const target of ['teaching','student']) {
    const built = Package.build(project,target);
    assert.deepEqual(built.diagnostics, []);
    const file = built.files.find(f => f.path.endsWith('index.html'));
    assert.ok(file);
    assert.ok(file.data.includes(target === 'teaching' ? 'Public &amp; shared' : 'Public &amp;amp; shared'));
    assert.ok(file.data.includes('Individual choice'));
    assert.ok(file.data.includes('37.5'));
    for (const {data} of built.files) assert.doesNotMatch(String(data), /SECRET_|@spectrum|@notes/);
    const bytes = Package.zip(built.files);
    assert.ok(bytes instanceof Uint8Array && bytes.length > 0);
    assert.doesNotMatch(new TextDecoder().decode(bytes), /SECRET_/);
  }
  assert.equal(project.lectures[0].notes, source, 'public build never rewrites the private project');
});

test('package exports reject malformed, duplicate and misplaced spectrum directives', () => {
  for (const source of [
    '# Lecture\n@spectrum Left | Right',
    '# Lecture\n## Axis @lens @spectrum Left | Right',
    '# Lecture\n## Axis\n@spectrum Left |',
    '# Lecture\n## Axis\n@spectrum Left | Right\n@spectrum Other | More'
  ]) for (const target of ['student','teaching']) assert.throws(() => Package.build(projectWith(source),target));
});

test('spectrum insertion rejects duplicates, cover, selections and private locations', () => {
  for (const [source,pattern] of [
    ['# Lecture\n', /cover/i],
    ['# Lecture\n## Axis @lens\n@spectrum Left | Right\n', /once|already/i]
  ]) assert.match(Insert.plan(source,source.length,source.length,'spectrum').error,pattern);
  const source = '# Lecture\n## Axis @lens\n';
  assert.match(Insert.plan(source,source.indexOf('Axis'),source.length,'spectrum').error,/selection/i);
  for (const marker of ['*','%%','<!--']) {
    const close = marker === '<!--' ? '-->' : marker;
    const privateSource = source+marker+'SECRET_FIRST\nSECRET_SECOND\n'+close+'\n';
    const at = privateSource.indexOf('SECRET_FIRST');
    assert.match(Insert.plan(privateSource,at,at,'spectrum').error,/private|comment/i);
  }
});

test('spectrum metadata is accepted on non-lens slides and labels all their meters', () => {
  const model = Parser.parse('# Lecture\n## Facts\n@spectrum Lower | Higher\n- Point\n@slider 50%\n@slider1 Other at 75%');
  assert.deepEqual(errors(model), []);
  assert.equal(model.slides[1].kind, 'facts');
  const html = Renderer.renderDeck(model);
  assert.equal(html.split('<span>Lower</span><span>Higher</span>').length-1, 2);
});

test('spectrum parser and insertion work in classic browser scripts without Node globals', () => {
  const vm = require('node:vm'), fs = require('node:fs');
  const context = {};
  for (const name of ['parser','renderer','insert']) vm.runInNewContext(fs.readFileSync(require.resolve('../src/'+name+'.js'),'utf8'),context);
  const source = '# Lecture\n## Axis @lens\n@spectrum Low | High\n@slider 50%';
  assert.deepEqual(JSON.parse(JSON.stringify(context.ChartroomParser.parse(source))),Parser.parse(source));
  assert.ok(context.ChartroomRenderer.renderDeck(context.ChartroomParser.parse(source)).includes('<span>Low</span><span>High</span>'));
  assert.ok(context.ChartroomInsert.catalog.some(item => item.id === 'spectrum'));
});

test('malformed spectrum endpoints diagnose the directive line without assigning partial labels', () => {
  for (const argument of ['', 'Left', 'Left |', '| Right', ' | ', 'Left | Right | Extra']) {
    const model = Parser.parse('# Lecture\n## Axis @lens\n@spectrum ' + argument);
    assert.ok(errors(model).some(d => d.code === 'INVALID_SPECTRUM' && d.line === 3), argument);
    assert.equal(model.slides[1].spectrum, null);
  }
});
