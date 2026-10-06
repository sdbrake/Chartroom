# Publish Chartroom Studio on GitHub Pages

These are manual steps for the repository owner. Nothing in Studio pushes files, creates a repository, or publishes a site. No hosted address has been chosen or verified for this release yet.

## Prepare the public files

Finish the checks in `docs/DEVELOPING.md` and update `VERIFICATION.md` with actual results before publishing.

Use one of these sources:

- Extract `dist/Chartroom-Studio-GitHub.zip` and upload its reviewed contents.
- Use reviewed tracked files from the canonical source repository, including the generated offline download required by the hosted app.

Do not upload the entire working folder. Keep personal `.chartroom.json` projects, source notes, private lectures, temporary exports, test artifacts, and local backups outside the public upload. The supplied demonstration project is a public example, not a place for personal lecture material.

**`.gitignore` does not protect arbitrary files dragged into GitHub's web upload page.** It also does not remove files already tracked by Git. Review the actual files to be published, including archive contents.

The repository ZIP is for the public source repository and hosted app. `downloads/Chartroom-Studio-Offline.zip` is the separate user download. Do not upload either archive in place of extracting the repository ZIP's contents.

## Publish from main and the root

1. Sign in to GitHub and create or choose the repository you intend to publish. Review its visibility; the instructions here assume a public repository.
2. Upload the clean repository contents to the `main` branch, or commit and push the reviewed tracked files yourself. Put `index.html`, `src/`, `docs/`, `downloads/`, and `.nojekyll` at the repository root, not inside another enclosing folder. Check that `.nojekyll` was included; file pickers may hide dotfiles.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose **main** and **/ (root)**, then save.
6. Wait for GitHub's Pages deployment to finish. Use the address GitHub displays in Pages settings; do not assume an address before that step.
7. Open the site in a fresh browser tab. Check the demonstration, previews, palette comparison, handbook links, **Present lecture**, project save/open, and both exports. Download **Download offline Studio**, extract it, and open its `index.html` locally.
8. Record the actual site address, browser, date, and results in `VERIFICATION.md`. A local HTTP test is useful, but it is not proof that GitHub Pages deployed successfully.

If **Settings → Pages** is unavailable, check repository permissions and the account's Pages eligibility before changing the project structure.

## Update the site later

Make changes in the canonical source repository. Run the tests, regenerate the handbook and both release ZIPs, and review the files again. Upload or push the updated public files yourself. Wait for deployment, then check the live site and offline download.

Publishing Studio does not publish anyone's browser drafts. It also does not update teaching or student exports that were previously shared. To publish a course review site, use a separately reviewed **Student library .zip** export and preserve its extracted folder structure.

When moving your own work between local Studio and the hosted site, use **Save project** in the old copy and **Open project** in the new one. Browser autosave does not move with the app.
