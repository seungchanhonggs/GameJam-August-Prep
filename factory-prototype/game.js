"use strict";

function syncViewportHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

syncViewportHeight();
window.addEventListener("resize", syncViewportHeight);
window.visualViewport?.addEventListener("resize", syncViewportHeight);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const ui = {
  canvasWrap: document.getElementById("canvasWrap"),
  score: document.getElementById("scoreValue"),
  time: document.getElementById("timeValue"),
  orderNumber: document.getElementById("orderNumber"),
  orderParts: document.getElementById("orderParts"),
  combo: document.getElementById("comboValue"),
  heat: document.getElementById("heatValue"),
  heatFill: document.getElementById("heatFill"),
  boost: document.getElementById("boostButton"),
  pause: document.getElementById("pauseButton"),
  toast: document.getElementById("toast"),
  startOverlay: document.getElementById("startOverlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  resultOverlay: document.getElementById("resultOverlay"),
  start: document.getElementById("startButton"),
  resume: document.getElementById("resumeButton"),
  restartFromPause: document.getElementById("restartFromPause"),
  restart: document.getElementById("restartButton"),
  resultGrade: document.getElementById("resultGrade"),
  finalScore: document.getElementById("finalScore"),
  finalOrders: document.getElementById("finalOrders"),
  finalCombo: document.getElementById("finalCombo"),
  finalScrap: document.getElementById("finalScrap"),
};

const W = canvas.width;
const H = canvas.height;
const TYPES = [
  { id: "copper", name: "COPPER", color: "#ff9d3d", y: 245, shape: "square" },
  { id: "coolant", name: "COOLANT", color: "#37d8e8", y: 530, shape: "circle" },
  { id: "circuit", name: "CIRCUIT", color: "#b9e65c", y: 815, shape: "diamond" },
];
const ROUTER = { x: 345, y: 530 };
const MACHINE_X = 610;
const FEED_Y = 530;
const BELT_START = -70;
const BELT_LOCK = 310;
const SHIFT_TIME = 60;

let state;
let lastTime = performance.now();
let audioContext = null;
let toastTimer = 0;

function freshState() {
  return {
    mode: "idle",
    time: SHIFT_TIME,
    score: 0,
    combo: 0,
    bestCombo: 0,
    heat: 18,
    selected: 1,
    items: [],
    particles: [],
    sparks: [],
    spawnTimer: 0.65,
    orderIndex: 1,
    ordersDone: 0,
    scrap: 0,
    order: makeOrder(1),
    boost: false,
    overheatTimer: 0,
    shake: 0,
    flash: 0,
    elapsed: 0,
  };
}

function makeOrder(index) {
  const total = Math.min(8, 4 + Math.floor(index / 2));
  const needs = [0, 0, 0];
  for (let i = 0; i < total; i += 1) needs[Math.floor(Math.random() * 3)] += 1;
  if (needs.filter(Boolean).length < 2) needs[(needs.findIndex(Boolean) + 1) % 3] = 1;
  return { needs, delivered: [0, 0, 0] };
}

function resetGame() {
  state = freshState();
  ui.resultOverlay.classList.add("hidden");
  ui.pauseOverlay.classList.add("hidden");
  renderOrder();
  updateHud();
}

function startGame() {
  resetGame();
  initAudio();
  state.mode = "running";
  ui.startOverlay.classList.add("hidden");
  lastTime = performance.now();
  tone(180, 0.08, "square", 0.035);
  setTimeout(() => tone(260, 0.1, "square", 0.035), 80);
}

function spawnItem() {
  const typeIndex = weightedNeededType();
  const type = TYPES[typeIndex];
  state.items.push({
    type: typeIndex,
    x: BELT_START,
    y: FEED_Y,
    route: null,
    progress: 0,
    spin: Math.random() * Math.PI * 2,
    size: 23,
  });
}

function weightedNeededType() {
  const remaining = state.order.needs.map((need, i) => Math.max(0, need - state.order.delivered[i]));
  const pool = [];
  remaining.forEach((count, i) => {
    const weight = count > 0 ? count * 3 : 1;
    for (let n = 0; n < weight; n += 1) pool.push(i);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

function update(dt) {
  if (state.mode !== "running") return;
  state.elapsed += dt;
  state.time = Math.max(0, state.time - dt);
  state.flash = Math.max(0, state.flash - dt * 2.8);
  state.shake = Math.max(0, state.shake - dt * 10);

  if (state.overheatTimer > 0) {
    state.overheatTimer -= dt;
    state.boost = false;
    state.heat = Math.max(62, state.heat - dt * 12);
  } else {
    const boosting = state.boost && state.heat < 100;
    state.heat += boosting ? dt * 18 : -dt * 9;
    state.heat = clamp(state.heat, 12, 100);
    if (state.heat >= 100) triggerOverheat();
  }

  const speedFactor = state.overheatTimer > 0 ? 0.18 : state.boost ? 1.8 : 1;
  state.spawnTimer -= dt * speedFactor;
  if (state.spawnTimer <= 0 && state.overheatTimer <= 0) {
    spawnItem();
    const difficulty = clamp(state.elapsed / 80, 0, 0.55);
    state.spawnTimer = (0.93 - difficulty) * (state.boost ? 0.82 : 1) + Math.random() * 0.2;
  }

  for (let i = state.items.length - 1; i >= 0; i -= 1) {
    const item = state.items[i];
    const speed = (145 + state.elapsed * 0.62) * speedFactor;
    if (item.route == null) {
      item.x += speed * dt;
      item.spin += dt * 2.4;
      if (item.x >= BELT_LOCK) {
        item.route = state.selected;
        item.progress = 0;
        item.x = BELT_LOCK;
        tone(410, 0.035, "square", 0.012);
      }
    } else {
      item.progress += dt * speed / 330;
      const target = TYPES[item.route];
      const t = clamp(item.progress, 0, 1);
      const eased = t * t * (3 - 2 * t);
      item.x = lerp(BELT_LOCK, MACHINE_X - 18, eased);
      item.y = quadratic(FEED_Y, FEED_Y, target.y, eased);
      item.spin += dt * 5;
      if (item.progress >= 1) {
        processItem(item);
        state.items.splice(i, 1);
      }
    }
  }

  updateParticles(dt);
  if (state.time <= 0) endGame();
  updateHud();
}

function processItem(item) {
  const target = TYPES[item.route];
  const correct = item.type === item.route;
  burst(MACHINE_X - 8, target.y, correct ? target.color : "#ff5757", correct ? 18 : 26);
  if (correct) {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = 1 + Math.floor(state.combo / 6);
    const boostBonus = state.boost ? 1.5 : 1;
    state.score += Math.round(100 * multiplier * boostBonus);
    if (state.order.delivered[item.type] < state.order.needs[item.type]) {
      state.order.delivered[item.type] += 1;
    } else {
      state.score += 35;
    }
    state.heat = Math.max(12, state.heat - 2.2);
    state.flash = 0.26;
    tone(520 + item.type * 95, 0.055, "triangle", 0.025);
    if (orderComplete()) completeOrder();
  } else {
    state.combo = 0;
    state.scrap += 1;
    state.heat = Math.min(100, state.heat + 18);
    state.shake = 8;
    showToast("SCRAP + HEAT", "bad");
    tone(95, 0.16, "sawtooth", 0.045);
  }
  renderOrder();
}

function orderComplete() {
  return state.order.needs.every((need, i) => state.order.delivered[i] >= need);
}

function completeOrder() {
  state.ordersDone += 1;
  state.orderIndex += 1;
  const bonus = 600 + state.ordersDone * 100;
  state.score += bonus;
  state.time = Math.min(69, state.time + 3.5);
  state.heat = Math.max(12, state.heat - 16);
  showToast(`ORDER COMPLETE +${bonus}`, "good");
  state.order = makeOrder(state.orderIndex);
  for (let i = 0; i < 3; i += 1) {
    setTimeout(() => tone(480 + i * 130, 0.07, "triangle", 0.025), i * 70);
  }
}

function triggerOverheat() {
  state.overheatTimer = 2.7;
  state.combo = 0;
  state.shake = 12;
  state.scrap += 1;
  showToast("CORE OVERHEAT", "bad");
  burst(ROUTER.x, ROUTER.y, "#ff5757", 36);
  tone(70, 0.4, "sawtooth", 0.05);
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.97;
    p.vy = p.vy * 0.97 + 70 * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 170;
    state.particles.push({
      x, y, color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.28 + Math.random() * 0.45,
      maxLife: 0.73,
      size: 2 + Math.random() * 5,
    });
  }
}

function selectRoute(index) {
  if (state.mode !== "running" || state.overheatTimer > 0) return;
  if (state.selected !== index) {
    state.selected = index;
    tone(260 + index * 90, 0.045, "square", 0.018);
  }
}

function canvasPointer(event) {
  if (state.mode !== "running") return;
  const rect = canvas.getBoundingClientRect();
  const y = (event.clientY - rect.top) * H / rect.height;
  let closest = 0;
  let best = Infinity;
  TYPES.forEach((type, index) => {
    const distance = Math.abs(type.y - y);
    if (distance < best) { best = distance; closest = index; }
  });
  selectRoute(closest);
}

function setBoost(active) {
  if (!state || state.mode !== "running" || state.overheatTimer > 0) active = false;
  state.boost = active;
  ui.boost.classList.toggle("active", active);
}

function pauseGame() {
  if (state.mode !== "running") return;
  state.mode = "paused";
  setBoost(false);
  ui.pauseOverlay.classList.remove("hidden");
}

function resumeGame() {
  if (state.mode !== "paused") return;
  state.mode = "running";
  ui.pauseOverlay.classList.add("hidden");
  lastTime = performance.now();
}

function endGame() {
  state.mode = "result";
  setBoost(false);
  const grade = state.score >= 12000 ? "S" : state.score >= 8500 ? "A" : state.score >= 5200 ? "B" : state.score >= 2800 ? "C" : "D";
  ui.resultGrade.textContent = grade;
  ui.finalScore.textContent = state.score.toLocaleString();
  ui.finalOrders.textContent = String(state.ordersDone);
  ui.finalCombo.textContent = String(state.bestCombo);
  ui.finalScrap.textContent = String(state.scrap);
  ui.resultOverlay.classList.remove("hidden");
  tone(180, 0.16, "square", 0.03);
}

function renderOrder() {
  if (!state) return;
  ui.orderNumber.textContent = `#A-${String(state.orderIndex).padStart(2, "0")}`;
  ui.orderParts.innerHTML = TYPES.map((type, i) => {
    const remaining = Math.max(0, state.order.needs[i] - state.order.delivered[i]);
    const done = state.order.needs[i] > 0 && remaining === 0;
    return `<div class="order-chip ${type.id} ${done ? "done" : ""}"><i></i><strong>${remaining}</strong></div>`;
  }).join("");
}

function updateHud() {
  if (!state) return;
  ui.score.textContent = String(state.score).padStart(6, "0");
  ui.time.textContent = state.time.toFixed(1);
  const chainMultiplier = 1 + Math.floor(state.combo / 6);
  ui.combo.textContent = `x${chainMultiplier}`;
  ui.heat.textContent = `${Math.round(state.heat)}°`;
  ui.heatFill.style.width = `${state.heat}%`;
  const hot = state.heat > 78;
  ui.heat.style.color = hot ? "#ff5757" : state.heat > 52 ? "#ff9d3d" : "#37d8e8";
  ui.heatFill.style.background = hot ? "#ff5757" : state.heat > 52 ? "#ff9d3d" : "#37d8e8";
  ui.boost.disabled = state.overheatTimer > 0 || state.mode !== "running";
}

function showToast(text, kind) {
  clearTimeout(toastTimer);
  ui.toast.textContent = text;
  ui.toast.className = `toast show ${kind}`;
  toastTimer = setTimeout(() => { ui.toast.className = "toast"; }, 850);
}

function draw() {
  if (!state) return;
  ctx.save();
  const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  const shakeY = state.shake ? (Math.random() - 0.5) * state.shake : 0;
  ctx.translate(shakeX, shakeY);
  drawFloor();
  drawBelts();
  drawRoutes();
  drawMachines();
  drawRouter();
  drawItems();
  drawParticles();
  drawStatus();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(185,230,92,${state.flash * 0.08})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function drawFloor() {
  ctx.fillStyle = "#101517";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(111,125,127,.11)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 54) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,157,61,.06)";
  for (let i = -H; i < W; i += 160) {
    ctx.save(); ctx.translate(i, H - 48); ctx.rotate(-0.7); ctx.fillRect(0, 0, 72, 16); ctx.restore();
  }
}

function drawBelts() {
  drawBelt(0, FEED_Y - 54, BELT_LOCK + 38, FEED_Y + 54, 1);
  TYPES.forEach((type) => drawCurvedBelt(type));
}

function drawBelt(x1, y1, x2, y2, alpha) {
  ctx.fillStyle = `rgba(45,54,57,${alpha})`;
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
  ctx.strokeStyle = "#586366";
  ctx.lineWidth = 4;
  ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  const offset = (state.elapsed * (state.boost ? 150 : 85)) % 54;
  ctx.strokeStyle = "rgba(139,151,153,.38)";
  ctx.lineWidth = 8;
  for (let x = -60 + offset; x < x2; x += 54) {
    ctx.beginPath(); ctx.moveTo(x, y1 + 9); ctx.lineTo(x, y2 - 9); ctx.stroke();
  }
}

function drawCurvedBelt(type) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ROUTER.x, FEED_Y);
  ctx.quadraticCurveTo(445, FEED_Y, MACHINE_X, type.y);
  ctx.lineWidth = 62;
  ctx.strokeStyle = "#293134";
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#566164";
  ctx.stroke();
  ctx.setLineDash([12, 26]);
  ctx.lineDashOffset = -state.elapsed * (state.boost ? 170 : 90);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(145,158,160,.36)";
  ctx.stroke();
  ctx.restore();
}

