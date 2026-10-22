# Developing Chartroom Studio

This repository is the canonical working source for Chartroom Studio 1.3. Make future changes here, not in an extracted offline distribution or an older fallback copy. Keep personal projects and teaching material outside the repository.

Opening `index.html` in a browser requires no installation. The tools below are for contributors who run tests, convert older decks, or build releases.

## Set up the development tools

Use Node.js 22 or later and Python 3. Run these commands from the repository root:

```bash
npm ci
npx playwright install chromium
python -m pip install -r requirements-dev.txt
```

Tests normally use the Chromium installed by Playwright. Set the `BROWSER_PATH` environment variable to use an existing compatible Chrome or Edge executable instead. `PLAYWRIGHT_PATH` and `PYTHON` can also override the test tooling when needed.

The browser app uses local classic scripts and styles. It has no runtime package installation or build step.

## Source layout

| File | Responsibility |
|---|---|
| `src/parser.js` | Annotation grammar, model, and source-line diagnostics |
| `src/renderer.js` | Slide layouts, palettes, teaching player, and review library |
| `src/package.js` | Project validation, image/path checks, and export ZIPs |
| `src/preflight.js` | Browser image decoding and slide-overflow checks |
| `src/insert.js` | Editor insertion templates and placement rules |
| `src/presenter.js`, `src/presenter.css` | In-app teaching presentation and exit behavior |
| `src/app.js`, `src/studio.css`, `index.html` | Studio editor and browser storage |
| `tests/`, `scripts/test.cjs` | Automated checks and test runner |
| `public-files.json` | Exact file lists for public distributions |
| `scripts/build-handbook.py` | Generated HTML handbook |
| `scripts/build-release.py`, `scripts/check-release.py` | Release packaging and archive checks |

`CONTRACT.md` at the repository root defines module interfaces. The [rules](RULES.md) and [annotation reference](ANNOTATIONS.md) define author-facing behavior. Keep these in step with the code.

## Change and test

1. Add a failing regression test for the behavior you are changing. Use synthetic fixtures and public examples, not private lecture archives.
2. Update source modules without silently changing existing annotation meanings. Preserve authored wording, image paths, slide order, private-note removal, and teaching/review differences.
3. Update the Markdown guides and examples. Edit the source guides, not generated handbook HTML.
4. Run the full suite and hosted-mode checks:

```bash
npm test
npm run check-hosted
```

Hosted-mode tests run against local HTTP hosting. They do not deploy to GitHub or verify a live Pages address. Do not report a test as passing unless you ran it on the current files.

For presentation changes, check keyboard navigation, rejected-fullscreen fallback, focus restoration, and Escape returning to the private editor. For parser, renderer, or packaging changes, check that public HTML and ZIPs contain neither private annotations nor embedded project source.

## Build and check distributions

After the current tests pass:

```bash
npm run docs
npm run release
npm run check-release
```

The release builder uses `public-files.json` rather than copying the working directory. Its verification gate checks that the runtime matches the latest test evidence. Rerun tests after runtime changes instead of bypassing that gate.

The generated outputs have different uses:

- `downloads/Chartroom-Studio-Offline.zip`: the app and user documentation for local use without developer tools.
- `dist/Chartroom-Studio-GitHub.zip`: the clean public source repository, including the offline download for the hosted app.

Private lectures, test-run artifacts, temporary files, `node_modules`, and generated verification reports do not belong in either distribution. Review the exact manifest lists when adding a public asset or guide. Release checks must cover both extracted ZIPs, not just the source folder.

Update [VERIFICATION.md](../VERIFICATION.md) with real commands, environments, results, and remaining limitations. Regenerate the handbook and rebuild/recheck archives after final documentation changes so shipped guides match the source. The internal machine-generated verification report is test evidence, not a public download.

Publishing remains manual. Follow `GITHUB.md` at the repository root; no build command should push or deploy. `.gitignore` is not a safety filter for arbitrary web uploads.

## Spectrum labels and draft conversion

`@spectrum Left label | Right label` is slide-local metadata, exposed through **Insert an element or tool**. Apply it to the slide’s `@lens` axis and every `@slider`, `@slider1`, and `@slider2` meter, without altering values, meter names, or colors. Preserve Closed/Open when absent; do not introduce inheritance or a course-wide setting. Keep the parser, renderer, insertion rules, privacy handling, preview, and both exports consistent.

The sidebar’s **Convert text / slideshow** opens the **Convert to draft notes** modal. It accepts pasted text or `.txt`, `.md`, `.pptx`, `.html`, and `.htm` files, plus an optional title. The result is an editable draft with **Save draft .md** and **Add as new draft lecture** actions. Adding must create a separate lecture with `available:false` (**Coming soon**), not overwrite the selected lecture or publish the result. A library label can still appear for an unavailable lecture.

Keep this browser-local and usable in the extracted offline app: no uploads, remote conversion service, or runtime network dependency. Conversion approximates headings, lists, and slide boundaries without rewriting wording. Images, charts, animations, and layout are outside its import scope. Google Slides/Keynote inputs require `.pptx` export first. Reject older `.ppt` and PDF with a useful suggestion to export `.pptx` or paste text.

Protect PPTX speaker notes and explicit source private annotations. Ambiguous Chartroom syntax may be retained as private notes with a cleanup warning; never recover it by silently publishing the private payload. Raw text and HTML need author review, because the converter cannot infer that unmarked prose is secret. Imported HTML is input to extract from, not a document to execute. Preserve **Import .md / .txt notes** as the separate exact-annotations path.

For changes in these features, cover the following in the integration checks:

- Default and custom labels on axes, single meters, and named meters; per-slide isolation; unchanged numeric values and palette colors; insertion and public-output privacy.
- Supported source formats, approximate hierarchy, unchanged wording, malformed/unsupported inputs, and clear warnings for content needing review.
- PPTX speaker notes, explicit private annotations, and ambiguous syntax kept out of public output; raw text/HTML limitations explained without promising inferred privacy.
- Edited draft download and new-lecture creation, unavailable-by-default status, preservation of existing lectures, and operation in local-file and hosted modes without conversion uploads.

These are verification requirements, not a report of checks already run. Record actual results in [VERIFICATION.md](../VERIFICATION.md) after integration; regenerate the handbook and distributions only after the final source and documentation updates.

## Legacy conversion of an older Chartroom deck

The fidelity-oriented Python command-line converter accepts supported older Chartroom HTML markup, not arbitrary presentations. It is separate from the browser draft converter and can map known older layouts and package local images. See the [annotation reference](ANNOTATIONS.md) for its command, mappings, and limitations. Keep input decks, converted notes, projects, and images outside the repository. Inspect the converted notes and run Studio's browser checks before sharing an export.

## Storage and portability

A `.chartroom.json` file is private authoring data, not an app source file. **Save project** writes the portable backup; browser `localStorage` is only a draft cache. Moving to a different origin, browser profile, or local file location may make that cache unavailable. Use **Save project** in the old app and **Open project** in the new one.

Do not add cloud sync, external assets, or network-dependent runtime behavior without explicitly reviewing the privacy and offline-use contract. The hosted app needs a connection to load again; it has no service worker guaranteeing offline reload.
