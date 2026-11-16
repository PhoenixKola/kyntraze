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
import { formInput, updateCinema, updateSelector } from './FormSystem';
import { updateDrive } from './DriveSystem';
import { pruneDeadEntities } from './EntityRegistry';
import type { UpgradeId } from '../content/upgrades';
import { startAbility, updateAbilities, trackAim } from './AbilitySystem';
import { updateHero } from './HeroSystem';
import { gradeRun } from './GameTelemetry';
import { updateArenaHazards } from './ArenaHazards';
import { setActiveArena } from './CollisionSystem';
import type { ArenaId } from '../content/arenas';
import { applyRunConfig, NO_CONFIG, type RunConfig } from './RunConfig';
/** Seconds a refused Q / E / R press stays armed (B20). */
export const ABILITY_BUFFER = 0.15;
export class Simulation {
  readonly state: GameState;
  readonly rng: SeededRng;
  private qHeld = false;
  private fHeld = false;
  private eHeld = false;
  private rHeld = false;
  constructor(seed: number, arenaId: ArenaId = 'gloam', cometUnlocked = false, apexUnlocked = false, config: RunConfig = NO_CONFIG) { this.rng = new SeededRng(seed); setActiveArena(arenaId); this.state = makeState(seed, arenaId, cometUnlocked, apexUnlocked); applyRunConfig(this.state, config); }
  private readonly buf = { q: 0, e: 0, r: 0 };
  step(dt: number, input: InputState) {
    const s = this.state; if (s.phase !== 'running') return;
    { const f = s.player.form, id = s.hero === 'kai' ? f : s.hero === 'ren' ? 10 : 11; if (f && !s.run.formsUsed.includes(id)) s.run.formsUsed.push(id); }   // B19: Ren / Sora log their own ids (10 / 11), never Kai's Flarebound   // B18: feats read the forms Kai actually used
    if (s.cinema) { updateCinema(s, dt); this.fHeld = !!(input.f || input.fHeld); this.qHeld = input.q; this.eHeld = !!input.beam; this.rHeld = !!input.sphere; return; }   // B12: the reveal freezes the whole run (clock, enemies, shots, hazards, cooldowns, i-frames)
    if (s.selector.open) {   // the form selector freezes the run just like the reveal; only its own input is read
      const fd = !!(input.f || input.fHeld); trackAim(s, input);
      updateSelector(s, dt, { pick: input.selPick, move: input.selMove, confirm: input.selConfirm, cancel: input.selCancel, fEdge: fd && !this.fHeld });
      this.fHeld = fd; this.qHeld = input.q; this.eHeld = !!input.beam || !!input.beamHeld; this.rHeld = !!input.sphere; return;
    }
    s.time += dt;
    trackAim(s, input); s.hx.moving = input.x !== 0 || input.y !== 0;
    movePlayer(s, input, dt);
    // B20 input buffer: a Q / E / R press refused only because a cast or a cooldown is about to end is retried for ABILITY_BUFFER seconds, then dropped. Sora's E is a hold/release charge, so it is never buffered.
    const bf = this.buf; bf.q = Math.max(0, bf.q - dt); bf.e = Math.max(0, bf.e - dt); bf.r = Math.max(0, bf.r - dt);
    if (input.q && !this.qHeld) { if (!activateQ(s)) bf.q = ABILITY_BUFFER; else bf.q = 0; } else if (bf.q > 0 && activateQ(s)) bf.q = 0;
    const fDown = !!(input.f || input.fHeld); formInput(s, fDown, this.fHeld);   // the press edge counts too, so a tap shorter than one tick is never lost
    const bufE = s.hero !== 'sora';
    if (input.beam && !this.eHeld) { if (!startAbility(s, 'beam') && bufE) bf.e = ABILITY_BUFFER; else bf.e = 0; } else if (bf.e > 0 && bufE && startAbility(s, 'beam')) bf.e = 0;
    if (input.sphere && !this.rHeld) { if (!startAbility(s, 'sphere')) bf.r = ABILITY_BUFFER; else bf.r = 0; } else if (bf.r > 0 && startAbility(s, 'sphere')) bf.r = 0;
    this.qHeld = input.q; this.fHeld = fDown; this.eHeld = !!input.beam || !!input.beamHeld; this.rHeld = !!input.sphere; s.eHeld = !!input.beamHeld;
    const p = s.player; p.qCooldown = Math.max(0, p.qCooldown - dt);
    if (s.mods.regen > 0) p.hp = Math.min(p.maxHp, p.hp + s.mods.regen * dt);
    updateDrive(s, dt);
    updateAbilities(s, dt);
    if (s.hero !== 'kai') updateHero(s, dt);
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
  /** B18 Reroll Module: redraw the current offer (never the same three when the pool allows). Only on the level-up screen, bounded by the run's charges. */
  reroll() {
    const s = this.state; if (s.phase !== 'upgrade' || s.run.rerollsLeft <= 0) return false;
    s.run.rerollsLeft--; s.upgradeOffers = createOffer(s, this.rng, s.rewardPick, s.upgradeOffers); return true;
  }
  /** B18 Banish Module: strike one offered card from the rest of the run and draw its replacement. */
  banish(id: UpgradeId) {
    const s = this.state; if (s.phase !== 'upgrade' || s.run.banishesLeft <= 0 || !s.upgradeOffers.includes(id)) return false;
    s.run.banishesLeft--; s.run.banished.push(id);
    const keep = s.upgradeOffers.filter(o => o !== id), fresh = createOffer(s, this.rng, s.rewardPick, s.upgradeOffers).find(o => !keep.includes(o));
    s.upgradeOffers = fresh ? [...keep, fresh] : keep; return true;
  }
  togglePause() { const phase = this.state.phase; if (phase === 'running') this.state.phase = 'paused'; else if (phase === 'paused') this.state.phase = 'running'; }
  forcePause() { if (this.state.phase === 'running') this.state.phase = 'paused'; }
  stats() { const s = this.state; return gradeRun({ seed: s.seed, survivalSeconds: s.time, kills: s.kills, level: s.player.level, victory: s.phase === 'victory', bosses: s.bossesDefeated }); }
}
