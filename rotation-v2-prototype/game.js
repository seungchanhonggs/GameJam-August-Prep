"use strict";

function syncViewportHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

syncViewportHeight();
window.addEventListener("resize", syncViewportHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncViewportHeight);
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const heroSpriteSheet = new Image();
heroSpriteSheet.src = "../pivot-prototype/assets/heroes-spritesheet.png";

const ui = {
  coreExpFill: document.getElementById("coreExpFill"),
  levelProgressFill: document.getElementById("levelProgressFill"),
  levelLabel: document.getElementById("levelLabel"),
  attackCharge: document.getElementById("attackCharge"),
  areaCharge: document.getElementById("areaCharge"),
  wallCharge: document.getElementById("wallCharge"),
  attackHp: document.getElementById("attackHp"),
  areaHp: document.getElementById("areaHp"),
  wallHp: document.getElementById("wallHp"),
  attackLevel: document.getElementById("attackLevel"),
  areaLevel: document.getElementById("areaLevel"),
  wallLevel: document.getElementById("wallLevel"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  rotateLeftButton: document.getElementById("rotateLeftButton"),
  rotateRightButton: document.getElementById("rotateRightButton"),
  quickRestartButton: document.getElementById("quickRestartButton"),
  debugToggle: document.getElementById("debugToggle"),
  debugPanel: document.getElementById("debugPanel"),
  debugClose: document.getElementById("debugClose"),
  saveBalanceButton: document.getElementById("saveBalanceButton"),
  copyBalanceButton: document.getElementById("copyBalanceButton"),
  debugBody: document.getElementById("debugBody"),
  cardOverlay: document.getElementById("cardOverlay"),
  cardOptions: document.getElementById("cardOptions"),
  resultOverlay: document.getElementById("resultOverlay"),
  resultTitle: document.getElementById("resultTitle"),
  resultText: document.getElementById("resultText"),
  restartButton: document.getElementById("restartButton"),
  coreLinkButton: document.getElementById("coreLinkButton"),
};

const TAU = Math.PI * 2;
const W = canvas.width;
const H = canvas.height;
const center = { x: W * 0.5, y: H * 0.47 };
const arena = { rx: W * 0.43, ry: H * 0.22 };
const slotAngles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];

const heroColors = {
  attack: "#ffd457",
  area: "#7de1ff",
  wall: "#9cff82",
};

const balance = {
  coreHp: 120,
  coreExpNeed: 72,
  coreExpGrowth: 1.28,
  levelDuration: 150,
  ambientMinInterval: 0.55,
  ambientBaseInterval: 1.22,
  ambientRamp: 0.004,
  spawnJitter: 46,
  groupPackSize: 4,
  groupSpacing: 22,
  heroDamageShare: 0.6,
  rotationSensitivity: 0.65,
  rotationFreeMode: true,
  rotationSwitchMode: false,
  coreLink: {
    skillCharge: 34,
    wallBlockCharge: 34,
    normalDamage: 160,
    bossDamage: 220,
    beamDuration: 0.65,
  },
  levelUps: {
    enabled: true,
    attack: true,
    area: true,
    wall: true,
  },
  heroes: {
    attack: { hp: 90, basicDamage: 34, attackInterval: 0.46, range: 340, arcDegrees: 38, skillDamage: 22, skillCooldown: 5.8, skillShots: 7, projectileSpeed: 560 },
    area: { hp: 82, basicDamage: 13, attackInterval: 0.82, range: 255, arcDegrees: 82, skillDamage: 45, skillCooldown: 4.4, skillRadius: 62, projectileSpeed: 360, skillProjectileSpeed: 260 },
    wall: { hp: 120, basicDamage: 9, attackInterval: 1.05, range: 190, arcDegrees: 104, skillCooldown: 5.2, projectileSpeed: 300, wallHp: 95, wallWidth: 72, wallContactDamage: 12, wallPlaceDistance: 78, wallArcDegrees: 92, wallDuration: 10 },
  },
  enemies: {
    small: { hp: 24, speed: 30, radius: 13, exp: 9, damage: 5, color: "#49b8ff" },
    group: { hp: 16, speed: 34, radius: 10, exp: 6, damage: 3, color: "#6ee7ff" },
    medium: { hp: 70, speed: 22, radius: 18, exp: 20, damage: 11, color: "#8f76ff" },
    rush: { hp: 42, speed: 62, radius: 14, exp: 16, damage: 14, color: "#ff6b4d" },
    boss: { hp: 1100, speed: 12, radius: 34, exp: 0, damage: 999, color: "#e34b68" },
  },
  waves: {
    medium1Count: 1,
    group1Count: 7,
    rush1Count: 2,
    group2Count: 9,
    medium2Count: 2,
    rush2Count: 3,
    bossTime: 135,
  },
  upgrades: {
    attackRateMultiplier: 0.85,
    attackDamageMultiplier: 1.25,
    areaDamageMultiplier: 1.25,
    areaCooldownMultiplier: 0.85,
    areaRadiusMultiplier: 1.18,
    areaCenterBonusAdd: 0.4,
    wallHpMultiplier: 1.35,
    wallContactDamageMultiplier: 1.4,
    wallWidthMultiplier: 1.22,
  },
};

loadSavedBalance();

function loadSavedBalance() {
  try {
    const hasCodeOverrides = window.BALANCE_OVERRIDES && Object.keys(window.BALANCE_OVERRIDES).length > 0;
    if (hasCodeOverrides) {
      deepMerge(balance, window.BALANCE_OVERRIDES);
    }
    const saved = localStorage.getItem("rotationDefenseV2.balance");
    if (saved && !hasCodeOverrides) deepMerge(balance, JSON.parse(saved));
    normalizeRotationMode();
    migrateBalance();
  } catch (error) {
    console.warn("Failed to load saved balance", error);
  }
}

function normalizeRotationMode() {
  // Switch mode is authoritative so stale saved settings cannot leave the old
  // hero-specific arcs active while the 120-degree controls are visible.
  if (balance.rotationSwitchMode) {
    balance.rotationFreeMode = false;
  } else if (!balance.rotationFreeMode) {
    balance.rotationFreeMode = true;
  }
}

