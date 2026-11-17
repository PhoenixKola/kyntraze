/** B22 Fractured Realms enemy behaviours: six archetypes (+ the Halo Scribe's sigil object), each making the player take a different decision. Every attack is a real simulated hazard or shot with a telegraph, a release and a recovery; nothing here is renderer-only. */
import type { Enemy, EnemyShot, GameState, Hazard } from './GameState';
import { ENEMIES, groundDy, type MobKind } from '../content/enemies';
import { blocked, slideMove } from './CollisionSystem';
import { addEnemy, pushEnemyEvent } from './EntityRegistry';
import { circle, cone, lane, sigil } from './bosses/kit';
import { behaviorOf } from './bosses/runner';
import { RULES } from '../core/Rules';
import { MODIFIER_RULES } from '../b22/challenges';
import { RELIC_RULES } from '../b22/relics';
import { bump } from '../b22/state';

const REALM_TAGS = new Set(['lance', 'lance_land', 'arrival', 'blink_strike', 'husk_well', 'husk_preview', 'mimic_echo', 'sigil_pulse', 'bulwark_shove']);
const sideOf = (e: Enemy) => (e.id % 2 === 0 ? 1 : -1);
const ex = (e: Enemy) => (e.ex ??= {});
const toward = (e: Enemy, x: number, y: number) => { const d = Math.hypot(x - e.x, y - e.y) || 1; return { x: (x - e.x) / d, y: (y - e.y) / d, d }; };

/** Hostile-shot time factor at the shot's position: Chronophage wells (slow 0.45 / fast 1.5, boss-owned shots only), the Void Hourglass bubble around the player, and Prismatic Rain's slower shots. */
export function wellFactor(state: GameState, s: EnemyShot): number {
  let k = 1;
  if (s.owner) for (const h of state.hazards) if (h.slow && h.fired && (h.activeLeft ?? 0) > 0 && (s.x - h.x) ** 2 + (s.y - h.y) ** 2 <= h.r * h.r) k *= h.slow;
  if (state.b22.hourT > 0 && (s.x - state.player.x) ** 2 + (s.y - state.player.y) ** 2 <= RELIC_RULES.hourglass.radius ** 2) k = Math.min(k, RELIC_RULES.hourglass.factor);
  if (!s.owner && state.plan.modifiers.includes('prismatic_rain')) k *= MODIFIER_RULES.rain.shot;
  return Math.min(1.5, Math.max(0.3, k));
}
/** A boss hazard was dodged with dash i-frames: the boss behaviour may open (Oathkeeper), mastery counts a perfect evade. */
export function onDodgedHazard(state: GameState, h: Hazard) {
  const e = state.enemies.find(x => x.id === h.owner && x.hp > 0); if (e) behaviorOf(e.kind)?.onEvade?.(state, e);
  bump(state.b22, 'evade.count'); state.b22.m['dodge.hazard'] = (state.b22.m['dodge.hazard'] ?? 0) + 1;
}
/** Removes telegraphs whose owner died before release (a dead Lancer must not strike) and the Husk's well when it dies or is staggered. */
export function cleanupRealm(state: GameState) {
  if (!state.hazards.length) return;
  let alive: Set<number> | null = null;
  state.hazards = state.hazards.filter(h => {
    if (!REALM_TAGS.has(h.tag)) return true;
    alive ??= new Set(state.enemies.filter(e => e.hp > 0).map(e => e.id));
    if (alive.has(h.owner)) return true;
    return h.fired && h.tag !== 'husk_well';
  });
}

export function updateDecoy(state: GameState, e: Enemy, dt: number) {
  const p = state.player, X = ex(e); X.ang = (X.ang ?? e.id) + dt * 0.7;
  const tx = p.x + Math.cos(X.ang) * 250, ty = p.y + Math.sin(X.ang) * 250, d = toward(e, tx, ty);
  slideMove(e, d.x * 90, d.y * 90, dt); e.aimX = p.x - e.x; e.aimY = p.y - e.y;
}

