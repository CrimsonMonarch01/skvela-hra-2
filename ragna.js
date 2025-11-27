/* ============================
   RAGNA.JS — Pou Ultimate KONSOLIDÁCIA 2025
   VŠETKO FUNGUJE – VŠETKY TLAČIDLÁ + ORANGE ROULETTE + FAITH OVERFLOW
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
  market: 'https://raw.githubusercontent.com/CrimsonMonarch01/skvela-hra-2/refs/heads/main/colored-realistic-design-snacks-vending-machine-with-electronic-control-panel-isolated_1284-30751.avif'
};

const STORAGE_KEY = 'pou_konsolidacia_v999';
const DEFAULT = {
  hunger: 70, health: 100, sleep: 60, fun: 75, faith: 20, toilet: 15,
  coins: 100, foodStock: 7, currentRoom: null, lastTick: Date.now(),
  eventKonsolidacia: false, blackMarketUnlocked: false, hasGana: false
};

let state = Object.assign({}, DEFAULT, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
let gameRunning = true;
let tickInterval = null;

const q = s => document.querySelector(s);

/* ========== SAVE/LOAD + FLASH ========== */
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function flash(text, time=4000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div'); f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:16px 28px;background:#000c;color:#f33;border:3px solid #f33;border-radius:20px;z-index:99999;font-weight:bold;opacity:0;transition:opacity .5s;';
    document.body.appendChild(f);
  }
  f.innerHTML = text; f.style.opacity = '1';
  clearTimeout(f.to);
  f.to = setTimeout(() => f.style.opacity = '0', time);
}

/* ========== KONSOLIDÁCIA & GANA ========== */
function getPrice(base) { return state.eventKonsolidacia ? Math.ceil(base * 1.75) : base; }
function tryUnlockBlackMarket() {
  if (state.coins >= 10000 && !state.blackMarketUnlocked) {
    state.blackMarketUnlocked = true;
    flash('BLACK MARKET ODOMKNUTÝ!', 8000);
  }
}
function buyGana() {
  if (state.coins < 9999) return flash('Chýba ti 1¢... smola');
  state.coins -= 9999; state.hasGana = true; state.eventKonsolidacia = false;
  q('#eventBanner')?.remove();
  flash('KÚPIL SI GANU...', 6000);
  setTimeout(() => {
    if (confirm('OK = zomrieť\nCancel = žiť')) { state.health = 0; } 
    else { flash('Žiješ... zatiaľ', 5000); }
    renderAll();
  }, 1000);
}

/* ========== RENDER ========== */
function renderAll() {
  q('#hunger').value = state.hunger; q('#hunger-val').textContent = Math.round(state.hunger)+'%';
  q('#health').value = state.health; q('#health-val').textContent = Math.round(state.health)+'%';
  q('#sleep').value = state.sleep; q('#sleep-val').textContent = Math.round(state.sleep)+'%';
  q('#fun').value = state.fun; q('#fun-val').textContent = Math.round(state.fun)+'%';
  q('#toilet').value = state.toilet; q('#toilet-val').textContent = Math.round(state.toilet)+'%';
  q('#coins').textContent = ` ${state.coins}¢`;

  const barValue = Math.min(state.faith, 100);
  q('#faith').value = barValue;
  q('#faith-val').textContent = state.faith + '%';

  if (state.faith > 100) {
    q('#faith').style.width = `${100 + (state.faith - 100) * 2}%`;
    q('#faith').style.transition = 'width 0.7s ease-out';
    q('#faith-val').style.color = '#ff0';
    q('#faith-val').style.textShadow = '0 0 15px gold, 0 0 30px gold';
    q('#faith-val').style.fontWeight = 'bold';
  } else {
    q('#faith').style.width = '';
    q('#faith-val').style.color = '';
    q('#faith-val').style.textShadow = '';
    q('#faith-val').style.fontWeight = '';
  }

  let fi = q('#foodInfo');
  if (!fi) { fi = document.createElement('div'); fi.id='foodInfo'; q('#coins').parentNode.appendChild(fi); }
  fi.innerHTML = `Jedlo: ${state.foodStock} porcií` + (state.eventKonsolidacia ? ' <span style="color:#f33">(KONSOLIDÁCIA)</span>' : '');

  if (state.eventKonsolidacia && !q('#eventBanner')) {
    const b = document.createElement('div'); b.id='eventBanner'; b.textContent='KONSOLIDÁCIA +75%!';
    b.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#800;color:#fff;padding:12px 40px;border-radius:50px;font-weight:bold;z-index:9998;';
    document.body.appendChild(b);
  } else if (!state.eventKonsolidacia) q('#eventBanner')?.remove();

  q('#room-title').textContent = state.currentRoom ? state.currentRoom.charAt(0).toUpperCase() + state.currentRoom.slice(1) : 'Domov';
  q('#room-img').src = ROOM_ASSETS[state.currentRoom] || ROOM_ASSETS.defaultRoom;

  buildRoomActions();
  tryUnlockBlackMarket();
  saveState();
  if (state.health <= 0) setTimeout(gameOver, 1000);
}

