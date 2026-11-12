/** B00 debug placeholders, NOT rigged frames or production animations. */
export interface AnimationManifestV1 { version: 1; characterId: string; formId: string; directions: Record<'north'|'south'|'east'|'west', string>; source: 'procedural-debug'; approved: false; }
export const KAI_PLACEHOLDER_MANIFEST: AnimationManifestV1 = {
  version: 1, characterId: 'kai', formId: 'base', source: 'procedural-debug', approved: false,
  directions: { south: '/art/placeholders/kai-south.png', north: '/art/placeholders/kai-north.png', east: '/art/placeholders/kai-east.png', west: '/art/placeholders/kai-west.png' },
};
