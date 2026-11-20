import type { Enemy, GameState } from './GameState';
import { OD } from '../content/kaiCombat';
import { odGain } from './KaiCombat';
import { distanceSquared } from '../core/Math';
import { ENEMIES, isBoss, type BossKind } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { addPickup, pushEnemyEvent } from './EntityRegistry';
import { RULES } from '../core/Rules';
import { interruptOnHit } from './AbilitySystem';
import { slideMove } from './CollisionSystem';
import { COMET } from '../content/cometheart';
import { tryPerfectEvasion } from './ApexSystem';
import { ASCEND, HERO_KIT } from '../content/heroKits';
import { behaviorOf } from './bosses/runner';
import { stepById } from '../b22/plan';
import { MODIFIER_RULES } from '../b22/challenges';
import { b22PostDamage, b22PreDamage, type HitOpts } from './B22Hooks';
import { noteBossKill } from './B22Mastery';
import { vexIntercept } from './VexSystem';
import { downFighter } from './CoopSystem';

/** `src` names what hurt Kai (contact, lunge, dash, ram, slam, bolt, orb, rupture, sweep, rush, prism, ...) so feedback and tests can tell a telegraphed ability from body contact. */
export function damagePlayer(state: GameState, damage: number, src = 'contact', from?: { x: number; y: number }, owner?: number): boolean {
  const p = state.player;
  if (p.invulnerable > 0 || state.phase !== 'running' || (state.party && p.hp <= 0)) return false;
  if (state.hero === 'vex') {   // B22: Parry Halo. A hit in the perfect window is refused and answered; a late hit is only softened. Arena hazards (owner 0) are never parryable.
    const g = vexIntercept(state, damage, from, owner ?? state.lastHazardOwner); if (g) { if (g.parried) { p.invulnerable = Math.max(p.invulnerable, 0.25); return false; } damage = g.dmg; }
  }
  if (p.form === 3 && p.evadeCooldown <= 0) {   // B13 Perfect Evasion: the nearest attacker is the threat Kai reads; one hit refused, then a cooldown
    let from: { x: number; y: number } | undefined, best = Infinity; for (const e of state.enemies) { if (e.hp <= 0) continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < best) { best = d; from = e; } }
    if (tryPerfectEvasion(state, from)) return false;
  }
  p.hp = Math.max(0, p.hp - Math.max(0, damage) * state.mods.armor * state.run.damageTakenMult * (state.b22.dawnT > 0 ? 0.65 : 1)); p.invulnerable = RULES.contactInvulnerability; state.b22.bossHurt = true;
  state.lastHit = { src, t: state.time };
  state.impacts.push({ id: state.nextId++, kind: 'hurt', x: p.x, y: p.y, ttl: 0.4, life: 0.4, heavy: damage >= 20 });
  interruptOnHit(state);
  if (p.hp <= 0 && state.mods.revive > 0) {   // Second Wind: the killing blow is refused once, with a protective grace window and a ring that shoves the crowd back
    state.mods.revive--; p.hp = p.maxHp * 0.5; p.invulnerable = 2.5; state.reviveAt = state.time;
    state.impacts.push({ id: state.nextId++, kind: 'revive', x: p.x, y: p.y, ttl: 0.6, life: 0.6 });
    for (const e of state.enemies) if (e.hp > 0 && !isBoss(e.kind) && distanceSquared(p.x, p.y, e.x, e.y) < 220 ** 2) { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; slideMove(e, (e.x - p.x) / d * 900, (e.y - p.y) / d * 900, 0.2); }
  }
  if (p.hp <= 0) { if (state.party) downFighter(state); else state.phase = 'dead'; } return true;
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
export function damageEnemy(state: GameState, enemy: Enemy, damage: number, opts?: HitOpts): boolean {
  if (enemy.hp <= 0) return false;
  if (state.hero === 'kai' && state.player.odT > 0) damage *= OD.dmgMul;   // Primal Overdrive
  if (enemy.ai?.invuln) return false;
  let dmg = Math.max(0, damage), blocked = false;
  const boss = isBoss(enemy.kind);
  if (boss) {
    const def = BOSSES[enemy.kind as BossKind];
    if (enemy.part && state.party && enemy.part.role === 'anchor') {   // B22.6 co-op rule A: a Sovereign anchor is LINKED: one fighter can deal at most 60% of its health, the rest must come from the partner
      const k = `d${state.party.cur}`, ex = (enemy.ex ??= {}), room = Math.max(0, enemy.maxHp * 0.6 - (ex[k] ?? 0)); dmg = Math.min(dmg, room); ex[k] = (ex[k] ?? 0) + dmg; if (dmg <= 0) return false;
    }
    if (!enemy.part) {
      const beh = behaviorOf(enemy.kind); if (beh?.onDamage) dmg = beh.onDamage(state, enemy, dmg, opts);   // B22 bosses route / refuse / reflect here
      if (dmg <= 0) return false;
      if (enemy.ai?.exposed) dmg *= 1 + def.exposedBonus; else dmg *= def.armor ?? 1;   // armour (B22 bosses only; classic = 1)
    }
  } else {
    const sh = ENEMIES[enemy.kind as keyof typeof ENEMIES].shield;
    if (sh && !opts?.area && shieldUp(enemy) && !((enemy.ex?.broken ?? 0) > 0) && shieldFaces(state, enemy, sh.arc)) {
      dmg *= 1 - sh.reduction; blocked = true;
      if (state.time - (enemy.blockT ?? -1) > 0.12) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_block', enemy, enemy.aimX >= 0 ? 1 : -1, 0); }
    }
    const bx = enemy.ex;   // Citadel Bulwark barrier: ordinary allies under it take far less from the barrier's side
    if (bx && (bx.barrierT ?? 0) > 0 && !opts?.area) { const b = state.enemies.find(o => o.id === bx.barrier && o.hp > 0); if (b && (state.player.x - enemy.x) * (b.aimX >= 0 ? 1 : -1) > 0) { dmg *= 0.3; blocked = true; } }
    if (enemy.kind === 'phase_harrier' && enemy.mode === 'recover') dmg *= 1.25;   // left open after its strike
  }
  dmg = b22PreDamage(state, enemy, dmg, opts);
  enemy.hp = Math.max(0, enemy.hp - dmg); if (dmg > 0 && !enemy.part) odGain(state);
  state.impacts.push({ id: state.nextId++, kind: blocked ? 'block' : 'hit', x: enemy.x, y: enemy.y, ttl: 0.16, life: 0.16, boss, heavy: !blocked && (dmg >= 30 || (boss && !!enemy.ai?.exposed)), kill: enemy.hp <= 0 });
  b22PostDamage(state, enemy, dmg, opts);
  if (enemy.part) { const core = state.enemies.find(c => c.id === enemy.part!.of); if (core) behaviorOf(core.kind)?.onPartHit?.(state, core, enemy, dmg); }
  if (enemy.hp > 0) {
    if (boss) { if (state.time - (enemy.blockT ?? -1) > 0.35) { enemy.blockT = state.time; pushEnemyEvent(state, 'enemy_hurt', enemy, 0, 0); } }
    else if (enemy.kind !== 'bruiser' && enemy.kind !== 'aegis' && enemy.kind !== 'citadel_bulwark') enemy.stagger = 0.12;
    return false;
  }
  pushEnemyEvent(state, 'enemy_death', enemy, enemy.aimX, enemy.aimY, boss && !enemy.part ? 'boss' : enemy.part ? 'part' : undefined); if (!enemy.part) odGain(state, true);
  if (enemy.part) { partDestroyed(state, enemy); return true; }
  if (boss && state.player.form === 3) state.abilityEvents.push({ id: state.nextId++, kind: 'finisher3', x: enemy.x, y: enemy.y, n: enemy.kind === 'seraph' ? 1 : 0 });   // B13: the silver finisher
  else if (boss && state.player.form === 2) state.abilityEvents.push({ id: state.nextId++, kind: 'finisher', x: enemy.x, y: enemy.y, n: enemy.kind === 'seraph' ? 1 : 0 });   // B12: Kai delivered the boss's last blow in Cometheart
  if (enemy.kind !== 'halo_sigil') { state.kills++; if (state.player.form === 0 && state.hero !== 'vex') state.player.drive = Math.min(100, state.player.drive + 8 * state.mods.driveGain); }
  if (boss) { bossDefeated(state, enemy); return true; }
  const d = ENEMIES[enemy.kind as keyof typeof ENEMIES];
  if (d.xp > 0 && state.pickups.length < RULES.maxPickups) addPickup(state, { x: enemy.x, y: enemy.y, xp: Math.round(d.xp * xpTimeScale(state.time) * 10) / 10 * (state.plan.modifiers.includes('guardians_burden') && d.shield ? MODIFIER_RULES.burden.xp : 1), age: 0, tier: d.elite ? 2 : d.xp >= 3 ? 1 : 0 });
  return true;
}
/** A multi-part boss part or an illusion died: the core's behaviour reacts (shield drop, harmony break, phase advance); nothing here ends the fight. */
function partDestroyed(state: GameState, part: Enemy) {
  const core = state.enemies.find(c => c.id === part.part!.of);
  if (part.part!.role !== 'decoy') state.kills++;
  if (core) behaviorOf(core.kind)?.onPartDeath?.(state, core, part);
  if (part.part!.role !== 'decoy' && state.pickups.length < RULES.maxPickups) addPickup(state, { x: part.x, y: part.y, xp: 4, age: 0, tier: 2 });
}

