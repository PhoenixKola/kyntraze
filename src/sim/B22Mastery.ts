/** Mastery counters: the sim increments them as it plays; the results path judges them once. Counters are per run (nothing is grinded across runs). */
import type { Enemy, GameState } from './GameState';
import { bump } from '../b22/state';
import { FORM_KEYS, FORM_INFO, type FormKey } from '../b22/mastery';

/** The mastery form the fighter is in right now, or null in the base state. */
export function activeForm(s: Pick<GameState, 'hero' | 'player'>): FormKey | null {
  const f = s.player.form; if (!f) return null;
  if (s.hero === 'kai') return f === 1 ? 'flarebound' : f === 2 ? 'cometheart' : 'stillfire';
  if (s.hero === 'ren') return 'crimson_ascendant'; if (s.hero === 'sora') return 'azure_sovereign';
  return f === 1 ? 'riftbound' : 'voidheart_exile';
}
export function noteBossKill(s: GameState, boss: Enemy) {
  const f = activeForm(s); if (f) { bump(s.b22, `boss.${f}`); if (!s.b22.bossHurt) bump(s.b22, `boss.flawless.${f}`); }
  if (boss.kind === 'oathkeeper' && s.hero === 'vex') bump(s.b22, 'boss.voidheart_exile');
}
export const formsOfHero = (hero: string): FormKey[] => FORM_KEYS.filter(k => FORM_INFO[k].hero === hero);
