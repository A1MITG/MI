# AI Market Intelligence — MVP

This repository contains a small MVP for a modern, futuristic-themed market & competitive intelligence platform front page and backend prototype.

What you get
- Single-page static frontend (in `/public`) with hero, search box, capability tiles, demo tiles, and an insights output box.
- Small Express backend (`server.js`) providing `/api/insights` and `/api/health`. Each study searches the web first (`search.js`, Tavily or OpenAI) and cites its sources.
- Every live study is saved for reference as one standalone HTML file (about 15 KB) in `runs/`, listed under Past runs on the page and at `/api/runs`. Set `RUNS_DIR` in `.env` to keep them elsewhere. `runs/` is not committed.
- Rollback points are listed in `ROLLBACK.md`.
- If `OPENAI_API_KEY` is set, the backend proxies to OpenAI's Chat Completions endpoint (simple example). If not set, the endpoint returns a mocked response.

Quick start (Windows PowerShell)

1. Install deps

```powershell
cd c:\Projects\AI_Factory\MI
npm install
```

2. Add your keys: copy `env.example` to `.env` in this folder and fill in `OPENAI_API_KEY` and `TAVILY_API_KEY`.
   `SEARCH_PROVIDER` picks the web search: `tavily` (default), `openai` (OpenAI's own web search) or `none`.
   Restart the server after changing `.env`. `http://localhost:4000/api/health` shows which search is active.

3. Run

```powershell
npm start
# then open http://localhost:4000
```

Notes and next steps
- The UI is intentionally a single static page MVP. We'll iterate to a React + Tailwind implementation for better componentization and reusability.
- Grok (or other LLM) integration: this repo demonstrates OpenAI integration; add a separate provider switch in `server.js` to call Grok endpoints when `GROK_API_KEY` is available.
- Enterprise features to add: auth, account management, usage quotas, dashboards, PDF/PPT export, webhook integrations, and payments.

Security
- Don’t commit API keys. Use environment variables and secrets stores for production.

Mapping to your requirements
- Homepage: implemented hero, search, capabilities, demo tiles, who it's for, proof area (placeholder), CTA zone — Done (MVP)
- Platform: single-page summary added — Next: add interactive product tour pages and deep feature pages.
- Intelligence products: outline present — Next: implement pages and templates for Battlecards, Market Reports, Company X-Rays.
- Solutions by role & industry: placeholder sections added — Next: create per-role pages with sample insights and competitor maps.
- Resources & Insights: placeholder pages added — Next: implement blog/intelligence hub, downloads, tutorials.
- Company & Conversion: placeholder pages — Next: pricing, onboarding, ROI calculator, demo booking.

If you'd like, I can:
- Turn this into a React + Vite + Tailwind project and wire a nicer UI.
- Add OpenAI/Grok provider switch and caching for repeated queries.
- Add a small demo pipeline that generates a PDF or PPT battlecard from the AI output.

Hosting on Vercel
- The repo deploys to Vercel as-is: `server.js` exports the Express app and `public/` is served by Vercel's CDN.
- Add the same keys as `.env` in Vercel under Project > Settings > Environment Variables: `OPENAI_API_KEY`, `TAVILY_API_KEY`, `SEARCH_PROVIDER` (and optionally `OPENAI_MODEL`). Redeploy after adding them.
- Saved runs on Vercel go to `/tmp/runs`, which is temporary. Keep reference copies by running locally, or move them to Vercel Blob later.
