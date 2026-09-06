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
const bookFilterWrap = document.getElementById('book-filter-wrap');
const bookFilterToggle = document.getElementById('book-filter-toggle');
const bookFilterLabel = document.getElementById('book-filter-label');
const bookFilterMenu = document.getElementById('book-filter-menu');

const PAGE_SIZE = 20;

let fuse = null;
let allEntries = [];
let filteredEntries = [];
let allBookNames = [];
let browsePage = 0;
const selectedBooks = new Set();

fetch('library/index.json')
  .then((r) => r.json())
  .then((entries) => {
    allEntries = entries;
    const bookCount = new Set(entries.map((e) => e.file)).size;
    heroSubtitle.textContent = `A fakebook library · ${entries.length.toLocaleString()} tunes across ${bookCount} fake books.`;

    // Grouped by bookName rather than the `book` code: the source index has a
    // few books under more than one differently-cased code (e.g. "Realbk1"
    // and "RealBk1" both mean The Real Book I).
    const bookNames = [...new Set(entries.map((e) => e.bookName))].sort((a, b) => a.localeCompare(b));
    allBookNames = bookNames;
    bookNames.forEach((name) => selectedBooks.add(name));

    const actions = document.createElement('div');
    actions.id = 'book-filter-actions';
    actions.innerHTML = `
      <button type="button" id="book-filter-select-all">Select all</button>
      <button type="button" id="book-filter-deselect-all">Deselect all</button>
    `;
    bookFilterMenu.appendChild(actions);

    const bookCheckboxes = [];
    for (const bookName of bookNames) {
      const option = document.createElement('label');
      option.className = 'book-filter-option';
      option.innerHTML = `<input type="checkbox" checked value="${escapeHtml(bookName)}"> ${escapeHtml(bookName)}`;
      const checkbox = option.querySelector('input');
      bookCheckboxes.push(checkbox);
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) selectedBooks.add(bookName);
        else selectedBooks.delete(bookName);
        applyBookFilter();
        runSearch();
      });
      bookFilterMenu.appendChild(option);
    }

    document.getElementById('book-filter-select-all').addEventListener('click', () => {
      bookCheckboxes.forEach((cb) => (cb.checked = true));
      bookNames.forEach((name) => selectedBooks.add(name));
      applyBookFilter();
      runSearch();
    });

    document.getElementById('book-filter-deselect-all').addEventListener('click', () => {
      bookCheckboxes.forEach((cb) => (cb.checked = false));
      selectedBooks.clear();
      applyBookFilter();
      runSearch();
    });

    applyBookFilter();
    runSearch();
  })
  .catch((err) => {
    emptyStateText.textContent = 'Could not load the song index.';
    console.error(err);
  });

function applyBookFilter() {
  filteredEntries = allEntries.filter((e) => selectedBooks.has(e.bookName));
  fuse = new Fuse(filteredEntries, {
    keys: ['title'],
    threshold: 0.3,
    ignoreLocation: true,
  });

  if (selectedBooks.size === allBookNames.length) bookFilterLabel.textContent = 'All books';
  else if (selectedBooks.size === 0) bookFilterLabel.textContent = 'No books';
  else if (selectedBooks.size === 1) bookFilterLabel.textContent = [...selectedBooks][0];
  else bookFilterLabel.textContent = `${selectedBooks.size} books`;
}

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
  render(filteredEntries.slice(start, start + PAGE_SIZE), { paginated: true });
}

function render(matches, { paginated }) {
  resultsList.innerHTML = '';

  if (!matches.length) {
    if (selectedBooks.size === 0) emptyStateText.textContent = 'No fakebooks selected.';
    else emptyStateText.textContent = searchBox.value.trim() ? 'No matches.' : '';
    emptyState.classList.remove('hidden');
    pagination.classList.add('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  if (paginated && filteredEntries.length) {
    const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
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
  const totalPages = Math.ceil(filteredEntries.length / PAGE_SIZE);
  if (browsePage >= totalPages - 1) return;
  browsePage += 1;
  renderBrowsePage();
});

bookFilterToggle.addEventListener('click', () => {
  const isOpen = bookFilterWrap.classList.toggle('open');
  bookFilterMenu.classList.toggle('hidden', !isOpen);
  bookFilterToggle.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', (e) => {
  if (!bookFilterWrap.contains(e.target)) {
    bookFilterWrap.classList.remove('open');
    bookFilterMenu.classList.add('hidden');
    bookFilterToggle.setAttribute('aria-expanded', 'false');
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Keep the screen awake while the page is open (e.g. reading a tune on an
// iPad); the lock is released by the OS when the tab is hidden, so it's
// re-requested whenever the page becomes visible again.
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
