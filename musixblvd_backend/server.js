import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import socialRoutes from './routes/social.js';
import mikeyRoutes from './routes/mikey.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

app.use(cors({ origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'musixblvd-backend' });
});

app.use('/api', socialRoutes);
app.use('/api', mikeyRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`MusixBlvd backend running on http://localhost:${PORT}`);
});
