import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
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
const INSTAGRAM_REDIRECT_URI = 'https://musixblvd.com/dashboard.html';
const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID || '';
const SOUNDCLOUD_CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET || '';
const SOUNDCLOUD_REDIRECT_URI = process.env.SOUNDCLOUD_REDIRECT_URI || 'https://musixblvd.com/dashboard.html';
const SOUNDCLOUD_AUTH_BASE_URL = 'https://secure.soundcloud.com/authorize';
const SOUNDCLOUD_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
const SOUNDCLOUD_API_BASE_URL = 'https://api.soundcloud.com';

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || '';
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || '';
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || 'https://musixblvd.com/dashboard.html';
const YOUTUBE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const YOUTUBE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';

// ---------------- Additional provider configuration ----------------
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'awzrpugp2i4c48x0';
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'xskxj3O5VLKMVgYCT0JgTdaNbgVrkZaV';
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || 'https://musixblvd.com/dashboard.html';
const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_API_BASE_URL = 'https://open.tiktokapis.com/v2';
const TIKTOK_SCOPE = 'user.info.basic,user.info.profile,user.info.stats,video.list';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://musixblvd.com/dashboard.html';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const SPOTIFY_SCOPE = 'user-read-private user-read-email';

const X_CLIENT_ID = process.env.X_CLIENT_ID || '';
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET || '';
const X_REDIRECT_URI = process.env.X_REDIRECT_URI || 'https://musixblvd.com/dashboard.html';
const X_AUTH_URL = 'https://x.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_API_BASE_URL = 'https://api.x.com/2';
const X_SCOPE = 'users.read tweet.read offline.access';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID || '';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || '';
const APPLE_PRIVATE_KEY = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');


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

function makeSoundCloudCodeVerifier() {
  return crypto.randomBytes(64).toString('base64url');
}

function makeSoundCloudCodeChallenge(codeVerifier) {
  return crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
}


function makePkcePair() {
  const verifier = crypto.randomBytes(64).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function createAppleDeveloperToken() {
  if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) return '';

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: APPLE_KEY_ID };
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + (60 * 60)
  };

  const signingInput = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: APPLE_PRIVATE_KEY,
    dsaEncoding: 'ieee-p1363'
  }).toString('base64url');

  return `${signingInput}.${signature}`;
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return { error: text || 'Invalid JSON response.' };
  }
}

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


app.get('/api/soundcloud/auth-url', (_req, res) => {
  try {
    if (!SOUNDCLOUD_CLIENT_ID) {
      return res.status(500).json({ error: 'Missing SOUNDCLOUD_CLIENT_ID in your environment variables.' });
    }

    const codeVerifier = makeSoundCloudCodeVerifier();
    const codeChallenge = makeSoundCloudCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(24).toString('hex');

    const authUrl = new URL(SOUNDCLOUD_AUTH_BASE_URL);
    authUrl.searchParams.set('client_id', SOUNDCLOUD_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', SOUNDCLOUD_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    return res.json({
      auth_url: authUrl.toString(),
      code_verifier: codeVerifier,
      state,
      redirect_uri: SOUNDCLOUD_REDIRECT_URI
    });
  } catch (error) {
    console.error('SoundCloud auth URL error:', error);
    return res.status(500).json({ error: 'SoundCloud auth URL creation failed.' });
  }
});

app.post('/api/soundcloud/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const codeVerifier = typeof req.body?.code_verifier === 'string' ? req.body.code_verifier.trim() : '';

    if (!code) {
      return res.status(400).json({ error: 'Missing SoundCloud authorization code.' });
    }

    if (!codeVerifier) {
      return res.status(400).json({ error: 'Missing SoundCloud PKCE code_verifier.' });
    }

    if (!SOUNDCLOUD_CLIENT_ID) {
      return res.status(500).json({ error: 'Missing SOUNDCLOUD_CLIENT_ID in your environment variables.' });
    }

    if (!SOUNDCLOUD_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Missing SOUNDCLOUD_CLIENT_SECRET in your environment variables.' });
    }

    const form = new URLSearchParams();
    form.set('client_id', SOUNDCLOUD_CLIENT_ID);
    form.set('client_secret', SOUNDCLOUD_CLIENT_SECRET);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', SOUNDCLOUD_REDIRECT_URI);
    form.set('code', code);
    form.set('code_verifier', codeVerifier);

    const tokenResp = await fetch(SOUNDCLOUD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const tokenData = await readJsonResponse(tokenResp);

    if (!tokenResp.ok) {
      console.error('SoundCloud exchange error:', tokenData);
      return res.status(tokenResp.status).json(tokenData);
    }

    return res.json(tokenData);
  } catch (error) {
    console.error('SoundCloud code exchange error:', error);
    return res.status(500).json({ error: 'SoundCloud code exchange failed.' });
  }
});