/* ========== TICK ========== */
function applyTick() {
  if (!gameRunning) return;
  state.hunger = Math.max(0, state.hunger - DEC.hunger);
  state.fun    = Math.max(0, state.fun - DEC.fun);
  state.sleep  = Math.max(0, state.sleep - DEC.sleep);
  state.faith  = Math.max(0, state.faith - DEC.faith);
  state.toilet = Math.min(100, state.toilet + DEC.toilet);
  if (state.hunger <= 0 || state.toilet >= 100) state.health = Math.max(0, state.health - 15);
  if (state.faith > 700) state.health = Math.max(0, state.health - 10);
  else if (state.faith > 500) state.health = Math.max(0, state.health - 5);
  state.lastTick = Date.now();
  renderAll();
}

/* ========== ORANGE ROULETTE BOSSFIGHT ========== */
function startJesusBossfight() {
  if (q('#bossOverlay')) return;
  q('#jesusSound').play();
  q('#heavenSound').play();

  const overlay = document.createElement('div');
  overlay.id = 'bossOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#000d;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;font-family:sans-serif;';
  document.body.appendChild(overlay);

  let chamber = [true, false, false, false, false, false];
  chamber.sort(() => Math.random() - 0.5);
  let position = 0;

  const updateUI = () => {
    overlay.innerHTML = `
      <h1 style="font-size:70px;color:gold;text-shadow:0 0 30px gold;margin:10px;">JEŽIŠ CHIPSTUS</h1>
      <img src="https://github.com/CrimsonMonarch01/skvela-hra-2/blob/main/jezisruleta_release.png?raw=true" style="width:600px;margin:20px;">
      <div style="font-size:36px;margin:10px;">RUSKÁ RULETA O DUŠU</div>
      <div style="font-size:28px;color:#f66;margin:10px;">Nábojov: <strong>${6 - position}/6</strong></div>
      <div id="status" style="font-size:32px;margin:20px;height:60px;font-weight:bold;"></div>
      <div id="buttons"></div>
    `;
  };

  const playerTurn = () => {
    updateUI();
    q('#status').textContent = 'Tvoja runda!';
    q('#buttons').innerHTML = `
      <button onclick="playerShootSelf()" style="padding:20px 50px;margin:10px;font-size:28px;background:#900;color:white;border:5px solid gold;border-radius:20px;">
        STRÍĽAŤ NA SEBA
      </button>
      <button onclick="playerShootJesus()" style="padding:20px 50px;margin:10px;font-size:28px;background:#090;color:white;border:5px solid gold;border-radius:20px;">
        STRÍĽAŤ NA JEŽIŠA
      </button>
    `;
  };

  window.playerShootSelf = () => {
    q('#gunshotSound').play();
    position++;
    if (chamber[position - 1]) {
      overlay.innerHTML = `<h1 style="color:#f33;font-size:80px;">BANG!</h1><div style="font-size:50px;color:#f33;">JEŽIŠ ŤA ZASTRELIL</div><button onclick="location.reload()" style="padding:20px 60px;font-size:30px;background:#900;color:white;border-radius:20px;">Skúsiť znova</button>`;
      state.health = 0; renderAll();
    } else {
      q('#status').innerHTML = '<span style="color:#0f0;">KLIK! Prežil si!</span>';
      setTimeout(playerTurn, 1500);
    }
  };

  window.playerShootJesus = () => {
    q('#gunshotSound').play();
    position++;
    if (chamber[position - 1]) {
      overlay.innerHTML = `<h1 style="color:#0f0;font-size:80px;">VYHRAL SI!</h1><div style="font-size:50px;color:gold;">PORAZIL SI BOHA</div><button onclick="q('#bossOverlay').remove(); q('#jesusSound').pause(); state.coins += 77777; state.health = 100; renderAll();" style="padding:25px 80px;font-size:40px;background:gold;color:black;border-radius:30px;">STAŤ SA BOHOM</button>`;
    } else {
      q('#status').innerHTML = '<span style="color:#ff0;">KLIK! Ježiš prežil...</span><br>Teraz strieľa on!';
      setTimeout(jesusTurn, 2000);
    }
  };

  const jesusTurn = () => {
    updateUI();
    q('#status').textContent = 'Ježiš strieľa...';
    setTimeout(() => {
      q('#gunshotSound').play();
      const shootsSelf = Math.random() < 0.5;
      if (shootsSelf) {
        position++;
        if (chamber[position - 1]) {
          overlay.innerHTML = `<h1 style="color:#0f0;font-size:80px;">JEŽIŠ SA ZASTRELIL!</h1><div style="font-size:50px;color:gold;">VYHRAL SI!</div><button onclick="q('#bossOverlay').remove(); q('#jesusSound').pause(); state.coins += 77777; state.health = 100; renderAll();" style="padding:25px 80px;font-size:40px;background:gold;color:black;border-radius:30px;">STAŤ SA BOHOM</button>`;
        } else {
          q('#status').innerHTML = '<span style="color:#ff0;">Ježiš prežil!</span>';
          setTimeout(playerTurn, 2000);
        }
      } else {
        position++;
        if (chamber[position - 1]) {
          overlay.innerHTML = `<h1 style="color:#f33;font-size:80px;">BANG!</h1><div style="font-size:50px;color:#f33;">ZOMREL SI</div><button onclick="location.reload()" style="padding:20px 60px;font-size:30px;background:#900;color:white;border-radius:20px;">Skúsiť znova</button>`;
          state.health = 0; renderAll();
        } else {
          q('#status').innerHTML = '<span style="color:#0f0;">Ježiš minul! Ideš ty!</span>';
          setTimeout(playerTurn, 2000);
        }
      }
    }, 2000);
  };

  updateUI();
  playerTurn();
}

