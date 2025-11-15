
/* ===== Pou 2 — JavaScript =====
   Vlož pred </body> alebo do samostatného .js súboru.
   Upraviť parametre môžeš v sekcii CONFIG.
*/

(function(){
  /* ---------- CONFIG (ľahké upravenie) ---------- */
  const TICK_MS = 120000; // 2 minúty
  // Decrease amounts per tick (per 2 minutes)
  const DEC = {
    sleep: 2,   // najpomalšie ubúda
    health: 3,  // sprchovanie / zdravie - druhé najpomalšie
    hunger: 6,  // jedenie - druhé najviac
    fun: 8      // zábava - najviac
  };

  // Interakcie v miestnostiach: name: {cost, effects: {hunger,health,sleep,fun}, msg}
  // Efekty sú pridané (môžu byť negatívne). Hodnoty sú okamžité.
  const ROOM_ACTIONS = {
    kuchyna: {
      button: {label: "Nakŕmiť (5¢)", cost: 5},
      effects: {hunger: +30, health: +5, fun: -2},
      msg: "Pou dostal jedlo!"
    },
    kupelna: {
      button: {label: "Sprcha (2¢)", cost: 2},
      effects: {health: +25, fun: -1, sleep: +2},
      msg: "Svieži Pou!"
    },
    hracia: {
      button: {label: "Hrať (0¢)", cost: 0},
      effects: {fun: +28, hunger: -6, sleep: -3},
      // hraním môžeš zarobiť náhodne 0..10 coinov
      msg: "Hra! Možno si niečo zarobil..."
    },
    spalna: {
      button: {label: "Spať", cost: 0},
      effects: {sleep: +40, health: +8, fun: -4, hunger: -6},
      msg: "Pou si pospal."
    }
  };

  const ACTION_COOLDOWN_MS = 5000; // 5 sekúnd medzi rovnakými akciami (pre spam protection)

  /* ---------- UTIL ---------- */
  function clamp(n, a=0, b=100){ return Math.max(a, Math.min(b, n)); }
  function q(sel, root=document){ return root.querySelector(sel); }
  function qa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  /* ---------- STATE (persistencia) ---------- */
  const STORAGE_KEY = 'pou2_state_v1';
  const defaultState = {
    hunger: 60,
    health: 85,
    sleep: 30,
    fun: 72,
    coins: 20,
    currentRoom: null, // null = main view
    lastTick: Date.now()
  };
  let state = loadState();

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        return Object.assign({}, defaultState, parsed);
      }
    }catch(e){
      console.warn('loadState failed', e);
    }
    return Object.assign({}, defaultState);
  }
  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
      console.warn('saveState failed', e);
    }
  }

  /* ---------- ELEMENTY (predpokladám existenciu progress s id) ---------- */
  const progressEls = {
    hunger: q('#hunger'),
    health: q('#health'),
    sleep: q('#sleep'),
    fun: q('#fun')
  };
  // Spans (sú v rovnakých rodičoch)
  const valueSpans = {};
  for(const k of Object.keys(progressEls)){
    const p = progressEls[k];
    if(p) {
      const parent = p.parentElement;
      const span = parent ? parent.querySelector('span') : null;
      valueSpans[k] = span;
    }
  }
  // fallback bars (divs s inline border) - v poradí: Hlad, Zdravie, Ospalosť, Zábava
  const fallbackBars = qa('div[style*="border: 1px solid black"]');
  // pridáme elementy filler ak ešte nie sú
  fallbackBars.forEach((bar)=>{
    if(!bar.querySelector('.filler')){
      const f = document.createElement('div');
      f.className = 'filler';
      bar.appendChild(f);
    }
  });

  // hlavný pou obrázok (v .pou-container)
  const pouImg = q('.pou-container img');
  // room images — v tvojom HTML sú obrázky v sekciách; vezmeme ich podľa id
  const roomImages = {
    kuchyna: q('#kuchyna img'),
    kupelna: q('#kupelna img'),
    hracia: q('#hracia img'),
    spalna: q('#spalna img')
  };

  // navigačné tlačidlá (tie v nav - sú v anchor->button)
  const navButtons = {
    kuchyna: q('a[href="#kuchyna"] button'),
    kupelna: q('a[href="#kupelna"] button'),
    hracia: q('a[href="#hracia"] button'),
    spalna: q('a[href="#spalna"] button')
  };

  // vytvoríme area pre interakčné tlačidlá (vložíme pod .pou-container)
  let actionsArea = q('#pou-actions-area');
  if(!actionsArea){
    actionsArea = document.createElement('div');
    actionsArea.id = 'pou-actions-area';
    actionsArea.style.maxWidth = '1100px';
    actionsArea.style.margin = '8px auto';
    actionsArea.style.display = 'flex';
    actionsArea.style.gap = '8px';
    actionsArea.style.flexWrap = 'wrap';
    q('body').insertBefore(actionsArea, q('.pou-container').nextSibling);
  }

  // coin display v header (vytvoríme)
  let coinEl = q('#pou-coins');
  if(!coinEl){
    const header = q('header[role=banner]');
    coinEl = document.createElement('div');
    coinEl.id = 'pou-coins';
    coinEl.setAttribute('aria-live','polite');
    coinEl.style.fontWeight = '700';
    coinEl.style.marginLeft = 'auto';
    coinEl.style.display = 'inline-block';
    coinEl.style.padding = '6px 10px';
    coinEl.style.borderRadius = '10px';
    coinEl.style.background = 'linear-gradient(180deg,#fff,#f3f6ff)';
    coinEl.style.boxShadow = '0 6px 12px rgba(50,60,80,0.04)';
    coinEl.style.fontSize = '0.95rem';
    // add to header: append
    header.appendChild(coinEl);
  }

  /* ---------- Render funkcie ---------- */
  function renderAll(){
    // progress values
    for(const k of ['hunger','health','sleep','fun']){
      const val = clamp(Math.round(state[k]));
      const p = progressEls[k];
      if(p){
        p.value = val;
      }
      const sp = valueSpans[k];
      if(sp) sp.textContent = val + '%';
    }
    // fallback fillers
    const keys = ['hunger','health','sleep','fun'];
    fallbackBars.forEach((bar, idx)=>{
      const key = keys[idx];
      const f = bar.querySelector('.filler');
      if(f){
        f.style.width = clamp(state[key]) + '%';
      }
    });
    // coins
    coinEl.textContent = `💠 ${state.coins}¢`;
    // current room sprite: show pou sprite or room sprite
    updateSprite();
    saveState();
  }

  function updateSprite(){
    // If currentRoom is set, show the room image as background sprite on pouImg (or switch src)
    if(state.currentRoom && roomImages[state.currentRoom]){
      const roomImg = roomImages[state.currentRoom];
      // pokud existuje, použij jeho src
      if(roomImg && roomImg.src){
        pouImg.src = roomImg.src;
        pouImg.alt = state.currentRoom + ' (miestnosť)';
      }
    } else {
      // default — zachováme pôvodný (najlepší je, ak v HTML pôvodné src je pou sprite)
      // ak original je uložený v data-default-src, použijeme ho
      if(!pouImg.dataset.defaultSrc) pouImg.dataset.defaultSrc = pouImg.src;
      pouImg.src = pouImg.dataset.defaultSrc;
      pouImg.alt = 'pou';
    }
  }

  /* ---------- Ticking (automatické ubúdanie) ---------- */
  let tickInterval = null;
  function startTick(){
    if(tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(()=>{
      applyTick();
    }, TICK_MS);
    // apply tick if enough time passed since lastTick (in case reload after >2min)
    const now = Date.now();
    if(now - state.lastTick >= TICK_MS){
      // number of ticks to catch up
      const ticks = Math.floor((now - state.lastTick) / TICK_MS);
      for(let i=0;i<ticks;i++) applyTick();
    }
  }

  function applyTick(){
    // decrease according to DEC
    state.hunger = clamp(state.hunger - DEC.hunger);
    state.fun = clamp(state.fun - DEC.fun);
    state.health = clamp(state.health - DEC.health);
    state.sleep = clamp(state.sleep - DEC.sleep);

    // side effects:
    // ak hlad <= 10 -> zdravie ubúda rýchlejšie
    if(state.hunger <= 10){
      state.health = clamp(state.health - 4);
    }
    // ak spánok <= 5 -> fun ubúda rýchlejšie
    if(state.sleep <= 5){
      state.fun = clamp(state.fun - 3);
    }
    // ak zdravie <= 0 -> penalizácia coinov (nemocné výdavky)
    if(state.health <= 0 && state.coins > 0){
      const loss = Math.min(2, state.coins);
      state.coins -= loss;
    }

    state.lastTick = Date.now();
    renderAll();
  }

  /* ---------- Interakcie / Akcie ---------- */
  // cooldown tracking
  const lastActionTime = {};

  function canPerform(actionKey){
    const last = lastActionTime[actionKey] || 0;
    return (Date.now() - last) >= ACTION_COOLDOWN_MS;
  }
  function setActionTime(actionKey){
    lastActionTime[actionKey] = Date.now();
  }

  function performRoomAction(roomKey){
    const def = ROOM_ACTIONS[roomKey];
    if(!def) return;
    const actionKey = 'room_'+roomKey;
    if(!canPerform(actionKey)){
      flashMessage('Počkajte trochu pred ďalšou akciou.');
      return;
    }
    // cost
    const cost = def.button.cost || 0;
    if(state.coins < cost){
      flashMessage('Nemáš dosť peňazí.');
      return;
    }
    state.coins -= cost;
    // apply effects
    for(const k of Object.keys(def.effects || {})){
      if(state[k] === undefined) continue;
      state[k] = clamp(state[k] + def.effects[k]);
    }
    // special: hracia miestnosť môže dať coins náhodne
    if(roomKey === 'hracia'){
      const bonus = Math.floor(Math.random()*11); // 0..10
      if(bonus > 0){
        state.coins += bonus;
        flashMessage(def.msg + ` Získal si ${bonus}¢!`);
      } else {
        flashMessage(def.msg + ' Žiadna výhra tentokrát.');
      }
    } else {
      flashMessage(def.msg);
    }

    setActionTime(actionKey);
    renderAll();
  }

  /* ---------- UI: vytvorenie tlačidiel pre miestnosti ---------- */
  function buildActionsForRoom(roomKey){
    actionsArea.innerHTML = ''; // clear
    if(!roomKey){
      // main view - show default actions: prehľad, malé akcie
      const info = document.createElement('div');
      info.textContent = 'Vyber miestnosť hore (Kuchyňa / Kúpeľňa / Hracia miestnosť / Spálňa), alebo klikni na Pou.';
      info.className = 'muted';
      actionsArea.appendChild(info);
      return;
    }
    const cfg = ROOM_ACTIONS[roomKey];
    if(!cfg) return;
    const btn = document.createElement('button');
    btn.textContent = cfg.button.label;
    btn.style.cursor = 'pointer';
    btn.onclick = ()=> performRoomAction(roomKey);
    actionsArea.appendChild(btn);

    // pridať tlačidlo "návrat" do hlavného pohľadu (zobrazenie pôvodného pou sprite)
    const back = document.createElement('button');
    back.textContent = 'Návrat';
    back.onclick = ()=> {
      state.currentRoom = null;
      buildActionsForRoom(null);
      renderAll();
    };
    actionsArea.appendChild(back);
  }

  /* ---------- Eventy: navigácia medzi miestnosťami (prepína currentRoom a build actiony) ---------- */
  for(const r of Object.keys(navButtons)){
    const btn = navButtons[r];
    if(btn){
      btn.addEventListener('click', (ev)=>{
        ev.preventDefault();
        // nastaviť current room
        state.currentRoom = r;
        buildActionsForRoom(r);
        renderAll();
      });
    }
  }

  // kliknutie na .pou-container pre návrat do hlavného pohľadu
  const pouContainer = q('.pou-container');
  if(pouContainer){
    pouContainer.addEventListener('click', ()=>{
      state.currentRoom = null;
      buildActionsForRoom(null);
      renderAll();
    });
  }

  /* ---------- Flash / krátke správy ---------- */
  let flashTimeout = null;
  function flashMessage(text, time=2500){
    // vytvoríme alebo použijeme jednu notifikáciu
    let existing = q('#pou-flash');
    if(!existing){
      existing = document.createElement('div');
      existing.id = 'pou-flash';
      existing.style.position = 'fixed';
      existing.style.right = '18px';
      existing.style.bottom = '18px';
      existing.style.padding = '10px 14px';
      existing.style.borderRadius = '10px';
      existing.style.boxShadow = '0 10px 24px rgba(15,23,42,0.12)';
      existing.style.background = 'white';
      existing.style.fontWeight = '700';
      document.body.appendChild(existing);
    }
    existing.textContent = text;
    existing.style.opacity = '1';
    if(flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(()=> {
      if(existing) existing.style.opacity = '0';
    }, time);
  }

  /* ---------- Init ---------- */
  function init(){
    // Build initial actions
    buildActionsForRoom(state.currentRoom);

    // Render initial
    renderAll();

    // start tick
    startTick();

    // Attach manual save on page unload
    window.addEventListener('beforeunload', saveState);

    // small UI: allow clicking on fallback bars to fill for debugging (dev only)
    // (komentuj tento blok, ak nechceš túto možnosť)
    fallbackBars.forEach((bar, idx)=>{
      bar.style.cursor = 'pointer';
      bar.title = 'Klikni pre malé zvýšenie (dev)';
      bar.addEventListener('click', ()=>{
        const keys = ['hunger','health','sleep','fun'];
        state[keys[idx]] = clamp(state[keys[idx]] + 8);
        renderAll();
      });
    });
  }

  // spusti
  init();

})();
