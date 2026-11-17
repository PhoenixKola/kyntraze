import { Simulation } from '../sim/Simulation';
import type { GameState, InputState } from '../sim/GameState';
import type { ArenaId } from '../content/arenas';
import type { HeroId } from '../content/heroes';
import { NO_CONFIG, type RunConfig } from '../sim/RunConfig';
import type { RunPlan } from '../b22/plan';

export const DT = 1 / 60;
export const idle: InputState = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false };
/** A quiet run: nothing spawns on its own, the fighter cannot die or level, and the auto weapon is parked. */
export function quiet(opts: { arena?: ArenaId; hero?: HeroId; seed?: number; plan?: RunPlan; config?: Partial<RunConfig>; hp?: number } = {}) {
  const config: RunConfig = { ...NO_CONFIG, hero: opts.hero ?? 'kai', ...(opts.plan ? { plan: opts.plan } : {}), ...opts.config };
  const sim = new Simulation(opts.seed ?? 4, opts.arena ?? 'gloam', false, false, config);
  const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.attackClock = 1e9; s.player.hp = opts.hp ?? 1e6; s.player.maxHp = Math.max(s.player.maxHp, s.player.hp); s.player.nextXp = 1e9; s.encounter.forced = true;
  return { sim, s };
}
export const run = (sim: Simulation, sec: number, input: InputState = idle, each?: (s: GameState) => void) => { for (let i = 0; i < Math.round(sec / DT); i++) { sim.step(DT, input); each?.(sim.state); } };
export const hazardsOf = (s: GameState, tag: string) => s.hazards.filter(h => h.tag === tag);
/** Resolves whatever the pause is asking for (branch, relic or a normal card), the way the real UI does. */
export function resolvePick(sim: Simulation) {
  const s = sim.state; if (s.phase !== 'upgrade') return;
  if (s.b22.branchOffer) { sim.chooseBranch(s.b22.branchOffer.a); return; }
  if (s.b22.relicOffer) { sim.chooseRelic(s.b22.relicOffer[0]); return; }
  if (s.upgradeOffers.length) sim.chooseUpgrade(s.upgradeOffers[0]);
}
