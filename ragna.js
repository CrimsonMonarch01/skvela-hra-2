/* ============================
   RAGNA.JS — Pou Ultimate (FULL VERZIA 2025)
   ============================ */

const TICK_MS = 120000; // 2 minúty
const DEC = { sleep: 3, hunger: 7, fun: 9, faith: 1, toilet: 5 };

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

const STORAGE_KEY = 'pou_ultimate_full';
const DEFAULT = {
  hunger: 70, health: 100, sleep: 60, fun: 75, faith: 20, toilet: 15,
  coins: 80, foodStock: 5, currentRoom: null, lastTick: Date.now()
};

let state = loadState();
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v, a=0, b=100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return `💠 ${n}¢`; }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign({}, DEFAULT, JSON.parse(raw));
  } catch(e) { console.warn(e); }
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
  coins: q('#coins'), foodDisplay: null,
  pouImg: q('#pou-img'), roomImg: q('#room-img'), roomTitle: q('#room-title'),
  actions: q('#actions'), modal: q('#modal'), modalContent: q('#modal-content'), modalClose: q('#modal-close')
};

/* ========== FLASH & MODAL ========== */
function flash(text, time = 3000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div'); f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 24px;background:#222;color:white;border-radius:12px;z-index:9999;font-weight:bold;opacity:0;transition:opacity .4s;';
    document.body.appendChild(f);
  }
  f.textContent = text; f.style.opacity = '1';
  clearTimeout(f.to); f.to = setTimeout(() => f.style.opacity = '0', time);
}

function showModal(html) {
  els.modal.classList.remove('hidden');
  els.modalContent.innerHTML = html;
  els.modalClose.onclick = closeModal;
  els.modal.onclick = e => { if (e.target === els.modal) closeModal(); };
}
function closeModal() { els.modal.classList.add('hidden'); }

/* ========== GAME OVER ========== */
function gameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(tickInterval);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;text-align:center;font-family:sans-serif;';
  overlay.innerHTML = `<div style="background:#900;padding:50px 80px;border-radius:30px;border:8px solid #f33;">
    <h1 style="font-size:70px;margin:0;">GAME OVER</h1>
    <p style="font-size:30px;">Pou zomrel</p>
    <button id="restart" style="margin-top:30px;padding:15px 40px;font-size:24px;background:#222;border:none;border-radius:12px;cursor:pointer;color:white;">Nová hra</button>
  </div>`;
  document.body.appendChild(overlay);
  q('#restart').onclick = () => { localStorage.removeItem(STORAGE_KEY); location.reload(); };
}

function checkDeath() {
  if (state.health <= 0 && gameRunning) {
    state.health = 0;
    renderAll();
    setTimeout(gameOver, 1200);
  }
}

/* ========== RENDER ========== */
function renderAll() {
  els.hunger.value = state.hunger; els.hungerVal.textContent = Math.round(state.hunger)+'%';
  els.health.value = state.health; els.healthVal.textContent = Math.round(state.health)+'%';
  els.sleep.value = state.sleep; els.sleepVal.textContent = Math.round(state.sleep)+'%';
  els.fun.value = state.fun; els.funVal.textContent = Math.round(state.fun)+'%';
  els.faith.value = state.faith; els.faithVal.textContent = Math.round(state.faith)+'%';
  els.toilet.value = state.toilet; els.toiletVal.textContent = Math.round(state.toilet)+'%';
  els.coins.textContent = fmtCoins(state.coins);

  if (!els.foodDisplay) {
    els.foodDisplay = document.createElement('div');
    els.foodDisplay.style.marginTop = '8px';
    els.coins.parentNode.appendChild(els.foodDisplay);
  }
  els.foodDisplay.textContent = `Jedlo: ${state.foodStock} porcií`;

  els.roomTitle.textContent = state.currentRoom ? state.currentRoom.charAt(0).toUpperCase() + state.currentRoom.slice(1) : 'Domov';
  els.roomImg.src = state.currentRoom ? (ROOM_ASSETS[state.currentRoom] || ROOM_ASSETS.defaultRoom) : ROOM_ASSETS.defaultRoom;

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

  if (state.hunger <= 0) state.health = clamp(state.health - 12);
  if (state.toilet >= 100) state.health = clamp(state.health - 15);
  if (state.sleep <= 5) state.fun = clamp(state.fun - 6);

  state.lastTick = Date.now();
  renderAll();
}

