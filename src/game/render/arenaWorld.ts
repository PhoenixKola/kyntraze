import Phaser from 'phaser';
import { ARENAS, PROP_FOOTPRINTS, type ArenaId, type SolidProp } from '../../content/arenas';
import { RULES } from '../../core/Rules';
import type { GameState } from '../../sim/GameState';

/** B09 arena world: every arena is ImageGen art assembled here (floor tiles, rim, decals baked once; solid props as sprites; ambience; hazard visuals). Code only places, masks and times; the pictures are generated assets. Contract: B09-DESIGN.md. */
export const arenaAssetUrl = (id: ArenaId, rel: string) => `${ARENAS[id].artDir}/${rel}`;
export const PROPS_KEY = (id: ArenaId) => `arena-props-${id}`;
export const propKey = (name: string) => `arena-prop-${name}`;
export const ARENA_FX = ['mote', 'fog'] as const;
export const arenaFxKey = (n: string) => `arena-fx-${n}`;
export const FLOOR_TILE_COUNT = 8;
export const floorTileKey = (i: number) => `arena-floor-${i}`;
export const floorTileUrl = (id: ArenaId, i: number) => `${ARENAS[id].floorDir}/floor-${i}.png`;
export const HAZARD_FX: Record<ArenaId, string[]> = { gloam: ['surge-warn', 'surge-active', 'surge-warn-b', 'surge-active-b'], ashen: ['pulse-ring', 'pylon-glow'] };
export interface PropManifestEntry { file: string; scale?: number; origin: [number, number]; footprint: { w: number; h: number }; solid: boolean; frames?: number; frame?: { w: number; h: number } }
export type PropManifest = Record<string, PropManifestEntry>;
export const parsePropManifest = (raw: unknown): PropManifest => { const o = raw as { props?: PropManifest }; return (o && typeof o === 'object' && o.props ? o.props : (raw as PropManifest)) ?? {}; };
/** Names of every prop image an arena needs (solids + decor), for the loader. */
export function arenaPropNames(id: ArenaId): string[] { const a = ARENAS[id]; return [...new Set([...a.solids.map(s => s.prop as string), ...a.decor.map(d => d.prop)])]; }

const TILE = 128;
const bakedByArena = new Map<ArenaId, HTMLCanvasElement>();
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const WEIGHTS: Record<ArenaId, number[]> = {
  // plain plates dominate; vents / stripes / scorch are rare so the floor never competes with the hero (tile 5 = teal lane, 3 = scorch)
  gloam: [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 6, 7, 7, 7, 0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 3],
  // ashen: 0-2 plain, 3 cracked, 4 rubble-light, 7 worn; inlay (5,6) only on the lanes
  ashen: [0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 7, 7, 7, 0, 1, 2, 3, 4, 7, 0, 1, 2, 0, 3],
};

function drawImage(ctx: CanvasRenderingContext2D, img: CanvasImageSource, cx: number, cy: number, w: number, h: number, rot = 0, flip = false) {
  ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate((rot * Math.PI) / 180); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
}

