# The Chartroom rules

This rulebook describes the compiler and renderer shipped with Chartroom Studio 1.3. Its annotation reference is [ANNOTATIONS.md](ANNOTATIONS.md).

## 1. Authorship is a hard boundary

1. Preserve the author's visible words, punctuation, spelling, ordering, and parent–child relationships. Never invent a title, fact, quotation, transition, citation, percentage, image, or syllabus entry.
2. Remove only explicit structural markup, HTML comments, and private `*asides*`, `%%asides%%`, or `@notes`. Interpret `**bold**` without rewriting its words. Whitespace at line edges is structural.
3. Short slides are prompts for a speaker. Density warnings are invitations to edit the **notes**, not permission for the software to shorten a sentence.
4. Shared teaching and student HTML contain no private notes or embedded source model. A saved project DOES contain them and is a private authoring file.
5. A named section is created only from an authored divider or `@part`. Never infer a historical arc from the topic.

## 2. Deterministic layout selection

| Authored structure | Layout |
|---|---|
| First and only `# Title` | Navy cover |
| `## Heading`, no visible body or points | Section divider |
| `## Heading`, with points or leading body | Editorial facts rail |
| `@part` | Navy major-part divider |
| `@cards` | Side-by-side concept cards |
| `@two-col` and two `###` headings | Two explicitly named columns |
| `@quote` with body text | Serif pull quote and optional attribution |
| `@big` | Navy statement or definition interlude |
| `@photo path` | Full-bleed image, light veil |
| `@somber path` | Full-bleed image, heavy veil |
| `@img path` | Whole, uncropped image exhibit |
| `@lens` | Unscored axis; Closed/Open endpoints unless this slide supplies spectrum labels |
| `@duo` with two portrait directives | Paired whole portraits and captions |
| `@scholar path` | Portrait with authored citation/takeaway |

Multiple conflicting types, unknown directives, unsupported notation, unsafe paths, invalid percentages, orphan children, or ambiguous columns are **errors**. They never get silently “fixed.” Source lines accompany errors. Export stops until errors are resolved.

For fidelity, visible body paragraphs must precede bullets. A paragraph after bullets would otherwise change order in this model; it is rejected. Use another bullet, an explicit footer, or a new slide. Columns require bullet content beneath each named heading.

## 3. Chartroom's visual language

Warm paper, navy interludes, book-serif headlines, system-sans body text, generous margins, and thin editorial rules. No external font installation or font request.

| Token | Value | Purpose |
|---|---|---|
| paper | `#f2efe9` | Reading ground |
| paper2 | `#e6e2d9` | Deeper warm fills |
| ink | `#1f2933` | Primary text |
| muted | `#77808c` | Secondary labels |
| navy | `#182030` | Covers and interludes |
| olive | `#2f7d5b` | Open/cool pole, accent |
| rust | `#c1502f` | Closed/warm pole, accent |
| amber | `#b07d2b` | Accent |
| violet | `#4a6fa5` | Institutional blue accent |

- A fixed **1600 × 900** canvas scales uniformly and centers in the available viewport. Never stretch or crop the canvas to fill a screen.
- Empty dividers and `@part` advance the accent cycle: olive → violet → rust → amber. Their authored heading becomes the inherited eyebrow. `@hue` and `@eyebrow` override one slide.
- Accent cycling indicates structure, not political meaning. Only `@polarity` explicitly sets the left comparison column to rust and the right to olive.
- Facts use a rail separated by thin rules. Children stay smaller and indented under their parent.
- No corner numerals, OPEN/CLOSED chips, or on-slide navigation pad. A **4px bottom progress line** is the only persistent visual navigation mark in a teaching deck.
- Programmatic fitting reduces text only to a bounded floor (75% of its base size); it never deletes content. The browser export gate renders every slide, checks fit, and stops on remaining overflow. Splitting a crowded slide is the author's job.
- Bounds checking is not a substitute for judgment: view the deck on the actual classroom screen. Automatic fitting cannot decide whether a line break is elegant or a figure is pedagogically legible.

### Named school palettes (v1.1)

The table above defines **Chartroom Classic**, which remains the default and is unchanged. The course-wide **Deck palette** control also offers:

