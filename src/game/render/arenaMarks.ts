/** B21.5: draws the planned marks from a bounded FxPool. Cosmetic only. */
import type Phaser from 'phaser';
import type { ArenaId } from '../../content/arenas';
import type { GameState } from '../../sim/GameState';
import { FxPool } from './fxPool';
import { planMarks, markSpawns, decalKey } from './arenaMarkPlan';

export class ArenaMarks {
  private readonly pool: FxPool; private ability = 0; private enemy = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly arena: ArenaId) { this.pool = new FxPool(scene, 56); }
  get count() { return this.pool.count; }
  /** dt = render seconds; marks neither spawn nor age while the run is not running. */
  update(s: GameState, dt: number, reduced: boolean) {
    const r = planMarks(s, this.ability, this.enemy); this.ability = r.ability; this.enemy = r.enemy;
    if (s.phase === 'running') for (const m of r.plans) { if (reduced && !m.strong) continue; for (const sp of markSpawns(m, this.arena, reduced, n => { const k = decalKey(n); return this.scene.textures.exists(k) ? this.scene.textures.get(k).getSourceImage().width : undefined; })) this.pool.spawn(sp); }
    this.pool.update(s.phase === 'running' ? dt : 0);
  }
  destroy() { this.pool.destroy(); }
}
