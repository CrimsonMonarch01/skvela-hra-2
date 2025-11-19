/* ============================
   RAGNA.JS — hlavná logika hry
   ============================ */

/* ---------- CONFIG ---------- */
const TICK_MS = 120000; // 2 minúty
// Ubúdanie za tick: sleep najpomalšie, clean druhé najmenej, hunger druhé najviac, fun najviac
const DEC = { sleep: 2, clean: 3, hunger: 6, fun: 8, faith: 1, toilet: 4 };

const ROOM_ASSETS = {
  defaultRoom: '',
  kuchyna: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/kuchyna.png?raw=true',
  kupelna: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/kupelna.jpg?raw=true',
  hracia: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/hracia-miestnost.png?raw=true',
  spalna: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/spalna.jpg?raw=true',
  praca: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/kancelaria-s-papiermi.png?raw=true',
  casino: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/casino.png?raw=true',
  wc: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/WC.png?raw=true',
  church: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/kostol.png?raw=true',
  market: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTC7wGAw7BOpier7nIY8OtnWOibN2_spHCtMA&s'
};

/* ---------- STATE (persist + defaults) ---------- */
const STORAGE_KEY = 'pou_ultimate_v1';
const DEFAULT = {
  hunger: 60,
  health: 85,
  sleep: 40,
  fun: 70,
  faith: 10,
  toilet: 30,
  coins: 20,
  currentRoom: null,
  lastTick: Date.now()
};
let state = loadState();

/* ---------- UTIL ---------- */
const q = sel => document.querySelector(sel);
const qa = sel => Array.from(document.querySelectorAll(sel));
function clamp(v, a=0, b=100){ return Math.max(a, Math.min(b, v)); }
function fmtCoins(n){ return `💠 ${n}¢`; }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) {
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT, parsed);
    }
  }catch(e){ console.warn('loadState', e); }
  return Object.assign({}, DEFAULT);
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ---------- ELEMENTS ---------- */
const els = {
  hunger: q('#hunger'),
  health: q('#health'),
  sleep: q('#sleep'),
  fun: q('#fun'),
  faith: q('#faith'),
  toilet: q('#toilet'),
  hungerVal: q('#hunger-val'),
  healthVal: q('#health-val'),
  sleepVal: q('#sleep-val'),
  funVal: q('#fun-val'),
  faithVal: q('#faith-val'),
  toiletVal: q('#toilet-val'),
  coins: q('#coins'),
  pouImg: q('#pou-img'),
  roomImg: q('#room-img'),
  roomTitle: q('#room-title'),
  actions: q('#actions'),
  saveBtn: q('#saveBtn'),
  resetBtn: q('#resetBtn'),
  modal: q('#modal'),
  modalContent: q('#modal-content'),
  modalClose: q('#modal-close')
};

/* ---------- CORE Routines ---------- */
function renderAll(){
  // progress bars
  els.hunger.value = clamp(Math.round(state.hunger)); els.hungerVal.textContent = `${Math.round(state.hunger)}%`;
  els.health.value = clamp(Math.round(state.health)); els.healthVal.textContent = `${Math.round(state.health)}%`;
  els.sleep.value = clamp(Math.round(state.sleep)); els.sleepVal.textContent = `${Math.round(state.sleep)}%`;
  els.fun.value = clamp(Math.round(state.fun)); els.funVal.textContent = `${Math.round(state.fun)}%`;
  els.faith.value = clamp(Math.round(state.faith)); els.faithVal.textContent = `${Math.round(state.faith)}%`;
  els.toilet.value = clamp(Math.round(state.toilet)); els.toiletVal.textContent = `${Math.round(state.toilet)}%`;

  // coins
  els.coins.textContent = fmtCoins(state.coins);

  // room / sprites
  const cur = state.currentRoom;
  els.roomTitle.textContent = cur ? cur.charAt(0).toUpperCase() + cur.slice(1) : 'Domov';
  const rsrc = cur ? (ROOM_ASSETS[cur] || '') : 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/pou.png';
  els.roomImg.src = rsrc;

  buildRoomActions();
  saveState();
}