| Palette | Main colors | Supporting accents | Reading ground |
|---|---|---|---|
| Buster | `#990026` burgundy, `#ffffff` white, `#000000` black | `#999999`, `#497791`, `#2E9FC9` | `#f3f0eb` |
| Agnar | `#00275D` navy, `#B2223B` red | `#3C5383`, `#ABADB0` | `#FFFFFF` |

School colors are exact: primary-color covers, interludes, headlines and library sidebars; reversed white titles; blue/red accents and gray rules. School covers/interludes have a 12px accent edge. Gray and bright blue are not used for small low-contrast text. Supporting shades are Buster secondary text `#595959` and small open-pole labels `#416a81`; Agnar secondary text `#596273` and pale card fills `#f1f3f7`. Credits on dark grounds use white. Photo veils keep their original opacity but adopt the selected primary hue.

The existing `olive`, `rust`, `violet`, and `amber` annotation names remain semantic slots, not literal color requests. Buster remaps them to `#497791`, `#990026`, `#990026`, and `#2E9FC9`; Agnar to `#3C5383`, `#B2223B`, `#B2223B`, and `#ABADB0`. Closed remains warm/red, open remains cool/blue. Explicit polarity headings use warm/cool colors; other school headings and eyebrows use the primary school color, or white on dark slides.

A palette changes presentation, never notes, slide ordering, private annotations, or reveal behavior. `course.palette` is validated against named constants; unknown values are rejected, never interpolated as CSS. Missing values mean Classic. Preview and browser preflight use the same selected palette as both exports. Use a Studio copy that recognizes the selected palette ID; earlier copies do not recognize later additions.

### Editorial palettes

The updated local Studio also includes four editorial palettes. Classic, Buster and Agnar keep their original rendering.

| Palette / ID | Reading ground / text | Cover | Warm / cool accents |
|---|---|---|---|
| Atlantic / `atlantic` | `#F4F7FA` / `#172A3A` | `#174A7E` | `#B64B2C` / `#006D77` |
| Field Notes / `field-notes` | `#F4F1E8` / `#263B32` | `#264C3B` | `#9B542C` / `#376B63` |
| Aubergine / `aubergine` | `#F7F1ED` / `#352B37` | `#51344D` | `#A64B35` / `#286B68` |
| Night Seminar / `night-seminar` | `#17212B` / `#EEF2F3` | `#101820` | `#E8A36C` / `#7FCBC4` |

The first three use quiet, light content surfaces and colored covers. Night Seminar uses dark reading surfaces, darker covers/sidebar, lighter `#243444` card and takeaway panels, `#B3C0CC` secondary text, and a dark browser color-scheme. Warm/cool labels remain text-labeled; color is not the only cue.

Small text is checked against its actual surface. Dark cover/part/statement meter labels use supporting apricot `#F2BC8C` and aqua `#7FCBC4`, rather than the darker accent inks of the light palettes. Takeaways explicitly use the normal text color on the panel surface, even on a dark slide. Card and takeaway panels are separated by space. Captions and library controls receive palette-aware text colors.

These choices preserve the existing slide structure, system fonts, reveal rules and offline exports. Photo overlays are not a guarantee of readability for every imported photograph; inspect those slides. Night Seminar especially needs a real-projector check in bright rooms. Open [the comparison page](PALETTES.html) to see identical demonstration slides in all four palettes.

## 4. Images are real, local assets

- Images must be provided by the author: PNG, JPEG, GIF, or WebP. No web search, hotlinked image, SVG, guessed photo, or substitute evidence.
- `@photo` uses a **0.34 dark veil**; `@somber` uses **0.62**. Background images use cover sizing and may crop. The author chooses solemn treatment explicitly.
- `@img` and portraits use **contain** sizing: the full image remains visible. Use this for graphs, memes, illustrations, and text-bearing figures.
- Exports keep image bytes in separate relative files, so a human can replace an image. Studio's private project embeds them only to make saving and transfer reliable.
- The image path in the notes must exactly match the project's local asset path. Missing images block export. Browser export also checks actual image decoding.
- Authors provide alt text, credit, license, and verified attribution. The tool does not certify rights, accuracy, or permission to distribute an image.

## 5. Meters are claims made by the author

