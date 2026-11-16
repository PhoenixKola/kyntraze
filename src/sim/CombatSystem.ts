import type { Enemy, GameState } from './GameState';
import { distanceSquared } from '../core/Math';
import { ENEMIES, isBoss } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { addPickup, pushEnemyEvent } from './EntityRegistry';
import { RULES } from '../core/Rules';
import { interruptOnHit } from './AbilitySystem';
import { slideMove } from './CollisionSystem';
import { COMET } from '../content/cometheart';
import { tryPerfectEvasion } from './ApexSystem';
import { ASCEND, HERO_KIT } from '../content/heroKits';

/** `src` names what hurt Kai (contact, lunge, dash, ram, slam, bolt, orb, rupture, sweep, rush, prism, ...) so feedback and tests can tell a telegraphed ability from body contact. */
export function damagePlayer(state: GameState, damage: number, src = 'contact'): boolean {
  const p = state.player;
  if (p.invulnerable > 0 || state.phase !== 'running') return false;
  if (p.form === 3 && p.evadeCooldown <= 0) {   // B13 Perfect Evasion: the nearest attacker is the threat Kai reads; one hit refused, then a cooldown
    let from: { x: number; y: number } | undefined, best = Infinity; for (const e of state.enemies) { if (e.hp <= 0) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < best) { best = d; from = e; } }
    if (tryPerfectEvasion(state, from)) return false;
  }
  p.hp = Math.max(0, p.hp - Math.max(0, damage) * state.mods.armor); p.invulnerable = RULES.contactInvulnerability;
  state.lastHit = { src, t: state.time };
  state.impacts.push({ id: state.nextId++, kind: 'hurt', x: p.x, y: p.y, ttl: 0.4, life: 0.4, heavy: damage >= 20 });
  interruptOnHit(state);
  if (p.hp <= 0 && state.mods.revive > 0) {   // Second Wind: the killing blow is refused once, with a protective grace window and a ring that shoves the crowd back
    state.mods.revive--; p.hp = p.maxHp * 0.5; p.invulnerable = 2.5; state.reviveAt = state.time;
    state.impacts.push({ id: state.nextId++, kind: 'revive', x: p.x, y: p.y, ttl: 0.6, life: 0.6 });
    for (const e of state.enemies) if (e.hp > 0 && !isBoss(e.kind) && distanceSquared(p.x, p.y, e.x, e.y) < 220 ** 2) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; slideMove(e, (e.x - p.x) / d * 900, (e.y - p.y) / d * 900, 0.2); }
  }
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