/* ---------- TICKING (auto decay) ---------- */
let tickInterval = null;
function startTick(){
  if(tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(applyTick, TICK_MS);

  // catch-up ticks if needed
  const now = Date.now();
  const since = now - (state.lastTick || now);
  if(since >= TICK_MS){
    const ticks = Math.floor(since / TICK_MS);
    for(let i=0;i<ticks;i++) applyTick();
  }
}
function applyTick(){
  state.hunger = clamp(state.hunger - DEC.hunger);
  state.fun = clamp(state.fun - DEC.fun);
  state.health = clamp(state.health - DEC.clean); // health decays with cleanliness-ish
  state.sleep = clamp(state.sleep - DEC.sleep);
  state.faith = clamp(state.faith - DEC.faith);
  // toilet becomes more urgent over time
  state.toilet = clamp(state.toilet + DEC.toilet); // toilet increases (more need to go)
  // side effects
  if(state.hunger <= 10) state.health = clamp(state.health - 4);
  if(state.sleep <= 5) state.fun = clamp(state.fun - 3);
  if(state.health <= 0 && state.coins > 0){ state.coins = Math.max(0, state.coins - 2); }
  state.lastTick = Date.now();
  renderAll();
}

/* ---------- ACTIONS (rooms & interactions) ---------- */

// costs/effects for room primary action
const ROOM_ACTIONS = {
  kuchyna: { label: "Nakŕmiť (5¢)", cost: 5, effects: { hunger: +35, health: +5, toilet: +10 } },
  kupelna: { label: "Sprcha (2¢)", cost: 2, effects: { health: +30, faith: +1, toilet: -5 } },
  hracia:  { label: "Hrať (možné zarobiť)", cost: 0, effects: { fun: +30, hunger: -6, sleep: -3 } },
  spalna:  { label: "Spať", cost: 0, effects: { sleep: +40, health: +8, fun: -6, hunger: -8 } },
  praca:   { label: "Opečiatkovať papiere (pracovať)", cost: 0, effects: { fun: -6, toilet: +10 } },
  casino:  { label: "Minigry", cost: 0, effects: {} },
  wc:      { label: "Urobiť si potrebu (toilet)", cost: 0, effects: { toilet: -70, health: +4 } },
  church:  { label: "Modliť sa", cost: 0, effects: { faith: +30, fun: -8 } },
  market:  { label: "Nakúpiť jedlo", cost: 0, effects: {} }
};

// cooldown small protection
const ACTION_COOLDOWN_MS = 800;
const lastAction = {};
function canAct(key){
  const last = lastAction[key] || 0;
  if(Date.now() - last < ACTION_COOLDOWN_MS) return false;
  lastAction[key] = Date.now();
  return true;
}

function performRoomAction(roomKey){
  if(!canAct('room_'+roomKey)) { flash('Počkajte...'); return; }
  const cfg = ROOM_ACTIONS[roomKey];
  if(!cfg) return;
  // marketplace special: let user buy food for coins
  if(roomKey === 'market'){
    openMarket();
    return;
  }
  // casino leads to minigames UI
  if(roomKey === 'casino'){
    openCasino();
    return;
  }
  // normal action
  if(state.coins < cfg.cost){
    flash('Nemáš dosť peňazí.');
    return;
  }
  state.coins = Math.max(0, state.coins - cfg.cost);
  for(const k in cfg.effects){
    if(state[k] !== undefined) state[k] = clamp(state[k] + cfg.effects[k]);
  }

  // special outcomes
  if(roomKey === 'praca'){
    // work gives coins (opečiatkovanie pre kartel — fiktívne) -> random 5..20
    const earn = Math.floor(5 + Math.random()*16);
    state.coins += earn;
    flash(`Pracoval si a zarobil ${earn}¢.`);
  } else if(roomKey === 'hracia'){
    // small chance to earn
    const earn = Math.floor(Math.random()*13);
    if(earn > 0) { state.coins += earn; flash(`Hral si a získal ${earn}¢.`); }
    else flash('Hral si, nič väčšie si nezarobil.');
  } else if(roomKey === 'kuchyna'){
    flash('Dobrú chuť — Pou sa najedol.');
  } else if(roomKey === 'kupelna'){
    flash('Čistý Pou!');
  } else if(roomKey === 'spalna'){
    flash('Pou si pospal.');
  } else if(roomKey === 'wc'){
    flash('Uf, oslobodenie.'); // pooping action
  } else if(roomKey === 'church'){
    flash('Pou uctieval Ježiša (viera +).');
  }

  renderAll();
}

/* ---------- ROOM UI ---------- */
const roomButtons = qa('.rooms button');
roomButtons.forEach(btn => {
  btn.addEventListener('click', (e)=>{
    const r = btn.dataset.room;
    state.currentRoom = r;
    renderAll();
  });
});

// build actions for current room
function buildRoomActions(){
  const actions = els.actions;
  actions.innerHTML = '';
  const cur = state.currentRoom;
  // set room image
  els.roomImg.src = cur ? (ROOM_ASSETS[cur] || '') : ROOM_ASSETS.defaultRoom || 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/pou.png';

  if(!cur){
    // home UI
    const info = document.createElement('div'); info.className='muted'; info.textContent='Vyber miestnosť hore alebo klikni na obrázok Pou.';
    actions.appendChild(info);
    return;
  }

  // main action button for the room
  const cfg = ROOM_ACTIONS[cur];
  if(cfg){
    const b = document.createElement('button');
    b.textContent = cfg.label;
    b.onclick = ()=> performRoomAction(cur);
    actions.appendChild(b);
  }

  // extra contextual buttons
  if(cur === 'kuchyna'){
    const buy = document.createElement('button'); buy.textContent = 'Kúpiť jedlo (10¢)'; buy.onclick = buyFood; actions.appendChild(buy);
  }
  if(cur === 'casino'){
    const s = document.createElement('button'); s.textContent = 'Sloty'; s.onclick = openSlots; actions.appendChild(s);
    const r = document.createElement('button'); r.textContent = 'Ruleta'; r.onclick = openRoulette; actions.appendChild(r);
    const bj = document.createElement('button'); bj.textContent = 'Blackjack'; bj.onclick = openBlackjack; actions.appendChild(bj);
  }
  if(cur === 'market'){
    const buyFoodBtn = document.createElement('button'); buyFoodBtn.textContent='Kúpiť veľkú zásobu (30¢)'; buyFoodBtn.onclick = ()=>{ if(state.coins>=30){ state.coins-=30; state.hunger=clamp(state.hunger+70); flash('Kúpil si veľkú zásobu jedla.'); renderAll(); } else flash('Nedostatok peňazí.'); }; actions.appendChild(buyFoodBtn);
  }

  // back to home
  const back = document.createElement('button'); back.textContent='Domov'; back.onclick = ()=>{ state.currentRoom = null; renderAll(); }; actions.appendChild(back);
}

/* ---------- MARKET ---------- */
function buyFood(){
  if(state.coins < 10){ flash('Nedostatok peňazí.'); return; }
  state.coins -= 10;
  state.hunger = clamp(state.hunger + 50);
  flash('Kúpil si jedlo za 10¢.');
  renderAll();
}
function openMarket(){
  showModal(`<h3>Marketplace</h3>
    <p>Kúpiť jedlo za 10¢ (zvýši Hlad) alebo zásobu za 30¢.</p>
    <div style="margin-top:8px">
      <button id="m-buy-mini">Kúpiť jedlo (10¢)</button>
      <button id="m-buy-bulk">Veľká zásoba (30¢)</button>
    </div>`);
  q('#m-buy-mini').onclick = ()=>{ buyFood(); closeModal(); };
  q('#m-buy-bulk').onclick = ()=>{ if(state.coins>=30){ state.coins-=30; state.hunger=clamp(state.hunger+80); flash('Veľká zásoba pridána.'); } else flash('Nedostatok peňazí.'); closeModal(); renderAll(); };
}

/* ---------- CASINO (minigames) ---------- */

/* --- SLOT MACHINE --- */
function openSlots(){
  showModal(`<h3>Sloty</h3>
    <p>Stávka: zadaj sumu a skúšaj šťastie. Výplata závisí na kombinácii.</p>
    <div>
      <input id="slot-bet" type="number" min="1" value="5" style="width:80px" /> ¢
      <button id="slot-spin">Točiť</button>
    </div>
    <div id="slot-result" style="margin-top:10px;"></div>`);
  q('#slot-spin').onclick = slotSpin;
}
const SLOT_SYMBOLS = ['🍒','🍋','🔔','⭐','💎'];
function slotSpin(){
  const bet = Math.max(1, Math.floor(Number(q('#slot-bet').value || 1)));
  if(state.coins < bet){ flash('Nemáš dosť peňazí na stávku.'); return; }
  state.coins -= bet;
  // spin
  const pick = ()=> SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)];
  const a = pick(), b = pick(), c = pick();
  let resText = `${a} ${b} ${c}<br/>`;
  let payout = 0;
  if(a===b && b===c) payout = bet * 10;
  else if(a===b || b===c || a===c) payout = bet * 2;
  else if(new Set([a,b,c]).size===3 && a==='⭐') payout = bet * 3; // tiny special
  if(payout>0){ state.coins += payout; resText += `Výhra: ${payout}¢!`; } else resText += 'Prehrávanie :(';
  q('#slot-result').innerHTML = resText;
  renderAll();
}