app.post('/api/soundcloud/me', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing SoundCloud access token.' });
    }

    const meResp = await fetch(`${SOUNDCLOUD_API_BASE_URL}/me`, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const meData = await readJsonResponse(meResp);

    if (!meResp.ok) {
      console.error('SoundCloud profile error:', meData);
      return res.status(meResp.status).json(meData);
    }

    return res.json(meData);
  } catch (error) {
    console.error('SoundCloud profile fetch error:', error);
    return res.status(500).json({ error: 'SoundCloud profile fetch failed.' });
  }
});

app.post('/api/soundcloud/tracks', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    const limitRaw = Number.parseInt(req.body?.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing SoundCloud access token.' });
    }

    const tracksUrl = new URL(`${SOUNDCLOUD_API_BASE_URL}/me/tracks`);
    tracksUrl.searchParams.set('limit', String(limit));

    const tracksResp = await fetch(tracksUrl.toString(), {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const tracksData = await readJsonResponse(tracksResp);

    if (!tracksResp.ok) {
      console.error('SoundCloud tracks error:', tracksData);
      return res.status(tracksResp.status).json(tracksData);
    }

    return res.json(tracksData);
  } catch (error) {
    console.error('SoundCloud tracks fetch error:', error);
    return res.status(500).json({ error: 'SoundCloud tracks fetch failed.' });
  }
});


// ---------------- YouTube OAuth + channel data ----------------
app.get('/api/youtube/auth-url', (_req, res) => {
  try {
    if (!YOUTUBE_CLIENT_ID) {
      return res.status(500).json({ error: 'Missing YOUTUBE_CLIENT_ID in your environment variables.' });
    }

    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = new URL(YOUTUBE_AUTH_URL);
    authUrl.searchParams.set('client_id', YOUTUBE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', YOUTUBE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', YOUTUBE_SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return res.json({
      auth_url: authUrl.toString(),
      state,
      redirect_uri: YOUTUBE_REDIRECT_URI
    });
  } catch (error) {
    console.error('YouTube auth URL error:', error);
    return res.status(500).json({ error: 'YouTube auth URL creation failed.' });
  }
});

app.post('/api/youtube/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!code) {
      return res.status(400).json({ error: 'Missing YouTube authorization code.' });
    }

    if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in your environment variables.'
      });
    }

    const form = new URLSearchParams();
    form.set('client_id', YOUTUBE_CLIENT_ID);
    form.set('client_secret', YOUTUBE_CLIENT_SECRET);
    form.set('code', code);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', YOUTUBE_REDIRECT_URI);

    const tokenResp = await fetch(YOUTUBE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    const tokenData = await readJsonResponse(tokenResp);

    if (!tokenResp.ok) {
      console.error('YouTube exchange error:', tokenData);
      return res.status(tokenResp.status).json(tokenData);
    }

    return res.json(tokenData);
  } catch (error) {
    console.error('YouTube code exchange error:', error);
    return res.status(500).json({ error: 'YouTube code exchange failed.' });
  }
});

app.post('/api/youtube/channel', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing YouTube access token.' });
    }

    const channelUrl = new URL(`${YOUTUBE_API_BASE_URL}/channels`);
    channelUrl.searchParams.set('part', 'snippet,statistics,contentDetails,brandingSettings');
    channelUrl.searchParams.set('mine', 'true');

    const channelResp = await fetch(channelUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const channelData = await readJsonResponse(channelResp);

    if (!channelResp.ok) {
      console.error('YouTube channel error:', channelData);
      return res.status(channelResp.status).json(channelData);
    }

    return res.json(channelData);
  } catch (error) {
    console.error('YouTube channel fetch error:', error);
    return res.status(500).json({ error: 'YouTube channel fetch failed.' });
  }
});

app.post('/api/youtube/videos', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    const playlistId = typeof req.body?.playlist_id === 'string' ? req.body.playlist_id.trim() : '';
    const limitRaw = Number.parseInt(req.body?.limit, 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing YouTube access token.' });
    }

    if (!playlistId) {
      return res.status(400).json({ error: 'Missing YouTube uploads playlist ID.' });
    }

    const videosUrl = new URL(`${YOUTUBE_API_BASE_URL}/playlistItems`);
    videosUrl.searchParams.set('part', 'snippet,contentDetails');
    videosUrl.searchParams.set('playlistId', playlistId);
    videosUrl.searchParams.set('maxResults', String(limit));

    const videosResp = await fetch(videosUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    });

    const videosData = await readJsonResponse(videosResp);

    if (!videosResp.ok) {
      console.error('YouTube videos error:', videosData);
      return res.status(videosResp.status).json(videosData);
    }

    return res.json(videosData);
  } catch (error) {
    console.error('YouTube videos fetch error:', error);
    return res.status(500).json({ error: 'YouTube videos fetch failed.' });
  }
});



