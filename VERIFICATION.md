# Verification status

## Editable spectrum labels and draft conversion (2026-10-21)

The maintained source now supports per-slide `@spectrum Left label | Right label`, including lens axes and meters. The separate **Convert text / slideshow** window creates reviewable draft notes from pasted text and UTF-8 `.txt`, `.md`, `.html`/`.htm`, or `.pptx` files. It preserves the current lecture and adds converted lectures as unavailable until reviewed.

- Latest full `npm test`: **26 stages passed**, including 96 core/player/spectrum/outline tests, 5 legacy-converter tests, and 39 draft-converter tests, with no failures or skips. Runtime hashes match the tested source.
- Real browser feature workflows passed in **Chrome 156.0.8078.47** and **Edge 155.0.4283.62**: custom label fit, lens and meter preview, save/autosave, both public spectrum exports, draft editing and download, a real PPTX fixture, new-lecture preservation, pending-editor work, unsupported-file recovery, strict UTF-8 rejection, and teaching export.
- Privacy and input regressions include private multiline headings, hidden HTML ancestors, inert HTML without script execution/resource fetching, private PPTX speaker notes, malformed archives/XML, bounded expansion and adversarial bracket scans. Independent follow-up review passed the hidden-ancestor, raw-outline, multiline HTML privacy, and shared file-ingestion checks.
- Both new feature tests also passed against the actual **extracted offline archive** with network disabled and the actual **extracted repository archive served under a local HTTP subdirectory**.
- Both distributions were rebuilt from the reviewed allowlist: **47 offline ZIP members** and **94 repository ZIP members**, including its offline download. Archive CRCs, exact source bytes and local HTML links passed. The extracted-app browser check passed project reopen/images, presentation/navigation/exit, project/teaching/student downloads, hosted download, and absence of unintended network/original-folder requests or JavaScript errors.
- Combined release-check commands intermittently reached their outer tool timeouts after hosted checks passed. Standalone browser reruns and an instrumented combined check passed. The release browser test now has explicit operation and hosted-child timeouts rather than allowing indefinite waits; the original timing failure's cause was not established. The API diagnostic log remains local in `tests/artifacts/release-browser-debug.log` and is not shipped.
- Nothing has been pushed or deployed. The old offline fallback folder is unchanged. A live GitHub Pages deployment and classroom/projector use remain unverified.

**Conversion limits:** output is a starting draft, not slide reconstruction. Plain-text heading guesses need review. PPTX uses XML reading order; master/layout text, charts, embedded objects, images and animations are not imported, and tables become text rows. Older `.ppt` and PDF are unsupported. Ambiguous annotation syntax is retained in private notes with warnings, not silently published. Unmarked prose cannot be recognized as secret automatically.

## Preview-position fix (2026-10-20)

The slide preview now retains its current slide and teaching reveal step when edits rebuild the same lecture. Palette/mode changes retain the slide; temporary invalid annotations preserve the last good position. Removing the current final slide clamps the position to the remaining deck. Selecting another lecture or opening/replacing a project starts at the beginning. Preview-only state is not added to exported decks, and the iframe remains sandboxed with `allow-scripts` only.

- The new real-browser regression failed before the fix: editing the second slide displayed the cover. It now passes in installed Chrome and Edge.
- The latest full `npm test` passed all 23 stages in Chrome 155.0.8059.85: 79 core/player tests and 5 converter tests passed with no failures or skips, along with all browser integration and public-packaging checks.
- The first full run timed out in the existing presentation-navigation test. That test passed in isolation and the complete rerun passed without changing the test or presentation code. The first-run log/report are retained locally as `tests/artifacts/preview-fix-chrome-first-run.*`; the cause of that transient timeout was not established.
- The updated allowlist contains 87 repository ZIP members (including the offline download) and 46 offline ZIP members. Use the release checks below to verify rebuilt archives against current source bytes and exercise their extracted applications.
- Nothing has been pushed or deployed. The old offline fallback folder is unchanged; the maintained copy is the publication-staging source.

## Original Chartroom Studio 1.3 release checks (2026-10-06)

Verified locally on 2026-10-06 on Windows. Nothing has been pushed or deployed to GitHub Pages; a live site remains to be checked after the owner publishes it.

### Automated results

| Check | Actual result |
|---|---|
| `npm test` with installed Chrome | Passed all 22 stages; 79 core/player tests and 5 public converter tests, with zero failures or skips; packaging unittest passed |
| Hosted browser checks inside `npm test` | Passed at a local HTTP subdirectory; exact UI wording, project import, autosave/reload, exports and presentation after disconnecting |
| `npm run docs` | Generated the public handbook from its source guides |
| `npm run release` | Passed the runtime-hash gate; produced both deterministic allowlisted ZIPs and SHA-256 sidecars |
| `npm run check-release` in Chrome and Edge | Both actual archives extracted and checked against source bytes; CRCs and all applicable local HTML links passed; hosted download worked |
| Extracted offline app in Chrome and Edge | Reopened a portable project, decoded its images, presented/navigated/exited, and downloaded project/teaching/student outputs; no requests to the original folder or network |
| Edge presentation boundaries | Native fullscreen, unavailable/rejected API fallback, rapid close/reopen, focus restoration, immutable snapshot, cancellation, invalid-image/overflow checks, private diagnostics and forged-message rejection passed |
| Public-file audit | ZIP members exactly matched the reviewed manifest plus the generated offline download; no personal filesystem paths or private course references found |

The full suite used Node.js v22.23.2 and Chrome 154.0.8037.98. Additional archive/presentation checks used Edge 153.0.4234.32. Both browser paths were supplied through the supported `BROWSER_PATH` environment variable. Browser integration checks reported no JavaScript errors or unintended network requests.

The public repository ZIP contains 86 files, including its offline download. The offline ZIP contains 46 files. Private projects, lecture archives, backups, dependencies, test output and internal verification logs are excluded. Converter fixtures are synthetic and do not require the author's teaching folders.

### Reproducing the checks

Follow `docs/DEVELOPING.md` in the source repository for dependency installation, then run:

```bash
npm test
npm run docs
npm run release
npm run check-release
```

Use Playwright's installed Chromium, or set `BROWSER_PATH` to an installed compatible browser executable. Runtime hashes and command results are recorded locally in `tests/artifacts/verification.json`; full output is in `tests/artifacts/verification.log`. Those machine-specific files are not shipped. Rebuild and recheck archives after documentation changes too.

### Not yet verified

- A live GitHub Pages deployment and its actual public URL.
- A manual classroom/projector session or every browser and operating system.

### Limits

- Browser layout checks cannot establish classroom readability. Inspect images and text on the intended display.
- The hosted app has no guaranteed offline reload. Use an extracted offline copy when connectivity is uncertain.
- Browser autosave is not a backup, encrypted storage, or cloud sync. Save a private project file before moving browsers, origins, or local copies.
- Escape and other presentation exits return to the private editor. Blank the projector or stop screen sharing before editing sensitive notes.
