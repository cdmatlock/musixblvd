// api/suggest.js
export default async function handler(req, res){
  if (req.method !== "POST") return res.status(405).end();
  const uid = req.headers["x-user"] || "demo";
  const insights = {
    instagramTop: [{ id:"ig1", likes:420, comments:33, saves:51, topic:"studio freestyle", len:22 }],
    youtubeTop:   [{ id:"yt1", views:12000, likes:600, comments:140, avgViewPct:48, topic:"vocal chain" }],
    tiktokTop:    [{ id:"tt1", views:23000, likes:1800, shares:320, topic:"chorus hook", len:15 }]
  };
  const prompt = `You are a growth strategist for a music creator. Analyze these top posts and propose:
1) 3 cross-platform content ideas derived from what's working
2) Best post times and cadence per platform
3) 2 caption frameworks with fill-in blanks
4) A 7-day calendar (titles + short briefs)

Data: ${JSON.stringify(insights)}
Keep it concise, bullets only.`;

  try{
    const rsp = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        model:"gpt-4.1-mini",
        temperature:0.5,
        max_output_tokens:800,
        input: prompt
      })
    });
    if(!rsp.ok){
      const err = await rsp.text();
      return res.status(500).json({ error:"Upstream error", detail:err });
    }
    const data = await rsp.json();
    return res.json({ plan: data?.output_text || "No plan." });
  }catch(e){
    return res.status(500).json({ error:e.message });
  }
}
