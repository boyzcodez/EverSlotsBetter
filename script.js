// drawer
const drawer = document.getElementById("drawer");
const toggleBtn = document.getElementById("drawer-toggle");

// button (play hub)
const button = document.querySelector('.play-hub');

let isHovering = false;
let isPressed = false;

// Visual feedback now uses CSS classes on the .play-hub button instead of image assets


// === SYMBOL & GAME CONFIGURATION ===
const slotSymbols = ["Cherry", "Lemon", "Watermelon", "Star", "Bell", "Seven"];

let symbolWeights = { "Cherry":30, "Lemon":25, "Watermelon":20, "Star":15, "Bell":7, "Seven":3 };
let symbolPoints  = { "Cherry":10, "Lemon":15, "Watermelon":20, "Star":25, "Bell":40, "Seven":100 };

const bonusChances = {
  "Cherry": { multiplier: 10, extraRoll: 3, bonusCoins: 2 },
  "Lemon": { multiplier: 2,  extraRoll: 10, bonusCoins: 3 },
  "Watermelon": { multiplier: 5, extraRoll: 5, bonusCoins: 5 },
  "Star": { multiplier: 8,  extraRoll: 3, bonusCoins: 6 },
  "Bell": { multiplier: 5,  extraRoll: 2, bonusCoins: 8 },
  "Seven": { multiplier: 15, extraRoll: 5, bonusCoins: 10 }
};

let globalBonusBoost = 1.0;

let points = 0, coins = 0, scoreToBeat = 200, rollsLeft = 7, maxRolls = 7;
let numCols = 5, numRows = 3;
let spinning = false;

// === DOM ELEMENTS ===
const slotsContainer = document.getElementById("slots");
const playButton = document.getElementById("playButton");



// Drawer toggle
toggleBtn.addEventListener("click", () => {
  drawer.classList.toggle("open");
});

// Accordion for side containers in drawer
document.querySelectorAll(".drawer-section-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    content.classList.toggle("open");
  });
});

function flashPressed(){
  if (isPressed) return;
  isPressed = true;
  button.classList.add('pressed');
  setTimeout(() => {
    button.classList.remove('pressed');
    isPressed = false;
  }, 350);
}

button.addEventListener('mouseenter', () => { isHovering = true; button.classList.add('hovering'); });
button.addEventListener('mouseleave', () => { isHovering = false; button.classList.remove('hovering'); });
button.addEventListener('mousedown', () => { flashPressed(); });
document.addEventListener("keydown", function(event) {
  // " " or "Spacebar" (older browsers) can be used, but " " is standard
  if (event.code === "Space") {
    event.preventDefault(); // optional: prevent page from scrolling
    flashPressed();
  }
});

///////////////////////////////////////////////////////////////

// === INIT ===
createSlots();
updateDisplay();

// Button handlers
playButton.addEventListener("click", spinSlots);
// Optional debug/cheat buttons: attach listeners only if they exist in the DOM
const bellBoostBtn = document.getElementById("bellBoostButton");
if (bellBoostBtn) {
  bellBoostBtn.addEventListener("click", () => {
    // Use the symbol name key as defined in symbolWeights
    if (typeof symbolWeights["Bell"] === 'number') symbolWeights["Bell"] *= 2;
    alert("Bell odds doubled!");
  });
}

const specialBtn = document.getElementById("specialButton");
if (specialBtn) {
  specialBtn.addEventListener("click", () => {
    alert("Global special odds are now per-symbol via bonus icons.");
  });
}

const bonusBoostBtn = document.getElementById("bonusBoostButton");
if (bonusBoostBtn) {
  bonusBoostBtn.addEventListener("click", () => {
    globalBonusBoost += 0.1;
    alert(`Bonus effectiveness increased (x${globalBonusBoost.toFixed(1)})`);
  });
}

// === HELPERS ===
function createSlots() {
  slotsContainer.innerHTML = "";
  for (let i = 0; i < numCols * numRows; i++) {
    const div = document.createElement("div");
    div.classList.add("slot");
    div.innerHTML = "<span class='symbol'>❔</span>";
    slotsContainer.appendChild(div);
  }
}

function updateDisplay() {
  document.getElementById("balance").textContent = points;
  document.getElementById("coins").textContent = coins;
  document.getElementById("scoreToBeat").textContent = scoreToBeat;
  document.getElementById("rollsLeft").textContent = rollsLeft;
}

