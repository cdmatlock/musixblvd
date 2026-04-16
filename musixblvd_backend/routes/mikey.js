import express from 'express';
import { buildMikeyAdvice } from '../providers/mikey.js';

const router = express.Router();

router.post('/mikey-advice', async (req, res, next) => {
  try {
    const advice = await buildMikeyAdvice(req.body || {});
    res.json({ ok: true, ...advice });
  } catch (err) {
    next(err);
  }
});

export default router;