No meter unless explicitly annotated. Values must be between 0% and 100%. By default, Closed is at the left and Open at the right, using the palette’s warm and cool colors (rust and olive in Classic). Labels sit **above** the gradient track. Dual policy meters retain the author's directive order and labels. The software never assigns a historical openness score.

`@spectrum Left label | Right label`, on its own line, replaces the endpoint text for that slide’s `@lens` axis and all its `@slider`, `@slider1`, and `@slider2` meters. It changes neither the numeric values nor the colors or individual meter names. It does not create a meter or axis by itself. The labels are per-slide: they do not inherit, and there is no global setting. Without the directive, Closed/Open is unchanged. The **Insert an element or tool** menu includes spectrum labels.

## 6. Teaching and review are different products

**Teaching:** facts reveal one top-level point at a time; its children appear with it. Right/Space/PageDown advances a reveal, then a slide. Left/PageUp reverses reveals, then the slide. Home/End go to the endpoints. `@norev` or `@flash` reveals all facts immediately. Cards and columns show their complete authored structure. Position is saved under a content-specific key when browser storage is available; corrupted or blocked storage does not stop the deck.

**Review:** every point is visible. Selecting or reselecting any lecture starts at slide one. Previous/Next move whole slides and stop at boundaries. No teaching resume state is used. The navy-sidebar library is a separate output, with a coming-soon state, keyboard support, mobile lecture menu, and fullscreen viewing.

Inactive slides are hidden and inert. Printing shows all slides and all reveals. System fonts can differ by operating system, so pixel-perfect typography across machines is not promised. Small portrait screens preserve the canvas rather than making classroom-sized text magically large; landscape/fullscreen is recommended.

## 7. Offline, portable, and explicit

The runtime is HTML/CSS/JavaScript. An extracted local copy runs in a modern desktop browser without a server, developer installation, or network connection. A hosted copy needs a connection to load; there is no service worker or guaranteed offline reload. Browser support is recorded in [verification](../VERIFICATION.md). Projects stay in the browser unless you save or share them yourself; there is no cloud sync. Browser localStorage is an unencrypted draft cache, not a backup. Use **Save project** before changing origins, browsers, or local copies, then **Open project** in the new app.

The project is the source of truth. Exports are snapshots. Updating notes does not alter old downloads, another person's files, or a hosted site. Sharing and publication are manual. Export never pushes GitHub or deploys Apps Script.

## 8. Conversion produces a draft, not a finished lecture

**Convert text / slideshow** opens **Convert to draft notes**. It accepts pasted text or a `.txt`, `.md`, `.pptx`, `.html`, or `.htm` file, with an optional title. Processing stays in the browser, with no uploads, and works in the extracted offline app. Google Slides and Keynote presentations must be exported as `.pptx`; older `.ppt` and PDF are unsupported. Export to `.pptx` or paste text instead.

The draft is editable before **Save draft .md** or **Add as new draft lecture**. Adding creates a separate unavailable (**Coming soon**) lecture, never overwrites the current lecture, and does not make the draft public. Its library label may still appear. Review before making it available.

Conversion approximates headings, list hierarchy, and slide boundaries without rewriting the source wording. It does not import images, charts, animations, or slide layout. This is a separate preparation step, not a relaxation of the annotation compiler’s strict grammar. **Import .md / .txt notes** remains the exact-annotations path. The legacy Python converter remains the fidelity-oriented option for supported older Chartroom HTML.

PPTX speaker notes remain private, and explicit source private annotations are protected. Ambiguous Chartroom syntax may be placed in private notes with a warning for cleanup. Raw text and HTML still require a privacy review: no unmarked prose is inferred to be secret. Saved draft notes, like other source `.md` files, can contain private material and are not public handouts.

## 9. Customization and extensions

The engine is intentionally readable: grammar in `src/parser.js`, layout/CSS/player in `src/renderer.js`, project/ZIP checks in `src/package.js`, real-browser export gate in `src/preflight.js`, workshop UI in `src/app.js` and `src/studio.css`. The parser exposes its core rules as `ChartroomParser.rules`.

To add a notation or change a design rule: write a failing test, update the parser/model and renderer consistently, update this rulebook and its examples, then run unit, browser, extracted-archive, and privacy checks. Never extend a directive by silently changing its existing meaning.
