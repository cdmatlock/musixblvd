import express from 'express';
import { getInstagramInsights } from '../providers/instagram.js';
import { getTikTokInsights } from '../providers/tiktok.js';

const router = express.Router();

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

export default router;
