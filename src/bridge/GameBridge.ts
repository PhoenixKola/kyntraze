import type { Simulation } from '../sim/Simulation';
import { blankSnapshot, type UiSnapshot } from './UiSnapshot';
import type { UpgradeId } from '../content/upgrades';
import { BOSSES } from '../content/bosses';
import { ARENAS } from '../content/arenas';
import { storeSave, type SaveV1, type GameSettings } from '../sim/SaveSystem';
export class GameBridge {
  private listeners = new Set<() => void>();
  private sim: Simulation | null = null;
  private current = blankSnapshot;
  private lastPhase = '';
  private deathShown = false;
  constructor(private readonly save: SaveV1) {}
  bind(sim: Simulation) { this.sim = sim; this.publish(true); }
  unbind() { this.sim = null; }
  setSettings(next: GameSettings) { this.save.settings = next; }
  getSettings() { return this.save.settings; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  snapshot(): UiSnapshot { return this.current; }
  publish(force = false) {
    const s = this.sim?.state; if (!s) return;
    const p = s.player;
    const phaseChanged = this.lastPhase !== s.phase;
    if (s.phase !== 'dead') this.deathShown = false;
    this.current = { phase: s.phase, seed: s.seed, hp: p.hp, maxHp: p.maxHp, xp: p.xp,
      nextXp: p.nextXp, level: p.level, seconds: s.time, kills: s.kills, enemies: s.enemies.length,
      dashCooldown: p.dashCooldown, qCooldown: p.qCooldown, beamCooldown: p.beamCooldown, sphereCooldown: p.sphereCooldown, drive: p.drive, form: p.form,
      formCooldown: p.formCooldown, offers: [...s.upgradeOffers], score: this.sim!.stats().score, deathShown: this.deathShown, boss: bossHud(s), arenaName: (ARENAS[s.arenaId] ?? ARENAS.gloam).name.toUpperCase() };
    if (s.phase === 'dead' && phaseChanged) {
      const stats = this.sim!.stats();
      if (!this.save.best || stats.score > this.save.best.score) { this.save.best = stats; storeSave(this.save); }
    }
    this.lastPhase = s.phase;
    if (force || phaseChanged || this.listeners.size) this.listeners.forEach(listener => listener());
  }
  /** Called by the renderer when the Death clip has finished and held. Ignored unless the sim is actually dead, so it can never show Results early. */
  markDeathShown() { if (this.sim?.state.phase !== 'dead' || this.deathShown) return; this.deathShown = true; this.publish(true); }
  pause() { this.sim?.forcePause(); this.publish(true); }
  togglePause() { this.sim?.togglePause(); this.publish(true); }
  choose(id: UpgradeId) { this.sim?.chooseUpgrade(id); this.publish(true); }
  debugGrantXp() { const sim = this.sim; if (!sim) return; const s = sim.state; if (s.phase !== 'running') return; s.player.xp = s.player.nextXp; s.player.level++; s.player.xp = 0; s.player.nextXp += 3; s.phase = 'upgrade'; s.upgradeOffers = ['impact', 'stride', 'endurance']; this.publish(true); }
}

import type { GameState } from '../sim/GameState';
import type { BossHud } from './UiSnapshot';
function bossHud(s: GameState): BossHud | null {
  const b = s.enemies.find(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0); if (!b || !b.ai) return null;
  const def = BOSSES[b.kind as 'warden' | 'seraph'];
  return { id: def.id, name: def.name, hp: b.hp, maxHp: b.maxHp, phase: b.ai.phase, phases: 2, mode: b.mode, intro: b.mode === 'intro' ? b.modeT : 0, invuln: b.ai.invuln, exposed: b.ai.exposed };
}
