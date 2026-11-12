import { KAI_PLACEHOLDER_MANIFEST } from './animationManifest';
export const STARTER_TEXTURES = [
  ...Object.entries(KAI_PLACEHOLDER_MANIFEST.directions).map(([direction, path]) => ({ key: `kai-${direction}`, path })),
  { key: 'enemy-pursuer', path: '/art/placeholders/enemy-pursuer.png' },
  { key: 'enemy-flanker', path: '/art/placeholders/enemy-flanker.png' },
  { key: 'xp', path: '/art/placeholders/xp.png' },
] as const;
