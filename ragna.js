/* ============================ RAGNA.JS — POU ULTIMATE (JEŽIŠ + CASINO + KONSOLIDÁCIA) ============================ */
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

const STORAGE_KEY = 'pou_jezis_final_v666';
const DEFAULT = {
  hunger: 70, health: 100, sleep: 60, fun: 75, faith: 20, toilet: 15,
  coins: 100, foodStock: 7, currentRoom: null, lastTick: Date.now(),
  eventKonsolidacia: false, blackMarketUnlocked: false, hasGana: false,
  jesusWarned: false, jesus1v1Done: false
};

let state = Object.assign({}, DEFAULT, loadState());
let gameRunning = true;
let tickInterval = null;

/* ========== UTIL ========== */
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v, a = 0, b = 100) { return Math.max(a, Math.min(b, v)); }
function fmtCoins(n) { return ` ${n}¢`; }

function loadState() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch (e) { console.warn(e); }
  return {};
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* ========== FLASH & ALERT ========== */
function flash(text, time = 4000) {
  let f = q('#flash');
  if (!f) {
    f = document.createElement('div');
    f.id = 'flash';
    f.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:16px 28px;background:#000c;color:#f33;border:3px solid #f33;border-radius:20px;z-index:99999;font-weight:bold;opacity:0;transition:all .5s;';
    document.body.appendChild(f);
  }
  f.innerHTML = text;
  f.style.opacity = '1';
  clearTimeout(f.to);
  f.to = setTimeout(() => f.style.opacity = '0', time);
}

function showAlert(title, message) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:100000;color:white;font-size:24px;text-align:center;padding:20px;';
  div.innerHTML = `<div style="background:#000;padding:40px;border:5px solid #f00;border-radius:20px;max-width:90%;"><h2>${title}</h2><p>${message}</p><button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:15px 30px;font-size:20px;">OK</button></div>`;
  document.body.appendChild(div);
}

/* ========== KONSOLIDÁCIA ========== */
function startKonsolidacia() {
  if (state.eventKonsolidacia) return;
  state.eventKonsolidacia = true;
  showAlert('KONSOLIDÁCIA ZAČÍNA!', 'Všetky ceny zdraželi o 75%!<br>Zbohatni alebo zomri...');
  flash('KONSOLIDÁCIA AKTÍVNA! Ceny +75%', 10000);
  renderAll();
}
function getPrice(base) { return state.eventKonsolidacia ? Math.ceil(base * 1.75) : base; }

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
    if (confirm('Si pripravený?\n\n[OK] = ZABIŤ SA\n[Cancel] = ŽIŤ ĎALEJ S GANOU')) {
      flash('Pou sa zastrelil. Koniec.', 10000);
      state.health = 0;
      renderAll();
    } else {
      flash('Pou sa rozhodol žiť ďalej... zatiaľ', 5000);
      renderAll();
    }
  }, 1000);
}

