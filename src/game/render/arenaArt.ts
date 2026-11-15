import Phaser from 'phaser';
import { OBSTACLES } from '../../content/arena';
import { RULES } from '../../core/Rules';
import type { GameState } from '../../sim/GameState';

/** B06 arena + hero presentation: baked floor from the generated tile set, quiet value shaping, contact shadows and a hero light pool. */
export const FLOOR_TILE_COUNT = 8;
export const floorTileKey = (i: number) => `arena-floor-${i}`;
export const floorTileUrl = (i: number) => `art/arena/floor-${i}.png`;
const TILE = 128;
let bakedFloor: HTMLCanvasElement | null = null;
// plain plates dominate; vents / hazard stripes / scorch are rare so the floor never competes with the hero
const WEIGHTS = [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 6, 7, 7, 7, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 3];
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function radial(scene: Phaser.Scene, key: string, size: number, stops: [number, string][]) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, size, size)!; const ctx = tex.getContext(); const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) g.addColorStop(o, c);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size); tex.refresh();
}

export function createArenaFloor(scene: Phaser.Scene) {
  const W = RULES.worldWidth, H = RULES.worldHeight;
  const key = 'arena-floor-baked'; if (scene.textures.exists(key)) scene.textures.remove(key);
  // the floor never changes: bake once per page and hand the same canvas to every new game (Retry boots a fresh Phaser game)
  if (bakedFloor) { scene.textures.addCanvas(key, bakedFloor); return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20); }
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; bakedFloor = cv;
  const ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const src = (i: number) => scene.textures.get(floorTileKey(i)).getSourceImage() as CanvasImageSource;
  const lane = { row: 6, col: 8 };
  for (let ty = 0; ty * TILE < H; ty++) for (let tx = 0; tx * TILE < W; tx++) {
    const onRow = ty === lane.row && tx >= 2 && tx <= 14, onCol = tx === lane.col && ty >= 2 && ty <= 10;
    const r = hash(tx, ty); let v = WEIGHTS[Math.floor(r * WEIGHTS.length)], rot = 0;
    if (onRow || onCol) { v = 5; rot = onCol ? 1 : 0; }
    if (onRow && onCol) { v = 1; rot = 0; }
    ctx.save(); ctx.translate(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    if (rot) ctx.rotate(Math.PI / 2); else if (v !== 4 && hash(ty, tx) > 0.5) ctx.scale(-1, 1);
    ctx.drawImage(src(v), -TILE / 2, -TILE / 2, TILE, TILE); ctx.restore();
  }
  // value shaping: the floor sits one tier below the characters, darker towards the arena rim (depth cue + framing)
  ctx.fillStyle = 'rgba(4,9,18,0.46)'; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.hypot(W, H) * 0.52);
  vg.addColorStop(0, 'rgba(2,6,14,0)'); vg.addColorStop(1, 'rgba(2,6,14,0.62)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // rim wall: dark band, glowing teal edge, corner brackets
  ctx.fillStyle = '#05090f'; ctx.fillRect(0, 0, W, 26); ctx.fillRect(0, H - 26, W, 26); ctx.fillRect(0, 0, 26, H); ctx.fillRect(W - 26, 0, 26, H);
  for (let i = 0; i < 4; i++) { ctx.strokeStyle = `rgba(63,168,178,${0.12 - i * 0.025})`; ctx.lineWidth = 3 + i * 5; ctx.strokeRect(26 - i * 1, 26 - i * 1, W - 52 + i * 2, H - 52 + i * 2); }
  ctx.strokeStyle = '#4fb4bd'; ctx.lineWidth = 3; ctx.strokeRect(27.5, 27.5, W - 55, H - 55);
  ctx.strokeStyle = '#e3a766'; ctx.lineWidth = 4;
  for (const [cx, cy, sx, sy] of [[27, 27, 1, 1], [W - 27, 27, -1, 1], [27, H - 27, 1, -1], [W - 27, H - 27, -1, -1]] as const) { ctx.beginPath(); ctx.moveTo(cx, cy + sy * 46); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 46, cy); ctx.stroke(); }
  // obstacles: cast shadow, front face, lit top face, teal edge light, amber marker
  for (const o of OBSTACLES) {
    ctx.fillStyle = 'rgba(2,5,10,0.55)'; ctx.fillRect(o.x + 10, o.y + 14, o.w, o.h);
    ctx.fillStyle = '#1b2735'; ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.fillStyle = '#34495a'; ctx.fillRect(o.x, o.y, o.w, 11);
    ctx.fillStyle = '#4b6678'; ctx.fillRect(o.x, o.y, o.w, 3);
    ctx.fillStyle = '#121b27'; ctx.fillRect(o.x, o.y + o.h - 8, o.w, 8);
    ctx.strokeStyle = 'rgba(86,190,198,0.85)'; ctx.lineWidth = 2; ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
    ctx.fillStyle = '#e3a766'; ctx.fillRect(o.x + 10, o.y + o.h - 6, 18, 3); ctx.fillRect(o.x + o.w - 28, o.y + o.h - 6, 18, 3);
  }
  scene.textures.addCanvas(key, cv);
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20);
}

