// ai-onboard.js — grants, progress, and results rendering

// Reuse tab behavior, logout, and chat from chat.js
// This file focuses on the AI Growth page.

const agree = document.getElementById("agree");
const startBtn = document.getElementById("startAnalysis");
const scanModal = document.getElementById("scanModal");
const aiResults = document.getElementById("aiResults");
const planBox = document.getElementById("planBox");
const regen = document.getElementById("regen");

const signalsList = document.getElementById("signalsList");
const movesList = document.getElementById("movesList");

const providers = document.querySelectorAll(".prov");

// Enable the CTA only when user agrees
agree.addEventListener("change", () => {
  startBtn.disabled = !agree.checked;
});

// Simulate connecting providers (demo)
providers.forEach(p => {
  p.addEventListener("click", () => {
    p.classList.toggle("connected");
    p.textContent = p.classList.contains("connected") ? `${p.dataset.p || p.textContent} ✓` : (p.dataset.p || p.textContent.replace(" ✓",""));
  });
});

startBtn.addEventListener("click", async () => {
  // Require at least one provider for demo flow
  const any = Array.from(providers).some(p => p.classList.contains("connected"));
  if (!any) { alert("Connect at least one platform to analyze."); return; }

  // Show progress modal
  scanModal.classList.remove("hidden");

  // Fake step progression (you can replace with real API calls)
  const steps = Array.from(scanModal.querySelectorAll(".step"));
  for (let i = 0; i < steps.length; i++) {
    await wait(800 + Math.random()*600);
    steps[i].classList.add("done");
  }

  // Call your strategy endpoint (works on Vercel with OPENAI_API_KEY)
  let planText = "";
  try {
    const r = await fetch("/api/suggest", { method: "POST" });
    const j = await r.json();
    planText = j.plan || "No plan yet.";
  } catch (e) {
    planText = "Could not generate a plan (demo mode).";
  }

  // Close modal and show results
  scanModal.classList.add("hidden");
  aiResults.classList.remove("hidden");
  planBox.textContent = planText;

  // Inject demo “Top Signals” and “Cross-Platform Moves”
  renderSignals([
    "IG saves ratio higher than likes → content is reference-worthy (tutorials/cheat-sheets).",
    "YT avg view % ~48% on ‘vocal chain’ topics → strong how-to potential.",
    "Short hooks (15–22s) on TikTok have share spikes → keep chorus upfront."
  ]);
  renderMoves([
    "Turn best IG carousels into 60–90s YT Shorts with chapters.",
    "Cut 3 hooks from your top TikTok and test on Reels with alt captions.",
    "Cross-post vocal chain tips: short clip (TT/Reels), medium breakdown (Shorts), long tutorial (YT)."
  ]);
});

regen.addEventListener("click", async () => {
  regen.disabled = true;
  regen.textContent = "Regenerating…";
  try {
    const r = await fetch("/api/suggest", { method:"POST" });
    const j = await r.json();
    planBox.textContent = j.plan || "No plan.";
  } catch {
    planBox.textContent = "Could not regenerate (demo).";
  }
  regen.disabled = false;
  regen.textContent = "Regenerate";
});

// Helpers
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }
function renderSignals(items){
  signalsList.innerHTML = "";
  items.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    signalsList.appendChild(li);
  });
}
function renderMoves(items){
  movesList.innerHTML = "";
  items.forEach(t => {
    const li = document.createElement("li");
    li.textContent = t;
    movesList.appendChild(li);
  });
}
