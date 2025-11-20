/* ============================
   RAGNA.JS — Pou Ultimate (vylepšená verzia)
   ============================ */

const TICK_MS = 120000; // 2 minúty (upravené z 20s na realistické 2 min)
const DEC = { sleep: 3, clean: 2, hunger: 7, fun: 9, faith: 1, toilet: 5 };

const ROOM_ASSETS = {
  defaultRoom: 'https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/pou.png?raw=true',
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

const STORAGE_KEY = 'pou_ultimate_v2';
const DEFAULT = {
  hunger: 60, health: 85, sleep: 50, fun: 70, faith: 15, toilet: 20,
  coins: 50, foodStock: 3, currentRoom: null, lastTick: Date.now()
};

let state = loadState();
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = sel => document.querySelector(sel);
const qa = sel => Array.from(document.querySelectorAll(sel));
function clamp(v, a=0, b=100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return `💠 ${n}¢`; }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign({}, DEFAULT, JSON.parse(raw));
  } catch(e) { console.warn('Load error', e); }
  return Object.assign({}, DEFAULT);
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ========== ELEMENTY ========== */
const els = {
  hunger: q('#hunger'), hungerVal: q('#hunger-val'),
  health: q('#health'), healthVal: q('#health-val'),
  sleep: q('#sleep'), sleepVal: q('#sleep-val'),
  fun: q('#fun'), funVal: q('#fun-val'),
  faith: q('#faith'), faithVal: q('#faith-val'),
  toilet: q('#toilet'), toiletVal: q('#toilet-val'),
  coins: q('#coins'),
  foodDisplay: null, // bude vytvorené dynamicky
  pouImg: q('#pou-img'),
  roomImg: q('#room-img'),
  roomTitle: q('#room-title'),
  actions: q('#actions'),
  modal: q('#modal'),
  modalContent: q('#modal-content'),
  modalClose: q('#modal-close')
};

/* ========== GAME OVER ========== */
function gameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  if (tickInterval) clearInterval(tickInterval);

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;font-family:sans-serif;text-align:center;';
  overlay.innerHTML = `
    <div style="background:#8B0000;padding:40px 60px;border-radius:25px;border:6px solid #FF3333;box-shadow:0 0 40px rgba(255,0,0,0.6);">
      <h1 style="font-size:64px;margin:0;">GAME OVER</h1>
      <p style="font-size:28px;margin:30px 0;">Tvoj Pou zomrel</p>
      <button id="restartGame" style="font-size:24px;padding:15px 40px;background:#222;border:none;color:white;border-radius:12px;cursor:pointer;">Nová hra</button>
    </div>
  `;
  document.body.appendChild(overlay);
  q('#restartGame').onclick = () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };
}

function checkDeath() {
  if (state.health <= 0 && gameRunning) {
    state.health = 0;
    renderAll();
    setTimeout(gameOver, 1000);
  }
}

/* ========== RENDER ========== */
function renderAll() {
  els.hunger.value = state.hunger; els.hungerVal.textContent = `${Math.round(state.hunger)}%`;
  els.health.value = state.health; els.healthVal.textContent = `${Math.round(state.health)}%`;
  els.sleep.value = state.sleep; els.sleepVal.textContent = `${Math.round(state.sleep)}%`;
  els.fun.value = state.fun; els.funVal.textContent = `${Math.round(state.fun)}%`;
  els.faith.value = state.faith; els.faithVal.textContent = `${Math.round(state.faith)}%`;
  els.toilet.value = state.toilet; els.toiletVal.textContent = `${Math.round(state.toilet)}%`;
  els.coins.textContent = fmtCoins(state.coins);

  // Zásoba jedla
  if (!els.foodDisplay) {
    els.foodDisplay = document.createElement('div');
    els.foodDisplay.style.cssText = 'margin-top:8px; font-size:14px; opacity:0.9;';
    els.coins.parentNode.appendChild(els.foodDisplay);
  }
  els.foodDisplay.textContent = `Jedlo v kuchyni: ${state.foodStock} porcií`;

  const cur = state.currentRoom;
  els.roomTitle.textContent = cur ? cur.charAt(0).toUpperCase() + cur.slice(1) : 'Domov';
  els.roomImg.src = cur ? (ROOM_ASSETS[cur] || ROOM_ASSETS.defaultRoom) : ROOM_ASSETS.defaultRoom;

  buildRoomActions();
  saveState();
  checkDeath();
}

/* ========== TICK ========== */
function applyTick() {
  if (!gameRunning) return;
  state.hunger = clamp(state.hunger - DEC.hunger);
  state.fun = clamp(state.fun - DEC.fun);
  state.sleep = clamp(state.sleep - DEC.sleep);
  state.faith = clamp(state.faith - DEC.faith);
  state.toilet = clamp(state.toilet + DEC.toilet);

  if (state.hunger <= 0) state.health = clamp(state.health - 10);
  if (state.toilet >= 95) state.health = clamp(state.health - 8);
  if (state.sleep <= 5) state.fun = clamp(state.fun - 5);

  state.lastTick = Date.now();
  renderAll();
}

function startTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(applyTick, TICK_MS);

  const now = Date.now();
  const missed = Math.floor((now - state.lastTick) / TICK_MS);
  for (let i = 0; i < missed; i++) applyTick();
}

/* ========== AKCIE ========== */
const ACTION_COOLDOWN = 700;
const lastAction = {};

function canAct(key) {
  const now = Date.now();
  if (lastAction[key] && now - lastAction[key] < ACTION_COOLDOWN) return false;
  lastAction[key] = now;
  return true;
}

function flash(text, time = 3000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div');
    f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 20px;background:#333;color:white;border-radius:12px;z-index:999;font-weight:bold;opacity:0;transition:opacity 0.4s;';
    document.body.appendChild(f);
  }
  f.textContent = text;
  f.style.opacity = '1';
  clearTimeout(f.hideTimeout);
  f.hideTimeout = setTimeout(() => f.style.opacity = '0', time);
}

/* Jesť z kuchyne */
function eatFood() {
  if (!canAct('eat')) return;
  if (state.foodStock <= 0) {
    flash('Nemáš žiadne jedlo!');
    return;
  }
  state.foodStock--;
  state.hunger = clamp(state.hunger + 48);
  state.health = clamp(state.health + 10);
  state.toilet = clamp(state.toilet + 15);
  flash('Pou sa najedol! Mňam mňam!');
  renderAll();
}

/* ========== MIESTNOSTI ========== */
function buildRoomActions() {
  els.actions.innerHTML = '';
  const cur = state.currentRoom;

  if (!cur) {
    const info = document.createElement('div');
    info.className = 'muted';
    info.textContent = 'Klikni na miestnosť alebo na Pou';
    els.actions.appendChild(info);
    return;
  }

  // Kuchyňa
  if (cur === 'kuchyna') {
    const stock = document.createElement('div');
    stock.innerHTML = `<strong>Zásoba jedla:</strong> ${state.foodStock} porcií`;
    stock.style.marginBottom = '12px';
    els.actions.appendChild(stock);

    const eatBtn = document.createElement('button');
    eatBtn.textContent = state.foodStock > 0 ? 'Jesť (1 porcia)' : 'Žiadne jedlo';
    eatBtn.disabled = state.foodStock === 0;
    eatBtn.onclick = eatFood;
    els.actions.appendChild(eatBtn);

    const buyBtn = document.createElement('button');
    buyBtn.textContent = 'Kúpiť 5 porcií (18¢)';
    buyBtn.onclick = () => {
      if (state.coins < 18) { flash('Nedostatok mincí!'); return; }
      state.coins -= 18;
      state.foodStock += 5;
      flash('Kúpil si 5 porcií jedla!');
      renderAll();
    };
    els.actions.appendChild(buyBtn);

  } 
  // Market
  else if (cur === 'market') {
    const b1 = document.createElement('button');
    b1.textContent = 'Malá zásoba (15¢ → +6 porcií)';
    b1.onclick = () => { if (state.coins >= 15) { state.coins -= 15; state.foodStock += 6; flash('Kúpil si malú zásobu!'); renderAll(); } else flash('Málo mincí'); };
    els.actions.appendChild(b1);

    const b2 = document.createElement('button');
    b2.textContent = 'Veľká zásoba (40¢ → +20 porcií)';
    b2.onclick = () => { if (state.coins >= 40) { state.coins -= 40; state.foodStock += 20; flash('Kúpil si veľkú zásobu!'); renderAll(); } else flash('Málo mincí'); };
    els.actions.appendChild(b2);
  }
  // Ostatné miestnosti (práca, casino, atď.)
  else if (cur === 'praca') {
    const btn = document.createElement('button');
    btn.textContent = 'Pracovať (zarobiť 8–25¢)';
    btn.onclick = () => {
      if (!canAct('work')) return;
      const earn = 8 + Math.floor(Math.random() * 18);
      state.coins += earn;
      state.fun = clamp(state.fun - 8);
      state.toilet = clamp(state.toilet + 12);
      flash(`Zarobil si ${earn}¢!`);
      renderAll();
    };
    els.actions.appendChild(btn);
  }
  // ... ostatné miestnosti môžeš doplniť podľa potreby

  // Vždy tlačidlo Domov
  const home = document.createElement('button');
  home.textContent = 'Domov';
  home.style.marginTop = '16px';
  home.onclick = () => { state.currentRoom = null; renderAll(); };
  els.actions.appendChild(home);
}

/* ========== NAVIGÁCIA ========== */
qa('.rooms button').forEach(btn => {
  btn.addEventListener('click', () => {
    state.currentRoom = btn.dataset.room;
    renderAll();
  });
});

els.pouImg.addEventListener('click', () => {
  state.currentRoom = null;
  renderAll();
});

/* ========== INIT ========== */
q('#saveBtn').onclick = () => { saveState(); flash('Hra uložená!'); };
q('#resetBtn').onclick = () => {
  if (confirm('Naozaj chceš resetovať hru?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

function init() {
  renderAll();
  startTick();
  window.addEventListener('beforeunload', saveState);
}
init();