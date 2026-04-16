const OPENAI_URL = 'https://api.openai.com/v1/responses';

function fallbackAdvice(payload = {}) {
  const connected = Array.isArray(payload.connectedPlatforms) ? payload.connectedPlatforms : [];
  const stats = payload.weeklyStats || {};
  const signals = [];
  const moves = [];
  const plan = [];
  const proInsights = [];

  connected.forEach((platform) => {
    const s = stats[platform] || {};
    const followers = Number(s.followers || 0);
    const likes = Number(s.likes || 0);
    const comments = Number(s.comments || 0);
    const shares = Number(s.shares || 0);
    const engagement = followers ? ((likes + comments + shares) / followers) * 100 : 0;

    signals.push(`${platform}: engagement is ${engagement.toFixed(1)}%.`);
    moves.push(`${platform}: post 3–5 times this week and push your strongest hook first.`);
    plan.push(`${platform}: 2 promo clips, 1 proof post, 1 direct CTA.`);
    proInsights.push(`${platform}: top creators repeat winning formats instead of reinventing every post.`);
  });

  if (!signals.length) signals.push('No connected platforms yet. Connect Instagram or TikTok first.');
  if (!moves.length) moves.push('Start with one platform and track your weekly numbers.');
  if (!plan.length) plan.push('Post at least 3 times this week and measure results.');
  if (!proInsights.length) proInsights.push('Top creators stay consistent, study retention, and improve hooks.');

  return { signals, moves, plan, proInsights };
}

export async function buildMikeyAdvice(payload = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackAdvice(payload);

  const prompt = [
    'You are MIKEY, a music growth coach for independent artists.',
    'Return strict JSON with keys: signals, moves, plan, proInsights.',
    'Each value must be an array of short strings.',
    'Focus on Instagram, TikTok, YouTube, Spotify, SoundCloud, Apple Music, and artist growth.',
    'Base your answer on this dashboard data:',
    JSON.stringify(payload)
  ].join('\n');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.4-thinking',
      input: prompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'mikey_advice',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              signals: { type: 'array', items: { type: 'string' } },
              moves: { type: 'array', items: { type: 'string' } },
              plan: { type: 'array', items: { type: 'string' } },
              proInsights: { type: 'array', items: { type: 'string' } }
            },
            required: ['signals', 'moves', 'plan', 'proInsights']
          }
        }
      }
    })
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('OpenAI returned non-JSON output'); }
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI request failed (${res.status})`);

  let parsed = null;
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    parsed = JSON.parse(data.output_text);
  } else if (Array.isArray(data.output)) {
    const firstText = data.output.flatMap((item) => item.content || []).find((item) => item.type === 'output_text' && item.text);
    if (firstText?.text) parsed = JSON.parse(firstText.text);
  }

  return parsed || fallbackAdvice(payload);
}
