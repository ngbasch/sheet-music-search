'use strict';

const searchBox = document.getElementById('search-box');
const resultsList = document.getElementById('results-list');
const emptyState = document.getElementById('empty-state');
const emptyStateText = document.getElementById('empty-state-text');
const heroSubtitle = document.getElementById('hero-subtitle');
const typingNotes = document.getElementById('typing-notes');

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
    heroSubtitle.textContent = `A fakebook library · ${entries.length.toLocaleString()} tunes across ${bookCount} fake books.`;
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
    const a = document.createElement('a');
    a.className = 'result';
    // Opens in a new window/tab, rendered by our own pdf.js viewer (viewer.html)
    // rather than an embedded iframe or the browser's native PDF viewer — see
    // viewer.js for why.
    const params = new URLSearchParams({
      file: entry.file,
      page: String(entry.pdfPage),
      title: entry.title,
      book: entry.bookName,
    });
    a.href = `viewer.html?${params.toString()}`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = `
      <span class="result-text">
        <span class="result-title">${escapeHtml(entry.title)}</span>
        <span class="result-book">${escapeHtml(entry.bookName)}</span>
      </span>
      <span class="result-page">p.${entry.page}</span>
    `;
    li.appendChild(a);
    resultsList.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let debounceHandle = null;
let notesTimeoutHandle = null;
searchBox.addEventListener('input', () => {
  typingNotes.classList.add('active');
  clearTimeout(notesTimeoutHandle);
  notesTimeoutHandle = setTimeout(() => typingNotes.classList.remove('active'), 700);

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
