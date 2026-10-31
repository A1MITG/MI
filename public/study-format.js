// Turns a study's text into HTML. Shared by the page (app.js) and the server, which saves each run
// as a standalone HTML file (runs.js), so a saved run looks the same as the live one.

// The four sections the study prompt asks for. A run can also come back with fewer, or with extra
// sections under its own ALL-CAPS headings; those become tiles too.
const KNOWN = [
  { id: 'competitors', head: 'COMPETITOR DISCOVERY', title: 'Competitor discovery' },
  { id: 'market', head: 'MARKET SIZE', title: 'Market size' },
  { id: 'alerts', head: 'ALERTS', title: 'Alerts' },
  { id: 'ai', head: 'AI-POWERED FORWARD-LOOKING ANALYSIS', title: 'AI-powered forward-looking analysis' }
];
const MONDAY = /^\W*the question to ask on monday:?\**\s*/i;

// A heading is a short line, not a bullet, whose letters are all capitals (an emoji or ** around it is fine).
function headingOf(line) {
  const t = line.trim();
  if (!t || /^[-*•]\s|^\d+[.)]\s/.test(t)) return null;
  const head = t.replace(/[*#_]/g, '').replace(/^[^A-Za-z]+/, '').replace(/[:\s]+$/, '');
  const known = KNOWN.find(k => head.toUpperCase() === k.head);
  if (known) return known;
  if (head.length < 4 || head.length > 60 || !/[A-Z]{2}/.test(head) || head !== head.toUpperCase() || !/^[A-Z0-9 &,'\/()-]+$/.test(head)) return null;
  const title = head.charAt(0) + head.slice(1).toLowerCase();
  return { id: head.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), title };
}

// Returns { sections: [{ id, title, body, points }], monday } in the order the run wrote them.
export function parseStudy(text) {
  const sections = [];
  let current = null;
  let monday = '';
  text.split('\n').forEach(line => {
    if (MONDAY.test(line.replace(/\*\*/g, ''))) { monday = line.replace(/\*\*/g, '').replace(MONDAY, '').trim(); current = null; return; }
    const h = headingOf(line);
    if (h) {
      current = sections.find(x => x.id === h.id);
      if (!current) { current = { id: h.id, title: h.title, body: '' }; sections.push(current); }
      return;
    }
    if (current) current.body += line + '\n';
  });
  const kept = sections.map(x => ({ ...x, body: x.body.trim() })).filter(x => x.body);
  kept.forEach(x => { x.points = x.body.split('\n').filter(l => /^\s*([-*•]|\d+[.)])\s/.test(l)).length; });
  return { sections: kept, monday };
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

const pad = (i) => String(i + 1).padStart(2, '0');

// Navigation tiles: one per section, sharing the full row width whatever their number.
export function navHtml(sections) {
  return `<nav class="tile-nav" aria-label="Sections of this brief">${sections.map((x, i) =>
    `<a href="#sec-${x.id}" data-sec="${x.id}"><span class="n">${pad(i)}</span><b>${esc(x.title)}</b><small>${x.points ? `${x.points} point${x.points === 1 ? '' : 's'}` : 'Read'}</small></a>`).join('')}</nav>`;
}

// The sections themselves. Long ones, and an odd one out at the end, take the full width.
export function sectionsHtml(sections, sourceUrls = {}) {
  return `<div class="tiles">${sections.map((x, i) => {
    const wide = x.body.length > 1400 || (i === sections.length - 1 && sections.length % 2 === 1);
    return `<article class="tile${wide ? ' wide' : ''}" id="sec-${x.id}"><h3><span class="n">${pad(i)}</span>${esc(x.title)}</h3><div class="tile-content">${toHtml(x.body, sourceUrls)}</div></article>`;
  }).join('')}</div>`;
}
