/* ============================
   RAGNA.JS — Pou Ultimate (FINÁLNA VERZIA 2025 – všetko opravené)
   ============================ */

const TICK_MS = 120000; // 2 minúty na tick
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
  eventKonsolidacia: false,
  blackMarketUnlocked: false,
  hasGana: false
};

let state = Object.assign({}, DEFAULT, loadState());
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return ` ${n}¢`; }

/* ========== BEZPEČNÉ NAČÍTANIE SAVE-U ========== */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};

    const data = JSON.parse(saved);

    // Ak je Pou mŕtvy alebo bol offline viac ako 24h → reset
    if (data.health <= 0) {
      console.log("Pou bol mŕtvy → nová hra");
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    const offlineHours = (Date.now() - data.lastTick) / (1000 * 60 * 60);
    if (offlineHours > 24) {
      console.log("Príliš dlho offline → nová hra");
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return data;
  } catch (e) {
    console.warn("Chyba v save → reset", e);
    localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ========== FLASH & ALERT ========== */
function flash(text, time = 4000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div'); f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:16px 28px;background:#000c;color:#f33;border:3px solid #f33;border-radius:20px;z-index:99999;font-weight:bold;opacity:0;transition:all .5s;';
    document.body.appendChild(f);
  }
  f.innerHTML = text; f.style.opacity = '1';
  clearTimeout(f.to);
  f.to = setTimeout(() => f.style.opacity = '0', time);
}

function showAlert(title, message) {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100000;color:white;font-family:sans-serif;text-align:center;';
  alertDiv.innerHTML = `
    <div style="background:#f33;padding:40px;border-radius:20px;max-width:400px;">
      <h2 style="margin:0;font-size:48px;">${title}</h2>
      <p style="font-size:24px;margin:20px 0;">${message}</p>
      <button onclick="this.parentElement.parentElement.remove()" style="padding:12px 30px;font-size:20px;background:#900;border:none;border-radius:10px;color:white;cursor:pointer;">OK</button>
    </div>
  `;
  document.body.appendChild(alertDiv);
}

/* ========== EVENT KONSOLIDÁCIA ========== */
function startKonsolidacia() {
  if (state.eventKonsolidacia) return;
  state.eventKonsolidacia = true;
  showAlert('KONSOLIDÁCIA ZAČÍNA!', 'Všetky ceny zdraželi o 75%!<br>Zbohatni alebo zomri...');
  flash('KONSOLIDÁCIA AKTÍVNA! Ceny +75%', 10000);
  renderAll();
}

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
  state.eventKonsolidacia = false;
  if (q('#eventBanner')) q('#eventBanner').remove();
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
  q('#hunger').value = state.hunger; q('#hunger-val').textContent = Math.round(state.hunger) + '%';
  q('#health').value = state.health; q('#health-val').textContent = Math.round(state.health) + '%';
  q('#sleep').value = state.sleep; q('#sleep-val').textContent = Math.round(state.sleep) + '%';
  q('#fun').value = state.fun; q('#fun-val').textContent = Math.round(state.fun) + '%';
  q('#faith').value = state.faith; q('#faith-val').textContent = Math.round(state.faith) + '%';
  q('#toilet').value = state.toilet; q('#toilet-val').textContent = Math.round(state.toilet) + '%';
  q('#coins').textContent = fmtCoins(state.coins);

  let foodEl = q('#foodInfo');
  if (!foodEl) {
    foodEl = document.createElement('div'); foodEl.id = 'foodInfo';
    q('#coins').parentNode.appendChild(foodEl);
  }
  foodEl.innerHTML = `Jedlo: ${state.foodStock} porcií` + (state.eventKonsolidacia ? ' <span style="color:#f33">(KONSOLIDÁCIA!)</span>' : '');

  if (state.eventKonsolidacia) {
    let ev = q('#eventBanner');
    if (!ev) {
      ev = document.createElement('div'); ev.id = 'eventBanner';
      ev.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#800;color:#fff;padding:10px 30px;border-radius:50px;font-weight:bold;z-index:9998;';
      ev.textContent = 'KONSOLIDÁCIA – ceny +75%!';
      document.body.appendChild(ev);
    }
  } else if (q('#eventBanner')) q('#eventBanner').remove();

  q('#room-title').textContent = state.currentRoom ? state.currentRoom.charAt(0).toUpperCase() + state.currentRoom.slice(1) : 'Domov';
  q('#room-img').src = state.currentRoom ? (ROOM_ASSETS[state.currentRoom] || ROOM_ASSETS.defaultRoom) : ROOM_ASSETS.defaultRoom;

  buildRoomActions();
  tryUnlockBlackMarket();
  saveState();
  if (state.health <= 0) setTimeout(gameOver, 1000);
}

