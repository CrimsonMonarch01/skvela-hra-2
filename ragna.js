/* ============================
   RAGNA.JS — Pou Ultimate + EVENT KONSOLIDÁCIA + GANA + SEBA-VRAŽDA
   ============================ */

const TICK_MS = 120000;
const DEC = { sleep: 3, hunger: 7, fun: 9, faith: 1, toilet: 5 };

const ROOM_ASSETS = {
  defaultRoom: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/pou.png',
  kuchyna: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/kuchyna.png',
  kupelna: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/kupelna.jpg',
  hracia: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/hracia-miestnost.png',
  spalna: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/spalna.jpg',
  praca: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/kancelaria-s-papiermi.png',
  casino: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/casino.png',
  wc: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/WC.png',
  church: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/kostol.png',
  market: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/market.jpg'
};

const STORAGE_KEY = 'pou_konsolidacia_v666';
const DEFAULT = {
  hunger: 70, health: 100, sleep: 60, fun: 75, faith: 20, toilet: 15,
  coins: 100, foodStock: 7, currentRoom: null, lastTick: Date.now(),
  eventKonsolidacia: false,      // či beží event
  blackMarketUnlocked: false,    // či je odomknutý black market
  hasGana: false                 // či si kúpil ganu
};

let state = Object.assign({}, DEFAULT, loadState());
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v, a=0, b=100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return ` ${n}¢`; }

function loadState() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); }
  catch(e) { console.warn(e); }
  return {};
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ========== FLASH ========== */
function flash(text, time = 4000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div'); f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:16px 28px;background:#000c;color:#f33;border:3px solid #f33;border-radius:20px;z-index:99999;font-weight:bold;opacity:0;transition:all .5s;';
    document.body.appendChild(f);
  }
  f.innerHTML = text; f.style.opacity = '1';
  clearTimeout(f.to); f.to = setTimeout(() => f.style.opacity = '0', time);
}

/* ========== EVENT KONSOLIDÁCIA ========== */
// Náhodne spustiť event (cca raz za 15–40 minút)
setTimeout(() => {
  if (!state.eventKonsolidacia && Math.random() < 0.7) {
    state.eventKonsolidacia = true;
    flash('<span style="font-size:20px">KONSOLIDÁCIA!</span><br>Všetky ceny +75%!<br>Zbohatni alebo zomri!', 8000);
    renderAll();
  }
}, Math.random() * 600000 + 900000);

/* ========== BLACK MARKET & GANA ========== */
function tryUnlockBlackMarket() {
  if (state.coins >= 10000 && !state.blackMarketUnlocked) {
    state.blackMarketUnlocked = true;
    flash('BLACK MARKET ODOMKNUTÝ!<br>Choď do Market → "Temný kút"', 7000);
    renderAll();
  }
}

function buyGana() {
  if (state.coins < 9999) return flash('Chýba ti presne 1¢ na ganu... smola');
  state.coins -= 9999;
  state.hasGana = true;
  flash('KÚPIL SI SI GANU<br>Teraz máš dve možnosti...', 6000);
  setTimeout(() => {
    if (confirm('Si pripravený?\n\n[OK] = ZABIŤ SA (Game Over)\n[Cancel] = ŽIŤ ĎALEJ S GANOU')) {
      flash('Pou sa zastrelil. Koniec.', 10000);
      setTimeout(() => { state.health = 0; renderAll(); }, 1500);
    } else {
      flash('Pou sa rozhodol žiť ďalej... zatiaľ', 5000);
    }
    renderAll();
  }, 1000);
}

/* ========== CENA S EVENTOM ========== */
function getPrice(base) {
  return state.eventKonsolidacia ? Math.ceil(base * 1.75) : base;
}

