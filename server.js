import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { searchProvider, tavilySources, sourcesBlock, openaiSearchStudy } from './search.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple CORS for local testing
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// The study prompt: four tiles - competitor discovery, market size, alerts, and AI-powered forward-looking analysis.
const SYSTEM_PROMPT = `You are a strategy partner who pairs a competitive-intelligence analyst's rigour with a futurist's imagination. Your reader is a senior leader deciding where to place bets. Be specific, evidence-led where facts exist, and bold where they run out. Never pad.

Label every point [Fact], [Estimate] or [Foresight]. Give a year and a source (company website, filing, press release, earnings call) for each Fact. Do not invent figures. If you are unsure, say so and make it an Estimate.

Answer in exactly these four sections, each starting with its heading line exactly as written:

🎯 COMPETITOR DISCOVERY
The 4 to 6 players that matter most, including newcomers from outside the market. For each: who they are and why they matter, then what they have actually done in the last 18 months: new products and launches, R&D direction and patents, acquisitions and partnerships, pricing and go-to-market shifts, leadership and hiring signals. Each move is dated and sourced.

📊 MARKET SIZE
The market today in 4 to 6 points: total size and growth rate, the main segments and regions, how customers buy, and where the profit pool sits and is moving.

🔔 ALERTS
5 to 7 signals the leader should act on or watch now: recent launches, deals, regulation, and above all disruption from outside the market. Always test whether AI labs such as Anthropic, OpenAI and Google are moving in through agents, enterprise platforms, consulting-style services or vertical apps. For each alert: what happened, what it makes obsolete, and how fast it could hit.

🤖 AI-POWERED FORWARD-LOOKING ANALYSIS
Two parts, each introduced by its name in bold on its own line.
**The future of work**: imagine how the work this market does gets done in 2030 and 2035, not as a faster version of today but redesigned. Give 3 scenarios (expected, radical, wildcard). For each: what disappears, what new roles and business models appear, what the customer experiences, and which early signals are already visible today.
**Be the trend setter**: 3 to 5 bold moves that are humanly possible, not just beating the competition but setting the direction others follow. For each: the move, why now, the first step in the next 90 days, what a competitor would have to do to respond, and the biggest risk.

Close with one line starting "The question to ask on Monday:" giving the single most provocative question the leader should put to their team.

Use "- " bullets and **bold** for names. No tables.`;

const userPrompt = (query) => `Study: ${query}
Horizon: today, 2030, 2035
Perspective: a senior leader who wants to lead the market, not follow it.
Today's date: ${new Date().toISOString().slice(0, 10)}`;

const WITH_SOURCES = `

You are given numbered web sources below. Base every [Fact] on them and cite it as [n] right after the point, e.g. "[Fact] ... (2026) [3]". Prefer the newest source when they disagree. A Fact you cannot tie to a source must become an [Estimate]. Never cite a number that is not in the list.`;

app.get('/api/health', (req, res) => res.json({ status: 'ok', search: searchProvider(), live: Boolean(process.env.OPENAI_API_KEY) }));

app.post('/api/insights', async (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    if (process.env.OPENAI_API_KEY) {
      const search = searchProvider();

      if (search === 'openai') {
        const { text, sources } = await openaiSearchStudy(SYSTEM_PROMPT, userPrompt(query));
        return res.json({ source: 'openai', search, text, sources });
      }

      let sources = [];
      let searchError = null;
      if (search === 'tavily') {
        try { sources = await tavilySources(query); } catch (err) { searchError = err.message; console.error('Search failed, answering without sources:', err.message); }
      }

      const system = sources.length ? SYSTEM_PROMPT + WITH_SOURCES : SYSTEM_PROMPT;
      const user = sources.length ? `${userPrompt(query)}\n\nSources:\n\n${sourcesBlock(sources)}` : userPrompt(query);
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          max_tokens: 3000,
          temperature: 0.5
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${data.error?.message || resp.statusText}`);
      const text = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
      return res.json({
        source: 'openai',
        search: sources.length ? 'tavily' : 'none',
        searchError,
        text,
        sources: sources.map(({ n, title, url, date }) => ({ n, title, url, date }))
      });
    }

    // Fallback mocked response when no API key
    const mock = `🎯 COMPETITOR DISCOVERY
- **ExampleCorp**: [Estimate] market leader; launched an AI assistant tier and acquired a data provider
- **RivalAI**: [Estimate] fast-growing challenger; moved from seat pricing to outcome-based pricing

📊 MARKET SIZE
- [Estimate] Global TAM around $12.5B, growing about 18% a year
- [Estimate] North America 45%, EMEA 30%, APAC 25%

🔔 ALERTS
- **AI labs**: [Foresight] agent platforms from labs such as Anthropic and OpenAI absorb workflows that used to need separate tools and consultants

🤖 AI-POWERED FORWARD-LOOKING ANALYSIS
**The future of work**
- **Expected (2030)**: [Foresight] analysts supervise agents that draft every report
- **Radical (2035)**: [Foresight] software is generated per customer on demand
- **Wildcard**: [Foresight] buyers' own agents negotiate directly with vendors' agents
**Be the trend setter**
- **Sell outcomes, not seats**: first step in 90 days is one pilot priced on results

The question to ask on Monday: what would we build if our customers' agents, not their people, were the buyers?

Note: set OPENAI_API_KEY in .env to enable live AI-powered results.`;
    return res.json({ source: 'mock', search: 'none', text: mock, sources: [] });
  } catch (err) {
    console.error('Error in /api/insights', err);
    return res.status(500).json({ error: err.message || 'unknown' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI MI MVP server listening on http://localhost:${PORT} (search: ${searchProvider()})`);
});
