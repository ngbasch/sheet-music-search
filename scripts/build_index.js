#!/usr/bin/env node
// One-off parser: turns library/INDEXES.PDF's "Jazz Fakebooks Index" (pages 2-70)
// into library/index.json. INDEXES.PDF is a pre-existing master index across the
// other 11 fake books in library/ (title -> book -> printed page number); the
// "Commercial Master Index" (pages 71-81) covers a 12th book that isn't part of
// this library, so it's skipped entirely.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LIBRARY_DIR = path.join(__dirname, '..', 'library');
const INDEXES_PDF = path.join(LIBRARY_DIR, 'INDEXES.PDF');
const OUTPUT_JSON = path.join(LIBRARY_DIR, 'index.json');

const FIRST_PAGE = 2;
const LAST_PAGE = 70;

// Book tokens as they appear in the index -> actual filename in library/.
const BOOK_FILES = {
  RealBk1: 'REALBK1.PDF',
  Realbk1: 'REALBK1.PDF',
  RealBk2: 'REALBK2.PDF',
  RealBk3: 'REALBK3.PDF',
  NewReal1: 'NEWREAL1.PDF',
  NewReal2: 'NEWREAL2.PDF',
  NewReal3: 'NEWREAL3.PDF',
  Colorado: 'COLOBK.PDF',
  JazzLTD: 'JAZZLTD.PDF',
  JazzFake: 'JAZZFAKE.PDF',
  EvansBk: 'EVANSBK.PDF',
  Library: 'LIBRARY.PDF',
};

// Human-readable book names for display in the UI.
const BOOK_NAMES = {
  RealBk1: 'The Real Book I',
  Realbk1: 'The Real Book I',
  RealBk2: 'The Real Book II',
  RealBk3: 'The Real Book III',
  NewReal1: 'The New Real Book I',
  NewReal2: 'The New Real Book II',
  NewReal3: 'The New Real Book III',
  Colorado: 'The Colorado Cookbook',
  JazzLTD: 'Jazz LTD',
  JazzFake: 'The Jazz Fakebook',
  EvansBk: 'The Bill Evans Fakebook',
  Library: "Library of Musicians' Jazz",
};

// Offset between the printed page number (what INDEXES.PDF lists) and the
// actual PDF page number in each book, i.e. pdfPage = printedPage + offset.
// Determined empirically per book (front matter/covers push printed page 1
// to a later PDF page); JazzFake is -1 because its first couple of pages
// aren't counted in its own printed numbering. Verified against multiple
// pages per book by rendering and reading the printed page number.
const PAGE_OFFSETS = {
  RealBk1: 13,
  Realbk1: 13,
  RealBk2: 7,
  RealBk3: 5,
  NewReal1: 15,
  NewReal2: 12,
  NewReal3: 10,
  Colorado: 3,
  JazzLTD: 7,
  JazzFake: -1,
  EvansBk: 3,
  Library: 4,
};

const ROW_RE = /^(\S.*?)\s{2,}(\S+)\s+(\d+)\s*$/;
const BOOK_ONLY_RE = new RegExp(`^\\s*(${Object.keys(BOOK_FILES).join('|')})\\s*$`);
const BOOK_AND_PAGE_RE = new RegExp(`^\\s*(${Object.keys(BOOK_FILES).join('|')})\\s+(\\d+)\\s*$`);

function extractLines() {
  const text = execFileSync('pdftotext', [
    '-layout',
    '-f', String(FIRST_PAGE),
    '-l', String(LAST_PAGE),
    INDEXES_PDF,
    '-',
  ], { maxBuffer: 1024 * 1024 * 64 }).toString('utf8');
  return text.split('\n');
}

function parse(lines) {
  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const rowMatch = line.match(ROW_RE);
    if (rowMatch) {
      const [, title, book, page] = rowMatch;
      if (BOOK_FILES[book]) {
        entries.push({ title: title.trim(), book, page: Number(page) });
        continue;
      }
    }

    // Long titles sometimes wrap onto two lines: the title fills the whole
    // line (pushing book+page onto the next line with no title text on it).
    //   "<full title, too long to fit book/page on this line>"
    //   "                    <book>  <page>"
    const bookAndPageMatch = line.match(BOOK_AND_PAGE_RE);
    if (bookAndPageMatch && i >= 1) {
      const titleMatch = lines[i - 1].match(/^(.+?)\s*$/);
      if (titleMatch && !ROW_RE.test(lines[i - 1]) && !BOOK_ONLY_RE.test(lines[i - 1])) {
        entries.push({
          title: titleMatch[1].trim(),
          book: bookAndPageMatch[1],
          page: Number(bookAndPageMatch[2]),
        });
        continue;
      }
    }

    // Long titles sometimes wrap onto three lines:
    //   "<title part 1>"
    //   "                    <book>"
    //   "                        <title part 2>  <page>"
    const bookOnlyMatch = line.match(BOOK_ONLY_RE);
    if (bookOnlyMatch && i >= 1 && i + 1 < lines.length) {
      const cont = lines[i + 1].match(/^\s*(.+?)\s+(\d+)\s*$/);
      if (cont) {
        const titlePart1 = lines[i - 1].trim();
        const titlePart2 = cont[1].trim();
        entries.push({
          title: `${titlePart1} ${titlePart2}`,
          book: bookOnlyMatch[1],
          page: Number(cont[2]),
        });
        i += 1;
      }
    }
  }
  return entries;
}

function build() {
  const entries = parse(extractLines());
  if (entries.length < 3000) {
    throw new Error(`Parsed only ${entries.length} entries from INDEXES.PDF — expected ~3700+. Check pdftotext output/regexes.`);
  }

  const index = entries
    .map(({ title, book, page }) => ({
      title,
      book,
      bookName: BOOK_NAMES[book],
      file: BOOK_FILES[book],
      page,
      pdfPage: page + PAGE_OFFSETS[book],
    }))
    .sort((a, b) => a.title.localeCompare(b.title) || a.book.localeCompare(b.book));

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(index, null, 2) + '\n');
  console.log(`Wrote ${index.length} entries to ${path.relative(process.cwd(), OUTPUT_JSON)}`);
}

build();