function migrateBalance() {
  const wall = balance.heroes.wall;
  if (wall.wallPlaceDistance === 42) wall.wallPlaceDistance = 78;
  if (wall.wallArcDegrees == null) wall.wallArcDegrees = 104;
  if (wall.wallDuration == null) wall.wallDuration = 10;
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key]) {
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

const cardPool = [
  { role: "attack", title: "공격 속도 증가", text: "공격형 발사 간격 감소", apply: () => upgrades.attackRate *= balance.upgrades.attackRateMultiplier },
  { role: "attack", title: "동시 발사 +1", text: "공격형 projectile 수 +1", apply: () => upgrades.attackShots += 1 },
  { role: "attack", title: "공격 데미지 증가", text: "공격형 데미지 증가", apply: () => upgrades.attackDamage *= balance.upgrades.attackDamageMultiplier },
  { role: "attack", title: "관통 화살", text: "공격형 projectile 관통 +1", apply: () => upgrades.attackPierce += 1 },
  { role: "attack", title: "처치 시 추가 발사", text: "공격형 처치 보너스 활성화", apply: () => upgrades.attackOnKill = true },

  { role: "area", title: "광역 데미지 증가", text: "광역형 스킬 데미지 증가", apply: () => upgrades.areaDamage *= balance.upgrades.areaDamageMultiplier },
  { role: "area", title: "쿨다운 단축", text: "광역형 스킬 쿨다운 감소", apply: () => upgrades.areaCooldown *= balance.upgrades.areaCooldownMultiplier },
  { role: "area", title: "범위 증가", text: "광역형 폭발 반경 증가", apply: () => upgrades.areaRadius *= balance.upgrades.areaRadiusMultiplier },
  { role: "area", title: "추가 projectile", text: "광역형 약한 기본 공격 +1", apply: () => upgrades.areaShots += 1 },
  { role: "area", title: "중심부 추가 피해", text: "폭발 중심 근처 피해 증가", apply: () => upgrades.areaCenterBonus += balance.upgrades.areaCenterBonusAdd },

  { role: "wall", title: "벽 HP 증가", text: "방어벽 HP 증가", apply: () => upgrades.wallHp *= balance.upgrades.wallHpMultiplier },
  { role: "wall", title: "충돌 피해 추가", text: "벽 충돌 피해 증가", apply: () => upgrades.wallContactDamage *= balance.upgrades.wallContactDamageMultiplier },
  { role: "wall", title: "벽 넓이 증가", text: "방어벽 길이 증가", apply: () => upgrades.wallWidth *= balance.upgrades.wallWidthMultiplier },
  { role: "wall", title: "벽 개수 증가", text: "방어벽을 추가로 생성", apply: () => upgrades.wallCount += 1 },
  { role: "wall", title: "파괴 시 폭발", text: "벽 파괴 폭발 활성화", apply: () => upgrades.wallExplode = true },
];

let state;
let upgrades;
let lastTime = performance.now();
let rotationDrag = null;
let nextEnemyId = 1;

function resetGame() {
  nextEnemyId = 1;
  upgrades = {
    attackRate: 1,
    attackShots: 1,
    attackDamage: 1,
    attackPierce: 0,
    attackOnKill: false,
    areaDamage: 1,
    areaCooldown: 1,
    areaRadius: 1,
    areaShots: 1,
    areaCenterBonus: 0,
    wallHp: 1,
    wallContactDamage: 1,
    wallWidth: 1,
    wallCount: 1,
    wallExplode: false,
  };

  state = {
    running: false,
    started: false,
    paused: false,
    pausedForCards: false,
    gameOver: false,
    time: 0,
    coreHp: balance.coreHp,
    coreHpMax: balance.coreHp,
    exp: 0,
    expNeed: balance.coreExpNeed,
    level: 1,
    heroes: [
      makeHero("attack", "공격형", 0),
      makeHero("area", "광역형", 1),
      makeHero("wall", "방어형", 2),
    ],
    enemies: [],
    projectiles: [],
    effects: [],
    expOrbs: [],
    walls: [],
    spawnTimer: 0,
    waveIndex: 0,
    bossSpawned: false,
    boss: null,
    kills: 0,
    rotationAngle: 0,
    rotationActive: false,
    linkCharge: { attack: 0, area: 0, wall: 0 },
    coreLink: {
      active: false,
      time: 0,
      duration: balance.coreLink.beamDuration,
      targets: [],
    },
  };

  ui.cardOverlay.classList.add("hidden");
  ui.resultOverlay.classList.add("hidden");
  ui.startButton.textContent = "전투 시작";
  ui.pauseButton.textContent = "일시정지";
  ui.pauseButton.dataset.paused = "false";
  lastTime = performance.now();
  updateUi();
}

function makeHero(type, name, slot) {
  const maxHp = balance.heroes[type].hp;
  return {
    type,
    name,
    slot,
    hp: maxHp,
    maxHp,
    cooldown: 0,
    skillCooldown: 0,
    skillTimer: 0,
    level: 1,
    drawAngle: slotAngles[slot],
    fromAngle: slotAngles[slot],
    toAngle: slotAngles[slot],
    rotateT: 1,
  };
}

function heroPos(hero) {
  const angle = slotAngles[hero.slot] + state.rotationAngle;
  return {
    x: center.x + Math.cos(angle) * 112,
    y: center.y + Math.sin(angle) * 88,
    angle,
  };
}

function heroDrawPos(hero) {
  const angle = slotAngles[hero.slot] + state.rotationAngle;
  hero.drawAngle = angle;
  return {
    x: center.x + Math.cos(angle) * 112,
    y: center.y + Math.sin(angle) * 88,
    angle,
  };
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function pointerAngle(point) {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

function angleDelta(current, previous) {
  return Math.atan2(Math.sin(current - previous), Math.cos(current - previous));
}

function livingLinkRoles() {
  return state.heroes.filter(hero => hero.hp > 0).map(hero => hero.type);
}

function coreLinkReady() {
  const roles = livingLinkRoles();
  return roles.length > 0 && roles.every(role => state.linkCharge[role] >= 100);
}

function gainLinkCharge(role, amount) {
  if (state.coreLink.active) return;
  state.linkCharge[role] = Math.min(100, state.linkCharge[role] + amount);
  if (state.linkCharge[role] >= 100) addEffect(center.x, center.y, "ring", heroColors[role]);
}

function activateCoreLink() {
  if (!state.running || state.paused || state.pausedForCards || state.gameOver || state.coreLink.active || !coreLinkReady()) return;
  const targets = state.enemies.filter(enemy => enemy.delay <= 0 && enemy.hp > 0);
  if (!targets.length) {
    addEffect(center.x, center.y - 105, "text", "#ffffff", 30, "공격할 적 없음");
    return;
  }
  state.coreLink = {
    active: true,
    time: balance.coreLink.beamDuration,
    duration: balance.coreLink.beamDuration,
    targets: targets.map(enemy => ({ x: enemy.x, y: enemy.y, radius: enemy.radius })),
  };
  for (const role of Object.keys(state.linkCharge)) state.linkCharge[role] = 0;
  for (const enemy of targets) {
    damageEnemy(enemy, enemy.type === "boss" ? balance.coreLink.bossDamage : balance.coreLink.normalDamage);
    addEffect(enemy.x, enemy.y, "lightning", "#f2dcff", Math.max(70, enemy.radius * 3));
  }
  addEffect(center.x, center.y, "ring", "#ffffff", 110);
  addEffect(center.x, center.y - 105, "text", "#f2dcff", 30, "코어 출격");
}

function beginRotation(event) {
  event.preventDefault();
  if (state.paused || state.pausedForCards || state.gameOver) return;
  const point = canvasPoint(event);
  const radius = distance(point, center);
  if (radius < 58) {
    activateCoreLink();
    return;
  }
  if (radius > 390) return;
  rotationDrag = { pointerId: event.pointerId, lastAngle: pointerAngle(point) };
  state.rotationActive = true;
  try { canvas.setPointerCapture(event.pointerId); } catch {}
}

function moveRotation(event) {
  if (!rotationDrag || event.pointerId !== rotationDrag.pointerId) return;
  event.preventDefault();
  if (isSwitchRotationMode()) return;
  const current = pointerAngle(canvasPoint(event));
  state.rotationAngle += angleDelta(current, rotationDrag.lastAngle) * balance.rotationSensitivity;
  rotationDrag.lastAngle = current;
}

function endRotation(event) {
  if (!rotationDrag || event.pointerId !== rotationDrag.pointerId) return;
  event.preventDefault();
  rotationDrag = null;
  state.rotationActive = false;
}

canvas.addEventListener("pointerdown", beginRotation);
window.addEventListener("pointermove", moveRotation, { passive: false });
window.addEventListener("pointerup", endRotation, { passive: false });
window.addEventListener("pointercancel", endRotation, { passive: false });
document.addEventListener("contextmenu", event => {
  if (event.target.closest?.(".phone")) event.preventDefault();
});
ui.startButton.addEventListener("click", startCombat);
ui.pauseButton.addEventListener("click", togglePause);
ui.rotateLeftButton.addEventListener("click", () => rotateBySwitch(-1));
ui.rotateRightButton.addEventListener("click", () => rotateBySwitch(1));
ui.quickRestartButton.addEventListener("click", () => {
  resetGame();
  startCombat();
});
ui.restartButton.addEventListener("click", () => {
  resetGame();
  startCombat();
});
ui.debugToggle.addEventListener("click", () => ui.debugPanel.classList.toggle("hidden"));
ui.debugClose.addEventListener("click", () => ui.debugPanel.classList.add("hidden"));
ui.saveBalanceButton.addEventListener("click", saveBalance);
ui.copyBalanceButton.addEventListener("click", copyBalance);
ui.coreLinkButton.addEventListener("click", activateCoreLink);

if (new URLSearchParams(window.location.search).has("debug")) {
  window.addEventListener("keydown", event => {
    if (event.key.toLowerCase() === "l") {
      state.linkCharge.attack = 100;
      state.linkCharge.area = 100;
      state.linkCharge.wall = 100;
    }
    if (event.key.toLowerCase() === "m") {
      for (let direction = 0; direction < 3; direction += 1) spawnEnemy("medium", 0, direction * TAU / 3);
    }
  });
}

function startCombat() {
  if (state.gameOver) resetGame();
  state.running = true;
  state.started = true;
  state.paused = false;
  ui.startButton.textContent = "진행 중";
  ui.pauseButton.textContent = "일시정지";
  ui.pauseButton.dataset.paused = "false";
}

function togglePause() {
  if (!state.started || state.gameOver || state.pausedForCards) return;
  state.paused = !state.paused;
  rotationDrag = null;
  state.rotationActive = false;
  ui.pauseButton.textContent = state.paused ? "계속하기" : "일시정지";
  ui.pauseButton.dataset.paused = String(state.paused);
}

function isSwitchRotationMode() {
  return Boolean(balance.rotationSwitchMode);
}

function activeArcDegrees(hero) {
  return isSwitchRotationMode() ? 120 : balance.heroes[hero.type].arcDegrees;
}

function rotateBySwitch(direction) {
  if (!isSwitchRotationMode() || !state.running || state.paused || state.pausedForCards || state.gameOver) return;
  state.rotationAngle += direction * TAU / 3;
  state.rotationActive = true;
  addEffect(center.x, center.y, "ring", "#d9c2ff", 78);
  window.setTimeout(() => {
    if (state) state.rotationActive = false;
  }, 180);
}

async function saveBalance() {
  localStorage.setItem("rotationDefenseV2.balance", JSON.stringify(balance, null, 2));
  try {
    const response = await fetch("/save-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(balance),
    });
    if (!response.ok) throw new Error("save failed");
    addEffect(center.x, center.y - 150, "text", "#7de1ff", "CODE SAVED");
  } catch {
    addEffect(center.x, center.y - 150, "text", "#7de1ff", "BROWSER SAVED");
  }
}

async function copyBalance() {
  const text = `const balance = ${JSON.stringify(balance, null, 2)};`;
  try {
    await navigator.clipboard.writeText(text);
    addEffect(center.x, center.y - 150, "text", "#ffd457", "BALANCE COPIED");
  } catch {
    console.log(text);
    addEffect(center.x, center.y - 150, "text", "#ffd457", "SEE CONSOLE");
  }
}

function blockingHeroForEnemy(enemy) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const hero of state.heroes) {
    if (hero.hp <= 0) continue;
    const pos = heroPos(hero);
    const gap = distance(enemy, pos);
    if (gap < enemy.radius + 25 && gap < nearestDistance) {
      nearest = { type: "hero", hero, x: pos.x, y: pos.y, radius: 25 };
      nearestDistance = gap;
    }
  }
  return nearest;
}

