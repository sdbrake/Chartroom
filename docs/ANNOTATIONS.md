# Annotated lecture notes: complete v1 reference

This is a deliberately small Markdown-like language, **not all of Markdown**. Write UTF-8 `.md` or `.txt` files. Start from `examples/blank-lecture.md`; open `examples/demo.chartroom.json` for a complete working example with its local image.

## Inserting from the workshop menu

You do not need to type these directives from memory. Below the editor, choose **Insert an element or tool** to see grouped choices, a plain-language explanation and the exact annotation that will be inserted. Put the cursor inside the intended slide and click **Insert element**. The snippet goes below that line (or on a blank line), with its first editable placeholder selected. Bold wraps selected words; all other elements require an unselected cursor and preserve your prose.

The menu covers bullets/cards, nested details, paragraphs, bold, private notes/comments, labels, footers, citations, takeaways, meters, spectrum labels, image descriptions/credits, reveal settings, column polarity and accent colors. Duplicate metadata and incompatible placements are refused with guidance instead of silently overwriting your notes. Replace sample labels, percentages and sources yourself. Image files still need importing under **Local images**.

Full layouts, including paired portraits, scholar citations and the thematic axis, belong in the adjacent **Insert slide** menu. The menu inserts the annotation syntax described below.

## A minimal lecture

```markdown
# Your lecture title

## Your first slide
- Your exact words.
- Another point.
  - A dependent detail.

*This is a private speaker aside.*

## A discussion question @big
```

One `#` cover comes first. Every `##` starts a new slide. A heading without points is a divider; adding bullets makes it a facts rail. Plain body lines before bullets are visible paragraphs. A blank line does not start a slide.

### Private versus public text

- `**Bold words**` remain visible, in bold.
- `*Single-star words*` are private speaker notes, **not visible emphasis**.
- `%%Private words%%` is the alternative, including multiline private spans.
- `@notes Your private explanation` explicitly marks one whole line private.
- `<!-- comments -->` are omitted and may span lines.
- Unclosed aside/comment delimiters are errors. Do not use literal unpaired asterisks as multiplication notation; spell it out in this restricted language.
- Plain text is visible. Do not place an answer in ordinary text expecting the tool to infer that it should be secret.
- HTML is escaped, not executed. Markdown links, tables, ordered lists, code fences, general Markdown plugins, and math typesetting are not supported. Use an image exhibit for a finished equation, table or graph.

## Layout flags

Put a layout at the end of a `##` heading, or on its own line immediately below that heading. Only one layout per slide. `@norev`/`@flash` may accompany a layout.

### Cards

```markdown
## Two concepts @cards
- **Concept A:** Your exact words.
- **Concept B:** Your exact words.
```

Every top-level bullet is one card. Children remain inside their parent's card. Keep the number of cards modest; long content will need splitting.

### Two explicitly named columns

```markdown
## A comparison @two-col
### Left heading
- First point.
  - Dependent detail.
### Right heading
- Second point.
@footer Your closing question?
```

Exactly two `###` headings are required. Their bullets stay in those columns. A trailing bullet belongs to the second column—it is **not** inferred to be a closing line. Use `@footer` for a visible closer. `@polarity` on its own line colors left rust and right olive when the author intends the closed/open comparison.

### Quote and big statement

```markdown
## @quote
Your exact quotation, including only the quotation marks you want displayed.
@attribution Your verified attribution

## Your brief statement @big

## A definition @big
Your longer definition in your own words.
```

Quote body text is mandatory. Attribution is authored, not looked up. `@big` permits a heading and optional visible body; choose a short heading when the body carries the meaning.

### Major sections

```markdown
## Your major section @part

## A topic within that section
- Your point.
```

`@part` is a navy title-only divider. It sets the inherited eyebrow and advances the section accent. Do not put facts under it; start another `##` slide.

### Images

```markdown
## A chapter beat @photo images/harbour.jpg
@alt A description of the image
@credit Source, author, license and any required attribution

## A solemn moment @somber "images/photo with spaces.jpg"
@alt A description of the image
@credit Your credit line

## A graph @img images/graph.png
@alt Describe the relationship shown by the graph
@credit Your credit line
```

