# Vantage-360 · Market Intelligence

**by [Continuum Lab](https://continuumlab.in)**

Vantage-360 turns a single question about a market or a company into a forward-looking intelligence brief for senior leaders. Each study searches the web, cites its sources, and separates what is known from what is estimated and what is imagined.

**Live demo:** [vantage-360-mi.vercel.app](https://vantage-360-mi.vercel.app)

> Status: MVP prototype, built to demonstrate the concept. It is not yet a production service.

## What a study contains

Every brief is organised into four sections, shown as tiles you can jump between:

| Section | What it answers |
|---|---|
| 🎯 Competitor discovery | The 4 to 6 players that matter, including newcomers from outside the market, and their dated, sourced moves from the last 18 months. |
| 📊 Market size | Size and growth, segments and regions, how customers buy, and where the profit pool is moving. |
| 🔔 Alerts | Signals to act on now, with a standing check on whether AI labs are moving into the market. |
| 🤖 AI forward-looking analysis | The future of work in 2030 and 2035 (expected, radical and wildcard scenarios) and bold moves to set the trend rather than follow it. |

Each point is labelled **[Fact]**, **[Estimate]** or **[Foresight]**, and every Fact carries a numbered citation to its web source. The brief closes with one question for the leader to put to their team on Monday.

## Features

- **Web-grounded research.** Tavily web search by default, with OpenAI's built-in web search as an alternative.
- **Saved runs.** Every live study is saved as a small standalone HTML file (about 15 KB) that opens in any browser, offline included, and is listed under *Past runs*.
- **Day and night themes**, with a layout that works on desktop and mobile.
- **Sample mode.** Without an API key the app runs on built-in sample data, so the interface can be shown anywhere.

## Getting started

Requirements: [Node.js](https://nodejs.org) 18 or later.

```bash
git clone https://github.com/A1MITG/MI.git
cd MI
npm install
cp env.example .env      # Windows PowerShell: Copy-Item env.example .env
npm start
```

Then open <http://localhost:4000>. Use `npm run dev` to restart automatically on code changes.

## Configuration

All settings live in `.env`, which is never committed. `env.example` lists every option with a short explanation.

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | For live studies | Writes the study. Without it the app shows sample data. |
| `OPENAI_MODEL` | No | Model that writes the study. Default `gpt-4o-mini`. |
| `SEARCH_PROVIDER` | No | `tavily` (default), `openai` or `none`. |
| `TAVILY_API_KEY` | When using Tavily | Web search through Tavily. |
| `OPENAI_SEARCH_MODEL` | No | Model used when `SEARCH_PROVIDER=openai`. Default `gpt-4.1-mini`. |
| `RUNS_DIR` | No | Folder for saved runs. Default `runs/`. |
| `PORT` | No | Local port. Default `4000`. |

Restart the server after changing `.env`. `GET /api/health` reports whether live mode is on and which search provider is active.

## API

| Endpoint | Description |
|---|---|
| `POST /api/insights` | Body `{ "query": "..." }`. Returns the study text, its sources and a link to the saved run. |
| `GET /api/runs` | Lists saved runs. |
| `GET /runs/<file>` | Opens a saved run. |
| `GET /api/health` | Status, live mode and active search provider. |

## Project structure

```
server.js            Express app: study prompt and API routes
search.js            Web search (Tavily or OpenAI)
runs.js              Saves each study as a standalone HTML file
public/              Front end (HTML, CSS, JavaScript, brand assets)
public/study-format.js   Shared formatting for the page and saved runs
env.example          Template for .env
ROLLBACK.md          Restore points and how to roll back
```

## Deployment

The app deploys to [Vercel](https://vercel.com) as is: `server.js` exports the Express app as a function and `public/` is served from Vercel's CDN.

1. Import the repository into Vercel.
2. Add the same variables as your `.env` under *Project → Settings → Environment Variables*.
3. Redeploy.

On Vercel, saved runs go to `/tmp/runs` and last only while a server instance is warm. Run locally to keep permanent copies.

## Security

- API keys are read from environment variables only. `.env` and other key files are listed in `.gitignore`.
- The hosted demo has no sign-in yet. Add access protection before sharing it beyond a trusted audience.

## Roadmap

- Access protection and user accounts for the hosted demo
- Clearer separation of competitors and partners in competitor discovery
- Durable storage for saved runs on Vercel
- Export of a brief as PDF or slides

## About

Vantage-360 is built by [Continuum Lab](https://continuumlab.in). Access is free for students and learners.
