/** B23 outfit geometry: six of the eight outfits add REAL new pieces (ImageGen pixel-art accessories: headset, circlet, brow guard, headband, visor, halo, broken crown, cowl) worn at the hero's head, drawn from per-frame head anchors (public/art/hair-anchors.json) in the right view for each facing (front / side / back, side mirrored for west). Cosmetic only; the outfit's palette set (art/outfits) still applies underneath. Pure placement maths is exported for tests. */
import Phaser from 'phaser';
import { anchorOf, type HairTable, type HeadAnchor } from './hairRig';
import { equippedOutfit } from '../../assets/skin';

export type AccView = 'front' | 'side' | 'back';
export interface Accessory { /** width in head radii of the FRONT view; side / back use the same height */ w: number; /** offset of the sprite centre from the head centre, in head radii (+y = down) */ dy: number; /** front / side nudge toward the facing direction, in head radii */ forward: number; /** drawn behind the hero (halo) or in front */ behind?: boolean; /** floats with a slow bob (halo) */ float?: boolean }
export const ACCESSORIES: Record<string, Accessory> = {
  kai_circuit_vanguard: { w: 2.5, dy: -0.35, forward: 0.1 }, kai_celestial_wanderer: { w: 2.6, dy: -0.55, forward: 0.05 }, ren_ironheart_bruiser: { w: 2.5, dy: -0.5, forward: 0.1 }, ren_ember_ronin: { w: 2.5, dy: -0.4, forward: 0.0 },
  sora_azure_artificer: { w: 2.4, dy: -0.15, forward: 0.15 }, sora_skybound_oracle: { w: 3.0, dy: -1.9, forward: 0.0, float: true }, vex_oathkeepers_ruin: { w: 2.7, dy: -0.75, forward: 0.0 }, vex_eclipse_nomad: { w: 3.0, dy: 0.1, forward: 0.0 },
};
export const accKey = (id: string, view: AccView) => `acc-${id}-${view}`;
export const accUrl = (id: string, view: AccView) => `/art/outfits/acc/${id}_${view}.png`;
export const hasAccessory = (id: string | null, hero: string): id is string => !!id && id in ACCESSORIES && id.startsWith(`${hero}_`);
export const viewOf = (facing: string): { view: AccView; flip: boolean } => (facing === 'south' ? { view: 'front', flip: false } : facing === 'north' ? { view: 'back', flip: false } : { view: 'side', flip: facing === 'west' });
/** World placement of an accessory for a head anchor in frame pixels: the hero sprite's origin, scale and lean rotation carry the head position into the world. */
export function placeAccessory(a: HeadAnchor, acc: Accessory, hero: { x: number; y: number; displayOriginX: number; displayOriginY: number; scaleX: number; scaleY: number; rotation: number }, facing: string, t: number) {
  const f = facing === 'east' ? 1 : facing === 'west' ? -1 : 0, bob = acc.float ? Math.sin(t * 2.1) * 0.12 : 0;
  const lx = a.cx + f * acc.forward * a.r, ly = a.cy + (acc.dy + bob) * a.r, dx = (lx - hero.displayOriginX) * hero.scaleX, dy = (ly - hero.displayOriginY) * hero.scaleY, c = Math.cos(hero.rotation), s = Math.sin(hero.rotation);
  return { x: hero.x + dx * c - dy * s, y: hero.y + dx * s + dy * c, width: acc.w * a.r * hero.scaleX };
}
export class OutfitLayer {
  private img: Phaser.GameObjects.Image | null = null; private last: HeadAnchor | null = null; private t = 0;
  constructor(private readonly scene: Phaser.Scene, private readonly table: HairTable | undefined) {}
  update(hero: Phaser.GameObjects.Sprite, srcKey: string, frame: number, facing: string, heroId: string, dead: boolean, dt: number) {
    const id = equippedOutfit(); if (!hasAccessory(id, heroId) || dead) { this.img?.setVisible(false); return; }
    this.t += dt; const a = anchorOf(this.table, srcKey, frame) ?? this.last; if (!a) { this.img?.setVisible(false); return; } this.last = a;
    const { view, flip } = viewOf(facing), key = accKey(id, view); if (!this.scene.textures.exists(key)) { this.img?.setVisible(false); return; }
    const acc = ACCESSORIES[id], p = placeAccessory(a, acc, hero, facing, this.t); this.img ??= this.scene.add.image(0, 0, key);
    const w = p.width, tex = this.scene.textures.get(key).getSourceImage() as { width: number; height: number }, h = w * tex.height / tex.width;
    this.img.setTexture(key).setVisible(hero.visible).setPosition(Math.round(p.x), Math.round(p.y)).setDisplaySize(w, h).setFlipX(flip).setRotation(hero.rotation).setAlpha(hero.alpha).setDepth(hero.depth + (acc.behind ? -0.02 : 0.03));
  }
  /** QA: is an accessory currently drawn, and which view */
  get shown() { return !!this.img && this.img.visible ? this.img.texture.key : null; }
  destroy() { this.img?.destroy(); this.img = null; }
}