/* ========== ROOM ACTIONS – VŠETKY FUNGUJÚ ========== */
function buildRoomActions() {
  const a = q('#actions'); a.innerHTML = '';
  if (!state.currentRoom) { a.innerHTML = '<div class="muted">Vyber miestnosť</div>'; return; }

  const btn = (icon, text, fn, price = null) => {
    const b = document.createElement('button');
    b.innerHTML = `${icon} ${text}` + (price !== null ? ` <small>(${getPrice(price)}¢)</small>` : '');
    b.onclick = fn;
    a.appendChild(b);
  };

  // KUCHYŇA
  if (state.currentRoom === 'kuchyna') {
    a.innerHTML += `<div style="margin:12px 0"><strong>Zásoba: ${state.foodStock}</strong></div>`;
    btn('Burger', 'Jesť', () => {
      if (state.foodStock <= 0) return flash('Došlo jedlo!');
      state.foodStock--; state.hunger = Math.min(100, state.hunger + 55);
      state.health = Math.min(100, state.health + 12); state.toilet += 20;
      flash('Mňam!'); renderAll();
    });
    btn('Shopping Cart', 'Kúpiť 5× jedlo', () => {
      const cena = getPrice(22);
      if (state.coins >= cena) { state.coins -= cena; state.foodStock += 5; flash('Kúpil si jedlo!'); renderAll(); }
      else flash('Málo peňazí!');
    });
  }

  // MARKET
  if (state.currentRoom === 'market') {
    btn('Shopping Bags', 'Malá zásoba +8', () => { const c=getPrice(18); if(state.coins>=c){state.coins-=c;state.foodStock+=8;renderAll();} else flash('Málo peňazí!'); });
    btn('Package', 'Stredná +20', () => { const c=getPrice(45); if(state.coins>=c){state.coins-=c;state.foodStock+=20;renderAll();} else flash('Málo peňazí!'); });
    btn('Shopping Cart', 'Veľká +50', () => { const c=getPrice(100); if(state.coins>=c){state.coins-=c;state.foodStock+=50;renderAll();} else flash('Málo peňazí!'); });
    if (state.blackMarketUnlocked) {
      a.innerHTML += '<hr style="border-color:#f33;"><div style="color:#f33;font-weight:bold;">Temný kút</div>';
      if (!state.hasGana) btn('Gun', 'Kúpiť ganu (9999¢)', buyGana);
      else btn('Skull', 'Použiť ganu', () => confirm('Naozaj?') && (state.health=0, renderAll()));
    }
  }

  // KOSTOL
  if (state.currentRoom === 'church') {
    const gain = state.faith > 850 ? 5 : 15;
    btn('Modlitba', 'Modliť sa', () => {
      state.faith = Math.min(1000, state.faith + gain);
      flash(`+${gain}% viery` + (state.faith >= 1000 ? ' → JEŽIŠ JE PRIPRAVENÝ!' : ''));
      renderAll();
    });
    if (state.faith >= 1000) {
      btn('CROSS', 'Vyvolať Ježiša', () => {
        flash('1000% VIERY – RUSKÁ RULETA ZAČÍNA!', 6000);
        setTimeout(startJesusBossfight, 1500);
      });
    }
  }

  // CASINO
  if (state.currentRoom === 'casino') {
    btn('Slot Machine', 'Sloty', openSlots);
    btn('Roulette', 'Ruleta', openRoulette);
    btn('Coin', 'Hod mincou', openCoinFlip);
  }

  // JEDNODUCHÉ IZBY
  const simple = {
    kupelna: ['Sprcha', () => { const c=getPrice(5); if(state.coins>=c){state.coins-=c;state.health=Math.min(100,state.health+40);flash('Osviežený!');renderAll();} else flash('Málo peňazí!'); }],
    spalna: ['Spať', () => { state.sleep = Math.min(100, state.sleep + 80); state.health = Math.min(100, state.health + 20); flash('Vyspatý!'); renderAll(); }],
    wc: ['WC', () => { state.toilet = 0; state.health = Math.min(100, state.health + 15); flash('Uľavilo sa...'); renderAll(); }],
    praca: ['Pracovať', () => { const earn = 20 + Math.floor(Math.random()*40); state.coins += earn; state.fun = Math.max(0, state.fun - 15); flash(`+${earn}¢`); renderAll(); }],
    hracia: ['Hrať sa', () => { state.fun = Math.min(100, state.fun + 60); state.hunger = Math.max(0, state.hunger - 10); flash('Zábava!'); renderAll(); }]
  };
  if (simple[state.currentRoom]) {
    const [text, fn] = simple[state.currentRoom];
    btn(text.slice(0,2), text, fn);
  }

  // DOMOV
  const homeBtn = document.createElement('button');
  homeBtn.innerHTML = 'House Domov';
  homeBtn.onclick = () => { state.currentRoom = null; renderAll(); };
  homeBtn.style.marginTop = '30px';
  a.appendChild(homeBtn);
}

