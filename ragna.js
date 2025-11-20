/* ============================ POU ULTIMATE – JEŽIŠ + CASINO (100% FUNGUJE) ============================ */
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

const STORAGE_KEY = 'pou_jezis_final_v999';
const DEFAULT = {
  hunger:70, health:100, sleep:60, fun:75, faith:20, toilet:15,
  coins:100, foodStock:7, currentRoom:null, lastTick:Date.now(),
  eventKonsolidacia:false, blackMarketUnlocked:false, hasGana:false,
  jesusWarned:false, jesus1v1Done:false
};

let state = Object.assign({}, DEFAULT);
try { Object.assign(state, JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')); } catch(e){}

let gameRunning = true, tickInterval = null;

const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));
function clamp(v,a=0,b100){return Math.max(a,Math.min(b,v));}
function fmtCoins(n){return `${n}¢`;}

/* ========== FLASH & ALERT ========== */
function flash(text,time=4000){
  let f = q('#flash') || (()=>{const x=document.createElement('div');x.id='flash';x.style.cssText='position:fixed;bottom:20px;right:20px;padding:16px 28px;background:#000c;color:#f33;border:3px solid #f33;border-radius:20px;z-index:99999;font-weight:bold;opacity:0;transition:.5s;';document.body.appendChild(x);return x;})();
  f.innerHTML=text; f.style.opacity=1; clearTimeout(f.to); f.to=setTimeout(()=>f.style.opacity=0,time);
}
function showAlert(title,msg){
  const d=document.createElement('div');
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;font-size:24px;padding:20px;';
  d.innerHTML=`<div style="background:#000;padding:40px;border:5px solid #f00;border-radius:20px;max-width:90%"><h2>${title}</h2><p>${msg}</p><button onclick="this.closest('div').parentElement.remove()" style="margin-top:20px;padding:15px 30px;font-size:20px;">OK</button></div>`;
  document.body.appendChild(d);
}

/* ========== KONSOLIDÁCIA + GANA ========== */
function startKonsolidacia(){if(state.eventKonsolidacia)return;state.eventKonsolidacia=true;showAlert('KONSOLIDÁCIA!','Ceny +75%');flash('KONSOLIDÁCIA!',10000);renderAll();}
function getPrice(b){return state.eventKonsolidacia?Math.ceil(b*1.75):b;}
function tryUnlockBlackMarket(){if(state.coins>=10000&&!state.blackMarketUnlocked){state.blackMarketUnlocked=true;flash('BLACK MARKET ODOMKNUTÝ!',7000);}}
function buyGana(){if(state.coins<9999)return flash('Chýba 1¢');state.coins-=9999;state.hasGana=true;state.eventKonsolidacia=false;q('#eventBanner')?.remove();flash('KÚPIL SI GANU',8000);setTimeout(()=>{if(confirm('OK = zastreliť sa\nCancel = žiť')){state.health=0;renderAll();}},1000);}

/* ========== RENDER ========== */
function renderAll(){
  q('#hunger').value=state.hunger; q('#hunger-val').textContent=Math.round(state.hunger)+'%';
  q('#health').value=state.health; q('#health-val').textContent=Math.round(state.health)+'%';
  q('#sleep').value=state.sleep; q('#sleep-val').textContent=Math.round(state.sleep)+'%';
  q('#fun').value=state.fun; q('#fun-val').textContent=Math.round(state.fun)+'%';
  q('#toilet').value=state.toilet; q('#toilet-val').textContent=Math.round(state.toilet)+'%';
  q('#faith').value=Math.min(state.faith,100);
  q('#faith-val').textContent=state.faith+'%';
  q('#coins').textContent=fmtCoins(state.coins);
  let f=q('#foodInfo')||document.createElement('div');if(!f.id){f.id='foodInfo';q('#coins').after(f);}
  f.innerHTML=`Jedlo: ${state.foodStock} porcií`+(state.eventKonsolidacia?' (KONSOLIDÁCIA!)':'');
  if(state.eventKonsolidacia){if(!q('#eventBanner')){const b=document.createElement('div');b.id='eventBanner';b.style.cssText='position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#800;color:#fff;padding:10px 30px;border-radius:50px;font-weight:bold;z-index:9998;';b.textContent='KONSOLIDÁCIA +75%';document.body.appendChild(b);}}else q('#eventBanner')?.remove();
  q('#room-title').textContent=state.currentRoom?state.currentRoom.charAt(0).toUpperCase()+state.currentRoom.slice(1):'Domov';
  q('#room-img').src=ROOM_ASSETS[state.currentRoom]||ROOM_ASSETS.defaultRoom;
  buildRoomActions(); tryUnlockBlackMarket(); localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(state.health<=0) setTimeout(gameOver,1000);
}

