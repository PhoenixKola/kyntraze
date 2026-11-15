import type { Enemy, GameState } from './GameState';
import { normalize } from '../core/Math';
import { slideMove } from './CollisionSystem';
import { AIM_LOCK_FRACTION, ENEMIES, RANGED_BAND } from '../content/enemies';
import { damagePlayer } from './CombatSystem';
import { pushEnemyEvent } from './EntityRegistry';

const STAGGER_SLOW = 0.45;
const SHOT_TTL = 2.6;
const sideOf = (e: Enemy) => (e.id % 2 === 0 ? 1 : -1);

function beginWindup(state: GameState, e: Enemy, nx: number, ny: number) {
  const a = ENEMIES[e.kind].attack;
  e.mode = 'windup'; e.modeT = a.windup; e.aimX = nx; e.aimY = ny;
  pushEnemyEvent(state, 'enemy_telegraph', e, nx, ny);
}

function release(state: GameState, e: Enemy) {
  const a = ENEMIES[e.kind].attack, p = state.player;
  e.mode = 'strike'; e.modeT = a.strike;
  pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY);
  if (a.kind === 'slam') {
    pushEnemyEvent(state, 'enemy_slam', e, e.aimX, e.aimY);
    if (Math.hypot(p.x - e.x, p.y - e.y) <= a.radius + p.radius) damagePlayer(state, a.damage);
  } else if (a.kind === 'shot') {
    state.enemyShots.push({ id: state.nextId++, x: e.x + e.aimX * (e.radius + 6), y: e.y + e.aimY * (e.radius + 6), vx: e.aimX * a.speed, vy: e.aimY * a.speed, ttl: SHOT_TTL, damage: a.damage, radius: a.radius });
    pushEnemyEvent(state, 'enemy_shot', e, e.aimX, e.aimY);
  }
}

export function moveEnemies(state: GameState, dt: number) {
  const p = state.player;
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const def = ENEMIES[e.kind], a = def.attack;
    e.touchCooldown = Math.max(0, e.touchCooldown - dt); e.attackCd = Math.max(0, e.attackCd - dt); e.stagger = Math.max(0, e.stagger - dt);
    const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy), v = normalize(dx, dy);
    const slow = e.stagger > 0 ? STAGGER_SLOW : 1;
    if (e.mode === 'move') {
      let mx = v.x, my = v.y, k = 1;
      if (e.kind === 'flanker') {
        // weaves around the line of pursuit; inside ~300 px it commits to an arc around the player
        const wave = Math.sin(state.time * 2.7 + e.id) * 0.45 + (dist < 300 ? sideOf(e) * 0.35 : 0);
        mx = v.x - v.y * wave; my = v.y + v.x * wave;
      } else if (e.kind === 'ranged') {
        if (dist < RANGED_BAND.near) { mx = -v.x; my = -v.y; k = 0.9; }
        else if (dist > RANGED_BAND.far) k = 1;
        else { mx = -v.y * sideOf(e); my = v.x * sideOf(e); k = 0.55; }
      }
      slideMove(e, mx * e.speed * k * slow, my * e.speed * k * slow, dt);
      const inView = dist <= 470;
      if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange && inView) beginWindup(state, e, v.x, v.y);
    } else if (e.mode === 'windup') {
      e.modeT -= dt;
      // ranged and flanker keep tracking the player until the aim freezes for the last part of the telegraph; the others commit at once
      if ((e.kind === 'ranged' || e.kind === 'flanker') && e.modeT > a.windup * AIM_LOCK_FRACTION) { e.aimX = v.x; e.aimY = v.y; }
      if (e.kind === 'flanker') slideMove(e, -e.aimX * e.speed * 0.25, -e.aimY * e.speed * 0.25, dt);   // coils back before the slash
      if (e.modeT <= 0) release(state, e);
    } else if (e.mode === 'strike') {
      e.modeT -= dt;
      if (a.kind === 'lunge' || a.kind === 'dash') slideMove(e, e.aimX * a.speed, e.aimY * a.speed, dt);
      if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; }
    } else {
      e.modeT -= dt;
      if (e.kind === 'ranged') slideMove(e, -e.aimX * e.speed * 0.3, -e.aimY * e.speed * 0.3, dt);   // recoil drift
      if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown * (0.85 + (e.id % 5) * 0.075); }
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
  for (let i = 0; i < n; i++) if ((pushX[i] !== 0 || pushY[i] !== 0) && list[i].mode !== 'strike') slideMove(list[i], pushX[i], pushY[i], dt);
}

export function updateEnemyShots(state: GameState, dt: number) {
  const p = state.player, keep = [];
  for (const s of state.enemyShots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.ttl -= dt;
    const hitWall = s.ttl <= 0 || blockedAt(s.x, s.y);
    // dash and hit invulnerability let a bolt pass through, so a well-timed dash is a real dodge
    if (!hitWall && p.invulnerable <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < p.radius + s.radius - 2) {
      damagePlayer(state, s.damage);
      state.enemyEvents.push({ id: state.nextId++, kind: 'enemy_shot_hit', enemy: 'ranged', enemyId: 0, x: s.x, y: s.y, dirX: s.vx, dirY: s.vy }); capEvents(state);
      continue;
    }
    if (hitWall) { state.enemyEvents.push({ id: state.nextId++, kind: 'enemy_shot_hit', enemy: 'ranged', enemyId: 0, x: s.x, y: s.y, dirX: s.vx, dirY: s.vy }); capEvents(state); continue; }
    keep.push(s);
  }
  state.enemyShots = keep;
}
import { blocked } from './CollisionSystem';
const blockedAt = (x: number, y: number) => blocked(x, y, 3);
function capEvents(state: GameState) { if (state.enemyEvents.length > 64) state.enemyEvents.splice(0, state.enemyEvents.length - 64); }
