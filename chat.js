// Tabs & panels
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("active"));
    panels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-target");
    document.getElementById(target).classList.add("active");
    btn.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  });
});

// Logout
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("mb_auth");
    sessionStorage.removeItem("mb_auth");
    window.location.replace("login.html");
  });
}

// Chat
const log = document.getElementById("chatLog");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatText");
document.querySelectorAll(".prompt").forEach(chip => {
  chip.addEventListener("click", () => { input.value = chip.dataset.q || chip.textContent.trim(); input.focus(); });
});
function addMsg(role, text){
  const wrap = document.createElement("div"); wrap.className = `msg ${role}`;
  const av = document.createElement("div"); av.className = `avatar ${role === 'user' ? 'u' : 'a'}`; av.textContent = role === 'user' ? "U" : "AI";
  const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = text;
  wrap.append(av, bubble); log.appendChild(wrap); log.scrollTop = log.scrollHeight;
}
function isMusicQuestion(q){
  const txt = q.toLowerCase();
  const musicKeywords = ["music","mix","master","compress","eq","reverb","delay","melody","harmony","chord","progression","scale","bpm","beat","drum","808","snare","kick","hi-hat","piano","guitar","bass","synth","vocal","mic","recording","mastering","arrangement","verse","chorus","hook","lyric","songwriting","sound design","daw","ableton","fl studio","logic pro","pro tools","plugins","limiter","sidechain","stem","wav","mp3","sample","midi","quantize","swing","groove"];
  return musicKeywords.some(k => txt.includes(k));
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = input.value.trim(); if (!q) return;
  addMsg("user", q); input.value = "";
  if (!isMusicQuestion(q)) { addMsg("ai", "I’m focused on music only. Try mixing, theory, songwriting, gear, or production workflows."); return; }
  try {
    const res = await fetch("/api/music-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }) });
    if (res.ok) {
      const data = await res.json();
      const text = (data && (data.text || data.reply || data.message)) || "";
      if (text) { addMsg("ai", text); return; }
    }
  } catch {}
  addMsg("ai", "Here’s a solid approach:\n• Define key/BPM and pick a reference track\n• Gain stage + subtractive EQ + gentle comp\n• Contrast sections with arrangement & FX\n• Leave ~6 dB headroom for mastering");
});