/* ========== CASINO MINIGAMES – PÔVODNÉ A FUNGUJÚCE ========== */
function showModal(html) {
  const m = q('#modal');
  m.classList.remove('hidden');
  q('#modal-content').innerHTML = html + '<button id="closeModal" style="position:absolute;top:10px;right:10px;padding:10px;background:#900;color:white;border:none;border-radius:5px;cursor:pointer;">X</button>';
  q('#closeModal').onclick = () => m.classList.add('hidden');
  m.onclick = e => { if (e.target === m) m.classList.add('hidden'); };
}

function openSlots() {
  showModal(`
    <h3 style="color:#ff0;text-shadow:0 0 10px gold;">777 SLOTY 777</h3>
    <div style="font-size:90px;letter-spacing:20px;margin:40px 0;" id="reels">🍒 🍋 🔔</div>
    <p>Stávka: <input id="slotBet" type="number" min="1" value="100" style="width:100px;padding:8px;font-size:18px;">¢</p>
    <button id="slotSpin" style="padding:16px 60px;font-size:30px;background:#900;color:#fff;border:4px solid gold;border-radius:15px;">SPIN!</button>
  `);
  const symbols = ['🍒','🍋','🔔','⭐','💎'];
  q('#slotSpin').onclick = () => {
    const bet = Math.max(1, +q('#slotBet').value);
    if (state.coins < bet) return flash('Málo coinov!');
    state.coins -= bet;
    let spins = 18;
    const int = setInterval(() => {
      q('#reels').textContent = symbols[Math.floor(Math.random()*5)] + symbols[Math.floor(Math.random()*5)] + symbols[Math.floor(Math.random()*5)];
      if (--spins <= 0) {
        clearInterval(int);
        const a = symbols[Math.floor(Math.random()*5)];
        const b = symbols[Math.floor(Math.random()*5)];
        const c = symbols[Math.floor(Math.random()*5)];
        q('#reels').textContent = a + b + c;
        if (a===b && b===c) { const win = bet*30; state.coins += win; flash(`JACKPOT +${win}¢!`,7000); }
        else if (a===b || b===c || a===c) { const win = bet*5; state.coins += win; flash(`Výhra +${win}¢!`,5000); }
        renderAll();
      }
    }, 90);
  };
}