/** Floor + decals + rim, baked once per arena per page. */
export function createArenaFloor(scene: Phaser.Scene, id: ArenaId) {
  const W = RULES.worldWidth, H = RULES.worldHeight, key = 'arena-floor-baked';
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const cached = bakedByArena.get(id);
  if (cached) { scene.textures.addCanvas(key, cached); return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20); }
  const arena = ARENAS[id], cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!; ctx.imageSmoothingEnabled = false;
  const src = (i: number) => scene.textures.get(floorTileKey(i)).getSourceImage() as CanvasImageSource;
  for (let ty = 0; ty * TILE < H; ty++) for (let tx = 0; tx * TILE < W; tx++) {
    const onRow = ty === 6 && tx >= 2 && tx <= 14, onCol = tx === 8 && ty >= 2 && ty <= 10;
    let v = WEIGHTS[id][Math.floor(hash(tx, ty) * WEIGHTS[id].length)], rot = 0;
    if (onRow || onCol) { v = 5; rot = onCol ? 90 : 0; }
    if (onRow && onCol) { v = id === 'gloam' ? 1 : 6; rot = 0; }
    ctx.save(); ctx.translate(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
    if (rot) ctx.rotate(Math.PI / 2); else if (v !== 4 && hash(ty, tx) > 0.5) ctx.scale(-1, 1);
    ctx.drawImage(src(v), -TILE / 2, -TILE / 2, TILE, TILE); ctx.restore();
  }
  // decals (cracks, scorch, rubble, glyph landmark): authored art, low in the stack so they never outrank characters or telegraphs
  const man = parsePropManifest(scene.cache.json.get(PROPS_KEY(id)));
  for (const d of arena.decor) {
    const k = propKey(d.prop); if (!scene.textures.exists(k)) continue;
    const im = scene.textures.get(k).getSourceImage() as CanvasImageSource & { width: number; height: number }, s = man[d.prop]?.scale ?? 0.5;
    ctx.globalAlpha = /glyph|sigil/.test(d.prop) ? 0.7 : 1;   // landmarks sit a tier lower so Kai at the spawn point never competes with them
    drawImage(ctx, im, d.x, d.y, im.width * s, im.height * s, d.rot ?? 0, !!d.flip); ctx.globalAlpha = 1;
  }
  // value shaping: the floor sits one tier below the characters, darker towards the rim (depth cue + framing)
  ctx.fillStyle = arena.shade.tint; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.hypot(W, H) * 0.52);
  vg.addColorStop(0, 'rgba(2,6,14,0)'); vg.addColorStop(1, `rgba(2,6,14,${arena.shade.vignette})`); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // rim: the arena's wall art around the edge. 'rotate' = one strip + corner rotated for the four sides (1x texel density); 'strips' = authored top / bottom / side strips mirrored, plus a mirrored corner.
  const img = (n: string) => (scene.textures.exists(arenaFxKey(n)) ? (scene.textures.get(arenaFxKey(n)).getSourceImage() as CanvasImageSource & { width: number; height: number }) : null);
  const rim = img('rim'), corner = img('corner');
  if (rim && arena.rimMode === 'rotate') {
    const rw = rim.width, rh = rim.height;
    for (let x = 0; x < W; x += rw) { ctx.drawImage(rim, x, 0); ctx.save(); ctx.translate(x + rw, H); ctx.rotate(Math.PI); ctx.drawImage(rim, 0, 0); ctx.restore(); }
    for (let y = 0; y < H; y += rw) { ctx.save(); ctx.translate(0, y + rw); ctx.rotate(-Math.PI / 2); ctx.drawImage(rim, 0, 0); ctx.restore(); ctx.save(); ctx.translate(W, y); ctx.rotate(Math.PI / 2); ctx.drawImage(rim, 0, 0); ctx.restore(); }
    if (corner) for (const [cx, cy, r] of [[0, 0, 0], [W, 0, 90], [W, H, 180], [0, H, 270]] as const) { ctx.save(); ctx.translate(cx, cy); ctx.rotate((r * Math.PI) / 180); ctx.drawImage(corner, 0, 0); ctx.restore(); }
    void rh;
  } else if (rim && arena.rimMode === 'strips') {
    const bottom = img('rim-bottom'), side = img('rim-side'), top = rim;
    if (side) for (let y = 0; y < H; y += side.height) { ctx.drawImage(side, 0, y); ctx.save(); ctx.translate(W, y); ctx.scale(-1, 1); ctx.drawImage(side, 0, 0); ctx.restore(); }
    for (let x = 0; x < W; x += top.width) ctx.drawImage(top, x, 0);
    if (bottom) for (let x = 0; x < W; x += bottom.width) ctx.drawImage(bottom, x, H - bottom.height);
    if (corner) { ctx.drawImage(corner, 0, 0); ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(corner, 0, 0); ctx.restore(); }
  } else { ctx.fillStyle = '#05090f'; ctx.fillRect(0, 0, W, 26); ctx.fillRect(0, H - 26, W, 26); ctx.fillRect(0, 0, 26, H); ctx.fillRect(W - 26, 0, 26, H); }
  bakedByArena.set(id, cv);
  scene.textures.addCanvas(key, cv);
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20);
}