/* --- ROULETTE --- */
function openRoulette(){
  showModal(`<h3>Ruleta</h3>
    <p>Tipuj číslo 0-36 (výplata 35x) alebo farbu (červená/čierna 2x).</p>
    <div>
      <input id="roulette-bet" type="number" min="1" value="5" style="width:80px" /> ¢
      <input id="roulette-choice" placeholder="číslo alebo red/black" style="width:140px" />
      <button id="roulette-spin">Točiť</button>
    </div>
    <div id="roulette-result" style="margin-top:10px"></div>`);
  q('#roulette-spin').onclick = rouletteSpin;
}
function rouletteSpin(){
  const bet = Math.max(1, Math.floor(Number(q('#roulette-bet').value || 1)));
  const choice = (q('#roulette-choice').value || '').trim().toLowerCase();
  if(state.coins < bet){ flash('Nedostatok peňazí.'); return; }
  state.coins -= bet;
  const rolled = Math.floor(Math.random()*37); // 0..36
  const color = (rolled===0) ? 'green' : (rolled%2===0 ? 'black' : 'red');
  let payout = 0;
  let text = `Padlo: ${rolled} (${color})<br/>`;
  if(choice==='red' || choice==='červená') { if(color==='red') payout = bet*2; }
  else if(choice==='black' || choice==='čierna') { if(color==='black') payout = bet*2; }
  else {
    const n = parseInt(choice,10);
    if(!isNaN(n) && n===rolled) payout = bet*35;
  }
  if(payout>0){ state.coins += payout; text += `Vyhral si ${payout}¢!`; } else text += 'Prehral si.';
  q('#roulette-result').innerHTML = text;
  renderAll();
}