/* ========== RENDER ========== */
function renderAll() {
  q('#hunger').value = state.hunger; q('#hunger-val').textContent = Math.round(state.hunger)+'%';
  q('#health').value = state.health; q('#health-val').textContent = Math.round(state.health)+'%';
  q('#sleep').value = state.sleep; q('#sleep-val').textContent = Math.round(state.sleep)+'%';
  q('#fun').value = state.fun; q('#fun-val').textContent = Math.round(state.fun)+'%';
  q('#faith').value = state.faith; q('#faith-val').textContent = Math.round(state.faith)+'%';
  q('#toilet').value = state.toilet; q('#toilet-val').textContent = Math.round(state.toilet)+'%';
  q('#coins').textContent = fmtCoins(state.coins);

  // Zásoba jedla
  let foodEl = q('#foodInfo');
  if (!foodEl) {
    foodEl = document.createElement('div'); foodEl.id = 'foodInfo';
    q('#coins').parentNode.appendChild(foodEl);
  }
  foodEl.innerHTML = `Jedlo: ${state.foodStock} porcií` + (state.eventKonsolidacia ? ' <span style="color:#f33">(KONSOLIDÁCIA!)</span>' : '');

  // Event info
  if (state.eventKonsolidacia) {
    let ev = q('#eventBanner');
    if (!ev) {
      ev = document.createElement('div'); ev.id = 'eventBanner';
      ev.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#800;color:#fff;padding:10px 30px;border-radius:50px;font-weight:bold;z-index:9998;';
      ev.textContent = 'KONSOLIDÁCIA – ceny +75%!';
      document.body.appendChild(ev);
    }
  } else {
    if (q('#eventBanner')) q('#eventBanner').remove();
  }

  q('#room-title').textContent = state.currentRoom ? state.currentRoom.charAt(0).toUpperCase() + state.currentRoom.slice(1) : 'Domov';
  q('#room-img').src = state.currentRoom ? (ROOM_ASSETS[state.currentRoom] || ROOM_ASSETS.defaultRoom) : ROOM_ASSETS.defaultRoom;

  buildRoomActions();
  tryUnlockBlackMarket();
  saveState();
  if (state.health <= 0) setTimeout(gameOver, 1000);
}

/* ========== AKCIE V MIESTNOSTIACH ========== */
function buildRoomActions() {
  const actions = q('#actions'); actions.innerHTML = '';
  if (!state.currentRoom) { actions.innerHTML = '<div class="muted">Vyber miestnosť</div>'; return; }

  const btn = (icon, text, onclick, price = null) => {
    const b = document.createElement('button');
    b.innerHTML = `${icon} ${text}` + (price !== null ? ` <small>(${getPrice(price)}¢)</small>` : '');
    b.style.cssText = 'padding:16px;margin:8px;font-size:18px;border-radius:16px;';
    b.onclick = onclick;
    actions.appendChild(b);
    return b;
  };

  // KUCHYŇA
  if (state.currentRoom === 'kuchyna') {
    actions.innerHTML += `<div style="margin:12px 0"><strong>Zásoba: ${state.foodStock}</strong></div>`;
    btn('Jesť', 'Jesť (1 porcia)', () => {
      if (state.foodStock <= 0) return flash('Došlo jedlo!');
      state.foodStock--; state.hunger = clamp(state.hunger + 55); state.toilet += 20;
      flash('Mňam mňam!');
      renderAll();
    });
    btn('Kúpiť jedlo', 'Kúpiť 5× jedlo', () => {
      const cena = getPrice(22);
      if (state.coins >= cena) { state.coins -= cena; state.foodStock += 5; flash('Kúpil si jedlo!'); renderAll(); }
      else flash('Nemáš dosť peňazí!');
    }, 22);
  }

  // MARKET
  if (state.currentRoom === 'market') {
    btn('Malá zásoba', '+8 jedla', () => { const c = getPrice(18); if (state.coins >= c) { state.coins -= c; state.foodStock += 8; renderAll(); } }, 18);
    btn('Stredná zásoba', '+20 jedla', () => { const c = getPrice(45); if (state.coins >= c) { state.coins -= c; state.foodStock += 20; renderAll(); } }, 45);
    btn('Veľká zásoba', '+50 jedla', () => { const c = getPrice(100); if (state.coins >= c) { state.coins -= c; state.foodStock += 50; renderAll(); } }, 100);

    // BLACK MARKET
    if (state.blackMarketUnlocked) {
      actions.innerHTML += '<hr><div style="color:#f33;font-weight:bold">TEMNÝ KÚT</div>';
      if (!state.hasGana) {
        btn('GANA', 'Kúpiť ganu za 9999¢', buyGana);
      } else {
        btn('Gana', 'Už máš ganu... môžeš ju použiť', () => {
          if (confirm('Naozaj chceš skončiť?')) { state.health = 0; renderAll(); }
        });
      }
    }
  }

  // CASINO
  if (state.currentRoom === 'casino') {
    btn('Sloty', 'Výherné automaty', () => alert('Sloty coming soon'));
    btn('Ruleta', 'Ruleta', () => alert('Ruleta coming soon'));
    btn('Hod mincou', 'Hod mincou 50/50', () => alert('Coinflip coming soon'));
  }

  // OSTATNÉ AKCIE
  const simple = {
    kupelna: ['Sprcha', () => { const c = getPrice(5); if (state.coins >= c) { state.coins -= c; state.health += 40; flash('Čistý!'); renderAll(); } }, 5],
    spalna: ['Spať', () => { state.sleep += 80; state.health += 20; flash('Vyspatý'); renderAll(); }],
    wc: ['WC', () => { state.toilet = 0; state.health += 15; flash('Úľava'); renderAll(); }],
    praca: ['Práca', () => { const earn = 20 + Math.floor(Math.random()*40); state.coins += earn; state.fun -= 15; flash(`+${earn}¢ z roboty`); renderAll(); }],
    church: ['Modlitba', () => { state.faith += 50; flash('Amen'); renderAll(); }],
    hracia: ['Hrať sa', () => { state.fun += 60; state.hunger -= 10; flash('Zábava!'); renderAll(); }]
  };
  if (simple[state.currentRoom]) {
    const [icon, fn, price] = simple[state.currentRoom];
    btn(icon, icon, fn, price || null);
  }

  // Domov
  btn('Domov', 'Domov', () => { state.currentRoom = null; renderAll(); }).style.marginTop = '30px';
}