/** Solid props as sprites. They sit low in the stack (below characters and telegraphs): props are low-relief, so Kai and enemies never pretend to be behind them. The pylons animate with the sim's hazard state. */
export class ArenaProps {
  private readonly sprites: { spr: Phaser.GameObjects.Image; prop: SolidProp; x: number; y: number; glow: Phaser.GameObjects.Image | null; frames: number }[] = [];
  constructor(scene: Phaser.Scene, id: ArenaId) {
    const man = parsePropManifest(scene.cache.json.get(PROPS_KEY(id)));
    for (const s of ARENAS[id].solids) {
      const m = man[s.prop], k = propKey(s.prop); if (!m || !scene.textures.exists(k)) continue;
      const tex = scene.textures.get(k), src = tex.getSourceImage() as { width: number; height: number }, frames = m.frames ?? 1, fw = m.frame?.w ?? src.width / frames, fh = m.frame?.h ?? src.height;
      if (frames > 1 && !tex.has('1')) for (let i = 0; i < frames; i++) tex.add(String(i), 0, i * fw, 0, fw, fh);
      const fp = PROP_FOOTPRINTS[s.prop], feetY = s.y + fp.h;
      const spr = scene.add.image(s.x + fp.w / 2, feetY, k, frames > 1 ? '0' : undefined).setOrigin(m.origin[0] / fw, m.origin[1] / fh).setScale(m.scale ?? 0.5).setDepth(5 + (feetY / RULES.worldHeight) * 0.5);
      const glowKey = arenaFxKey('pylon-glow'), glow = s.prop === 'pylon' && scene.textures.exists(glowKey) ? scene.add.image(s.x + fp.w / 2, feetY - 56, glowKey).setDepth(5.9).setAlpha(0).setScale(0.5) : null;
      this.sprites.push({ spr, prop: s.prop, x: s.x + fp.w / 2, y: s.y + fp.h / 2, glow, frames });
    }
  }
  /** Pylons show idle -> charging (last 55 % of the warning, a pulsing glow) -> discharging. */
  update(state: GameState, timeS: number) {
    for (const p of this.sprites) {
      if (p.prop !== 'pylon' || p.frames < 3) continue;
      const h = state.hazards.find(z => z.owner === 0 && z.tag === 'pylon' && Math.abs(z.x - p.x) < 2 && Math.abs(z.y - p.y) < 2);
      let f = 0, g = 0;
      if (h) { if (h.fired) { f = 2; g = Math.max(0, (h.activeLeft ?? 0) > 0 ? 1 : h.ttl / 0.45); } else { const u = 1 - h.delay / h.total; if (u > 0.45) { f = 1; g = 0.35 + 0.45 * ((u - 0.45) / 0.55) * (0.8 + 0.2 * Math.sin(timeS * 14)); } } }
      p.spr.setFrame(String(f)); p.glow?.setAlpha(g);
    }
  }
  destroy() { for (const p of this.sprites) { p.spr.destroy(); p.glow?.destroy(); } this.sprites.length = 0; }
}

/** Drifting motes (3 parallax layers, tiny and faint) + one slow fog layer. Screen-space wrapped around the camera view; render-only (Math.random is fine here). Reduced Effects removes both. */
export class Ambience {
  private readonly motes: { img: Phaser.GameObjects.Image; bx: number; by: number; vx: number; vy: number; f: number; ph: number }[] = [];
  private readonly fog: Phaser.GameObjects.TileSprite | null;
  constructor(private readonly scene: Phaser.Scene, private readonly id: ArenaId) {
    const mk = arenaFxKey('mote'), has = scene.textures.exists(mk);
    for (let i = 0; has && i < 24; i++) { const f = i % 3 === 0 ? 0.8 : i % 3 === 1 ? 1 : 1.25; this.motes.push({ img: scene.add.image(0, 0, mk).setDepth(f > 1 ? 14 : 3.2).setScale(f > 1 ? 0.45 : 0.3).setAlpha(0), bx: Math.random() * 1200, by: Math.random() * 700, vx: (Math.random() - 0.3) * 9, vy: -3 - Math.random() * 8, f, ph: Math.random() * 6 }); }
    this.fog = scene.textures.exists(arenaFxKey('fog')) ? scene.add.tileSprite(0, 0, 100, 100, arenaFxKey('fog')).setOrigin(0, 0).setDepth(3).setAlpha(0.2).setTileScale(0.5) : null;
  }
  update(timeS: number, reduced: boolean) {
    const cam = this.scene.cameras.main, wv = cam.worldView, vw = wv.width + 80, vh = wv.height + 80;
    if (this.fog) { this.fog.setVisible(!reduced).setPosition(wv.x, wv.y).setSize(wv.width + 8, wv.height + 8); this.fog.tilePositionX = wv.x * 0.9 / 0.5 * 0.5 + timeS * 5; this.fog.tilePositionY = wv.y * 0.9 / 0.5 * 0.5 + timeS * 2; }
    for (const m of this.motes) {
      if (reduced) { m.img.setAlpha(0); continue; }
      const x = (((m.bx + m.vx * timeS - wv.x * m.f) % vw) + vw) % vw, y = (((m.by + m.vy * timeS - wv.y * m.f) % vh) + vh) % vh;
      m.img.setPosition(Math.round(wv.x + x - 40), Math.round(wv.y + y - 40)).setAlpha((m.f > 1 ? 0.3 : 0.38) * (0.6 + 0.4 * Math.sin(timeS * 0.8 + m.ph)));
    }
    void this.id;
  }
  destroy() { for (const m of this.motes) m.img.destroy(); this.motes.length = 0; this.fog?.destroy(); }
}