function getWeightedSymbol() {
  const entries = Object.entries(symbolWeights);
  const total = entries.reduce((a,[,w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [s, w] of entries) {
    if (r < w) return s;
    r -= w;
  }
  return slotSymbols[0];
}
const getIndex = (r, c) => r * numCols + c;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === SPIN LOGIC ===
async function spinSlots() {
  if (spinning || rollsLeft <= 0) return;
  spinning = true;
  playButton.disabled = true;
  rollsLeft--;
  updateDisplay();

  const outcomes = new Array(numCols * numRows);
  const slotDivs = document.querySelectorAll(".slot");
  const getSlot = (c, r) => slotDivs[getIndex(r, c)];

  // Start ALL columns spinning simultaneously
  const spinningIntervals = [];
  for (let c = 0; c < numCols; c++) {
    spinningIntervals[c] = startColumnSpin(c, getSlot);
  }

  // Now stop columns one by one
  for (let c = 0; c < numCols; c++) {
    await delay(500); // how long before each column stops
    stopColumnSpin(c, getSlot, outcomes, spinningIntervals[c]);
  }

  // Wait a bit to ensure last column finishes updating
  await delay(800);
  await finishSpin(outcomes);
}

function startColumnSpin(col, getSlot) {
  // Mark this column as spinning visually
  for (let row = 0; row < numRows; row++) {
    getSlot(col, row).classList.add("spinning");
  }

  // Continuously update symbols
  const interval = setInterval(() => {
    for (let row = 0; row < numRows; row++) {
      const s = getWeightedSymbol();
      const slot = getSlot(col, row);
      slot.innerHTML = `<img src="pictures/${s}.png" alt="${s}" class="symbol-img">`;
    }
  }, 70);

  return interval;
}

function stopColumnSpin(col, getSlot, outcomes, interval) {
  clearInterval(interval);
  for (let row = 0; row < numRows; row++) {
    const s = getWeightedSymbol();
    const slot = getSlot(col, row);
    const bonus = rollBonusForSymbol(s);
    slot.classList.remove("spinning");
    slot.innerHTML = `
      <img src="pictures/${s}.png" alt="${s}" class="symbol-img">
      ${bonus ? `<span class="bonus">${getBonusIcon(bonus)}</span>` : ""}
    `;
    outcomes[getIndex(row, col)] = { symbol: s, bonus };
  }
}

function spinColumn(col, getSlot, outcomes, stopDelay = 0) {
  return new Promise(resolve => {
    const spins = 15; // how many animation frames
    let count = 0;

    // mark all slots in this column as spinning
    for (let row = 0; row < numRows; row++) {
      getSlot(col, row).classList.add("spinning");
    }

    const interval = setInterval(() => {
      for (let row = 0; row < numRows; row++) {
        const tempSymbol = getWeightedSymbol();
        const slot = getSlot(col, row);
        slot.innerHTML = `<img src="pictures/${tempSymbol}.png" alt="${tempSymbol}" class="symbol-img">`;
      }
      count++;
      if (count >= spins) {
        clearInterval(interval);
        setTimeout(() => {
          // Stop spinning and show the final results
          for (let row = 0; row < numRows; row++) {
            const s = getWeightedSymbol();
            const slot = getSlot(col, row);
            const bonus = rollBonusForSymbol(s);
            slot.classList.remove("spinning");
            slot.innerHTML = `
              <img src="pictures/${s}.png" alt="${s}" class="symbol-img">
              ${bonus ? `<span class="bonus">${getBonusIcon(bonus)}</span>` : ""}
            `;
            outcomes[getIndex(row, col)] = { symbol: s, bonus };
          }
          resolve();
        }, stopDelay); // delay before this column stops
      }
    }, 70);
  });
}

// === BONUS ROLLS ===
function rollBonusForSymbol(symbol) {
  const chances = bonusChances[symbol];
  if (!chances) return null;
  for (const [type, chance] of Object.entries(chances)) {
    if (Math.random() * 100 < chance * globalBonusBoost) return type;
  }
  return null;
}
function getBonusIcon(type) {
  return type === "multiplier" ? "✖️"
       : type === "extraRoll"  ? "🔁"
       : type === "bonusCoins" ? "💰"
       : "";
}

// === FINISH SPIN & SCORING ===
async function finishSpin(outcomes) {
  const result = calculatePatterns(outcomes);

  // Play win animations before scoring
  await animatePatterns(result.patterns, outcomes);

  let spinPoints = result.totalPoints;
  let spinCoins = 0;

  // Apply symbol-specific bonuses
  for (const o of outcomes.filter(x => x && x.bonus)) {
    switch (o.bonus) {
      case "multiplier": spinPoints *= 2; break;
      case "extraRoll": rollsLeft++; break;
      case "bonusCoins": spinCoins += Math.floor(spinPoints / 2); break;
    }
  }

  points += spinPoints;
  coins += spinCoins;
  updateDisplay();

  // Game progression after animations
  if (points >= scoreToBeat) {
    await delay(800);
    alert(`🎉 You beat ${scoreToBeat}!`);
    points = 0;
    scoreToBeat = Math.round(scoreToBeat * 1.3);
    rollsLeft = maxRolls;
  } else if (rollsLeft === 0) {
    await delay(800);
    alert(`💀 Failed to beat ${scoreToBeat}. Game reset.`);
    points = 0;
    coins = 0;
    scoreToBeat = 200;
    rollsLeft = maxRolls;
    globalBonusBoost = 1.0;
  }

  updateDisplay();
  playButton.disabled = false;
  spinning = false;
}

// === PATTERN DETECTION ===
function calculatePatterns(out) {
  let total = 0;
  const patterns = [];
  const add = (symbol, indexes) => {
    const count = indexes.length;
    total += symbolPoints[symbol] * count;
    patterns.push({ symbol, indexes });
  };

  // horizontal
  for (let r = 0; r < numRows; r++) {
    let seq = [0];
    for (let c = 1; c < numCols; c++) {
      const prev = out[getIndex(r, c-1)].symbol;
      const cur = out[getIndex(r, c)].symbol;
      if (cur === prev) seq.push(c);
      else {
        if (seq.length >= 3) add(out[getIndex(r, seq[0])].symbol, seq.map(cc => getIndex(r, cc)));
        seq = [c];
      }
    }
    if (seq.length >= 3) add(out[getIndex(r, seq[0])].symbol, seq.map(cc => getIndex(r, cc)));
  }

  // vertical
  for (let c = 0; c < numCols; c++) {
    let seq = [0];
    for (let r = 1; r < numRows; r++) {
      const prev = out[getIndex(r-1, c)].symbol;
      const cur = out[getIndex(r, c)].symbol;
      if (cur === prev) seq.push(r);
      else {
        if (seq.length >= 3) add(out[getIndex(seq[0], c)].symbol, seq.map(rr => getIndex(rr, c)));
        seq = [r];
      }
    }
    if (seq.length >= 3) add(out[getIndex(seq[0], c)].symbol, seq.map(rr => getIndex(rr, c)));
  }

  // simple diagonals
  const diags = [
    [getIndex(0,0),getIndex(1,1),getIndex(2,2)],
    [getIndex(0,2),getIndex(1,1),getIndex(2,0)],
    [getIndex(0,2),getIndex(1,3),getIndex(2,4)],
    [getIndex(0,4),getIndex(1,3),getIndex(2,2)]
  ];
  diags.forEach(set => {
    const [a,b,c] = set.map(i => out[i].symbol);
    if (a===b && b===c) add(a, set);
  });

  // Zigzag up
  const zUp = [getIndex(0,1),getIndex(1,2),getIndex(2,1)];
  if (out[zUp[0]].symbol === out[zUp[1]].symbol && out[zUp[1]].symbol === out[zUp[2]].symbol)
    add(out[zUp[0]].symbol, zUp);

  return { totalPoints: total, patterns };
}

// === ANIMATION ===
async function animatePatterns(patterns, outcomes) {
  if (!patterns || patterns.length === 0) return;
  const sorted = [...patterns].sort((a, b) => a.indexes.length - b.indexes.length);
  const slotDivs = document.querySelectorAll(".slot");

  for (const pattern of sorted) {
    pattern.indexes.forEach(i => slotDivs[i].classList.add("win"));
    await delay(900);
    pattern.indexes.forEach(i => slotDivs[i].classList.remove("win"));
  }
}

function renderPaytable() {
  // Populate every paytable container on the page
  const containers = document.querySelectorAll('.paytable');
  containers.forEach(container => {
    // clear existing contents to make function idempotent
    container.innerHTML = '';
    Object.entries(symbolPoints).forEach(([symbol, value]) => {
      const item = document.createElement('div');
      item.classList.add('paytable-item');
      item.innerHTML = `
        <img src="pictures/${symbol}.png" alt="${symbol}">
        <span>${value} pts</span>
      `;
      container.appendChild(item);
    });
  });
}

// Run this once on startup
renderPaytable();