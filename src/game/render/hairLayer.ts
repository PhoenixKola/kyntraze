/** Phaser half of the B23 hair rig: draws the current sheet frame into one small per-fighter canvas texture, warps only the head box (hairRig.warpHead) and points the sprite at it. The sprite keeps its origin, scale and filters; callers read `srcKey` / `srcFrame` for the real sheet identity (ghosts, QA). */
import Phaser from 'phaser';
import { HAIR_MIN, anchorOf, buildHairMask, hairBox, warpHead, type HairMask, type HairTable } from './hairRig';

const SIZE = 208;   // larger than the biggest hero frame (176 x 204)
let serial = 0;
export class HairLayer {
  private readonly key = `hair-live-${serial++}`;
  private ctx: CanvasRenderingContext2D | null = null; private tex: Phaser.Textures.CanvasTexture | null = null;
  private readonly named = new Set<string>(); private src: ImageData | null = null; private readonly masks = new Map<string, HairMask | null>();
  srcKey = ''; srcFrame: number | string = 0; active = false;
  constructor(private readonly scene: Phaser.Scene) {}
  private ensure(): boolean {
    if (this.tex) return true;
    const c = document.createElement('canvas'); c.width = c.height = SIZE; const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return false;
    this.ctx = ctx; this.tex = this.scene.textures.addCanvas(this.key, c); return !!this.tex;
  }
  /** Points `sprite` at the deformed frame, or leaves it on the sheet frame when there is nothing to deform. Call AFTER the sprite got its sheet texture + frame for this tick. */
  apply(sprite: Phaser.GameObjects.Sprite, table: HairTable | undefined, srcKey: string, frame: number, dx: number, dy: number, low: number, ramp: number): boolean {
    this.srcKey = srcKey; this.srcFrame = frame; this.active = false;
    if (Math.hypot(dx, dy) < HAIR_MIN) return false;
    const a = anchorOf(table, srcKey, frame); if (!a || !this.ensure()) return false;
    const tx = this.scene.textures.get(srcKey), fr = tx.get(frame), img = tx.getSourceImage() as CanvasImageSource;
    const w = fr.cutWidth, h = fr.cutHeight; if (w > SIZE || h > SIZE) return false;
    const ctx = this.ctx!; ctx.clearRect(0, 0, SIZE, SIZE); ctx.drawImage(img, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
    const box = hairBox(a, w, h, low, ramp), bw = box.x1 - box.x0, bh = box.y1 - box.y0; if (bw <= 0 || bh <= 0) return false;
    // warp in whole-frame coordinates so the anchor maths is identical to the offline tool: copy the frame once, write the box back
    const full = ctx.getImageData(0, 0, w, h); if (!this.src || this.src.width !== w || this.src.height !== h) { this.src = new ImageData(w, h); } this.src.data.set(full.data);
    const mk = `${srcKey}#${frame}`; let mask = this.masks.get(mk); if (mask === undefined) { mask = buildHairMask(this.src.data, w, h, a, low, ramp); if (this.masks.size > 600) this.masks.clear(); this.masks.set(mk, mask); }
    if (!mask) return false;
    warpHead(this.src.data, full.data, w, h, a, mask, dx, dy, low, ramp); ctx.putImageData(full, 0, 0, box.x0, box.y0, bw, bh);
    const name = `${w}x${h}`; if (!this.named.has(name)) { this.tex!.add(name, 0, 0, 0, w, h); this.named.add(name); }
    this.tex!.refresh(); sprite.setTexture(this.key, name); this.active = true; return true;
  }
  destroy() { if (this.tex) { this.scene.textures.remove(this.key); this.tex = null; this.ctx = null; } }
}