function update(dt) {
  if (!state.running || state.paused || state.pausedForCards || state.gameOver) return;

  state.time += dt;
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    spawnAmbient();
    state.spawnTimer = Math.max(balance.ambientMinInterval, balance.ambientBaseInterval - state.time * balance.ambientRamp);
  }

  spawnScriptedWaves();
  updateHeroes(dt);
  updateCoreLink(dt);
  updateProjectiles(dt);
  updateWalls(dt);
  updateEnemies(dt);
  updateExpOrbs(dt);
  updateEffects(dt);
  checkEndStates();
}

function updateCoreLink(dt) {
  const link = state.coreLink;
  if (!link.active) return;
  link.time -= dt;
  if (link.time <= 0) {
    link.active = false;
    link.time = 0;
    link.targets = [];
  }
}

function spawnScriptedWaves() {
  const waves = [
    { t: 20, type: "medium", count: balance.waves.medium1Count },
    { t: 38, type: "group", count: balance.waves.group1Count },
    { t: 55, type: "rush", count: balance.waves.rush1Count },
    { t: 76, type: "group", count: balance.waves.group2Count },
    { t: 95, type: "medium", count: balance.waves.medium2Count },
    { t: 112, type: "rush", count: balance.waves.rush2Count },
  ];

  while (state.waveIndex < waves.length && state.time >= waves[state.waveIndex].t) {
    const wave = waves[state.waveIndex];
    const waveAngle = Math.random() * TAU;
    for (let i = 0; i < wave.count; i += 1) {
      spawnEnemy(wave.type, i * 0.35, waveAngle + (Math.random() - 0.5) * 0.24);
    }
    state.waveIndex += 1;
  }

  if (!state.bossSpawned && state.time >= balance.waves.bossTime) {
    const boss = spawnEnemy("boss", 0);
    state.boss = boss;
    state.bossSpawned = true;
    addEffect(center.x, center.y - 120, "text", "#ff6b4d", "BOSS");
  }
}

function spawnAmbient() {
  const roll = Math.random();
  if (state.time < 24) {
    spawnEnemy(roll < 0.82 ? "small" : "medium", 0);
  } else if (state.time < 86) {
    spawnEnemy(roll < 0.68 ? "small" : roll < 0.86 ? "group" : "medium", 0);
  } else if (!state.bossSpawned) {
    spawnEnemy(roll < 0.55 ? "small" : roll < 0.75 ? "group" : roll < 0.9 ? "rush" : "medium", 0);
  } else {
    spawnEnemy(roll < 0.78 ? "small" : "group", 0);
  }
}

function spawnEnemy(type, delay = 0, entryAngle = Math.random() * TAU) {
  if (type === "group") {
    for (let i = 0; i < balance.groupPackSize; i += 1) {
      spawnEnemyInstance("group", entryAngle, delay + i * 0.08, (i - (balance.groupPackSize - 1) / 2) * balance.groupSpacing);
    }
    return null;
  }
  return spawnEnemyInstance(type, entryAngle, delay, 0);
}

function spawnEnemyInstance(type, entryAngle, delay, offset) {
  const def = balance.enemies[type];
  const spawnRx = arena.rx * 1.34;
  const spawnRy = arena.ry * 1.34;
  const spawn = {
    x: center.x + Math.cos(entryAngle) * spawnRx,
    y: center.y + Math.sin(entryAngle) * spawnRy,
  };
  const tangentRaw = { x: -spawnRx * Math.sin(entryAngle), y: spawnRy * Math.cos(entryAngle) };
  const tangentLength = Math.hypot(tangentRaw.x, tangentRaw.y) || 1;
  const tangent = { x: tangentRaw.x / tangentLength, y: tangentRaw.y / tangentLength };
  const radialRaw = { x: spawn.x - center.x, y: spawn.y - center.y };
  const radialLength = Math.hypot(radialRaw.x, radialRaw.y) || 1;
  const radial = { x: radialRaw.x / radialLength, y: radialRaw.y / radialLength };
  const randomSpread = (Math.random() - 0.5) * balance.spawnJitter;
  const depthJitter = (Math.random() - 0.5) * balance.spawnJitter * 0.45;
  const enemy = {
    id: nextEnemyId++,
    type,
    entryAngle,
    x: spawn.x + tangent.x * (offset + randomSpread) + radial.x * depthJitter,
    y: spawn.y + tangent.y * (offset + randomSpread) + radial.y * depthJitter,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    radius: def.radius,
    exp: def.exp,
    damage: def.damage,
    color: def.color,
    delay,
    hitFlash: 0,
    attackCooldown: 0,
    linkSlow: 0,
  };
  state.enemies.push(enemy);
  return enemy;
}

