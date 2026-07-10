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
};

const TAU = Math.PI * 2;
const W = canvas.width;
const H = canvas.height;
const center = { x: W * 0.5, y: H * 0.47 };
const arena = { rx: W * 0.43, ry: H * 0.22 };
const slotAngles = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6];
const laneSpawns = [
  { x: center.x, y: center.y - arena.ry * 1.35 },
  { x: center.x + arena.rx * 1.05, y: center.y + arena.ry * 0.6 },
  { x: center.x - arena.rx * 1.05, y: center.y + arena.ry * 0.6 },
];

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
  levelUps: {
    enabled: true,
    attack: true,
    area: true,
    wall: true,
  },
  heroes: {
    attack: { hp: 90, basicDamage: 34, attackInterval: 0.46, projectileSpeed: 560 },
    area: { hp: 82, basicDamage: 13, attackInterval: 0.82, skillDamage: 45, skillCooldown: 4.4, skillRadius: 62, projectileSpeed: 360, skillProjectileSpeed: 260 },
    wall: { hp: 120, basicDamage: 9, attackInterval: 1.05, skillCooldown: 5.2, projectileSpeed: 300, wallHp: 95, wallWidth: 72, wallContactDamage: 12, wallPlaceDistance: 78, wallArcDegrees: 104, wallDuration: 10 },
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
    const saved = localStorage.getItem("rotationDefense.balance");
    if (saved && !hasCodeOverrides) deepMerge(balance, JSON.parse(saved));
    migrateBalance();
  } catch (error) {
    console.warn("Failed to load saved balance", error);
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

function resetGame() {
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
  };

  ui.cardOverlay.classList.add("hidden");
  ui.resultOverlay.classList.add("hidden");
  ui.startButton.textContent = "전투 시작";
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
  const angle = slotAngles[hero.slot];
  return {
    x: center.x + Math.cos(angle) * 112,
    y: center.y + Math.sin(angle) * 88,
    angle,
  };
}

function heroDrawPos(hero) {
  const t = smoothstep(Math.min(1, hero.rotateT ?? 1));
  const angle = lerpAngle(hero.fromAngle ?? slotAngles[hero.slot], hero.toAngle ?? slotAngles[hero.slot], t);
  hero.drawAngle = angle;
  return {
    x: center.x + Math.cos(angle) * 112,
    y: center.y + Math.sin(angle) * 88,
    angle,
  };
}

function laneForHero(hero) {
  return hero.slot;
}

function rotateFormation(direction) {
  if (!state.running || state.pausedForCards || state.gameOver) return;
  for (const hero of state.heroes) {
    hero.fromAngle = hero.drawAngle ?? slotAngles[hero.slot];
    hero.slot = (hero.slot + direction + 3) % 3;
    hero.toAngle = slotAngles[hero.slot];
    hero.rotateT = 0;
  }
  addEffect(center.x, center.y, "ring", heroColors.wall);
}

function screenInput(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX ?? event.touches?.[0]?.clientX ?? 0) - rect.left;
  rotateFormation(x > rect.width / 2 ? 1 : -1);
}

canvas.addEventListener("pointerdown", screenInput);
ui.startButton.addEventListener("click", startCombat);
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

function startCombat() {
  if (state.gameOver) resetGame();
  state.running = true;
  state.started = true;
  ui.startButton.textContent = "진행 중";
}

