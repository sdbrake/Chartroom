/* Chartroom Studio annotated notes. No DOM, network, or dependencies. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartroomParser = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function newSlide(title, line, kind) {
    return {kind:kind || 'divider', title, line, eyebrow:'', hue:'olive', reveal:false,
      items:[], body:[], columns:[], footer:'', notes:[], image:'', alt:'', credit:'',
      attribution:'', meters:[], portraits:[], citation:'', takeaway:'', polarity:false};
  }

  const rules = Object.freeze([
    'Preserve author wording and order; never invent titles, facts, quotations, percentages or sources.',
    'Exactly one # Title cover comes first; ## starts slides; ### names only two explicit columns.',
    'Only explicit *asides*, %%asides%% and @notes are private; comments are omitted.',
    'Choose one slide kind. Facts reveal parent bullets with their children; @norev and @flash show all.',
    'Named @part and empty dividers advance section accents olive, violet, rust, amber.',
    'Only user-supplied, safe relative raster assets are allowed; no remote or inferred images.',
    'Errors block export. Long-title and density warnings never authorize trimming or rewriting.',
    'Shared HTML contains no source model or private notes. Project JSON is the private editable backup.',
    'Export and sharing are explicit; there is no automatic publishing or synchronization.'
  ]);

  // Keep source line numbers while joining text around multiline private spans.
  function scan(text, report) {
    const records = [];
    let raw = '', notes = [], line = 1, start = 1, position = 0;
    function visible(chunk) {
      for (const char of chunk) {
        if (char === '\n') {
          records.push({raw, notes, line:start});
          raw = ''; notes = []; start = ++line;
        } else raw += char;
      }
    }
    while (position < text.length) {
      // Explicit notes are already private: do not reinterpret their markers.
      if ((position === 0 || text[position - 1] === '\n') && /^\s*@notes(?:[ \t]|$)/.test(text.slice(position).split('\n', 1)[0])) {
        const end = text.indexOf('\n', position);
        const stop = end < 0 ? text.length : end;
        visible(text.slice(position, stop)); position = stop; continue;
      }
      let open = '', close = '';
      if (text.startsWith('<!--', position)) { open = '<!--'; close = '-->'; }
      else if (text.startsWith('%%', position)) { open = close = '%%'; }
      else if (text.startsWith('**', position)) { visible('**'); position += 2; continue; }
      else if (text[position] === '*') { open = close = '*'; }
      if (!open) { visible(text[position++]); continue; }
      let end = text.indexOf(close, position + open.length);
      if (open === '*') {
        while (end >= 0 && (text[end - 1] === '*' || text[end + 1] === '*')) end = text.indexOf('*', end + 1);
      }
      if (end < 0 && !report) { visible(text.slice(position)); break; }
      if (end < 0) report(open === '<!--' ? 'UNTERMINATED_COMMENT' : 'UNTERMINATED_ASIDE', line, 'Unclosed ' + open + ' annotation; close it before exporting.');
      const stop = end < 0 ? text.length : end + close.length;
      if (open !== '<!--') notes.push(text.slice(position + open.length, end < 0 ? text.length : end));
      line += (text.slice(position, stop).match(/\n/g) || []).length;
      if (!raw && !notes.length) start = line;
      position = stop;
    }
    records.push({raw, notes, line:start});
    return records;
  }

  function cleanInline(text) {
    return scan(String(text)).map(record => record.raw).join('\n').trim();
  }

  function safeAssetPath(path) {
    if (typeof path !== 'string' || !/\.(jpe?g|png|gif|webp)$/i.test(path)) return false;
    if (/[\u0000-\u001f\u007f-\u009f\\:%?#<>"'|*]/.test(path)) return false;
    return path.split('/').every(part => part && part !== '.' && part !== '..' && part.trim() === part && !part.endsWith('.'));
  }

  function headingParts(text) {
    const parts = [];
    let start = 0, quote = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (quote) { if (char === quote) quote = ''; continue; }
      if ((char === '"' || char === "'") && (i === 0 || /\s/.test(text[i - 1]))) { quote = char; continue; }
      if (char === '@' && (i === 0 || /\s/.test(text[i - 1]))) {
        parts.push(text.slice(start, i).trim()); start = i;
      }
    }
    parts.push(text.slice(start).trim());
    return parts;
  }

  function parse(text) {
    const model = {version:1,title:'',slides:[],assets:[],diagnostics:[]};
    let slide = null;
    let stack = [];
    let column = null;
    let coverCount = 0, firstContent = true;
    const state = new Map();
    const kinds = ['cards','two-col','quote','big','photo','somber','img','lens','duo','scholar','part'];
    const fields = ['eyebrow','hue','footer','alt','credit','attribution','citation','takeaway'];
    function diagnostic(code, line, message, severity) {
      model.diagnostics.push({severity:severity || 'error',code,line,message});
    }
    function asset(argument, line) {
      const quoted = /^(?:"([^"]+)"|'([^']+)'|([^\s"']+))$/.exec(argument);
      const path = quoted ? quoted[1] || quoted[2] || quoted[3] : '';
      if (!safeAssetPath(path)) { diagnostic('UNSAFE_ASSET', line, 'Use a safe relative raster path; quote paths containing spaces.'); return ''; }
      if (!model.assets.includes(path)) model.assets.push(path);
      return path;
    }
    function directive(value, line, inHeading) {
      const match = /^@([a-z][a-z0-9-]*)(?:\s+([\s\S]*))?$/.exec(value);
      if (!match) { diagnostic('UNKNOWN_DIRECTIVE', line, 'Malformed or unknown directive: ' + value); return; }
      const name = match[1], argument = (match[2] || '').trim();
      const meta = state.get(slide);
      if (inHeading && !kinds.includes(name) && !['norev','flash'].includes(name)) diagnostic('DIRECTIVE_PLACEMENT', line, 'Place @' + name + ' on a separate line.');
      if (slide.kind === 'cover' && !['eyebrow','notes'].includes(name)) diagnostic('COVER_DIRECTIVE', line, 'Cover accepts only @eyebrow and speaker notes.');
      if (kinds.includes(name)) {
        if (meta.kind) { diagnostic('CONFLICTING_KIND', line, 'Choose one kind per slide; ' + meta.kind + ' is already selected.'); return; }
        if (!['photo','somber','img','scholar'].includes(name) && argument) diagnostic('DIRECTIVE_ARGUMENT', line, '@' + name + ' takes no arguments.');
        slide.kind = name; meta.kind = name;
        if (name === 'part' && (slide.items.length || slide.body.length)) diagnostic('KIND_CONTENT', line, '@part must not hide existing content; move it to another slide.');
        if (name === 'two-col' && slide.items.length) diagnostic('COLUMN_REQUIRED', line, 'Move bullets under exactly two ### column headings.');
        if (['photo','somber','img','scholar'].includes(name) && argument) slide.image = asset(argument, line);
      }
      else if (['norev','flash','polarity'].includes(name)) {
        if (argument) diagnostic('DIRECTIVE_ARGUMENT', line, '@' + name + ' takes no arguments.');
        if (name === 'polarity') slide.polarity = true;
        else meta.norev = true;
      }
      else if (fields.includes(name)) {
        if (!argument) diagnostic('DIRECTIVE_ARGUMENT', line, '@' + name + ' requires text.');
        else if (meta[name]) diagnostic('DUPLICATE_DIRECTIVE', line, '@' + name + ' may appear once per slide.');
        else if (name === 'hue' && !['olive','violet','rust','amber'].includes(argument)) diagnostic('INVALID_HUE', line, 'Hue must be olive, violet, rust, or amber.');
        else { slide[name] = argument; meta[name] = true; }
      }
      else if (name === 'notes') slide.notes.push(argument);
      else if (['slider','slider1','slider2'].includes(name)) {
        const meter = (name === 'slider' ? /^(\d+(?:\.\d+)?)%$/ : /^(.+?) at (\d+(?:\.\d+)?)%$/).exec(argument);
        const value = meter ? Number(meter[name === 'slider' ? 1 : 2]) : NaN;
        if (!Number.isFinite(value) || value < 0 || value > 100) diagnostic('INVALID_METER', line, 'Use @slider 78% or @slider1 Label at 78%; values must be 0..100.');
        else if (meta[name]) diagnostic('DUPLICATE_DIRECTIVE', line, '@' + name + ' may appear once per slide.');
        else { meta[name] = true; slide.meters.push({label:name === 'slider' ? '' : meter[1],value}); }
      }
      else if (name === 'portrait') {
        if (slide.kind !== 'duo') diagnostic('PORTRAIT_KIND', line, '@portrait belongs to a @duo slide.');
        const pieces = argument.split('|').map(piece => piece.trim());
        if (pieces.length !== 4) diagnostic('PORTRAIT_FORMAT', line, 'Use @portrait path | name | credit | alt.');
        else slide.portraits.push({image:asset(pieces[0], line),name:pieces[1],credit:pieces[2],alt:pieces[3]});
      }
      else diagnostic('UNKNOWN_DIRECTIVE', line, 'Unknown directive @' + name + '.');
    }
    scan(String(text).replace(/\r\n?/g, '\n'), diagnostic).forEach(({raw, notes, line}) => {
      const value = raw.trim();
      if (notes.length && !slide && !/^#\s/.test(value)) diagnostic('COVER_FIRST', line, 'Private notes must follow the # Title cover.');
      if (!value || (value === '-' && notes.length)) {
        if (slide) for (const note of notes) slide.notes.push(note);
        // A private bullet is still a structural boundary. Its visible children
        // must not migrate beneath the previous, unrelated visible point.
        if (value === '-' && notes.length) stack.length = Math.min(stack.length, Math.floor(raw.match(/^[ \t]*/)[0].length / 2));
        return;
      }
      if (firstContent) {
        if (!/^#\s+\S/.test(value)) diagnostic('COVER_FIRST', line, 'The first content must be # Title.');
        firstContent = false;
      }
      const heading = /^(#{1,2})\s+(.+)$/.exec(value);
      if (heading) {
        if (heading[1] === '#') {
          coverCount++;
          if (coverCount > 1) diagnostic('MULTIPLE_COVER', line, 'Exactly one # cover is allowed; use ## for slides.');
        }
        const parts = headingParts(heading[2]);
        slide = newSlide(parts.shift(), line, heading[1] === '#' ? 'cover' : 'divider');
        state.set(slide, {kind:slide.kind === 'cover' ? 'cover' : '', norev:false});
        parts.forEach(part => directive(part, line, true));
        if (!slide.title && !['quote','img','photo','somber','duo','scholar'].includes(slide.kind)) diagnostic('HEADING_MISUSE', line, 'This slide kind requires a visible heading; image and quotation headings may be omitted.');
        if (slide.kind === 'cover' && coverCount === 1) model.title = slide.title;
        for (const note of notes) slide.notes.push(note);
        model.slides.push(slide);
        stack = [];
        column = null;
        return;
      }
      if (!slide) { diagnostic('CONTENT_BEFORE_COVER', line, 'Content has no slide; start with # Title.'); return; }
      for (const note of notes) slide.notes.push(note);
      const columnHeading = /^###\s+(.+)$/.exec(value);
      if (columnHeading) {
        if (slide.kind !== 'two-col') diagnostic('HEADING_MISUSE', line, '### names columns only within @two-col.');
        else { column = {title:columnHeading[1],items:[]}; slide.columns.push(column); }
        stack = [];
        return;
      }
      if (value.startsWith('#')) diagnostic('HEADING_MISUSE', line, 'Use # Title, ## Slide, or ### Column within @two-col.');
      if (value.startsWith('@')) { directive(value, line); return; }
      if (slide.kind === 'cover') diagnostic('COVER_CONTENT', line, 'Cover permits only its title, eyebrow and speaker notes, not body or bullets.');
      if (slide.kind === 'part') diagnostic('KIND_CONTENT', line, '@part is a title-only divider; move content to the next ## slide.');
      const bullet = /^([ \t]*)-\s+(.*)$/.exec(raw);
      if (bullet) {
        let depth = bullet[1].length / 2;
        if (bullet[1].includes('\t') || !Number.isInteger(depth)) {
          diagnostic('BULLET_INDENT', line, 'Use exactly two spaces per nested bullet level, never tabs.');
          depth = 0;
        }
        if (depth && !stack[depth - 1]) { diagnostic('ORPHAN_BULLET', line, 'Nested bullets require a parent at the previous level.'); depth = 0; }
        const item = {text:bullet[2].trim(),line,children:[]};
        if (slide.kind === 'two-col' && !column) diagnostic('COLUMN_REQUIRED', line, 'Migrate indent-only columns to exactly two ### column headings.');
        if (depth && stack[depth - 1]) stack[depth - 1].children.push(item);
        else (column ? column.items : slide.items).push(item);
        stack[depth] = item;
        stack.length = depth + 1;
      } else {
        if (/^(?:\d+[.)]\s|[+*]\s|>|```|~~~|\||-\s*$)/.test(value)) diagnostic('UNSUPPORTED_NOTATION', line, 'Unsupported Markdown notation; use plain text or - bullets.');
        if (slide.kind === 'two-col') diagnostic('COLUMN_BODY', line, 'Column content must use - bullets under ### headings.');
        if (slide.items.length || (column && column.items.length)) diagnostic('CONTENT_ORDER', line, 'Body after bullets cannot preserve order in this model; start a new slide or use another bullet.');
        slide.body.push(value); stack = [];
      }
    });
    if (!coverCount) diagnostic('COVER_REQUIRED', 1, 'Exactly one # Title cover is required.');
    let section = '', hueIndex = -1;
    const hues = ['olive','violet','rust','amber'];
    for (const current of model.slides) {
      const meta = state.get(current);
      if (current.kind === 'two-col' && current.columns.length !== 2) diagnostic('COLUMN_COUNT', current.line, '@two-col requires exactly two ### column headings.');
      if (['photo','somber','img','scholar'].includes(current.kind) && !current.image) diagnostic('IMAGE_REQUIRED', current.line, '@' + current.kind + ' requires a safe local raster image path.');
      if (current.kind === 'quote' && !current.body.length) diagnostic('QUOTE_REQUIRED', current.line, '@quote requires visible body text; no quotation is invented.');
      if (current.kind === 'duo' && current.portraits.length !== 2) diagnostic('PORTRAIT_COUNT', current.line, '@duo requires exactly two @portrait directives.');
      if (!meta.kind) current.kind = current.items.length || current.body.length ? 'facts' : 'divider';
      if (current.kind === 'part' || current.kind === 'divider') {
        section = current.title;
        hueIndex = (hueIndex + 1) % hues.length;
      }
      if (!meta.hue) current.hue = hues[Math.max(0, hueIndex)];
      if (!meta.eyebrow && current.kind !== 'cover') current.eyebrow = section;
      current.reveal = current.kind === 'facts' && !meta.norev;
      if (current.title.length > 100) diagnostic('LONG_TITLE', current.line, 'Title exceeds 100 characters. Review fit; wording has not been shortened.', 'warning');
      let count = 0, length = current.body.join(' ').length;
      const pending = current.items.concat(...current.columns.map(group => group.items));
      while (pending.length) {
        const item = pending.pop(); count++; length += item.text.length;
        for (const child of item.children) pending.push(child);
      }
      if (count > 8 || length > 700) diagnostic('DENSE_SLIDE', current.line, 'Slide exceeds 8 items including children or 700 body/item characters. Review fit; all wording is retained.', 'warning');
    }
    return model;
  }
  return {parse, rules, cleanInline, safeAssetPath};
}));