/* ========== RENDER ========== */
function renderAll() {
  q('#hunger').value = state.hunger; q('#hunger-val').textContent = Math.round(state.hunger) + '%';
  q('#health').value = state.health; q('#health-val').textContent = Math.round(state.health) + '%';
  q('#sleep').value = state.sleep; q('#sleep-val').textContent = Math.round(state.sleep) + '%';
  q('#fun').value = state.fun; q('#fun-val').textContent = Math.round(state.fun) + '%';
  q('#toilet').value = state.toilet; q('#toilet-val').textContent = Math.round(state.toilet) + '%';
  q('#faith').value = Math.min(state.faith, 100);
  q('#faith-val').textContent = state.faith + '%';
  q('#coins').textContent = fmtCoins(state.coins);

  // Jedlo
  let foodEl = q('#foodInfo');
  if (!foodEl) {
    foodEl = document.createElement('div');
    foodEl.id = 'foodInfo';
    q('#coins').parentNode.appendChild(foodEl);
  }
  foodEl.innerHTML = `Jedlo: ${state.foodStock} porcií` + (state.eventKonsolidacia ? ' (KONSOLIDÁCIA!)' : '');

  // Event banner
  if (state.eventKonsolidacia) {
    let ev = q('#eventBanner');
    if (!ev) {
      ev = document.createElement('div');
      ev.id = 'eventBanner';
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
    Sloty
    Stávka: ¢
    Točiť!
    <div id="slotRes" style="font-size:40px;margin:20px;"></div>
  `);
  q('#slotSpin').onclick = () => {
    const bet = Math.max(1, +q('#slotBet').value);
    if (state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const symbols = [
      {name:'Cherry', img:'https://cdn-icons-png.flaticon.com/512/3078/3078241.png'},
      {name:'Lemon', img:'https://cdn-icons-png.flaticon.com/512/3078/3078240.png'},
      {name:'Bell', img:'https://cdn-icons-png.flaticon.com/512/3078/3078239.png'},
      {name:'Star', img:'https://cdn-icons-png.flaticon.com/512/3078/3078238.png'},
      {name:'Diamond', img:'https://cdn-icons-png.flaticon.com/512/3078/3078237.png'}
    ];
    const a = symbols[Math.floor(Math.random()*symbols.length)];
    const b = symbols[Math.floor(Math.random()*symbols.length)];
    const c = symbols[Math.floor(Math.random()*symbols.length)];
    q('#slotRes').innerHTML = `<img src="${a.img}" width=60> <img src="${b.img}" width=60> <img src="${c.img}" width=60>`;
    let win = 0;
    if (a.name===b.name && b.name===c.name) { win = bet*20; flash(`JACKPOT! +${win}¢`); }
    else if (a.name===b.name || b.name===c.name || a.name===c.name) { win = bet*4; flash(`Výhra +${win}¢!`); }
    if (win>0) state.coins += win;
    renderAll();
  };
}

function openRoulette() {
  showModal(`
    Ruleta
    Stávka: ¢
    Červená/Čierna/Číslo:
    Točiť koleso!
    <div id="rouletteRes" style="margin-top:15px;font-size:18px;"></div>
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
    q('#rouletteRes').innerHTML = `Padlo: ${roll} (${color})<br>`;
    if (win>0) { state.coins += win; q('#rouletteRes').innerHTML += `VÝHRA +${win}¢!`; }
    else q('#rouletteRes').innerHTML += 'Prehra';
    renderAll();
  };
}

function openBlackjack() {
  showModal(`
    Blackjack
    Stávka: ¢
    Začať hru
    <div id="bjResult" style="margin:15px 0;min-height:100px;font-size:18px;"></div>
    <div id="bjControls"></div>
  `);
  let playerHand = [], dealerHand = [], deck = [];
  function createDeck() {
    const suits = ['Hearts','Diamonds','Clubs','Spades']; const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    deck = [];
    for (let s of suits) for (let v of values) deck.push({suit:s,value:v});
    deck.sort(()=>Math.random()-0.5);
  }
  function handValue(hand){
    let val=0, aces=0;
    for(let c of hand){
      if(c.value==='A'){aces++;val+=11;}
      else if(['J','Q','K'].includes(c.value)) val+=10;
      else val+=parseInt(c.value);
    }
    while(val>21 && aces--) val-=10;
    return val;
  }
  q('#bjStart').onclick = () => {
    const bet = Math.max(1, +q('#bjBet').value);
    if(state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet; createDeck();
    playerHand = [deck.pop(),deck.pop()]; dealerHand = [deck.pop(),deck.pop()];
    q('#bjResult').innerHTML = `Tvoja ruka: ${playerHand.map(c=>c.value+c.suit[0]).join(' ')} (=${handValue(playerHand)})<br>Dealer: ${dealerHand[0].value}${dealerHand[0].suit[0]} ?`;
    const controls = q('#bjControls'); controls.innerHTML='';
    const hit=document.createElement('button'); hit.textContent='Hit'; hit.onclick=()=>{
      playerHand.push(deck.pop());
      const val=handValue(playerHand);
      q('#bjResult').innerHTML = `Tvoja ruka: ${playerHand.map(c=>c.value+c.suit[0]).join(' ')} (=${val})<br>Dealer: ?`;
      if(val>21){ q('#bjResult').innerHTML += '<br>Bust! Prehral si.'; controls.innerHTML=''; renderAll(); }
    };
    const stand=document.createElement('button'); stand.textContent='Stand'; stand.onclick=()=>{
      while(handValue(dealerHand)<17) dealerHand.push(deck.pop());
      const dVal=handValue(dealerHand), pVal=handValue(playerHand);
      let res = `Tvoja ruka: ${playerHand.map(c=>c.value+c.suit[0]).join(' ')} (=${pVal})<br>Dealer: ${dealerHand.map(c=>c.value+c.suit[0]).join(' ')} (=${dVal})<br>`;
      if(pVal>21) res += 'Prehral si.';
      else if(dVal>21 || pVal>dVal){ state.coins += bet*2; res += `Vyhral si ${bet*2}¢!`; }
      else if(pVal===dVal){ state.coins += bet; res += 'Remíza.'; }
      else res += 'Prehral si.';
      q('#bjResult').innerHTML = res; controls.innerHTML=''; renderAll();
    };
    controls.append(hit,stand);
  };
}

function openCoinFlip() {
  showModal(`
    Hod mincou
    Stávka: ¢
    <button id="headsBtn">Hlava</button>
    <button id="tailsBtn">Písmo</button>
    <div id="coinRes" style="margin-top:20px;font-size:30px;"></div>
  `);
  q('#headsBtn').onclick = () => coinFlip(true);
  q('#tailsBtn').onclick = () => coinFlip(false);
  function coinFlip(guess){
    const bet = Math.max(1, +q('#coinBet').value);
    if(state.coins < bet) return flash('Málo peňazí!');
    state.coins -= bet;
    const result = Math.random() < 0.5;
    q('#coinRes').innerHTML = result ? 'Hlava' : 'Písmo';
    if(result === guess){
      state.coins += bet*2;
      q('#coinRes').innerHTML += '<br>VÝHRA!';
    } else q('#coinRes').innerHTML += '<br>Prehra';
    renderAll();
  }
}

function showModal(html) {
  const modal = q('#modal');
  modal.classList.remove('hidden');
  q('#modal-content').innerHTML = html + '<br><button id="closeModal" style="margin-top:20px;padding:10px 20px;">✕</button>';
  q('#closeModal').onclick = () => modal.classList.add('hidden');
  modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
}

/* ========== MODLITBA – ŠIALENÁ VIERA S JEŽIŠOM ========== */
function prayerAction() {
  state.faith += 10;

  if (state.faith > 500) {
    state.health = clamp(state.health - 6);
    flash('Prílišná viera ti ničí telo… −6% zdravie!', 4000);
  }

  if (state.faith >= 850 && !state.jesusWarned) {
    state.jesusWarned = true;
    showAlert('JEŽIŠ SA ZJAVIL', '„bratku uz le trochu pome a budes tam“<br><br>Odteraz modlitba dáva len +10% viery a −10% zdravie!');
  }

  if (state.jesusWarned) {
    state.health = clamp(state.health - 10);
    flash('+10% viera | −10% zdravie… bolí to', 4000);
  } else {
    flash('Amen +10% viera', 2000);
  }

  renderAll();

  // RUSKÁ RULETA S JEŽIŠOM
  if (state.faith > 1000 && !state.jesus1v1Done) {
    state.jesus1v1Done = true;
    clearInterval(tickInterval);
    showAlert('RUSKÁ RULETA 1v1', '„Bratku moj ty a ja 1V1 pekne ako v rusku“<br><br>Klikni OK a modli sa...');
    setTimeout(() => {
      if (Math.random() < 1/6) {
        // VYHRAL SI
        Object.assign(state, {hunger:999,sleep:999,fun:999,faith:9999,health:999,toilet:0,coins:999999,foodStock:999});
        flash('PREŽIL SI! SI NOVÝ JEŽIŠ!', 30000);
        showAlert('SI BOH', 'Všetko na maximum. Si nesmrteľný, ty svätý šialenec.');
      } else {
        state.health = 0;
        showAlert('DO PEKLA', 'Ježiš ťa poslal do pekla.<br>Prehnaná viera = smrť.');
      }
      tickInterval = setInterval(applyTick, TICK_MS);
      renderAll();
    }, 1500);
  }
}

/* ========== BUILD ACTIONS ========== */
function buildRoomActions() {
  const actions = q('#actions');
  actions.innerHTML = '';
  if (!state.currentRoom) {
    actions.innerHTML = '<h3>Vyber miestnosť</h3>';
    return;
  }

  const btn = (icon, text, onclick, price = null) => {
    const b = document.createElement('button');
    b.innerHTML = `${icon} ${text}` + (price !== null ? ` (${getPrice(price)}¢)` : '');
    b.style.cssText = 'padding:16px;margin:8px;font-size:18px;border-radius:16px;';
    b.onclick = onclick;
    actions.appendChild(b);
  };

  // KUCHYŇA
  if (state.currentRoom === 'kuchyna') {
    actions.innerHTML += `<p>Zásoba: ${state.foodStock}</p>`;
    btn('Burger', 'Jesť (1 porcia)', () => {
      if (state.foodStock <= 0) return flash('Došlo jedlo!');
      state.foodStock--;
      state.hunger = clamp(state.hunger + 55);
      state.health = clamp(state.health + 12);
      state.toilet = clamp(state.toilet + 20);
      flash('Mňam mňam!');
      renderAll();
    });
    btn('Cart', 'Kúpiť 5× jedlo', () => {
      const cena = getPrice(22);
      if (state.coins >= cena) {
        state.coins -= cena;
        state.foodStock += 5;
        flash('Kúpil si jedlo!');
        renderAll();
      } else flash('Nemáš dosť peňazí!');
    }, 22);
  }

  // MARKET + BLACK MARKET
  if (state.currentRoom === 'market') {
    btn('Bag', 'Malá zásoba +8', () => { const c = getPrice(18); if (state.coins >= c) { state.coins -= c; state.foodStock += 8; renderAll(); } }, 18);
    btn('Box', 'Stredná +20', () => { const c = getPrice(45); if (state.coins >= c) { state.coins -= c; state.foodStock += 20; renderAll(); } }, 45);
    btn('Store', 'Veľká +50', () => { const c = getPrice(100); if (state.coins >= c) { state.coins -= c; state.foodStock += 50; renderAll(); } }, 100);
    if (state.blackMarketUnlocked) {
      actions.innerHTML += '<br><br> TEMNÝ KÚT <br>';
      if (!state.hasGana) btn('Gun', 'Kúpiť ganu', buyGana);
      else btn('Skull', 'Použiť ganu (koniec)', () => { if (confirm('Naozaj?')) { state.health = 0; renderAll(); } });
    }
  }

  // CASINO
  if (state.currentRoom === 'casino') {
    btn('Slots', 'Sloty', openSlots);
    btn('Roulette', 'Ruleta', openRoulette);
    btn('Coin', 'Hod mincou', openCoinFlip);
    btn('Cards', 'Blackjack', openBlackjack);
  }

  // KOSTOL – NOVÁ VIERA
  if (state.currentRoom === 'church') {
    btn('Cross', 'Modlitba', prayerAction);
  }

  // OSTATNÉ IZBY
  const simple = {
    kupelna: ['Shower', 'Sprcha', () => { const c = getPrice(5); if (state.coins >= c) { state.coins -= c; state.health = clamp(state.health + 40); flash('Čistý!'); renderAll(); } }, 5],
    spalna: ['Sleeping', 'Spať', () => { state.sleep = clamp(state.sleep + 80); state.health = clamp(state.health + 20); flash('Vyspatý'); renderAll(); }],
    wc: ['Toilet', 'WC', () => { state.toilet = 0; state.health = clamp(state.health + 15); flash('Úľava'); renderAll(); }],
    praca: ['Briefcase', 'Pracovať', () => { const earn = 20 + Math.floor(Math.random()*40); state.coins += earn; state.fun = clamp(state.fun - 15); flash(`+${earn}¢ z roboty`); renderAll(); }],
    hracia: ['Gamepad', 'Hrať sa', () => { state.fun = clamp(state.fun + 60); state.hunger = clamp(state.hunger - 10); flash('Zábava!'); renderAll(); }]
  };
  if (simple[state.currentRoom]) {
    const [icon, text, fn, price] = simple[state.currentRoom];
    btn(icon, text, fn, price || null);
  }

  // Domov
  btn('Home', 'Domov', () => { state.currentRoom = null; renderAll(); }).style.marginTop = '30px';
}

/* ========== GAME OVER ========== */
function gameOver() {
  if (!gameRunning) return;
  gameRunning = false;
  clearInterval(tickInterval);
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:99999;color:#f33;font-size:60px;text-align:center;';
  ov.innerHTML = `
    GAME OVER<br>
    <button onclick="localStorage.removeItem('${STORAGE_KEY}');location.reload()" style="font-size:30px;padding:20px;margin-top:30px;">Nová hra</button>
  `;
  document.body.appendChild(ov);
}

/* ========== TICK ========== */
function applyTick() {
  if (!gameRunning) return;
  state.hunger = clamp(state.hunger - DEC.hunger);
  state.fun = clamp(state.fun - DEC.fun);
  state.sleep = clamp(state.sleep - DEC.sleep);
  state.faith = clamp(state.faith - DEC.faith, 0, 999999);
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

/* ========== INIT ========== */
qa('.rooms button').forEach(b => b.onclick = () => { state.currentRoom = b.dataset.room; renderAll(); });
q('#pou-img')?.addEventListener('click', () => { state.currentRoom = null; renderAll(); });
q('#saveBtn').onclick = () => { saveState(); flash('Uložené'); };
q('#resetBtn').onclick = () => { if(confirm('Reset?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); }};

function init() {
  renderAll();
  startTick();
  setTimeout(startKonsolidacia, 8 * 60 * 1000);
  window.addEventListener('beforeunload', saveState);
}
init();