// Each live study is kept for reference as one small, standalone HTML file in runs/ (no JSON, no
// assets, styles inline), named <date>_<time>_<query>.html. It opens in any browser, even offline.
import fs from 'fs/promises';
import path from 'path';
import { esc, inlineHtml, toHtml, parseStudy, navHtml, sectionsHtml } from './public/study-format.js';

const CSS = `:root{--paper:#fff;--wash:#F3F7FA;--ink:#0E2236;--slate:#586B7E;--rule:#DDE6EE;--blue:#0090DA;--navy:#0061A0;--amber-ink:#7A5300;--amber-wash:#FFF7E3}
@media (prefers-color-scheme:dark){:root{--paper:#08131F;--wash:#0D1C2B;--ink:#E7EEF5;--slate:#93A6B8;--rule:#1F3346;--blue:#3FB3EE;--navy:#8CCBF2;--amber-ink:#F2C14E;--amber-wash:#2A2210;color-scheme:dark}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:400 15px/1.55 "Geist","Segoe UI",system-ui,sans-serif}
a{color:var(--navy)}.wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
header{background:#0B1524;color:#fff;border-bottom:3px solid #E11D2E;padding:16px 0}header b{font-size:20px;letter-spacing:-.03em}header b span{color:#2F6FED}header small{margin-left:12px;color:#D8DADF}
.meta{margin:28px 0 4px;font:500 12px/1.4 ui-monospace,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:var(--slate)}
h1{margin:6px 0 18px;font-size:26px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.monday{margin:0 0 14px;padding:14px 18px;border-left:3px solid #E11D2E;background:var(--wash);border-radius:0 12px 12px 0;font-size:16px}
html{scroll-behavior:smooth}.tile-nav{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;padding:8px 0;background:var(--paper)}
.tile-nav a{flex:1 1 170px;display:flex;flex-direction:column;gap:2px;padding:9px 13px;border:1px solid var(--rule);border-radius:12px;color:var(--ink);text-decoration:none}.tile-nav a:hover{border-color:var(--blue)}
.tile-nav .n,.tile .n{font:500 12px/1 ui-monospace,Consolas,monospace;color:var(--slate);margin-right:8px}.tile-nav b{font-size:14px}.tile-nav small{font-size:12.5px;color:var(--slate)}
.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wide{grid-column:1/-1}
.tile{border:1px solid var(--rule);border-radius:14px;padding:16px 18px;min-width:0;overflow-wrap:anywhere;scroll-margin-top:110px}.tile h3{margin:0 0 8px;font-size:16px;color:var(--navy)}
.tile ul,.tile ol{margin:0 0 8px;padding-left:20px}.tile li{margin:0 0 6px}.tile p{margin:0 0 8px}
.lbl{display:inline-block;padding:0 7px;border-radius:999px;font:500 11px/1.6 ui-monospace,Consolas,monospace;background:var(--wash);color:var(--navy)}.lbl.estimate{background:var(--amber-wash);color:var(--amber-ink)}.lbl.foresight{background:rgba(124,92,255,.12);color:#7C5CFF}
.cite{font-size:11px;vertical-align:super;text-decoration:none}
.sources{margin:16px 0 40px;font-size:13.5px}.sources li{margin:0 0 4px}
@media (max-width:700px){.tiles{grid-template-columns:1fr}.tile-nav{position:static}.tile-nav a{flex-basis:140px}}`;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'study';

export function renderRun({ query, text, sources = [], search, model, createdAt }) {
  const urls = Object.fromEntries(sources.map(s => [String(s.n), s.url]));
  const { sections, monday } = parseStudy(text);
  const body = sections.length ? navHtml(sections) + sectionsHtml(sections, urls) : `<div class="tile">${toHtml(text, urls)}</div>`;
  const when = new Date(createdAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const how = [model, search && search !== 'none' ? `web search: ${search}, ${sources.length} sources` : 'no web search'].filter(Boolean).join(' · ');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(query)} · Vantage-360 Market Intelligence</title><meta name="mi-run" content="${esc(JSON.stringify({ query, createdAt, search, sources: sources.length }))}"><style>${CSS}</style></head><body>
<header><div class="wrap"><b>V<span>antage-360</span></b><small>Market Intelligence · by Continuum Lab</small></div></header>
<main class="wrap"><p class="meta">Intelligence brief · ${esc(when)} · ${esc(how)}</p><h1>${esc(query)}</h1>
${monday ? `<p class="monday"><b>The question to ask on Monday:</b> ${inlineHtml(monday, urls)}</p>` : ''}${body}
${sources.length ? `<ol class="sources">${sources.map(s => `<li><a href="${esc(s.url)}">${esc(s.title)}</a>${s.date ? ` · ${esc(s.date.slice(0, 16))}` : ''}</li>`).join('')}</ol>` : ''}
</main></body></html>
`;
}

export async function saveRun(dir, run) {
  await fs.mkdir(dir, { recursive: true });
  // Local time, so file names match the clock on this PC.
  const d = new Date(run.createdAt);
  const p2 = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
  const file = `${stamp}_${slug(run.query)}.html`;
  await fs.writeFile(path.join(dir, file), renderRun(run), 'utf8');
  return file;
}

// Newest first, with the query and date read back from each file's mi-run tag.
export async function listRuns(dir, limit = 50) {
  let files;
  try { files = (await fs.readdir(dir)).filter(f => f.endsWith('.html')); } catch { return []; }
  files.sort().reverse();
  return Promise.all(files.slice(0, limit).map(async (file) => {
    const full = path.join(dir, file);
    const [stat, head] = await Promise.all([fs.stat(full), fs.readFile(full, 'utf8').then(t => t.slice(0, 2000))]);
    const m = head.match(/<meta name="mi-run" content="([^"]*)">/);
    let meta = {};
    try { meta = m ? JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')) : {}; } catch {}
    return { file, url: `/runs/${encodeURIComponent(file)}`, query: meta.query || file, createdAt: meta.createdAt || stat.mtime.toISOString(), sources: meta.sources || 0, kb: Math.round(stat.size / 102.4) / 10 };
  }));
}
