import type { BossAi, Enemy, GameState } from './GameState';
import { BOSSES, SERAPH, WARDEN } from '../content/bosses';
import { groundDy, isBoss, type BossKind } from '../content/enemies';
import { normalize } from '../core/Math';
import { RULES } from '../core/Rules';
import { blocked, slideMove } from './CollisionSystem';
import { addEnemy, pushEnemyEvent } from './EntityRegistry';
import { feetInCircle } from './Ground';
import { damagePlayer } from './CombatSystem';
import { behaviorOf, isB22Boss, updateB22Boss } from './bosses/runner';
import type { EncounterStep } from '../b22/plan';
import { COOP_BALANCE } from '../b22/pairs';

const MAX_SHOTS = SERAPH.maxShots;
const newAi = (): BossAi => ({ phase: 1, pat: 0, atk: '', step: 0, t: 0, acc: 0, exposed: false, invuln: false, side: 1, destX: 0, destY: 0, gap: 0, push: 0 });
export const bossAlive = (state: GameState) => state.enemies.some(e => isBoss(e.kind) && !e.part && e.hp > 0);

function hazard(state: GameState, h: { shape: 'circle' | 'cone' | 'sigil'; x: number; y: number; r: number; ang: number; arc: number; delay: number; damage: number; owner: number; tag: string; lane?: number }) {
  if (state.hazards.length >= 24) return;
  state.hazards.push({ id: state.nextId++, fired: false, ttl: 0, total: h.delay, ...h });
}
function shot(state: GameState, x: number, y: number, ang: number, speed: number, radius: number, damage: number, ttl: number) {
  if (state.enemyShots.length >= MAX_SHOTS) return;
  state.enemyShots.push({ id: state.nextId++, x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, ttl, damage, radius, kind: 'prism' });
}
const clearOwn = (state: GameState, e: Enemy) => { state.hazards = state.hazards.filter(h => h.owner !== e.id); if (e.kind === 'seraph') state.enemyShots = state.enemyShots.filter(s => s.kind !== 'prism'); };

/** Place a boss in the arena (outside Kai's reach, never inside an obstacle) in its intro state. Deterministic: first free angle from a seed-derived start. */
export function spawnBoss(state: GameState, kind: BossKind, step?: EncounterStep): Enemy | null {
  const def = BOSSES[kind], p = state.player, beh = behaviorOf(kind), dist = kind === 'warden' ? 520 : kind === 'seraph' ? 330 : kind === 'castellan' ? 460 : 380;
  const id = step?.id ?? kind, hp = Math.round(def.hp * (step?.hpMul ?? 1) * (state.b22.party ? COOP_BALANCE.bossHp : 1));
  if (beh?.spawnAt) {
    const at = beh.spawnAt(state), n = normalize(p.x - at.x, p.y - at.y);
    const e = addEnemy(state, { kind, x: at.x, y: at.y, hp, maxHp: hp, radius: def.radius, speed: def.speed, damage: def.contact, touchCooldown: 0, mode: 'intro', modeT: def.intro, attackCd: 1, aimX: n.x, aimY: n.y, ai: { ...newAi(), invuln: true }, stepId: id });
    state.encounter.spawned[id] = true; state.b22.bossHurt = false; beh.onSpawn?.(state, e); pushEnemyEvent(state, 'enemy_intro', e, n.x, n.y, kind); return e;
  }
  for (let i = 0; i < 24; i++) {
    const a = ((state.seed % 12) / 12) * Math.PI * 2 + (i * Math.PI) / 12 * (i % 2 ? 1 : -1), x = p.x + Math.cos(a) * dist, y = p.y + Math.sin(a) * dist;
    if (blocked(x, y, def.radius + 6) || x < 80 || y < 80 || x > RULES.worldWidth - 80 || y > RULES.worldHeight - 80) continue;
    const n = normalize(p.x - x, p.y - y);
    const e = addEnemy(state, { kind, x, y, hp, maxHp: hp, radius: def.radius, speed: def.speed, damage: def.contact, touchCooldown: 0, mode: 'intro', modeT: def.intro, attackCd: 1, aimX: n.x, aimY: n.y, ai: { ...newAi(), invuln: true }, stepId: id });
    state.encounter.spawned[id] = true; state.b22.bossHurt = false; beh?.onSpawn?.(state, e);
    pushEnemyEvent(state, 'enemy_intro', e, n.x, n.y, kind);
    return e;
  }
  return null;
}