/* --- SIMPLE BLACKJACK --- */
function openBlackjack(){
  showModal(`<h3>Blackjack</h3>
    <p>Jednoduchá verzia proti počítaču (dealer).</p>
    <div id="bj-area">
      <div>Stávka: <input id="bj-bet" type="number" min="1" value="5" style="width:80px" /></div>
      <div style="margin-top:8px"><button id="bj-start">Začať hru</button></div>
      <div id="bj-result" style="margin-top:8px"></div>
      <div id="bj-controls" style="margin-top:8px"></div>
    </div>`);
  q('#bj-start').onclick = bjStart;
}
function bjDeck(){ // simplified deck (values only)
  const vals = [2,3,4,5,6,7,8,9,10,10,10,10,11]; // J,Q,K as 10, A as 11 (soft not managed deeply)
  const d = [];
  for(let i=0;i<6;i++) for(const v of vals) d.push(v);
  // shuffle
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}
function bjStart(){
  const bet = Math.max(1, Math.floor(Number(q('#bj-bet').value || 1)));
  if(state.coins < bet){ flash('Nedostatok peňazí.'); return; }
  state.coins -= bet;
  const deck = bjDeck();
  const player = [deck.pop(), deck.pop()];
  const dealer = [deck.pop(), deck.pop()];
  let playerSum = ssum(player);
  let dealerSum = ssum(dealer);
  q('#bj-result').innerHTML = `Tvoja ruka: ${player.join(', ')} (=${playerSum})<br>Dealer: ${dealer[0]}, ?`;
  const controls = q('#bj-controls'); controls.innerHTML='';
  const hitBtn = document.createElement('button'); hitBtn.textContent='Hit'; controls.appendChild(hitBtn);
  const standBtn = document.createElement('button'); standBtn.textContent='Stand'; controls.appendChild(standBtn);

  hitBtn.onclick = ()=>{
    player.push(deck.pop()); playerSum = ssum(player);
    q('#bj-result').innerHTML = `Tvoja ruka: ${player.join(', ')} (=${playerSum})<br>Dealer: ${dealer[0]}, ?`;
    if(playerSum>21){ q('#bj-result').innerHTML += '<br>Prehral si!'; controls.innerHTML=''; renderAll(); }
  };
  standBtn.onclick = ()=>{
    // dealer plays
    while(ssum(dealer) < 17) dealer.push(deck.pop());
    dealerSum = ssum(dealer);
    const p = ssum(player);
    let txt = `Tvoja ruka: ${player.join(', ')} (=${p})<br>Dealer: ${dealer.join(', ')} (=${dealerSum})<br>`;
    if(p>21) txt += 'Prehral si.';
    else if(dealerSum>21 || p>dealerSum) { const win = bet*2; state.coins += win; txt += `Vyhral si ${win}¢!`; }
    else if(p===dealerSum) { state.coins += bet; txt += 'Remíza. Stávka vrátená.'; }
    else txt += 'Prehral si.';
    q('#bj-result').innerHTML = txt; controls.innerHTML=''; renderAll();
  };
}

