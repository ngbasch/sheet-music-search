# Sheet Music Search

A free, static website for digitizing a personal sheet music library (PDFs) into a searchable index — built to work well on iPad (add to Home Screen, tap a result, view the PDF).

## Goal

I have a pile of sheet music PDFs. I want to:
1. Search for a piece by **song title** or **composer**.
2. Tap a result and read the PDF right there on my iPad.
3. Pay nothing to host it.

This is *not* an Optical Music Recognition (OMR) project — we're not trying to read notes off the page. It's a searchable card catalog for PDFs you already have, with a viewer on top.

## Plan

### 1. Library format
- All PDFs live in `library/` in this repo (sheet music files are small — a few hundred KB to a few MB each — so GitHub's repo/file size limits aren't a concern for a personal collection).
- Each PDF gets one entry in `library/index.json`:
  ```json
  {
    "id": "clair-de-lune-debussy",
    "title": "Clair de Lune",
    "composer": "Claude Debussy",
    "tags": ["piano", "solo", "impressionist"],
    "file": "clair-de-lune-debussy.pdf"
  }
  ```
- A small script (`scripts/build_index.js`) scans `library/` and regenerates `index.json` from filenames + a sidecar `library/metadata.csv` (title, composer, tags per file) — so adding a new piece is: drop the PDF in the folder, add one CSV row, run the script.

### 2. Search UI
- Single-page static site (plain HTML/CSS/JS — no build step, no framework, so it's trivial to maintain and deploy).
- [Fuse.js](https://www.fusejs.io/) (loaded from a CDN) does fuzzy client-side search over `index.json` — typing "debusy" or "clair" both find "Clair de Lune."
- Results list shows title + composer; tapping one opens the PDF in an in-page viewer (`<embed>`/`<iframe>` pointing at the PDF, with a "download" fallback link) rather than navigating away.
- Optional: tag filter chips (e.g. "piano," "duet") above the search box.

### 3. Hosting
- **GitHub Pages**, free, served straight from this repo (`main` branch, `/` root or `/docs`).
- No backend, no database — `index.json` + static PDFs + one HTML/JS file is the entire app.

### 4. iPad experience
- Add a `manifest.json` + minimal `sw.js` (service worker) so Safari's "Add to Home Screen" gives it an app icon and lets already-viewed PDFs open offline.
- Responsive layout tuned for portrait iPad use (large tap targets, search box pinned to top).

### 5. Adding new music (the ongoing workflow)
1. Drop the PDF into `library/`.
2. Add a row to `library/metadata.csv` with title/composer/tags.
3. Run `node scripts/build_index.js` to regenerate `index.json`.
4. Commit and push — GitHub Pages redeploys automatically.

## Non-goals (for now)
- OCR'ing text printed on the page.
- Reading actual musical notation (OMR) for melody-based search.
- Multi-user accounts, sharing, or editing PDFs in-browser.

These could be revisited later, but metadata search (title/composer/tags) covers the actual use case: finding a piece I already own and reading it.

## Status
- [ ] Scaffold static site (`index.html`, search UI wired to Fuse.js)
- [ ] `scripts/build_index.js` to generate `library/index.json`
- [ ] Add first batch of PDFs + metadata
- [ ] PDF viewer flow (in-page embed + download fallback)
- [ ] `manifest.json` / Home Screen support
- [ ] Enable GitHub Pages