/** Arena hazard visuals from the sim's own hazards (owner 0): a rect lane marches stripes while warning and flashes while active; a pylon ring fills to its edge at the instant it fires. The drawn edge is the hit edge. */
export class ArenaHazardView {
  // scene is the only dependency
  private readonly rect = new Map<number, Phaser.GameObjects.TileSprite>();
  private readonly rings = new Map<number, { warn: Phaser.GameObjects.Image; fill: Phaser.GameObjects.Image; flash: Phaser.GameObjects.Image }>();
  constructor(private readonly scene: Phaser.Scene) {}
  private clock = 0;
  sync(state: GameState, dt: number) {
    this.clock += dt;
    const live = new Set<number>();
    for (const h of state.hazards) {
      if (h.owner !== 0) continue; live.add(h.id);
      const u = Math.max(0, Math.min(1, 1 - h.delay / h.total));
      if (h.shape === 'rect') {
        // lanes run along the longer side; the strip art tiles along x, so a vertical lane is the same sprite rotated 90 degrees
        const vertical = (h.h ?? 0) > (h.w ?? 0), len = Math.max(h.w ?? 0, h.h ?? 0), thick = Math.min(h.w ?? 0, h.h ?? 0);
        let t = this.rect.get(h.id);
        if (!t) { t = this.scene.add.tileSprite(h.x, h.y, len, thick, arenaFxKey('surge-warn')).setDepth(2.7).setAngle(vertical ? 90 : 0); this.rect.set(h.id, t); }
        const alt = Math.floor(this.clock * 4) % 2 === 1 && this.scene.textures.exists(arenaFxKey('surge-warn-b')) ? '-b' : '', k = h.fired ? arenaFxKey('surge-active' + alt) : arenaFxKey('surge-warn' + alt);
        if (t.texture.key !== k) t.setTexture(k);
        const th = t.texture.getSourceImage().height; t.setTileScale(thick / th);
        t.tilePositionX += (h.fired ? 340 : 60) * dt;
        t.setAlpha(h.fired ? Math.min(1, (h.activeLeft ?? 0) > 0 ? 1 : h.ttl / 0.45) : 0.35 + 0.5 * u);
      } else {
        let r = this.rings.get(h.id);
        if (!r) { const wk = 'enemy-fx-circle-warn', fk = arenaFxKey('pulse-ring'); r = { warn: this.scene.add.image(h.x, h.y, wk).setDepth(2.7), fill: this.scene.add.image(h.x, h.y, wk).setDepth(2.71), flash: this.scene.add.image(h.x, h.y, fk).setDepth(2.72) }; this.rings.set(h.id, r); }
        const w = this.scene.textures.get('enemy-fx-circle-warn').getSourceImage().width, fw = this.scene.textures.get(arenaFxKey('pulse-ring')).getSourceImage().width;
        r.warn.setScale((h.r * 2) / w).setAlpha(h.fired ? 0 : 0.26 + 0.16 * u);
        r.fill.setScale(((h.r * 2) / w) * (0.15 + 0.85 * u)).setAlpha(h.fired ? 0 : 0.2 + 0.36 * u);
        r.flash.setScale((h.r * 2) / fw).setAlpha(h.fired ? ((h.activeLeft ?? 0) > 0 ? 1 : Math.max(0, h.ttl / 0.45)) : 0.2 + 0.5 * u);
      }
    }
    for (const [id, t] of this.rect) if (!live.has(id)) { t.destroy(); this.rect.delete(id); }
    for (const [id, r] of this.rings) if (!live.has(id)) { r.warn.destroy(); r.fill.destroy(); r.flash.destroy(); this.rings.delete(id); }
  }
  destroy() { for (const t of this.rect.values()) t.destroy(); for (const r of this.rings.values()) { r.warn.destroy(); r.fill.destroy(); r.flash.destroy(); } this.rect.clear(); this.rings.clear(); }
}
