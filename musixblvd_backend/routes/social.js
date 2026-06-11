import express from 'express';
import { getInstagramInsights } from '../providers/instagram.js';
import { getTikTokInsights } from '../providers/tiktok.js';

const router = express.Router();

const IG_GRAPH = 'https://graph.instagram.com';
const IG_TOKEN_URL = 'https://api.instagram.com/oauth/access_token';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message =
      data?.error_message ||
      data?.error?.message ||
      data?.error ||
      `Request failed (${res.status})`;

    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing in Render Environment Variables`);
  return value;
}

/**
 * Existing route: keeps your old Mikey/social-insights flow working.
 */
router.post('/social-insights', async (req, res, next) => {
  try {
    const { provider, accessToken } = req.body || {};
    if (!provider) return res.status(400).json({ ok: false, error: 'provider is required' });
    if (!accessToken) return res.status(400).json({ ok: false, error: 'accessToken is required' });

    const normalized = String(provider).trim().toLowerCase();
    let data;

    if (normalized === 'instagram') data = await getInstagramInsights(accessToken);
    else if (normalized === 'tiktok') data = await getTikTokInsights(accessToken);
    else return res.status(400).json({ ok: false, error: 'Unsupported provider' });

    res.json({ ok: true, provider: normalized, data });
  } catch (err) {
    next(err);
  }
});

/**
 * Instagram OAuth: exchange ?code= for access_token.
 * This matches dashboard.html -> /api/instagram/exchange-code.
 */
router.post('/instagram/exchange-code', async (req, res, next) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ ok: false, error: 'code is required' });

    const clientId = requireEnv('INSTAGRAM_CLIENT_ID');
    const clientSecret = requireEnv('INSTAGRAM_CLIENT_SECRET');
    const redirectUri = requireEnv('INSTAGRAM_REDIRECT_URI');

    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'authorization_code');
    body.set('redirect_uri', redirectUri);
    body.set('code', code);

    const shortToken = await fetchJson(IG_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    // Try to exchange for a longer-lived token. If Meta rejects it, still return the short token.
    let finalToken = shortToken;
    try {
      const longTokenUrl =
        `${IG_GRAPH}/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_secret=${encodeURIComponent(clientSecret)}` +
        `&access_token=${encodeURIComponent(shortToken.access_token)}`;

      const longToken = await fetchJson(longTokenUrl);
      finalToken = {
        ...shortToken,
        ...longToken,
        user_id: shortToken.user_id
      };
    } catch (e) {
      console.warn('Long-lived Instagram token exchange skipped:', e.message);
    }

    res.json({
      ok: true,
      access_token: finalToken.access_token,
      token_type: finalToken.token_type || 'bearer',
      expires_in: finalToken.expires_in || null,
      user_id: finalToken.user_id || shortToken.user_id || null
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Basic Instagram profile data.
 */
router.post('/instagram/profile', async (req, res, next) => {
  try {
    const accessToken = req.body?.access_token || req.body?.accessToken;
    if (!accessToken) return res.status(400).json({ ok: false, error: 'access_token is required' });

    const fields = 'user_id,username,account_type,media_count';
    const url = `${IG_GRAPH}/me?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;

    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Recent Instagram media/posts/reels.
 */
router.post('/instagram/media', async (req, res, next) => {
  try {
    const accessToken = req.body?.access_token || req.body?.accessToken;
    if (!accessToken) return res.status(400).json({ ok: false, error: 'access_token is required' });

    const fields = 'id,caption,like_count,comments_count,media_product_type,media_type,timestamp,permalink';
    const url = `${IG_GRAPH}/me/media?fields=${encodeURIComponent(fields)}&limit=12&access_token=${encodeURIComponent(accessToken)}`;

    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * Optional insights. If Meta blocks it, dashboard will skip it.
 */
router.post('/instagram/insights', async (req, res, next) => {
  try {
    const accessToken = req.body?.access_token || req.body?.accessToken;
    const userId = req.body?.user_id || req.body?.userId;

    if (!accessToken) return res.status(400).json({ ok: false, error: 'access_token is required' });
    if (!userId) return res.status(400).json({ ok: false, error: 'user_id is required' });

    const metrics = 'reach';
    const url = `${IG_GRAPH}/${encodeURIComponent(userId)}/insights?metric=${encodeURIComponent(metrics)}&period=day&access_token=${encodeURIComponent(accessToken)}`;

    const data = await fetchJson(url);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