function updateHeroes(dt) {
  for (const hero of state.heroes) {
    hero.cooldown -= dt;
    hero.skillCooldown -= dt;
    hero.skillTimer += dt;
    if (hero.hp <= 0) continue;

    if (hero.type === "attack") updateAttackHero(hero, dt);
    if (hero.type === "area") updateAreaHero(hero, dt);
    if (hero.type === "wall") updateWallHero(hero, dt);
  }
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerpAngle(from, to, t) {
  let delta = ((to - from + Math.PI) % TAU) - Math.PI;
  if (delta < -Math.PI) delta += TAU;
  return from + delta * t;
}

function enemiesForHero(hero) {
  const pos = heroPos(hero);
  const heroBalance = balance.heroes[hero.type];
  const halfArc = (activeArcDegrees(hero) * Math.PI) / 360;
  return state.enemies.filter(enemy => {
    if (enemy.delay > 0 || enemy.hp <= 0 || distance(enemy, pos) > heroBalance.range + enemy.radius) return false;
    const targetAngle = isSwitchRotationMode()
      ? Math.atan2(enemy.y - center.y, enemy.x - center.x)
      : Math.atan2(enemy.y - pos.y, enemy.x - pos.x);
    return Math.abs(angleDelta(targetAngle, pos.angle)) <= halfArc;
  });
}

function nearestEnemyForHero(hero) {
  return enemiesForHero(hero).sort((a, b) => distance(a, center) - distance(b, center))[0] || null;
}

function updateAttackHero(hero) {
  const heroBalance = balance.heroes.attack;
  const interval = heroBalance.attackInterval * upgrades.attackRate;
  if (hero.cooldown > 0) return;
  const target = nearestEnemyForHero(hero);
  if (!target) return;
  const pos = heroPos(hero);
  const shots = upgrades.attackShots;
  for (let i = 0; i < shots; i += 1) {
    const spread = (i - (shots - 1) / 2) * 0.12;
    fireProjectile(pos.x, pos.y, target, heroBalance.basicDamage * upgrades.attackDamage, heroBalance.projectileSpeed, heroColors.attack, upgrades.attackPierce, spread, "attack");
  }
  hero.cooldown = interval;

  if (hero.skillCooldown <= 0) {
    for (let i = 0; i < heroBalance.skillShots; i += 1) {
      const spread = (i - (heroBalance.skillShots - 1) / 2) * 0.075;
      fireProjectile(pos.x, pos.y, target, heroBalance.skillDamage * upgrades.attackDamage, heroBalance.projectileSpeed * 1.08, heroColors.attack, upgrades.attackPierce, spread, "attack-skill");
    }
    hero.skillCooldown = heroBalance.skillCooldown;
    gainLinkCharge("attack", balance.coreLink.skillCharge);
    addEffect(pos.x, pos.y, "ring", heroColors.attack);
  }
}

function updateAreaHero(hero) {
  const target = nearestEnemyForHero(hero);
  if (hero.cooldown <= 0 && target) {
    const pos = heroPos(hero);
    for (let i = 0; i < upgrades.areaShots; i += 1) {
      fireProjectile(pos.x, pos.y, target, balance.heroes.area.basicDamage, balance.heroes.area.projectileSpeed, heroColors.area, 0, i * 0.08, "area-basic");
    }
    hero.cooldown = balance.heroes.area.attackInterval;
  }

  const skillCd = balance.heroes.area.skillCooldown * upgrades.areaCooldown;
  if (hero.skillCooldown <= 0 && target) {
    const pos = heroPos(hero);
    fireProjectile(
      pos.x,
      pos.y,
      target,
      balance.heroes.area.skillDamage * upgrades.areaDamage,
      balance.heroes.area.skillProjectileSpeed,
      heroColors.area,
      0,
      0,
      "area-skill",
      {
        blastRadius: balance.heroes.area.skillRadius * upgrades.areaRadius,
        centerBonus: upgrades.areaCenterBonus,
      },
    );
    hero.skillCooldown = skillCd;
    gainLinkCharge("area", balance.coreLink.skillCharge);
  }
}

function updateWallHero(hero) {
  const target = nearestEnemyForHero(hero);
  if (hero.cooldown <= 0 && target) {
    const pos = heroPos(hero);
    fireProjectile(pos.x, pos.y, target, balance.heroes.wall.basicDamage, balance.heroes.wall.projectileSpeed, heroColors.wall, 0, 0, "wall-basic");
    hero.cooldown = balance.heroes.wall.attackInterval;
  }

  if (hero.skillCooldown <= 0 && enemiesForHero(hero).length > 0) {
    createWalls(hero);
    hero.skillCooldown = balance.heroes.wall.skillCooldown;
  }
}

function fireProjectile(x, y, target, damage, speed, color, pierce, spread, owner, extra = {}) {
  const angle = Math.atan2(target.y - y, target.x - x) + spread;
  state.projectiles.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    damage,
    radius: owner === "attack" || owner === "attack-skill" ? 7 : owner === "area-skill" ? 22 : owner === "area-basic" ? 14 : 6,
    color,
    pierce,
    owner,
    life: 1.5,
    ...extra,
  });
}

function areaBlast(x, y, radius, damage, centerBonus) {
  addEffect(x, y, "blast", heroColors.area, radius);
  for (const enemy of state.enemies) {
    if (enemy.delay > 0) continue;
    const dist = distance(enemy, { x, y });
    if (dist <= radius + enemy.radius) {
      const centerMultiplier = dist < radius * 0.45 ? 1 + centerBonus : 1;
      damageEnemy(enemy, damage * centerMultiplier);
    }
  }
}

function createWalls(hero) {
  const count = upgrades.wallCount;
  for (let i = 0; i < count; i += 1) {
    const wall = {
      owner: "wall",
      offset: 0,
      x: 0,
      y: 0,
      width: balance.heroes.wall.wallWidth * upgrades.wallWidth,
      hp: balance.heroes.wall.wallHp * upgrades.wallHp,
      maxHp: balance.heroes.wall.wallHp * upgrades.wallHp,
      angle: 0,
      life: balance.heroes.wall.wallDuration,
      maxLife: balance.heroes.wall.wallDuration,
      linkChargeGranted: false,
    };
    positionWallInFrontOfHero(wall, hero, i, count);
    state.walls.push(wall);
  }
  addEffect(center.x, center.y, "ring", heroColors.wall);
}