function openRoulette() {
  showModal(`
    <h3 style="color:#ff0;text-shadow:0 0 10px gold;">RULETA</h3>
    <p style="font-size:80px;margin:30px;">🟥⬛</p>
    <p>Stávka: <input id="bet" type="number" min="1" value="100" style="width:100px;padding:8px;">¢</p>
    <input id="choice" placeholder="0–36, red, black, even, odd" style="width:280px;padding:10px;">
    <button id="spin" style="padding:16px 60px;font-size:30px;background:#900;color:#fff;border:4px solid gold;border-radius:15px;">SPIN!</button>
    <div id="res" style="margin-top:20px;font-size:28px;font-weight:bold;"></div>
  `);
  q('#spin').onclick = () => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const roll = Math.floor(Math.random()*37);
    const color = roll===0 ? 'zelená' : (roll%2===0 ? 'čierna' : 'červená');
    const ch = q('#choice').value.trim().toLowerCase();
    let win = 0;
    if (+ch === roll) win = bet*35;
    else if (ch==='red' && color==='červená') win = bet*2;
    else if (ch==='black' && color==='čierna') win = bet*2;
    else if (ch==='even' && roll!==0 && roll%2===0) win = bet*2;
    else if (ch==='odd' && roll%2===1) win = bet*2;
    q('#res').innerHTML = `Padlo: ${roll} (${color})<br>`;
    if (win>0) { state.coins += win; q('#res').innerHTML += `<span style="color:#0f0">VÝHRA +${win}¢!</span>`; }
    else q('#res').innerHTML += '<span style="color:#f33">Prehra</span>';
    renderAll();
  };
}

function openCoinFlip() {
  showModal(`
    <h3 style="color:#ff0;text-shadow:0 0 10px gold;">HOD MINCOU</h3>
    <p style="font-size:180px;margin:20px 0;" id="coin">COIN</p>
    <p>Stávka: <input id="bet" type="number" min="1" value="200" style="width:110px;padding:8px;">¢</p>
    <button id="heads" style="padding:16px 50px;font-size:28px;margin:10px;background:#0066cc;color:white;border:4px solid gold;border-radius:15px;">HLAVA</button>
    <button id="tails" style="padding:16px 50px;font-size:28px;margin:10px;background:#c33;color:white;border:4px solid gold;border-radius:15px;">PÍSMO</button>
    <div id="res" style="font-size:32px;margin-top:20px;font-weight:bold;"></div>
  `);
  const flip = (isHeads) => {
    const bet = Math.max(1, +q('#bet').value);
    if (state.coins < bet) return flash('Málo coinov!');
    state.coins -= bet;
    let flips = 0;
    const int = setInterval(() => {
      q('#coin').textContent = ++flips % 2 ? '👨‍🦲' : '🪙';
      if (flips > 12) {
        clearInterval(int);
        const result = Math.random() < 0.5;
        q('#coin').textContent = result ? 'COIN' : 'CD';
        q('#res').textContent = result ? 'HLAVA' : 'PÍSMO';
        if (result === isHeads) { state.coins += bet*2; q('#res').innerHTML += '<br><span style="color:#0f0">VÝHRA!</span>'; }
        else q('#res').innerHTML += '<br><span style="color:#f33">PREHRA</span>';
        renderAll();
      }
    }, 110);
  };
  q('#heads').onclick = () => flip(true);
  q('#tails').onclick = () => flip(false);
}

/* ========== GAME OVER + INIT ========== */
function gameOver() {
  gameRunning = false; clearInterval(tickInterval);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:99999;color:#f33;font-size:60px;text-align:center;';
  ov.innerHTML = `<div style="background:#300;padding:60px;border:10px solid #f33;border-radius:30px;">
    GAME OVER<br><button onclick="localStorage.removeItem('pou_konsolidacia_v999');location.reload()" style="margin-top:30px;padding:20px 50px;font-size:30px;background:#900;border:none;border-radius:20px;cursor:pointer;">Nová hra</button>
  </div>`;
  document.body.appendChild(ov);
}

function startTick() {
  clearInterval(tickInterval);
  const missed = Math.min(Math.floor((Date.now() - state.lastTick) / TICK_MS), 12);
  for (let i = 0; i < missed; i++) applyTick();
  tickInterval = setInterval(applyTick, TICK_MS);
}

document.querySelectorAll('.rooms button').forEach(b => b.onclick = () => { state.currentRoom = b.dataset.room; renderAll(); });
q('#pou-img').onclick = () => { state.currentRoom = null; renderAll(); };
q('#saveBtn').onclick = () => { saveState(); flash('Uložené'); };
q('#resetBtn').onclick = () => confirm('Reset?') && (localStorage.removeItem(STORAGE_KEY), location.reload());

window.onload = () => {
  renderAll();
  startTick();
  if (!state.eventKonsolidacia) setTimeout(() => { state.eventKonsolidacia = true; flash('KONSOLIDÁCIA ZAČALA!', 10000); renderAll(); }, 8*60*1000);
  window.addEventListener('beforeunload', saveState);
};
