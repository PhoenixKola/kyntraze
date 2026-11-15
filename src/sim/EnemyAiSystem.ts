import type { Enemy, GameState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove, blocked } from './CollisionSystem';
import { AIM_LOCK_FRACTION, ENEMIES, RANGED_BAND, groundDy, isBoss, type MobKind } from '../content/enemies';
import { feetInCircle, feetInCone } from './Ground';
import { damagePlayer } from './CombatSystem';
import { pushEnemyEvent } from './EntityRegistry';
import { updateBoss } from './BossAiSystem';

const STAGGER_SLOW = 0.45;
const SHOT_TTL = 2.6;
const sideOf = (e: Enemy) => (e.id % 2 === 0 ? 1 : -1);

function beginWindup(state: GameState, e: Enemy, nx: number, ny: number) {
  const a = ENEMIES[e.kind as MobKind].attack;
  e.mode = 'windup'; e.modeT = a.windup; e.aimX = nx; e.aimY = ny;
  pushEnemyEvent(state, 'enemy_telegraph', e, nx, ny);
}

function pushShot(state: GameState, s: Omit<import('./GameState').EnemyShot, 'id'>) { if (state.enemyShots.length < 160) state.enemyShots.push({ id: state.nextId++, ...s }); }

function release(state: GameState, e: Enemy) {
  const a = ENEMIES[e.kind as MobKind].attack;
  e.mode = 'strike'; e.modeT = a.strike;
  pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY);
  if (a.kind === 'slam') {
    pushEnemyEvent(state, 'enemy_slam', e, e.aimX, e.aimY);
    // the ring is centred on the sentinel's feet; Kai is hit only if his feet overlap the ring's visible edge
    if (feetInCircle(state, e.x, e.y + groundDy(e.radius), a.radius)) damagePlayer(state, a.damage, 'slam');
  } else if (a.kind === 'shot') {
    const n = a.fan?.count ?? 1, spread = a.fan?.spread ?? 0, base = Math.atan2(e.aimY, e.aimX), orb = e.kind === 'cantor';
    for (let i = 0; i < n; i++) {
      const ang = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), dx = Math.cos(ang), dy = Math.sin(ang);
      pushShot(state, { x: e.x + dx * (e.radius + 6), y: e.y + dy * (e.radius + 6), vx: dx * a.speed, vy: dy * a.speed, ttl: SHOT_TTL, damage: a.damage, radius: a.radius, kind: orb ? 'orb' : 'bolt' });
    }
    pushEnemyEvent(state, 'enemy_shot', e, e.aimX, e.aimY);
  }
}

export function moveEnemies(state: GameState, dt: number) {
  const p = state.player;
  const cantors = state.enemies.filter(c => c.kind === 'cantor' && c.hp > 0);
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (isBoss(e.kind)) { updateBoss(state, e, dt); continue; }
    const def = ENEMIES[e.kind as MobKind], a = def.attack;
    // Rift Cantor rally: non-boss, non-cantor enemies inside its aura move faster and recover attacks sooner
    let rally = false;
    if (cantors.length && e.kind !== 'cantor') for (const c of cantors) { const r = ENEMIES.cantor.aura!.radius; if ((c.x - e.x) ** 2 + (c.y - e.y) ** 2 <= r * r) { rally = true; break; } }
    const cdRate = rally ? ENEMIES.cantor.aura!.recover : 1;
    e.touchCooldown = Math.max(0, e.touchCooldown - dt); e.attackCd = Math.max(0, e.attackCd - dt * cdRate); e.stagger = Math.max(0, e.stagger - dt);
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy), v = normalize(dx, dy);
    const slow = (e.stagger > 0 ? STAGGER_SLOW : 1) * (rally ? ENEMIES.cantor.aura!.speed : 1);
    if (e.mode === 'move') {
      let mx = v.x, my = v.y, k = 1;
      if (e.kind === 'flanker') {
        // weaves around the line of pursuit; inside ~300 px it commits to an arc around the player
        const wave = Math.sin(state.time * 2.7 + e.id) * 0.45 + (dist < 300 ? sideOf(e) * 0.35 : 0);
        mx = v.x - v.y * wave; my = v.y + v.x * wave;
      } else if (def.caster) {
        if (dist < RANGED_BAND.near) { mx = -v.x; my = -v.y; k = 0.9; }
        else if (dist > RANGED_BAND.far) k = 1;
        else { mx = -v.y * sideOf(e); my = v.x * sideOf(e); k = 0.55; }
      }
      if (def.shield) {
        // the shield faces the way the carrier looks (aimX sign); it only turns after Kai has stayed behind it for turnDelay, so flanking works
        const side = dx >= 0 ? 1 : -1, face = e.aimX >= 0 ? 1 : -1;
        if (side !== face && Math.abs(dx) > 12) { e.modeT += dt; if (e.modeT >= def.shield.turnDelay) { e.aimX = side; e.modeT = 0; } } else e.modeT = 0;
      }
      slideMove(e, mx * e.speed * k * slow, my * e.speed * k * slow, dt);
      const inView = dist <= 470;
      if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange && inView) { if (def.shield) e.modeT = 0; beginWindup(state, e, v.x, v.y); }
    } else if (e.mode === 'windup') {
      e.modeT -= dt;
      // casters and flankers keep tracking the player until the aim freezes for the last part of the telegraph; the others commit at once
      if ((def.caster || e.kind === 'flanker') && e.modeT > a.windup * AIM_LOCK_FRACTION) { e.aimX = v.x; e.aimY = v.y; }
      if (e.kind === 'flanker') slideMove(e, -e.aimX * e.speed * 0.25, -e.aimY * e.speed * 0.25, dt);   // coils back before the slash
      if (e.modeT <= 0) release(state, e);
    } else if (e.mode === 'strike') {
      e.modeT -= dt;
      if (a.kind === 'lunge' || a.kind === 'dash') slideMove(e, e.aimX * a.speed, e.aimY * a.speed, dt);
      if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; }
    } else {
      e.modeT -= dt;
      if (def.caster) slideMove(e, -e.aimX * e.speed * 0.3, -e.aimY * e.speed * 0.3, dt);   // recoil drift
      if (e.modeT <= 0) { e.mode = 'move'; e.modeT = 0; e.attackCd = a.cooldown * (0.85 + (e.id % 5) * 0.075); }
    }
  }
  separate(state, dt);
}

