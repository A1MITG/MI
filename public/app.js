import { esc, inlineHtml, parseStudy, navHtml, sectionsHtml } from './study-format.js';

const form = document.getElementById('ask');
const input = document.getElementById('search-input');
const btn = document.getElementById('btn-search');
const insightBox = document.getElementById('insight-box');
const insightMeta = document.getElementById('insight-meta');
const insightSource = document.getElementById('insight-source');
const reportTitle = document.getElementById('report-title');
const study = document.getElementById('study');
const monday = document.getElementById('monday');
const sourcesEl = document.getElementById('sources');
const saved = document.getElementById('saved');


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

function setMessage(text, kind) {
  insightBox.hidden = false;
  insightBox.className = 'empty' + (kind ? ' ' + kind : '');
  insightBox.textContent = text;
}

async function fetchInsights(q) {
  input.value = q;
  study.innerHTML = '';
  reportTitle.textContent = q;
  insightMeta.hidden = true;
  monday.hidden = true;
  sourcesEl.hidden = true;
  saved.hidden = true;
  setMessage(`Searching the web and writing the study for ${q}…`, 'loading');
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

    const sources = data.sources || [];
    const sourceUrls = Object.fromEntries(sources.map(x => [String(x.n), x.url]));
    const { sections, monday: question } = parseStudy(text);
    if (question) {
      monday.innerHTML = `<b>The question to ask on Monday</b>${inlineHtml(question, sourceUrls)}`;
      monday.hidden = false;
    }
    if (sources.length) {
      document.getElementById('sources-count').textContent = `(${sources.length}, via ${data.search === 'openai' ? 'OpenAI web search' : 'Tavily'})`;
      document.getElementById('sources-list').innerHTML = sources.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a>${x.date ? ` <span class="d">${esc(x.date.slice(0, 16))}</span>` : ''}</li>`).join('');
      sourcesEl.hidden = false;
    }
    if (!sections.length) {
      setMessage(text);
    } else {
      insightBox.hidden = true;
      study.innerHTML = navHtml(sections) + sectionsHtml(sections, sourceUrls);
      watchSections();
    }

    const live = data.source === 'openai';
    if (data.run) {
      document.getElementById('saved-link').href = data.run;
      saved.hidden = false;
      loadRuns();
    }
    const searched = data.search && data.search !== 'none';
    insightSource.textContent = live ? (searched ? `live AI + web, ${sources.length} sources` : 'live AI, no web search') : (data.source === 'mock' ? 'sample data' : (data.source || 'unknown'));
    insightMeta.classList.toggle('mock', !live || !searched);
    if (data.searchError) insightMeta.title = 'Web search failed: ' + data.searchError;
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

// Tile navigation: the tiles are links to their sections; the one in view is marked as current.
let observer;
function watchSections() {
  if (observer) observer.disconnect();
  const links = [...study.querySelectorAll('.tile-nav a')];
  const mark = (id) => links.forEach(a => a.toggleAttribute('aria-current', a.dataset.sec === id));
  links.forEach(a => a.addEventListener('click', () => mark(a.dataset.sec)));
  observer = new IntersectionObserver((entries) => {
    const top = entries.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
    if (top) mark(top.target.id.replace(/^sec-/, ''));
  }, { rootMargin: '-90px 0px -55% 0px' });
  study.querySelectorAll('.tile').forEach(t => observer.observe(t));
}

// Past runs: each live study is saved on the server as one HTML file.
async function loadRuns() {
  try {
    const { runs = [] } = await (await fetch('/api/runs')).json();
    document.getElementById('runs-list').innerHTML = runs.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.query)}</a> <span>${esc(new Date(r.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }))} · ${r.sources} sources · ${r.kb} KB</span></li>`).join('');
    document.getElementById('runs').hidden = !runs.length;
  } catch (e) {}
}
loadRuns();