function startPhase(state: GameState, e: Enemy, ai: BossAi) {
  clearOwn(state, e);
  const def = BOSSES[e.kind as BossKind];
  ai.phase = 2; ai.atk = ''; ai.step = 0; ai.exposed = false; ai.invuln = true; ai.pat = 0;
  e.mode = 'phase'; e.modeT = def.phaseT;
  ai.push = Math.hypot(state.player.x - e.x, state.player.y - e.y) < 170 ? 0.4 : 0;   // harmless shove so the roar never leaves Kai tangled in the boss
  pushEnemyEvent(state, 'enemy_phase', e, e.aimX, e.aimY, e.kind);
}

export function updateBoss(state: GameState, e: Enemy, dt: number) {
  if (isB22Boss(e.kind)) { updateB22Boss(state, e, dt); return; }
  const ai = (e.ai ??= newAi()), def = BOSSES[e.kind as BossKind], p = state.player;
  e.touchCooldown = Math.max(0, e.touchCooldown - dt); e.attackCd = Math.max(0, e.attackCd - dt);
  const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy), v = normalize(dx, dy), ph = ai.phase - 1, ws = def.windupScale[ph];
  if (ai.phase === 1 && e.hp <= def.hp * def.phaseAt && e.mode !== 'intro' && e.mode !== 'phase') startPhase(state, e, ai);
  switch (e.mode) {
    case 'intro': {
      e.modeT -= dt; ai.invuln = true; e.aimX = v.x; e.aimY = v.y;
      if (e.kind === 'warden' && e.modeT > def.intro - 1.6) slideMove(e, v.x * 110, v.y * 110, dt);
      if (e.modeT <= 0) { ai.invuln = false; e.mode = 'move'; e.attackCd = 1; }
      return;
    }
    case 'phase': {
      e.modeT -= dt; ai.invuln = true;
      if (ai.push > 0) { ai.push -= dt; slideMove(p, -v.x * 280, -v.y * 280, dt); }
      if (e.modeT <= 0) { ai.invuln = false; e.mode = 'move'; e.attackCd = def.cooldown[1]; }
      return;
    }
    case 'move': {
      if (e.kind === 'warden') { if (dist > 70) slideMove(e, v.x * e.speed, v.y * e.speed, dt); e.aimX = v.x; e.aimY = v.y; }
      else {
        ai.t += dt; if (ai.t > 3) { ai.t = 0; ai.side = ai.side === 1 ? -1 : 1; }
        let mx = -v.y * ai.side, my = v.x * ai.side, k = 0.55;
        if (dist < SERAPH.band.near) { mx = -v.x; my = -v.y; k = 0.9; } else if (dist > SERAPH.band.far) { mx = v.x; my = v.y; k = 1; }
        slideMove(e, mx * e.speed * k, my * e.speed * k, dt); e.aimX = v.x; e.aimY = v.y;
      }
      if (e.attackCd <= 0) choose(state, e, ai, dist, v.x, v.y, ph, ws);
      return;
    }
    case 'windup': {
      e.modeT -= dt;
      if (e.kind === 'warden') windupWarden(e, ai, v, ws);
      else windupSeraph(e, ai, v, ws);
      if (e.modeT <= 0) release(state, e, ai, ph);
      return;
    }
    case 'strike': {
      e.modeT -= dt;
      if (e.kind === 'warden') strikeWarden(state, e, ai, dt); else strikeSeraph(state, e, ai, dt);
      if (e.modeT <= 0) afterStrike(state, e, ai, ph, ws, v);
      return;
    }
    case 'blink': {
      e.modeT -= dt; ai.invuln = true;
      if (e.modeT <= 0) { e.x = ai.destX; e.y = ai.destY; ai.invuln = false; ai.atk = 'blink_volley'; e.aimX = v.x; e.aimY = v.y; e.mode = 'windup'; e.modeT = SERAPH.blink.volleyWindup; pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y, 'blink_volley'); pushEnemyEvent(state, 'enemy_strike', e, 0, 0, 'blink_in'); }
      return;
    }
    default: {   // recover
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'move'; ai.exposed = false; ai.atk = ''; e.attackCd = def.cooldown[ph]; }
    }
  }
}