function startTick() {
  clearInterval(tickInterval);
  tickInterval = setInterval(applyTick, TICK_MS);
  const missed = Math.floor((Date.now() - state.lastTick) / TICK_MS);
  for (let i = 0; i < missed; i++) applyTick();
}

/* ========== AKCIE ========== */
function canAct(key) {
  const now = Date.now();
  if (lastAction[key] && now - lastAction[key] < 700) return false;
  lastAction[key] = now;
  return true;
}
const lastAction = {};

function eatFood() {
  if (!canAct('eat') || state.foodStock <= 0) { flash('Žiadne jedlo!'); return; }
  state.foodStock--;
  state.hunger = clamp(state.hunger + 50);
  state.health = clamp(state.health + 10);
  state.toilet = clamp(state.toilet + 18);
  flash('Mňam mňam! Pou sa najedol');
  renderAll();
}

/* ========== CASINO MINIGAMES ========== */
function openSlots() {
  showModal(`<h3>Sloty</h3>
    <p>Stávka: <input id="bet" type="number" min="1" value="10" style="width:70px"> ¢</p>
    <button id="spin">Točiť!</button><div id="res" style="margin-top:15px;font-size:24px;"></div>`);
  q('#spin').onclick = () => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo mincí!');
    state.coins -= bet;
    const s = ['Cherry','Lemon','Bell','Star','Diamond'];
    const a = s[Math.floor(Math.random()*s.length)];
    const b = s[Math.floor(Math.random()*s.length)];
    const c = s[Math.floor(Math.random()*s.length)];
    q('#res').innerHTML = `${a} ${b} ${c}<br>`;
    if (a===b && b===c) { const win = bet*15; state.coins += win; q('#res').innerHTML += `JACKPOT! +${win}¢`; }
    else if (a===b || b===c) { const win = bet*3; state.coins += win; q('#res').innerHTML += `Výhra +${win}¢`; }
    renderAll();
  };
}

function openRoulette() {
  showModal(`<h3>Ruleta</h3>
    Stávka: <input id="bet" type="number" min="1" value="10" style="width:70px"> ¢<br><br>
    <input id="choice" placeholder="číslo 0-36 alebo red/black" style="width:200px"><br><br>
    <button id="spin">Točiť!</button><div id="res"></div>`);
  q('#spin').onclick = () => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo mincí!');
    state.coins -= bet;
    const roll = Math.floor(Math.random()*37);
    const color = roll===0 ? 'green' : (roll%2===0 ? 'black' : 'red');
    const choice = q('#choice').value.trim().toLowerCase();
    let win = 0;
    if (!isNaN(choice) && +choice === roll) win = bet*35;
    else if (choice==='red' && color==='red') win = bet*2;
    else if (choice==='black' && color==='black') win = bet*2;
    q('#res').innerHTML = `Padlo: ${roll} (${color})<br>`;
    if (win>0) { state.coins += win; q('#res').innerHTML += `Výhra ${win}¢!`; }
    else q('#res').innerHTML += 'Prehra';
    renderAll();
  };
}

function openCoinFlip() {
  showModal(`<h3>Hod mincou (50/50)</h3>
    Stávka: <input id="bet" type="number" min="1" value="20" style="width:70px"> ¢<br><br>
    <button onclick="coinFlip(true)">Hlava</button>
    <button onclick="coinFlip(false)">Písmo</button>
    <div id="res" style="margin-top:15px;font-size:22px;"></div>`);
  window.coinFlip = (guess) => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo mincí!');
    state.coins -= bet;
    const result = Math.random() < 0.5;
    q('#res').textContent = result ? 'Hlava' : 'Písmo';
    if (result === guess) { state.coins += bet*2; q('#res').innerHTML += '<br>Výhra! +'+(bet*2)+'¢'; }
    else q('#res').innerHTML += '<br>Prehra';
    renderAll();
  };
}