/** Kills are worth more as the run goes on: the late game thins out (boss mob caps, tougher enemies) but the level-up cadence holds. */
export const xpTimeScale = (t: number) => 1 + t / 400;
export function damageEnemy(state: GameState, enemy: Enemy, damage: number, opts?: { area?: boolean }): boolean {
  if (enemy.hp <= 0) return false;
  if (enemy.ai?.invuln) return false;
  let dmg = Math.max(0, damage), blocked = false;
  const boss = isBoss(enemy.kind);
  if (boss) { if (enemy.ai?.exposed) dmg *= 1 + BOSSES[enemy.kind as 'warden' | 'seraph'].exposedBonus; }
  else {
    const sh = ENEMIES[enemy.kind as keyof typeof ENEMIES].shield;
    if (sh && !opts?.area && shieldUp(enemy) && shieldFaces(state, enemy, sh.arc)) {
      dmg *= 1 - sh.reduction; blocked = true;
      if (state.time - (enemy.blockT ?? -1) > 0.12) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_block', enemy, enemy.aimX >= 0 ? 1 : -1, 0); }
    }
  }
  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.impacts.push({ id: state.nextId++, kind: blocked ? 'block' : 'hit', x: enemy.x, y: enemy.y, ttl: 0.16, life: 0.16, boss, heavy: !blocked && (dmg >= 30 || (boss && !!enemy.ai?.exposed)), kill: enemy.hp <= 0 });
  if (enemy.hp > 0) {
    if (boss) { if (state.time - (enemy.blockT ?? -1) > 0.35) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_hurt', enemy, 0, 0); } }
    else if (enemy.kind !== 'bruiser' && enemy.kind !== 'aegis') enemy.stagger = 0.12;
    return false;
  }
  pushEnemyEvent(state, 'enemy_death', enemy, enemy.aimX, enemy.aimY, boss ? 'boss' : undefined);
  if (boss && state.player.form === 3) state.abilityEvents.push({ id: state.nextId++, kind: 'finisher3', x: enemy.x, y: enemy.y, n: enemy.kind === 'seraph' ? 1 : 0 });   // B13: the silver finisher
  else if (boss && state.player.form === 2) state.abilityEvents.push({ id: state.nextId++, kind: 'finisher', x: enemy.x, y: enemy.y, n: enemy.kind === 'seraph' ? 1 : 0 });   // B12: Kai delivered the boss's last blow in Cometheart
  state.kills++; if (state.player.form === 0) state.player.drive = Math.min(100, state.player.drive + 8 * state.mods.driveGain);
  if (boss) { bossDefeated(state, enemy); return true; }
  if (state.pickups.length < RULES.maxPickups) { const d = ENEMIES[enemy.kind as keyof typeof ENEMIES]; addPickup(state, { x: enemy.x, y: enemy.y, xp: Math.round(d.xp * xpTimeScale(state.time) * 10) / 10, age: 0, tier: d.elite ? 2 : d.xp >= 3 ? 1 : 0 }); }
  return true;
}

/** Victory: the finale boss fell while Kai was still standing. Everything hostile is gone on the same tick, so nothing can hurt Kai afterwards (the sim stops stepping in this phase). */
export function winRun(state: GameState) {
  if (state.phase !== 'running') return;
  state.phase = 'victory'; state.victoryAt = state.time; state.hazards = []; state.enemyShots = []; state.arenaHazard.nextAt = 1e9;
  for (const e of state.enemies) if (e.hp > 0 && !isBoss(e.kind)) { e.hp = 0; pushEnemyEvent(state, 'enemy_death', e, e.aimX, e.aimY); }
  state.enemies = [];   // the boss's death event has already fired; the renderer plays its ghost, nothing stays in the frozen sim
}
/** Defeat: every hazard and boss bolt vanishes so nothing can hurt Kai afterwards, and a ring of XP orbs is the reward (no meta-progression is invented). */
function bossDefeated(state: GameState, boss: Enemy) {
  const def = BOSSES[boss.kind as 'warden' | 'seraph'];
  state.hazards = state.hazards.filter(h => h.owner !== boss.id);
  state.enemyShots = state.enemyShots.filter(s => s.kind !== 'prism');
  state.bossesDefeated++; state.lastBossDefeatAt = state.time;
  if (state.hero !== 'kai' && boss.kind === ASCEND.unlockBoss && !state.heroFormUnlocked) {   // B19: the Warden unlocks THIS runner's transformation (Kai's Cometheart is only ever unlocked by Kai)
    state.heroFormUnlocked = true; state.heroFormUnlockedNow = true; state.player.drive = 100;
    state.announce = { id: 'ascend', text: `${HERO_KIT[state.hero].form.toUpperCase()} UNLOCKED`, sub: 'Full Drive + F awakens your transformation', at: state.time + 2.5 };
  }
  if (state.hero === 'kai' && boss.kind === COMET.unlockBoss && !state.cometUnlocked) {   // B12: the Warden unlocks Cometheart for good; Drive is filled so Form II is playable at once (~7 min of a run remain)
    state.cometUnlocked = true; state.cometUnlockedNow = true; state.player.drive = 100;
    state.announce = { id: 'cometheart', text: 'COMETHEART UNLOCKED', sub: 'Full Drive + F awakens Form II', at: state.time + 2.5 };
  }
  pushEnemyEvent(state, 'boss_defeated', boss, 0, 0, boss.kind);
  if (boss.kind === 'seraph') { if (!state.apexUnlocked && state.hero === 'kai') state.apexUnlockedNow = true; if (state.phase === 'running') winRun(state); return; }   // B13: a Seraph victory unlocks Stillfire Apex for the NEXT run (never mid-run)
  // the Warden is the mid-run payoff: a heal now, then a guaranteed Rare-or-better pick once the death animation has played
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * 0.4); state.bossReward++; state.rewardAt = state.time + def.deathT + 0.8;
  for (let i = 0; i < def.rewardOrbs && state.pickups.length < RULES.maxPickups; i++) {
    const a = (i / def.rewardOrbs) * Math.PI * 2 + 0.4, r = 50 + (i % 3) * 22;
    addPickup(state, { x: boss.x + Math.cos(a) * r, y: boss.y + Math.sin(a) * r, xp: def.rewardXp, age: 0, tier: 3 });
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
