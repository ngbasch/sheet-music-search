# Sheet Music Search

A free, static website for turning a pile of PDF fake books into a searchable index — built to work well on iPad (add to Home Screen, tap a result, land right on the tune).

## Goal

I have a pile of fake book PDFs and an existing index of what's in them. I want to:
1. Search for a tune by **song title**.
2. Tap a result and land directly on that tune, ready to read, on my iPad.
3. Pay nothing to host it.

This is *not* an Optical Music Recognition (OMR) project — we're not trying to read notes off the page. It's a searchable card catalog for PDFs you already have. Exactly how a result gets displayed (an embedded PDF jumped to a page, an extracted single-page image, a link that opens the PDF app to the right spot, etc.) is an open question, not a decided detail — pick whatever ends up simplest and most reliable on iPad.

This is a one-time conversion of a fixed personal library, not an ongoing content pipeline — there's no workflow here for adding new books later.

## Plan

### 1. Library format
- The 11 fake books in `library/` (Real Book I/II/III, New Real Book I/II/III, Colorado Cookbook, Jazz LTD, Jazz Fakebook, Bill Evans Fakebook, Library of Musicians' Jazz) were scanned page images — originally 25–115 MB each, and two exceeded GitHub's 100 MB per-file hard limit. They've been recompressed: each page is rasterized to 1-bit at 200 dpi (`pdftoppm -mono`), CCITT Group 4-compressed (`tiffcp -c g4`), and reassembled into a PDF (`img2pdf`). Page counts are unchanged and notation is still fully legible; every file is now comfortably under the 100 MB limit (worst case ~82 MB). Note: an initial pass using plain Ghostscript recompression (`gs -dPDFSETTINGS=/ebook`) silently corrupted 10 of the 11 files — it dropped one internal object per file, which was why some books wouldn't open. Confirm any future re-compression with `qpdf --check` before trusting it.
- `INDEXES.PDF` was **already a master index** for the other 11 books — title → book name → printed page number, covering all of them (there's also a "Commercial Master Index" for a 12th book, "The Book," that isn't actually part of this library, so it's skipped).
- `scripts/build_index.js` parses `INDEXES.PDF` (via `pdftotext -layout`) into `library/index.json` — 3,591 entries, one per tune:
  ```json
  {
    "title": "All Blues",
    "book": "RealBk2",
    "bookName": "The Real Book II",
    "file": "REALBK2.PDF",
    "page": 34,
    "pdfPage": 41
  }
  ```
- `page` is the printed page from the index; `pdfPage` is the actual PDF page to jump to. The offset between them (front matter/covers) was measured per book by rendering sample pages and reading the printed number, then hardcoded per book in the script (e.g. Real Book I is +13, Jazz Fakebook is −1). Re-run with `node scripts/build_index.js` if `INDEXES.PDF` or the offsets ever change.

### 2. Search UI — built
- Single-page static site: `index.html` + `app.js` + `style.css`, no build step, no framework.
- [Fuse.js](https://www.fusejs.io/) (CDN) does fuzzy client-side search over `library/index.json` — typing "aireign" still finds "Airegin."
- Results list shows title + book + printed page (a tune can appear in more than one book — all matches show up); tapping one opens an in-page PDF viewer.
- **How a result opens:** an `<iframe>` pointed at `library/BOOK.PDF#page=N`, jumped straight to the tune, with a "Download" fallback link and a "Back" button. This was the simplest option and works in desktop/iPad Safari; if it turns out to be unreliable in practice, the per-tune-extracted-page approach from the earlier plan is the fallback.

### 3. Hosting
- **GitHub Pages**, free, served straight from this repo (`main` branch, `/` root). Not yet enabled — see Status.
- No backend, no database — `index.json` + static PDFs + `index.html`/`app.js`/`style.css` is the entire app.

### 4. iPad experience — built
- `manifest.json` + `sw.js` so Safari's "Add to Home Screen" gives it an app icon (currently a plain placeholder square in `icons/` — swap in a real icon whenever) and caches already-opened PDFs for offline use.
- Layout tuned for portrait iPad use: large tap targets, search box pinned to top, full-screen PDF viewer.

## Non-goals (for now)
- OCR'ing text printed on the page.
- Reading actual musical notation (OMR) for melody-based search.
- Multi-user accounts, sharing, or editing PDFs in-browser.

These could be revisited later, but title search over the existing index covers the actual use case: finding a tune I already own and reading it.

## Status
- [x] Shrink the oversized PDFs so every file fits comfortably under GitHub's limits
- [x] `scripts/build_index.js` to parse `INDEXES.PDF` into `library/index.json`
- [x] Scaffold static site (`index.html`, search UI wired to Fuse.js)
- [x] PDF viewer flow (in-page `<iframe>` jumped to page + download fallback)
- [x] `manifest.json` / Home Screen support (real icon still a placeholder)
- [ ] Enable GitHub Pages (repo Settings → Pages → deploy from `main` / root)
- [ ] Try it for real on an iPad — confirm the `#page=N` jump and offline caching actually work in iPad Safari; swap in a different viewer approach if not
- [ ] Replace the placeholder `icons/icon-*.png` with a real icon
