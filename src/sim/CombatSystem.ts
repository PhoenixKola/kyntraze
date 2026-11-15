import type { Enemy, GameState } from './GameState';
import { distanceSquared } from '../core/Math';
import { ENEMIES, isBoss } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { addPickup, pushEnemyEvent } from './EntityRegistry';
import { RULES } from '../core/Rules';
import { interruptOnHit } from './AbilitySystem';

/** `src` names what hurt Kai (contact, lunge, dash, ram, slam, bolt, orb, rupture, sweep, rush, prism, ...) so feedback and tests can tell a telegraphed ability from body contact. */
export function damagePlayer(state: GameState, damage: number, src = 'contact'): boolean {
  const p = state.player;
  if (p.invulnerable > 0 || state.phase !== 'running') return false;
  p.hp = Math.max(0, p.hp - Math.max(0, damage)); p.invulnerable = RULES.contactInvulnerability;
  state.lastHit = { src, t: state.time };
  state.impacts.push({ id: state.nextId++, kind: 'hit', x: p.x, y: p.y, ttl: 0.4, life: 0.4 });
  interruptOnHit(state);
  if (p.hp <= 0) state.phase = 'dead'; return true;
}

/** The shield is up while the carrier walks, braces and rams; it drops during recovery (the punish window). */
export const shieldUp = (e: Enemy) => e.mode !== 'recover' && e.mode !== 'intro';
/** Frontal test on the horizontal facing the sprite shows (aimX sign): within `arc` degrees of that facing. */
export function shieldFaces(state: GameState, e: Enemy, arcDeg: number): boolean {
  const dx = state.player.x - e.x, dy = state.player.y - e.y, d = Math.hypot(dx, dy); if (d < 1) return true;
  const f = e.aimX >= 0 ? 1 : -1;
  return dx * f >= d * Math.cos((arcDeg * Math.PI) / 180);
}

export function damageEnemy(state: GameState, enemy: Enemy, damage: number, opts?: { area?: boolean }): boolean {
  if (enemy.hp <= 0) return false;
  if (enemy.ai?.invuln) return false;
  let dmg = Math.max(0, damage);
  const boss = isBoss(enemy.kind);
  if (boss) { if (enemy.ai?.exposed) dmg *= 1 + BOSSES[enemy.kind as 'warden' | 'seraph'].exposedBonus; }
  else {
    const sh = ENEMIES[enemy.kind as keyof typeof ENEMIES].shield;
    if (sh && !opts?.area && shieldUp(enemy) && shieldFaces(state, enemy, sh.arc)) {
      dmg *= 1 - sh.reduction;
      if (state.time - (enemy.blockT ?? -1) > 0.12) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_block', enemy, enemy.aimX >= 0 ? 1 : -1, 0); }
    }
  }
  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.impacts.push({ id: state.nextId++, kind: 'hit', x: enemy.x, y: enemy.y, ttl: 0.16, life: 0.16 });
  if (enemy.hp > 0) {
    if (boss) { if (state.time - (enemy.blockT ?? -1) > 0.35) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_hurt', enemy, 0, 0); } }
    else if (enemy.kind !== 'bruiser' && enemy.kind !== 'aegis') enemy.stagger = 0.12;
    return false;
  }
  pushEnemyEvent(state, 'enemy_death', enemy, enemy.aimX, enemy.aimY, boss ? 'boss' : undefined);
  state.kills++; if (state.player.form === 0) state.player.drive = Math.min(100, state.player.drive + 8);
  if (boss) { bossDefeated(state, enemy); return true; }
  if (state.pickups.length < RULES.maxPickups) addPickup(state, { x: enemy.x, y: enemy.y, xp: ENEMIES[enemy.kind as keyof typeof ENEMIES].xp, age: 0 });
  return true;
}

/** Defeat: every hazard and boss bolt vanishes so nothing can hurt Kai afterwards, and a ring of XP orbs is the reward (no meta-progression is invented). */
function bossDefeated(state: GameState, boss: Enemy) {
  const def = BOSSES[boss.kind as 'warden' | 'seraph'];
  state.hazards = state.hazards.filter(h => h.owner !== boss.id);
  state.enemyShots = state.enemyShots.filter(s => s.kind !== 'prism');
  state.bossesDefeated++;
  pushEnemyEvent(state, 'boss_defeated', boss, 0, 0, boss.kind);
  for (let i = 0; i < def.rewardOrbs && state.pickups.length < RULES.maxPickups; i++) {
    const a = (i / def.rewardOrbs) * Math.PI * 2 + 0.4, r = 50 + (i % 3) * 22;
    addPickup(state, { x: boss.x + Math.cos(a) * r, y: boss.y + Math.sin(a) * r, xp: def.rewardXp, age: 0 });
  }
}

/** Body contact is a threat while an enemy walks (move) or is open (recover). It is suppressed during the telegraph (windup) and during non-contact strikes (slam, shots), because those attacks carry their own damage: no double hit. Lunge/dash/ram/rush strikes hurt on contact with the attack's damage. */
export function contactDamage(e: Enemy): { dmg: number; src: string } | null {
  if (e.mode === 'windup' || e.mode === 'intro' || e.mode === 'phase' || e.mode === 'blink') return null;
  if (isBoss(e.kind)) {
    if (e.mode === 'strike') return null;   // boss strikes hurt through their own ground-plane checks
    return { dmg: BOSSES[e.kind as 'warden' | 'seraph'].contact, src: 'contact' };
  }
  const a = ENEMIES[e.kind as keyof typeof ENEMIES].attack;
  if (e.mode === 'strike') return a.kind === 'lunge' || a.kind === 'dash' ? { dmg: a.damage, src: e.kind === 'aegis' ? 'ram' : a.kind } : null;
  return { dmg: e.damage, src: 'contact' };
}

export function updateContactDamage(state: GameState) {
  const p = state.player;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.touchCooldown > 0) continue;
    if (distanceSquared(p.x, p.y, enemy.x, enemy.y) < (p.radius + enemy.radius - 4) ** 2) {
      const c = contactDamage(enemy); if (!c) continue;
      if (damagePlayer(state, c.dmg, c.src)) enemy.touchCooldown = 0.85;
      if (state.phase === 'dead') return;
    }
  }
}