// ============================================================================
// TikTok OAuth + Display API
// ============================================================================
app.get('/api/tiktok/auth-url', (_req, res) => {
  try {
    if (!TIKTOK_CLIENT_KEY) {
      return res.status(503).json({ error: 'TikTok is not configured yet. Add TIKTOK_CLIENT_KEY in Render.' });
    }

    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = new URL(TIKTOK_AUTH_URL);
    authUrl.searchParams.set('client_key', TIKTOK_CLIENT_KEY);
    authUrl.searchParams.set('scope', TIKTOK_SCOPE);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', TIKTOK_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    return res.json({ auth_url: authUrl.toString(), state, redirect_uri: TIKTOK_REDIRECT_URI });
  } catch (error) {
    console.error('TikTok auth URL error:', error);
    return res.status(500).json({ error: 'TikTok auth URL creation failed.' });
  }
});

app.post('/api/tiktok/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) return res.status(400).json({ error: 'Missing TikTok authorization code.' });
    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      return res.status(503).json({ error: 'TikTok Client Key/Secret are not configured in Render.' });
    }

    const form = new URLSearchParams();
    form.set('client_key', TIKTOK_CLIENT_KEY);
    form.set('client_secret', TIKTOK_CLIENT_SECRET);
    form.set('code', code);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', TIKTOK_REDIRECT_URI);

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: form.toString()
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    console.error('TikTok token exchange error:', error);
    return res.status(500).json({ error: 'TikTok token exchange failed.' });
  }
});

app.post('/api/tiktok/refresh-token', async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
    if (!refreshToken) return res.status(400).json({ error: 'Missing TikTok refresh token.' });

    const form = new URLSearchParams();
    form.set('client_key', TIKTOK_CLIENT_KEY);
    form.set('client_secret', TIKTOK_CLIENT_SECRET);
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);

    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    console.error('TikTok refresh error:', error);
    return res.status(500).json({ error: 'TikTok token refresh failed.' });
  }
});

app.post('/api/tiktok/user', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    if (!accessToken) return res.status(400).json({ error: 'Missing TikTok access token.' });

    const url = new URL(`${TIKTOK_API_BASE_URL}/user/info/`);
    url.searchParams.set(
      'fields',
      'open_id,union_id,avatar_url,avatar_url_100,avatar_large_url,display_name,username,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count'
    );

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    const data = await readJsonResponse(response);
    if (!response.ok || (data?.error?.code && data.error.code !== 'ok')) {
      return res.status(response.ok ? 400 : response.status).json(data);
    }
    return res.json(data);
  } catch (error) {
    console.error('TikTok user error:', error);
    return res.status(500).json({ error: 'TikTok user fetch failed.' });
  }
});

app.post('/api/tiktok/videos', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    const maxRaw = Number.parseInt(req.body?.max_count, 10);
    const maxCount = Number.isFinite(maxRaw) ? Math.min(Math.max(maxRaw, 1), 20) : 10;
    if (!accessToken) return res.status(400).json({ error: 'Missing TikTok access token.' });

    const url = new URL(`${TIKTOK_API_BASE_URL}/video/list/`);
    url.searchParams.set(
      'fields',
      'id,title,video_description,duration,cover_image_url,embed_link,share_url,create_time,view_count,like_count,comment_count,share_count'
    );

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ max_count: maxCount })
    });

    const data = await readJsonResponse(response);
    if (!response.ok || (data?.error?.code && data.error.code !== 'ok')) {
      return res.status(response.ok ? 400 : response.status).json(data);
    }
    return res.json(data);
  } catch (error) {
    console.error('TikTok videos error:', error);
    return res.status(500).json({ error: 'TikTok video fetch failed.' });
  }
});

// ============================================================================
// Spotify OAuth (ready when Spotify developer credentials are added)
// ============================================================================
app.get('/api/spotify/auth-url', (_req, res) => {
  try {
    if (!SPOTIFY_CLIENT_ID) {
      return res.status(503).json({ error: 'Spotify is not configured yet. Add SPOTIFY_CLIENT_ID in Render.' });
    }
    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = new URL(SPOTIFY_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
    authUrl.searchParams.set('scope', SPOTIFY_SCOPE);
    authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
    authUrl.searchParams.set('state', state);
    return res.json({ auth_url: authUrl.toString(), state, redirect_uri: SPOTIFY_REDIRECT_URI });
  } catch (error) {
    return res.status(500).json({ error: 'Spotify auth URL creation failed.' });
  }
});

app.post('/api/spotify/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (!code) return res.status(400).json({ error: 'Missing Spotify authorization code.' });
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return res.status(503).json({ error: 'Spotify Client ID/Secret are not configured in Render.' });
    }

    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', SPOTIFY_REDIRECT_URI);

    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Spotify token exchange failed.' });
  }
});

