import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
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

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || '3223245321188975';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || '';
const INSTAGRAM_REDIRECT_URI = 'https://musixblvd.onrender.com/dashboard.html';

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'mikey-server' });
});

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

app.post('/api/instagram/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!code) {
      return res.status(400).json({ error: 'Missing Instagram authorization code.' });
    }

    if (!INSTAGRAM_APP_SECRET) {
      return res.status(500).json({ error: 'Missing INSTAGRAM_APP_SECRET in your .env file.' });
    }

    const form = new URLSearchParams();
    form.set('client_id', INSTAGRAM_APP_ID);
    form.set('client_secret', INSTAGRAM_APP_SECRET);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', INSTAGRAM_REDIRECT_URI);
    form.set('code', code);

    const tokenResp = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error('Instagram exchange error:', tokenData);
      return res.status(tokenResp.status).json(tokenData);
    }

    return res.json(tokenData);
  } catch (error) {
    console.error('Instagram code exchange error:', error);
    return res.status(500).json({ error: 'Instagram code exchange failed.' });
  }
});

app.post('/api/instagram/profile', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Instagram access token.' });
    }

    const profileUrl = new URL('https://graph.instagram.com/me');
    profileUrl.searchParams.set(
      'fields',
      [
        'user_id',
        'username',
        'account_type',
        'media_count',
        'biography',
        'website',
        'name',
        'profile_picture_url',
        'followers_count',
        'follows_count'
      ].join(',')
    );
    profileUrl.searchParams.set('access_token', accessToken);

    const profileResp = await fetch(profileUrl.toString());
    const profileData = await profileResp.json();

    if (!profileResp.ok) {
      console.error('Instagram profile error:', profileData);
      return res.status(profileResp.status).json(profileData);
    }

    return res.json(profileData);
  } catch (error) {
    console.error('Instagram profile fetch error:', error);
    return res.status(500).json({ error: 'Instagram profile fetch failed.' });
  }
});

app.post('/api/instagram/media', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Instagram access token.' });
    }

    const mediaUrl = new URL('https://graph.instagram.com/me/media');
    mediaUrl.searchParams.set(
      'fields',
      'id,caption,media_type,media_product_type,permalink,timestamp,media_url,thumbnail_url'
    );
    mediaUrl.searchParams.set('limit', '6');
    mediaUrl.searchParams.set('access_token', accessToken);

    const mediaResp = await fetch(mediaUrl.toString());
    const mediaData = await mediaResp.json();

    if (!mediaResp.ok) {
      console.error('Instagram media error:', mediaData);
      return res.status(mediaResp.status).json(mediaData);
    }

    return res.json(mediaData);
  } catch (error) {
    console.error('Instagram media fetch error:', error);
    return res.status(500).json({ error: 'Instagram media fetch failed.' });
  }
});

app.post('/api/instagram/insights', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    const userId = typeof req.body?.user_id === 'string' ? req.body.user_id.trim() : '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Instagram access token.' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Missing Instagram user ID.' });
    }

    const insightsUrl = new URL(`https://graph.instagram.com/${encodeURIComponent(userId)}/insights`);
    insightsUrl.searchParams.set(
      'metric',
      'accounts_engaged,accounts_reached,total_interactions,likes,comments,saves,shares,views,follows_and_unfollows'
    );
    insightsUrl.searchParams.set('period', 'day');
    insightsUrl.searchParams.set('metric_type', 'total_value');
    insightsUrl.searchParams.set('access_token', accessToken);

    const insightsResp = await fetch(insightsUrl.toString());
    const insightsData = await insightsResp.json();

    if (!insightsResp.ok) {
      console.error('Instagram insights error:', insightsData);
      return res.status(insightsResp.status).json(insightsData);
    }

    return res.json(insightsData);
  } catch (error) {
    console.error('Instagram insights fetch error:', error);
    return res.status(500).json({ error: 'Instagram insights fetch failed.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(port, () => {
  console.log(`MIKEY server running on http://localhost:${port}`);
});