/** Soft separation so crowds read as individuals instead of one blob; deterministic (fixed iteration order, no RNG). Pushes are summed per enemy and applied once. */
const pushX: number[] = [], pushY: number[] = [];
function separate(state: GameState, dt: number) {
  const list = state.enemies, n = list.length;
  for (let i = 0; i < n; i++) { pushX[i] = 0; pushY[i] = 0; }
  for (let i = 0; i < n; i++) {
    const a = list[i]; if (a.hp <= 0) continue;
    for (let j = i + 1; j < n; j++) {
      const b = list[j]; if (b.hp <= 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, min = (a.radius + b.radius) * 0.8;
      if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
      const d = Math.hypot(dx, dy); if (d >= min) continue;
      const push = Math.min(90, (min - d) * 6), ux = d > 0.001 ? dx / d : 1, uy = d > 0.001 ? dy / d : 0;
      const wa = b.radius / (a.radius + b.radius), wb = a.radius / (a.radius + b.radius);
      pushX[i] -= ux * push * wa; pushY[i] -= uy * push * wa; pushX[j] += ux * push * wb; pushY[j] += uy * push * wb;
    }
  }
  for (let i = 0; i < n; i++) { const e = list[i]; if ((pushX[i] !== 0 || pushY[i] !== 0) && e.mode !== 'strike' && !isBoss(e.kind)) slideMove(e, pushX[i], pushY[i], dt); }
}

export function updateEnemyShots(state: GameState, dt: number) {
  const p = state.player, keep = [];
  for (const s of state.enemyShots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.ttl -= dt;
    const hitWall = s.ttl <= 0 || blockedAt(s.x, s.y);
    // dash and hit invulnerability let a bolt pass through, so a well-timed dash is a real dodge
    if (!hitWall && p.invulnerable <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < p.radius + s.radius - 2) {
      damagePlayer(state, s.damage, s.kind ?? 'bolt');
      state.enemyEvents.push({ id: state.nextId++, kind: 'enemy_shot_hit', enemy: 'ranged', enemyId: 0, x: s.x, y: s.y, dirX: s.vx, dirY: s.vy, tag: s.kind }); capEvents(state);
      continue;
    }
    if (hitWall) { state.enemyEvents.push({ id: state.nextId++, kind: 'enemy_shot_hit', enemy: 'ranged', enemyId: 0, x: s.x, y: s.y, dirX: s.vx, dirY: s.vy, tag: s.kind }); capEvents(state); continue; }
    keep.push(s);
  }
  state.enemyShots = keep;
}

/** Timed ground hazards (boss ruptures and cones): they warn for `delay`, resolve once against Kai's feet, then linger only visually. */
export function updateHazards(state: GameState, dt: number) {
  if (!state.hazards.length) return;
  for (const h of state.hazards) {
    if (h.fired) { h.ttl -= dt; continue; }
    h.delay -= dt; if (h.delay > 0) continue;
    h.fired = true; h.ttl = 0.4;
    if (h.shape !== 'sigil' && h.damage > 0) {
      const hit = h.shape === 'cone' ? feetInCone(state, h) : feetInCircle(state, h.x, h.y, h.r);
      if (hit) damagePlayer(state, h.damage, h.tag);
    }
    state.enemyEvents.push({ id: state.nextId++, kind: 'hazard_fire', enemy: 'warden', enemyId: h.owner, x: h.x, y: h.y, dirX: Math.cos(h.ang), dirY: Math.sin(h.ang), tag: h.tag }); capEvents(state);
  }
  state.hazards = state.hazards.filter(h => !h.fired || h.ttl > 0);
}
const blockedAt = (x: number, y: number) => blocked(x, y, 3);
function capEvents(state: GameState) { if (state.enemyEvents.length > 64) state.enemyEvents.splice(0, state.enemyEvents.length - 64); }
