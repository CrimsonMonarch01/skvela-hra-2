/* ============================
   RAGNA.JS — Pou Ultimate (PLNÁ VERZIA S IKONKAMI + OBRÁZKAMI)
   ============================ */

const TICK_MS = 120000;
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
  market: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/main/market.jpg'
};

const STORAGE_KEY = 'pou_ultimate_icons';
const DEFAULT = {
  hunger: 70, health: 100, sleep: 60, fun: 75, faith: 20, toilet: 15,
  coins: 100, foodStock: 7, currentRoom: null, lastTick: Date.now()
};

let state = loadState();
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v, a=0, b=100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return ` ${n}¢`; }

function loadState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return Object.assign({}, DEFAULT, JSON.parse(raw)); }
  catch(e) { console.warn(e); }
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
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:14px 24px;background:#000000dd;color:white;border-radius:16px;z-index:9999;font-weight:bold;opacity:0;transition:opacity .4s;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
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
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.97);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;text-align:center;';
  overlay.innerHTML = `<div style="background:#900;padding:60px;border-radius:30px;border:10px solid #f33;">
    <h1 style="font-size:80px;margin:0;">GAME OVER</h1>
    <p style="font-size:32px;">Pou odišiel do neba</p>
    <button onclick="localStorage.removeItem('pou_ultimate_icons');location.reload()" style="margin-top:30px;padding:18px 50px;font-size:28px;background:#222;border:none;border-radius:16px;cursor:pointer;">Nová hra</button>
  </div>`;
  document.body.appendChild(overlay);
}

function checkDeath() {
  if (state.health <= 0 && gameRunning) { state.health = 0; renderAll(); setTimeout(gameOver, 1200); }
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
    els.foodDisplay.style.cssText = 'margin-top:8px;font-size:15px;';
    els.coins.parentNode.appendChild(els.foodDisplay);
  }
  els.foodDisplay.innerHTML = ` Jedlo v zásobe: ${state.foodStock}`;

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

/* ========== CASINO ========== */
function openSlots() {
  showModal(`<h3>Sloty</h3>
    <p>Stávka: <input id="bet" type="number" min="1" value="15" style="width:80px">¢</p>
    <button id="spin" style="padding:12px 30px;font-size:18px;">Točiť!</button>
    <div id="res" style="margin-top:20px;font-size:40px;letter-spacing:10px;"></div>`);
  q('#spin').onclick = () => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const s = ['Cherry','Lemon','Bell','Star','Diamond','Seven'];
    const a = s[Math.floor(Math.random()*s.length)];
    const b = s[Math.floor(Math.random()*s.length)];
    const c = s[Math.floor(Math.random()*s.length)];
    q('#res').textContent = `${a} ${b} ${c}`;
    if (a===b && b===c) { const win = bet*20; state.coins += win; flash(`JACKPOT! +${win}¢`); }
    else if (a===b || b===c || a===c) { const win = bet*4; state.coins += win; flash(`Výhra +${win}¢!`); }
    renderAll();
  };
}

function openRoulette() {
  showModal(`<h3>Ruleta</h3>
    Stávka: <input id="bet" type="number" min="1" value="20" style="width:80px">¢<br><br>
    <input id="choice" placeholder="číslo / red / black" style="width:220px;padding:8px;"><br><br>
    <button id="spin" style="padding:12px 40px;font-size:20px;">Točiť koleso!</button>
    <div id="res" style="margin-top:20px;font-size:24px;"></div>`);
  q('#spin').onclick = () => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Nedostatok mincí!');
    state.coins -= bet;
    const roll = Math.floor(Math.random()*37);
    const color = roll===0 ? 'zelená' : (roll%2===0 ? 'čierna' : 'červená');
    const choice = q('#choice').value.trim().toLowerCase();
    let win = 0;
    if (+choice === roll) win = bet*35;
    else if (choice==='red' && color==='červená') win = bet*2;
    else if (choice==='black' && color==='čierna') win = bet*2;
    q('#res').innerHTML = `Padlo: <strong>${roll} (${color})</strong><br>`;
    if (win>0) { state.coins += win; q('#res').innerHTML += `<span style="color:#90ee90">VÝHRA +${win}¢!</span>`; }
    else q('#res').innerHTML += '<span style="color:#ff4444">Prehra</span>';
    renderAll();
  };
}