function drawRoutes() {
  const selected = TYPES[state.selected];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ROUTER.x, FEED_Y);
  ctx.quadraticCurveTo(445, FEED_Y, MACHINE_X, selected.y);
  ctx.lineWidth = 9;
  ctx.strokeStyle = `${selected.color}55`;
  ctx.shadowColor = selected.color;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.restore();
}

function drawMachines() {
  TYPES.forEach((type, index) => {
    const active = state.selected === index;
    const x = MACHINE_X - 18;
    const y = type.y - 68;
    ctx.save();
    ctx.fillStyle = active ? "#303a3c" : "#202729";
    ctx.strokeStyle = active ? type.color : "#5a6669";
    ctx.lineWidth = active ? 5 : 3;
    ctx.shadowColor = active ? type.color : "transparent";
    ctx.shadowBlur = active ? 18 : 0;
    ctx.fillRect(x, y, 122, 136);
    ctx.strokeRect(x, y, 122, 136);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111617";
    ctx.fillRect(x + 18, y + 24, 86, 64);
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 18, y + 24, 86, 64);
    drawPartShape(type, x + 61, y + 56, 22, active ? 1 : .58);
    ctx.fillStyle = type.color;
    ctx.font = "900 14px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(type.name, x + 61, y + 113);
    ctx.restore();
  });
}