/** Victory: the finale boss fell while Kai was still standing. Everything hostile is gone on the same tick, so nothing can hurt Kai afterwards (the sim stops stepping in this phase). */
export function winRun(state: GameState) {
  if (state.phase !== 'running') return;
  state.phase = 'victory'; state.victoryAt = state.time; state.hazards = []; state.enemyShots = []; state.arenaHazard.nextAt = 1e9;
  for (const e of state.enemies) if (e.hp > 0 && !isBoss(e.kind)) { e.hp = 0; pushEnemyEvent(state, 'enemy_death', e, e.aimX, e.aimY); }
  state.enemies = [];   // the boss's death event has already fired; the renderer plays its ghost, nothing stays in the frozen sim
}
/** A boss fell. The run plan decides what that means: a heal + pick (Warden, boss-rush legs, endless), the end of the run (the plan's final step), nothing special. Classic unlocks (Cometheart, Stillfire, hero forms) fire only on the Classic plan. */
function bossDefeated(state: GameState, boss: Enemy) {
  const def = BOSSES[boss.kind as BossKind], plan = state.plan, stepId = boss.stepId ?? boss.kind, step = stepById(plan, stepId);
  behaviorOf(boss.kind)?.onDeath?.(state, boss);
  state.hazards = state.hazards.filter(h => h.owner !== boss.id);
  state.enemyShots = state.enemyShots.filter(s => s.kind !== 'prism' && s.owner !== boss.id);
  state.bossesDefeated++; state.lastBossDefeatAt = state.time; state.encounter.doneAt[stepId] = state.time;
  noteBossKill(state, boss);
  if (plan.unlocks && state.hero !== 'kai' && state.hero !== 'vex' && boss.kind === ASCEND.unlockBoss && !state.heroFormUnlocked) {   // B19: the Warden unlocks THIS runner's transformation (Kai's Cometheart is only ever unlocked by Kai)
    state.heroFormUnlocked = true; state.heroFormUnlockedNow = true; state.player.drive = 100;
    state.announce = { id: 'ascend', text: `${HERO_KIT[state.hero as 'ren' | 'sora'].form.toUpperCase()} UNLOCKED`, sub: 'Full Drive + F awakens your transformation', at: state.time + 2.5 };
  }
  if (plan.unlocks && state.hero === 'vex' && boss.kind === ASCEND.unlockBoss && !state.b22.vex.forms[0]) {   // B22: the Warden also unlocks Riftbound for Vex (the Trial chapters unlock it too)
    state.b22.vex.forms[0] = true; state.heroFormUnlocked = true; state.heroFormUnlockedNow = true; state.player.drive = 100;
    state.announce = { id: 'ascend', text: 'RIFTBOUND UNLOCKED', sub: 'Full Drive + F awakens your transformation', at: state.time + 2.5 };
  }
  if (plan.unlocks && state.hero === 'kai' && boss.kind === COMET.unlockBoss && !state.cometUnlocked) {   // B12: the Warden unlocks Cometheart for good; Drive is filled so Form II is playable at once (~7 min of a run remain)
    state.cometUnlocked = true; state.cometUnlockedNow = true; state.player.drive = 100;
    state.announce = { id: 'cometheart', text: 'COMETHEART UNLOCKED', sub: 'Full Drive + F awakens Form II', at: state.time + 2.5 };
  }
  pushEnemyEvent(state, 'boss_defeated', boss, 0, 0, boss.kind);
  if (step?.ends || step?.reward === 'victory') { if (plan.unlocks && boss.kind === 'seraph' && !state.apexUnlocked && state.hero === 'kai') state.apexUnlockedNow = true; if (state.phase === 'running') winRun(state); return; }   // B13: a Seraph victory unlocks Stillfire Apex for the NEXT run (never mid-run)
  // the mid-run payoff: a heal now, then a guaranteed Rare-or-better pick once the death animation has played
  const heal = plan.mode === 'boss_rush' ? plan.interHeal : 0.4;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * heal); state.bossReward++; state.rewardAt = state.time + def.deathT + 0.8;
  if (step?.reward === 'relic') state.b22.relicWanted = true;
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
    const c = BOSSES[e.kind as BossKind].contact; return c > 0 ? { dmg: c, src: 'contact' } : null;
  }
  const a = ENEMIES[e.kind as keyof typeof ENEMIES].attack;
  if (e.mode === 'strike') return a.kind === 'lunge' || a.kind === 'dash' || a.kind === 'barrier' ? { dmg: a.damage, src: e.kind === 'aegis' ? 'ram' : a.kind === 'barrier' ? 'shove' : a.kind } : null;
  return { dmg: e.damage, src: 'contact' };
}

export function updateContactDamage(state: GameState) {
  const p = state.player;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || enemy.touchCooldown > 0) continue;
    if (distanceSquared(p.x, p.y, enemy.x, enemy.y) < (p.radius + enemy.radius - 4) ** 2) {
      const c = contactDamage(enemy); if (!c) continue;
      if (damagePlayer(state, c.dmg, c.src, enemy, enemy.id)) enemy.touchCooldown = 0.85;
      if (state.phase === 'dead') return;
    }
  }
}
