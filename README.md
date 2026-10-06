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
2. Write in **Annotated notes**, or choose **Import .md / .txt notes**. Each imported file becomes a new lecture; the original file is unchanged.
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

Layouts include facts, cards, named columns, quotations, full-bleed photos, whole-image exhibits, paired portraits, scholar citations, and a closed/open axis. Meters use values you supply. The seven palettes are Chartroom Classic, Buster, Agnar, Atlantic, Field Notes, Aubergine, and Night Seminar. See the [annotation reference](docs/ANNOTATIONS.md), [rules](docs/RULES.md), and [palette comparison](docs/PALETTES.html).

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

## Conversion, development, and publishing

The source repository includes an optional Python tool for converting supported older Chartroom HTML decks. It is not a general PDF, PowerPoint, or Word converter, and it is not a browser import control. See [conversion syntax](docs/ANNOTATIONS.md) and the [developer guide](docs/DEVELOPING.md).

This repository is the canonical working source for future changes. The offline download is a generated distribution, not a separate codebase. Developers should edit the source, update tests and documentation, then rebuild the distributions. Keep private teaching projects elsewhere.

Repository owners can follow `GITHUB.md` in the source repository to publish manually from `main` and the repository root. Upload only the clean repository ZIP contents or reviewed tracked files, never a working folder containing personal projects. `.gitignore` does not protect arbitrary files uploaded through GitHub's web interface.

[Verification status](VERIFICATION.md) records release checks and limitations. Code is MIT-licensed; rights to imported images and lecture content remain separate.
