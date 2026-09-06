'use strict';

const searchBox = document.getElementById('search-box');
const resultsList = document.getElementById('results-list');
const emptyState = document.getElementById('empty-state');
const emptyStateText = document.getElementById('empty-state-text');
const heroSubtitle = document.getElementById('hero-subtitle');
const typingNotes = document.getElementById('typing-notes');
const pagination = document.getElementById('pagination');
const paginationPrev = document.getElementById('pagination-prev');
const paginationNext = document.getElementById('pagination-next');
const paginationStatus = document.getElementById('pagination-status');

const PAGE_SIZE = 20;

let fuse = null;
let allEntries = [];
let browsePage = 0;

fetch('library/index.json')
  .then((r) => r.json())
  .then((entries) => {
    allEntries = entries;
    fuse = new Fuse(entries, {
      keys: ['title'],
      threshold: 0.3,
      ignoreLocation: true,
    });
    const bookCount = new Set(entries.map((e) => e.file)).size;
    heroSubtitle.textContent = `A fakebook library · ${entries.length.toLocaleString()} tunes across ${bookCount} fake books.`;
    runSearch();
  })
  .catch((err) => {
    emptyStateText.textContent = 'Could not load the song index.';
    console.error(err);
  });

function runSearch() {
  const query = searchBox.value.trim();
  if (query) {
    render(fuse.search(query, { limit: 50 }).map((r) => r.item), { paginated: false });
  } else {
    browsePage = 0;
    renderBrowsePage();
  }
}

function renderBrowsePage() {
  const start = browsePage * PAGE_SIZE;
  render(allEntries.slice(start, start + PAGE_SIZE), { paginated: true });
}

function render(matches, { paginated }) {
  resultsList.innerHTML = '';

  if (!matches.length) {
    emptyStateText.textContent = searchBox.value.trim() ? 'No matches.' : '';
    emptyState.classList.remove('hidden');
    pagination.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  if (paginated && allEntries.length) {
    const totalPages = Math.ceil(allEntries.length / PAGE_SIZE);
    pagination.classList.remove('hidden');
    paginationStatus.textContent = `Page ${browsePage + 1} of ${totalPages}`;
    paginationPrev.disabled = browsePage === 0;
    paginationNext.disabled = browsePage >= totalPages - 1;
  } else {
    pagination.classList.add('hidden');
  }

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
    if (!fuse) return;
    runSearch();
  }, 100);
});

paginationPrev.addEventListener('click', () => {
  if (browsePage === 0) return;
  browsePage -= 1;
  renderBrowsePage();
});

paginationNext.addEventListener('click', () => {
  const totalPages = Math.ceil(allEntries.length / PAGE_SIZE);
  if (browsePage >= totalPages - 1) return;
  browsePage += 1;
  renderBrowsePage();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