/* ========== CASINO MINIGAMES ========== */
function openSlots() {
  showModal(`
    <h3>Sloty</h3>
    <img src="https://cdn-icons-png.flaticon.com/512/3078/3078241.png" style="width:200px;margin:10px auto;display:block;">
    <p>Stávka: <input id="slotBet" type="number" min="1" value="15" style="width:80px">¢</p>
    <button id="slotSpin" style="padding:12px 30px;font-size:18px;background:#900;color:white;border:none;border-radius:10px;">Točiť!</button>
    <div id="slotRes" style="margin-top:20px;font-size:40px;letter-spacing:10px;text-align:center;"></div>
  `);
  q('#slotSpin').onclick = () => {
    const bet = Math.max(1, +q('#slotBet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const symbols = ['Cherry', 'Lemon', 'Bell', 'Star', 'Diamond'];
    const a = symbols[Math.floor(Math.random()*5)];
    const b = symbols[Math.floor(Math.random()*5)];
    const c = symbols[Math.floor(Math.random()*5)];
    q('#slotRes').textContent = `${a} ${b} ${c}`;
    let win = 0;
    if (a===b && b===c) { win = bet*20; flash(`JACKPOT! +${win}¢`); }
    else if (a===b || b===c || a===c) { win = bet*4; flash(`Výhra +${win}¢!`); }
    if (win > 0) state.coins += win;
    renderAll();
  };
}

function openRoulette() {
  showModal(`
    <h3>Ruleta</h3>
    <img src="https://www.rawpixel.com/image/12610167/png-casino-roulette-wheel-gambling-casino-game-generated-image-rawpixel.png" style="width:250px;margin:10px auto;display:block;border-radius:50%;">
    <p>Stávka: <input id="rouletteBet" type="number" min="1" value="20" style="width:80px">¢</p>
    <input id="rouletteChoice" placeholder="číslo 0-36 alebo red/black" style="width:220px;padding:8px;margin:5px;"><br><br>
    <button id="rouletteSpin" style="padding:12px 40px;font-size:20px;background:#900;color:white;border:none;border-radius:10px;">Točiť koleso!</button>
    <div id="rouletteRes" style="margin-top:20px;font-size:24px;text-align:center;"></div>
  `);
  q('#rouletteSpin').onclick = () => {
    const bet = Math.max(1, +q('#rouletteBet').value);
    if (state.coins < bet) return flash('Nedostatok mincí!');
    state.coins -= bet;
    const roll = Math.floor(Math.random()*37);
    const color = roll===0 ? 'zelená' : (roll%2===0 ? 'čierna' : 'červená');
    const choice = q('#rouletteChoice').value.trim().toLowerCase();
    let win = 0;
    if (!isNaN(choice) && +choice === roll) win = bet*35;
    else if (choice==='red' && color==='červená') win = bet*2;
    else if (choice==='black' && color==='čierna') win = bet*2;
    q('#rouletteRes').innerHTML = `Padlo: <strong>${roll} (${color})</strong><br>`;
    if (win>0) { state.coins += win; q('#rouletteRes').innerHTML += `<span style="color:#90ee90">VÝHRA +${win}¢!</span>`; }
    else q('#rouletteRes').innerHTML += '<span style="color:#ff4444">Prehra</span>';
    renderAll();
  };
}

function openBlackjack() {
  showModal(`
    <h3>Blackjack</h3>
    <img src="https://img.freepik.com/free-vector/playing-cards_1284-1537.jpg" style="width:200px;margin:10px auto;display:block;">
    <p>Stávka: <input id="bjBet" type="number" min="1" value="25" style="width:80px">¢</p>
    <button id="bjStart" style="padding:12px 30px;font-size:18px;background:#900;color:white;border:none;border-radius:10px;">Začať hru</button>
    <div id="bjResult" style="margin-top:20px;"></div>
    <div id="bjControls" style="margin-top:10px;"></div>
  `);
  let playerHand = [], dealerHand = [], deck = [];
  function createDeck() {
    const suits = ['♥','♦','♣','♠'];
    const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    deck = [];
    for (let s of suits) for (let v of values) {
      deck.push({suit:s,value:v,img:`https://deckofcards.apiwick.com/cards/${v}${s === '♥'?'h':s==='♦'?'d':s==='♣'?'c':'s'}.png`});
    }
    deck.sort(() => Math.random() - 0.5);
  }
  function handValue(h) {
    let val = 0, aces = 0;
    for (let c of h) { if (c.value==='A') {aces++; val+=11;} else if (['J','Q','K'].includes(c.value)) val+=10; else val+=parseInt(c.value); }
    while (val > 21 && aces--) val -= 10;
    return val;
  }
  q('#bjStart').onclick = () => {
    const bet = Math.max(1, +q('#bjBet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    createDeck();
    playerHand = [deck.pop(), deck.pop()];
    dealerHand = [deck.pop(), deck.pop()];
    q('#bjResult').innerHTML = `Tvoja ruka: ${playerHand.map(c=>`<img src="${c.img}" style="width:60px;height:90px;">`).join('')} (=${handValue(playerHand)})<br>Dealer: <img src="${dealerHand[0].img}" style="width:60px;height:90px;"> ?`;
    const controls = q('#bjControls'); controls.innerHTML = '';
    const hit = Object.assign(document.createElement('button'), {textContent:'Hit', style:'padding:10px 20px;margin:5px;background:#090;color:white;border:none;border-radius:5px;'});
    const stand = Object.assign(document.createElement('button'), {textContent:'Stand', style:'padding:10px 20px;margin:5px;background:#900;color:white;border:none;border-radius:5px;'});
    controls.append(hit, stand);
    hit.onclick = () => {
      playerHand.push(deck.pop());
      const val = handValue(playerHand);
      q('#bjResult').innerHTML = `Tvoja ruka: ${playerHand.map(c=>`<img src="${c.img}" style="width:60px;height:90px;">`).join('')} (=${val})<br>Dealer: <img src="${dealerHand[0].img}" style="width:60px;height:90px;"> ?`;
      if (val > 21) { q('#bjResult').innerHTML += '<br><span style="color:#f33">Bust!</span>'; controls.innerHTML = ''; renderAll(); }
    };
    stand.onclick = () => {
      while (handValue(dealerHand) < 17) dealerHand.push(deck.pop());
      const p = handValue(playerHand), d = handValue(dealerHand);
      let res = `Tvoja: ${playerHand.map(c=>`<img src="${c.img}" style="width:60px;height:90px;">`).join('')} (=${p})<br>Dealer: ${dealerHand.map(c=>`<img src="${c.img}" style="width:60px;height:90px;">`).join('')} (=${d})<br>`;
      let win = 0;
      if (p > 21) res += 'Prehral si.';
      else if (d > 21 || p > d) { win = bet*2; state.coins += win; res += `Vyhral si ${win}¢!`; }
      else if (p === d) { state.coins += bet; res += 'Remíza.'; }
      else res += 'Prehral si.';
      q('#bjResult').innerHTML = res; controls.innerHTML = ''; renderAll();
    };
  };
}

function openCoinFlip() {
  showModal(`
    <h3>Hod mincou</h3>
    <img src="https://www.pngkey.com/png/full/2-24947_coin-toss-heads-or-tails-coin-flip-png.png" style="width:150px;margin:10px auto;display:block;">
    <p>Stávka: <input id="coinBet" type="number" min="1" value="30" style="width:80px">¢</p>
    <button id="headsBtn" style="padding:15px 40px;font-size:22px;margin:8px;background:#900;color:white;border:none;border-radius:10px;">Hlava</button>
    <button id="tailsBtn" style="padding:15px 40px;font-size:22px;margin:8px;background:#900;color:white;border:none;border-radius:10px;">Písmo</button>
    <div id="coinRes" style="margin-top:20px;font-size:50px;text-align:center;"></div>
  `);
  q('#headsBtn').onclick = () => coinFlip(true);
  q('#tailsBtn').onclick = () => coinFlip(false);
  function coinFlip(guess) {
    const bet = Math.max(1, +q('#coinBet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const result = Math.random() < 0.5;
    const img = result
      ? 'https://www.pngkey.com/png/full/2-24947_coin-toss-heads-or-tails-coin-flip-png.png'
      : 'https://www.pngall.com/wp-content/uploads/2016/04/Coin-Tails-PNG.png';
    q('#coinRes').innerHTML = `<img src="${img}" style="width:100px;height:100px;"><br>${result ? 'Hlava' : 'Písmo'}<br>`;
    if (result === guess) { state.coins += bet*2; q('#coinRes').innerHTML += '<span style="color:#90ee90">VÝHRA!</span>'; }
    else q('#coinRes').innerHTML += '<span style="color:#ff4444">Prehra</span>';
    renderAll();
  }
}

function showModal(html) {
  const modal = q('#modal');
  modal.classList.remove('hidden');
  q('#modal-content').innerHTML = html + '<button id="closeModal" style="position:absolute;top:10px;right:10px;padding:10px;font-size:20px;background:#900;color:white;border:none;border-radius:5px;cursor:pointer;">X</button>';
  q('#closeModal').onclick = () => modal.classList.add('hidden');
  modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
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
  };

  if (state.currentRoom === 'kuchyna') {
    actions.innerHTML += `<div style="margin:12px 0"><strong>Zásoba: ${state.foodStock}</strong></div>`;
    btn('Burger', 'Jesť (1 porcia)', () => {
      if (state.foodStock <= 0) return flash('Došlo jedlo!');
      state.foodStock--; state.hunger = clamp(state.hunger + 55); state.health = clamp(state.health + 12); state.toilet = clamp(state.toilet + 20);
      flash('Mňam mňam!');
      renderAll();
    });
    btn('Shopping Cart', 'Kúpiť 5× jedlo', () => {
      const cena = getPrice(22);
      if (state.coins >= cena) { state.coins -= cena; state.foodStock += 5; flash('Kúpil si jedlo!'); renderAll(); }
      else flash('Nemáš dosť peňazí!');
    }, 22);
  }

  if (state.currentRoom === 'market') {
    btn('Shopping Bags', 'Malá zásoba +8', () => { const c = getPrice(18); if (state.coins >= c) { state.coins -= c; state.foodStock += 8; flash('Kúpil si!'); renderAll(); } }, 18);
    btn('Package', 'Stredná +20', () => { const c = getPrice(45); if (state.coins >= c) { state.coins -= c; state.foodStock += 20; flash('Veľká zásoba!'); renderAll(); } }, 45);
    btn('Shopping Cart', 'Veľká +50', () => { const c = getPrice(100); if (state.coins >= c) { state.coins -= c; state.foodStock += 50; flash('MEGA nákup!'); renderAll(); } }, 100);

    if (state.blackMarketUnlocked) {
      actions.innerHTML += '<hr style="border-color:#f33;"><div style="color:#f33;font-weight:bold;font-size:20px;">Temný kút</div>';
      if (!state.hasGana) {
        btn('Gun', 'Kúpiť ganu', buyGana);
      } else {
        btn('Skull', 'Použiť ganu (koniec)', () => confirm('Naozaj?') && (state.health = 0, renderAll()));
      }
    }
  }

  if (state.currentRoom === 'casino') {
    btn('Slot Machine', 'Sloty', openSlots);
    btn('Roulette', 'Ruleta', openRoulette);
    btn('Coin', 'Hod mincou', openCoinFlip);
    btn('Cards', 'Blackjack', openBlackjack);
  }

  const simple = {
    kupelna: ['Shower', 'Sprcha', () => { const c = getPrice(5); if (state.coins >= c) { state.coins -= c; state.health = clamp(state.health + 40); flash('Čistý!'); renderAll(); } }, 5],
    spalna: ['Sleeping', 'Spať', () => { state.sleep = clamp(state.sleep + 80); state.health = clamp(state.health + 20); flash('Vyspatý'); renderAll(); }],
    wc: ['Toilet', 'WC', () => { state.toilet = 0; state.health = clamp(state.health + 15); flash('Úľava'); renderAll(); }],
    praca: ['Briefcase', 'Pracovať', () => { const earn = 20 + Math.floor(Math.random()*40); state.coins += earn; state.fun = clamp(state.fun - 15); flash(`+${earn}¢ z roboty`); renderAll(); }],
    church: ['Praying Hands', 'Modlitba', () => { state.faith = clamp(state.faith + 50); flash('Amen'); renderAll(); }],
    hracia: ['Game Controller', 'Hrať sa', () => { state.fun = clamp(state.fun + 60); state.hunger = clamp(state.hunger - 10); flash('Zábava!'); renderAll(); }]
  };
  if (simple[state.currentRoom]) {
    const [icon, text, fn, price] = simple[state.currentRoom];
    btn(icon, text, fn, price || null);
  }

  btn('House', 'Domov', () => { state.currentRoom = null; renderAll(); }).style.marginTop = '30px';
}

/* ========== GAME OVER ========== */
function gameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(tickInterval);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:99999;color:#f33;font-size:60px;text-align:center;';
  ov.innerHTML = `<div style="background:#300;padding:60px;border:10px solid #f33;border-radius:30px;">
    GAME OVER<br><button onclick="localStorage.removeItem('pou_konsolidacia_v999');location.reload()" style="margin-top:30px;padding:20px 50px;font-size:30px;background:#900;border:none;border-radius:20px;cursor:pointer;">Nová hra</button>
  </div>`;
  document.body.appendChild(ov);
}

/* ========== BEZPEČNÝ TICK ========== */
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
  const missed = Math.min(Math.floor((Date.now() - state.lastTick) / TICK_MS), 12);
  for (let i = 0; i < missed; i++) applyTick();
  if (missed >= 12) flash('Prežil si dlhú pauzu... ledva!', 8000);
  tickInterval = setInterval(applyTick, TICK_MS);
}

/* ========== INIT ========== */
qa('.rooms button').forEach(b => b.onclick = () => { state.currentRoom = b.dataset.room; renderAll(); });
q('#pou-img').onclick = () => { state.currentRoom = null; renderAll(); };
q('#saveBtn').onclick = () => { saveState(); flash('Uložené'); };
q('#resetBtn').onclick = () => confirm('Reset?') && (localStorage.removeItem(STORAGE_KEY), location.reload());

function init() {
  renderAll();
  startTick();
  if (!state.eventKonsolidacia) {
    setTimeout(startKonsolidacia, 8 * 60 * 1000);
  }
  window.addEventListener('beforeunload', saveState);
}
init();