/* ========== CASINO – VŠETKO OPRAVENÉ ========== */
function openSlots(){
  showModal(`
    <h2>Sloty</h2>
    Stávka: <input type="number" id="slotBet" value="10" min="1" style="width:80px">
    <button id="slotSpin">Točiť!</button>
    <div id="slotRes" style="font-size:60px;margin:30px;"></div>
  `);
  q('#slotSpin').onclick=()=>{
    const bet=Math.max(1,+q('#slotBet').value);
    if(state.coins<bet)return flash('Málo peňazí!');
    state.coins-=bet;
    const s=['Cherry','Lemon','Bell','Star','Diamond'];
    const a=s[Math.floor(Math.random()*5)], b=s[Math.floor(Math.random()*5)], c=s[Math.floor(Math.random()*5)];
    q('#slotRes').innerHTML = `${a} ${b} ${c}`;
    if(a===b&&b===c){state.coins+=bet*20;flash(`JACKPOT! +${bet*20}¢`);}
    else if(a===b||b===c||a===c){state.coins+=bet*4;flash(`Výhra +${bet*4}¢`);}
    renderAll();
  };
}

function openRoulette(){
  showModal(`
    <h2>Ruleta</h2>
    Stávka: <input type="number" id="rouletteBet" value="10" min="1" style="width:80px"><br><br>
    Na čo tipuješ? <input type="text" id="rouletteChoice" placeholder="red / black / číslo 0-36" style="width:200px"><br><br>
    <button id="rouletteSpin">Točiť koleso!</button>
    <div id="rouletteRes" style="margin-top:20px;font-size:20px;"></div>
  `);
  q('#rouletteSpin').onclick=()=>{
    const bet=Math.max(1,+q('#rouletteBet').value);
    if(state.coins<bet)return flash('Málo peňazí!');
    state.coins-=bet;
    const roll=Math.floor(Math.random()*37);
    const color=roll===0?'zelená':(roll%2===0?'čierna':'červená');
    const tip=q('#rouletteChoice').value.trim().toLowerCase();
    let win=0;
    if(tip==roll) win=bet*35;
    else if(tip==='red'&&color==='červená') win=bet*2;
    else if(tip==='black'&&color==='čierna') win=bet*2;
    q('#rouletteRes').innerHTML=`Padlo: <b>${roll} (${color})</b><br>`;
    if(win>0){state.coins+=win;q('#rouletteRes').innerHTML+=`VÝHRA +${win}¢!`;}else q('#rouletteRes').innerHTML+='Prehra';
    renderAll();
  };
}

function openBlackjack(){
  showModal(`
    <h2>Blackjack</h2>
    Stávka: <input type="number" id="bjBet" value="20" min="1" style="width:80px">
    <button id="bjStart">Začať hru</button>
    <div id="bjResult" style="margin:20px 0;min-height:80px;font-size:18px;"></div>
    <div id="bjControls"></div>
  `);
  let player=[], dealer=[], deck=[];
  const createDeck=()=>{const s=['H','D','C','S'],v=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];deck=[];for(let x of s)for(y of v)deck.push(y+x);deck.sort(()=>Math.random()-0.5);};
  const val=h=>{let t=0,a=0;for(c of h){if(c[0]==='A')a++,t+=11;else if('JQK'.includes(c[0]))t+=10;else t+=+c[0];}while(t>21&&a--)t-=10;return t;};
  q('#bjStart').onclick=()=>{
    const bet=Math.max(1,+q('#bjBet').value);
    if(state.coins<bet)return flash('Málo peňazí!');
    state.coins-=bet; createDeck(); player=[deck.pop(),deck.pop()]; dealer=[deck.pop(),deck.pop()];
    q('#bjResult').innerHTML=`Tvoja ruka: ${player.join(' ')} (=${val(player)})<br>Dealer: ${dealer[0]} ?`;
    const c=q('#bjControls');c.innerHTML='';
    const hit=document.createElement('button');hit.textContent='Hit';hit.onclick=()=>{player.push(deck.pop());const v=val(player);q('#bjResult').innerHTML=`Tvoja ruka: ${player.join(' ')} (=${v})<br>Dealer: ?`;if(v>21){q('#bjResult').innerHTML+='<br>BUST! Prehral si.';c.innerHTML='';renderAll();}};
    const stand=document.createElement('button');stand.textContent='Stand';stand.onclick=()=>{while(val(dealer)<17)dealer.push(deck.pop());const dv=val(dealer),pv=val(player);let res=`Tvoja: ${player.join(' ')} (${pv})<br>Dealer: ${dealer.join(' ')} (${dv})<br>`;if(pv>21)res+='Prehral si.';else if(dv>21||pv>dv){state.coins+=bet*2;res+=`Vyhral si ${bet*2}¢!`;}else if(pv===dv){state.coins+=bet;res+='Remíza.';}else res+='Prehral si.';q('#bjResult').innerHTML=res;c.innerHTML='';renderAll();};
    c.append(hit,stand);
  };
}

