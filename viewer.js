import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/legacy/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/legacy/build/pdf.worker.min.mjs';

const viewerTitle = document.getElementById('viewer-title');
const viewerDownload = document.getElementById('viewer-download');
const viewerCanvas = document.getElementById('viewer-canvas');
const viewerStatus = document.getElementById('viewer-status');
const viewerPrev = document.getElementById('viewer-prev');
const viewerNext = document.getElementById('viewer-next');
const viewerPageLabel = document.getElementById('viewer-page-label');
const viewerLoading = document.getElementById('viewer-loading');

// We render the target page ourselves with pdf.js instead of relying on the
// browser's native PDF viewer + a #page=N fragment — iOS Safari's built-in
// viewer ignores that fragment (both embedded and via direct navigation),
// so jumping straight to a tune inside a 500-page book doesn't work there.
// pdf.js only fetches the byte ranges it needs (GitHub Pages supports HTTP
// Range requests), so this doesn't require downloading the whole book.

const params = new URLSearchParams(window.location.search);
const file = params.get('file');
const startPage = Number(params.get('page')) || 1;
const title = params.get('title') || '';
const book = params.get('book') || '';

let currentDoc = null;
let currentPageNum = startPage;
let renderToken = 0;

async function init() {
  if (!file) {
    viewerStatus.textContent = 'No tune specified.';
    return;
  }

  viewerTitle.textContent = book ? `${title} — ${book}` : title;
  viewerDownload.href = `library/${file}`;

  try {
    currentDoc = await pdfjsLib.getDocument(`library/${file}`).promise;
    await renderPage();
  } catch (err) {
    viewerLoading.classList.add('hidden');
    viewerStatus.textContent = 'Could not load this PDF.';
    console.error(err);
  }
}

async function renderPage() {
  if (!currentDoc) return;
  const myToken = ++renderToken;
  viewerLoading.classList.remove('hidden');
  viewerCanvas.classList.remove('loaded');

  const page = await currentDoc.getPage(currentPageNum);
  if (myToken !== renderToken) return; // a newer render request superseded this one

  const containerWidth = document.getElementById('viewer-canvas-wrap').clientWidth - 24;
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = (Math.min(containerWidth, 900) * (window.devicePixelRatio || 1)) / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  viewerCanvas.width = viewport.width;
  viewerCanvas.height = viewport.height;
  viewerCanvas.style.width = `${viewport.width / (window.devicePixelRatio || 1)}px`;
  viewerCanvas.style.height = `${viewport.height / (window.devicePixelRatio || 1)}px`;

  const ctx = viewerCanvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  if (myToken !== renderToken) return;

  viewerLoading.classList.add('hidden');
  viewerStatus.textContent = '';
  viewerCanvas.classList.add('loaded');
  viewerPageLabel.textContent = `Page ${currentPageNum} of ${currentDoc.numPages}`;
  viewerPrev.disabled = currentPageNum <= 1;
  viewerNext.disabled = currentPageNum >= currentDoc.numPages;
}

viewerPrev.addEventListener('click', () => {
  if (currentPageNum > 1) {
    currentPageNum -= 1;
    renderPage();
  }
});

viewerNext.addEventListener('click', () => {
  if (currentDoc && currentPageNum < currentDoc.numPages) {
    currentPageNum += 1;
    renderPage();
  }
});

init();

// Keep the screen awake while a tune is open; the lock is released by the
// OS when the tab is hidden, so it's re-requested when the page comes back.
if ('wakeLock' in navigator) {
  let wakeLock = null;
  const requestWakeLock = () => {
    navigator.wakeLock.request('screen').then((lock) => (wakeLock = lock)).catch(() => {});
  };
  requestWakeLock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !wakeLock) requestWakeLock();
  });
}
