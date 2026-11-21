/** Which key / button an ability sits on for whoever is choosing: keyboard P1, the couch-co-op second player's keys, or a controller. */
export type HintSlot = 'auto' | 'q' | 'e' | 'r' | 'dash' | 'f';
const P1: Record<HintSlot, string> = { auto: 'AUTO', q: 'Q', e: 'E', r: 'R', dash: 'SHIFT', f: 'F' };
const P2: Record<HintSlot, string> = { auto: 'AUTO', q: ',', e: '.', r: '/', dash: 'ENTER', f: ';' };
const PAD: Record<HintSlot, string> = { auto: 'AUTO', q: 'X', e: 'RB', r: 'LB', dash: 'A', f: 'Y' };
export function keyHint(slot: HintSlot | undefined, o: { pad: boolean; chooser: number; coop: boolean }): string | null {
  if (!slot) return null;
  if (slot === 'auto') return 'AUTO';
  if (o.pad && (!o.coop || o.chooser === 1)) return PAD[slot];
  return (o.coop && o.chooser === 1 ? P2 : P1)[slot];
}