function positionWallInFrontOfHero(wall, hero, index, count) {
  const heroFront = heroPos(hero);
  const laneAngle = heroFront.angle;
  let distanceFromHero = balance.heroes.wall.wallPlaceDistance;
  const maxArc = Math.min((balance.heroes.wall.wallArcDegrees * Math.PI) / 180, (Math.PI * 2) / 3 - 0.12);
  const arcSpacing = count <= 1
    ? 0
    : Math.min(wall.width * 0.95 / Math.max(1, distanceFromHero), maxArc / (count - 1));
  const arcOffset = (index - (count - 1) / 2) * arcSpacing;
  const wallAngle = laneAngle + clamp(arcOffset, -maxArc / 2, maxArc / 2);
  let x = heroFront.x + Math.cos(wallAngle) * distanceFromHero;
  let y = heroFront.y + Math.sin(wallAngle) * distanceFromHero;
  let attempt = 0;
  while (state.walls.some(other => distance(other, { x, y }) < wall.width * 0.72) && attempt < 8) {
    distanceFromHero += 24;
    x = heroFront.x + Math.cos(wallAngle) * distanceFromHero;
    y = heroFront.y + Math.sin(wallAngle) * distanceFromHero;
    attempt += 1;
  }
  wall.offset = arcOffset;
  wall.x = x;
  wall.y = y;
  wall.angle = wallAngle;
}

function updateProjectiles(dt) {
  for (const p of state.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    for (const enemy of state.enemies) {
      if (enemy.delay > 0 || enemy.hp <= 0) continue;
      if (distance(p, enemy) < p.radius + enemy.radius) {
        if (p.owner === "area-skill") {
          areaBlast(p.x, p.y, p.blastRadius, p.damage, p.centerBonus);
          p.life = 0;
          break;
        }
        damageEnemy(enemy, p.damage, p.owner);
        p.pierce -= 1;
        if (p.pierce < 0) {
          p.life = 0;
          break;
        }
      }
    }
  }
  state.projectiles = state.projectiles.filter(p => p.life > 0 && p.x > -80 && p.x < W + 80 && p.y > -80 && p.y < H + 80);
}

function updateWalls(dt) {
  for (const wall of state.walls) {
    wall.life -= dt;
    for (const enemy of state.enemies) {
      if (enemy.delay > 0) continue;
      if (Math.abs(projectOntoWall(enemy, wall)) < wall.width / 2 && distance(enemy, wall) < enemy.radius + 22) {
        if (!wall.linkChargeGranted) {
          wall.linkChargeGranted = true;
          gainLinkCharge("wall", balance.coreLink.wallBlockCharge);
        }
        damageEnemy(enemy, balance.heroes.wall.wallContactDamage * upgrades.wallContactDamage * dt * 4);
        enemy.x += Math.cos(wall.angle) * 42 * dt;
        enemy.y += Math.sin(wall.angle) * 34 * dt;
        wall.hp -= enemy.type === "rush" ? 22 * dt : 9 * dt;
      }
    }
    if (wall.hp <= 0 && upgrades.wallExplode) {
      areaBlast(wall.x, wall.y, 54, 36, 0);
    }
  }
  state.walls = state.walls.filter(w => w.hp > 0 && w.life > 0);
}

function projectOntoWall(point, wall) {
  const tangent = { x: -Math.sin(wall.angle), y: Math.cos(wall.angle) };
  return (point.x - wall.x) * tangent.x + (point.y - wall.y) * tangent.y;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.delay -= dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.linkSlow = Math.max(0, (enemy.linkSlow || 0) - dt);
    if (enemy.delay > 0) continue;
    const blockingHero = blockingHeroForEnemy(enemy);
    const target = blockingHero || { type: "core", x: center.x, y: center.y, radius: 34 };
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const rushBoost = enemy.type === "rush" && distance(enemy, center) < 260 ? 1.35 : 1;
    const speedBoost = rushBoost * (enemy.linkSlow > 0 ? 0.45 : 1);
    if (!blockingHero) {
      enemy.x += Math.cos(angle) * enemy.speed * speedBoost * dt;
      enemy.y += Math.sin(angle) * enemy.speed * speedBoost * dt;
    }
    if (distance(enemy, target) < enemy.radius + target.radius && enemy.attackCooldown <= 0) {
      if (target.type === "hero") {
        target.hero.hp = Math.max(0, target.hero.hp - enemy.damage);
        addEffect(target.x, target.y, "hit", "#ff4f61");
        if (enemy.type === "boss") {
          enemy.attackCooldown = 1.2;
          enemy.x -= Math.cos(angle) * 35;
          enemy.y -= Math.sin(angle) * 28;
        } else {
          enemy.noExp = true;
          enemy.hp = 0;
        }
      } else {
        state.coreHp -= enemy.damage;
        enemy.noExp = true;
        enemy.hp = 0;
        addEffect(center.x, center.y, "hit", "#ff4f61");
      }
    }
  }

  const defeated = state.enemies.filter(enemy => enemy.hp <= 0 && distance(enemy, center) >= enemy.radius + 30);
  for (const enemy of defeated) {
    if (!enemy.noExp && enemy.exp > 0) spawnExp(enemy.x, enemy.y, enemy.exp);
    state.kills += 1;
    if (enemy.type === "boss") winGame();
    if (upgrades.attackOnKill && enemy.type !== "boss") {
      const attackHero = state.heroes.find(h => h.type === "attack");
      const target = attackHero?.hp > 0 ? nearestEnemyForHero(attackHero) : null;
      if (target) {
        const pos = heroPos(attackHero);
        fireProjectile(pos.x, pos.y, target, balance.heroes.attack.basicDamage * 0.7 * upgrades.attackDamage, balance.heroes.attack.projectileSpeed, heroColors.attack, upgrades.attackPierce, 0, "attack");
      }
    }
  }
  state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
}

function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.hitFlash = 0.08;
  addEffect(enemy.x, enemy.y, "spark", "#ffffff");
}

function spawnExp(x, y, amount) {
  state.expOrbs.push({ x, y, amount, t: 0 });
}

function updateExpOrbs(dt) {
  for (const orb of state.expOrbs) {
    orb.t += dt * 1.8;
    orb.x += (center.x - orb.x) * Math.min(1, dt * 3.8);
    orb.y += (center.y - orb.y) * Math.min(1, dt * 3.8);
    if (distance(orb, center) < 20) {
      state.exp += orb.amount;
      orb.t = 99;
      if (state.exp >= state.expNeed) triggerLevelUp();
    }
  }
  state.expOrbs = state.expOrbs.filter(orb => orb.t < 99);
}

function triggerLevelUp() {
  state.exp -= state.expNeed;
  state.expNeed = Math.round(state.expNeed * balance.coreExpGrowth);
  state.level += 1;
  if (!balance.levelUps.enabled) {
    addEffect(center.x, center.y, "text", "#ffffff", "CORE LV UP");
    updateUi();
    return;
  }
  const cards = randomCards(3);
  if (!cards.length) {
    addEffect(center.x, center.y, "text", "#ffffff", "CORE LV UP");
    updateUi();
    return;
  }
  state.pausedForCards = true;
  ui.cardOptions.innerHTML = "";
  for (const card of cards) {
    const button = document.createElement("button");
    button.className = `upgrade-card ${card.role}`;
    button.type = "button";
    button.innerHTML = `<h2>${card.title}</h2><p>${roleName(card.role)} - ${card.text}</p>`;
    button.addEventListener("click", () => {
      card.apply();
      const hero = state.heroes.find(h => h.type === card.role);
      hero.level += 1;
      state.pausedForCards = false;
      ui.cardOverlay.classList.add("hidden");
      addEffect(center.x, center.y, "text", heroColors[card.role], "LEVEL UP");
      updateUi();
    });
    ui.cardOptions.appendChild(button);
  }
  ui.cardOverlay.classList.remove("hidden");
}

function randomCards(count) {
  const copy = cardPool.filter(card => balance.levelUps[card.role]);
  const picks = [];
  while (picks.length < count && copy.length) {
    const index = Math.floor(Math.random() * copy.length);
    picks.push(copy.splice(index, 1)[0]);
  }
  return picks;
}