/** Floor light pool, contact shadows (hero + enemies) and the hero separation halo. Cheap: pooled images, no per-frame allocation after warm-up. */
export class Presentation {
  private readonly pool: Phaser.GameObjects.Image; private readonly halo: Phaser.GameObjects.Image; private readonly heroShadow: Phaser.GameObjects.Image;
  private readonly shadows = new Map<number, Phaser.GameObjects.Image>();
  constructor(private readonly scene: Phaser.Scene) {
    radial(scene, 'pres-pool', 256, [[0, 'rgba(255,255,255,0.5)'], [0.45, 'rgba(255,255,255,0.2)'], [1, 'rgba(255,255,255,0)']]);
    radial(scene, 'pres-shadow', 64, [[0, 'rgba(0,0,0,0.62)'], [0.6, 'rgba(0,0,0,0.38)'], [1, 'rgba(0,0,0,0)']]);
    this.pool = scene.add.image(0, 0, 'pres-pool').setDepth(-18).setBlendMode(Phaser.BlendModes.ADD).setTint(0x4fa6b4).setAlpha(0.34).setScale(2.1, 1.5);
    this.halo = scene.add.image(0, 0, 'pres-pool').setDepth(9.4).setBlendMode(Phaser.BlendModes.ADD).setTint(0x66d5e0).setAlpha(0.22).setScale(0.7, 0.34);
    this.heroShadow = scene.add.image(0, 0, 'pres-shadow').setDepth(9.5).setScale(1.2, 0.5).setAlpha(0.95);
  }
  update(state: GameState, heroX: number, heroY: number, formVisible: boolean, reduced: boolean) {
    const tint = formVisible ? 0xe9b25f : 0x4fb8c6;
    this.pool.setPosition(heroX, heroY - 6).setTint(formVisible ? 0xc18a3c : 0x4a9cac);
    this.halo.setPosition(heroX, heroY - 2).setTint(tint).setVisible(!reduced);
    this.heroShadow.setPosition(heroX, heroY - 1);
    const live = new Set<number>();
    for (const e of state.enemies) {
      if (e.hp <= 0) continue; live.add(e.id);
      let s = this.shadows.get(e.id); if (!s) { s = this.scene.add.image(e.x, e.y, 'pres-shadow').setDepth(5.5).setScale(0.62 * (e.radius / 17) * 1.15, 0.3 * (e.radius / 17) * 1.15).setAlpha(0.85); this.shadows.set(e.id, s); }
      s.setPosition(Math.round(e.x), Math.round(e.y + e.radius * 0.6 + 2));
    }
    for (const [id, s] of this.shadows) if (!live.has(id)) { s.destroy(); this.shadows.delete(id); }
  }
  destroy() { this.pool.destroy(); this.halo.destroy(); this.heroShadow.destroy(); for (const s of this.shadows.values()) s.destroy(); this.shadows.clear(); }
}
