/** B31B: the few read-only multipliers the core combat / movement / XP / director code asks the Living Fractures layer for. With the rule off (`s.lf` absent) every call returns exactly 1, so an opted-out run is bit-for-bit the run it always was. Effects live on the shared state, never on a fighter's own stats, so a boon can end without undoing an upgrade the player took meanwhile. */
import type { GameState } from './GameState';
import type { LfFx } from '../b31/fractures';

type Key = 'dmg' | 'taken' | 'speed' | 'xp' | 'spawn' | 'foeHp';
const WORLD: readonly Key[] = ['spawn', 'foeHp'];
/** Product of every live effect on the fighter that is active right now (and, for world keys, every party-wide effect). */
export function lfMul(s: GameState, key: Key, fighter?: number): number {
  const lf = s.lf; if (!lf || !lf.fx.length) return 1;
  const slot = WORLD.includes(key) ? -1 : (fighter ?? s.party?.cur ?? 0); let m = 1;
  for (const f of lf.fx) { const v = f[key]; if (v === undefined || f.until <= s.time) continue; if (f.slot === slot || (f.slot === -1 && WORLD.includes(key))) m *= v; }
  return m;
}
/** Seconds of cooldown to take off each tick on top of normal recharge (cdr 1.3 means 30% faster recharge). */
export function lfCdr(s: GameState, slot: number, dash = false): number {
  const lf = s.lf; if (!lf || !lf.fx.length) return 1; let m = 1;
  for (const f of lf.fx) { if (f.slot !== slot || f.until <= s.time) continue; const v = dash ? (f.dashCdr ?? f.cdr) : f.cdr; if (v) m *= v; }
  return m;
}
export const lfRegen = (fx: LfFx[], slot: number, now: number): number => { let r = 0; for (const f of fx) if (f.slot === slot && f.until > now && f.regen) r += f.regen; return r; };