function drawRouter() {
  const type = TYPES[state.selected];
  ctx.save();
  ctx.translate(ROUTER.x, ROUTER.y);
  ctx.rotate(state.elapsed * (state.boost ? 2.8 : 1.1));
  ctx.fillStyle = state.overheatTimer > 0 ? "#552525" : "#273033";
  ctx.strokeStyle = state.overheatTimer > 0 ? "#ff5757" : type.color;
  ctx.lineWidth = 7;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(0, 0, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  for (let i = 0; i < 8; i += 1) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#667174";
    ctx.fillRect(49, -8, 22, 16);
  }
  ctx.fillStyle = "#121719";
  ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = state.overheatTimer > 0 ? "#ff5757" : type.color;
  ctx.font = "900 13px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.overheatTimer > 0 ? "COOLING" : "ROUTER", ROUTER.x, ROUTER.y + 5);
}

function drawItems() {
  state.items.forEach((item) => {
    const type = TYPES[item.type];
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.spin);
    drawPartShape(type, 0, 0, item.size, 1);
    ctx.restore();
  });
}

function drawPartShape(type, x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = type.color;
  ctx.strokeStyle = "#0b0e10";
  ctx.lineWidth = 5;
  ctx.shadowColor = type.color;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  if (type.shape === "circle") {
    ctx.arc(0, 0, size, 0, Math.PI * 2);
  } else if (type.shape === "diamond") {
    ctx.moveTo(0, -size); ctx.lineTo(size, 0); ctx.lineTo(0, size); ctx.lineTo(-size, 0); ctx.closePath();
  } else {
    ctx.rect(-size, -size, size * 2, size * 2);
  }
  ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

function drawStatus() {
  if (state.mode === "idle") return;
  ctx.fillStyle = "rgba(10,13,14,.82)";
  ctx.fillRect(18, 18, 176, 42);
  ctx.strokeStyle = "#465154";
  ctx.strokeRect(18, 18, 176, 42);
  ctx.fillStyle = state.boost ? "#ff9d3d" : "#8d9996";
  ctx.font = "900 14px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText(state.boost ? "TURBO LINE 180%" : "LINE SPEED 100%", 34, 45);
}

function initAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
}

function tone(frequency, duration, type, volume) {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function loop(now) {
  const dt = Math.min(0.035, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function quadratic(a, control, b, t) { return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * control + t * t * b; }

canvas.addEventListener("pointerdown", canvasPointer);
ui.start.addEventListener("click", startGame);
ui.restart.addEventListener("click", startGame);
ui.restartFromPause.addEventListener("click", startGame);
ui.pause.addEventListener("click", pauseGame);
ui.resume.addEventListener("click", resumeGame);
ui.boost.addEventListener("pointerdown", (event) => { event.preventDefault(); initAudio(); setBoost(true); });
window.addEventListener("pointerup", () => setBoost(false));
window.addEventListener("pointercancel", () => setBoost(false));
window.addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "3") selectRoute(Number(event.key) - 1);
  if (event.code === "Space") { event.preventDefault(); setBoost(true); }
  if (event.key.toLowerCase() === "p" || event.key === "Escape") state.mode === "paused" ? resumeGame() : pauseGame();
});
window.addEventListener("keyup", (event) => { if (event.code === "Space") setBoost(false); });
document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });

resetGame();
requestAnimationFrame(loop);
