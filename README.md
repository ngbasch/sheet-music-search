# Sheet Music Search

A free, static website for turning a pile of PDF fake books into a searchable index — built to work well on iPad (add to Home Screen, tap a result, land right on the tune).

**Live site:** https://ngbasch.github.io/sheet-music-search/

## What it does

Search 3,591 tunes across 11 fake books by title, tap a result, and it opens the PDF jumped straight to that tune's page — no OCR, no music notation recognition, just a searchable card catalog for PDFs you already have.

## How to use it

1. Open the [live site](https://ngbasch.github.io/sheet-music-search/) on your iPad (or any browser).
2. On iPad, tap Safari's Share button → **Add to Home Screen** for an app-like icon and offline access to PDFs you've already opened.
3. Type a tune title (fuzzy matching is fine — typos are okay).
4. Tap a result to open the PDF at that tune's page. Use the "Back" button to return to search, or "Download" to save the PDF.

## Project structure

- `index.html` / `app.js` / `style.css` — the search UI (no build step, no framework, [Fuse.js](https://www.fusejs.io/) via CDN for fuzzy search).
- `library/index.json` — the tune index (title, book, page) generated from `INDEXES.PDF`.
- `library/*.PDF` — the 11 fake books.
- `scripts/build_index.js` — regenerates `library/index.json` from `INDEXES.PDF`.
- `manifest.json` / `sw.js` — Home Screen / offline support.

See [plan.md](plan.md) for the full build plan, implementation notes, and status.
