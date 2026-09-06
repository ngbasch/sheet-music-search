'use strict';

const searchBox = document.getElementById('search-box');
const resultsList = document.getElementById('results-list');
const emptyState = document.getElementById('empty-state');
const emptyStateText = document.getElementById('empty-state-text');
const heroSubtitle = document.getElementById('hero-subtitle');
const viewerOverlay = document.getElementById('viewer-overlay');
const viewerFrame = document.getElementById('viewer-frame');
const viewerTitle = document.getElementById('viewer-title');
const viewerDownload = document.getElementById('viewer-download');
const viewerBack = document.getElementById('viewer-back');

let fuse = null;

fetch('library/index.json')
  .then((r) => r.json())
  .then((entries) => {
    fuse = new Fuse(entries, {
      keys: ['title'],
      threshold: 0.3,
      ignoreLocation: true,
    });
    const bookCount = new Set(entries.map((e) => e.file)).size;
    heroSubtitle.textContent = `Search ${entries.length.toLocaleString()} tunes across ${bookCount} fake books.`;
  })
  .catch((err) => {
    emptyStateText.textContent = 'Could not load the song index.';
    console.error(err);
  });

function render(matches) {
  resultsList.innerHTML = '';

  if (!matches.length) {
    emptyStateText.textContent = searchBox.value.trim() ? 'No matches.' : '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  for (const entry of matches) {
    const li = document.createElement('li');
    li.className = 'result';
    li.innerHTML = `
      <span class="result-text">
        <span class="result-title">${escapeHtml(entry.title)}</span>
        <span class="result-book">${escapeHtml(entry.bookName)}</span>
      </span>
      <span class="result-page">p.${entry.page}</span>
    `;
    li.addEventListener('click', () => openEntry(entry));
    resultsList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openEntry(entry) {
  const pdfUrl = `library/${entry.file}#page=${entry.pdfPage}&view=FitH`;
  viewerTitle.textContent = `${entry.title} — ${entry.bookName}`;
  viewerDownload.href = `library/${entry.file}`;
  viewerFrame.src = pdfUrl;
  viewerOverlay.classList.remove('hidden');
}

viewerBack.addEventListener('click', () => {
  viewerOverlay.classList.add('hidden');
  viewerFrame.src = '';
});

let debounceHandle = null;
searchBox.addEventListener('input', () => {
  clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    const query = searchBox.value.trim();
    if (!fuse) return;
    const matches = query ? fuse.search(query, { limit: 50 }).map((r) => r.item) : [];
    render(matches);
  }, 100);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