function roleName(role) {
  return role === "attack" ? "공격형" : role === "area" ? "광역형" : "방어형";
}

const debugSections = [
  {
    title: "조작",
    rows: [
      ["회전 민감도", "rotationSensitivity"],
      ["자유 회전 모드", "rotationFreeMode"],
      ["120도 스위치 모드", "rotationSwitchMode"],
    ],
  },
  {
    title: "코어 / 레벨",
    rows: [
      ["코어 체력", "coreHp"],
      ["레벨업 필요 경험치", "coreExpNeed"],
      ["필요 경험치 증가율", "coreExpGrowth"],
      ["한 판 제한 시간(초)", "levelDuration"],
      ["영웅이 받는 피해 비율", "heroDamageShare"],
    ],
  },
  {
    title: "코어 영웅 공격",
    rows: [
      ["궁수·마도사 스킬 충전량", "coreLink.skillCharge"],
      ["방어벽 첫 충돌 충전량", "coreLink.wallBlockCharge"],
      ["일반 적 피해", "coreLink.normalDamage"],
      ["보스 피해", "coreLink.bossDamage"],
      ["광선 연출 시간(초)", "coreLink.beamDuration"],
    ],
  },
  {
    title: "영웅 - 궁수",
    rows: [
      ["체력", "heroes.attack.hp"],
      ["기본 공격 피해", "heroes.attack.basicDamage"],
      ["기본 공격 간격(초)", "heroes.attack.attackInterval"],
      ["공격 사거리", "heroes.attack.range"],
      ["공격 범위 각도", "heroes.attack.arcDegrees"],
      ["필살기 화살 1발 피해", "heroes.attack.skillDamage"],
      ["필살기 충전 시간(초)", "heroes.attack.skillCooldown"],
      ["필살기 화살 수", "heroes.attack.skillShots"],
      ["투사체 속도", "heroes.attack.projectileSpeed"],
    ],
  },
  {
    title: "영웅 - 마도사",
    rows: [
      ["체력", "heroes.area.hp"],
      ["기본 공격 피해", "heroes.area.basicDamage"],
      ["기본 공격 간격(초)", "heroes.area.attackInterval"],
      ["공격 사거리", "heroes.area.range"],
      ["공격 범위 각도", "heroes.area.arcDegrees"],
      ["필살기 피해", "heroes.area.skillDamage"],
      ["필살기 충전 시간(초)", "heroes.area.skillCooldown"],
      ["필살기 폭발 반경", "heroes.area.skillRadius"],
      ["필살기 투사체 속도", "heroes.area.skillProjectileSpeed"],
    ],
  },
  {
    title: "영웅 - 수호자",
    rows: [
      ["체력", "heroes.wall.hp"],
      ["기본 공격 피해", "heroes.wall.basicDamage"],
      ["기본 공격 간격(초)", "heroes.wall.attackInterval"],
      ["공격 사거리", "heroes.wall.range"],
      ["공격 범위 각도", "heroes.wall.arcDegrees"],
      ["필살기 충전 시간(초)", "heroes.wall.skillCooldown"],
      ["방어벽 체력", "heroes.wall.wallHp"],
      ["방어벽 너비", "heroes.wall.wallWidth"],
      ["방어벽 충돌 피해", "heroes.wall.wallContactDamage"],
      ["영웅과 방어벽 거리", "heroes.wall.wallPlaceDistance"],
      ["방어벽 배치 각도", "heroes.wall.wallArcDegrees"],
      ["방어벽 유지 시간(초)", "heroes.wall.wallDuration"],
    ],
  },
  {
    title: "적 - 소형",
    rows: [["체력", "enemies.small.hp"], ["공격 피해", "enemies.small.damage"], ["이동 속도", "enemies.small.speed"], ["처치 경험치", "enemies.small.exp"]],
  },
  {
    title: "적 - 군집",
    rows: [["체력", "enemies.group.hp"], ["공격 피해", "enemies.group.damage"], ["이동 속도", "enemies.group.speed"], ["처치 경험치", "enemies.group.exp"]],
  },
  {
    title: "적 - 중형 / 돌진 / 보스",
    rows: [
      ["중형 체력", "enemies.medium.hp"],
      ["중형 공격 피해", "enemies.medium.damage"],
      ["중형 이동 속도", "enemies.medium.speed"],
      ["돌진 체력", "enemies.rush.hp"],
      ["돌진 공격 피해", "enemies.rush.damage"],
      ["돌진 이동 속도", "enemies.rush.speed"],
      ["돌진 처치 경험치", "enemies.rush.exp"],
      ["보스 체력", "enemies.boss.hp"],
      ["보스 공격 피해", "enemies.boss.damage"],
      ["보스 이동 속도", "enemies.boss.speed"],
    ],
  },
  {
    title: "웨이브 / 적 생성",
    rows: [
      ["최소 생성 간격(초)", "ambientMinInterval"],
      ["기본 생성 간격(초)", "ambientBaseInterval"],
      ["시간당 생성 가속", "ambientRamp"],
      ["생성 위치 퍼짐", "spawnJitter"],
      ["군집 한 무리 수", "groupPackSize"],
      ["군집 적 사이 간격", "groupSpacing"],
      ["1차 중형 수", "waves.medium1Count"],
      ["1차 군집 수", "waves.group1Count"],
      ["1차 돌진 수", "waves.rush1Count"],
      ["2차 군집 수", "waves.group2Count"],
      ["2차 중형 수", "waves.medium2Count"],
      ["2차 돌진 수", "waves.rush2Count"],
      ["보스 등장 시간(초)", "waves.bossTime"],
    ],
  },
  {
    title: "레벨업 카드 수치",
    rows: [
      ["스킬 레벨업 사용", "levelUps.enabled"],
      ["궁수 카드 사용", "levelUps.attack"],
      ["마도사 카드 사용", "levelUps.area"],
      ["수호자 카드 사용", "levelUps.wall"],
      ["궁수 공격 간격 배율", "upgrades.attackRateMultiplier"],
      ["궁수 피해 배율", "upgrades.attackDamageMultiplier"],
      ["마도사 피해 배율", "upgrades.areaDamageMultiplier"],
      ["마도사 충전 시간 배율", "upgrades.areaCooldownMultiplier"],
      ["마도사 폭발 반경 배율", "upgrades.areaRadiusMultiplier"],
      ["방어벽 체력 배율", "upgrades.wallHpMultiplier"],
      ["방어벽 피해 배율", "upgrades.wallContactDamageMultiplier"],
      ["방어벽 너비 배율", "upgrades.wallWidthMultiplier"],
    ],
  },
];

function buildDebugPanel() {
  ui.debugBody.innerHTML = '<p class="debug-note">값 변경은 즉시 반영됩니다. HP/초기값은 재시작하면 가장 깔끔하게 확인됩니다.</p>';
  for (const section of debugSections) {
    const wrap = document.createElement("section");
    wrap.className = "debug-section";
    wrap.innerHTML = `<h3>${section.title}</h3>`;
    for (const [label, path] of section.rows) {
      const row = document.createElement("label");
      row.className = "debug-row";
      const input = document.createElement("input");
      const current = getPath(balance, path);
      input.type = typeof current === "boolean" ? "checkbox" : "number";
      if (input.type === "checkbox") {
        input.checked = current;
      } else {
        input.step = path.includes("Multiplier") || path.includes("Growth") || path.includes("Interval") || path.includes("Ramp") || path.includes("Duration") || path.includes("Sensitivity") ? "0.01" : "1";
        input.value = current;
      }
      input.addEventListener("change", () => {
        setPath(balance, path, input.type === "checkbox" ? input.checked : Number(input.value));
        if (input.type === "checkbox" && input.checked && path === "rotationFreeMode") balance.rotationSwitchMode = false;
        if (input.type === "checkbox" && input.checked && path === "rotationSwitchMode") balance.rotationFreeMode = false;
        if (input.type === "checkbox" && !balance.rotationFreeMode && !balance.rotationSwitchMode) balance.rotationFreeMode = true;
        if (input.type === "checkbox" && (path === "rotationFreeMode" || path === "rotationSwitchMode")) buildDebugPanel();
        applyBalanceRuntime();
      });
      row.append(label, input);
      wrap.appendChild(row);
    }
    ui.debugBody.appendChild(wrap);
  }
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => acc[key], obj);
}