function ssum(arr){
  // treat aces as 11; if bust, convert aces to 1
  let sum = arr.reduce((a,b)=>a+b,0);
  let aces = arr.filter(v=>v===11).length;
  while(sum>21 && aces>0){ sum -= 10; aces--; }
  return sum;
}


/* ---------- MODAL helpers ---------- */
function showModal(html){
  els.modal.classList.remove('hidden');
  els.modalContent.innerHTML = html;
  // wire close
  els.modalClose.onclick = closeModal;
  els.modal.onclick = (e)=>{ if(e.target === els.modal) closeModal(); };
}
function closeModal(){ els.modal.classList.add('hidden'); els.modalContent.innerHTML=''; }

/* ---------- FLASH messages ---------- */
let flashTimeout = null;
function flash(text, time=2500){
  // small floating message
  let f = q('#pou-flash');
  if(!f){ f = document.createElement('div'); f.id='pou-flash'; f.style.position='fixed'; f.style.right='18px'; f.style.bottom='18px'; f.style.padding='10px 14px'; f.style.borderRadius='10px'; f.style.boxShadow='0 10px 24px rgba(15,23,42,0.12)'; f.style.background='white'; f.style.fontWeight='700'; document.body.appendChild(f); }
  f.textContent = text;
  f.style.opacity = '1';
  if(flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(()=> f.style.opacity='0', time);
}

/* ---------- UI small actions ---------- */
q('#saveBtn').addEventListener('click', ()=>{ saveState(); flash('Uložené.'); });
q('#resetBtn').addEventListener('click', ()=>{ if(confirm('Resetovať hru?')){ localStorage.removeItem(STORAGE_KEY); state = Object.assign({}, DEFAULT); renderAll(); flash('Resetované.'); }});

/* clicking on pou image -> go home */
els.pouImg.addEventListener('click', ()=>{ state.currentRoom = null; renderAll(); });

/* ---------- marketplace / shop handled in room actions above ---------- */

/* ---------- init ---------- */
function init(){
  // initial room image fallback
  els.roomImg.src = ROOM_ASSETS.defaultRoom || 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/pou.png';
  // add click handlers to actions area (delegated via buildRoomActions)
  renderAll();
  startTick();
  window.addEventListener('beforeunload', saveState);
}
init();