function choose(state: GameState, e: Enemy, ai: BossAi, dist: number, nx: number, ny: number, ph: number, ws: number) {
  const list = (e.kind === 'warden' ? WARDEN.pattern : SERAPH.pattern)[ph] as readonly string[];
  let name = list[ai.pat % list.length]; ai.pat++;
  if (e.kind === 'warden') { if (name === 'sweep' && dist > WARDEN.sweep.maxDist) name = 'rush'; else if (name === 'rush' && dist < WARDEN.rush.minDist) name = 'sweep'; }
  ai.atk = name; ai.step = 0; ai.exposed = false; e.aimX = nx; e.aimY = ny;
  const g = { x: e.x, y: e.y + groundDy(e.radius) }, base = Math.atan2(ny, nx);
  e.mode = 'windup';
  if (name === 'rupture') {
    const c = WARDEN.rupture; e.modeT = c.windup * ws;
    const n = c.count[ph];
    if (ph === 0) for (let i = 0; i < n; i++) { const d = c.start + i * c.spacing; hazard(state, { shape: 'circle', x: g.x + nx * d, y: g.y + ny * d, r: c.radius, ang: base, arc: 0, delay: c.delay * ws + i * c.step, damage: c.damage, owner: e.id, tag: 'rupture' }); }
    else for (let i = 0; i < n / 2; i++) for (const s of [-1, 1]) { const d = c.start + i * c.spacing, a = base + s * c.lane; hazard(state, { shape: 'circle', x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d, r: c.radius, ang: a, arc: 0, delay: c.delay * ws + (i * 2 + (s < 0 ? 0 : 1)) * c.step, damage: c.damage, owner: e.id, tag: 'rupture' }); }
  } else if (name === 'sweep') {
    const c = WARDEN.sweep; e.modeT = c.windup * ws; const arc = (c.arcDeg * Math.PI) / 180;
    hazard(state, { shape: 'cone', x: g.x, y: g.y, r: c.radius, ang: base, arc, delay: c.windup * ws, damage: c.damage, owner: e.id, tag: 'sweep' });
    if (ph === 1) hazard(state, { shape: 'cone', x: g.x, y: g.y, r: c.radius, ang: base + Math.PI, arc, delay: c.windup * ws + c.strike + c.back, damage: c.damage, owner: e.id, tag: 'sweep' });
  } else if (name === 'rush') e.modeT = WARDEN.rush.windup * ws;
  else if (name === 'volley') e.modeT = SERAPH.volley.windup * ws;
  else if (name === 'ring') { e.modeT = SERAPH.ring.windup * ws; ai.gap = base; }
  else if (name === 'spiral') { e.modeT = SERAPH.spiral.windup * ws; ai.gap = base; }
  else if (name === 'blink') {
    const c = SERAPH.blink; e.modeT = c.windup;
    const back = Math.atan2(e.y - state.player.y, e.x - state.player.x); let dest: { x: number; y: number } | null = null;
    for (let i = 0; i < 7 && !dest; i++) {
      const a = back + ai.side * 1.1 + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.4), x = state.player.x + Math.cos(a) * c.distance, y = state.player.y + Math.sin(a) * c.distance;
      if (!blocked(x, y, e.radius + 4) && x > 80 && y > 80 && x < RULES.worldWidth - 80 && y < RULES.worldHeight - 80) dest = { x, y };
    }
    ai.destX = dest?.x ?? e.x; ai.destY = dest?.y ?? e.y; ai.side = ai.side === 1 ? -1 : 1;
    hazard(state, { shape: 'sigil', x: ai.destX, y: ai.destY + groundDy(e.radius), r: 34, ang: 0, arc: 0, delay: c.windup, damage: 0, owner: e.id, tag: 'sigil' });
    if (ph === 1) hazard(state, { shape: 'circle', x: g.x, y: g.y, r: c.residueRadius, ang: 0, arc: 0, delay: c.residueDelay, damage: c.residueDamage, owner: e.id, tag: 'residue' });
  }
  pushEnemyEvent(state, 'enemy_telegraph', e, nx, ny, name);
}