`@photo` crops to fill, light veil. `@somber` crops to fill, heavy veil. `@img` shows the entire image without cropping. Image/quote layouts may omit a visible heading, e.g. `## @img images/graph.png`. There is no automatic image search. Import the image under **Local images** and make the listed path match the notes exactly.

Use relative `/` paths. Absolute paths, drive letters, `..`, URLs, scriptable SVG/HTML, query strings, fragments and encoded paths are rejected. PNG/JPEG/GIF/WebP only. Spaces in directive paths need quotes. For widest portability avoid punctuation in filenames. Case matters when you later host the output.

### Paired portraits

```markdown
## Two people @duo
@portrait images/one.jpg | Person One | Source and license | Portrait of Person One
@portrait images/two.jpg | Person Two | Source and license | Portrait of Person Two
```

Order is **path | name | credit | alt**. Use exactly two directives. No names, photos or biographies are inferred. The full portraits are contained within their frames.

### Scholar citation

```markdown
## An authored reference @scholar images/portrait.jpg
@alt Portrait description
@citation Your verified bibliographic citation
@takeaway Your exact takeaway
@credit Image source and license
```

This is layout only: it does not query Crossref or verify a citation. Bibliography and takeaway come from the notes.

### Spectrum labels, axis, and explicit meters

```markdown
## The thematic spectrum @lens

## An era
- Your short fact.
@slider 78%

## Two policy dimensions
- Your short fact.
@slider1 Immigration at 90%
@slider2 Trade at 10%
```

`@lens` draws an unscored axis with Closed on the left and Open on the right by default. `@slider` draws a single marker. Named `@slider1`/`@slider2` preserve their written order. Percentages are 0–100, with decimals allowed. They are author-supplied values, never computed from the lecture's subject. Do not combine single and dual meters unless you genuinely want all the annotated meters on one slide.

To change the endpoint text, put `@spectrum Left label | Right label` on its own line within the slide. For example:

```markdown
## A comparison axis @lens
@spectrum Centralized | Decentralized

## An authored estimate
- Your explanation of the measure.
@spectrum Centralized | Decentralized
@slider 35%
```

Both labels are authored text, separated by `|`. The directive changes the endpoints of the `@lens` axis and every `@slider`, `@slider1`, or `@slider2` meter on **that slide only**. It does not add an axis or meter by itself, change a numeric value, rename an individual meter, or change the palette’s colors. There is no global spectrum-label setting and no inheritance to the next slide: without the directive, Closed/Open remains the default. Repeat it on each slide that needs custom labels. **Insert an element or tool** includes spectrum labels so you do not need to remember the syntax.

## Common per-slide directives

| Directive, on its own line | Meaning |
|---|---|
| `@eyebrow Your label` | Override inherited small label |
| `@hue olive` | Pin accent: olive, violet, rust, amber |
| `@footer Your question?` | Visible italic bottom line |
| `@norev` or `@flash` | Show all facts at once |
| `@notes Your explanation` | Private note |
| `@alt Your description` | Image alternative text |
| `@credit Your source/license` | Visible image credit |
| `@attribution Your attribution` | Visible quote attribution |
| `@citation Your citation` | Visible citation text |
| `@takeaway Your takeaway` | Visible takeaway panel |
| `@polarity` | Rust-left, olive-right column accents |
| `@spectrum …` | Two endpoint labels for this slide’s axis and meters, separated by a vertical bar; default Closed/Open |

The cover accepts only its title, optional `@eyebrow`, and private notes. Metadata other than layout flags and `@norev`/`@flash` belongs on its own line. Duplicate metadata directives are errors rather than silent overwrites.

## Diagnostics and fit

Errors identify a source line and block export. Click a message in Studio to move to its lecture and line. Long titles and dense slides produce warnings, without deleting words. Before a browser export, Studio renders **every available lecture** offscreen, tests image decoding, and checks actual slide overflow at the design canvas size. It automatically reduces font sizes within a bounded range; remaining overflow blocks export. Fix by splitting the notes into additional `##` slides, not by suppressing the warning.