/* ========== ROOM ACTIONS ========== */
function buildRoomActions() {
  els.actions.innerHTML = '';
  const cur = state.currentRoom;
  if (!cur) { els.actions.innerHTML = '<div class="muted">Klikni na miestnosť alebo na Pou</div>'; return; }

  // Kuchyňa
  if (cur === 'kuchyna') {
    els.actions.innerHTML += `<div style="margin-bottom:12px"><strong>Jedlo v zásobe:</strong> ${state.foodStock}</div>`;
    const eat = document.createElement('button');
    eat.textContent = state.foodStock > 0 ? 'Jesť (1 porcia)' : 'Žiadne jedlo';
    eat.disabled = state.foodStock === 0;
    eat.onclick = eatFood;
    els.actions.appendChild(eat);

    const buy = document.createElement('button');
    buy.textContent = 'Kúpiť 5 porcií (20¢)';
    buy.onclick = () => { if (state.coins >= 20) { state.coins -= 20; state.foodStock += 5; flash('Kúpil si jedlo!'); renderAll(); } else flash('Málo mincí'); };
    els.actions.appendChild(buy);
  }

  // Market
  if (cur === 'market') {
    ['Malá (15¢ → +6)', 'Stredná (35¢ → +18)', 'Veľká (80¢ → +50)'].forEach((txt, i) => {
      const [cost, plus] = [15,6,35,18,80,50][i*2] ? [15,6,35,18,80,50].slice(i*2, i*2+2) : [];
      const b = document.createElement('button');
      b.textContent = txt;
      b.onclick = () => { if (state.coins >= cost) { state.coins -= cost; state.foodStock += plus; flash(`Kúpil si ${plus} porcií!`); renderAll(); } else flash('Málo mincí'); };
      els.actions.appendChild(b);
    });
  }

  // Casino
  if (cur === 'casino') {
    ['Sloty', 'Ruleta', 'Hod mincou'].forEach((name, i) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.onclick = [openSlots, openRoulette, openCoinFlip][i];
      els.actions.appendChild(b);
    });
  }

  // Ostatné akcie
  const actions = {
    kupelna: () => { if (state.coins >= 3) { state.coins -= 3; state.health += 35; flash('Čistý a svieži!'); } else flash('Málo mincí'); },
    spalna: () => { state.sleep += 60; state.health += 12; state.fun -= 8; flash('Pou si pospal'); },
    wc: () => { state.toilet = 5; state.health += 8; flash('Uf, úľava!'); },
    praca: () => { const earn = 10 + Math.floor(Math.random()*20); state.coins += earn; state.fun -= 10; state.toilet += 15; flash(`Zarobil si ${earn}¢!`); },
    church: () => { state.faith += 35; state.fun -= 5; flash('Pou sa modlil'); },
    hracia: () => { state.fun += 40; state.hunger -= 8; flash('Pou sa bavil!'); }
  };
  if (actions[cur]) {
    const b = document.createElement('button');
    b.textContent = {kupelna:'Sprcha (3¢)', spalna:'Spať', wc:'WC', praca:'Pracovať', church:'Modliť sa', hracia:'Hrať sa'}[cur];
    b.onclick = () => { if (canAct(cur)) { actions[cur](); renderAll(); } };
    els.actions.appendChild(b);
  }

  // Domov
  const home = document.createElement('button');
  home.textContent = 'Domov';
  home.style.marginTop = '20px';
  home.onclick = () => { state.currentRoom = null; renderAll(); };
  els.actions.appendChild(home);
}

/* ========== NAVIGÁCIA ========== */
qa('.rooms button').forEach(b => b.onclick = () => { state.currentRoom = b.dataset.room; renderAll(); });
els.pouImg.onclick = () => { state.currentRoom = null; renderAll(); };

q('#saveBtn').onclick = () => { saveState(); flash('Uložené!'); };
q('#resetBtn').onclick = () => confirm('Resetovať hru?') && (localStorage.removeItem(STORAGE_KEY) || location.reload());

/* ========== INIT ========== */
function init() {
  renderAll();
  startTick();
  window.addEventListener('beforeunload', saveState);
}
init();