function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((acc, key) => acc[key], obj);
  target[last] = value;
}

function applyBalanceRuntime() {
  if (!state) return;
  state.coreHpMax = balance.coreHp;
  state.coreHp = Math.min(state.coreHp, state.coreHpMax);
  for (const hero of state.heroes) {
    const max = balance.heroes[hero.type].hp;
    const ratio = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1;
    hero.maxHp = max;
    hero.hp = Math.min(max, Math.max(1, ratio * max));
  }
  updateUi();
}

function addEffect(x, y, type, color, size = 30, text = "") {
  state.effects.push({ x, y, type, color, size, text, t: 0, life: type === "text" ? 1.3 : 0.42 });
}

function updateEffects(dt) {
  for (const effect of state.effects) effect.t += dt;
  state.effects = state.effects.filter(effect => effect.t < effect.life);
}

function checkEndStates() {
  if (state.coreHp <= 0) loseGame();
}

function winGame() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.running = false;
  ui.resultTitle.textContent = "Victory";
  ui.resultText.textContent = `보스 처치. 처치 수 ${state.kills}, 코어 HP ${Math.max(0, Math.round(state.coreHp))}/${state.coreHpMax}`;
  ui.resultOverlay.classList.remove("hidden");
}

function loseGame() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.running = false;
  ui.resultTitle.textContent = "Defeat";
  ui.resultText.textContent = `마력 코어가 파괴됨. 처치 수 ${state.kills}, 생존 시간 ${Math.round(state.time)}초`;
  ui.resultOverlay.classList.remove("hidden");
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawArena();
  drawHeroRanges();
  drawWalls();
  drawCore();
  drawEnemies();
  drawCoreLinkBeams();
  drawHeroes();
  drawProjectiles();
  drawExpOrbs();
  drawEffects();
  drawCoreHp();
  drawStartPrompt();
  drawPausePrompt();
}

function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#45c1d7");
  grd.addColorStop(0.32, "#154a60");
  grd.addColorStop(1, "#071016");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(5, 18, 24, 0.35)";
  for (let i = 0; i < 16; i += 1) {
    const x = (i * 127) % W;
    const y = 100 + ((i * 211) % (H - 170));
    ctx.beginPath();
    ctx.ellipse(x, y, 28 + (i % 3) * 12, 13 + (i % 2) * 8, i, 0, TAU);
    ctx.fill();
  }
}

function drawArena() {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.beginPath();
  ctx.ellipse(0, 0, arena.rx, arena.ry, 0, 0, TAU);
  ctx.fillStyle = "rgba(178, 222, 82, 0.64)";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(210, 255, 118, 0.78)";
  ctx.stroke();
  ctx.clip();

  ctx.restore();
}

function drawHeroRanges() {
  ctx.save();
  for (const hero of state.heroes) {
    if (hero.hp <= 0) continue;
    const pos = heroPos(hero);
    const heroBalance = balance.heroes[hero.type];
    const halfArc = (activeArcDegrees(hero) * Math.PI) / 360;
    ctx.fillStyle = `${heroColors[hero.type]}24`;
    ctx.strokeStyle = `${heroColors[hero.type]}a8`;
    ctx.lineWidth = state.rotationActive ? 4 : 2;
    ctx.beginPath();
    if (isSwitchRotationMode()) {
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, heroBalance.range, pos.angle - halfArc, pos.angle + halfArc);
    } else {
      ctx.moveTo(pos.x, pos.y);
      ctx.arc(pos.x, pos.y, heroBalance.range, pos.angle - halfArc, pos.angle + halfArc);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.translate(center.x, center.y);
  ctx.strokeStyle = state.rotationActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.34)";
  ctx.lineWidth = state.rotationActive ? 6 : 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 138, 108, 0, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 12; i += 1) {
    const angle = i * TAU / 12 + state.rotationAngle;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 126, Math.sin(angle) * 97);
    ctx.lineTo(Math.cos(angle) * 138, Math.sin(angle) * 108);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCore() {
  const hpRatio = Math.max(0, state.coreHp / state.coreHpMax);
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.shadowBlur = 28;
  ctx.shadowColor = "#78ffe2";
  const grd = ctx.createRadialGradient(-8, -10, 4, 0, 0, 48);
  grd.addColorStop(0, "#ffffff");
  grd.addColorStop(0.36, "#aef9ec");
  grd.addColorStop(1, "#2f9c90");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#12221f";
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(coreLinkReady() || state.coreLink.active ? "CORE" : `${Math.ceil(state.coreHp)}`, 0, 8);
  ctx.strokeStyle = hpRatio > 0.35 ? "#79ff92" : "#ff5668";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 55, -Math.PI / 2, -Math.PI / 2 + TAU * hpRatio);
  ctx.stroke();

  const roles = ["attack", "area", "wall"];
  roles.forEach((role, index) => {
    const start = -Math.PI / 2 + index * TAU / 3 + 0.08;
    const span = TAU / 3 - 0.16;
    const ratio = state.coreLink.active ? 1 : state.linkCharge[role] / 100;
    ctx.strokeStyle = "rgba(3, 12, 18, 0.72)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 67, start, start + span);
    ctx.stroke();
    ctx.strokeStyle = heroColors[role];
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 67, start, start + span * ratio);
    ctx.stroke();
  });

  if (state.coreLink.active) {
    const linkRatio = state.coreLink.time / state.coreLink.duration;
    ctx.strokeStyle = "#f2dcff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 77, -Math.PI / 2, -Math.PI / 2 + TAU * linkRatio);
    ctx.stroke();
  }

  if (coreLinkReady() || state.coreLink.active) {
    ctx.fillStyle = state.coreLink.active ? "#f2dcff" : "#ffffff";
    ctx.font = "950 14px system-ui";
    ctx.fillText(state.coreLink.active ? "출격!" : "탭하여 출격", 0, 92);
  }
  ctx.restore();
}

