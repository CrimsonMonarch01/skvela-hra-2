// ===============================
// === Pou Ultimate — game.js ===
// ===============================

// === Stats ===
let stats = {
  food: 100,
  health: 100,
  fun: 100,
  sleep: 0,
  faith: 0,
  toilet: 30,
};

let coinsAmount = 20;
let fridgeFood = 0;

// Tracking for scoring
let lifetimeSeconds = 0;
let totalEarned = 0;
let totalPrayers = 0;
let totalWorks = 0;
let totalMeals = 0;

// DOM elements
const food = document.getElementById("food");
const foodVal = document.getElementById("food-val");
const health = document.getElementById("health");
const healthVal = document.getElementById("health-val");
const fun = document.getElementById("fun");
const funVal = document.getElementById("fun-val");
const sleep = document.getElementById("sleep");
const sleepVal = document.getElementById("sleep-val");

const coins = document.getElementById("coins") || (() => {
  const d = document.createElement("div");
  d.id = "coins";
  document.body.appendChild(d);
  return d;
})();

const pouOverlay = document.getElementById("pou-overlay");
const roomImg = document.getElementById("room-img");
const pou = document.getElementById("pou");

// ===============================
// === Bar Update ===
// ===============================
function updateBars() {
  food.value = stats.food;
  foodVal.textContent = stats.food + "%";

  health.value = stats.health;
  healthVal.textContent = stats.health + "%";

  fun.value = stats.fun;
  funVal.textContent = stats.fun + "%";

  sleep.value = stats.sleep;
  sleepVal.textContent = stats.sleep + "%";

  coins.textContent = `💠 ${coinsAmount}¢`;
}

// Clamp (all stats limited)
function clampStats() {
  for (const k in stats) {
    if (stats[k] < 0) stats[k] = 0;
    if (stats[k] > 9999) stats[k] = 9999;
  }
}

// ===============================
// === Animation ===
// ===============================
function jumpPou() {
  pouOverlay.style.transform = "translate(-50%, -25px)";
  setTimeout(() => {
    pouOverlay.style.transform = "translate(-50%, 0)";
  }, 150);
}

// ===============================
// === Room switching ===
// ===============================
function changeRoom(room) {
  roomImg.src = `rooms/${room}.png`; // your repo storage
  pouOverlay.src = "sprites/pou.png";
  jumpPou();
}

// ===============================
// === Actions ===
// ===============================

// FEED FROM FRIDGE
function feedPou() {
  if (fridgeFood <= 0) return;

  fridgeFood--;
  const gain = 10 + Math.floor(Math.random() * 6);

  stats.food = Math.min(100, stats.food + gain);
  stats.toilet = Math.min(100, stats.toilet + 10);

  totalMeals++;

  jumpPou();
  updateBars();
}

// WORK
function doWork() {
  stats.sleep += 5;
  stats.food -= 6.7;

  let reward = 10;

  // FUN PENALTY BELOW 25%
  if (stats.fun < 25) reward *= 0.8;

  coinsAmount += reward;
  totalEarned += reward;
  totalWorks++;

  clampStats();
  jumpPou();
  updateBars();
}

// FUN
function playPou() {
  stats.fun = Math.min(100, stats.fun + 20);
  stats.sleep += 5;
  clampStats();
  jumpPou();
  updateBars();
}

// WASH
function washPou() {
  stats.health = Math.min(100, stats.health + 15);
  jumpPou();
  updateBars();
}

// SLEEP
function sleepPou() {
  stats.sleep = Math.max(0, stats.sleep - 20);
  stopSleepOverflow();
  jumpPou();
  updateBars();
}

// ===============================
// === PRAYER ===
// ===============================
let lastPrayerTime = 0;

function prayPou() {
  const gain = 5 + Math.floor(Math.random() * 3); // 5–7%
  stats.faith += gain;

  lastPrayerTime = Date.now();
  totalPrayers++;

  clampStats();
  jumpPou();
  updateBars();
}

// Prayer punishment (faith > 500 + spamming)
setInterval(() => {
  if (Date.now() - lastPrayerTime < 2000 && stats.faith > 500) {
    stats.health -= (1 + Math.floor(Math.random() * 2));
    clampStats();
    updateBars();
  }
}, 1000);

