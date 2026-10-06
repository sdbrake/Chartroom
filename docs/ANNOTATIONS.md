# Annotated lecture notes: complete v1 reference

This is a deliberately small Markdown-like language, **not all of Markdown**. Write UTF-8 `.md` or `.txt` files. Start from `examples/blank-lecture.md`; open `examples/demo.chartroom.json` for a complete working example with its local image.

## Inserting from the workshop menu

You do not need to type these directives from memory. Below the editor, choose **Insert an element or tool** to see grouped choices, a plain-language explanation and the exact annotation that will be inserted. Put the cursor inside the intended slide and click **Insert element**. The snippet goes below that line (or on a blank line), with its first editable placeholder selected. Bold wraps selected words; all other elements require an unselected cursor and preserve your prose.

The menu covers bullets/cards, nested details, paragraphs, bold, private notes/comments, labels, footers, citations, takeaways, meters, image descriptions/credits, reveal settings, column polarity and accent colors. Duplicate metadata and incompatible placements are refused with guidance instead of silently overwriting your notes. Replace sample labels, percentages and sources yourself. Image files still need importing under **Local images**.

Full layouts, including paired portraits, scholar citations and the thematic axis, belong in the adjacent **Insert slide** menu. The compiler syntax below is unchanged.

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

### Open/closed axis and explicit meters

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

`@lens` draws an unscored closed/open axis. `@slider` draws a single marker. Named `@slider1`/`@slider2` preserve their written order. Percentages are 0–100, with decimals allowed. They are author-supplied values, never computed from the lecture's subject. Do not combine single and dual meters unless you genuinely want all the annotated meters on one slide.

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

The cover accepts only its title, optional `@eyebrow`, and private notes. Metadata other than layout flags and `@norev`/`@flash` belongs on its own line. Duplicate metadata directives are errors rather than silent overwrites.

## Diagnostics and fit

Errors identify a source line and block export. Click a message in Studio to move to its lecture and line. Long titles and dense slides produce warnings, without deleting words. Before a browser export, Studio renders **every available lecture** offscreen, tests image decoding, and checks actual slide overflow at the design canvas size. It automatically reduces font sizes within a bounded range; remaining overflow blocks export. Fix by splitting the notes into additional `##` slides, not by suppressing the warning.

Unavailable (coming-soon) lectures remain in the private project but their content is not exported. Only their library labels appear to students.

## Migrating older human-assisted shorthand

The old template sometimes included instructions and sample notes under extra `#` headings. Start at the real lecture title; keep one cover only. Remove instructional prose or put it in comments/private notes.

Replace guessed/indented two-column arrangements with two named `###` groups. Replace a guessed trailing closer with `@footer`. Replace image-search ideas such as `@photo a harbour` with a real imported image path. Replace scholar lookups with your own citation and portrait. There is no automatic conversion from an arbitrary PDF, PowerPoint, or Word document in this release.

### Converting older chartroom HTML decks (v1.2)

Hand-authored chartroom **HTML** decks can be converted automatically, not by retyping. Run the development tool:

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
