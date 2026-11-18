/** B22 INTERIM ART: the two realm arenas, the six realm enemies and the seven new bosses are drawn procedurally here (Phaser Graphics) until ImageGen / Blender sprite sets ship. Everything is a pure read of the authoritative sim state; nothing here decides damage. The hazard drawing follows the exact hit shapes (circle / cone / lane / rect) so what is drawn is what hurts. */
import Phaser from 'phaser';
import { ARENAS, PROP_FOOTPRINTS, type ArenaId } from '../../content/arenas';
import { RULES } from '../../core/Rules';
import type { Enemy, GameState, Hazard } from '../../sim/GameState';
import { BOSSES } from '../../content/bosses';
import { isBoss, isRealmKind, type BossKind } from '../../content/enemies';

const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const col = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const FLOOR_KEY = 'arena-floor-baked';

/** Baked floor + rim + abyss for a procedural arena. */
export function createRealmFloor(scene: Phaser.Scene, id: ArenaId) {
  const a = ARENAS[id], p = a.palette!, W = RULES.worldWidth, H = RULES.worldHeight;
  if (scene.textures.exists(FLOOR_KEY)) scene.textures.remove(FLOOR_KEY);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
  // sky / void beyond the playable edge
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, p.sky); sky.addColorStop(1, '#000'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 160; i++) { const x = hash(i, 3) * W, y = hash(i, 9) * H; g.fillStyle = id === 'aetherfall' ? `rgba(255,236,190,${0.15 + hash(i, 5) * 0.4})` : `rgba(140,230,230,${0.1 + hash(i, 5) * 0.4})`; g.fillRect(x, y, 2, 2); }
  const inset = a.inset - 22, S = id === 'aetherfall' ? 96 : 110;
  g.save(); g.beginPath(); g.rect(inset, inset, W - inset * 2, H - inset * 2); g.clip();
  for (let ty = 0; ty * S < H; ty++) for (let tx = 0; tx * S < W; tx++) {
    const v = hash(tx, ty), x = tx * S, y = ty * S;
    g.fillStyle = v > 0.5 ? p.floorA : p.floorB; g.fillRect(x, y, S, S);
    if (id === 'paradox') { const sh = g.createLinearGradient(x, y, x + S, y + S); sh.addColorStop(0, 'rgba(111,227,225,0)'); sh.addColorStop(0.5, `rgba(111,227,225,${0.05 + v * 0.07})`); sh.addColorStop(1, 'rgba(111,227,225,0)'); g.fillStyle = sh; g.fillRect(x, y, S, S); }
    g.strokeStyle = p.seam; g.globalAlpha = 0.65; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, S - 2, S - 2); g.globalAlpha = 1;
    if (v > 0.86) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + v * 60, y); g.lineTo(x + S * 0.5, y + S * 0.45); g.lineTo(x + S * (v - 0.4), y + S); g.stroke(); }
  }
  // inlay: a ring and a cross through the centre landmark, in the accent colour
  g.strokeStyle = p.accent; g.globalAlpha = 0.35; g.lineWidth = 3;
  for (const r of [180, 300]) { g.beginPath(); g.arc(W / 2, H / 2, r, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.moveTo(W / 2 - 360, H / 2); g.lineTo(W / 2 + 360, H / 2); g.moveTo(W / 2, H / 2 - 360); g.lineTo(W / 2, H / 2 + 360); g.stroke(); g.globalAlpha = 1;
  if (id === 'aetherfall') for (const c of a.hazard.cells ?? []) { g.strokeStyle = 'rgba(120,100,50,.35)'; g.setLineDash([10, 8]); g.lineWidth = 2; g.strokeRect(c.x - c.w / 2 + 6, c.y - c.h / 2 + 6, c.w - 12, c.h - 12); g.setLineDash([]); }
  if (id === 'paradox') for (const f of a.hazard.folds ?? []) { g.strokeStyle = p.accent; g.globalAlpha = 0.3; g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(f.x, f.y, f.r * 0.5, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
  g.restore();
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.hypot(W, H) * 0.52); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${a.shade.vignette * 0.8})`); g.fillStyle = vg; g.fillRect(0, 0, W, H);
  // rim: a stone / glass lip with a drop shadow into the abyss
  g.strokeStyle = p.rim; g.lineWidth = 26; g.strokeRect(inset, inset, W - inset * 2, H - inset * 2); g.strokeStyle = p.accent; g.globalAlpha = 0.5; g.lineWidth = 2; g.strokeRect(inset + 14, inset + 14, W - (inset + 14) * 2, H - (inset + 14) * 2); g.globalAlpha = 1;
  scene.textures.addCanvas(FLOOR_KEY, cv); return scene.add.image(0, 0, FLOOR_KEY).setOrigin(0, 0).setDepth(-20);
}

/** Solid props drawn to the exact footprint rect used by collision (so art and collision cannot disagree). */
export class RealmProps {
  private readonly g: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene, id: ArenaId) {
    const a = ARENAS[id], p = a.palette!, g = this.g = scene.add.graphics().setDepth(5);
    for (const s of a.solids) {
      const f = PROP_FOOTPRINTS[s.prop], x = s.x, y = s.y, w = f.w, h = f.h, tall = Math.min(110, 30 + w * 0.6);
      const base = id === 'aetherfall' ? col('#b9ae8a') : col('#2a2358'), top = id === 'aetherfall' ? col('#e3d6a6') : col('#4a3f98'), edge = col(p.accent);
      g.fillStyle(0x000000, 0.35); g.fillEllipse(x + w / 2, y + h, w * 1.15, h * 0.6);
      g.fillStyle(base, 1); g.fillRect(x, y - tall * 0.35, w, h + tall * 0.35); g.fillStyle(top, 1); g.fillRect(x, y - tall * 0.35, w, Math.max(8, tall * 0.28));
      if (s.prop.includes('shard') || s.prop.includes('spire') || s.prop.includes('prism')) { g.fillStyle(top, 0.9); g.fillTriangle(x + 4, y, x + w / 2, y - tall * 1.4, x + w - 4, y); }
      g.lineStyle(2, edge, 0.7); g.strokeRect(x, y - tall * 0.35, w, h + tall * 0.35);
    }
  }
  destroy() { this.g.destroy(); }
}

const ACCENT: Record<string, string> = { sky_lancer: '#f2d27a', halo_scribe: '#ffe9a8', citadel_bulwark: '#e6c98a', rift_mimic: '#9fe6e0', phase_harrier: '#b18cff', singularity_husk: '#6a5cff', halo_sigil: '#ffe08a' };
const isClassicHazardOwner = (s: GameState, h: Hazard) => { const o = s.enemies.find(e => e.id === h.owner); return !!o && (o.kind === 'warden' || o.kind === 'seraph'); };
/** Hazards the classic renderers already draw (their own boss hazards and classic arena surges / pylons). */
export const drawnByClassic = (s: GameState, h: Hazard) => h.shape !== 'lane' && ((h.owner === 0 && !ARENAS[s.arenaId].procedural) || isClassicHazardOwner(s, h));

interface Burst { x: number; y: number; t: number; dur: number; r: number; c: number; x2?: number; y2?: number }
/** The dynamic B22 layer: hazards of every new shape, realm actors, parts, marks, zones, scheduled effects and branch / relic / ultimate event flashes. Created for every arena. */
export class B22Overlay {
  private readonly haz: Phaser.GameObjects.Graphics; private readonly act: Phaser.GameObjects.Graphics; private readonly fxg: Phaser.GameObjects.Graphics;
  private bursts: Burst[] = []; private evCur = 0; private enemyCur = 0; private lastHp = new Map<number, number>(); private clock = 0;
  constructor(scene: Phaser.Scene) { this.haz = scene.add.graphics().setDepth(5.55); this.act = scene.add.graphics().setDepth(6.5); this.fxg = scene.add.graphics().setDepth(10.6).setBlendMode(Phaser.BlendModes.ADD); }
  private hazardColor(h: Hazard) { return h.echo ? 0x7fe0e8 : h.tag.startsWith('well') ? 0xffcf6a : h.tag === 'shatter' ? 0xf4d78a : h.tag === 'fold' ? 0xb18cff : h.tag === 'lance' || h.tag === 'lance_land' ? 0xf2d27a : h.tag === 'arrival' ? 0xb18cff : h.tag.startsWith('husk') ? 0x6a5cff : h.tag === 'collapse' ? 0xe9c8ff : 0xff5a6a; }
  update(s: GameState, dt: number, reduced: boolean) {
    this.clock += dt; const hg = this.haz, ag = this.act, fg = this.fxg; hg.clear(); ag.clear(); fg.clear();
    // ---- hazards (every shape the sim can resolve)
    for (const h of s.hazards) {
      if (drawnByClassic(s, h)) continue;
      const prog = Math.max(0, Math.min(1, 1 - h.delay / Math.max(0.01, h.total))), c = this.hazardColor(h), live = h.fired && (h.activeLeft ?? 0) > 0, flash = h.fired ? Math.max(0, live ? 1 : h.ttl / 0.45) : 0, pulse = 0.5 + 0.5 * Math.sin(this.clock * (h.fired ? 30 : 8 + prog * 14));
      const dmgless = h.damage <= 0 && !h.tag.startsWith('well') && !h.tag.startsWith('husk');
      if (h.fired && !live && flash <= 0) continue;
      const a0 = h.fired ? 0.55 * flash : 0.16 + 0.12 * pulse, aF = h.fired ? 0.5 * flash : 0.18 + 0.4 * prog;
      if (h.shape === 'circle' || h.shape === 'sigil') {
        const r = h.r; hg.lineStyle(h.echo ? 2 : 3, c, h.fired ? flash : 0.85); if (h.echo) { for (let k = 0; k < 16; k += 2) hg.beginPath().arc(h.x, h.y, r, k * Math.PI / 8, (k + 1) * Math.PI / 8).strokePath(); } else hg.strokeCircle(h.x, h.y, r);
        hg.fillStyle(c, a0); hg.fillCircle(h.x, h.y, r); hg.fillStyle(c, aF); hg.fillCircle(h.x, h.y, h.fired ? r : r * (0.12 + 0.88 * prog));
        if (h.shape === 'sigil' || dmgless) { hg.lineStyle(2, c, 0.9); hg.strokeCircle(h.x, h.y, r * 0.6); hg.beginPath().moveTo(h.x - r * 0.6, h.y).lineTo(h.x + r * 0.6, h.y).moveTo(h.x, h.y - r * 0.6).lineTo(h.x, h.y + r * 0.6).strokePath(); }
        if (h.tag.startsWith('well')) { hg.lineStyle(2, c, 0.7); for (let k = 0; k < 3; k++) hg.beginPath().arc(h.x, h.y, r * (0.35 + 0.2 * k), this.clock * (h.tag === 'well_fast' ? 4 : -1.5) + k, this.clock * (h.tag === 'well_fast' ? 4 : -1.5) + k + 2.2).strokePath(); }
      } else if (h.shape === 'cone') {
        const a1 = h.ang - h.arc / 2, a2 = h.ang + h.arc / 2, draw = (rr: number, al: number) => { hg.fillStyle(c, al); hg.beginPath().moveTo(h.x, h.y).arc(h.x, h.y, rr, a1, a2).closePath().fillPath(); };
        draw(h.r, a0); draw(h.r * (h.fired ? 1 : 0.12 + 0.88 * prog), aF); hg.lineStyle(2, c, 0.85); hg.beginPath().moveTo(h.x, h.y).arc(h.x, h.y, h.r, a1, a2).closePath().strokePath();
      } else if (h.shape === 'lane') {
        const w = h.w ?? 40, cs = Math.cos(h.ang), sn = Math.sin(h.ang), pts = (len: number) => [new Phaser.Math.Vector2(h.x - sn * w / 2, h.y + cs * w / 2), new Phaser.Math.Vector2(h.x + cs * len - sn * w / 2, h.y + sn * len + cs * w / 2), new Phaser.Math.Vector2(h.x + cs * len + sn * w / 2, h.y + sn * len - cs * w / 2), new Phaser.Math.Vector2(h.x + sn * w / 2, h.y - cs * w / 2)];
        hg.fillStyle(c, a0); hg.fillPoints(pts(h.r), true); hg.fillStyle(c, aF); hg.fillPoints(pts(h.fired ? h.r : h.r * (0.1 + 0.9 * prog)), true); hg.lineStyle(2, c, 0.9); hg.strokePoints(pts(h.r), true);
      } else if (h.shape === 'rect') {
        const x = h.x - (h.w ?? 0) / 2, y = h.y - (h.h ?? 0) / 2; hg.fillStyle(c, a0 + 0.06); hg.fillRect(x, y, h.w ?? 0, h.h ?? 0); hg.fillStyle(c, aF); hg.fillRect(x + 4, y + 4, (h.w ?? 0) - 8, (h.h ?? 0) - 8); hg.lineStyle(3, c, 0.9); hg.strokeRect(x, y, h.w ?? 0, h.h ?? 0);
        if (!h.fired) { hg.lineStyle(2, c, 0.7); for (let k = 0; k < 5; k++) { const u = (k + 0.5) / 5; hg.beginPath().moveTo(x + (h.w ?? 0) * u, y + 8).lineTo(x + (h.w ?? 0) * (u + 0.05 * pulse), y + (h.h ?? 0) - 8).strokePath(); } }
      }
    }
    // ---- zones, scheduled effects, marks (authoritative state; drawn for every arena)
    for (const z of s.b22.zones) { const life = 1 - z.t / z.dur, c = z.src === 'rift_key' ? 0xc58bff : z.src.includes('vex') ? 0xa070ff : z.src.includes('burning') || z.src.includes('crater') || z.src.includes('rupture') || z.src.includes('crucible') ? 0xff7a3d : 0xffd36a;
      fg.lineStyle(3, c, 0.7 * life); fg.fillStyle(c, 0.16 * life);
      if (z.kind === 'line') { const dx = z.x2 - z.x, dy = z.y2 - z.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * z.r, ny = dx / L * z.r; fg.fillPoints([new Phaser.Math.Vector2(z.x + nx, z.y + ny), new Phaser.Math.Vector2(z.x2 + nx, z.y2 + ny), new Phaser.Math.Vector2(z.x2 - nx, z.y2 - ny), new Phaser.Math.Vector2(z.x - nx, z.y - ny)], true); }
      else { fg.fillCircle(z.x, z.y, z.r); fg.strokeCircle(z.x, z.y, z.r); } }
    for (const f of s.b22.fx) if (f.kind === 'area' || f.kind === 'nova' || f.kind === 'strike') { const t = Math.max(0, f.at - s.time); fg.lineStyle(2, 0xffe08a, 0.6); fg.strokeCircle(f.x, f.y, f.r * (0.4 + 0.6 * (1 - Math.min(1, t / 0.8)))); }
    for (const m of s.b22.marks) { const e = s.enemies.find(x => x.id === m.enemy); if (!e) continue; const c = m.src === 'seal' ? 0xa070ff : 0xff9aa0, r = e.radius + 10 + 3 * Math.sin(this.clock * 6); fg.lineStyle(2, c, 0.95); fg.strokeCircle(e.x, e.y, r); fg.beginPath().moveTo(e.x - r - 4, e.y).lineTo(e.x - r + 6, e.y).moveTo(e.x + r + 4, e.y).lineTo(e.x + r - 6, e.y).moveTo(e.x, e.y - r - 4).lineTo(e.x, e.y - r + 6).moveTo(e.x, e.y + r + 4).lineTo(e.x, e.y + r - 6).strokePath(); }
    // ---- one-shot flashes from sim events (branches, relics, legendaries, ultimates, parries)
    for (const ev of s.b22.ev) { if (ev.id <= this.evCur) continue; this.evCur = ev.id; const warm = /dawn|sigil|prism|feather|hourglass|bearing/.test(ev.kind) ? 0xffe08a : /rift|parry|mark|seal|waltz|judge|vex/.test(ev.kind) ? 0xa070ff : /ult|collapse|nova|crater|crucible|cone|area|line|chain|relay|arc|fan/.test(ev.kind) ? 0xffb347 : 0x9fe6e0; this.bursts.push({ x: ev.x, y: ev.y, t: 0, dur: ev.x2 !== undefined ? 0.25 : 0.4, r: Math.max(24, Math.min(260, ev.n ?? 70)), c: warm, x2: ev.x2, y2: ev.y2 }); }
    for (const ev of s.enemyEvents) { if (ev.id <= this.enemyCur) continue; this.enemyCur = ev.id; if (ev.kind === 'enemy_death' && (isRealmKind(ev.enemy) || isBoss(ev.enemy as BossKind))) this.bursts.push({ x: ev.x, y: ev.y, t: 0, dur: ev.tag === 'boss' ? 1.2 : 0.4, r: ev.tag === 'boss' ? 180 : 50, c: 0xffe9a8 }); }
    const keep: Burst[] = []; for (const b of this.bursts) { b.t += dt; if (b.t >= b.dur) continue; keep.push(b); const u = b.t / b.dur; fg.lineStyle(4 * (1 - u) + 1, b.c, 1 - u); if (b.x2 !== undefined) fg.beginPath().moveTo(b.x, b.y).lineTo(b.x2, b.y2!).strokePath(); else { fg.strokeCircle(b.x, b.y, b.r * (0.25 + 0.75 * u)); if (!reduced) { fg.fillStyle(b.c, 0.25 * (1 - u)); fg.fillCircle(b.x, b.y, b.r * u * 0.7); } } } this.bursts = keep.slice(-40);
    // ---- actors
    const seen = new Set<number>();
    for (const e of s.enemies) { if (e.hp <= 0) continue; if (!isRealmKind(e.kind) && !(isBoss(e.kind) && e.kind !== 'warden' && e.kind !== 'seraph')) continue; seen.add(e.id); this.actor(ag, e, s); }
    for (const id of this.lastHp.keys()) if (!seen.has(id)) this.lastHp.delete(id);
  }
  private actor(g: Phaser.GameObjects.Graphics, e: Enemy, s: GameState) {
    const prev = this.lastHp.get(e.id) ?? e.hp, hurt = e.hp < prev - 0.01; this.lastHp.set(e.id, e.hp);
    const k = e.kind, def = isBoss(k as BossKind) ? BOSSES[k as BossKind] : null, ac = col(def?.accent ?? ACCENT[k] ?? '#ffffff'), r = e.radius, fy = e.y, face = Math.atan2(e.aimY, e.aimX), flash = hurt || (e.stagger > 0 && e.stagger < 0.1);
    const body = (c: number) => (flash ? 0xffffff : c), tele = e.mode === 'windup' || e.mode === 'phase' || e.mode === 'blink';
    g.fillStyle(0x000000, 0.4); g.fillEllipse(e.x, fy + r * 0.6, r * 2.1, r * 0.8);
    if (e.part) return this.part(g, e, ac, flash, s);
    g.lineStyle(3, 0x0a0a14, 1);
    switch (k) {
      case 'sky_lancer': g.fillStyle(body(0xf2d27a)); g.fillTriangle(e.x, fy - r * 1.5, e.x + r, fy + r * 0.4, e.x - r, fy + r * 0.4); g.lineStyle(3, 0xfff2b8, 1); g.beginPath().moveTo(e.x, fy - r * 0.4).lineTo(e.x + Math.cos(face) * r * 3.2, fy - r * 0.4 + Math.sin(face) * r * 3.2).strokePath(); break;
      case 'halo_scribe': g.fillStyle(body(0xe9d9a0)); g.fillTriangle(e.x, fy - r * 1.1, e.x + r * 1.1, fy + r * 0.7, e.x - r * 1.1, fy + r * 0.7); g.lineStyle(3, 0xffe9a8, 1); g.strokeEllipse(e.x, fy - r * 1.6, r * 1.4, r * 0.5); break;
      case 'citadel_bulwark': g.fillStyle(body(0xcdb88a)); g.fillRect(e.x - r, fy - r * 1.2, r * 2, r * 1.9); g.fillStyle(0xe6c98a); g.fillRect(e.x - r, fy - r * 1.2, r * 2, r * 0.45); if ((e.ex?.crack ?? 4) > 0) { g.lineStyle(5, 0xfff0c0, e.mode === 'recover' ? 0.25 : 0.95); const f = e.aimX >= 0 ? 1 : -1; g.beginPath().arc(e.x, fy - r * 0.3, r * 1.5, f > 0 ? -1.2 : Math.PI - 1.2, f > 0 ? 1.2 : Math.PI + 1.2).strokePath(); } break;
      case 'rift_mimic': g.fillStyle(0x9fe6e0, 0.35); g.fillCircle(e.x + 8, fy - r * 0.3 + 5, r); g.fillStyle(body(0x9fe6e0)); g.fillCircle(e.x, fy - r * 0.3, r); g.fillStyle(0x0b2a30); g.fillCircle(e.x - r * 0.35, fy - r * 0.4, 3); g.fillCircle(e.x + r * 0.35, fy - r * 0.4, 3); break;
      case 'phase_harrier': g.fillStyle(0xb18cff, 0.3); g.fillTriangle(e.x - Math.cos(face) * r * 3, fy - Math.sin(face) * r * 3, e.x - r, fy, e.x + r, fy); g.fillStyle(body(0xb18cff)); g.fillTriangle(e.x, fy - r * 1.3, e.x + r, fy + r * 0.5, e.x - r, fy + r * 0.5); break;
      case 'singularity_husk': g.fillStyle(body(0x1a1440)); g.fillCircle(e.x, fy - r * 0.3, r * 1.1); g.lineStyle(3, 0x8f80ff, 0.9); for (let i = 0; i < 3; i++) g.beginPath().arc(e.x, fy - r * 0.3, r * (1.3 + i * 0.35), this.clock * (2 - i) + i * 2, this.clock * (2 - i) + i * 2 + 2.4).strokePath(); break;
      case 'halo_sigil': { const life = (e.ex?.life ?? 7) / 7; g.lineStyle(3, 0xffe08a, 0.5 + 0.5 * life); g.strokeCircle(e.x, fy, r); g.beginPath().moveTo(e.x - r, fy).lineTo(e.x + r, fy).moveTo(e.x, fy - r).lineTo(e.x, fy + r).strokePath(); g.fillStyle(body(0xffe08a), 0.5); g.fillCircle(e.x, fy, r * 0.55); break; }
      default: this.boss(g, e, ac, flash);
    }
    if (tele) { g.lineStyle(2, 0xffffff, 0.5 + 0.4 * Math.sin(this.clock * 18)); g.strokeCircle(e.x, fy - r * 0.3, r * 1.5); }
    if (k !== 'halo_sigil' && !def) { const w = r * 2, f = Math.max(0, e.hp / e.maxHp); g.fillStyle(0x000000, 0.7); g.fillRect(e.x - w / 2, fy - r * 2.2, w, 4); g.fillStyle(ac, 1); g.fillRect(e.x - w / 2, fy - r * 2.2, w * f, 4); }
    void s;
  }
  private boss(g: Phaser.GameObjects.Graphics, e: Enemy, ac: number, flash: boolean) {
    const r = e.radius, x = e.x, y = e.y, c = (v: number) => (flash ? 0xffffff : v), exposed = !!e.ai?.exposed, X = e.ex ?? {}, face = Math.atan2(e.aimY, e.aimX);
    const core = (rr: number) => { g.fillStyle(exposed ? 0xffffff : ac, exposed ? 1 : 0.75); g.fillCircle(x, y - r * 0.3, rr); g.lineStyle(2, 0xffffff, 0.8); g.strokeCircle(x, y - r * 0.3, rr + 3); };
    switch (e.kind) {
      case 'castellan': g.fillStyle(c(0x8a8266)); g.fillRect(x - r * 0.9, y - r * 1.6, r * 1.8, r * 2.1); g.fillStyle(c(0xb9ae8a)); g.fillRect(x - r * 1.35, y - r * 1.5, r * 0.55, r * 0.9); g.fillRect(x + r * 0.8, y - r * 1.5, r * 0.55, r * 0.9); g.fillStyle(c(0xe3d6a6)); g.fillTriangle(x - r * 0.5, y - r * 1.6, x - r * 0.2, y - r * 2.3, x + r * 0.1, y - r * 1.6); g.fillTriangle(x + r * 0.1, y - r * 1.6, x + r * 0.4, y - r * 2.2, x + r * 0.7, y - r * 1.6); core(r * 0.32); if (e.ai?.phase === 2) { g.lineStyle(3, 0xffe9a8, 0.8); g.beginPath().moveTo(x - r, y - r).lineTo(x - r * 1.4, y - r * 1.8).strokePath(); } break;
      case 'regent': g.fillStyle(c(X.decoy ? 0x3a3a70 : 0x4a3f98)); g.fillTriangle(x, y - r * 1.8, x + r * 1.2, y, x, y + r * 0.7); g.fillTriangle(x, y - r * 1.8, x - r * 1.2, y, x, y + r * 0.7); g.lineStyle(2, 0x7fe0e8, 0.9); g.strokeTriangle(x, y - r * 1.8, x + r * 1.2, y, x, y + r * 0.7); g.strokeTriangle(x, y - r * 1.8, x - r * 1.2, y, x, y + r * 0.7); if (!X.decoy) core(r * 0.3); else { g.fillStyle(0x7fe0e8, 0.18); g.fillCircle(x, y - r * 0.3, r * 0.8); } break;
      case 'oathkeeper': g.fillStyle(c(0x2a1f4a)); g.fillRect(x - r * 0.8, y - r * 1.7, r * 1.6, r * 2.2); g.fillStyle(c(0x6c4cc8)); g.fillRect(x - r * 0.8, y - r * 1.7, r * 1.6, r * 0.5); g.lineStyle(4, X.reflect ? 0xffffff : 0xc7a8ff, 1); g.beginPath().moveTo(x, y - r * 0.4).lineTo(x + Math.cos(face) * r * 2.6, y - r * 0.4 + Math.sin(face) * r * 2.6).strokePath(); if (X.reflect) { g.lineStyle(3, 0xffffff, 0.8); g.strokeCircle(x, y - r * 0.4, r * 1.6); } break;
      case 'mirror_tyrant': { g.fillStyle(c(0x6a8fb0)); g.fillTriangle(x, y - r * 1.9, x + r * 1.1, y - r * 0.2, x - r * 1.1, y - r * 0.2); g.fillTriangle(x + r * 1.1, y - r * 0.2, x - r * 1.1, y - r * 0.2, x, y + r * 0.7); core(r * 0.28); const nn = X.nn ?? 3, arc = X.arc ?? 1.7, f0 = X.face ?? 0; for (let i = 0; i < nn; i++) { const a = f0 - arc / 2 + (i + 0.5) * arc / nn, alive = (X[`n${i}`] ?? 0) > 0; g.lineStyle(alive ? 6 : 2, alive ? 0xdff6ff : 0x44566a, alive ? 1 : 0.5); g.beginPath().arc(x, y - r * 0.3, r * 2, a - arc / nn / 2 + 0.05, a + arc / nn / 2 - 0.05).strokePath(); } break; }
      case 'chronophage': g.fillStyle(c(0x6b5a2a)); g.fillCircle(x, y - r * 0.3, r * 1.3); g.lineStyle(4, 0xffcf6a, 1); g.strokeCircle(x, y - r * 0.3, r * 1.3); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath().moveTo(x + Math.cos(a) * r * 1.15, y - r * 0.3 + Math.sin(a) * r * 1.15).lineTo(x + Math.cos(a) * r * 1.3, y - r * 0.3 + Math.sin(a) * r * 1.3).strokePath(); } g.lineStyle(4, 0xfff0b0, 1); g.beginPath().moveTo(x, y - r * 0.3).lineTo(x + Math.cos(this.clock * (e.ai?.phase === 2 ? 3 : 1.5)) * r, y - r * 0.3 + Math.sin(this.clock * (e.ai?.phase === 2 ? 3 : 1.5)) * r).strokePath(); core(r * 0.2); break;
      case 'hollow_choir': g.fillStyle(c(0x1a1530)); g.fillCircle(x, y - r * 0.3, r * 1.4); g.lineStyle(3, 0xd6c2ff, 0.9); g.strokeCircle(x, y - r * 0.3, r * 1.4); core(r * 0.5); break;
      case 'sovereign': g.fillStyle(c(0x2b1d4a)); g.fillCircle(x, y - r * 0.3, r * 1.15); g.lineStyle(4, 0xe9c8ff, 0.9); for (let i = 0; i < 3; i++) g.strokeCircle(x, y - r * 0.3, r * (1.2 + i * 0.22) + 3 * Math.sin(this.clock * 2 + i)); core(r * 0.5); if (X.shield) { g.lineStyle(5, 0x9fe6ff, 0.8); g.strokeCircle(x, y - r * 0.3, r * 1.5); } break;
      default: g.fillStyle(ac); g.fillCircle(x, y - r * 0.3, r);
    }
  }
  private part(g: Phaser.GameObjects.Graphics, e: Enemy, ac: number, flash: boolean, s: GameState) {
    const r = e.radius, x = e.x, y = e.y, role = e.part!.role, c = (v: number) => (flash ? 0xffffff : v), f = Math.max(0, e.hp / e.maxHp);
    g.lineStyle(3, 0x0a0a14, 1);
    if (role === 'decoy') return this.boss(g, e, ac, flash);
    if (role === 'anchor') { g.fillStyle(c(0x6a4fa8)); g.fillTriangle(x, y - r * 1.8, x + r, y + r * 0.3, x - r, y + r * 0.3); g.lineStyle(2, 0xe9c8ff, 1); g.strokeTriangle(x, y - r * 1.8, x + r, y + r * 0.3, x - r, y + r * 0.3); }
    else if (role === 'arm') { g.fillStyle(c(0x3b2a66)); g.fillRoundedRect(x - r, y - r * 1.4, r * 2, r * 2.4, 10); g.lineStyle(3, 0xe9c8ff, 0.9); g.strokeRoundedRect(x - r, y - r * 1.4, r * 2, r * 2.4, 10); }
    else if (role === 'head') { g.fillStyle(c(0xe9c8ff)); g.fillTriangle(x - r, y - r * 0.6, x + r, y - r * 0.6, x, y + r * 0.9); g.lineStyle(2, 0xffffff, 1); g.strokeTriangle(x - r, y - r * 0.6, x + r, y - r * 0.6, x, y + r * 0.9); }
    else if (role === 'line') { g.fillStyle(c(0xd6c2ff)); g.fillRect(x - r * 0.35, y - r * 2, r * 0.7, r * 2.6); g.fillTriangle(x - r * 0.7, y - r * 2, x + r * 0.7, y - r * 2, x, y - r * 2.7); }
    else if (role === 'cone') { g.fillStyle(c(0xb89cff)); g.fillTriangle(x - r * 1.2, y + r * 0.5, x + r * 1.2, y + r * 0.5, x, y - r * 1.8); }
    else { g.lineStyle(5, c(0xe6d8ff), 1); g.strokeCircle(x, y - r * 0.4, r); g.strokeCircle(x, y - r * 0.4, r * 0.55); }
    const w = r * 2.2; g.fillStyle(0x000000, 0.75); g.fillRect(x - w / 2, y - r * 2.1, w, 5); g.fillStyle(0xe9c8ff, 1); g.fillRect(x - w / 2, y - r * 2.1, w * f, 5); void s;
  }
  destroy() { this.haz.destroy(); this.act.destroy(); this.fxg.destroy(); }
}
