/* ===== MusixBlvd – Library (client-side audio analysis demo) ===== */
(function(){
  const panel = document.getElementById('library');
  if (!panel) return;

  // Elements
  const consent  = panel.querySelector('#libConsent');
  const connect  = panel.querySelector('#libConnect');
  const provBtns = panel.querySelectorAll('.prov');

  const fileInput = panel.querySelector('#libFile');
  const analyzeBtn= panel.querySelector('#analyzeBtn');
  const player    = panel.querySelector('#player');
  const fileMeta  = panel.querySelector('#fileMeta');

  const statsBox  = panel.querySelector('#analysisStats');
  const adviceUl  = panel.querySelector('#adviceList');
  const refreshBtn= panel.querySelector('#libRefresh');

  // Provider toggle + consent gate
  provBtns.forEach(b=> b.addEventListener('click', ()=> b.classList.toggle('active')));
  const syncConnect = ()=> connect.disabled = !consent.checked;
  consent.addEventListener('change', syncConnect); syncConnect();
  connect.addEventListener('click', ()=> alert('Demo: connected (simulated).'));

  // File selection
  fileInput.addEventListener('change', ()=>{
    const f = fileInput.files?.[0];
    analyzeBtn.disabled = !f;
    if (f){
      player.src = URL.createObjectURL(f);
      player.style.display = 'block';
      fileMeta.textContent = `${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
    } else {
      player.removeAttribute('src'); player.style.display='none';
      fileMeta.textContent = '';
    }
  });

  // Helpers
  const toDb = x => 20 * Math.log10(Math.max(x, 1e-12));  // dBFS-ish
  const clamp = (v,min,max)=> Math.max(min, Math.min(max,v));

  async function analyzeFile(file){
    const buf = await file.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audio = await ctx.decodeAudioData(buf);

    // Mix to mono for analysis
    const len = audio.length;
    const sr  = audio.sampleRate;
    const ch  = audio.numberOfChannels;
    const data = new Float32Array(len);
    for (let c=0;c<ch;c++){
      const chData = audio.getChannelData(c);
      for (let i=0;i<len;i++) data[i] += chData[i] / ch;
    }

    // Peak / RMS / clipping
    let peak = 0, sumSq = 0, clips = 0;
    for (let i=0;i<len;i++){
      const s = data[i];
      const a = Math.abs(s);
      if (a > peak) peak = a;
      sumSq += s*s;
      if (a >= 0.98) clips++;
    }
    const rms = Math.sqrt(sumSq / len);
    const peakDb = toDb(peak);
    const rmsDb  = toDb(rms);
    const crest  = peakDb - rmsDb; // dynamic range-ish

    // Rough BPM (autocorrelation on downsampled mono)
    const downRate = 2000;                     // downsample target
    const step = Math.floor(sr / downRate);    // step size
    const N = Math.floor(len/step);
    const mono = new Float32Array(N);
    for (let i=0, j=0; i<len && j<N; i+=step, j++) mono[j] = data[i];

    // remove DC
    let mean = 0; for (let i=0;i<N;i++) mean += mono[i]; mean/=N;
    for (let i=0;i<N;i++) mono[i]-=mean;

    const minBPM=60, maxBPM=200;
    const minLag = Math.floor(downRate * 60 / maxBPM);
    const maxLag = Math.floor(downRate * 60 / minBPM);

    let bestLag=minLag, bestVal=-1;
    for (let lag=minLag; lag<=maxLag; lag++){
      let sum=0;
      for (let i=0;i<N-lag;i++) sum += mono[i]*mono[i+lag];
      if (sum > bestVal){ bestVal=sum; bestLag=lag; }
    }
    const bpm = clamp(Math.round(60 * downRate / bestLag), 50, 220);

    ctx.close();

    return {
      duration: audio.duration,
      channels: ch,
      sampleRate: sr,
      peakDb: peakDb,
      rmsDb: rmsDb,
      crest: crest,
      clipping: clips>0,
      bpm: bpm
    };
  }

  function fmtTime(sec){
    const m = Math.floor(sec/60); const s = Math.round(sec%60);
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function setStat(index, value){
    const rows = statsBox.querySelectorAll('.stat strong');
    if (rows[index]) rows[index].textContent = value;
  }

  function buildAdvice(r){
    const adv = [];

    // Loudness / dynamics hints (very rough)
    if (r.peakDb > -0.2) adv.push("Your peak is extremely close to 0 dBFS; leave ~0.8–1 dB headroom to avoid inter-sample peaks.");
    if (r.clipping) adv.push("We detected potential clipping (samples ≥ −0.2 dBFS). Lower limiter ceiling or reduce input gain.");
    if (r.crest < 8) adv.push("Dynamic range looks tight; consider easing compression/limiting for more punch and transients.");
    if (r.crest > 14) adv.push("Dynamic range is quite wide; if it feels quiet in context, add gentle bus compression.");
    if (r.rmsDb > -10) adv.push("Track seems loud. Streaming normalizes playback; compare to ~−14 LUFS target.");
    if (r.rmsDb < -22) adv.push("Track may be quiet; check gain staging and bus level before limiting.");

    // BPM suggestions
    adv.push(`Estimated tempo ≈ ${r.bpm} BPM. Make sure grid/warping in your DAW matches this for tight edits and delays.`);

    // General polish
    adv.push("Reference against a similar released track using level-matched A/B to fine tune EQ, punch and width.");
    adv.push("Export at 24-bit WAV with true-peak limiter ceiling around −1.0 dBTP for aggregator uploads.");

    return adv;
  }

  analyzeBtn.addEventListener('click', async ()=>{
    const f = fileInput.files?.[0];
    if (!f) return;

    analyzeBtn.disabled = true;
    adviceUl.innerHTML  = '<li>Analyzing… this runs locally in your browser.</li>';

    try{
      const r = await analyzeFile(f);

      // Stats
      setStat(0, fmtTime(r.duration));
      setStat(1, r.channels === 1 ? 'Mono' : `${r.channels} (Stereo)`);
      setStat(2, `${r.sampleRate.toLocaleString()} Hz`);
      setStat(3, `${r.peakDb.toFixed(1)} dB`);
      setStat(4, `${r.rmsDb.toFixed(1)} dB`);
      setStat(5, `${r.crest.toFixed(1)} dB`);
      setStat(6, `${r.bpm} BPM`);
      setStat(7, r.clipping ? 'Yes' : 'No');

      // Advice
      const adv = buildAdvice(r);
      adviceUl.innerHTML = adv.map(x=>`<li>${x}</li>`).join('');

    }catch(err){
      console.error(err);
      adviceUl.innerHTML = `<li>Couldn’t analyze this file in the browser. Try a different format (WAV/MP3).</li>`;
    }finally{
      analyzeBtn.disabled = false;
    }
  });

  refreshBtn?.addEventListener('click', ()=> {
    // In a real app this would refetch connected platform stats
    alert('Demo: refreshed streaming library.');
  });
})();
