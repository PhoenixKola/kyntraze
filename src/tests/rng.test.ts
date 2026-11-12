import { describe, expect, it } from 'vitest';
import { SeededRng, parseSeed } from '../core/SeededRng';
describe('seeded random', () => {
  it('replays identical sequences from the same seed', () => { const a = new SeededRng(123), b = new SeededRng(123); expect(Array.from({length:20}, () => a.next())).toEqual(Array.from({length:20}, () => b.next())); });
  it('replays string seed hashes', () => { expect(parseSeed('test')).toBe(parseSeed('test')); expect(parseSeed('test')).not.toBe(parseSeed('other')); });
  it('never returns a random value outside [0,1)', () => { const r = new SeededRng(77); for(let i=0;i<500;i++){const n=r.next();expect(n).toBeGreaterThanOrEqual(0);expect(n).toBeLessThan(1);} });
});
