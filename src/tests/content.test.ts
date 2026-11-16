import { describe, expect, it } from 'vitest';
import { validateContent } from '../content/validateContent';
import { HEROES } from '../content/heroes';
import { KAI_PLACEHOLDER_MANIFEST } from '../assets/animationManifest';
describe('content contract', () => {
  it('all declared content meets minimal schema', () => expect(validateContent()).toEqual([]));
  it('defines three playable runners: Kai with three transformations, Ren and Sora with exactly one', () => { expect(HEROES).toHaveLength(3);expect(HEROES.map(h=>h.forms.length)).toEqual([4,2,2]);expect(HEROES.filter(h=>h.playable).map(h=>h.id)).toEqual(['kai','ren','sora']); });
  it('provisional assets are clearly not approved', () => expect(KAI_PLACEHOLDER_MANIFEST.approved).toBe(false));
});
