import { SeededRng } from '../core/SeededRng';
import { RULES } from '../core/Rules';
import { makeState, type GameState, type InputState } from './GameState';
import { movePlayer } from './MovementSystem';
import { moveEnemies, updateEnemyShots, updateHazards } from './EnemyAiSystem';
import { updateDirector } from './EnemyDirector';
import { updateAutoWeapon, activateQ } from './WeaponSystem';
import { updateContactDamage } from './CombatSystem';
import { collectPickups } from './PickupSystem';
import { applyUpgrade, createOffer, gainXp } from './UpgradeSystem';
import { formInput, updateCinema } from './FormSystem';
import { updateDrive } from './DriveSystem';
import { pruneDeadEntities } from './EntityRegistry';
import type { UpgradeId } from '../content/upgrades';
import { startAbility, updateAbilities, trackAim } from './AbilitySystem';
import { gradeRun } from './GameTelemetry';
import { updateArenaHazards } from './ArenaHazards';
import { setActiveArena } from './CollisionSystem';
import type { ArenaId } from '../content/arenas';
export class Simulation {
  readonly state: GameState;
  readonly rng: SeededRng;
  private qHeld = false;
  private fHeld = false;
  private eHeld = false;
  private rHeld = false;
  constructor(seed: number, arenaId: ArenaId = 'gloam', cometUnlocked = false, apexUnlocked = false) { this.rng = new SeededRng(seed); setActiveArena(arenaId); this.state = makeState(seed, arenaId, cometUnlocked, apexUnlocked); }
  step(dt: number, input: InputState) {
    const s = this.state; if (s.phase !== 'running') return;
    if (s.cinema) { updateCinema(s, dt); this.fHeld = !!(input.f || input.fHeld); this.qHeld = input.q; this.eHeld = !!input.beam; this.rHeld = !!input.sphere; return; }   // B12: the reveal freezes the whole run (clock, enemies, shots, hazards, cooldowns, i-frames)
    s.time += dt;
    trackAim(s, input);
    movePlayer(s, input, dt);
    if (input.q && !this.qHeld) activateQ(s);
    const fDown = !!(input.f || input.fHeld); formInput(s, fDown, this.fHeld, dt);   // the press edge counts too, so a tap shorter than one tick is never lost
    if (input.beam && !this.eHeld) startAbility(s, 'beam');
    if (input.sphere && !this.rHeld) startAbility(s, 'sphere');
    this.qHeld = input.q; this.fHeld = fDown; this.eHeld = !!input.beam || !!input.beamHeld; this.rHeld = !!input.sphere; s.eHeld = !!input.beamHeld;
    const p = s.player; p.qCooldown = Math.max(0, p.qCooldown - dt);
    if (s.mods.regen > 0) p.hp = Math.min(p.maxHp, p.hp + s.mods.regen * dt);
    updateDrive(s, dt);
    updateAbilities(s, dt);
    updateDirector(s, this.rng, dt);
    moveEnemies(s, dt);
    updateEnemyShots(s, dt);
    updateArenaHazards(s);
    updateHazards(s, dt);
    updateAutoWeapon(s, dt);
    updateContactDamage(s);
    if (s.phase !== 'running') return;
    collectPickups(s, dt, () => { s.upgradeOffers = createOffer(s, this.rng); });
    if (s.phase === 'running' && s.bossReward > 0 && s.time >= s.rewardAt) { s.bossReward--; s.phase = 'upgrade'; s.rewardPick = true; s.upgradeOffers = createOffer(s, this.rng, true); }
    pruneDeadEntities(s);
    for (const fx of s.impacts) fx.ttl -= dt;
    s.impacts = s.impacts.filter(effect => effect.ttl > 0).slice(-RULES.maxFx);
  }
  chooseUpgrade(id: UpgradeId) {
    const applied = applyUpgrade(this.state, id);
    if (applied && this.state.player.xp >= this.state.player.nextXp) {
      // Carry over surplus XP; schedule another legit choice rather than lose earned XP.
      gainXp(this.state, 0.000001, () => { this.state.upgradeOffers = createOffer(this.state, this.rng); });
    }
    return applied;
  }
  /** QA / tests: the next level-up, exactly as a real XP pickup would trigger it. */
  debugLevelUp() { const s = this.state; if (s.phase !== 'running') return; gainXp(s, (s.player.nextXp - s.player.xp) / s.mods.xp, () => { s.upgradeOffers = createOffer(s, this.rng); }); }
  togglePause() { const phase = this.state.phase; if (phase === 'running') this.state.phase = 'paused'; else if (phase === 'paused') this.state.phase = 'running'; }
  forcePause() { if (this.state.phase === 'running') this.state.phase = 'paused'; }
  stats() { const s = this.state; return gradeRun({ seed: s.seed, survivalSeconds: s.time, kills: s.kills, level: s.player.level, victory: s.phase === 'victory', bosses: s.bossesDefeated }); }
}
