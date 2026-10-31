// Turns a study's text into HTML. Shared by the page (app.js) and the server, which saves each run
// as a standalone HTML file (runs.js), so a saved run looks the same as the live one.

export const TILES = ['competitors', 'market', 'alerts', 'ai'];
export const TITLES = { competitors: 'Competitor discovery', market: 'Market size', alerts: 'Alerts', ai: 'AI-powered forward-looking analysis' };

// Headings the study prompt asks for, in order, keyed by tile id.
const HEADINGS = { competitors: 'COMPETITOR DISCOVERY', market: 'MARKET SIZE', alerts: 'ALERTS', ai: 'AI-POWERED FORWARD-LOOKING ANALYSIS' };
const MONDAY = /^\W*the question to ask on monday:?\**\s*/i;

export function extractSections(text) {
  const sections = Object.fromEntries(TILES.map(id => [id, '']));
  let current = null;
  let monday = '';
  text.split('\n').forEach(line => {
    const plain = line.replace(/[*#]/g, '').trim().toUpperCase();
    const head = plain.replace(/^[^A-Z]+/, '').replace(/[:\s]+$/, '');
    const hit = TILES.find(id => head === HEADINGS[id]);
    if (hit) { current = hit; return; }
    if (MONDAY.test(line.replace(/\*\*/g, ''))) { monday = line.replace(/\*\*/g, '').replace(MONDAY, '').trim(); current = null; return; }
    if (current) sections[current] += line + '\n';
  });
  TILES.forEach(id => { sections[id] = sections[id].trim(); });
  sections.monday = monday;
  return sections;
}

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LABEL = { fact: 'Fact', estimate: 'Estimate', foresight: 'Foresight' };

// sourceUrls maps a citation number ("3") to its URL.
export const inlineHtml = (s, sourceUrls = {}) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^#+\s*/, '')
  .replace(/\(?\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\)?/g, (m, t, u) => `<a class="cite" href="${u}" target="_blank" rel="noopener">${t.replace(/^www\./, '')}</a>`)
  .replace(/\[(fact|estimate|foresight)\]/gi, (m, k) => `<span class="lbl ${k.toLowerCase()}">${LABEL[k.toLowerCase()]}</span>`)
  .replace(/\[(\d{1,2}(?:\s*,\s*\d{1,2})*)\]/g, (m, list) => list.split(/\s*,\s*/).map(n => sourceUrls[n] ? `<a class="cite" href="${esc(sourceUrls[n])}" target="_blank" rel="noopener">[${n}]</a>` : `[${n}]`).join(''));

// The model answers in light markdown: bullets (•, -, *), numbered items and **bold**. Turn that into
// lists and paragraphs; anything else stays as a plain paragraph.
export function toHtml(text, sourceUrls = {}) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  text.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    let m;
    if ((m = line.match(/^(?:[•\-*])\s+(.*)$/))) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inlineHtml(m[1], sourceUrls)}</li>`);
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inlineHtml(m[1], sourceUrls)}</li>`);
    } else {
      close();
      out.push(`<p>${inlineHtml(line, sourceUrls)}</p>`);
    }
  });
  close();
  return out.join('');
}