function windupWarden(e: Enemy, ai: BossAi, v: { x: number; y: number }, ws: number) {
  if (ai.atk === 'rush') {
    const total = ai.step === 0 ? WARDEN.rush.windup * ws : WARDEN.rush.second * ws;
    if (e.modeT > total * (1 - WARDEN.rush.trackFraction)) { e.aimX = v.x; e.aimY = v.y; }   // tracks, then the lane freezes for the last part so it can be read and sidestepped
  }
}
function windupSeraph(e: Enemy, ai: BossAi, v: { x: number; y: number }, ws: number) {
  if (ai.atk === 'volley') {
    const total = ai.step === 0 ? SERAPH.volley.windup * ws : SERAPH.volley.second;
    if (ai.step === 0 && e.modeT > total * (1 - SERAPH.volley.trackFraction)) { e.aimX = v.x; e.aimY = v.y; }
  }
}

function release(state: GameState, e: Enemy, ai: BossAi, ph: number) {
  e.mode = 'strike';
  pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY, ai.atk);
  if (e.kind === 'warden') {
    if (ai.atk === 'rupture') e.modeT = WARDEN.rupture.strike;
    else if (ai.atk === 'sweep') e.modeT = WARDEN.sweep.strike;
    else { e.modeT = WARDEN.rush.strike; ai.acc = 0; }
    return;
  }
  const o = { x: e.x, y: e.y };
  if (ai.atk === 'volley' || ai.atk === 'blink_volley') {
    const c = SERAPH.volley, n = ai.atk === 'blink_volley' ? SERAPH.blink.count : c.count[ph], base = Math.atan2(e.aimY, e.aimX), off = ai.step === 1 ? c.spread / 2 : 0;
    for (let i = 0; i < n; i++) shot(state, o.x, o.y, base + (i - (n - 1) / 2) * c.spread + off, c.speed, c.radius, c.damage, 2.8);
    e.modeT = c.strike; pushEnemyEvent(state, 'enemy_shot', e, e.aimX, e.aimY, ai.atk);
  } else if (ai.atk === 'ring') {
    const c = SERAPH.ring, off = ai.step === 1 ? Math.PI / c.count : 0;
    for (let i = 0; i < c.count; i++) {
      const a = (i / c.count) * Math.PI * 2 + off; let inGap = false;
      for (const gc of [ai.gap + 0.7, ai.gap - 0.7, ai.gap + Math.PI]) { let d = a - gc; d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < c.gapHalf) inGap = true; }
      if (!inGap) shot(state, o.x, o.y, a, c.speed, c.radius, c.damage, c.ttl);
    }
    e.modeT = c.strike; pushEnemyEvent(state, 'enemy_shot', e, 0, 0, 'ring');
  } else if (ai.atk === 'spiral') { e.modeT = SERAPH.spiral.duration; ai.acc = 0; ai.t = 0; ai.step = 0; }
}

function strikeWarden(state: GameState, e: Enemy, ai: BossAi, dt: number) {
  if (ai.atk !== 'rush') return;
  const x0 = e.x, y0 = e.y; slideMove(e, e.aimX * WARDEN.rush.speed, e.aimY * WARDEN.rush.speed, dt);
  // the rush hurts through the same ground contract as the lane telegraph: the boss's footprint (radius) sweeps along the lane
  if (feetInCircle(state, e.x, e.y + groundDy(e.radius), e.radius)) damagePlayer(state, WARDEN.rush.damage, 'rush');
  if (Math.hypot(e.x - x0, e.y - y0) < WARDEN.rush.speed * dt * 0.4) { e.modeT = 0; ai.acc = 1; }   // stopped by a wall: ends the rush early (exposed)
}

function strikeSeraph(state: GameState, e: Enemy, ai: BossAi, dt: number) {
  if (ai.atk !== 'spiral') return;
  const c = SERAPH.spiral; ai.acc += dt;
  while (ai.acc >= c.interval) {
    ai.acc -= c.interval; ai.t += c.interval;
    if (ai.step++ % 3 === 0) pushEnemyEvent(state, 'enemy_shot', e, 0, 0, 'spiral');
    for (let k = 0; k < c.arms; k++) shot(state, e.x, e.y, ai.gap + k * ((Math.PI * 2) / c.arms) + ai.t * c.rotRate, c.speed, c.radius, c.damage, c.ttl);
  }
}

