'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const Parser = require('../src/parser.js');
const Pkg = require('../src/package.js');
const Renderer = require('../src/renderer.js');
const fixture = path.join(__dirname, 'fixtures/legacy-archetypes.html');
// A complete one-pixel PNG, generated locally rather than borrowed from a lecture.
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwTpsJAAICATNWh+JUAAAAAElFTkSuQmCC', 'base64');
const palettes = ['classic', 'buster', 'agnar', 'atlantic', 'field-notes', 'aubergine', 'night-seminar'];
const expectedKinds = ['cover', 'facts', 'part', 'two-col', 'facts', 'quote', 'divider', 'big', 'somber', 'photo', 'img', 'scholar', 'cards', 'facts', 'facts'];
let tmp, deck;

test.before(() => {
  const parent = path.join(__dirname, 'tmp');
  fs.mkdirSync(parent, { recursive: true });
  tmp = fs.mkdtempSync(path.join(parent, 'public-converter-'));
  deck = path.join(tmp, 'legacy.html');
  // A missing fixture is an error, never a silently skipped test.
  fs.copyFileSync(fixture, deck);
  fs.mkdirSync(path.join(tmp, 'images'));
  fs.writeFileSync(path.join(tmp, 'images/pixel.png'), pixel);
});
test.after(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

function runConverter(id = 'synthetic', palette = 'classic', source = deck) {
  const out = path.join(tmp, `${id}.md`);
  const project = path.join(tmp, `${id}.chartroom.json`);
  const result = cp.spawnSync(process.env.PYTHON || 'python', [
    'scripts/convert-old-deck.py', source, '--out', out, '--project', project, '--palette', palette, '--id', id,
  ], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, String(result.error || '') + result.stdout + result.stderr);
  const notes = fs.readFileSync(out, 'utf8');
  return {
    notes,
    parsed: Parser.parse(notes),
    saved: Pkg.validateProject(JSON.parse(fs.readFileSync(project, 'utf8'))),
    report: JSON.parse(result.stdout),
  };
}

function visibleText(parsed) {
  const parts = [];
  const add = value => { if (value) parts.push(String(value)); };
  const walk = items => (items || []).forEach(item => { add(item.text); walk(item.children); });
  for (const slide of parsed.slides) {
    for (const key of ['title', 'eyebrow', 'footer', 'quote', 'alt', 'citation', 'takeaway', 'attribution']) add(slide[key]);
    add((slide.body || []).join(' '));
    walk(slide.items);
    (slide.columns || []).forEach(column => { add(column.title); walk(column.items); });
  }
  return parts.join(' · ');
}

test('public legacy fixture converts every section to parse-clean notes without losing words', () => {
  const { parsed, report, notes } = runConverter();
  const source = fs.readFileSync(fixture, 'utf8').split('<script')[0];
  const sections = source.match(/<section\b/g).length;
  assert.deepEqual(parsed.diagnostics.filter(d => d.severity === 'error'), []);
  assert.equal(report.slides, sections);
  assert.equal(parsed.slides.length, sections);
  assert.deepEqual(parsed.slides.map(s => s.kind), expectedKinds);
  const text = visibleText(parsed);
  for (const phrase of [
    'Harbor workshop', 'A public fixture', 'Observe & compare', 'Read the labels before comparing.',
    'First **exact** point.', 'Last point stays.', 'Keep the final sentence.', 'What changed?',
    'Part two', 'Two ideas', 'Left', 'Right', 'First point.', 'Second point.', 'Other point.',
    'Any questions?', 'No headings', 'Left item.', 'Right item.', 'Exact quotation words.', 'Synthetic source',
    'approach one', 'A different lens', 'A navy statement.', 'A quiet scene', 'A bright scene',
    'An exhibit', 'One synthetic pixel', 'Research spotlight', 'Synthetic portrait',
    'Example Author. A fictional study.', 'Keep the complete takeaway.', 'Possible routes',
    'Walk', 'Use the footpath.', 'Cycle', 'Use the cycleway.', 'Park beside the gate.',
    'A short timeline', 'Phase one', 'Draw a map.', 'Phase two', 'Test the route.', 'Record the result.',
    'Route comparison', 'North', 'South', 'Near', 'Far', 'Open gate', 'Quiet path',
    'Long bridge', 'Short bridge', 'Last cell preserved',
  ]) assert.ok(text.includes(phrase), `Preserves authored words: ${phrase}`);
  assert.ok(!notes.includes('DECORATIVE_DOT'), 'Design chrome is removed');
  assert.ok(!notes.includes('SCRIPT_ONLY_SENTINEL'), 'Script templates are not converted to slides');
});

test('converter preserves archetype fields, column boundaries, final items, and flattening notes', () => {
  const { parsed } = runConverter('archetypes');
  const slides = parsed.slides;
  assert.equal(slides[1].hue, 'rust');
  assert.deepEqual(slides[1].items.map(i => i.text), ['First **exact** point.', 'Last point stays.', 'Keep the final sentence.']);
  assert.equal(slides[1].footer, 'What changed?');
  const twoCol = slides[3];
  assert.equal(twoCol.hue, 'violet');
  assert.deepEqual(twoCol.columns.map(c => c.title), ['Left', 'Right']);
  assert.deepEqual(twoCol.columns[0].items.map(i => i.text), ['First point.', 'Second point.']);
  assert.deepEqual(twoCol.columns[1].items.map(i => i.text), ['Other point.']);
  assert.equal(twoCol.footer, 'Any questions?');
  assert.equal(slides[4].hue, 'olive');
  assert.deepEqual(slides[4].items.map(i => i.text), ['Left item.', 'Right item.']);
  assert.ok(slides[4].notes.some(note => note.includes('flattened')));
  assert.equal(slides[5].hue, 'amber');
  assert.equal(slides[5].body[0], 'Exact quotation words.');
  assert.equal(slides[5].attribution, 'Synthetic source');
  assert.equal(slides[6].eyebrow, 'approach one');
  for (const index of [8, 9, 10, 11]) assert.equal(slides[index].image, 'images/pixel.png');
  assert.equal(slides[10].title, '', 'Headingless exhibits stay headingless');
  assert.equal(slides[10].alt, 'One synthetic pixel');
  assert.equal(slides[11].citation, 'Example Author. A fictional study.');
  assert.equal(slides[11].takeaway, 'Keep the complete takeaway.');
  assert.deepEqual(slides[12].items.map(i => i.text), ['**Walk**', '**Cycle**']);
  assert.deepEqual(slides[12].items[1].children.map(i => i.text), ['Use the cycleway.', 'Park beside the gate.']);
  assert.deepEqual(slides[13].items.map(i => i.text), ['**Phase one**', '**Phase two**']);
  assert.deepEqual(slides[13].items[1].children.map(i => i.text), ['Test the route.', 'Record the result.']);
  const matrix = slides[14];
  assert.ok(matrix.notes.some(note => note.includes('nested facts')));
  assert.deepEqual(matrix.items.map(i => i.text), ['**North**', '**South**']);
  assert.deepEqual(matrix.items[0].children.map(i => i.text), ['Near', 'Far']);
  assert.deepEqual(matrix.items[0].children[0].children.map(i => i.text), ['Open gate', 'Quiet path']);
  assert.equal(matrix.items[1].children[1].children[0].text, 'Last cell preserved');
});

test('converted projects embed and deduplicate exact local image bytes for both exports', () => {
  const { saved, report } = runConverter('images');
  assert.equal(saved.course.title, 'Harbor workshop');
  assert.equal(saved.lectures[0].id, 'images');
  assert.deepEqual(report.assets, ['images/pixel.png']);
  assert.equal(report.images, 1);
  assert.equal(report.missingImages, undefined);
  assert.equal(saved.assets.length, 1, 'Repeated exhibit/background/portrait references share one asset');
  assert.equal(saved.assets[0].lectureId, 'images');
  assert.equal(saved.assets[0].path, 'images/pixel.png');
  assert.equal(saved.assets[0].mime, 'image/png');
  assert.deepEqual(Buffer.from(saved.assets[0].data, 'base64'), pixel);
  for (const target of ['student', 'teaching']) {
    const built = Pkg.build(saved, target);
    const image = built.files.find(f => f.path.endsWith('/images/pixel.png'));
    assert.ok(image, `${target} export contains the image`);
    assert.deepEqual(Buffer.from(image.data), pixel);
    assert.ok(built.files.filter(f => f.path.endsWith('index.html')).every(f => !f.data.includes('<script src=')));
    assert.equal(Buffer.from(Pkg.zip(built.files)).readUInt32LE(), 0x04034b50);
  }
});

test('all seven converter palettes retain identical words and apply to student and teaching exports', () => {
  let prior;
  for (const palette of palettes) {
    const { notes, parsed, saved } = runConverter(`palette-${palette}`, palette);
    assert.equal(saved.course.palette, palette);
    assert.deepEqual(parsed.diagnostics.filter(d => d.severity === 'error'), []);
    if (prior !== undefined) assert.equal(notes, prior, 'Palette selection must not edit authored notes');
    prior = notes;
    for (const target of ['student', 'teaching']) {
      const built = Pkg.build(saved, target);
      const htmlFiles = built.files.filter(f => f.path.endsWith('index.html'));
      assert.ok(htmlFiles.length > 0);
      // Classic inherits its tokens from the base stylesheet rather than a palette override.
      const navy = palette === 'classic' ? '#182030' : Renderer.palettes[palette].navy;
      assert.ok(htmlFiles.every(f => f.data.includes(navy)), `${palette} ${target} applies the navy token`);
    }
  }
});

test('missing local images are reported without inventing bytes or losing authored paths', () => {
  const source = path.join(tmp, 'missing-image.html');
  fs.writeFileSync(source, '<!doctype html><title>Missing image fixture</title><section class="s cover"><h1>Missing image</h1></section><section class="s imgfit"><img src="images/absent.png" alt="An unavailable figure"></section>');
  const { parsed, saved, report } = runConverter('missing-image', 'classic', source);
  assert.deepEqual(report.missingImages, ['images/absent.png']);
  assert.equal(report.images, 0);
  assert.deepEqual(saved.assets, []);
  assert.equal(parsed.slides[1].image, 'images/absent.png');
  assert.equal(parsed.slides[1].alt, 'An unavailable figure');
  assert.throws(() => Pkg.build(saved, 'student'), /image|asset|missing/i);
});