/* ========== GAME OVER ========== */
function gameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(tickInterval);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:99999;color:#f33;font-size:60px;text-align:center;';
  ov.innerHTML = `<div style="background:#300;padding:60px;border:10px solid #f33;border-radius:30px;">
    GAME OVER<br><button onclick="localStorage.removeItem('pou_konsolidacia_v666');location.reload()" style="margin-top:30px;padding:20px 50px;font-size:30px;background:#900;border:none;border-radius:20px;cursor:pointer;">Nová hra</button>
  </div>`;
  document.body.appendChild(ov);
}

/* ========== TICK & INIT ========== */
function applyTick() {
  if (!gameRunning) return;
  state.hunger = clamp(state.hunger - DEC.hunger);
  state.fun = clamp(state.fun - DEC.fun);
  state.sleep = clamp(state.sleep - DEC.sleep);
  state.faith = clamp(state.faith - DEC.faith);
  state.toilet = clamp(state.toilet + DEC.toilet);
  if (state.hunger <= 0 || state.toilet >= 100) state.health = clamp(state.health - 15);
  state.lastTick = Date.now();
  renderAll();
}

function startTick() {
  clearInterval(tickInterval);
  tickInterval = setInterval(applyTick, TICK_MS);
  const missed = Math.floor((Date.now() - state.lastTick) / TICK_MS);
  for (let i = 0; i < missed; i++) applyTick();
}

/* ========== NAVIGÁCIA ========== */
qa('.rooms button').forEach(b => b.onclick = () => { state.currentRoom = b.dataset.room; renderAll(); });
q('#pou-img').onclick = () => { state.currentRoom = null; renderAll(); };
q('#saveBtn').onclick = () => { saveState(); flash('Uložené'); };
q('#resetBtn').onclick = () => confirm('Reset?') && (localStorage.removeItem(STORAGE_KEY), location.reload());

function init() {
  renderAll();
  startTick();
  window.addEventListener('beforeunload', saveState);
}
init();