function drawCoreLinkBeams() {
  if (!state.coreLink.active) return;
  const elapsedRatio = 1 - state.coreLink.time / Math.max(0.01, state.coreLink.duration);
  const reach = Math.min(1, elapsedRatio * 3.4);
  const fade = Math.min(1, state.coreLink.time / Math.max(0.01, state.coreLink.duration) * 2.4);
  ctx.save();
  ctx.lineCap = "round";
  for (const [index, target] of state.coreLink.targets.entries()) {
    const x = center.x + (target.x - center.x) * reach;
    const y = center.y + (target.y - center.y) * reach;
    const pulse = 0.78 + Math.sin(state.time * 28 + index * 0.7) * 0.18;
    ctx.globalAlpha = 0.24 * pulse * fade;
    ctx.strokeStyle = "#b993ff";
    ctx.lineWidth = 20;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 0.96 * pulse * fade;
    ctx.strokeStyle = "#f7edff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    for (let particle = 0; particle < 3; particle += 1) {
      const progress = Math.min(reach, (elapsedRatio * 2.2 + particle / 3) % 1);
      ctx.globalAlpha = 0.95 * fade;
      ctx.fillStyle = particle === 1 ? "#b993ff" : "#ffffff";
      ctx.beginPath();
      ctx.arc(center.x + (target.x - center.x) * progress, center.y + (target.y - center.y) * progress, 5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawHeroes() {
  for (const hero of state.heroes) {
    const pos = heroDrawPos(hero);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = hero.hp > 0 ? 1 : 0.3;
    if (heroSpriteSheet.complete && heroSpriteSheet.naturalWidth > 0) {
      const sourceIndex = hero.type === "attack" ? 0 : hero.type === "area" ? 1 : 2;
      const sourceWidth = heroSpriteSheet.naturalWidth / 3;
      ctx.drawImage(heroSpriteSheet, sourceWidth * sourceIndex, 0, sourceWidth, heroSpriteSheet.naturalHeight, -34, -73, 68, 102);
    } else {
      ctx.fillStyle = heroColors[hero.type];
      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    const hpRatio = Math.max(0, hero.hp / hero.maxHp);
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    roundRect(-29, -69, 58, 8, 4);
    ctx.fill();
    ctx.fillStyle = hpRatio > 0.35 ? "#77ff7d" : "#ff5367";
    roundRect(-29, -69, 58 * hpRatio, 8, 4);
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.delay > 0) continue;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.fillStyle = enemy.hitFlash > 0 ? "#ffffff" : enemy.color;
    ctx.strokeStyle = "#103143";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (enemy.type === "rush") {
      ctx.fillStyle = "#fff2a0";
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius - 5);
      ctx.lineTo(7, -enemy.radius - 18);
      ctx.lineTo(-7, -enemy.radius - 18);
      ctx.fill();
    }
    if (enemy.type === "boss") {
      const ratio = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(-42, -52, 84, 10);
      ctx.fillStyle = "#ff4f61";
      ctx.fillRect(-42, -52, 84 * ratio, 10);
    }
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const p of state.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.owner === "attack" || p.owner === "attack-skill") {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "rgba(20, 14, 4, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-15, -6);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-15, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (p.owner === "area-basic") {
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 20, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (p.owner === "area-skill") {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 46, 28, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawStartPrompt() {
  if (state.started || state.gameOver) return;
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  roundRect(center.x - 190, center.y - 138, 380, 76, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "950 21px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("전투 시작 후 원을 따라 드래그", center.x, center.y - 94);
  ctx.restore();
}

function drawPausePrompt() {
  if (!state.paused || state.gameOver) return;
  ctx.save();
  ctx.fillStyle = "rgba(3, 8, 16, 0.58)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.font = "950 44px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("일시정지", center.x, center.y - 18);
  ctx.font = "800 21px system-ui";
  ctx.fillText("상단의 계속하기 버튼을 누르세요", center.x, center.y + 28);
  ctx.restore();
}

function drawWalls() {
  for (const wall of state.walls) {
    ctx.save();
    ctx.translate(wall.x, wall.y);
    ctx.rotate(wall.angle + Math.PI / 2);
    ctx.fillStyle = "rgba(157, 255, 130, 0.78)";
    ctx.strokeStyle = "#173b25";
    ctx.lineWidth = 5;
    roundRect(-wall.width / 2, -13, wall.width, 26, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-wall.width / 2, -22, wall.width * Math.max(0, wall.hp / wall.maxHp), 5);
    ctx.restore();
  }
}

function drawExpOrbs() {
  for (const orb of state.expOrbs) {
    ctx.fillStyle = "#fff3a5";
    ctx.strokeStyle = "#d6a51f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 7, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function drawEffects() {
  for (const e of state.effects) {
    const p = e.t / e.life;
    ctx.save();
    ctx.globalAlpha = 1 - p;
    ctx.strokeStyle = e.color;
    ctx.fillStyle = e.color;
    if (e.type === "ring") {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 55 + p * 90, 0, TAU);
      ctx.stroke();
    } else if (e.type === "blast") {
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * (0.4 + p * 0.8), 0, TAU);
      ctx.stroke();
    } else if (e.type === "hit" || e.type === "spark") {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8 + p * 20, 0, TAU);
      ctx.fill();
    } else if (e.type === "lightning") {
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(e.x - 18, e.y - 28);
      ctx.lineTo(e.x + 10, e.y - 8);
      ctx.lineTo(e.x - 4, e.y + 16);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
    } else if (e.type === "text") {
      ctx.font = "950 42px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(e.text, e.x, e.y - p * 40);
    }
    ctx.restore();
  }
}

function drawCoreHp() {
  const progress = Math.min(1, state.time / balance.levelDuration);
  ui.levelProgressFill.style.height = `${progress * 100}%`;
}

function updateUi() {
  ui.coreExpFill.style.width = `${Math.min(100, (state.exp / state.expNeed) * 100)}%`;
  ui.levelProgressFill.style.height = `${Math.min(100, (state.time / balance.levelDuration) * 100)}%`;
  ui.levelLabel.textContent = `Lv.${state.level}`;
  const attack = state.heroes.find(h => h.type === "attack");
  const area = state.heroes.find(h => h.type === "area");
  const wall = state.heroes.find(h => h.type === "wall");
  ui.attackLevel.textContent = `Lv.${attack.level}`;
  ui.areaLevel.textContent = `Lv.${area.level}`;
  ui.wallLevel.textContent = `Lv.${wall.level}`;
  ui.attackHp.style.width = `${Math.max(0, Math.min(100, (attack.hp / attack.maxHp) * 100))}%`;
  ui.areaHp.style.width = `${Math.max(0, Math.min(100, (area.hp / area.maxHp) * 100))}%`;
  ui.wallHp.style.width = `${Math.max(0, Math.min(100, (wall.hp / wall.maxHp) * 100))}%`;
  setCharge(ui.attackCharge, 1 - Math.max(0, attack.skillCooldown) / Math.max(0.1, balance.heroes.attack.skillCooldown), heroColors.attack);
  setCharge(ui.areaCharge, 1 - Math.max(0, area.skillCooldown) / Math.max(0.1, balance.heroes.area.skillCooldown * upgrades.areaCooldown), heroColors.area);
  setCharge(ui.wallCharge, 1 - Math.max(0, wall.skillCooldown) / Math.max(0.1, balance.heroes.wall.skillCooldown), heroColors.wall);
  const linkReady = coreLinkReady();
  ui.coreLinkButton.disabled = !linkReady || state.coreLink.active || state.paused || state.pausedForCards || state.gameOver;
  ui.coreLinkButton.setAttribute("aria-label", state.coreLink.active ? "코어 영웅 공격 중" : linkReady ? "코어 영웅 출격 준비됨" : "코어 영웅 충전 중");
  ui.coreLinkButton.dataset.ready = String(linkReady);
  ui.coreLinkButton.dataset.active = String(state.coreLink.active);
  ui.pauseButton.disabled = !state.started || state.gameOver || state.pausedForCards;
  const switchMode = isSwitchRotationMode();
  for (const button of [ui.rotateLeftButton, ui.rotateRightButton]) {
    button.dataset.visible = String(switchMode);
    button.disabled = !switchMode || !state.running || state.paused || state.pausedForCards || state.gameOver;
  }
}

function setCharge(el, ratio, color) {
  const deg = Math.max(0, Math.min(1, ratio)) * 360;
  el.style.background = `conic-gradient(${color} 0deg, ${color} ${deg}deg, rgba(0, 0, 0, 0.42) ${deg}deg 360deg)`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  updateUi();
  requestAnimationFrame(loop);
}

buildDebugPanel();
resetGame();
requestAnimationFrame(loop);
