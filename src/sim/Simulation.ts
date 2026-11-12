import { SeededRng } from '../core/SeededRng';
import { RULES } from '../core/Rules';
import { makeState, type GameState, type InputState } from './GameState';
import { movePlayer } from './MovementSystem';
import { moveEnemies } from './EnemyAiSystem';
import { updateDirector } from './EnemyDirector';
import { updateAutoWeapon, activateQ } from './WeaponSystem';
import { updateContactDamage } from './CombatSystem';
import { collectPickups } from './PickupSystem';
import { applyUpgrade, createOffer, gainXp } from './UpgradeSystem';
import { activateForm } from './FormSystem';
import { updateDrive } from './DriveSystem';
import { pruneDeadEntities } from './EntityRegistry';
import type { UpgradeId } from '../content/upgrades';
import { gradeRun } from './GameTelemetry';
export class Simulation {
  readonly state: GameState;
  readonly rng: SeededRng;
  private qHeld = false;
  private fHeld = false;
  constructor(seed: number) { this.rng = new SeededRng(seed); this.state = makeState(seed); }
  step(dt: number, input: InputState) {
    const s = this.state; if (s.phase !== 'running') return;
    s.time += dt;
    movePlayer(s, input, dt);
    if (input.q && !this.qHeld) activateQ(s);
    if (input.f && !this.fHeld) activateForm(s);
    this.qHeld = input.q; this.fHeld = input.f;
    const p = s.player; p.qCooldown = Math.max(0, p.qCooldown - dt);
    updateDrive(s, dt);
    updateDirector(s, this.rng, dt);
    moveEnemies(s, dt);
    updateAutoWeapon(s, dt);
    updateContactDamage(s);
    if (s.phase !== 'running') return;
    collectPickups(s, dt, () => { s.upgradeOffers = createOffer(s, this.rng); });
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
  togglePause() { const phase = this.state.phase; if (phase === 'running') this.state.phase = 'paused'; else if (phase === 'paused') this.state.phase = 'running'; }
  forcePause() { if (this.state.phase === 'running') this.state.phase = 'paused'; }
  stats() { const s = this.state; return gradeRun({ seed: s.seed, survivalSeconds: s.time, kills: s.kills, level: s.player.level, victory: false }); }
}
