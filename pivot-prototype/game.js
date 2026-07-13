const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const BATTLE_BOTTOM = 1260;
const HERO_Y = 1110;
const CORE = { x: W / 2, y: 1212, radius: 42 };
const TAU = Math.PI * 2;
const SUPER_MIN_CHARGE = 30;
const SUPER_MAX_CHARGE = 150;
const SUPER_CHARGE_PER_READY_HERO = 1.8;
const SUPER_DRAIN_PER_SECOND = 56;

const heroSpriteSheet = new Image();
heroSpriteSheet.src = "assets/heroes-spritesheet.png";

const ui = {
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  restartButton: document.getElementById("restartButton"),
  overlayStartButton: document.getElementById("overlayStartButton"),
  startOverlay: document.getElementById("startOverlay"),
  resultOverlay: document.getElementById("resultOverlay"),
  resultTitle: document.getElementById("resultTitle"),
  resultEyebrow: document.getElementById("resultEyebrow"),
  resultCopy: document.getElementById("resultCopy"),
  resultRestartButton: document.getElementById("resultRestartButton"),
  stageProgress: document.getElementById("stageProgress"),
  timerLabel: document.getElementById("timerLabel"),
  levelLabel: document.getElementById("levelLabel"),
  expFill: document.getElementById("expFill"),
  dangerBanner: document.getElementById("dangerBanner"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  upgradeOverlay: document.getElementById("upgradeOverlay"),
  upgradeTitle: document.getElementById("upgradeTitle"),
  upgradeCards: document.getElementById("upgradeCards"),
  reviveCount: document.getElementById("reviveCount"),
  superButton: document.getElementById("superButton"),
  superFill: document.getElementById("superFill"),
  superState: document.getElementById("superState"),
  elixirSlots: [document.getElementById("elixirSlot0"), document.getElementById("elixirSlot1")],
  skillCards: [...document.querySelectorAll(".skill-card")],
  charges: {
    archer: document.getElementById("archerCharge"),
    mage: document.getElementById("mageCharge"),
    guardian: document.getElementById("guardianCharge"),
  },
  skillStates: {
    archer: document.getElementById("archerState"),
    mage: document.getElementById("mageState"),
    guardian: document.getElementById("guardianState"),
  },
};

const heroDefs = {
  archer: { name: "궁수", color: "#ffc84a", hp: 110, damage: 11, interval: 0.6, range: 720, skillTime: 9 },
  mage: { name: "마도사", color: "#5ed8ff", hp: 100, damage: 16, interval: 1.35, range: 650, skillTime: 12 },
  guardian: { name: "수호자", color: "#7fe083", hp: 170, damage: 8, interval: 0.9, range: 490, skillTime: 14 },
};

const enemyDefs = {
  small: { hp: 25, speed: 68, radius: 15, damage: 6, interval: 1, color: "#e5eff4", exp: 8, charge: 3 },
  swarm: { hp: 12, speed: 78, radius: 11, damage: 3, interval: 1, color: "#9ee7cc", exp: 4, charge: 1.5 },
  heavy: { hp: 120, speed: 46, radius: 24, damage: 20, interval: 1.4, color: "#a496d8", exp: 20, charge: 8 },
  rush: { hp: 45, speed: 64, radius: 17, damage: 6, interval: 1, color: "#ff836c", exp: 13, charge: 5 },
  ranged: { hp: 55, speed: 58, radius: 18, damage: 9, interval: 1.5, color: "#f39ac2", exp: 15, charge: 6 },
  boss: { hp: 1200, speed: 32, radius: 46, damage: 22, interval: 1.5, color: "#e24c68", exp: 0, charge: 0 },
};

const elixirDefs = {
  haste: { name: "신속", glyph: "≫", color: "#ffe066" },
  power: { name: "완력", glyph: "✦", color: "#ff8a72" },
  poison: { name: "독", glyph: "P", color: "#9ee35f" },
  fire: { name: "화염", glyph: "F", color: "#ff7048" },
  ice: { name: "냉기", glyph: "I", color: "#70d8ff" },
  lightning: { name: "번개", glyph: "Z", color: "#c6a7ff" },
};

const upgradeDefs = [
  { id: "archer-speed", group: "archer", icon: "A", title: "속사 훈련", copy: "궁수 기본 공격 속도 12% 증가", apply: () => { state.mods.interval.archer *= 0.88; } },
  { id: "archer-power", group: "archer", icon: "A", title: "강궁", copy: "궁수 기본 공격과 다중 화살 피해 15% 증가", apply: () => { state.mods.damage.archer *= 1.15; } },
  { id: "archer-volley", group: "archer", icon: "A", title: "화살비", copy: "다중 화살 발사 수 2개 증가", apply: () => { state.mods.archerArrows += 2; } },
  { id: "mage-power", group: "mage", icon: "M", title: "마력 증폭", copy: "마도사 기본 공격과 스킬 피해 15% 증가", apply: () => { state.mods.damage.mage *= 1.15; } },
  { id: "mage-area", group: "mage", icon: "M", title: "확장 마법진", copy: "대폭발과 지속 영역 범위 15% 증가", apply: () => { state.mods.mageRadius *= 1.15; } },
  { id: "mage-charge", group: "mage", icon: "M", title: "고속 영창", copy: "마도사 필살기 충전 시간 12% 감소", apply: () => reduceSkillTime("mage", 0.88) },
  { id: "guardian-vitality", group: "guardian", icon: "G", title: "불굴", copy: "수호자 최대 체력 20% 증가 및 회복", apply: () => growHeroHp("guardian", 1.2) },
  { id: "guardian-wall", group: "guardian", icon: "G", title: "강화 장벽", copy: "방어벽 체력 30% 증가", apply: () => { state.mods.wallHp *= 1.3; } },
  { id: "guardian-width", group: "guardian", icon: "G", title: "넓은 방벽", copy: "방어벽 너비 20% 증가", apply: () => { state.mods.wallWidth *= 1.2; } },
  { id: "core-charge", group: "core", icon: "C", title: "코어 공명", copy: "코어 링크 충전 속도 20% 증가", apply: () => { state.mods.superChargeRate *= 1.2; } },
  { id: "core-power", group: "core", icon: "C", title: "링크 증폭", copy: "코어 링크 피해 15% 증가", apply: () => { state.mods.superDamage *= 1.15; } },
  { id: "core-shield", group: "core", icon: "C", title: "마력 보호막", copy: "코어 최대 체력 35 증가 및 회복", apply: () => { state.coreHpMax += 35; state.coreHp += 35; } },
];

const upgradeColors = {
  archer: heroDefs.archer.color,
  mage: heroDefs.mage.color,
  guardian: heroDefs.guardian.color,
  core: "#c797ff",
};

let state;
let aim = null;
let lastTime = performance.now();
let nextEnemyId = 1;

function syncViewportHeight() {
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

syncViewportHeight();
window.addEventListener("resize", syncViewportHeight);
window.visualViewport?.addEventListener("resize", syncViewportHeight);
document.addEventListener("contextmenu", event => {
  if (event.target.closest?.(".game")) event.preventDefault();
});
document.addEventListener("selectionstart", event => {
  if (event.target.closest?.(".game")) event.preventDefault();
});
document.addEventListener("dragstart", event => {
  if (event.target.closest?.(".game")) event.preventDefault();
});

function makeHero(type, x) {
  const def = heroDefs[type];
  return {
    type,
    x,
    targetX: x,
    y: HERO_Y,
    hp: def.hp,
    maxHp: def.hp,
    alive: true,
    cooldown: 0,
    skill: 0,
    skillMax: def.skillTime,
    buff: null,
    buffTime: 0,
    invulnerable: 0,
    hitFlash: 0,
  };
}

function resetGame() {
  state = {
    running: false,
    started: false,
    paused: false,
    gameOver: false,
    time: 0,
    duration: 160,
    heroes: [makeHero("archer", 190), makeHero("mage", 360), makeHero("guardian", 530)],
    enemies: [],
    projectiles: [],
    walls: [],
    zones: [],
    effects: [],
    expDrops: [],
    elixirDrops: [],
    elixirs: [],
    coreHp: 220,
    coreHpMax: 220,
    exp: 0,
    expNeed: 90,
    level: 1,
    leveling: false,
    levelUpQueue: 0,
    upgradeLevels: {},
    mods: {
      damage: { archer: 1, mage: 1, guardian: 1 },
      interval: { archer: 1, mage: 1, guardian: 1 },
      archerArrows: 0,
      mageRadius: 1,
      wallHp: 1,
      wallWidth: 1,
      superChargeRate: 1,
      superDamage: 1,
    },
    superCharge: 0,
    reviveStones: 2,
    spawnTimer: 0.6,
    bossSpawned: false,
    boss: null,
    kills: 0,
  };
  aim = null;
  ui.startOverlay.classList.remove("hidden");
  ui.resultOverlay.classList.add("hidden");
  ui.pauseOverlay.classList.add("hidden");
  ui.upgradeOverlay.classList.add("hidden");
  ui.startButton.textContent = "전투 시작";
  ui.pauseButton.textContent = "Ⅱ";
  updateFormation(true);
  updateUi();
}

function startGame() {
  if (state.gameOver) resetGame();
  state.started = true;
  state.paused = false;
  state.running = true;
  ui.startOverlay.classList.add("hidden");
  ui.pauseOverlay.classList.add("hidden");
  ui.pauseButton.textContent = "Ⅱ";
  ui.startButton.textContent = "진행 중";
}

function restartGame() {
  resetGame();
  startGame();
}

function growHeroHp(type, multiplier) {
  const hero = state.heroes.find(candidate => candidate.type === type);
  if (!hero) return;
  const gain = Math.round(hero.maxHp * (multiplier - 1));
  hero.maxHp += gain;
  if (hero.alive) hero.hp = Math.min(hero.maxHp, hero.hp + gain);
}

function reduceSkillTime(type, multiplier) {
  const hero = state.heroes.find(candidate => candidate.type === type);
  if (!hero) return;
  hero.skillMax = Math.max(3, hero.skillMax * multiplier);
  hero.skill = Math.min(hero.skill, hero.skillMax);
}

function openUpgradeSelection() {
  if (state.gameOver || state.levelUpQueue <= 0) return;
  state.levelUpQueue -= 1;
  state.leveling = true;
  aim = null;
  const choices = [...upgradeDefs].sort(() => Math.random() - 0.5).slice(0, 3);
  ui.upgradeTitle.textContent = `CORE LV.${state.level} 업그레이드`;
  ui.upgradeCards.replaceChildren();

  for (const upgrade of choices) {
    const button = document.createElement("button");
    const currentLevel = state.upgradeLevels[upgrade.id] || 0;
    button.type = "button";
    button.className = "upgrade-card";
    button.style.setProperty("--upgrade-color", upgradeColors[upgrade.group]);
    button.innerHTML = `
      <span class="upgrade-icon">${upgrade.icon}</span>
      <span class="upgrade-copy"><b>${upgrade.title}</b><small>${upgrade.copy}</small></span>
      <span class="upgrade-level">LV.${currentLevel + 1}</span>
    `;
    button.addEventListener("click", () => chooseUpgrade(upgrade));
    ui.upgradeCards.append(button);
  }
  ui.upgradeOverlay.classList.remove("hidden");
}

function chooseUpgrade(upgrade) {
  if (!state.leveling) return;
  upgrade.apply();
  state.upgradeLevels[upgrade.id] = (state.upgradeLevels[upgrade.id] || 0) + 1;
  state.leveling = false;
  ui.upgradeOverlay.classList.add("hidden");
  addEffect(CORE.x, CORE.y - 70, "text", upgradeColors[upgrade.group], upgrade.title);
  if (state.levelUpQueue > 0) openUpgradeSelection();
}

function togglePause() {
  if (!state.started || state.leveling || state.gameOver) return;
  state.paused = !state.paused;
  aim = null;
  ui.pauseOverlay.classList.toggle("hidden", !state.paused);
  ui.pauseButton.textContent = state.paused ? "▶" : "Ⅱ";
  ui.pauseButton.title = state.paused ? "계속하기" : "일시정지";
  ui.pauseButton.setAttribute("aria-label", ui.pauseButton.title);
}

function aliveHeroes() {
  return state.heroes.filter(hero => hero.alive);
}

function updateFormation(immediate = false) {
  const alive = aliveHeroes();
  const positions = alive.length === 3 ? [185, 360, 535] : alive.length === 2 ? [260, 460] : alive.length === 1 ? [360] : [];
  alive.forEach((hero, index) => {
    hero.targetX = positions[index];
    if (immediate) hero.x = positions[index];
  });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function isBattlePoint(point) {
  return point.x >= 20 && point.x <= W - 20 && point.y >= 95 && point.y <= 1030;
}

function capturePointer(element, event) {
  try {
    element.setPointerCapture?.(event.pointerId);
  } catch {
    // Window-level pointer listeners keep the interaction alive on older iOS browsers.
  }
}

function beginSkillDrag(event, type, element) {
  event.preventDefault();
  if (!state.running || state.paused || state.leveling || state.gameOver || aim) return;
  const hero = state.heroes.find(candidate => candidate.type === type);
  if (!hero) return;
  if (!hero.alive) {
    if (state.reviveStones > 0) reviveHero(hero);
    return;
  }
  if (hero.skill < hero.skillMax) return;
  aim = { kind: "skill", type, point: canvasPoint(event), valid: false };
  capturePointer(element, event);
}

function beginElixirDrag(event, index, element) {
  event.preventDefault();
  if (!state.running || state.paused || state.leveling || aim || !state.elixirs[index]) return;
  aim = { kind: "elixir", index, elixir: state.elixirs[index], point: canvasPoint(event), valid: false };
  capturePointer(element, event);
}

function beginSuperHold(event) {
  event.preventDefault();
  if (!state.running || state.paused || state.leveling || state.gameOver || aim || state.superCharge < SUPER_MIN_CHARGE) return;
  aim = { kind: "superHold", pulseTimer: 0, target: null };
  capturePointer(ui.superButton, event);
}

function pointerMove(event) {
  if (!aim) return;
  event.preventDefault();
  aim.point = canvasPoint(event);
  if (aim.kind === "skill") aim.valid = isBattlePoint(aim.point);
  if (aim.kind === "elixir") aim.valid = heroAtPoint(aim.point) != null;
}

function pointerUp(event) {
  if (!aim) return;
  event.preventDefault();
  const current = aim;
  const point = canvasPoint(event);
  aim = null;
  if (current.kind === "skill" && isBattlePoint(point)) castHeroSkill(current.type, point);
  if (current.kind === "elixir") {
    const hero = heroAtPoint(point);
    if (hero) applyElixir(current.index, hero);
  }
}

function heroAtPoint(point) {
  return aliveHeroes().find(hero => Math.hypot(point.x - hero.x, point.y - hero.y) < 72) || null;
}

ui.skillCards.forEach(card => {
  card.addEventListener("pointerdown", event => beginSkillDrag(event, card.dataset.hero, card));
});

ui.elixirSlots.forEach((slot, index) => {
  slot.addEventListener("pointerdown", event => beginElixirDrag(event, index, slot));
});

ui.superButton.addEventListener("pointerdown", beginSuperHold);
window.addEventListener("pointermove", pointerMove, { passive: false });
window.addEventListener("pointerup", pointerUp, { passive: false });
window.addEventListener("pointercancel", pointerUp, { passive: false });
ui.startButton.addEventListener("click", startGame);
ui.overlayStartButton.addEventListener("click", startGame);
ui.pauseButton.addEventListener("click", togglePause);
ui.restartButton.addEventListener("click", restartGame);
ui.resultRestartButton.addEventListener("click", restartGame);

if (new URLSearchParams(window.location.search).has("debug")) {
  window.addEventListener("keydown", event => {
    if (["1", "2", "3"].includes(event.key)) {
      const hero = state.heroes[Number(event.key) - 1];
      if (hero?.alive) damageHero(hero, hero.maxHp * 2);
    }
    if (event.key.toLowerCase() === "s") state.superCharge = 150;
    if (event.key.toLowerCase() === "e" && state.elixirs.length < 2) state.elixirs.push("fire");
    if (event.key.toLowerCase() === "l" && !state.leveling) {
      state.level += 1;
      state.levelUpQueue += 1;
      openUpgradeSelection();
    }
  });
}

function reviveHero(hero) {
  state.reviveStones -= 1;
  hero.alive = true;
  hero.hp = hero.maxHp;
  hero.invulnerable = 1;
  hero.buff = null;
  hero.buffTime = 0;
  updateFormation();
  addEffect(hero.x, hero.y, "revive", heroDefs[hero.type].color, heroDefs[hero.type].name);
  for (const enemy of state.enemies) enemy.target = null;
}

function castHeroSkill(type, point) {
  const hero = state.heroes.find(candidate => candidate.type === type);
  if (!hero?.alive || hero.skill < hero.skillMax) return;
  hero.skill = 0;
  if (type === "guardian") {
    const wallHp = 180 * state.mods.wallHp;
    state.walls.push({ x: point.x, y: point.y, width: 190 * state.mods.wallWidth, hp: wallHp, maxHp: wallHp, life: 8, mini: false });
    addEffect(point.x, point.y, "wall", heroDefs.guardian.color);
  }
  if (type === "mage") {
    const radius = 108 * state.mods.mageRadius;
    blast(point.x, point.y, radius, 70 * state.mods.damage.mage, heroDefs.mage.color);
    state.zones.push({ x: point.x, y: point.y, radius, life: 3, tick: 0.5, damage: 5 * state.mods.damage.mage, color: heroDefs.mage.color });
  }
  if (type === "archer") {
    const nearby = activeEnemies().filter(enemy => distance(enemy, point) < 150).sort((a, b) => distance(a, point) - distance(b, point));
    if (!nearby.length) return;
    for (let i = 0; i < 7 + state.mods.archerArrows; i += 1) {
      const target = nearby[i % nearby.length];
      fireProjectile(hero.x, hero.y, target, 20 * state.mods.damage.archer, 760, heroDefs.archer.color, "arrow-skill");
    }
    addEffect(point.x, point.y, "target", heroDefs.archer.color);
  }
}

function applyElixir(index, hero) {
  const elixir = state.elixirs[index];
  if (!elixir) return;
  hero.buff = elixir;
  hero.buffTime = 12;
  state.elixirs.splice(index, 1);
  addEffect(hero.x, hero.y - 35, "text", elixirDefs[elixir].color, elixirDefs[elixir].name.toUpperCase());
}

function superTarget() {
  const enemies = activeEnemies();
  if (!enemies.length) return null;
  return enemies.reduce((best, enemy) => {
    const nearby = enemies.filter(other => distance(other, enemy) < 130).length;
    const danger = enemy.y / BATTLE_BOTTOM;
    const boss = enemy.type === "boss" ? 4 : 0;
    const score = nearby * 1.4 + danger * 3 + boss;
    return !best || score > best.score ? { enemy, score } : best;
  }, null).enemy;
}

function castSuperPulse(point) {
  const aliveTypes = new Set(aliveHeroes().map(hero => hero.type));
  const power = state.mods.superDamage;
  if (aliveTypes.has("guardian")) {
    damageInRadius(point, 48, 3 * power);
    slowInRadius(point, 60, 0.4, 1.5);
    state.walls.push({ x: point.x, y: point.y, width: 60, hp: 24, maxHp: 24, life: 1.2, mini: true });
  }
  if (aliveTypes.has("mage")) blast(point.x, point.y, 58, 9 * power, heroDefs.mage.color);
  if (aliveTypes.has("archer")) {
    const targets = activeEnemies().filter(enemy => distance(enemy, point) < 100).sort((a, b) => distance(a, point) - distance(b, point));
    for (let i = 0; i < Math.min(3, targets.length); i += 1) damageEnemy(targets[i], 5 * power);
    addEffect(point.x, point.y, "arrows", heroDefs.archer.color);
  }
  const coreTargets = activeEnemies().filter(enemy => distance(enemy, point) < 120).sort((a, b) => distance(a, point) - distance(b, point)).slice(0, 3);
  coreTargets.forEach(enemy => damageEnemy(enemy, 6 * power));
  addEffect(point.x, point.y, "lightning", heroDefs ? "#d7b0ff" : "#fff");
}

function activeEnemies() {
  return state.enemies.filter(enemy => enemy.delay <= 0 && enemy.hp > 0);
}

function update(dt) {
  if (!state.running || state.paused || state.leveling || state.gameOver) return;
  const gameDt = dt;
  state.time += gameDt;
  state.spawnTimer -= gameDt;

  if (aim?.kind === "superHold") {
    aim.target = superTarget();
    aim.pulseTimer -= dt;
    if (aim.target) {
      state.superCharge = Math.max(0, state.superCharge - SUPER_DRAIN_PER_SECOND * dt);
      if (aim.pulseTimer <= 0) {
        aim.pulseTimer = 0.18;
        castSuperPulse({ x: aim.target.x, y: aim.target.y });
      }
    }
    if (state.superCharge <= 0) aim = null;
  }

  if (!state.bossSpawned && state.time >= 135) spawnBoss();
  if (!state.bossSpawned && state.spawnTimer <= 0) {
    spawnWaveEnemy();
    state.spawnTimer = Math.max(0.45, 1.45 - state.time * 0.004);
  }

  updateHeroes(gameDt);
  updateProjectiles(gameDt);
  updateWalls(gameDt);
  updateZones(gameDt);
  updateEnemies(gameDt);
  updateDrops(gameDt);
  updateEffects(gameDt);

  if (state.coreHp <= 0) endGame(false);
}

function spawnWaveEnemy() {
  const t = state.time;
  const laneBias = Math.random();
  let type = "small";
  let count = 1;
  if (t < 20) {
    type = "small";
  } else if (t < 40) {
    type = Math.random() < 0.68 ? "swarm" : "small";
    count = type === "swarm" ? 3 : 1;
  } else if (t < 60) {
    type = Math.random() < 0.42 ? "heavy" : "small";
  } else if (t < 85) {
    type = Math.random() < 0.5 ? "rush" : "small";
  } else if (t < 110) {
    type = Math.random() < 0.4 ? "ranged" : Math.random() < 0.55 ? "swarm" : "small";
    count = type === "swarm" ? 3 : 1;
  } else {
    const roll = Math.random();
    type = roll < 0.27 ? "heavy" : roll < 0.54 ? "rush" : roll < 0.72 ? "ranged" : "small";
  }
  const centerX = laneBias < 0.33 ? 150 : laneBias < 0.66 ? 360 : 570;
  for (let i = 0; i < count; i += 1) spawnEnemy(type, centerX + (i - (count - 1) / 2) * 34 + random(-28, 28), i * 0.1);
}

function spawnBoss() {
  state.bossSpawned = true;
  const boss = spawnEnemy("boss", 360, 0);
  state.boss = boss;
  addEffect(360, 220, "text", "#ff667d", "BOSS");
}

function spawnEnemy(type, x, delay = 0) {
  const def = enemyDefs[type];
  const enemy = {
    id: nextEnemyId++,
    type,
    x: clamp(x, 40, W - 40),
    y: type === "boss" ? 150 : random(110, 160),
    hp: def.hp,
    maxHp: def.hp,
    radius: def.radius,
    speed: def.speed,
    damage: def.damage,
    attackInterval: def.interval,
    attackCooldown: 0,
    delay,
    target: null,
    slowAmount: 0,
    slowTime: 0,
    dashState: 0,
    dashWarning: 0,
    poison: 0,
    poisonTime: 0,
    hitFlash: 0,
    noReward: false,
  };
  state.enemies.push(enemy);
  return enemy;
}

function updateHeroes(dt) {
  let readyHeroes = 0;
  for (const hero of state.heroes) {
    hero.x += (hero.targetX - hero.x) * Math.min(1, dt * 7);
    hero.invulnerable = Math.max(0, hero.invulnerable - dt);
    hero.hitFlash = Math.max(0, hero.hitFlash - dt);
    if (!hero.alive) continue;
    hero.cooldown -= dt;
    hero.skill = Math.min(hero.skillMax, hero.skill + dt);
    if (hero.skill >= hero.skillMax) readyHeroes += 1;
    if (hero.buffTime > 0) {
      hero.buffTime -= dt;
      if (hero.buffTime <= 0) hero.buff = null;
    }
    const target = heroTarget(hero);
    if (!target || hero.cooldown > 0) continue;
    const def = heroDefs[hero.type];
    const haste = hero.buff === "haste" ? 0.65 : 1;
    const power = hero.buff === "power" ? 1.4 : 1;
    fireProjectile(hero.x, hero.y - 20, target, def.damage * state.mods.damage[hero.type] * power, hero.type === "archer" ? 620 : 460, def.color, hero.type);
    const overchargePenalty = state.superCharge > 100 ? 1 + ((state.superCharge - 100) / 50) * 0.3 : 1;
    hero.cooldown = def.interval * state.mods.interval[hero.type] * haste * overchargePenalty;
  }
  if (aim?.kind !== "superHold" && readyHeroes > 0) {
    state.superCharge = Math.min(SUPER_MAX_CHARGE, state.superCharge + readyHeroes * SUPER_CHARGE_PER_READY_HERO * state.mods.superChargeRate * dt);
  }
}

function heroTarget(hero) {
  const def = heroDefs[hero.type];
  const candidates = activeEnemies().filter(enemy => distance(enemy, hero) <= def.range);
  if (!candidates.length) return null;
  if (hero.type === "archer") return candidates.sort((a, b) => b.y - a.y || a.hp - b.hp)[0];
  if (hero.type === "guardian") return candidates.sort((a, b) => distance(a, hero) - distance(b, hero))[0];
  let best = candidates[0];
  let bestScore = -1;
  for (const enemy of candidates) {
    const score = candidates.filter(other => distance(other, enemy) < 85).length;
    if (score > bestScore) {
      best = enemy;
      bestScore = score;
    }
  }
  return best;
}

function fireProjectile(x, y, target, damage, speed, color, owner) {
  const angle = Math.atan2(target.y - y, target.x - x);
  state.projectiles.push({ x, y, target, damage, speed, color, owner, angle, life: 2 });
}

function updateProjectiles(dt) {
  for (const projectile of state.projectiles) {
    projectile.life -= dt;
    if (!projectile.target || projectile.target.hp <= 0) continue;
    const angle = Math.atan2(projectile.target.y - projectile.y, projectile.target.x - projectile.x);
    projectile.angle = angle;
    projectile.x += Math.cos(angle) * projectile.speed * dt;
    projectile.y += Math.sin(angle) * projectile.speed * dt;
    if (distance(projectile, projectile.target) <= projectile.target.radius + 10) {
      hitWithBuff(projectile.target, projectile.damage, projectile.owner);
      projectile.life = 0;
    }
  }
  state.projectiles = state.projectiles.filter(projectile => projectile.life > 0 && projectile.y > 50 && projectile.y < BATTLE_BOTTOM);
}

function hitWithBuff(enemy, damage, owner) {
  damageEnemy(enemy, damage);
  const hero = state.heroes.find(candidate => candidate.type === owner);
  if (!hero?.buff) return;
  if (hero.buff === "poison") {
    enemy.poison = damage * 0.2 / 3;
    enemy.poisonTime = 3;
  }
  if (hero.buff === "fire") blast(enemy.x, enemy.y, 48, damage * 0.35, elixirDefs.fire.color, enemy);
  if (hero.buff === "ice") {
    enemy.slowAmount = Math.max(enemy.slowAmount, 0.25);
    enemy.slowTime = Math.max(enemy.slowTime, 1.2);
  }
  if (hero.buff === "lightning") {
    activeEnemies().filter(other => other !== enemy).sort((a, b) => distance(a, enemy) - distance(b, enemy)).slice(0, 2).forEach(other => damageEnemy(other, damage * 0.5));
    addEffect(enemy.x, enemy.y, "lightning", elixirDefs.lightning.color);
  }
}

function updateWalls(dt) {
  for (const wall of state.walls) {
    wall.life -= dt;
    for (const enemy of activeEnemies()) {
      if (Math.abs(enemy.x - wall.x) > wall.width / 2 + enemy.radius) continue;
      if (Math.abs(enemy.y - wall.y) > 25 + enemy.radius) continue;
      enemy.y -= enemy.speed * dt * 0.85;
      enemy.target = null;
      wall.hp -= (enemy.type === "rush" ? 26 : enemy.type === "boss" ? 38 : 10) * dt;
      if (enemy.type === "rush") {
        enemy.dashState = -1;
        enemy.slowAmount = 0.7;
        enemy.slowTime = 1;
      }
    }
  }
  state.walls = state.walls.filter(wall => wall.life > 0 && wall.hp > 0);
}

function updateZones(dt) {
  for (const zone of state.zones) {
    zone.life -= dt;
    zone.tick -= dt;
    if (zone.tick <= 0) {
      zone.tick += 0.5;
      damageInRadius(zone, zone.radius, zone.damage);
    }
  }
  state.zones = state.zones.filter(zone => zone.life > 0);
}

function chooseEnemyTarget(enemy) {
  const alive = aliveHeroes();
  if (!alive.length) return { kind: "core", x: CORE.x, y: CORE.y, radius: CORE.radius };
  const hero = alive.sort((a, b) => distance(a, enemy) - distance(b, enemy))[0];
  return { kind: "hero", hero, x: hero.x, y: hero.y, radius: 30 };
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.delay -= dt;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
    enemy.slowTime -= dt;
    if (enemy.slowTime <= 0) enemy.slowAmount = 0;
    if (enemy.poisonTime > 0) {
      enemy.poisonTime -= dt;
      damageEnemy(enemy, enemy.poison * dt, false);
    }
    if (enemy.delay > 0 || enemy.hp <= 0) continue;
    if (!enemy.target || (enemy.target.kind === "hero" && !enemy.target.hero.alive)) enemy.target = chooseEnemyTarget(enemy);
    if (enemy.target.kind === "hero") {
      enemy.target.x = enemy.target.hero.x;
      enemy.target.y = enemy.target.hero.y;
    }
    const target = enemy.target;
    const dist = distance(enemy, target);
    const rangedStop = enemy.type === "ranged" ? 230 : 0;
    let speedMultiplier = 1 - enemy.slowAmount;

    if (enemy.type === "rush" && enemy.dashState === 0 && dist < 360) {
      enemy.dashState = 1;
      enemy.dashWarning = 0.8;
    }
    if (enemy.type === "rush" && enemy.dashState === 1) {
      enemy.dashWarning -= dt;
      speedMultiplier = 0;
      if (enemy.dashWarning <= 0) enemy.dashState = 2;
    }
    if (enemy.type === "rush" && enemy.dashState === 2) speedMultiplier *= 2.25;

    const attackDistance = enemy.radius + target.radius + rangedStop;
    if (dist > attackDistance) {
      const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      enemy.x += Math.cos(angle) * enemy.speed * speedMultiplier * dt;
      enemy.y += Math.sin(angle) * enemy.speed * speedMultiplier * dt;
      separateEnemy(enemy, dt);
    } else if (enemy.attackCooldown <= 0) {
      let damage = enemy.damage;
      if (enemy.type === "rush" && enemy.dashState === 2) {
        damage = 20;
        enemy.dashState = -1;
      }
      if (target.kind === "hero") damageHero(target.hero, damage);
      else {
        state.coreHp = Math.max(0, state.coreHp - damage);
        addEffect(CORE.x, CORE.y, "hit", "#ff6175");
      }
      enemy.attackCooldown = enemy.attackInterval;
    }
  }

  const dead = state.enemies.filter(enemy => enemy.hp <= 0);
  for (const enemy of dead) rewardEnemy(enemy);
  state.enemies = state.enemies.filter(enemy => enemy.hp > 0);
}

function separateEnemy(enemy, dt) {
  for (const other of state.enemies) {
    if (other === enemy || other.delay > 0 || other.hp <= 0) continue;
    const dx = enemy.x - other.x;
    const dy = enemy.y - other.y;
    const dist = Math.hypot(dx, dy) || 1;
    const minDist = (enemy.radius + other.radius) * 0.72;
    if (dist < minDist) {
      const push = (minDist - dist) * dt * 2.2;
      enemy.x += (dx / dist) * push;
      enemy.y += (dy / dist) * push * 0.35;
    }
  }
}

function damageHero(hero, amount) {
  if (!hero.alive || hero.invulnerable > 0) return;
  hero.hp = Math.max(0, hero.hp - amount);
  hero.hitFlash = 0.12;
  addEffect(hero.x, hero.y, "hit", "#ff6175");
  if (hero.hp <= 0) {
    hero.alive = false;
    hero.buff = null;
    hero.buffTime = 0;
    updateFormation();
    for (const enemy of state.enemies) enemy.target = null;
    addEffect(hero.x, hero.y, "death", heroDefs[hero.type].color, heroDefs[hero.type].name);
  }
}

function damageEnemy(enemy, amount, flash = true) {
  if (!enemy || enemy.hp <= 0) return;
  enemy.hp -= amount;
  if (flash) enemy.hitFlash = 0.08;
}

function rewardEnemy(enemy) {
  if (enemy.noReward) return;
  enemy.noReward = true;
  if (enemy.type === "boss") {
    endGame(true);
    return;
  }
  const def = enemyDefs[enemy.type];
  state.kills += 1;
  state.expDrops.push({ x: enemy.x, y: enemy.y, amount: def.exp, life: 0 });
  if (Math.random() < 0.08) {
    const types = Object.keys(elixirDefs);
    state.elixirDrops.push({ x: enemy.x, y: enemy.y, type: types[Math.floor(Math.random() * types.length)], life: 0.8 });
  }
}

function updateDrops(dt) {
  for (const drop of state.expDrops) {
    drop.life += dt;
    drop.x += (CORE.x - drop.x) * Math.min(1, dt * 4);
    drop.y += (CORE.y - drop.y) * Math.min(1, dt * 4);
    if (distance(drop, CORE) < 24) {
      state.exp += drop.amount;
      drop.done = true;
      while (state.exp >= state.expNeed) {
        state.exp -= state.expNeed;
        state.level += 1;
        state.expNeed = Math.round(state.expNeed * 1.24);
        state.levelUpQueue += 1;
      }
      if (!state.leveling && state.levelUpQueue > 0) openUpgradeSelection();
    }
  }
  state.expDrops = state.expDrops.filter(drop => !drop.done);

  for (const drop of state.elixirDrops) {
    drop.life -= dt;
    drop.y += Math.sin(drop.life * 18) * 0.4;
    if (drop.life <= 0) {
      if (state.elixirs.length < 2) state.elixirs.push(drop.type);
      drop.done = true;
    }
  }
  state.elixirDrops = state.elixirDrops.filter(drop => !drop.done);
}

function blast(x, y, radius, damage, color, exclude = null) {
  for (const enemy of activeEnemies()) {
    if (enemy !== exclude && distance(enemy, { x, y }) <= radius + enemy.radius) damageEnemy(enemy, damage);
  }
  addEffect(x, y, "blast", color, null, radius);
}

function damageInRadius(point, radius, damage) {
  for (const enemy of activeEnemies()) {
    if (distance(enemy, point) <= radius + enemy.radius) damageEnemy(enemy, damage);
  }
}

function slowInRadius(point, radius, amount, time) {
  for (const enemy of activeEnemies()) {
    if (distance(enemy, point) <= radius + enemy.radius) {
      enemy.slowAmount = Math.max(enemy.slowAmount, amount);
      enemy.slowTime = Math.max(enemy.slowTime, time);
    }
  }
}

function addEffect(x, y, type, color, text = null, radius = 0) {
  state.effects.push({ x, y, type, color, text, radius, life: type === "text" ? 1.2 : 0.55, maxLife: type === "text" ? 1.2 : 0.55 });
}

function updateEffects(dt) {
  for (const effect of state.effects) effect.life -= dt;
  state.effects = state.effects.filter(effect => effect.life > 0);
}

function endGame(win) {
  if (state.gameOver) return;
  state.gameOver = true;
  state.running = false;
  ui.resultEyebrow.textContent = win ? "STAGE COMPLETE" : "CORE DESTROYED";
  ui.resultTitle.textContent = win ? "VICTORY" : "DEFEAT";
  ui.resultCopy.textContent = `${Math.floor(state.time)}초 · 처치 ${state.kills} · CORE LV.${state.level}`;
  ui.resultOverlay.classList.remove("hidden");
}

function updateUi() {
  const remaining = Math.max(0, Math.ceil(state.duration - state.time));
  ui.timerLabel.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  ui.stageProgress.style.width = `${clamp(state.time / state.duration, 0, 1) * 100}%`;
  ui.levelLabel.textContent = `CORE LV.${state.level}`;
  ui.expFill.style.width = `${clamp(state.exp / state.expNeed, 0, 1) * 100}%`;
  ui.reviveCount.textContent = "◆".repeat(state.reviveStones) || "0";

  for (const hero of state.heroes) {
    const pct = clamp(hero.skill / hero.skillMax, 0, 1);
    ui.charges[hero.type].style.width = `${pct * 100}%`;
    const card = ui.skillCards.find(candidate => candidate.dataset.hero === hero.type);
    card.classList.toggle("ready", hero.alive && pct >= 1);
    card.classList.toggle("dead", !hero.alive);
    const copy = card.querySelector(".skill-copy b");
    const hint = card.querySelector(".skill-copy small");
    if (!hero.alive) {
      copy.textContent = `${heroDefs[hero.type].name} 전투 불능`;
      hint.textContent = state.reviveStones > 0 ? "탭하여 부활석 사용" : "부활석 없음";
      ui.skillStates[hero.type].textContent = "DOWN";
    } else {
      copy.textContent = hero.type === "archer" ? "다중 화살" : hero.type === "mage" ? "대폭발" : "방어벽";
      hint.textContent = pct >= 1 ? "적진에 드래그" : "충전 중";
      ui.skillStates[hero.type].textContent = pct >= 1 ? "READY" : `${Math.floor(pct * 100)}%`;
    }
  }

  const superPct = clamp(state.superCharge / SUPER_MAX_CHARGE, 0, 1);
  ui.superFill.style.height = `${superPct * 100}%`;
  ui.superButton.classList.toggle("ready", state.superCharge >= SUPER_MIN_CHARGE);
  if (aim?.kind === "superHold") ui.superState.textContent = `${Math.floor(state.superCharge)} 남음 · 떼면 보존`;
  else if (state.superCharge >= SUPER_MIN_CHARGE) ui.superState.textContent = `${Math.floor(state.superCharge)} · 길게 누르기`;
  else ui.superState.textContent = `${Math.floor(state.superCharge)} / ${SUPER_MIN_CHARGE}`;

  ui.elixirSlots.forEach((slot, index) => {
    const type = state.elixirs[index];
    slot.classList.toggle("filled", Boolean(type));
    if (type) {
      const def = elixirDefs[type];
      slot.textContent = def.glyph;
      slot.title = def.name;
      slot.style.setProperty("--elixir-color", def.color);
    } else {
      slot.textContent = "";
      slot.title = "빈 엘릭서 슬롯";
      slot.style.removeProperty("--elixir-color");
    }
  });

  ui.dangerBanner.classList.toggle("hidden", aliveHeroes().length !== 1 || !state.running);
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  drawZones();
  drawWalls();
  drawDrops();
  drawEnemies();
  drawProjectiles();
  drawSuperBeam();
  drawCoreChargeLinks();
  drawCore();
  drawHeroes();
  drawEffects();
  drawAim();
}

function drawSuperBeam() {
  if (aim?.kind !== "superHold" || !aim.target) return;
  const targets = [aim.target];
  const nearby = activeEnemies()
    .filter(enemy => enemy !== aim.target && distance(enemy, aim.target) < 170)
    .sort((a, b) => distance(a, aim.target) - distance(b, aim.target))
    .slice(0, 2);
  targets.push(...nearby);

  ctx.save();
  ctx.lineCap = "round";
  for (const [index, target] of targets.entries()) {
    const strength = index === 0 ? 1 : 0.55;
    const pulse = 0.72 + Math.sin(state.time * 30 + index) * 0.18;
    const dx = target.x - CORE.x;
    const dy = target.y - CORE.y;

    ctx.globalAlpha = pulse * strength * 0.24;
    ctx.strokeStyle = "#c891ff";
    ctx.lineWidth = index === 0 ? 22 : 12;
    ctx.beginPath();
    ctx.moveTo(CORE.x, CORE.y - 22);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    ctx.globalAlpha = pulse * strength;
    ctx.strokeStyle = index === 0 ? "#f1dcff" : "#c891ff";
    ctx.lineWidth = index === 0 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(CORE.x, CORE.y - 22);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();

    for (let particle = 0; particle < 3; particle += 1) {
      const progress = (state.time * 2.2 + particle / 3 + index * 0.13) % 1;
      ctx.globalAlpha = strength * (0.7 + progress * 0.3);
      ctx.fillStyle = "#f5e8ff";
      ctx.beginPath();
      ctx.arc(CORE.x + dx * progress, CORE.y - 22 + (dy + 22) * progress, index === 0 ? 5 : 3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCoreChargeLinks() {
  if (aim?.kind === "superHold") return;
  const ready = aliveHeroes().filter(hero => hero.skill >= hero.skillMax);
  for (const hero of ready) {
    const color = heroDefs[hero.type].color;
    const dx = CORE.x - hero.x;
    const dy = CORE.y - hero.y;
    const length = Math.hypot(dx, dy);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 10]);
    ctx.lineDashOffset = -state.time * 28;
    ctx.beginPath();
    ctx.moveTo(hero.x, hero.y + 12);
    ctx.lineTo(CORE.x, CORE.y);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i += 1) {
      const progress = (state.time * 0.8 + i / 3) % 1;
      ctx.globalAlpha = 0.9 * (1 - progress * 0.35);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(hero.x + dx * progress, hero.y + 12 + (dy - 12) * progress, 4 + progress * 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, BATTLE_BOTTOM);
  sky.addColorStop(0, "#142d37");
  sky.addColorStop(0.48, "#1b2c2d");
  sky.addColorStop(1, "#16201e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#84b4a7";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.moveTo(80 + i * 92, 110);
    ctx.quadraticCurveTo(360, 610, 140 + i * 74, HERO_Y + 10);
    ctx.stroke();
  }
  ctx.restore();

  const ground = ctx.createLinearGradient(0, 910, 0, BATTLE_BOTTOM);
  ground.addColorStop(0, "rgba(50, 79, 56, 0)");
  ground.addColorStop(1, "rgba(67, 96, 57, 0.9)");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 880, W, BATTLE_BOTTOM - 880);

  ctx.fillStyle = "rgba(207, 242, 177, 0.11)";
  ctx.fillRect(0, HERO_Y + 46, W, 4);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "900 15px system-ui";
  ctx.fillText("DEFENSE LINE", 20, HERO_Y + 38);

  ctx.fillStyle = "#0a1018";
  ctx.fillRect(0, BATTLE_BOTTOM, W, H - BATTLE_BOTTOM);
}

function drawZones() {
  for (const zone of state.zones) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.28, zone.life * 0.15);
    ctx.fillStyle = zone.color;
    ctx.beginPath();
    ctx.arc(zone.x, zone.y, zone.radius, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawWalls() {
  for (const wall of state.walls) {
    ctx.save();
    ctx.translate(wall.x, wall.y);
    ctx.fillStyle = wall.mini ? "rgba(121, 225, 131, 0.68)" : "#73d882";
    ctx.strokeStyle = "#d6ffd9";
    ctx.lineWidth = wall.mini ? 2 : 4;
    ctx.fillRect(-wall.width / 2, -14, wall.width, 28);
    ctx.strokeRect(-wall.width / 2, -14, wall.width, 28);
    ctx.fillStyle = "rgba(20, 33, 25, 0.72)";
    ctx.fillRect(-wall.width / 2, 18, wall.width, 5);
    ctx.fillStyle = "#98f29f";
    ctx.fillRect(-wall.width / 2, 18, wall.width * clamp(wall.hp / wall.maxHp, 0, 1), 5);
    ctx.restore();
  }
}

function drawCore() {
  const hpPct = clamp(state.coreHp / state.coreHpMax, 0, 1);
  ctx.save();
  ctx.translate(CORE.x, CORE.y);
  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
  glow.addColorStop(0, "rgba(230, 198, 255, 0.95)");
  glow.addColorStop(0.35, "rgba(145, 84, 215, 0.62)");
  glow.addColorStop(1, "rgba(74, 40, 112, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, TAU);
  ctx.fill();
  ctx.rotate(state.time * 0.7);
  ctx.strokeStyle = "#dcb9ff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(34, 20);
  ctx.lineTo(-34, 20);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(5, 8, 13, 0.78)";
  ctx.fillRect(CORE.x - 66, CORE.y + 55, 132, 12);
  ctx.fillStyle = hpPct > 0.35 ? "#be8cff" : "#ff6277";
  ctx.fillRect(CORE.x - 64, CORE.y + 57, 128 * hpPct, 8);
}

function drawHeroes() {
  for (const hero of state.heroes) {
    const def = heroDefs[hero.type];
    ctx.save();
    ctx.translate(hero.x, hero.y);
    ctx.globalAlpha = hero.alive ? 1 : 0.34;
    if (hero.buff) {
      ctx.strokeStyle = elixirDefs[hero.buff].color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, 39, 0, TAU * clamp(hero.buffTime / 12, 0, 1));
      ctx.stroke();
    }
    if (heroSpriteSheet.complete && heroSpriteSheet.naturalWidth > 0) {
      const sourceIndex = hero.type === "archer" ? 0 : hero.type === "mage" ? 1 : 2;
      const sourceWidth = heroSpriteSheet.naturalWidth / 3;
      ctx.filter = hero.hitFlash > 0 ? "brightness(2.4)" : "none";
      ctx.drawImage(heroSpriteSheet, sourceWidth * sourceIndex, 0, sourceWidth, heroSpriteSheet.naturalHeight, -64, -142, 128, 192);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = hero.hitFlash > 0 ? "#fff" : def.color;
      ctx.strokeStyle = "#111820";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(5, 8, 13, 0.82)";
    ctx.fillRect(-48, -151, 96, 10);
    if (hero.alive) {
      ctx.fillStyle = hero.hp / hero.maxHp > 0.35 ? "#72e596" : "#ff6074";
      ctx.fillRect(-46, -149, 92 * clamp(hero.hp / hero.maxHp, 0, 1), 6);
    }
    ctx.restore();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (enemy.delay > 0) continue;
    const def = enemyDefs[enemy.type];
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.type === "rush" && enemy.dashState === 1) {
      ctx.strokeStyle = "#ffb14e";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 12 + Math.sin(enemy.dashWarning * 20) * 4, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = enemy.hitFlash > 0 ? "#fff" : def.color;
    ctx.strokeStyle = enemy.type === "boss" ? "#ffd0d7" : "#10151c";
    ctx.lineWidth = enemy.type === "boss" ? 6 : 4;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (enemy.type === "ranged") {
      ctx.strokeStyle = "#59213e";
      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.lineTo(14, 14);
      ctx.moveTo(12, -12);
      ctx.lineTo(-14, 14);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(6, 9, 14, 0.8)";
    ctx.fillRect(-enemy.radius, -enemy.radius - 13, enemy.radius * 2, 5);
    ctx.fillStyle = enemy.type === "boss" ? "#ff6a7d" : "#eff7e4";
    ctx.fillRect(-enemy.radius, -enemy.radius - 13, enemy.radius * 2 * clamp(enemy.hp / enemy.maxHp, 0, 1), 5);
    ctx.restore();
  }
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.angle);
    ctx.fillStyle = projectile.color;
    if (projectile.owner === "archer" || projectile.owner === "arrow-skill") ctx.fillRect(-12, -2, 24, 4);
    else {
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.arc(0, 0, projectile.owner === "mage" ? 11 : 7, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawDrops() {
  for (const drop of state.expDrops) {
    ctx.fillStyle = "#d6a8ff";
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, 5, 0, TAU);
    ctx.fill();
  }
  for (const drop of state.elixirDrops) {
    const def = elixirDefs[drop.type];
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "900 10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.glyph, 0, 0);
    ctx.restore();
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    const t = 1 - effect.life / effect.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
    ctx.strokeStyle = effect.color;
    ctx.fillStyle = effect.color;
    if (effect.type === "blast") {
      ctx.globalAlpha *= 0.25;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (0.4 + t * 0.7), 0, TAU);
      ctx.fill();
    } else if (["hit", "target", "revive", "death", "wall"].includes(effect.type)) {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 18 + t * 48, 0, TAU);
      ctx.stroke();
    } else if (effect.type === "lightning") {
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(effect.x - 8, effect.y - 75);
      ctx.lineTo(effect.x + 10, effect.y - 22);
      ctx.lineTo(effect.x - 5, effect.y);
      ctx.lineTo(effect.x + 16, effect.y + 44);
      ctx.stroke();
    } else if (effect.type === "arrows") {
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(effect.x + i * 10 - 18, effect.y - 45);
        ctx.lineTo(effect.x + i * 10 + 12, effect.y + 20);
        ctx.stroke();
      }
    } else if (effect.type === "text") {
      ctx.font = "1000 24px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(effect.text, effect.x, effect.y - t * 42);
    }
    ctx.restore();
  }
}

function drawAim() {
  if (!aim) return;
  const point = aim.point;
  ctx.save();
  if (aim.kind === "skill") {
    const color = heroDefs[aim.type].color;
    ctx.strokeStyle = aim.valid ? color : "#ff6175";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.22;
    const radius = aim.type === "mage" ? 108 : aim.type === "guardian" ? 95 : 90;
    if (aim.type === "guardian") {
      ctx.fillRect(point.x - 95, point.y - 14, 190, 28);
      ctx.globalAlpha = 0.95;
      ctx.strokeRect(point.x - 95, point.y - 14, 190, 28);
    } else {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, TAU);
      ctx.stroke();
    }
  }
  if (aim.kind === "superHold" && aim.target) {
    ctx.strokeStyle = "#dcb9ff";
    ctx.fillStyle = "rgba(181, 114, 255, 0.2)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(aim.target.x, aim.target.y, 48, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  if (aim.kind === "elixir") {
    const def = elixirDefs[aim.elixir];
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 22, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.font = "1000 16px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.glyph, point.x, point.y);
  }
  ctx.restore();
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loop(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
  lastTime = now;
  update(dt);
  updateUi();
  draw();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);
