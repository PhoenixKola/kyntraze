import { describe, expect, it } from 'vitest';
import { validateContent } from '../content/validateContent';
import { HEROES } from '../content/heroes';
import { KAI_PLACEHOLDER_MANIFEST } from '../assets/animationManifest';
describe('content contract', () => {
  it('all declared content meets minimal schema', () => expect(validateContent()).toEqual([]));
  it('defines four playable runners: Kai with three transformations, Ren and Sora with exactly one, Vex (B22) with two', () => { expect(HEROES).toHaveLength(4);expect(HEROES.map(h=>h.forms.length)).toEqual([4,2,2,3]);expect(HEROES.filter(h=>h.playable).map(h=>h.id)).toEqual(['kai','ren','sora','vex']); });
  it('provisional assets are clearly not approved', () => expect(KAI_PLACEHOLDER_MANIFEST.approved).toBe(false));
});
