/** Phaser half of the B23 hair rig: draws the current sheet frame into one small per-fighter canvas texture, warps only the head box (hairRig.warpHead) and points the sprite at it. The sprite keeps its origin, scale and filters; callers read `srcKey` / `srcFrame` for the real sheet identity (ghosts, QA). */
import Phaser from 'phaser';
import { HAIR_MIN, anchorOf, buildHairMask, hairBox, warpHead, type HairMask, type HairTable } from './hairRig';

const SIZE = 208;   // larger than the biggest hero frame (176 x 204)
let serial = 0;
export class HairLayer {
  private readonly key = `hair-live-${serial++}`;
  private ctx: CanvasRenderingContext2D | null = null; private tex: Phaser.Textures.CanvasTexture | null = null;
  private readonly named = new Set<string>();
  srcKey = ''; srcFrame: number | string = 0; active = false;
  constructor(private readonly scene: Phaser.Scene) {}
  private ensure(): boolean {
    if (this.tex) return true;
    const c = document.createElement('canvas'); c.width = c.height = SIZE; const ctx = c.getContext('2d', { willReadFrequently: true }); if (!ctx) return false;
    this.ctx = ctx; this.tex = this.scene.textures.addCanvas(this.key, c); return !!this.tex;
  }
  private readonly cache = new Map<string, { w: number; h: number; data: Uint8ClampedArray; mask: HairMask | null }>();
  private out: ImageData | null = null; private lastSig = ''; private lastName = '';
  /** Points `sprite` at the deformed frame, or leaves it on the sheet frame when there is nothing to deform. Call AFTER the sprite got its sheet texture + frame for this tick.
   *  Cost control: source pixels and the hair mask are cached per sheet frame (read back once), offsets are quantised to a quarter pixel, and the canvas is only redrawn / re-uploaded when the frame or the quantised offset changed. */
  apply(sprite: Phaser.GameObjects.Sprite, table: HairTable | undefined, srcKey: string, frame: number, dx: number, dy: number, low: number, ramp: number): boolean {
    this.srcKey = srcKey; this.srcFrame = frame; this.active = false;
    if (Math.hypot(dx, dy) < HAIR_MIN) return false;
    const a = anchorOf(table, srcKey, frame); if (!a || !this.ensure()) return false;
    const qx = Math.round(dx * 4) / 4, qy = Math.round(dy * 4) / 4, ck = `${srcKey}#${frame}`, sig = `${ck}|${qx}|${qy}`;
    let c = this.cache.get(ck);
    if (!c) {
      const tx = this.scene.textures.get(srcKey), fr = tx.get(frame), w = fr.cutWidth, h = fr.cutHeight; if (w > SIZE || h > SIZE) return false;
      const ctx = this.ctx!; ctx.clearRect(0, 0, SIZE, SIZE); ctx.drawImage(tx.getSourceImage() as CanvasImageSource, fr.cutX, fr.cutY, w, h, 0, 0, w, h);
      const data = new Uint8ClampedArray(ctx.getImageData(0, 0, w, h).data); if (this.cache.size > 160) this.cache.clear();
      c = { w, h, data, mask: buildHairMask(data, w, h, a, low, ramp) }; this.cache.set(ck, c); this.lastSig = '';
    }
    if (!c.mask) return false;
    const name = `${c.w}x${c.h}`; if (!this.named.has(name)) { this.tex!.add(name, 0, 0, 0, c.w, c.h); this.named.add(name); }
    if (sig !== this.lastSig) {
      const ctx = this.ctx!, box = hairBox(a, c.w, c.h, low, ramp), bw = box.x1 - box.x0, bh = box.y1 - box.y0;
      if (!this.out || this.out.width !== c.w || this.out.height !== c.h) this.out = new ImageData(c.w, c.h);
      const o = this.out.data; for (let y = box.y0; y < box.y1; y++) { const i = (y * c.w + box.x0) * 4; o.set(c.data.subarray(i, i + bw * 4), i); }
      warpHead(c.data, o, c.w, c.h, a, c.mask, qx, qy, low, ramp);
      if (this.lastName !== ck.split('#')[0] + '#' + frame || !this.lastSig.startsWith(ck + '|')) { ctx.clearRect(0, 0, SIZE, SIZE); ctx.putImageData(new ImageData(new Uint8ClampedArray(c.data), c.w, c.h), 0, 0); }
      ctx.putImageData(this.out, 0, 0, box.x0, box.y0, bw, bh); this.tex!.refresh(); this.lastSig = sig; this.lastName = ck;
    }
    sprite.setTexture(this.key, name); this.active = true; return true;
  }
  /** The canvas texture is owned by the game's texture manager and goes with it; removing it here would race with sprites that still show it (Phaser warns on a missing key). */
  destroy() { this.tex = null; this.ctx = null; this.cache.clear(); }
}
