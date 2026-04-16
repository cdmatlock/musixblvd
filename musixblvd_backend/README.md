# MusixBlvd backend

This is a small Node/Express backend for your dashboard.

## Files
- `server.js` — starts the backend
- `routes/social.js` — `/api/social-insights`
- `routes/mikey.js` — `/api/mikey-advice`
- `providers/instagram.js` — Instagram fetch + normalize
- `providers/tiktok.js` — TikTok fetch + normalize
- `providers/mikey.js` — OpenAI-powered MIKEY advice
- `.env.example` — copy to `.env` and add your real keys

## Install
```bash
cd musixblvd_backend
npm install
cp .env.example .env
npm run dev
```

## Where to put this

### If your site is just HTML/CSS/JS on your computer
Put the whole `musixblvd_backend` folder next to your website folder.

Example:
project-folder/
  dashboard_fixed_v11_disconnect_fix7_api.html
  opps-advanced.css
  library.css
  images/
  musixblvd_backend/

Then run the backend from inside `musixblvd_backend`.

### If you host the frontend somewhere else
Keep this backend as its own app on Render, Railway, Vercel, or another Node host.
Then point your frontend fetch URLs to that backend URL.

## Important
The frontend should call this backend, not Instagram/TikTok/OpenAI directly.
Your secrets stay in `.env`, never in your HTML.