Unavailable (coming-soon) lectures remain in the private project but their content is not exported. Only their library labels appear to students.

## Migrating older human-assisted shorthand

The old template sometimes included instructions and sample notes under extra `#` headings. Start at the real lecture title; keep one cover only. Remove instructional prose or put it in comments/private notes.

Replace guessed/indented two-column arrangements with two named `###` groups. Replace a guessed trailing closer with `@footer`. Replace image-search ideas such as `@photo a harbour` with a real imported image path. Replace scholar lookups with your own citation and portrait. For ordinary text, PPTX, or HTML, the browser converter below offers a draft for review, not an exact reconstruction. PDF, older `.ppt`, and Word documents are not supported inputs.

## Convert ordinary text or slides to a draft

Use **Import .md / .txt notes** for existing Chartroom annotation files: that is the exact-annotations path. Use **Convert text / slideshow** in the sidebar when starting from ordinary text or a slideshow. Its **Convert to draft notes** window keeps conversion separate from the current lecture.

1. Paste text or select one `.txt`, `.md`, `.pptx`, `.html`, or `.htm` file. You may supply a title, but it is optional. Export a Google Slides or Keynote presentation as `.pptx` first; native files, older `.ppt`, and PDF are not supported. For unsupported presentations, export to `.pptx` or paste the text.
2. Review and edit the resulting draft. Headings, list hierarchy, and slide boundaries are approximate; wording is not rewritten. Images, charts, animations, and slide layout are not imported. Rebuild the needed layouts and add local images yourself.
3. Use **Save draft .md** to download the editable annotated source, including any private notes. Or choose **Add as new draft lecture**. The added lecture is unavailable (**Coming soon**) by default; existing lectures are not overwritten.
4. Check warnings, annotations, visible text, and preview before making the new lecture available. Unavailable lecture content is excluded from public exports, but its library label can still appear.

Everything is processed in your browser, without uploads. Conversion also works in the extracted offline app; it does not need Python. The original source file is not changed.

### Privacy during conversion

PPTX speaker notes are private notes, not slide text. Explicit source private annotations are protected. Ambiguous Chartroom syntax may be kept in private notes with a warning for cleanup; check those warnings against the original rather than copying all private notes into visible text.

Raw text and HTML need a privacy review. The converter cannot infer that an unmarked answer, reminder, or other prose is secret. Mark it explicitly before sharing. Draft `.md` files and saved projects can contain private material: share reviewed teaching or student exports instead.

### Legacy conversion of older Chartroom HTML decks

For supported hand-authored Chartroom **HTML** decks, the source repository retains a separate, fidelity-oriented Python converter. Unlike the browser draft converter, it maps known older layouts and can package their local images. Run the development tool:

```bash
python scripts/convert-old-deck.py "path/to/deck.html" \
  --out "path/to/deck-notes.md" \
  --project "path/to/deck.chartroom.json" \
  --palette buster --id my-lecture
```

It reads the `.s`-section markup the old decks used (covers, editorial rails,
chapter-beat photos, whole-image exhibits, two-column halves, pull quotes,
scholar citations, question pairs, era lists, card grids, matrices, navy
interludes) and emits v1 annotated notes. The mapping is deterministic and
summarized below; wording is preserved verbatim and nothing is invented.
Keep the input deck and converted outputs outside the source repository.
Images stay in the deck's own `images/` folder; `--project`
embeds them into a ready-to-open `.chartroom.json` with your chosen palette, and
`--id` sets the lecture slug. The original deck is never modified.

Known, explicit mappings: running part labels become the eyebrow when a slide
has no authored eyebrow; heading-less two-column halves and Rogowski-style
tables are flattened to facts (with a private note explaining how to restore
the layout); `.open`/`.closed` emphasis and `<strong>` become bold; `<em>`
becomes plain text. Quote glyphs, dot markers and accent bars are design chrome
and are removed. No wording is invented, deduplicated, or shortened.