function afterStrike(state: GameState, e: Enemy, ai: BossAi, ph: number, ws: number, v: { x: number; y: number }) {
  const w = WARDEN, s = SERAPH;
  if (e.kind === 'warden') {
    if (ai.atk === 'sweep' && ph === 1 && ai.step === 0) { ai.step = 1; e.aimX = -e.aimX; e.aimY = -e.aimY; e.mode = 'windup'; e.modeT = w.sweep.back; pushEnemyEvent(state, 'enemy_telegraph', e, e.aimX, e.aimY, 'sweep_back'); return; }
    if (ai.atk === 'rush' && ph === 1 && ai.step === 0) { ai.step = 1; e.mode = 'windup'; e.modeT = w.rush.second * ws; pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y, 'rush'); return; }
    e.mode = 'recover';
    if (ai.atk === 'sweep') { e.modeT = w.sweep.recover; ai.exposed = true; }
    else if (ai.atk === 'rush') { e.modeT = w.rush.recover * (ai.acc === 1 ? 1.15 : 1); ai.exposed = true; pushEnemyEvent(state, 'enemy_strike', e, 0, 0, 'rush_end'); }
    else e.modeT = w.rupture.recover;
    return;
  }
  if (ai.atk === 'volley' && ph === 1 && ai.step === 0) { ai.step = 1; e.mode = 'windup'; e.modeT = s.volley.second; pushEnemyEvent(state, 'enemy_telegraph', e, e.aimX, e.aimY, 'volley'); return; }
  if (ai.atk === 'ring' && ph === 1 && ai.step === 0) { ai.step = 1; ai.gap += 0.5; e.mode = 'windup'; e.modeT = s.ring.second; pushEnemyEvent(state, 'enemy_telegraph', e, 0, 0, 'ring'); return; }
  if (ai.atk === 'blink') { e.mode = 'blink'; e.modeT = s.blink.vanish; ai.invuln = true; return; }
  e.mode = 'recover';
  if (ai.atk === 'spiral') { e.modeT = s.spiral.recover; ai.exposed = true; }
  else if (ai.atk === 'ring') e.modeT = s.ring.recover;
  else if (ai.atk === 'blink_volley') e.modeT = s.blink.recover;
  else e.modeT = s.volley.recover;
}

/** QA / director entry: jump straight into an encounter without touching saves or settings. */
export function startEncounter(state: GameState, id: BossKind | 'aegis' | 'cantor' | 'mixed') {
  state.enemies.length = 0; state.enemyShots.length = 0; state.hazards.length = 0; state.encounter.forced = true; state.spawnTimer = 1e9; state.nextFlanker = 1e9;
  const p = state.player;
  const mobs = (kind: 'pursuer' | 'flanker' | 'ranged' | 'aegis' | 'cantor', n: number, r: number) => {
    for (let i = 0; i < n; i++) { const a = 0.6 + i * 2.1, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.8; if (blocked(x, y, 20)) continue; spawnMob(state, kind, x, y); }
  };
  if (id !== 'aegis' && id !== 'cantor' && id !== 'mixed') spawnBoss(state, id);
  else if (id === 'aegis') { mobs('aegis', 1, 260); mobs('pursuer', 3, 360); }
  else if (id === 'cantor') { mobs('cantor', 1, 300); mobs('pursuer', 4, 240); mobs('flanker', 1, 260); }
  else { spawnBoss(state, 'warden'); mobs('pursuer', 8, 360); mobs('flanker', 3, 420); mobs('ranged', 2, 400); }
}
import { ENEMIES } from '../content/enemies';
function spawnMob(state: GameState, kind: keyof typeof ENEMIES, x: number, y: number) {
  const d = ENEMIES[kind], n = normalize(state.player.x - x, state.player.y - y);
  addEnemy(state, { kind, x, y, hp: d.hp, maxHp: d.hp, radius: d.radius, speed: d.moveSpeed, damage: d.damage, touchCooldown: 0, attackCd: d.attack.cooldown * 0.6, aimX: n.x, aimY: n.y });
}
