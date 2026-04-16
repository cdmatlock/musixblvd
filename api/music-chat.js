// api/music-chat.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const q = (body.message || "").trim();
    if (!q) return res.status(400).json({ text: "Ask a music question." });

    const musicGate = /(music|mix|master|eq|compress|reverb|delay|chorus|flanger|melody|harmony|chord|progression|scale|mode|key|tempo|bpm|beat|drum|808|snare|kick|hi-?hat|piano|guitar|bass|synth|vocal|microphone|recording|mastering|mixing|arrangement|bridge|verse|chorus|hook|lyric|songwriting|sound design|daw|ableton|fl studio|logic pro|pro tools|cubase|studio one|reason|bitwig|plugins|vst|limiter|compressor|sidechain|bus|stem|wav|mp3|sample|sampler|midi|quantize|swing|groove)/i;
    if (!musicGate.test(q)) return res.json({ text: "I’m focused on music topics only. Try mixing, theory, songwriting, gear, or production." });

    const systemPrompt = `You are MusixBlvd Assistant, a producer/engineer coach for this user's music.
Be concise, practical, and music-first. Provide step-by-step settings and concrete examples.
Ask 1 quick follow-up only if it makes the answer better.
Rules:
- Stay strictly on music production, songwriting, mixing, mastering, gear, performance, music business basics (royalties/licenses), or DAW workflow.
- Prefer concrete settings: e.g., "Attack 10–20ms, Release 60–120ms, Ratio 3:1, GR ~4 dB".
- Offer 2–3 options if taste-dependent (mics, EQ approaches, chord voicings).
- Use short bullets. Keep answers scannable.`.trim();

    const rsp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.5,
        max_output_tokens: 600,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: q }
        ]
      })
    });

    if (!rsp.ok) {
      const err = await rsp.text();
      return res.status(500).json({ text: "Upstream error.", detail: err });
    }
    const data = await rsp.json();
    const text = data?.output_text || "Sorry, I couldn’t generate a response.";
    return res.json({ text });
  } catch (e) {
    return res.status(500).json({ text: "Server error.", detail: e.message });
  }
}
