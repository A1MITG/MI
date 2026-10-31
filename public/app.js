const form = document.getElementById('ask');
const input = document.getElementById('search-input');
const btn = document.getElementById('btn-search');
const insightBox = document.getElementById('insight-box');
const insightMeta = document.getElementById('insight-meta');
const insightSource = document.getElementById('insight-source');
const reportTitle = document.getElementById('report-title');
const tilesEl = document.querySelector('.tiles');
const TILES = ['competitors', 'market', 'monitoring', 'ai'];

// Store the full insights data
let insightsData = {};

// Day / night: one tap flips what is showing, and the choice is kept for the next visit.
const dayNight = document.getElementById('dayNight');
const isDark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
const showTheme = () => { const d = isDark(); dayNight.setAttribute('aria-pressed', String(d)); dayNight.setAttribute('aria-label', d ? 'Switch to day mode' : 'Switch to night mode'); };
dayNight.addEventListener('click', () => {
  const t = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('vp-theme', t); } catch (e) {}
  showTheme();
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', showTheme);
showTheme();

function extractSections(text) {
  const sections = { competitors: '', market: '', monitoring: '', ai: '' };
  // Split by section headers and extract content
  text.split(/(?=🎯|📊|🔔|🤖)/).forEach(part => {
    if (part.includes('🎯 COMPETITOR DISCOVERY')) sections.competitors = part.replace('🎯 COMPETITOR DISCOVERY', '').trim();
    else if (part.includes('📊 MARKET SIZING')) sections.market = part.replace('📊 MARKET SIZING', '').trim();
    else if (part.includes('🔔 MONITORING & ALERTS')) sections.monitoring = part.replace('🔔 MONITORING & ALERTS', '').trim();
    else if (part.includes('🤖 AI-POWERED ANALYSIS')) sections.ai = part.replace('🤖 AI-POWERED ANALYSIS', '').trim();
  });
  return sections;
}

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^#+\s*/, '');

// The model answers in light markdown: bullets (•, -, *), numbered items and **bold**. Turn that into
// lists and paragraphs; anything else stays as a plain paragraph.
function toHtml(text) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    let m;
    if ((m = line.match(/^(?:[•\-*]|•)\s+(.*)$/))) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else {
      close();
      out.push(`<p>${inline(line)}</p>`);
    }
  });
  close();
  return out.join('');
}

function showTile(tileId, content) {
  const tile = document.getElementById(`tile-${tileId}`);
  if (!tile || !content) return;
  tile.querySelector('.tile-content').innerHTML = toHtml(content);
  tile.hidden = false;
}

function hideAllTiles() {
  TILES.forEach(id => { document.getElementById(`tile-${id}`).hidden = true; });
}

function clearActive() {
  document.querySelectorAll('.cap').forEach(b => b.classList.remove('active'));
  tilesEl.classList.remove('solo');
}

function setMessage(text, kind) {
  insightBox.hidden = false;
  insightBox.className = 'empty' + (kind ? ' ' + kind : '');
  insightBox.textContent = text;
}

async function fetchInsights(q) {
  input.value = q;
  insightsData = {};
  hideAllTiles();
  clearActive();
  reportTitle.textContent = q;
  insightMeta.hidden = true;
  setMessage(`Generating insights for ${q}…`, 'loading');
  btn.disabled = true;

  try {
    const res = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    const text = data.text || JSON.stringify(data, null, 2);

    insightsData = extractSections(text);
    const found = TILES.filter(id => insightsData[id]);
    if (!found.length) {
      setMessage(text);
    } else {
      insightBox.hidden = true;
      found.forEach(id => showTile(id, insightsData[id]));
    }

    const live = data.source === 'openai';
    insightSource.textContent = live ? 'live AI' : (data.source === 'mock' ? 'sample data' : (data.source || 'unknown'));
    insightMeta.classList.toggle('mock', !live);
    insightMeta.hidden = false;
  } catch (err) {
    setMessage('Could not generate insights: ' + (err.message || err), 'err');
  } finally {
    btn.disabled = false;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value && input.value.trim();
  if (!q) {
    setMessage('Please enter a company or market to search.', 'err');
    input.focus();
    return;
  }
  fetchInsights(q);
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => fetchInsights(chip.dataset.q));
});

// Capability buttons: show one section on its own; press again to see all four.
document.querySelectorAll('.cap').forEach(button => {
  button.addEventListener('click', () => {
    const tileId = button.dataset.tile;
    if (!insightsData[tileId]) {
      setMessage('Generate a brief first: enter a company or market above.', 'err');
      input.focus();
      return;
    }
    const wasActive = button.classList.contains('active');
    clearActive();
    hideAllTiles();
    if (wasActive) {
      TILES.forEach(id => showTile(id, insightsData[id]));
    } else {
      button.classList.add('active');
      tilesEl.classList.add('solo');
      showTile(tileId, insightsData[tileId]);
    }
  });
});
