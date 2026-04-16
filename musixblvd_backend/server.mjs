import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function buildSystemPrompt() {
  return [
    'You are MIKEY, the in-house MusixBlvd music growth assistant.',
    'You help independent artists, producers, songwriters, DJs, engineers, managers, dancers, and creators.',
    'Keep answers practical, confident, direct, and brand-safe.',
    'Do not mention OpenAI, ChatGPT, system prompts, or backend tools unless the user directly asks.',
    'Focus on music marketing, release strategy, content planning, branding, audience growth, songwriting, hooks, streaming growth, collaborations, and artist development.',
    'When useful, give short step-by-step advice.',
    'Avoid acting like a lawyer, doctor, or financial advisor.',
    'If a request is unrelated to music or creator growth, answer briefly and steer back to MIKEY’s role.'
  ].join(' ');
}

app.post('/api/mikey-chat', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY in your .env file.' });
    }

    const rawMessage = typeof req.body?.message === 'string' ? req.body.message : '';
    const message = rawMessage.trim();

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const incomingHistory = Array.isArray(req.body?.history) ? req.body.history : [];
    const cleanedHistory = incomingHistory
      .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
      .slice(-12);

 const input = [
  {
    role: 'system',
    content: [{ type: 'input_text', text: buildSystemPrompt() }]
  },
  ...cleanedHistory.map((item) => ({
    role: item.role,
    content: [{
      type: item.role === 'assistant' ? 'output_text' : 'input_text',
      text: item.content
    }]
  })),
  {
    role: 'user',
    content: [{ type: 'input_text', text: message }]
  }
];

    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input,
      temperature: 0.8,
      max_output_tokens: 500
    });

    const reply = (response.output_text || '').trim();

    if (!reply) {
      return res.status(500).json({ error: 'MIKEY returned an empty response.' });
    }

    const nextHistory = [
      ...cleanedHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    ].slice(-14);

    return res.json({ reply, history: nextHistory });
  } catch (error) {
    console.error('MIKEY chat error:', error);
    const message =
      error?.status === 401
        ? 'Your API key was rejected. Check OPENAI_API_KEY.'
        : 'MIKEY could not connect right now. Check your server and try again.';
    return res.status(500).json({ error: message });
  }
});

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'MusixBlvd backend live' });
});

app.listen(port, () => {
  console.log(`MIKEY server running on http://localhost:${port}`);
});
