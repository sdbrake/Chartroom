/* Explicit editor snippets, not new compiler syntax. Works offline and in Node. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./parser.js'));
  else root.ChartroomInsert = factory(root.ChartroomParser);
}(typeof globalThis !== 'undefined' ? globalThis : this, function (Parser) {
  'use strict';
  const catalog = [
    {id:'point', group:'Text and lists', label:'Bullet / card', text:'- Your point.', placeholder:'Your point.', help:'One visible point. On a Cards slide, each top-level bullet is a card.'},
    {id:'detail', group:'Text and lists', label:'Nested detail', text:'  - Your supporting detail.', placeholder:'Your supporting detail.', help:'Place the cursor on a parent bullet or directly below it. Two spaces make this a child point.'},
    {id:'body', group:'Text and lists', label:'Visible paragraph', text:'Your visible paragraph.', placeholder:'Your visible paragraph.', help:'Insert below the heading, before any bullets. For two columns, use bullets instead.'},
    {id:'bold', group:'Text and lists', label:'Bold text', text:'**Your bold words**', placeholder:'Your bold words', inline:true, help:'Select words to make them bold, or insert at the cursor within a heading, paragraph or bullet. Single stars mean private notes, not italics.'},
    {id:'notes', group:'Private notes', label:'Private speaker note', text:'@notes Your private explanation.', placeholder:'Your private explanation.', help:'Only in your editable project and slide map; omitted from both exported decks and student libraries.'},
    {id:'comment', group:'Private notes', label:'Hidden editing comment', text:'<!-- Your editing reminder. -->', placeholder:'Your editing reminder.', help:'An editing reminder kept in source notes, omitted from slides and the speaker-note map.'},
    {id:'eyebrow', group:'Labels and callouts', label:'Small label above heading', text:'@eyebrow Your label', placeholder:'Your label', help:'Overrides the small section label above this slide’s heading.'},
    {id:'footer', group:'Labels and callouts', label:'Closing question / footer', text:'@footer Your closing question?', placeholder:'Your closing question?', help:'Visible italic line at the bottom of this slide.'},
    {id:'attribution', group:'Labels and callouts', label:'Quotation attribution', text:'@attribution Your verified attribution', placeholder:'Your verified attribution', help:'Visible attribution, typically beneath a quotation. Supply the name/source yourself.'},
    {id:'citation', group:'Labels and callouts', label:'Bibliographic citation', text:'@citation Your verified citation', placeholder:'Your verified citation', help:'Visible reference text. No automatic lookup or verification.'},
    {id:'takeaway', group:'Labels and callouts', label:'Takeaway callout', text:'@takeaway Your exact takeaway', placeholder:'Your exact takeaway', help:'A highlighted takeaway panel with an accent rule. Uses your words exactly.'},
    {id:'spectrum', group:'Spectrum', label:'Spectrum labels', text:'@spectrum Left endpoint | Right endpoint', placeholder:'Left endpoint', help:'Name the left and right endpoints for this slide’s lens and all its meters. Defaults are Closed and Open. Replace both placeholders with your own labels.'},
    {id:'slider', group:'Spectrum', label:'Single meter', text:'@slider 50%', placeholder:'50', help:'A spectrum marker. Use Spectrum labels to name its endpoints. Replace the sample 50 with your own value from 0 to 100; it is not calculated.'},
    {id:'sliders', group:'Spectrum', label:'Two named meters', text:'@slider1 First dimension at 50%\n@slider2 Second dimension at 50%', placeholder:'First dimension', help:'Two labeled spectrum meters sharing this slide’s endpoints. Use Spectrum labels to name the endpoints. Replace both labels and sample percentages with your own.'},
    {id:'alt', group:'Images and sources', label:'Image description (alt text)', text:'@alt Describe the image', placeholder:'Describe the image', help:'Accessible description for a Photo, Somber photo, Whole image or Scholar slide. Portraits use descriptions inside @portrait.'},
    {id:'credit', group:'Images and sources', label:'Image source / license', text:'@credit Your image source and license', placeholder:'Your image source and license', help:'Visible image credit. Import the actual image through Local images; this does not fetch anything.'},
    {id:'norev', group:'Presentation settings', label:'Show all points at once', text:'@norev', help:'On a facts slide, disables stepwise reveals in teaching mode. Remove @norev (or @flash) to restore them.'},
    {id:'polarity', group:'Presentation settings', label:'Spectrum column colors', text:'@polarity', help:'Two-column slides only: use the left spectrum accent on the left and right spectrum accent on the right. Colors follow the selected palette.'},
    ...['olive','violet','rust','amber'].map(hue => ({id:'hue-'+hue, group:'Slide accent', label:({olive:'Green',violet:'Blue',rust:'Rust / red',amber:'Gold'})[hue]+' accent (Classic)', text:'@hue '+hue, placeholder:hue, help:'Pins this slide’s accent slot. Other palettes map these slots to their own colors; this does not change the course palette.'}))
  ];
  function plan(source, start, end, id) {
    const item = catalog.find(entry => entry.id === id);
    if (!item) return {error:'Choose an element first.'};
    if (!item.inline && start !== end) return {error:'Place the cursor where you want the element, without a text selection. Nothing was replaced.'};
    const lineStart = start ? source.lastIndexOf('\n', start - 1) + 1 : 0;
    const next = source.indexOf('\n', start);
    const lineEnd = next < 0 ? source.length : next;
    const line = source.slice(lineStart, lineEnd), empty = !line.trim();
    const at = empty ? lineStart : lineEnd;
    const before = Parser.parse(source);
    const lineNumber = source.slice(0, start).split('\n').length;
    const slide = before.slides.filter(s => s.line <= lineNumber).pop();
    if (!slide) return {error:'Start with a # cover, then place the cursor inside a slide.'};
    if (slide.kind === 'cover' && !['eyebrow','notes','comment','bold'].includes(id)) return {error:'The cover accepts only its title, a small label and private notes. Choose a ## slide for this element.'};
    if (id === 'polarity' && slide.kind !== 'two-col') return {error:'Column colors need a Two columns slide. Use Insert slide to create one.'};
    if (id === 'alt' && !['photo','somber','img','scholar'].includes(slide.kind)) return {error:'An image description needs a Photo, Somber photo, Whole image or Scholar slide.'};
    if (id === 'norev' && slide.kind !== 'facts') return {error:'This setting applies to facts slides. Other layouts already show all their content.'};
    if (id === 'norev' && !slide.reveal) return {error:'This slide already shows all points at once. Remove @norev / @flash to restore reveals.'};
    if (['slider','sliders'].includes(id) && slide.meters.length) return {error:'This slide already has a meter. Edit its existing @slider lines rather than adding another set.'};
    // Ask the existing privacy scanner rather than maintain a second annotation grammar.
    let probe = 'CHARTROOM_INSERT_LOCATION';
    while (source.includes(probe)) probe += '_';
    const probeAt = item.inline ? start : at;
    if (!Parser.cleanInline(source.slice(0, probeAt) + probe + source.slice(probeAt)).includes(probe)) {
      return {error:'Move the cursor outside the private aside or comment before inserting an element.'};
    }
    let edit;
    if (item.inline) {
      const selected = source.slice(start, end);
      const prefix = line.match(/^\s*(?:#{1,3}\s+|-\s+)/);
      if (!line.trim() || /^\s*@/.test(line) || /[\n\r*]|%%|<!--|-->/.test(selected) || (prefix && start < lineStart + prefix[0].length)) {
        return {error:'Select plain words within one heading, paragraph or bullet, not its markers or an entire line.'};
      }
      for (const match of line.matchAll(/\*\*[^*]+\*\*/g)) {
        if (start < lineStart + match.index + match[0].length && end > lineStart + match.index) {
          return {error:'These words are already bold. Edit them directly rather than adding more markers.'};
        }
      }
      const words = selected || item.placeholder;
      edit = {start, end, text:'**'+words+'**', selectionStart:start+2, selectionEnd:start+2+words.length};
    } else {
      const text = (empty ? '' : '\n') + item.text + (next < 0 || empty ? '\n' : '');
      const selectionStart = at + (item.placeholder ? text.indexOf(item.placeholder) : text.length);
      edit = {start:at, end:at, text, selectionStart, selectionEnd:selectionStart + (item.placeholder || '').length};
    }
    const candidate = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    // Ignore unchanged errors elsewhere; refuse to introduce new ones at this cursor.
    const existing = before.diagnostics.filter(d => d.severity === 'error').map(d => d.code + ':' + d.message);
    for (const issue of Parser.parse(candidate).diagnostics.filter(d => d.severity === 'error')) {
      const key = issue.code + ':' + issue.message, index = existing.indexOf(key);
      if (index < 0) return {error:'Not inserted: '+issue.message+' '+item.help};
      existing.splice(index, 1);
    }
    return edit;
  }
  return {catalog, plan};
}));