// ===============================
// === Sleep overflow punishment ===
// ===============================
let sleepOverflowTimer = null;
let sleepCountdown = 0;

function startSleepOverflow() {
  if (sleepOverflowTimer) return;
  sleepCountdown = 6 + Math.floor(Math.random() * 2);

  sleepOverflowTimer = setInterval(() => {
    sleepCountdown--;
    if (sleepCountdown <= 0) {
      stats.health = Math.max(0, stats.health - 1);
      updateBars();
      if (stats.health <= 0) stopSleepOverflow();
    }
  }, 1000);
}

function stopSleepOverflow() {
  if (sleepOverflowTimer) {
    clearInterval(sleepOverflowTimer);
    sleepOverflowTimer = null;
  }
}

// Check every second
setInterval(() => {
  if (stats.sleep >= 100) startSleepOverflow();
}, 1000);

// ===============================
// === 20s periodic decay ===
// ===============================
setInterval(() => {
  stats.food -= (1 + Math.floor(Math.random() * 2));
  stats.health -= (1 + Math.floor(Math.random() * 2));
  stats.fun -= (1 + Math.floor(Math.random() * 2));

  // sleep increases slowly
  stats.sleep = Math.min(100, stats.sleep + 1);

  clampStats();
  updateBars();
}, 20000);

// ===============================
// === 13. MULTI-NEED DEATH PUNISHMENT ===
// ===============================

let needTimerActive = false;
let needDeathTimer = null;

function checkNeedsForDeath() {
  const zeroNeeds = [];

  if (stats.food === 0) zeroNeeds.push("food");
  if (stats.fun === 0) zeroNeeds.push("fun");
  if (stats.health === 0) zeroNeeds.push("health"); // health ignored—but 0 triggers game over
  if (stats.faith === 0) zeroNeeds.push("faith");

  if (zeroNeeds.length === 0) {
    stopNeedDeathTimer();
    return;
  }

  if (!needTimerActive) {
    needTimerActive = true;

    let countdown = 6 + Math.floor(Math.random() * 2);

    const prepTimer = setInterval(() => {
      countdown--;

      if (countdown <= 0) {
        clearInterval(prepTimer);
        startNeedDeathTimer();
      }

      if (zeroNeeds.length === 0) {
        clearInterval(prepTimer);
        needTimerActive = false;
      }
    }, 1000);
  }
}

function startNeedDeathTimer() {
  if (needDeathTimer) return;

  needDeathTimer = setInterval(() => {
    const zeroCount =
      (stats.food === 0 ? 1 : 0) +
      (stats.fun === 0 ? 1 : 0) +
      (stats.faith === 0 ? 1 : 0);

    if (zeroCount === 0) {
      stopNeedDeathTimer();
      needTimerActive = false;
      return;
    }

    // base = 1% per sec, increased by +18% per extra need
    const multiplier = 1 + (zeroCount - 1) * 0.18;
    const dmg = multiplier;

    stats.health -= dmg;
    clampStats();
    updateBars();

    if (stats.health <= 0) {
      gameOver();
    }
  }, 1000);
}

function stopNeedDeathTimer() {
  if (needDeathTimer) {
    clearInterval(needDeathTimer);
    needDeathTimer = null;
  }
}

// periodic check each second
setInterval(checkNeedsForDeath, 1000);

// ===============================
// === LIFETIME COUNTER ===
// ===============================
setInterval(() => {
  lifetimeSeconds++;
}, 1000);

// ===============================
// === GAME OVER ===
// ===============================
function gameOver() {
  alert("Pou zomrel!");

  const score =
    (lifetimeSeconds * 2) +
    (totalEarned / 3) +
    (totalPrayers * 5) +
    (totalWorks * 8) +
    (totalMeals * 6);

  alert("Tvoje skóre: " + Math.floor(score));

  location.reload();
}

// ===============================
// === DARK MODE ===
// ===============================
document.getElementById("dark-toggle").onclick = () => {
  document.body.classList.toggle("dark");
};

// init bars
updateBars();