function openCoinFlip(){
  showModal(`
    <h2>Hod mincou</h2>
    Stávka: <input type="number" id="coinBet" value="10" min="1" style="width:80px"><br><br>
    <button id="headsBtn" style="padding:15px 30px;font-size:20px;">HLAVA</button>
    <button id="tailsBtn" style="padding:15px 30px;font-size:20px;">PÍSMO</button>
    <div id="coinRes" style="margin-top:30px;font-size:40px;"></div>
  `);
  const flip=g=>{const bet=Math.max(1,+q('#coinBet').value);if(state.coins<bet)return flash('Málo peňazí!');state.coins-=bet;const res=Math.random()<0.5;q('#coinRes').innerHTML=res?'HLAVA':'PÍSMO';if(res===g){state.coins+=bet*2;q('#coinRes').innerHTML+='<br>VÝHRA!';}else q('#coinRes').innerHTML+='<br>Prehra';renderAll();};
  q('#headsBtn').onclick=()=>flip(true); q('#tailsBtn').onclick=()=>flip(false);
}

function showModal(html){
  const m=q('#modal'); m.classList.remove('hidden');
  q('#modal-content').innerHTML=html+'<br><button id="closeModal" style="margin-top:20px;padding:12px 24px;">✕ ZAVRIEŤ</button>';
  q('#closeModal').onclick=()=>{m.classList.add('hidden');};
}

/* ========== MODLITBA – JEŽIŠ EDITION ========== */
function prayerAction(){
  state.faith += 10;
  if(state.faith > 500){ state.health = clamp(state.health - 6); flash('Prílišná viera ničí telo –6% zdravie!',4000); }
  if(state.faith >= 850 && !state.jesusWarned){
    state.jesusWarned = true;
    showAlert('JEŽIŠ SA ZJAVIL','„bratku uz le trochu pome a budes tam“<br><br>Odteraz +10% viera a –10% zdravie!');
  }
  if(state.jesusWarned){ state.health = clamp(state.health - 10); flash('+10% viera | –10% zdravie',4000); }
  else flash('Amen +10% viera',2000);
  renderAll();
  if(state.faith > 1000 && !state.jesus1v1Done){
    state.jesus1v1Done = true;
    clearInterval(tickInterval);
    showAlert('1v1 S JEŽIŠOM','„Bratku moj ty a ja 1V1 pekne ako v rusku“<br><br>Klikni OK...');
    setTimeout(()=>{if(Math.random()<1/6){
      Object.assign(state,{hunger:999,sleep:999,fun:999,faith:9999,health:999,toilet:0,coins:999999,foodStock:999});
      flash('SI NOVÝ JEŽIŠ!',30000); showAlert('SI BOH','Všetko 999%. Nesmrteľný.');
    }else{state.health=0; showAlert('DO PEKLA','Ježiš ťa poslal do pekla.');}
    tickInterval=setInterval(applyTick,TICK_MS); renderAll();},1500);
  }
}