function openCoinFlip() {
  showModal(`<h3>Hod mincou</h3>
    Stávka: <input id="bet" type="number" min="1" value="30" style="width:80px">¢<br><br>
    <button style="padding:15px 40px;font-size:22px;margin:8px;">Hlava</button>
    <button style="padding:15px 40px;font-size:22px;margin:8px;">Písmo</button>
    <div id="res" style="margin-top:20px;font-size:50px;"></div>`);
  qa('#modal button').forEach((btn, i) => {
    btn.onclick = () => {
      const bet = Math.max(1, +q('#bet').value);
      if (state.coins < bet) return flash('Málo peňazí!');
      state.coins -= bet;
      const result = Math.random() < 0.5;
      q('#res').textContent = result ? 'Hlava' : 'Písmo';
      if (result === (i===0)) { state.coins += bet*2; q('#res').innerHTML += '<br><span style="color:#90ee90">VÝHRA!</span>'; }
      else q('#res').innerHTML += '<br><span style="color:#ff4444">Prehra</span>';
      renderAll();
    };
  });
}

/* ========== AKCIE S PEKNÝMI IKONKAMI ========== */
function buildRoomActions() {
  els.actions.innerHTML = '';
  const cur = state.currentRoom;
  if (!cur) { els.actions.innerHTML = '<div class="muted">Klikni na miestnosť alebo na Pou</div>'; return; }

  const btn = (text, icon, onclick, cost = null) => {
    const b = document.createElement('button');
    b.innerHTML = `${icon} ${text}` + (cost ? ` <small>(${cost}¢)</small>` : '');
    b.style.cssText = 'padding:14px 20px;margin:8px;font-size:18px;border-radius:16px;';
    b.onclick = onclick;
    els.actions.appendChild(b);
    return b;
  };

  if (cur === 'kuchyna') {
    els.actions.innerHTML += `<div style="font-size:18px;margin-bottom:12px;"><strong>Zásoba jedla: ${state.foodStock}</strong></div>`;
    btn('Jesť', 'Mňam', eatFood).disabled = state.foodStock === 0;
    btn('Kúpiť 5× jedlo', 'Nakúpiť', () => {
      if (state.coins >= 22) { state.coins -= 22; state.foodStock += 5; flash('Kúpil si jedlo!'); renderAll(); }
      else flash('Málo peňazí!');
    });
  }

  if (cur === 'market') {
    btn('Malá zásoba +8', '15¢', () => { if (state.coins >= 15) { state.coins -= 15; state.foodStock += 8; flash('Kúpil si jedlo!'); renderAll(); } });
    btn('Stredná +20', '38¢', () => { if (state.coins >= 38) { state.coins -= 38; state.foodStock += 20; flash('Veľká zásoba!'); renderAll(); } });
    btn('Veľká +50', '90¢', () => { if (state.coins >= 90) { state.coins -= 90; state.foodStock += 50; flash('MEGA nákup!'); renderAll(); } });
  }

  if (cur === 'casino') {
    btn('Sloty', 'Výherné automaty', openSlots);
    btn('Ruleta', 'Koleso šťastia', openRoulette);
    btn('Hod mincou', '50/50', openCoinFlip);
  }

  if (cur === 'kupelna') btn('Sprcha', 'Umývanie', () => { if (state.coins >= 4) { state.coins -= 4; state.health += 40; flash('Čistý Pou!'); renderAll(); } else flash('Málo peňazí'); });
  if (cur === 'spalna') btn('Spať', 'Spánok', () => { state.sleep += 70; state.health += 15; state.fun -= 10; flash('Pou si pospal'); renderAll(); });
  if (cur === 'wc') btn('Na WC', 'Toaleta', () => { state.toilet = 5; state.health += 12; flash('Úľava!'); renderAll(); });
  if (cur === 'praca') btn('Pracovať', 'Práca', () => { const earn = 15 + Math.floor(Math.random()*25); state.coins += earn; state.fun -= 12; state.toilet += 20; flash(`Zarobil si ${earn}¢!`); renderAll(); });
  if (cur === 'church') btn('Modlitba', 'Modlitba', () => { state.faith += 45; state.fun -= 6; flash('Pou sa modlil'); renderAll(); });
  if (cur === 'hracia') btn('Hrať sa', 'Zábava', () => { state.fun += 50; state.hunger -= 10; flash('Zábava level 100!'); renderAll(); });

  // Domov
  btn('Domov', 'Domov', () => { state.currentRoom = null; renderAll(); }).style.marginTop = '20px';
}

function eatFood() {
  if (state.foodStock <= 0) { flash('Došlo jedlo!'); return; }
  state.foodStock--;
  state.hunger = clamp(state.hunger + 55);
  state.health = clamp(state.health + 12);
  state.toilet = clamp(state.toilet + 20);
  flash('Mňam! Pou sa najedol');
  renderAll();
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