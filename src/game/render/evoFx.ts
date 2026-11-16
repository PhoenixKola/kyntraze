/** B21.2 / B21.6: draws the planned evolution art and impact frames from one bounded pool. Frozen while the run is not running; every image is additive, pooled and released. */
import type Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { FxPool } from './fxPool';
import { b21Key } from './b21Assets';
import { planEvo, type EvoCursor } from './evoPlan';

export class EvoFx {
  private readonly pool: FxPool; private cur: EvoCursor = { ability: 0, enemy: 0, frameClock: -9 };
  constructor(private readonly scene: Phaser.Scene) { this.pool = new FxPool(scene, 40); }
  get count() { return this.pool.count; }
  update(s: GameState, dt: number, reduced: boolean) {
    const r = planEvo(s, this.cur, reduced); this.cur = r.cur;
    if (s.phase === 'running') for (const q of r.plans) {
      const key = b21Key('evo', q.name); if (!this.scene.textures.exists(key)) continue;
      const cue = q.frame ? 'impact_frame' : q.name.endsWith('pierce_spark') ? 'evo_spark' : q.name.endsWith('echo_ring') ? 'evo_echo' : null;
      if (cue) this.scene.events.emit('b21-cue', cue, q.frame ? 0.9 : cue === 'evo_spark' ? 0.3 : 0.6, cue === 'evo_spark' ? 0.9 + Math.random() * 0.3 : 1);
      const w = this.scene.textures.get(key).getSourceImage().width, k = q.width / w;
      if (q.frame) this.pool.spawn({ key, x: q.x, y: q.y, depth: 9.5, life: q.life, blend: 'add', s0: k * 0.9, s1: k * 1.05, a0: q.alpha, a1: 0 });
      else this.pool.spawn({ key, x: q.x, y: q.y, depth: 11.6, life: q.life, blend: 'add', s0: k * 0.8, s1: k * 1.1, a0: q.alpha, a1: 0, rot: q.rot, ox: q.ox, oy: q.ox === undefined ? undefined : 0.5 });
    }
    this.pool.update(s.phase === 'running' ? dt : 0);
  }
  destroy() { this.pool.destroy(); }
}