function releaseShield(e: Enemy) { return e.mode !== 'recover'; }
const ENEMY_SHOT_KINDS = ['enemy_strike', 'enemy_slam', 'enemy_shot'];
export function updateRealmEnemy(state: GameState, e: Enemy, dt: number) {
  const def = ENEMIES[e.kind as MobKind], a = def.attack, p = state.player, X = ex(e);
  e.touchCooldown = Math.max(0, e.touchCooldown - dt); e.attackCd = Math.max(0, e.attackCd - dt); e.stagger = Math.max(0, e.stagger - dt);
  const dx = p.x - e.x, dy = p.y - e.y, dist = Math.hypot(dx, dy) || 1, v = { x: dx / dist, y: dy / dist }, g = { x: e.x, y: e.y + groundDy(e.radius) }, slow = e.stagger > 0 ? 0.45 : 1;
  switch (e.kind) {
    case 'halo_sigil': {
      X.life = (X.life ?? 7) - dt; X.pulse = (X.pulse ?? 0.7) - dt;
      if (X.life <= 0) { e.hp = 0; pushEnemyEvent(state, 'enemy_death', e, 0, 0, 'sigil_expire'); return; }
      if (X.pulse <= 0) { X.pulse = a.cooldown; circle(state, e.x, e.y + 8, a.radius, a.windup, a.damage, e.id, 'sigil_pulse'); }
      return;
    }
    case 'sky_lancer': {
      if (e.mode === 'move') {
        let mx = -v.y * sideOf(e), my = v.x * sideOf(e), k = 0.55; if (dist < 220) { mx = -v.x; my = -v.y; k = 0.9; } else if (dist > 380) { mx = v.x; my = v.y; k = 1; }
        slideMove(e, mx * e.speed * k * slow, my * e.speed * k * slow, dt); e.aimX = v.x; e.aimY = v.y;
        if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange) { e.mode = 'windup'; e.modeT = a.windup; X.locked = 0; pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y); }
      } else if (e.mode === 'windup') {
        e.modeT -= dt;
        if (e.modeT > a.windup * 0.45) { e.aimX = v.x; e.aimY = v.y; }
        else if (!X.locked) {   // the vector locks here; the lane and the landing shadow become visible and cannot move again
          X.locked = 1; const ang = Math.atan2(e.aimY, e.aimX), len = a.speed * a.strike + e.radius;
          lane(state, g.x, g.y, ang, len, a.radius * 2, Math.max(0.05, e.modeT), a.damage, e.id, 'lance', a.strike);
          sigil(state, g.x + Math.cos(ang) * len, g.y + Math.sin(ang) * len, 30, Math.max(0.05, e.modeT), e.id, 'lance_land');
        }
        if (e.modeT <= 0) { e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY); }
      } else if (e.mode === 'strike') { e.modeT -= dt; slideMove(e, e.aimX * a.speed, e.aimY * a.speed, dt); if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown * (0.85 + (e.id % 5) * 0.075); } }
      break;
    }
    case 'halo_scribe': {
      if (e.mode === 'move') {
        let mx = -v.y * sideOf(e), my = v.x * sideOf(e), k = 0.55; if (dist < 230) { mx = -v.x; my = -v.y; k = 0.9; } else if (dist > 340) { mx = v.x; my = v.y; k = 1; }
        slideMove(e, mx * e.speed * k * slow, my * e.speed * k * slow, dt); e.aimX = v.x; e.aimY = v.y;
        if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange) { e.mode = 'windup'; e.modeT = a.windup; pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y); }
      } else if (e.mode === 'windup') { e.modeT -= dt; if (e.modeT <= 0) { placeSigils(state, e); e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY); } }
      else if (e.mode === 'strike') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; slideMove(e, -v.x * e.speed * 0.3, -v.y * e.speed * 0.3, dt); if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown * (0.85 + (e.id % 5) * 0.075); } }
      break;
    }
    case 'citadel_bulwark': {
      const sh = def.shield!;
      if (e.mode === 'move') {
        const side = dx >= 0 ? 1 : -1, face = e.aimX >= 0 ? 1 : -1;   // the shield turns only after you have stayed behind it for turnDelay
        if (side !== face && Math.abs(dx) > 12) { e.modeT += dt; if (e.modeT >= sh.turnDelay) { e.aimX = side; e.modeT = 0; } } else e.modeT = 0;
        slideMove(e, v.x * e.speed * slow, v.y * e.speed * slow, dt);
        if (e.attackCd <= 0 && dist <= a.range) { e.mode = 'windup'; e.modeT = a.windup; e.aimX = v.x; e.aimY = v.y; cone(state, g.x, g.y, 130, Math.atan2(v.y, v.x), (90 * Math.PI) / 180, a.windup, 0, e.id, 'bulwark_shove'); pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y); }
      } else if (e.mode === 'windup') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY); } }
      else if (e.mode === 'strike') { e.modeT -= dt; slideMove(e, e.aimX * a.speed, e.aimY * a.speed, dt); if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'move'; e.modeT = 0; e.attackCd = a.cooldown; } }
      // barrier: a limited cluster of nearby allies in the carrier's front arc, shrinking as its armour cracks (66% / 33% hp)
      const crack = e.hp / e.maxHp > 0.66 ? 4 : e.hp / e.maxHp > 0.33 ? 3 : 0; X.crack = crack;
      if (releaseShield(e) && crack > 0) {
        const fx = e.aimX >= 0 ? 1 : -1; let n = 0;
        for (const o of state.enemies) {
          if (n >= crack) break; if (o === e || o.hp <= 0 || o.kind === 'halo_sigil' || o.kind === 'citadel_bulwark' || o.part || (o.x - e.x) ** 2 + (o.y - e.y) ** 2 > 170 * 170) continue;
          if ((o.x - e.x) * fx < -20) continue;
          ex(o).barrier = e.id; ex(o).barrierT = 0.25; n++;
        }
      }
      break;
    }
    case 'rift_mimic': {
      // watch the nearest other attacker: the most recent attack inside 520 px becomes the single remembered snapshot
      for (const ev of state.enemyEvents) {
        if (ev.id <= (X.cursor ?? 0)) continue; X.cursor = ev.id;
        if (!ENEMY_SHOT_KINDS.includes(ev.kind) || ev.enemyId === e.id || ev.enemy === 'rift_mimic' || ev.tag === 'blink_in' || (ev.x - e.x) ** 2 + (ev.y - e.y) ** 2 > 520 * 520) continue;
        X.has = 1; X.kind = ev.kind === 'enemy_slam' ? 1 : ev.kind === 'enemy_shot' ? 2 : 0; X.sx = ev.x; X.sy = ev.y; X.sdx = ev.dirX; X.sdy = ev.dirY;
      }
      if (e.mode === 'move') {
        const k = dist > 220 ? 1 : dist < 150 ? -0.7 : 0.35; slideMove(e, (k >= 0 && dist <= 220 ? -v.y * sideOf(e) : v.x * k) * e.speed * slow, (k >= 0 && dist <= 220 ? v.x * sideOf(e) : v.y * k) * e.speed * slow, dt); e.aimX = v.x; e.aimY = v.y;
        if (e.attackCd <= 0 && X.has && dist <= a.range && state.hazards.filter(h => h.tag === 'mimic_echo').length < 3) { e.mode = 'windup'; e.modeT = a.windup; pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y); }
      } else if (e.mode === 'windup') {
        e.modeT -= dt;
        if (e.modeT <= 0) {   // the echo: a simplified replay of the remembered attack at the remembered place, after a visible countdown
          const gy = (X.sy ?? e.y) + 18, len = X.kind === 2 ? 320 : 220, ang = Math.atan2(X.sdy ?? 0, X.sdx ?? 1);
          if (X.kind === 1) circle(state, X.sx, gy, a.radius, 1.4, a.damage, e.id, 'mimic_echo', { echo: true });
          else lane(state, X.sx, gy, ang, len, X.kind === 2 ? 26 : 44, 1.4, a.damage, e.id, 'mimic_echo', 0.25, { echo: true });
          X.has = 0; e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY);
        }
      } else if (e.mode === 'strike') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown; } }
      break;
    }
    case 'phase_harrier': {
      if (e.mode === 'move') {
        const k = dist > 240 ? 1 : 0.3; slideMove(e, v.x * e.speed * k * slow, v.y * e.speed * k * slow, dt); e.aimX = v.x; e.aimY = v.y;
        if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange) {
          let dest: { x: number; y: number } | null = null;
          for (let i = 0; i < 8 && !dest; i++) { const ang = e.id * 1.7 + i * 0.785 + Math.floor(state.time) * 0.3, x = p.x + Math.cos(ang) * 105, y = p.y + Math.sin(ang) * 105; if (!blocked(x, y, e.radius + 2) && x > 80 && y > 80 && x < RULES.worldWidth - 80 && y < RULES.worldHeight - 80) dest = { x, y }; }
          if (dest) { X.dx = dest.x; X.dy = dest.y; X.stage = 0; e.mode = 'windup'; e.modeT = a.windup; sigil(state, dest.x, dest.y + groundDy(e.radius), 32, a.windup, e.id, 'arrival'); pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y, 'blink_mark'); } else e.attackCd = 1;
        }
      } else if (e.mode === 'windup') {
        e.modeT -= dt;
        if (e.modeT <= 0) {
          if (!X.stage) { X.stage = 1; e.mode = 'blink'; e.modeT = 0.2; pushEnemyEvent(state, 'enemy_strike', e, 0, 0, 'blink_out'); }
          else { X.stage = 3; e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY, 'harrier_strike'); }
        }
      } else if (e.mode === 'blink') {
        e.modeT -= dt;
        if (e.modeT <= 0) {   // the single blink: exactly onto the marked point, then a short, fully telegraphed strike
          e.x = X.dx; e.y = X.dy; X.stage = 2; const ang = Math.atan2(p.y - e.y, p.x - e.x); e.aimX = Math.cos(ang); e.aimY = Math.sin(ang);
          e.mode = 'windup'; e.modeT = 0.35; cone(state, e.x, e.y + groundDy(e.radius), 115, ang, (70 * Math.PI) / 180, 0.35, a.damage, e.id, 'blink_strike'); pushEnemyEvent(state, 'enemy_strike', e, 0, 0, 'blink_in');
        }
      } else if (e.mode === 'strike') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown; } }
      break;
    }
    case 'singularity_husk': {
      if (e.mode === 'move') {
        let mx = -v.y * sideOf(e), my = v.x * sideOf(e), k = 0.5; if (dist < 200) { mx = -v.x; my = -v.y; k = 0.8; } else if (dist > 330) { mx = v.x; my = v.y; k = 1; }
        slideMove(e, mx * e.speed * k * slow, my * e.speed * k * slow, dt); e.aimX = v.x; e.aimY = v.y;
        if (e.attackCd <= 0 && dist <= a.range && dist >= a.minRange && !state.hazards.some(h => h.tag === 'husk_well' && h.owner === e.id)) { e.mode = 'windup'; e.modeT = a.windup; X.wx = p.x; X.wy = p.y + 24; circle(state, X.wx, X.wy, a.radius, a.windup, 0, e.id, 'husk_preview'); pushEnemyEvent(state, 'enemy_telegraph', e, v.x, v.y); }
      } else if (e.mode === 'windup') {
        e.modeT -= dt;
        if (e.stagger > 0.05) { e.mode = 'recover'; e.modeT = a.recover; state.hazards = state.hazards.filter(h => !(h.owner === e.id && h.tag === 'husk_preview')); e.attackCd = a.cooldown; break; }   // an interrupt breaks the well before it forms
        if (e.modeT <= 0) { circle(state, X.wx, X.wy, a.radius, 0.01, a.damage, e.id, 'husk_well', { active: 2.4, pull: 90 }); e.mode = 'strike'; e.modeT = a.strike; pushEnemyEvent(state, 'enemy_strike', e, e.aimX, e.aimY); }
      } else if (e.mode === 'strike') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'recover'; e.modeT = a.recover; } }
      else { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'move'; e.attackCd = a.cooldown; } }
      break;
    }
    default: break;
  }
}
/** Up to two sigils per scribe and four in the arena, placed 110-150 px from the player on free ground. */
function placeSigils(state: GameState, e: Enemy) {
  const all = state.enemies.filter(o => o.kind === 'halo_sigil' && o.hp > 0), mine = all.filter(o => ex(o).by === e.id).length, p = state.player;
  for (let i = 0; i < 2 && mine + i < 2 && all.length + i < 4; i++) {
    for (let t = 0; t < 8; t++) {
      const ang = e.id * 2.3 + (i * 2 + t) * 0.9 + state.time, r = 110 + 40 * (t % 2), x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r;
      if (blocked(x, y, 14) || x < 90 || y < 90 || x > RULES.worldWidth - 90 || y > RULES.worldHeight - 90) continue;
      const sd = ENEMIES.halo_sigil, s = addEnemy(state, { kind: 'halo_sigil', x, y, hp: sd.hp, maxHp: sd.hp, radius: sd.radius, speed: 0, damage: 0, touchCooldown: 99, attackCd: 99, aimX: 0, aimY: 1, ex: { by: e.id, life: 7, pulse: 0.9 } });
      pushEnemyEvent(state, 'enemy_intro', s, 0, 0, 'sigil'); break;
    }
  }
}