async function saveBalance() {
  localStorage.setItem("rotationDefense.balance", JSON.stringify(balance, null, 2));
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

function damageHeroInLane(lane, amount) {
  const hero = state.heroes.find(candidate => candidate.slot === lane);
  if (!hero) return;
  hero.hp = Math.max(0, hero.hp - amount);
}

function livingHeroInLane(lane) {
  return state.heroes.find(hero => hero.slot === lane && hero.hp > 0);
}

function targetForEnemy(enemy) {
  const hero = livingHeroInLane(enemy.lane);
  if (hero) {
    const pos = heroPos(hero);
    return { type: "hero", hero, x: pos.x, y: pos.y, radius: 25 };
  }
  return { type: "core", x: center.x, y: center.y, radius: 34 };
}

function update(dt) {
  if (!state.running || state.pausedForCards || state.gameOver) return;

  state.time += dt;
  state.spawnTimer -= dt;

  if (state.spawnTimer <= 0) {
    spawnAmbient();
    state.spawnTimer = Math.max(balance.ambientMinInterval, balance.ambientBaseInterval - state.time * balance.ambientRamp);
  }

  spawnScriptedWaves();
  updateHeroes(dt);
  updateProjectiles(dt);
  updateWalls(dt);
  updateEnemies(dt);
  updateExpOrbs(dt);
  updateEffects(dt);
  checkEndStates();
}

function spawnScriptedWaves() {
  const waves = [
    { t: 20, type: "medium", lane: 1, count: balance.waves.medium1Count },
    { t: 38, type: "group", lane: 0, count: balance.waves.group1Count },
    { t: 55, type: "rush", lane: 2, count: balance.waves.rush1Count },
    { t: 76, type: "group", lane: 1, count: balance.waves.group2Count },
    { t: 95, type: "medium", lane: 0, count: balance.waves.medium2Count },
    { t: 112, type: "rush", lane: 1, count: balance.waves.rush2Count },
  ];

  while (state.waveIndex < waves.length && state.time >= waves[state.waveIndex].t) {
    const wave = waves[state.waveIndex];
    for (let i = 0; i < wave.count; i += 1) {
      spawnEnemy(wave.type, wave.lane, i * 0.35);
    }
    state.waveIndex += 1;
  }

  if (!state.bossSpawned && state.time >= balance.waves.bossTime) {
    const boss = spawnEnemy("boss", Math.floor(Math.random() * 3), 0);
    state.boss = boss;
    state.bossSpawned = true;
    addEffect(center.x, center.y - 120, "text", "#ff6b4d", "BOSS");
  }
}

function spawnAmbient() {
  const lane = Math.floor(Math.random() * 3);
  const roll = Math.random();
  if (state.time < 24) {
    spawnEnemy(roll < 0.82 ? "small" : "medium", lane, 0);
  } else if (state.time < 86) {
    spawnEnemy(roll < 0.68 ? "small" : roll < 0.86 ? "group" : "medium", lane, 0);
  } else if (!state.bossSpawned) {
    spawnEnemy(roll < 0.55 ? "small" : roll < 0.75 ? "group" : roll < 0.9 ? "rush" : "medium", lane, 0);
  } else {
    spawnEnemy(roll < 0.78 ? "small" : "group", lane, 0);
  }
}

function spawnEnemy(type, lane, delay) {
  if (type === "group") {
    for (let i = 0; i < balance.groupPackSize; i += 1) {
      spawnEnemyInstance("group", lane, delay + i * 0.08, (i - (balance.groupPackSize - 1) / 2) * balance.groupSpacing);
    }
    return null;
  }
  return spawnEnemyInstance(type, lane, delay, 0);
}

function spawnEnemyInstance(type, lane, delay, offset) {
  const def = balance.enemies[type];
  const spawn = laneSpawns[lane];
  const tangent = lane === 0 ? { x: 1, y: 0 } : { x: lane === 1 ? -0.45 : 0.45, y: 0.9 };
  const randomSpread = (Math.random() - 0.5) * balance.spawnJitter;
  const depthJitter = (Math.random() - 0.5) * balance.spawnJitter * 0.45;
  const enemy = {
    type,
    lane,
    x: spawn.x + tangent.x * (offset + randomSpread) + (spawn.x - center.x > 0 ? depthJitter : -depthJitter),
    y: spawn.y + tangent.y * (offset + randomSpread) + depthJitter,
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
  };
  state.enemies.push(enemy);
  return enemy;
}

function updateHeroes(dt) {
  for (const hero of state.heroes) {
    hero.rotateT = Math.min(1, (hero.rotateT ?? 1) + dt / 0.24);
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

function enemiesInLane(lane) {
  return state.enemies.filter(enemy => enemy.delay <= 0 && enemy.lane === lane);
}

function nearestEnemy(lane) {
  let best = null;
  let bestDist = Infinity;
  for (const enemy of enemiesInLane(lane)) {
    const dist = distance(enemy, center);
    if (dist < bestDist) {
      best = enemy;
      bestDist = dist;
    }
  }
  return best;
}

function updateAttackHero(hero) {
  const heroBalance = balance.heroes.attack;
  const interval = heroBalance.attackInterval * upgrades.attackRate;
  if (hero.cooldown > 0) return;
  const target = nearestEnemy(laneForHero(hero));
  if (!target) return;
  const pos = heroPos(hero);
  const shots = upgrades.attackShots;
  for (let i = 0; i < shots; i += 1) {
    const spread = (i - (shots - 1) / 2) * 0.12;
    fireProjectile(pos.x, pos.y, target, heroBalance.basicDamage * upgrades.attackDamage, heroBalance.projectileSpeed, heroColors.attack, upgrades.attackPierce, spread, "attack");
  }
  hero.cooldown = interval;
}

function updateAreaHero(hero) {
  const lane = laneForHero(hero);
  const target = nearestEnemy(lane);
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
  }
}

function updateWallHero(hero) {
  const lane = laneForHero(hero);
  const target = nearestEnemy(lane);
  if (hero.cooldown <= 0 && target) {
    const pos = heroPos(hero);
    fireProjectile(pos.x, pos.y, target, balance.heroes.wall.basicDamage, balance.heroes.wall.projectileSpeed, heroColors.wall, 0, 0, "wall-basic");
    hero.cooldown = balance.heroes.wall.attackInterval;
  }

  if (hero.skillCooldown <= 0 && enemiesInLane(lane).length > 0) {
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
    radius: owner === "attack" ? 7 : owner === "area-skill" ? 22 : owner === "area-basic" ? 14 : 6,
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
  const lane = hero.slot;
  const count = upgrades.wallCount;
  for (let i = 0; i < count; i += 1) {
    const wall = {
      owner: "wall",
      lane,
      offset: 0,
      x: 0,
      y: 0,
      width: balance.heroes.wall.wallWidth * upgrades.wallWidth,
      hp: balance.heroes.wall.wallHp * upgrades.wallHp,
      maxHp: balance.heroes.wall.wallHp * upgrades.wallHp,
      angle: 0,
      life: balance.heroes.wall.wallDuration,
      maxLife: balance.heroes.wall.wallDuration,
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
  while (state.walls.some(other => other.lane === hero.slot && distance(other, { x, y }) < wall.width * 0.72) && attempt < 8) {
    distanceFromHero += 24;
    x = heroFront.x + Math.cos(wallAngle) * distanceFromHero;
    y = heroFront.y + Math.sin(wallAngle) * distanceFromHero;
    attempt += 1;
  }
  wall.lane = hero.slot;
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
      if (enemy.delay > 0 || enemy.lane !== wall.lane) continue;
      if (Math.abs(projectOntoWall(enemy, wall)) < wall.width / 2 && distance(enemy, wall) < enemy.radius + 22) {
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
    if (enemy.delay > 0) continue;
    const target = targetForEnemy(enemy);
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const speedBoost = enemy.type === "rush" && distance(enemy, center) < 260 ? 1.35 : 1;
    enemy.x += Math.cos(angle) * enemy.speed * speedBoost * dt;
    enemy.y += Math.sin(angle) * enemy.speed * speedBoost * dt;
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
      const target = nearestEnemy(laneForHero(attackHero));
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
    title: "Core / Level",
    rows: [
      ["Core HP", "coreHp"],
      ["Core EXP Need", "coreExpNeed"],
      ["EXP Growth", "coreExpGrowth"],
      ["Level Duration", "levelDuration"],
      ["Hero Damage Share", "heroDamageShare"],
    ],
  },
  {
    title: "Hero - Attack",
    rows: [
      ["HP", "heroes.attack.hp"],
      ["Damage", "heroes.attack.basicDamage"],
      ["Cooldown", "heroes.attack.attackInterval"],
      ["Projectile Speed", "heroes.attack.projectileSpeed"],
    ],
  },
  {
    title: "Hero - Area",
    rows: [
      ["HP", "heroes.area.hp"],
      ["Basic Damage", "heroes.area.basicDamage"],
      ["Basic Cooldown", "heroes.area.attackInterval"],
      ["Skill Damage", "heroes.area.skillDamage"],
      ["Skill Cooldown", "heroes.area.skillCooldown"],
      ["Skill Radius", "heroes.area.skillRadius"],
      ["Skill Projectile Speed", "heroes.area.skillProjectileSpeed"],
    ],
  },
  {
    title: "Hero - Wall",
    rows: [
      ["HP", "heroes.wall.hp"],
      ["Basic Damage", "heroes.wall.basicDamage"],
      ["Basic Cooldown", "heroes.wall.attackInterval"],
      ["Skill Cooldown", "heroes.wall.skillCooldown"],
      ["Wall HP", "heroes.wall.wallHp"],
      ["Wall Width", "heroes.wall.wallWidth"],
      ["Wall Contact Damage", "heroes.wall.wallContactDamage"],
      ["Wall Place Distance", "heroes.wall.wallPlaceDistance"],
      ["Wall Arc Degrees", "heroes.wall.wallArcDegrees"],
      ["Wall Duration", "heroes.wall.wallDuration"],
    ],
  },
  {
    title: "Enemies - Small",
    rows: [["HP", "enemies.small.hp"], ["Damage", "enemies.small.damage"], ["Speed", "enemies.small.speed"], ["EXP", "enemies.small.exp"]],
  },
  {
    title: "Enemies - Group",
    rows: [["HP", "enemies.group.hp"], ["Damage", "enemies.group.damage"], ["Speed", "enemies.group.speed"], ["EXP", "enemies.group.exp"]],
  },
  {
    title: "Enemies - Medium / Rush / Boss",
    rows: [
      ["Medium HP", "enemies.medium.hp"],
      ["Medium Damage", "enemies.medium.damage"],
      ["Medium Speed", "enemies.medium.speed"],
      ["Rush HP", "enemies.rush.hp"],
      ["Rush Damage", "enemies.rush.damage"],
      ["Rush Speed", "enemies.rush.speed"],
      ["Rush EXP", "enemies.rush.exp"],
      ["Boss HP", "enemies.boss.hp"],
      ["Boss Damage", "enemies.boss.damage"],
      ["Boss Speed", "enemies.boss.speed"],
    ],
  },
  {
    title: "Waves / Spawn",
    rows: [
      ["Ambient Min Interval", "ambientMinInterval"],
      ["Ambient Base Interval", "ambientBaseInterval"],
      ["Ambient Ramp", "ambientRamp"],
      ["Spawn Randomness", "spawnJitter"],
      ["Group Pack Size", "groupPackSize"],
      ["Group Spacing", "groupSpacing"],
      ["Wave Medium 1 Count", "waves.medium1Count"],
      ["Wave Group 1 Count", "waves.group1Count"],
      ["Wave Rush 1 Count", "waves.rush1Count"],
      ["Wave Group 2 Count", "waves.group2Count"],
      ["Wave Medium 2 Count", "waves.medium2Count"],
      ["Wave Rush 2 Count", "waves.rush2Count"],
      ["Boss Time", "waves.bossTime"],
    ],
  },
  {
    title: "Level-Up Values",
    rows: [
      ["Skill Level-Up ON", "levelUps.enabled"],
      ["Attack Cards ON", "levelUps.attack"],
      ["Area Cards ON", "levelUps.area"],
      ["Wall Cards ON", "levelUps.wall"],
      ["Attack Rate Mult", "upgrades.attackRateMultiplier"],
      ["Attack Damage Mult", "upgrades.attackDamageMultiplier"],
      ["Area Damage Mult", "upgrades.areaDamageMultiplier"],
      ["Area Cooldown Mult", "upgrades.areaCooldownMultiplier"],
      ["Area Radius Mult", "upgrades.areaRadiusMultiplier"],
      ["Wall HP Mult", "upgrades.wallHpMultiplier"],
      ["Wall Damage Mult", "upgrades.wallContactDamageMultiplier"],
      ["Wall Width Mult", "upgrades.wallWidthMultiplier"],
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
        input.step = path.includes("Multiplier") || path.includes("Growth") || path.includes("Interval") || path.includes("Ramp") ? "0.01" : "1";
        input.value = current;
      }
      input.addEventListener("change", () => {
        setPath(balance, path, input.type === "checkbox" ? input.checked : Number(input.value));
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
  drawWalls();
  drawCore();
  drawEnemies();
  drawHeroes();
  drawProjectiles();
  drawExpOrbs();
  drawEffects();
  drawCoreHp();
  drawStartPrompt();
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

  const sectorColors = ["rgba(255, 210, 87, 0.10)", "rgba(125, 225, 255, 0.10)", "rgba(156, 255, 130, 0.10)"];
  for (let i = 0; i < 3; i += 1) {
    const a = slotAngles[i];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 390, a - Math.PI / 3, a + Math.PI / 3);
    ctx.closePath();
    ctx.fillStyle = sectorColors[i];
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a - Math.PI / 3) * 390, Math.sin(a - Math.PI / 3) * 390);
    ctx.strokeStyle = "rgba(245, 255, 216, 0.38)";
    ctx.lineWidth = 3;
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
  ctx.fillText(`${Math.ceil(state.coreHp)}`, 0, 8);
  ctx.strokeStyle = hpRatio > 0.35 ? "#79ff92" : "#ff5668";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 55, -Math.PI / 2, -Math.PI / 2 + TAU * hpRatio);
  ctx.stroke();
  ctx.restore();
}

function drawHeroes() {
  for (const hero of state.heroes) {
    const pos = heroDrawPos(hero);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = heroColors[hero.type];
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#161616";
    ctx.font = "950 18px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hero.type === "attack" ? "A" : hero.type === "area" ? "G" : "W", 0, 1);
    const hpRatio = Math.max(0, hero.hp / hero.maxHp);
    ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
    roundRect(-27, -42, 54, 8, 4);
    ctx.fill();
    ctx.fillStyle = hpRatio > 0.35 ? "#77ff7d" : "#ff5367";
    roundRect(-27, -42, 54 * hpRatio, 8, 4);
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
    if (p.owner === "attack") {
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
  roundRect(center.x - 150, center.y - 138, 300, 76, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "950 26px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("전투 시작을 눌러 테스트", center.x, center.y - 94);
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
  setCharge(ui.attackCharge, 1 - Math.max(0, attack.cooldown) / Math.max(0.1, balance.heroes.attack.attackInterval * upgrades.attackRate), heroColors.attack);
  setCharge(ui.areaCharge, 1 - Math.max(0, area.skillCooldown) / Math.max(0.1, balance.heroes.area.skillCooldown * upgrades.areaCooldown), heroColors.area);
  setCharge(ui.wallCharge, 1 - Math.max(0, wall.skillCooldown) / Math.max(0.1, balance.heroes.wall.skillCooldown), heroColors.wall);
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
