# Chartroom Studio

Slideshow generator and converter.

Version 1.3 turns annotated lecture notes and local images into teaching slides and a student review library. Lecture notes and slideshows output separately.

## Open the app

You do not need to install Node.js, Python, or developer tools to use Studio. Use a modern desktop browser.

- **Hosted:** open the GitHub Pages address supplied by the repository owner. No hosted address has been chosen or verified for this release yet. The hosted app has a **Download offline Studio** link.
- **Local:** download `Chartroom-Studio-Offline.zip`, extract the entire archive, and open `START HERE.html` or `index.html` in your browser. Keep the extracted folder together. Do not open the app inside an archive viewer. A downloaded source repository can also run by opening its root `index.html`.

The local copy works without an Internet connection. A hosted tab processes your work locally after loading, but Studio has no service worker or guaranteed offline cache. Reloading or reopening the hosted page without a connection may fail. Download the offline copy before you need it.

## Make a lecture

1. Choose **Open demonstration**, **New blank project**, or **Open project** for a saved `.chartroom.json` file. Save your current project before replacing it.
2. Write in **Annotated notes**, or choose **Import .md / .txt notes** for files already written in Chartroom annotations. Each imported file becomes a new lecture; the original file is unchanged. For ordinary text or a slideshow, use **Convert text / slideshow** to prepare an editable draft instead (see below).
3. Use **Insert slide** for complete layouts and **Insert an element or tool** for individual annotations. Add images under **Local images**; their listed paths must match the notes exactly.
4. Choose a **Deck palette**, check the preview, and follow diagnostics to their source lines. Studio checks available lectures for missing or undecodable images and slide overflow before export. Split crowded slides in your notes.
5. Use **Save project** for a portable backup. Choose **Teaching decks .zip** or **Student library .zip** for the output you want to share. Extract the whole export before opening it.

```markdown
# Your lecture title

## Your main point
- Your exact words.
  - A dependent detail.
- Your next point.

*This explanation stays in your private notes.*

## A question for the class? @big
```

One `#` cover comes first; each `##` starts a slide. This is a restricted annotation language, not a general Markdown importer. `**Bold words**` are public; `*single-star asides*`, `%%private spans%%`, `@notes` lines, and HTML comments are private. Plain text is public, including any answer you leave unmarked.

Layouts include facts, cards, named columns, quotations, full-bleed photos, whole-image exhibits, paired portraits, scholar citations, and an axis with Closed/Open labels by default. Meters use values you supply. To use different endpoint labels, put `@spectrum Left label | Right label` on its own line inside the slide, or choose spectrum labels under **Insert an element or tool**. The labels apply to that slide’s `@lens` axis and any `@slider`, `@slider1`, or `@slider2` meters. They do not change values or colors, do not carry to the next slide, and have no global setting.

The seven palettes are Chartroom Classic, Buster, Agnar, Atlantic, Field Notes, Aubergine, and Night Seminar. See the [annotation reference](docs/ANNOTATIONS.md), [rules](docs/RULES.md), and [palette comparison](docs/PALETTES.html).

## Present a lecture

Select a lecture and choose **Present lecture**. Studio checks it and opens a fixed teaching-mode snapshot at the first slide, hiding the editor and private notes. Fullscreen is requested; when the browser refuses it, the deck fills the page instead.

- Right arrow, Space, or Page Down advances a reveal, then a slide.
- Left arrow or Page Up goes backward; Home and End jump to the endpoints.
- Tab or moving to the upper-right corner exposes the help/exit strip.
- Escape or **Exit presentation** returns to Studio.

**Exiting exposes the private editor again.** Blank the projector or stop screen sharing before leaving presentation mode if your notes must remain unseen. There is no separate private presenter window. Check legibility on the classroom display, especially for images and the dark Night Seminar palette.

## Save, share, and keep private

