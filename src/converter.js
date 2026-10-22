/* Browser-local draft conversion. No network, dependencies, file writes or UI state.
 * window.ChartroomConverter / CommonJS exports:
 *   fromText(text, {title}?) -> {title, notes, warnings:string[]}
 *   fromHTML(html, {title}?) -> same (synchronous; browser DOMParser required)
 *   fromPptx(ArrayBuffer|ArrayBufferView, {title}?) -> Promise<same>
 *   fromFile(File, {title}?) -> Promise<same>; limits is a frozen public object.
 * Failures throw/reject Error with actionable text; no partial result is returned.
 * Text: # cover, #..###### slide headings; otherwise blank-separated groups.
 * Each nonblank source line becomes a bullet. Numbered text retains its number.
 * HTML: innermost .s/.slide/Reveal sections, else heading boundaries. Inert
 * template parsing never attaches source nodes; no CSS/script execution or fetch.
 * PPTX: XML relationship order, explicit title placeholders, paragraphs/tables,
 * private speaker notes. No master/layout inheritance, charts, images or OCR.
 * Whitespace and list indentation are normalized; hierarchy is capped at 8.
 * Reserved annotation characters have no literal escape in the existing parser:
 * ambiguous lines are retained verbatim in @notes, NOT silently made public.
 * Generic cover/slide placeholders are draft labels, not authored headings.
 * All results require author review; this is NOT the existing exact notes import.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ChartroomConverter = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const REVIEW = 'Draft conversion only: review all wording, slide breaks and hierarchy. Images, graphs, layout, animation and styling are not imported.';
  // Chartroom has no literal backslash/entity escape for annotation delimiters.
  // Never pretend otherwise: keep risky source verbatim in opaque @notes lines.
  function privacyScanner() {
    let close = '';
    return function (value) {
      let risky = !!close;
      for (let i = 0; i < value.length;) {
        if (close) {
          if (value.startsWith(close, i) && !(close === '*' && (value[i - 1] === '*' || value[i + 1] === '*'))) { i += close.length; close = ''; }
          else i++;
        } else if (value.startsWith('**', i)) { i += 2; }
        else {
          const marker = value.startsWith('<!--', i) ? '<!--' : value.startsWith('%%', i) ? '%%' : value[i] === '*' ? '*' : '';
          if (marker) { risky = true; close = marker === '<!--' ? '-->' : marker; i += marker.length; }
          else i++;
        }
      }
      return risky || /(?:^|\s)@|[<>`]|(?:^|\W)_[^_]+_/.test(value) || (value.includes('[') && value.includes(']('));
    };
  }
  function draft(title) {
    const warnings = [REVIEW];
    const lines = [];
    let outputBytes = 0;
    function emit(...values) {
      for (const value of values) {
        outputBytes += new TextEncoder().encode(value).length + 1;
        if (outputBytes > limits.outputBytes || lines.length >= 50000) throw new Error('Draft output exceeds the safety limit (4 MiB/50,000 lines). Split the source; no partial draft was returned.');
        lines.push(value);
      }
    }
    let depth = -1, slideCount = 0;
    const scan = privacyScanner();
    function note(value) { String(value).split(/\r\n?|\n/).forEach(line => emit('@notes ' + line)); }
    function quarantine(value, scanner) {
      if (/^\s*@notes(?:\s|$)/.test(value)) { note(value.replace(/^\s*@notes\s?/, '')); return true; }
      if (!(scanner || scan)(value)) return false;
      quarantined(value);
      return true;
    }
    function quarantined(value) {
      note(value);
      if (!warnings.some(w => w.startsWith('Private'))) warnings.push('Private annotations or ambiguous markup were quarantined verbatim in private @notes; review and restore intended public wording manually. No literal escape syntax was invented.');
      depth = -1;
    }
    title = String(title).replace(/[\r\n]+/g, ' ').trim() || 'Imported draft';
    if (privacyScanner()(title)) {
      const original = title; title = 'Imported draft'; emit('# ' + title); quarantine(original, privacyScanner());
    } else emit('# ' + title);
    return {
      warnings,
      private:quarantine, quarantined,
      slide(value) {
        if (++slideCount > limits.slides) throw new Error('Draft exceeds the 1000 slide limit. Split the source.');
        value = String(value).replace(/[\r\n]+/g, ' ').trim() || 'Untitled slide';
        if (scan(value)) { emit('', '## Untitled slide'); quarantined(value); }
        else emit('', '## ' + value);
        depth = -1;
      },
      item(value, level) {
        value = String(value).replace(/\s+/g, ' ').trim();
        if (!value || quarantine(value)) return;
        const requested = Number.isFinite(level) ? Math.floor(level) : 0;
        const actual = Math.max(0, Math.min(requested, depth + 1, 8));
        emit('  '.repeat(actual) + '- ' + value); depth = actual;
      },
      note,
      result() { return {title, notes:lines.join('\n') + '\n', warnings}; }
    };
  }
  function checkedText(text) {
    if (typeof text !== 'string' || !text.trim()) throw new Error('Input is empty. Paste text or select a supported file.');
    if (text.length > limits.textBytes || new TextEncoder().encode(text).length > limits.textBytes) throw new Error('Text/HTML exceeds the 2 MiB limit. Split the document before conversion.');
    if (text.includes('\0')) throw new Error('Binary/NUL data cannot be converted as text. Export UTF-8 text or .pptx.');
    return text.replace(/^\uFEFF/, '');
  }
  function fromText(text, options) {
    const rows = checkedText(text).replace(/\r\n?/g, '\n').split('\n');
    const sourceScan = privacyScanner();
    const privateRows = rows.map(row => /^\s*@notes(?:\s|$)/.test(row) ? false : sourceScan(row.replace(/^\s*[-+*•]\s+/, '')));
    let cover = rows.findIndex((row, index) => !privateRows[index] && /^#\s+\S/.test(row));
    const explicit = rows.some((row, index) => !privateRows[index] && /^#{2,6}\s+\S/.test(row));
    // Plain outlines often use short, unpunctuated first lines as headings.
    // Guess only at paragraph boundaries, after privacy scanning, and leave
    // explicit Markdown structure alone. All guesses remain editable source.
    const inferred = new Set();
    if (!explicit) rows.forEach((row, index) => {
      const value = row.trim();
      if (!privateRows[index] && value && value.length <= 100 &&
          value.split(/\s+/).length <= 12 && !/^[#@%<\-*+•\d]/.test(value) &&
          !/[.!;]$/.test(value) && (index === 0 || !rows[index - 1].trim())) inferred.add(index);
    });
    if (cover < 0) {
      const first = rows.findIndex(row => row.trim());
      if (inferred.has(first) && !String(rows[first + 1] || '').trim() &&
          rows.slice(first + 1).some(row => row.trim())) cover = first;
    }
    const title = options && options.title || (cover >= 0 ? rows[cover].replace(/^#\s+/, '').trim() : 'Imported draft');
    const out = draft(title);
    if (inferred.size) out.warnings.push('Short lines at paragraph starts were treated as headings. Review these guesses and move text back into bullets where needed.');
    let active = false, indents = [];
    function ensure() { if (!active) { out.slide(title); active = true; } }
    rows.forEach((row, index) => {
      if (privateRows[index]) { out.quarantined(row); return; }
      if (index === cover && rows[cover].replace(/^#\s+/, '').trim() === title) return;
      const heading = /^#{1,6}\s+(.+)$/.exec(row.trim());
      if (heading || inferred.has(index)) { out.slide(heading ? heading[1] : row.trim()); active = true; indents = []; return; }
      if (!row.trim()) { if (!explicit) active = false; return; }
      ensure();
      if (/^\s*@notes(?:\s|$)/.test(row)) { out.private(row); return; }
      const bullet = /^(\s*)(?:([-+*•])\s+|(\d+[.)])\s+)(.+)$/.exec(row);
      if (bullet) {
        const indent = bullet[1].replace(/\t/g, '  ').length;
        while (indents.length && indents[indents.length - 1] > indent) indents.pop();
        if (!indents.length || indents[indents.length - 1] < indent) indents.push(indent);
        out.item((bullet[3] ? bullet[3] + ' ' : '') + bullet[4], indents.length - 1);
      } else { out.item(row.trim()); }
    });
    return out.result();
  }
  function domParser() {
    if (typeof DOMParser === 'undefined') throw new Error('HTML/PPTX conversion requires a browser with DOMParser. Open Chartroom Studio in Chrome or Edge.');
    return new DOMParser();
  }
  function fromHTML(html, options) {
    // A template fragment has no browsing context, even for img/iframe/link.
    // Parsing the untrusted document directly as text/html can fetch resources.
    const doc = domParser().parseFromString('', 'text/html');
    const template = doc.createElement('template');
    template.innerHTML = checkedText(html);
    const root = template.content;
    if (root.querySelectorAll('*').length > 50000) throw new Error('HTML structural complexity exceeds the 50,000 element limit. Split the source.');
    const noteSelector = '.notes, .speaker-notes, aside[data-notes], aside[data-speaker-notes]';
    const noteAttributes = '[data-notes], [data-speaker-notes]';
    const omitSelector = 'script, style, nav, link, meta, iframe, object, embed, template, noscript, title';
    const hiddenSelector = '[hidden], [aria-hidden="true"], [inert]';
    function hidden(node) { return node.matches(hiddenSelector) || /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(node.getAttribute('style') || ''); }
    function words(node, includePrivate) {
      let text = '';
      const stack = [node];
      while (stack.length) {
        const current = stack.pop();
        if (current.nodeType === 3) { text += current.nodeValue; continue; }
        if (current.nodeType === 1 && current.matches(omitSelector)) continue;
        if (!includePrivate && current.nodeType === 1 && (current.matches(noteSelector) || hidden(current))) continue;
        if (current.nodeType === 1 && /^(BR|P|DIV|LI)$/.test(current.tagName)) text += ' ';
        for (let i = current.childNodes.length - 1; i >= 0; i--) stack.push(current.childNodes[i]);
      }
      return text.replace(/\s+/g, ' ').trim();
    }
    function publicHeading(node) {
      for (let current = node; current && current.nodeType === 1; current = current.parentElement) {
        if (current.matches(noteSelector + ', ' + omitSelector) || (hidden(current) && !current.matches('.s,.slide,.reveal .slides section'))) return false;
      }
      return true;
    }
    const firstPublicHeading = Array.from(root.querySelectorAll('h1,h2')).find(publicHeading);
    // A heading selected before body traversal may be inside a multiline aside.
    // When any annotation markup is present, do not infer a public cover from it.
    const inferHeading = !privacyScanner()(words(root, true));
    const title = options && options.title || (inferHeading ? words(firstPublicHeading || doc.createTextNode('Imported draft')) : 'Imported draft');
    // Title extraction is metadata, unlike visible body traversal.
    const out = draft(options && options.title || (root.querySelector('title') ? root.querySelector('title').textContent.trim() : title));
    const candidates = Array.from(root.querySelectorAll('.s, .slide, .reveal .slides section')).filter(publicHeading);
    const candidateSet = new Set(candidates), parents = new Set();
    for (const node of candidates) for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
      if (candidateSet.has(ancestor)) { parents.add(ancestor); break; }
    }
    const slides = candidates.filter(node => !parents.has(node));
    if (slides.length > limits.slides) throw new Error('HTML exceeds the 1000 slide limit. Split the source.');
    const captured = new WeakSet(), capturedAttributes = new WeakSet();
    function captureNotes(container) {
      const attributes = Array.from(container.querySelectorAll(noteAttributes));
      if (container.matches && container.matches(noteAttributes)) attributes.unshift(container);
      for (const node of attributes) if (!capturedAttributes.has(node)) {
        capturedAttributes.add(node);
        for (const name of ['data-notes','data-speaker-notes']) if (node.getAttribute(name)) out.note(node.getAttribute(name));
      }
      const nodes = container.matches && container.matches(noteSelector) ? [container] : Array.from(container.querySelectorAll(noteSelector));
      for (const node of nodes) {
        if (captured.has(node) || (node.parentElement && node.parentElement.closest(noteSelector))) continue;
        captured.add(node); out.note(words(node, true));
      }
    }
    for (const node of root.querySelectorAll(noteSelector)) if (!slides.some(slide => slide.contains(node))) captureNotes(node);
    let active = false;
    function ensure() { if (!active) { out.slide(title || 'Untitled slide'); active = true; } }
    function extract(container, firstHeading, fallback) {
      let buffer = '', bufferDepth = 0;
      function flush() { const value = buffer.replace(/\s+/g, ' ').trim(); buffer = ''; if (value) { ensure(); out.item(value, bufferDepth); } }
      function walk(node, level) {
        if (node.nodeType === 3) { buffer += node.nodeValue; return; }
        if (node.nodeType !== 1 && node.nodeType !== 11) return;
        if (node.nodeType === 1) {
          if (node.matches(omitSelector)) return;
          if (node.matches(noteSelector)) { flush(); ensure(); captureNotes(node); return; }
          if (node !== container && hidden(node)) return;
          if (node === firstHeading) { captureNotes(node); return; }
          if (/^H[1-6]$/.test(node.tagName) && fallback) { flush(); out.slide(words(node)); active = true; captureNotes(node); return; }
          if (node.tagName === 'TR') { flush(); ensure(); out.item(Array.from(node.children).map(cell => words(cell)).join(' | ')); captureNotes(node); return; }
          if (node.tagName === 'BR') { buffer += ' '; return; }
        }
        const block = node.nodeType === 1 && /^(P|DIV|SECTION|ARTICLE|HEADER|FOOTER|H[1-6]|UL|OL|LI|BLOCKQUOTE|PRE|TABLE)$/.test(node.tagName);
        if (block) flush();
        const currentLevel = node.nodeType === 1 && node.tagName === 'LI' ? level + 1 : level;
        bufferDepth = Math.max(0, currentLevel);
        for (const child of node.childNodes) walk(child, currentLevel);
        if (block) flush();
        bufferDepth = Math.max(0, level);
      }
      walk(container, -1); flush();
    }
    if (slides.length) for (const slide of slides) {
      const heading = Array.from(slide.querySelectorAll('h1,h2,h3,h4,h5,h6')).find(publicHeading);
      out.slide(heading ? words(heading) : 'Untitled slide'); active = true;
      extract(slide, heading, false); captureNotes(slide);
    } else { extract(root, null, true); captureNotes(root); }
    out.warnings.push('HTML uses structural text only; CSS, hidden non-note content, navigation and scripts are excluded. Recognized speaker notes remain private. Review numbering and table separators.');
    return out.result();
  }
  const limits = Object.freeze({fileBytes:32 * 1024 * 1024, textBytes:2 * 1024 * 1024,
    outputBytes:4 * 1024 * 1024, entries:4096, entryBytes:16 * 1024 * 1024, expandedBytes:128 * 1024 * 1024, slides:1000});
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let crc = n;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    crcTable[n] = crc >>> 0;
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }
  async function readZip(buffer) {
    if (!(buffer instanceof ArrayBuffer) && !ArrayBuffer.isView(buffer)) throw new Error('PPTX conversion needs file bytes (ArrayBuffer).');
    const bytes = ArrayBuffer.isView(buffer) ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
    if (bytes.length > limits.fileBytes) throw new Error('PPTX file exceeds the 32 MiB limit. Split the presentation or paste text.');
    if (bytes.length >= 8 && [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((value,i) => bytes[i] === value)) throw new Error('Legacy .ppt or encrypted Office container detected. Save an unencrypted .pptx or paste text.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    function invalid() { throw new Error('Invalid or truncated PPTX ZIP. Re-save as .pptx or paste text.'); }
    function range(at, count, stop) { if (at < 0 || count < 0 || at + count > (stop === undefined ? bytes.length : stop)) invalid(); }
    let end = bytes.length - 22;
    const floor = Math.max(0, bytes.length - 65557);
    while (end >= floor) {
      if (view.getUint32(end, true) === 0x06054b50 && end + 22 + view.getUint16(end + 20, true) === bytes.length) break;
      end--;
    }
    if (end < floor) invalid();
    const count = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true), central = view.getUint32(end + 16, true);
    if (count === 65535 || centralSize === 0xffffffff || central === 0xffffffff) throw new Error('ZIP64 PPTX is unsupported. Save a smaller .pptx or paste text.');
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 8, true) !== count) throw new Error('Split/multidisk PPTX ZIP is unsupported. Re-save as one .pptx.');
    if (count > limits.entries) throw new Error('PPTX exceeds the 4096 ZIP entries limit. Split the presentation.');
    range(central, centralSize, end);
    if (central + centralSize !== end) invalid();
    let cursor = central, expanded = 0, readBytes = 0;
    const entries = new Map(), spans = [];
    const decoder = new TextDecoder('utf-8', {fatal:true});
    function decode(data) { try { return decoder.decode(data); } catch (_) { invalid(); } }
    for (let i = 0; i < count; i++) {
      range(cursor, 46, end);
      if (view.getUint32(cursor, true) !== 0x02014b50) invalid();
      const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
      const compressed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true);
      const length = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
      if (flags & 0x41) throw new Error('Encrypted PPTX ZIP is unsupported. Save an unencrypted .pptx first.');
      if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression. Re-save as a standard .pptx.');
      if (size === 0xffffffff || compressed === 0xffffffff) throw new Error('ZIP64 entry is unsupported. Save a smaller .pptx.');
      expanded += size;
      if (size > limits.entryBytes || expanded > limits.expandedBytes) throw new Error('PPTX expanded size exceeds the safety limit (16 MiB/entry, 128 MiB total). Split the presentation.');
      if (size > 1024 * 1024 && size / Math.max(1, compressed) > 200) throw new Error('PPTX compression ratio exceeds the ZIP bomb safety limit. Re-save or split the presentation.');
      range(cursor + 46, length + extra + comment, end);
      const name = decode(bytes.subarray(cursor + 46, cursor + 46 + length));
      if (!name || /[\\\x00-\x1f:%?#]/.test(name) || name.startsWith('/') || name.split('/').some((p,i,a) => p === '..' || p === '.' || (!p && i !== a.length - 1))) throw new Error('Unsafe ZIP entry path in PPTX. Re-save the file.');
      if (entries.has(name)) throw new Error('Duplicate ZIP entry in PPTX. Re-save the file.');
      if (view.getUint16(cursor + 34, true)) throw new Error('Split/multidisk PPTX entry is unsupported. Re-save the file.');
      const local = view.getUint32(cursor + 42, true);
      range(local, 30, central);
      if (view.getUint32(local, true) !== 0x04034b50) invalid();
      if (view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) invalid();
      const localLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
      const start = local + 30 + localLength + localExtra;
      range(local + 30, localLength + localExtra + compressed, central);
      if (decode(bytes.subarray(local + 30, local + 30 + localLength)) !== name) invalid();
      const crc = view.getUint32(cursor + 16, true);
      if (!(flags & 8) && (view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== size || view.getUint32(local + 14, true) !== crc)) invalid();
      if (method === 0 && compressed !== size) invalid();
      spans.push([local, start + compressed]);
      entries.set(name, {size, method, crc, data:bytes.subarray(start, start + compressed)});
      cursor += 46 + length + extra + comment;
    }
    if (cursor !== end) invalid();
    spans.sort((a,b) => a[0] - b[0]);
    for (let i = 1; i < spans.length; i++) if (spans[i][0] < spans[i-1][1]) invalid();
    return {
      has(name) { return entries.has(name); },
      async text(name) {
        const entry = entries.get(name);
        if (!entry) throw new Error('PPTX is missing a referenced XML part. Re-save as .pptx.');
        readBytes += entry.size;
        if (readBytes > limits.expandedBytes) throw new Error('PPTX XML read budget exceeds the 128 MiB limit, including repeated relationships. Split or re-save the presentation.');
        let data = entry.data;
        if (entry.method === 8) {
          let decompressor;
          try { decompressor = new DecompressionStream('deflate-raw'); }
          catch (_) { throw new Error('This browser cannot decompress PPTX. Use a current Chrome/Edge with DecompressionStream deflate-raw, or paste text.'); }
          const reader = new Blob([data]).stream().pipeThrough(decompressor).getReader();
          const chunks = []; let size = 0;
          try {
            while (true) {
              const chunk = await reader.read();
              if (chunk.done) break;
              size += chunk.value.length;
              if (size > entry.size) { await reader.cancel(); throw new Error('PPTX expanded beyond its declared size. Re-save the file.'); }
              chunks.push(chunk.value);
            }
          } catch (_) { throw new Error('Invalid or oversized compressed PPTX entry. Re-save as .pptx.'); }
          data = new Uint8Array(size); let offset = 0;
          for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
        } else if (entry.method !== 0) throw new Error('Unsupported ZIP compression. Re-save as .pptx.');
        if (data.length !== entry.size || crc32(data) !== entry.crc) throw new Error('Corrupt PPTX entry: size or CRC checksum mismatch. Re-save the file.');
        return decode(data);
      }
    };
  }
  function elements(node, localName) { return Array.from(node.getElementsByTagNameNS('*', localName)); }
  function xml(text) {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('PPTX XML DTD/entity declarations are unsupported. Re-save as a standard .pptx.');
    const doc = domParser().parseFromString(text, 'application/xml');
    if (elements(doc, 'parsererror').length) throw new Error('Malformed PPTX XML. Re-save as .pptx; no partial conversion was returned.');
    return doc;
  }
  function relationshipPath(part) { const at = part.lastIndexOf('/'); return part.slice(0, at + 1) + '_rels/' + part.slice(at + 1) + '.rels'; }
  function targetPath(part, target) {
    if (!target || /[\\\x00-\x1f:%?#]/.test(target) || target.startsWith('//')) throw new Error('Unsafe PPTX relationship path. Re-save as .pptx.');
    const pieces = target.startsWith('/') ? [] : part.split('/').slice(0, -1);
    for (const piece of target.split('/')) {
      if (piece === '..') {
        if (!pieces.length) throw new Error('PPTX relationship path escapes the package. Re-save as .pptx.');
        pieces.pop();
      }
      else if (piece && piece !== '.') pieces.push(piece);
    }
    return pieces.join('/');
  }
  async function relationships(zip, part) {
    const relPath = part ? relationshipPath(part) : '_rels/.rels';
    if (!zip.has(relPath)) return [];
    const result = [], ids = new Set();
    for (const node of elements(xml(await zip.text(relPath)), 'Relationship')) {
      const id = node.getAttribute('Id'), type = (node.getAttribute('Type') || '').split('/').pop();
      if (!id || ids.has(id)) throw new Error('Missing or duplicate PPTX relationship ID. Re-save as .pptx.');
      ids.add(id);
      if (!['officeDocument','slide','notesSlide'].includes(type)) continue;
      if ((node.getAttribute('TargetMode') || '').toLowerCase() === 'external') throw new Error('External PPTX slide/notes relationships cannot be imported offline. Re-save with embedded slides.');
      result.push({id, type, target:targetPath(part, node.getAttribute('Target'))});
    }
    return result;
  }
  function paragraphText(node) {
    let value = '';
    for (const child of elements(node, '*')) {
      if (child.localName === 't') value += child.textContent;
      else if (child.localName === 'br') value += ' ';
      else if (child.localName === 'tab') value += '\t';
    }
    return value.trim();
  }
  function shapeType(shape) { const ph = elements(shape, 'ph')[0]; return ph ? ph.getAttribute('type') : ''; }
  async function fromPptx(buffer, options) {
    const zip = await readZip(buffer);
    const rootRels = await relationships(zip, '');
    const office = rootRels.find(rel => rel.type === 'officeDocument');
    const presentation = office ? office.target : 'ppt/presentation.xml';
    const doc = xml(await zip.text(presentation));
    const rels = await relationships(zip, presentation);
    const slidePaths = elements(doc, 'sldId').map(node => {
      const id = Array.from(node.attributes).find(attr => attr.localName === 'id' && attr.namespaceURI);
      const rel = rels.find(item => id && item.id === id.value && item.type === 'slide');
      if (!rel) throw new Error('PPTX slide relationship is missing. Re-save as .pptx.');
      return rel.target;
    });
    if (slidePaths.length > limits.slides) throw new Error('PPTX exceeds the 1000 slide limit. Split the presentation.');
    let out;
    for (const path of slidePaths) {
      const slide = xml(await zip.text(path));
      const shapes = elements(slide, 'sp');
      const titleShape = shapes.find(shape => ['title', 'ctrTitle'].includes(shapeType(shape)));
      const title = titleShape ? elements(titleShape, 'p').map(paragraphText).filter(Boolean).join(' ') : 'Untitled slide';
      if (!out) out = draft(options && options.title || title);
      out.slide(title);
      for (const node of elements(slide, '*')) {
        if (node.localName === 'sp') {
          if (node === titleShape || ['ftr','hdr','dt','sldNum'].includes(shapeType(node))) continue;
          for (const paragraph of elements(node, 'p')) {
            const value = paragraphText(paragraph), properties = elements(paragraph, 'pPr')[0];
            if (value) out.item(value, properties ? Number(properties.getAttribute('lvl')) || 0 : 0);
          }
        } else if (node.localName === 'tr') {
          out.item(elements(node, 'tc').map(cell => elements(cell, 'p').map(paragraphText).join(' ')).join(' | '));
        }
      }
      const noteRels = (await relationships(zip, path)).filter(rel => rel.type === 'notesSlide');
      for (const rel of noteRels) {
        const notes = xml(await zip.text(rel.target));
        for (const shape of elements(notes, 'sp')) {
          if (['ftr','hdr','dt','sldNum','sldImg'].includes(shapeType(shape))) continue;
          for (const paragraph of elements(shape, 'p')) { const value = paragraphText(paragraph); if (value) out.note(value); }
        }
      }
    }
    if (!out) throw new Error('PPTX has no slides. Export a presentation with slides or paste text.');
    out.warnings.push('PPTX uses slide XML reading order, not visual position. Master/layout text, charts and embedded objects are not extracted; tables become text rows. Speaker notes remain private.');
    return out.result();
  }
  async function fromFile(file, options) {
    if (!file || typeof file.name !== 'string' || typeof file.arrayBuffer !== 'function') throw new Error('Choose a local .txt, .md, .html or .pptx file.');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt','md','html','htm','pptx'].includes(extension)) throw new Error('Unsupported file type. Export .pptx, export UTF-8 .txt/.html, or paste text. Legacy .ppt and PDF are not supported.');
    const max = extension === 'pptx' ? limits.fileBytes : limits.textBytes;
    if (!Number.isFinite(file.size) || file.size > max) throw new Error('File exceeds the conversion size limit (32 MiB PPTX; 2 MiB text/HTML). Split the source.');
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > max) throw new Error('File exceeds the conversion size limit. Split the source.');
    if (extension === 'pptx') return fromPptx(bytes, options);
    let text;
    try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
    catch (_) { throw new Error('Unsupported text encoding or binary file. Export UTF-8 text/HTML or .pptx.'); }
    return ['html','htm'].includes(extension) ? fromHTML(text, options) : fromText(text, options);
  }
  return {fromText, fromHTML, fromPptx, fromFile, limits};
}));