/* ========== BUILD ACTIONS ========== */
function buildRoomActions(){
  const a=q('#actions'); a.innerHTML='';
  if(!state.currentRoom){a.innerHTML='<h3>Vyber miestnosť</h3>';return;}
  const btn=(icon,text,fn,price=null)=>{const b=document.createElement('button');b.innerHTML=`${icon} ${text}`+(price!==null?` (${getPrice(price)}¢)`:'');b.onclick=fn;a.appendChild(b);};

  if(state.currentRoom==='kuchyna'){
    a.innerHTML+=`<p>Zásoba: ${state.foodStock}</p>`;
    btn('Burger','Jesť',()=>{if(state.foodStock<=0)return flash('Došlo jedlo!');state.foodStock--;state.hunger=clamp(state.hunger+55);state.health=clamp(state.health+12);state.toilet=clamp(state.toilet+20);flash('Mňam!');renderAll();});
    btn('Cart','Kúpiť 5× jedlo',()=>{const c=getPrice(22);if(state.coins>=c){state.coins-=c;state.foodStock+=5;flash('Kúpil si jedlo!');renderAll();}else flash('Málo peňazí');},22);
  }

  if(state.currentRoom==='market'){
    btn('Bag','Malá +8',()=>{const c=getPrice(18);if(state.coins>=c){state.coins-=c;state.foodStock+=8;renderAll();}},18);
    btn('Box','Stredná +20',()=>{const c=getPrice(45);if(state.coins>=c){state.coins-=c;state.foodStock+=20;renderAll();}},45);
    btn('Store','Veľká +50',()=>{const c=getPrice(100);if(state.coins>=c){state.coins-=c;state.foodStock+=50;renderAll();}},100);
    if(state.blackMarketUnlocked){
      a.innerHTML+='<br><br>Temný kút<br>';
      state.hasGana?btn('Skull','Použiť ganu',()=>{if(confirm('Naozaj?')){state.health=0;renderAll();}}):btn('Gun','Kúpiť ganu',buyGana);
    }
  }

  if(state.currentRoom==='casino'){
    btn('Slots','Sloty',openSlots);
    btn('Roulette','Ruleta',openRoulette);
    btn('Coin','Hod mincou',openCoinFlip);
    btn('Cards','Blackjack',openBlackjack);
  }

  if(state.currentRoom==='church'){
    btn('Cross','Modlitba',prayerAction);
  }

  const simple={kupelna:['Shower','Sprcha',()=>{const c=getPrice(5);if(state.coins>=c){state.coins-=c;state.health=clamp(state.health+40);flash('Čistý!');renderAll();}},5],
    spalna:['Sleeping','Spať',()=>{state.sleep=clamp(state.sleep+80);state.health=clamp(state.health+20);flash('Vyspatý');renderAll();}],
    wc:['Toilet','WC',()=>{state.toilet=0;state.health=clamp(state.health+15);flash('Úľava');renderAll();}],
    praca:['Briefcase','Pracovať',()=>{const e=20+Math.floor(Math.random()*40);state.coins+=e;state.fun=clamp(state.fun-15);flash(`+${e}¢`);renderAll();}],
    hracia:['Gamepad','Hrať sa',()=>{state.fun=clamp(state.fun+60);state.hunger=clamp(state.hunger-10);flash('Zábava!');renderAll();}]};
  if(simple[state.currentRoom]){
    const [i,t,f,p]=simple[state.currentRoom];
    btn(i,t,f,p||null);
  }

  btn('Home','Domov',()=>{state.currentRoom=null;renderAll();}).style.marginTop='40px';
}

/* ========== GAME OVER + TICK ========== */
function gameOver(){if(!gameRunning)return;gameRunning=false;clearInterval(tickInterval);const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;background:#000d;display:flex;align-items:center;justify-content:center;z-index:99999;color:#f33;font-size:60px;';ov.innerHTML='GAME OVER<br><button onclick="localStorage.removeItem(\''+STORAGE_KEY+'\');location.reload()" style="font-size:30px;padding:20px;margin-top:30px;">Nová hra</button>';document.body.appendChild(ov);}
function applyTick(){
  if(!gameRunning)return;
  state.hunger=clamp(state.hunger-DEC.hunger);
  state.fun=clamp(state.fun-DEC.fun);
  state.sleep=clamp(state.sleep-DEC.sleep);
  state.faith=clamp(state.faith-DEC.faith,0,999999);
  state.toilet=clamp(state.toilet+DEC.toilet);
  if(state.hunger<=0||state.toilet>=100)state.health=clamp(state.health-15);
  state.lastTick=Date.now();
  renderAll();
}
function startTick(){
  clearInterval(tickInterval);
  tickInterval=setInterval(applyTick,TICK_MS);
  const missed=Math.floor((Date.now()-state.lastTick)/TICK_MS);
  for(let i=0;i<missed;i++)applyTick();
}

/* ========== INIT ========== */
qa('.rooms button').forEach(b=>b.onclick=()=>{state.currentRoom=b.dataset.room;renderAll();});
q('#saveBtn').onclick=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));flash('Uložené');};
q('#resetBtn').onclick=()=>{if(confirm('Reset?')){localStorage.removeItem(STORAGE_KEY);location.reload();}};
setTimeout(startKonsolidacia,8*60*1000);
window.addEventListener('beforeunload',()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)));

renderAll();
startTick();