app.post('/api/spotify/refresh-token', async (req, res) => {
  try {
    const refreshToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
    if (!refreshToken) return res.status(400).json({ error: 'Missing Spotify refresh token.' });
    const form = new URLSearchParams();
    form.set('grant_type', 'refresh_token');
    form.set('refresh_token', refreshToken);
    const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Spotify token refresh failed.' });
  }
});

app.post('/api/spotify/me', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    if (!accessToken) return res.status(400).json({ error: 'Missing Spotify access token.' });
    const response = await fetch(`${SPOTIFY_API_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Spotify profile fetch failed.' });
  }
});

// ============================================================================
// X OAuth 2.0 + PKCE (ready when X developer credentials are added)
// ============================================================================
app.get('/api/x/auth-url', (_req, res) => {
  try {
    if (!X_CLIENT_ID) {
      return res.status(503).json({ error: 'X is not configured yet. Add X_CLIENT_ID in Render.' });
    }
    const { verifier, challenge } = makePkcePair();
    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = new URL(X_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', X_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', X_REDIRECT_URI);
    authUrl.searchParams.set('scope', X_SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    return res.json({
      auth_url: authUrl.toString(),
      state,
      code_verifier: verifier,
      redirect_uri: X_REDIRECT_URI
    });
  } catch (error) {
    return res.status(500).json({ error: 'X auth URL creation failed.' });
  }
});

app.post('/api/x/exchange-code', async (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const verifier = typeof req.body?.code_verifier === 'string' ? req.body.code_verifier.trim() : '';
    if (!code || !verifier) return res.status(400).json({ error: 'Missing X code or PKCE verifier.' });
    if (!X_CLIENT_ID) return res.status(503).json({ error: 'X Client ID is not configured in Render.' });

    const form = new URLSearchParams();
    form.set('code', code);
    form.set('grant_type', 'authorization_code');
    form.set('client_id', X_CLIENT_ID);
    form.set('redirect_uri', X_REDIRECT_URI);
    form.set('code_verifier', verifier);

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (X_CLIENT_SECRET) {
      headers.Authorization = `Basic ${Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64')}`;
    }

    const response = await fetch(X_TOKEN_URL, { method: 'POST', headers, body: form.toString() });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'X token exchange failed.' });
  }
});

app.post('/api/x/me', async (req, res) => {
  try {
    const accessToken = typeof req.body?.access_token === 'string' ? req.body.access_token.trim() : '';
    if (!accessToken) return res.status(400).json({ error: 'Missing X access token.' });

    const url = new URL(`${X_API_BASE_URL}/users/me`);
    url.searchParams.set(
      'user.fields',
      'created_at,description,verified,public_metrics,profile_image_url,location,url,protected'
    );

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
    });
    const data = await readJsonResponse(response);
    if (!response.ok) return res.status(response.status).json(data);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'X profile fetch failed.' });
  }
});

// ============================================================================
// Apple Music preparation.
// MusicKit on the Web handles the user's Apple Music authorization in-browser.
// This endpoint supplies the short-lived developer token once Apple credentials exist.
// ============================================================================
app.get('/api/apple/developer-token', (_req, res) => {
  try {
    const token = createAppleDeveloperToken();
    if (!token) {
      return res.status(503).json({
        error: 'Apple Music is not configured yet. Add APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY in Render.'
      });
    }
    return res.json({ developer_token: token });
  } catch (error) {
    console.error('Apple developer token error:', error);
    return res.status(500).json({ error: 'Could not create Apple Music developer token.' });
  }
});

app.get('/api/providers/status', (_req, res) => {
  return res.json({
    instagram: !!INSTAGRAM_APP_ID && !!INSTAGRAM_APP_SECRET,
    soundcloud: !!SOUNDCLOUD_CLIENT_ID && !!SOUNDCLOUD_CLIENT_SECRET,
    youtube: !!YOUTUBE_CLIENT_ID && !!YOUTUBE_CLIENT_SECRET,
    tiktok: !!TIKTOK_CLIENT_KEY && !!TIKTOK_CLIENT_SECRET,
    spotify: !!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET,
    x: !!X_CLIENT_ID,
    apple: !!APPLE_TEAM_ID && !!APPLE_KEY_ID && !!APPLE_PRIVATE_KEY
  });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(port, () => {
  console.log(`MIKEY server running on http://localhost:${port}`);
});
