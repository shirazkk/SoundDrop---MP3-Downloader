/* ─── State ────────────────────────────────────────────── */
let ws = null;
const queueItems = new Map(); // jobId -> { card, data }

/* ─── WebSocket ────────────────────────────────────────── */
function connectWS() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}`);
  ws.onopen  = () => console.log('WS connected');
  ws.onclose = () => setTimeout(connectWS, 3000);
  ws.onerror = (e) => console.error('WS error', e);
  ws.onmessage = (e) => {
    try { handleWSMessage(JSON.parse(e.data)); }
    catch (err) { console.error('WS parse error', err); }
  };
}

function handleWSMessage(data) {
  switch (data.type) {
    case 'progress':
      updateOrCreateCard(data);
      break;
    case 'complete':
      updateOrCreateCard(data);
      showToast(`✓ Downloaded: ${data.songName}`);
      if (data.fileName) {
        triggerBrowserDownload(data.fileName);
      }
      break;
    case 'error':
      updateOrCreateCard(data);
      break;
  }
}

/* ─── Download Card ────────────────────────────────────── */
function updateOrCreateCard(data) {
  const { jobId, songName, status, message, percent } = data;
  const emptyEl = document.getElementById('emptyQueue');
  if (emptyEl) emptyEl.style.display = 'none';

  if (queueItems.has(jobId)) {
    const { card } = queueItems.get(jobId);
    card.className = `download-card status-${status}`;
    card.querySelector('.card-status').textContent = message;
    const bar = card.querySelector('.progress-bar');
    if (bar) {
      bar.style.width = (percent || 0) + '%';
      if (status === 'complete') bar.style.background = 'linear-gradient(90deg, var(--success), #00a855)';
      if (status === 'error') bar.style.background = 'var(--error)';
    }
    const icon = card.querySelector('.card-icon');
    if (status === 'complete') { icon.textContent = '✅'; icon.className = 'card-icon complete'; }
    if (status === 'error')    { icon.textContent = '❌'; icon.className = 'card-icon error'; }
  } else {
    const card = document.createElement('div');
    card.className = `download-card status-${status}`;
    card.id = `card-${jobId}`;
    card.innerHTML = `
      <div class="card-icon">🎵</div>
      <div class="card-body">
        <div class="card-song-name">${escHtml(songName)}</div>
        <div class="card-status">${escHtml(message)}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${percent || 0}%"></div>
        </div>
      </div>
    `;
    document.getElementById('queueList').prepend(card);
    queueItems.set(jobId, { card, data });
  }
}

/* ─── Autocomplete ───────────────────────────────────────── */
let autocompleteTimer = null;
async function fetchAutocomplete(query) {
  if (!query) {
    document.getElementById('autocompleteDropdown').classList.add('hidden');
    return;
  }
  try {
    const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
    const suggestions = await res.json();
    renderAutocomplete(suggestions);
  } catch (e) { console.error('Autocomplete error', e); }
}

function renderAutocomplete(suggestions) {
  const dropdown = document.getElementById('autocompleteDropdown');
  if (!suggestions || suggestions.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }
  dropdown.innerHTML = suggestions.map((s, i) => 
    `<div class="autocomplete-item" tabindex="0" data-val="${escHtml(s)}">${escHtml(s)}</div>`
  ).join('');
  dropdown.classList.remove('hidden');

  dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('songInput').value = item.dataset.val;
      dropdown.classList.add('hidden');
      performSearch();
    });
  });
}

/* ─── Single Search & Download ─────────────────────────── */
async function performSearch() {
  const input = document.getElementById('songInput');
  const query = input.value.trim();
  if (!query) { showToast('Enter a song name first!', true); input.focus(); return; }

  const btn = document.getElementById('searchBtn');
  const resultsContainer = document.getElementById('searchResults');
  btn.disabled = true;
  btn.textContent = 'Searching...';
  resultsContainer.innerHTML = '';
  document.getElementById('autocompleteDropdown').classList.add('hidden');

  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const { results } = await res.json();
    
    if (!results || results.length === 0) {
      resultsContainer.innerHTML = '<p class="hint">No results found.</p>';
    } else {
      resultsContainer.innerHTML = results.map(r => `
        <div class="result-card">
          <img src="${r.thumbnail}" class="result-thumb" alt="thumbnail" />
          <div class="result-info">
            <div>
              <div class="result-title" title="${escHtml(r.title)}">${escHtml(r.title)}</div>
              <div class="result-meta">${escHtml(r.uploader)} • ${r.duration}</div>
            </div>
            <div class="result-actions">
              <button class="btn-ghost" onclick="previewSong('${r.id}', this)">▶ Play</button>
              <button class="btn-primary" onclick="downloadSpecificSong('${r.url}', '${escHtml(r.title)}')">⬇ Download</button>
            </div>
            <div class="player-container hidden"></div>
          </div>
        </div>
      `).join('');
    }
    resultsContainer.classList.remove('hidden');
  } catch (e) {
    showToast('Search failed.', true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Search`;
  }
}

window.previewSong = function(videoId, btnEl) {
  const container = btnEl.closest('.result-info').querySelector('.player-container');
  if (container.classList.contains('hidden')) {
    container.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    container.classList.remove('hidden');
    btnEl.innerHTML = '⏹ Stop';
  } else {
    container.innerHTML = '';
    container.classList.add('hidden');
    btnEl.innerHTML = '▶ Play';
  }
};

window.downloadSpecificSong = async function(url, title) {
  showToast(`Starting download for ${title}...`);
  try {
    await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    });
  } catch (e) {
    showToast('Server error.', true);
  }
};

/* ─── Toast ────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.borderColor = isError ? 'rgba(255,68,102,0.5)' : 'rgba(0,240,255,0.35)';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

/* ─── Helpers ──────────────────────────────────────────── */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function triggerBrowserDownload(fileName) {
  const url = `/api/serve-file?file=${encodeURIComponent(fileName)}`;
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  // Use the HTML5 download attribute to prompt save
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

/* ─── Event Listeners ──────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  connectWS();

  // Autocomplete
  const songInput = document.getElementById('songInput');
  songInput.addEventListener('input', (e) => {
    clearTimeout(autocompleteTimer);
    const val = e.target.value.trim();
    autocompleteTimer = setTimeout(() => fetchAutocomplete(val), 300);
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.autocomplete-wrapper')) {
      document.getElementById('autocompleteDropdown')?.classList.add('hidden');
    }
  });

  // Single Search
  document.getElementById('searchBtn').addEventListener('click', performSearch);
  songInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Clear queue
  document.getElementById('clearQueueBtn').addEventListener('click', () => {
    document.getElementById('queueList').innerHTML = '';
    const empty = document.createElement('div');
    empty.id = 'emptyQueue';
    empty.className = 'empty-state';
    empty.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
        <path d="M9 19V6l12-3v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="15" r="3"/>
      </svg>
      <p>No downloads yet. Search for a song above.</p>`;
    document.getElementById('queueList').appendChild(empty);
    queueItems.clear();
  });

});
