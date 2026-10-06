'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Parser = require('../src/parser.js');
const modulePath = path.join(__dirname, '../src/insert.js');
const Insert = fs.existsSync(modulePath) ? require(modulePath) : {};
const apply = (source, edit) => source.slice(0, edit.start) + edit.text + source.slice(edit.end);

test('catalog exposes existing elements with readable help and parser-valid snippets', () => {
  const ids = ['point','detail','body','bold','notes','comment','eyebrow','footer','attribution','citation','takeaway','slider','sliders','alt','credit','norev','polarity','hue-olive','hue-violet','hue-rust','hue-amber'];
  for (const id of ids) {
    const item = Insert.catalog.find(x => x.id === id);
    assert.ok(item, id + ' is discoverable');
    assert.ok(item.group && item.label && item.help && item.text, id + ' has help and syntax');
    const source = id === 'polarity' ? '# Lecture\n## Compare @two-col\n### Left\n- A\n### Right\n- B\n' :
      id === 'alt' ? '# Lecture\n## Figure @img images/figure.png\n' :
      id === 'body' ? '# Lecture\n## Topic\n' : '# Lecture\n## Topic\n- A point.\n';
    const at = id === 'bold' ? source.indexOf('point') : source.length;
    const edit = Insert.plan(source, at, at, id);
    assert.equal(edit.error, undefined, id);
    const model = Parser.parse(apply(source, edit));
    assert.deepEqual(model.diagnostics.filter(d => d.severity === 'error'), [], id);
    assert.equal(model.slides.length, 2, id + ' does not create a slide');
  }
});

test('footer insertion preserves the current line, following slides and selects editable words', () => {
  assert.equal(typeof Insert.plan, 'function', 'element insertion API exists');
  const source = '# Lecture\n\n## First slide\n- Exact words.\n\n## Next slide\n- Keep me.\n';
  const at = source.indexOf('Exact') + 2;
  const edit = Insert.plan(source, at, at, 'footer');
  assert.equal(edit.error, undefined);
  const result = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  assert.equal(result, source.replace('- Exact words.\n', '- Exact words.\n@footer Your closing question?\n'));
  assert.equal(result.slice(edit.selectionStart, edit.selectionEnd), 'Your closing question?');
  const model = Parser.parse(result);
  assert.equal(model.slides.length, 3);
  assert.equal(model.slides[1].footer, 'Your closing question?');
  assert.deepEqual(model.diagnostics.filter(d => d.severity === 'error'), []);
});

test('unsafe or incompatible insertion returns guidance instead of altering notes', () => {
  const cases = [
    ['# Lecture\n', 'footer', /cover/i],
    ['', 'point', /slide|cover/i],
    ['# Lecture\n## Topic\n@footer Existing question?\n', 'footer', /already|once/i],
    ['# Lecture\n## Topic\n@hue rust\n', 'hue-olive', /already|once/i],
    ['# Lecture\n## Topic\n- Point\n', 'body', /before|after bullets/i],
    ['# Lecture\n## Topic\n', 'detail', /parent/i],
    ['# Lecture\n## Topic\n- Point\n', 'polarity', /two.column/i],
    ['# Lecture\n## Topic\n- Point\n', 'alt', /image|photo/i],
    ['# Lecture\n## Topic @cards\n- Point\n', 'norev', /facts/i],
    ['# Lecture\n## Topic\n@slider 25%\n', 'sliders', /meter/i],
    ['# Lecture\n## Topic\n@slider1 Trade at 25%\n@slider2 People at 75%\n', 'slider', /meter/i],
    ['# Lecture\n## Topic @norev\n- Point\n', 'norev', /already/i]
  ];
  for (const [source, id, message] of cases) {
    const edit = Insert.plan(source, source.length, source.length, id);
    assert.match(edit.error || '', message, id + ' at ' + source);
  }
});

test('bold wraps selected words without deleting surrounding text and rejects structural selections', () => {
  const source = '# Lecture\n## Topic\n- Exact words.\n';
  const at = source.indexOf('Exact');
  const edit = Insert.plan(source, at, at+5, 'bold');
  assert.equal(edit.error, undefined);
  assert.equal(apply(source, edit), source.replace('Exact', '**Exact**'));
  assert.equal(apply(source, edit).slice(edit.selectionStart, edit.selectionEnd), 'Exact');
  assert.match(Insert.plan(source, 0, source.length, 'bold').error || '', /select|line/i);
  assert.match(Insert.plan(source, source.length, source.length, 'bold').error || '', /heading|paragraph|bullet/i);
  assert.match(Insert.plan(source, at, source.length, 'footer').error || '', /selection|cursor/i);
});

test('insertion refuses a location inside private multiline text or comments', () => {
  for (const marker of ['%%', '*', '<!--']) {
    const close = marker === '<!--' ? '-->' : marker;
    const source = '# Lecture\n## Topic\n'+marker+'Private first line\nprivate second line\n'+close+'\n- Point\n';
    const at = source.indexOf('Private');
    assert.match(Insert.plan(source, at, at, 'footer').error || '', /private|comment/i);
  }
});

test('bold refuses to stack markers inside text that is already bold', () => {
  for (const source of ['# Lecture\n## Topic\n- **Exact words**\n', '# Lecture\n## Topic\n- **Exact** words\n']) {
    const at = source.indexOf('Exact');
    assert.match(Insert.plan(source, at, at+5, 'bold').error || '', /already bold/i);
    assert.match(Insert.plan(source, at+2, at+2, 'bold').error || '', /already bold/i);
  }
});

test('a safe insertion can coexist with a pre-existing error in another slide', () => {
  const source = '# Lecture\n## Topic\n- Point\n\n## Broken @unknown\n';
  const at = source.indexOf('- Point');
  const edit = Insert.plan(source, at, at, 'footer');
  assert.equal(edit.error, undefined);
  assert.ok(apply(source, edit).includes('@footer Your closing question?'));
});
