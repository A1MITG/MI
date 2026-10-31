// Web search for a study. SEARCH_PROVIDER in .env picks one:
//   tavily  - a few Tavily searches; the results go to the model as numbered sources
//   openai  - the model searches the web itself (OpenAI Responses API, web_search tool)
//   none    - no search; the model answers from what it already knows
// Left blank, it uses tavily when TAVILY_API_KEY is set, otherwise none.

export function searchProvider() {
  const p = (process.env.SEARCH_PROVIDER || '').trim().toLowerCase();
  if (['tavily', 'openai', 'none'].includes(p)) return p;
  return process.env.TAVILY_API_KEY ? 'tavily' : 'none';
}

async function tavily(query, opts = {}) {
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query, search_depth: 'advanced', max_results: 6, ...opts })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Tavily ${resp.status}: ${data.detail?.error || data.error || resp.statusText}`);
  return data.results || [];
}

// Three angles: what the players are doing, the last year's news, and who is disrupting the space.
export async function tavilySources(query) {
  if (!process.env.TAVILY_API_KEY) throw new Error('SEARCH_PROVIDER is tavily but TAVILY_API_KEY is not set in .env');
  const searches = await Promise.allSettled([
    tavily(`${query} strategy new products R&D direction partnerships acquisitions`),
    tavily(`${query} latest news`, { topic: 'news', days: 365 }),
    tavily(`${query} AI disruption Anthropic OpenAI agents consulting IT services SaaS future of work`)
  ]);
  const failed = searches.filter(s => s.status === 'rejected');
  if (failed.length === searches.length) throw failed[0].reason;

  const seen = new Set();
  const sources = [];
  for (const s of searches) {
    if (s.status !== 'fulfilled') continue;
    for (const r of s.value) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      sources.push({
        n: sources.length + 1,
        title: r.title || r.url,
        url: r.url,
        date: r.published_date || '',
        excerpt: String(r.content || '').replace(/\s+/g, ' ').slice(0, 700)
      });
      if (sources.length >= 14) return sources;
    }
  }
  return sources;
}

export function sourcesBlock(sources) {
  return sources.map(s => `[${s.n}] ${s.title}${s.date ? ` (${s.date})` : ''}\n${s.url}\n${s.excerpt}`).join('\n\n');
}

// OpenAI's own web search: one Responses API call that searches and writes the study.
export async function openaiSearchStudy(system, user) {
  const model = process.env.OPENAI_SEARCH_MODEL || 'gpt-4.1-mini';
  const resp = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, instructions: system, input: user, tools: [{ type: 'web_search' }], max_output_tokens: 3000 })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`OpenAI search ${resp.status}: ${data.error?.message || resp.statusText}`);

  let text = '';
  const sources = [];
  const seen = new Map();
  for (const item of data.output || []) {
    if (item.type !== 'message') continue;
    for (const c of item.content || []) {
      if (c.type !== 'output_text') continue;
      text += c.text;
      for (const a of c.annotations || []) {
        if (a.type !== 'url_citation' || !a.url || seen.has(a.url)) continue;
        seen.set(a.url, sources.length + 1);
        sources.push({ n: sources.length + 1, title: a.title || a.url, url: a.url, date: '' });
      }
    }
  }
  return { text, sources };
}
