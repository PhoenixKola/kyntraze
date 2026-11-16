/** B21 ImageGen art groups (public/art/fx/b21/<group>/): aura flipbooks, ability-evolution families and impact frames, enemy/boss damage overlays and floor decals. Each group ships a manifest.json (name -> width,height); the loader reads it so a missing group never breaks the game (the views check `has`). */
import type Phaser from 'phaser';
export const B21_GROUPS = ['aura', 'evo', 'dmg'] as const;
export type B21Group = typeof B21_GROUPS[number];
export const b21ManifestKey = (g: B21Group) => `b21-manifest-${g}`;
export const b21ManifestUrl = (g: B21Group) => `/art/fx/b21/${g}/manifest.json`;
export const b21Key = (g: B21Group, name: string) => `b21-${g}-${name}`;
export const b21Url = (g: B21Group, name: string) => `/art/fx/b21/${g}/${name}.png`;
export const b21Has = (scene: Phaser.Scene, g: B21Group, name: string) => scene.textures.exists(b21Key(g, name));
/** Names listed by a manifest ({ name: [w,h] } or { name: {width,height} } or { sprites: ... }), restricted to safe path characters. */
export function b21Names(raw: unknown): string[] {
  const o = (raw && typeof raw === 'object' ? ((raw as { sprites?: object }).sprites ?? raw) : {}) as Record<string, unknown>;
  if (Array.isArray(o)) return (o as { name?: string }[]).map(e => e?.name ?? '').filter(n => /^[a-z0-9_]+(\/[a-z0-9_]+)*$/.test(n));
  return Object.keys(o).filter(n => /^[a-z0-9_]+(\/[a-z0-9_]+)*$/.test(n));
}
