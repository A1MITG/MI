import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/insights', async (req, res) => {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // If OPENAI_API_KEY is provided, call OpenAI Chat Completion API (simple integration)
    if (process.env.OPENAI_API_KEY) {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const payload = {
        model,
        messages: [
          { role: 'system', content: 'You are an expert market & competitive intelligence analyst. Structure your response in exactly 4 sections: "🎯 COMPETITOR DISCOVERY" (list 3-5 key competitors with brief descriptions), "📊 MARKET SIZING" (TAM/SAM estimates with regions), "🔔 MONITORING & ALERTS" (3-4 key signals to track), "🤖 AI-POWERED ANALYSIS" (strategic insights and recommendations). Keep each section concise.' },
          { role: 'user', content: `Analyze: ${query}` }
        ],
        max_tokens: 900,
        temperature: 0.2
      };

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? JSON.stringify(data);
      return res.json({ source: 'openai', text });
    }

    // Fallback mocked response when no API key
    const mock = `🎯 COMPETITOR DISCOVERY
• ExampleCorp — Market leader with 35% share, strong in enterprise
• RivalAI — Fast-growing challenger, AI-first approach
• DataEdge — Regional player, competitive pricing

📊 MARKET SIZING
• Global TAM: $12.5B (2024), growing 18% CAGR
• Key regions: North America (45%), EMEA (30%), APAC (25%)
• Addressable segments: Enterprise ($8B), Mid-market ($4.5B)

🔔 MONITORING & ALERTS
• Track funding announcements and M&A activity
• Monitor product launches and feature releases
• Watch pricing changes and GTM strategy shifts
• Follow regulatory developments in key markets

🤖 AI-POWERED ANALYSIS
• Market shows strong consolidation pressure — expect M&A
• AI adoption is key differentiator for next 18 months
• Regional expansion opportunities in underserved APAC markets
• Recommended action: Focus on enterprise AI capabilities and strategic partnerships

💡 Note: Set OPENAI_API_KEY to enable live AI-powered results.`;
    return res.json({ source: 'mock', text: mock });
  } catch (err) {
    console.error('Error in /api/insights', err);
    return res.status(500).json({ error: err.message || 'unknown' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI MI MVP server listening on http://localhost:${PORT}`);
});
