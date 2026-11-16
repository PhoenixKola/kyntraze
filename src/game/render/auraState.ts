/** B21.3: the persistent-aura state machine for transformed heroes. Pure projection of sim state (idle → moving → dash → charge → release → settle); the view only reads the numbers. */
import type { GameState } from '../../sim/GameState';

export type AuraPhase = 'idle' | 'moving' | 'dash' | 'charge' | 'release' | 'settle';
export interface AuraSample {
  phase: AuraPhase;
  /** overall strength 0..1.4 (activity responsive; never above what keeps the body readable) */
  k: number;
  /** unit vector the wisps lean along (opposite to travel) and how hard */
  leanX: number; leanY: number; lean: number;
  /** 0..1 how tightly energy is pulled inward (charging) */
  gather: number;
  /** 0..1 outward pulse right after a release/contact (decays) */
  pulse: number;
}

export class AuraTracker {
  private pulse = 0; private settle = 0; private lastAct = false; private lastRelease = false;
  /** dt is render dt in seconds (0 while paused). */
  update(s: GameState, dt: number, speedNorm: number): AuraSample {
    const p = s.player, act = s.hx.act, charging = !!act && !act.released && (act.act === 'celestial_lance' || act.act === 'bloodstar' || act.t < 0.25), released = !!act && act.released;
    if (released && !this.lastRelease) this.pulse = 1;
    this.lastRelease = released;
    const wasAct = this.lastAct; this.lastAct = !!act; if (wasAct && !act) this.settle = 0.5;
    this.pulse = Math.max(0, this.pulse - dt * 3.2); this.settle = Math.max(0, this.settle - dt);
    const dashing = p.dashRemaining > 0, moving = speedNorm > 0.15;
    const phase: AuraPhase = dashing ? 'dash' : charging ? 'charge' : released ? 'release' : this.settle > 0 ? 'settle' : moving ? 'moving' : 'idle';
    const kBase = { idle: 0.55, moving: 0.75, dash: 1.1, charge: 0.9, release: 1.15, settle: 0.7 }[phase];
    const sp = Math.hypot(p.vx, p.vy) || 1;
    return { phase, k: kBase + 0.25 * this.pulse, leanX: moving || dashing ? -p.vx / sp : 0, leanY: moving || dashing ? -p.vy / sp : 0, lean: Math.min(1, speedNorm), gather: charging ? Math.min(1, (act?.charge ?? act?.t ?? 0) / 1.2) : 0, pulse: this.pulse };
  }
}