| Output | What it contains | Use |
|---|---|---|
| **Save project** (`.chartroom.json`) | All lecture source notes, private asides, course settings, and embedded images | Private backup and transfer; reopen with **Open project** |
| **Save .md** | The selected lecture's annotated source, including private notes; no embedded images | Edit or archive source; not a complete project backup |
| **Teaching decks .zip** | Public slides and referenced images for available lectures | Projection; facts reveal a parent point and its children together |
| **Student library .zip** | Public review slides, referenced images, and course navigation | Student review; all points visible, with Previous/Next and fullscreen |

Public exports omit private annotations and the source project. Lectures marked unavailable contribute only their library labels, not their content. Review the visible text and images yourself before sharing. Exports are snapshots: editing your project does not update an old download or a published course site. Share the student export with students, not your project or source `.md` files.

Studio processes projects in your browser and has no cloud sync or project-upload service. The hosted site still needs network access to load its app files. Local autosave uses browser `localStorage`; it is not encrypted storage or a backup. People who can access the same browser profile may be able to read it. Clearing site data, private browsing, storage limits, or changing browsers can remove or hide drafts.

Use **Save project** regularly and keep personal projects outside the source repository. Drafts are tied to a browser profile and origin; local-file storage also varies by browser and file location. Moving between an old app folder, a new local copy, and a hosted site does not transfer autosave. In the old app, use **Save project**; in the new app or site, use **Open project**.

## Convert text or a slideshow to draft notes

1. In the sidebar, choose **Convert text / slideshow**. The **Convert to draft notes** window opens without replacing your current lecture.
2. Paste text or choose a `.txt`, `.md`, `.pptx`, `.html`, or `.htm` file. A title is optional. For Google Slides or Keynote, export to `.pptx` first. Older `.ppt` files and PDFs are not supported; export to `.pptx` or paste the text instead.
3. Review and edit the draft in the window. Conversion approximates headings, list hierarchy, and slide boundaries; it does not rewrite your wording. For plain outlines, short lines at the start of paragraphs can become headings; these are guesses, not semantic analysis. Images, charts, animations, and original slide layout are not imported. Add needed images separately in Studio.
4. Choose **Save draft .md** to keep the annotated source, or **Add as new draft lecture** to add it to the project. A new draft lecture starts unavailable (**Coming soon**) so its content is excluded from public exports while you review it. Its library label can still appear. No existing lecture is overwritten. Make the lecture available only after checking its notes, preview, and diagnostics.

Conversion runs locally in the browser, without uploading your text or files, and works in the extracted offline app. PPTX speaker notes stay private, and explicit private annotations in the source are protected. Ambiguous Chartroom syntax may be placed in private notes with a warning so you can repair it rather than accidentally publish it. Review all warnings and compare the draft with the source.

**Check privacy before sharing.** Ordinary text and HTML still need your review: the converter cannot infer which unmarked prose is secret. Mark private material explicitly. A saved draft `.md` includes private notes and is not a student handout. Use **Import .md / .txt notes**, not conversion, when you already have exact Chartroom annotations to preserve.

## Development and publishing

The source repository also includes an optional, fidelity-oriented legacy Python tool for supported older Chartroom HTML decks. It preserves more of those decks’ known structure and can package their images; it is separate from the browser draft converter, not a general presentation importer. See [conversion syntax](docs/ANNOTATIONS.md) and the [developer guide](docs/DEVELOPING.md).

This repository is the canonical working source for future changes. The offline download is a generated distribution, not a separate codebase. Developers should edit the source, update tests and documentation, then rebuild the distributions. Keep private teaching projects elsewhere.

Repository owners can follow `GITHUB.md` in the source repository to publish manually from `main` and the repository root. Upload only the clean repository ZIP contents or reviewed tracked files, never a working folder containing personal projects. `.gitignore` does not protect arbitrary files uploaded through GitHub's web interface.

[Verification status](VERIFICATION.md) records release checks and limitations. Code is MIT-licensed; rights to imported images and lecture content remain separate.
