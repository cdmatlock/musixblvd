/* ===== MusixBlvd — Opportunities (standalone, safe to replace) ===== */
(function(){
  const root = document.getElementById('opps');
  if (!root) return; // dashboard didn't load this panel yet

  // Grab elements used in the *existing* markup
  const grid    = root.querySelector('#oppsGrid');
  const empty   = root.querySelector('#oppsEmpty');
  const chips   = root.querySelectorAll('.opps-toolbar .chip');
  const sortSel = root.querySelector('#oppsSort');

  // Defensive: if grid not found, create it so page still works
  let _grid = grid;
  if (!_grid){
    const holder = document.createElement('div');
    holder.id = 'oppsGrid';
    holder.className = 'opps-grid';
    root.querySelector('.panel-card')?.appendChild(holder);
    _grid = holder;
  }

  // Seed demo data (you can later replace with real API results)
  const SEED = [
    { id:"a1", type:"beats",   title:"Dark trap beat pack (5x WAV)", user:"808Saint",  loc:"Remote",  price:80,  tags:["trap","hard","808"],   desc:"Punchy 808s, eerie bells, ready for placement. Unlimited use (non-exclusive).", when:"2h ago", featured:true,  audio:false },
    { id:"a2", type:"collab",  title:"Looking for soulful vocalist", user:"NeoKeys",   loc:"Atlanta", price:null,tags:["neo-soul","R&B","keys"], desc:"Rhodes-heavy grooves, think HER / Snoh Aalegra. Remote ok.", when:"4h ago", featured:false, audio:false },
    { id:"a3", type:"mixing",  title:"Mix & Master (first track $49)", user:"FaderFox", loc:"Remote", price:49, tags:["mixing","mastering","radio-ready"], desc:"Hybrid chain (SSL + UAD). 48h turnaround, 1 revision.", when:"Today", featured:false, audio:true },
    { id:"a4", type:"vocals",  title:"Female hooks & harmonies", user:"SkyVox",       loc:"LA",      price:120, tags:["hooks","topline","vocal"], desc:"Airy pop/R&B tone. Can write & record doubles/adlibs.", when:"1d ago", featured:false, audio:false },
    { id:"a5", type:"gigs",    title:"Paid live set — Miami lounge", user:"ClubWave",  loc:"Miami",   price:300, tags:["DJ","house","live"],    desc:"2h Friday night set. Submit 15-min mix and IG.", when:"1d ago", featured:false, audio:false },
    { id:"a6", type:"beats",   title:"Boom bap drum kit (100 one-shots)", user:"CrateHead", loc:"Remote", price:25, tags:["boom-bap","lofi","drums"], desc:"Crunchy hats & dusty kicks. Made on SP-404.", when:"3d ago", featured:false, audio:false },
    { id:"a7", type:"collab",  title:"Guitarist needed for Afrobeats", user:"SunTape", loc:"Remote",  price:null,tags:["afrobeats","guitar","feel"], desc:"Light highlife vibes, needs melodic riffs. Credit splits.", when:"3d ago", featured:false, audio:false },
    { id:"a8", type:"vocals",  title:"Rap features (midwest flow)", user:"VerseNine",  loc:"Chicago", price:90,  tags:["rap","feature","midwest"], desc:"16s or hooks. Send beat + concept.", when:"4d ago", featured:false, audio:false },
    { id:"a9", type:"mixing",  title:"Stem mastering up to 6 stems", user:"OrbitTone", loc:"Remote",  price:69,  tags:["mastering","stems","loud"], desc:"Transparent, loud, musical. References welcome.", when:"4d ago", featured:false, audio:false },
    { id:"b1", type:"gigs",    title:"Sync brief: moody piano cue", user:"ScreenSync", loc:"Remote",  price:200, tags:["sync","piano","ambient"], desc:"30–60s cues for doc series, no samples.", when:"5d ago", featured:false, audio:false },
    { id:"b2", type:"beats",   title:"UK drill loops (royalty-free)", user:"BroadSt",  loc:"Remote",  price:40,  tags:["drill","loops","uk"], desc:"12 loops w/ MIDI. Dark pads + detuned pianos.", when:"6d ago", featured:false, audio:false },
    { id:"b3", type:"collab",  title:"Producer seeks singer–songwriter", user:"MonoLake", loc:"Remote", price:null,tags:["alt-pop","indie","sync"], desc:"Cinematic indie pop. Think Billie/Gracie. Co-write via Zoom.", when:"6d ago", featured:false, audio:false },
  ];

  const TYPENAMES = {
    beats: "Beats",
    collab:"Collab",
    mixing:"Mixing/Master",
    vocals:"Vocals",
    gigs:"Gigs"
  };

  // Helpers
  const shuffle = a => { const arr=[...a]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; };
  const fmtPrice = p => (p==null || p==="") ? "—" : `$${Number(p).toLocaleString()}`;

  function card(item){
    const el = document.createElement('article');
    el.className = 'op-card' + (item.featured ? ' featured' : '');
    el.innerHTML = `
      ${item.featured ? '<span class="featured-badge">FEATURED</span>' : ''}
      <div class="thumb ${item.audio?'audio':''}"></div>
      <div class="card-body">
        <div class="op-top">
          <div class="avatar">${item.user.slice(0,2).toUpperCase()}</div>
          <div class="op-meta">
            <h3 class="op-title">${item.title}</h3>
            <div class="op-sub">${TYPENAMES[item.type]} • ${item.loc || "Remote"} • <span class="muted">${item.when}</span></div>
          </div>
        </div>
        <div class="op-tags">${item.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="op-body">${item.desc}</div>
        <div class="op-bottom">
          <div class="price">${fmtPrice(item.price)}</div>
          <div class="op-actions">
            <button class="btn outline small" data-action="dm" data-id="${item.id}">DM</button>
            <button class="btn primary small" data-action="connect" data-id="${item.id}">Connect</button>
          </div>
        </div>
      </div>
    `;
    return el;
  }

  // State
  const state = { filter:'all', sort:'random', data:[...SEED] };

  function getView(){
    let arr = [...state.data];
    if (state.filter !== 'all') arr = arr.filter(x => x.type === state.filter);
    switch(state.sort){
      case 'priceAsc':  arr.sort((a,b)=>(a.price??1e9)-(b.price??1e9)); break;
      case 'priceDesc': arr.sort((a,b)=>(b.price??0)-(a.price??0));   break;
      case 'latest':    /* assume original order ~ newest */           break;
      default:          arr = shuffle(arr);
    }
    return arr;
  }

  function render(){
    const list = getView();
    _grid.innerHTML = '';
    if (!list.length){
      empty?.classList.remove('hidden');
      return;
    }
    empty?.classList.add('hidden');
    list.forEach(item => _grid.appendChild(card(item)));
  }

  // Wire chips (filters)
  chips.forEach(c => {
    c.addEventListener('click', () => {
      chips.forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      state.filter = c.dataset.filter || 'all';
      render();
    });
  });

  // Wire sort
  sortSel?.addEventListener('change', ()=>{
    state.sort = sortSel.value;
    render();
  });

  // Card actions (DM/Connect)
  _grid.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const item = state.data.find(x=>x.id === btn.dataset.id);
    if (!item) return;
    const mode = btn.dataset.action === 'connect' ? 'Connect' : 'DM';
    alert(`${mode} ${item.user} about “${item.title}” (demo)`);
  });

  // Initial paint
  render();
})();
