/** B31B Living Fractures world layer: draws every event from the authoritative `state.lf` (a pure read; nothing here decides anything). Generated art lives in one atlas ('lf') plus six mark icons; rings, progress arcs, zones and prompts are drawn on top so dangerous / interactive areas stay distinct from decoration. Works identically on the local sim and the online client's snapshot copy. */
import Phaser from 'phaser';
import type { GameState } from '../../sim/GameState';
import { ARENA_LF, BARGAINS, BLESSINGS, ELITE_COPY, LF_RULES as F, LF_TERMINAL, type LfEvent } from '../../b31/fractures';
import { PLAYER_FOOT_DY } from '../../content/enemies';

export const LF_ATLAS = 'lf';
export const LF_MARKS = ['swift', 'volatile', 'warded', 'relic', 'boon', 'trophy'] as const;
export const lfMarkKey = (n: string) => `lfm-${n}`;
const MOD_COLOR = { swift: 0x5fe8ff, volatile: 0xff7a3a, warded: 0xc08cff } as const;
const HERO_COLOR = { kai: 0xffab4a, ren: 0xff4a5c, sora: 0x5eb6ff, vex: 0xa982ff } as const;
const TAU = Math.PI * 2;
interface Vis { main?: Phaser.GameObjects.Image; extra?: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text; label2?: Phaser.GameObjects.Text; prompt: Phaser.GameObjects.Text; crest?: Phaser.GameObjects.Image }
const txt = (scene: Phaser.Scene, size: number, color = '#ffffff') => scene.add.text(0, 0, '', { fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: `${size}px`, fontStyle: '800', color, stroke: '#05060c', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(14);

export class LfLayer {
  private readonly g: Phaser.GameObjects.Graphics; private readonly vis = new Map<number, Vis>(); private clock = 0;
  constructor(private readonly scene: Phaser.Scene) { this.g = scene.add.graphics().setDepth(5.45); }
  private has(k: string) { return this.scene.textures.exists(LF_ATLAS) && this.scene.textures.get(LF_ATLAS).has(k); }
  private img(k: string, depth: number) { return this.has(k) ? this.scene.add.image(0, 0, LF_ATLAS, k).setDepth(depth) : undefined; }
  private make(e: LfEvent): Vis {
    const v: Vis = { prompt: txt(this.scene, 13, '#fff4c8').setVisible(false) }, A = e.variant;
    if (e.kind === 'rift') { v.main = this.img(`portal_${A}`, 3.4)?.setScale(0.5).setOrigin(0.5, 0.58); v.extra = this.img('cache_state_1', 7)?.setScale(0.5).setVisible(false); }
    else if (e.kind === 'shrine') { v.main = this.img(`shrine_${A}`, 5.2)?.setScale(0.6).setOrigin(0.5, 0.78); v.label = txt(this.scene, 12, '#ffe2f2'); v.label2 = txt(this.scene, 12, '#ffe2f2'); }
    else if (e.kind === 'cache') { v.main = this.img(`cache_${A}`, 5.2)?.setScale(0.45).setOrigin(0.5, 0.82); v.extra = this.img('cache_state_2', 7)?.setScale(0.55).setVisible(false); }
    else if (e.kind === 'relay') { v.main = this.img(e.type === 'escort' ? `beacon_${A}` : `relay_${A}`, 5.2)?.setScale(e.type === 'escort' ? 0.5 : 0.6).setOrigin(0.5, e.type === 'escort' ? 0.6 : 0.88); v.extra = this.img(`beacon_${A}`, 5.1)?.setScale(0.32).setVisible(false); v.label = txt(this.scene, 12, '#d8fbff'); }
    else if (e.kind === 'echo') { v.main = this.img(`echo_${e.hero}`, 3.35)?.setOrigin(0.5, 0.5); v.label = txt(this.scene, 12, '#fff4d8'); v.extra = this.scene.textures.exists(LF_ATLAS) ? this.scene.add.image(0, 0, LF_ATLAS, 'cache_state_1').setDepth(7).setScale(0.32).setVisible(false) : undefined; }
    else if (e.kind === 'elite') { v.crest = this.scene.textures.exists(lfMarkKey(e.mod!)) ? this.scene.add.image(0, 0, lfMarkKey(e.mod!)).setDepth(14).setScale(0.42) : undefined; v.label = txt(this.scene, 12, '#ffd8d8'); }
    if (v.prompt) v.prompt.setDepth(14);
    return v;
  }
  private kill(v: Vis) { for (const o of [v.main, v.extra, v.label, v.label2, v.prompt, v.crest]) o?.destroy(); }
  update(s: GameState, dt: number, reduced: boolean) {
    this.clock += dt; const g = this.g; g.clear(); const lf = s.lf, t = this.clock, px = s.player.x, py = s.player.y + PLAYER_FOOT_DY;
    if (!lf) { for (const v of this.vis.values()) this.kill(v); this.vis.clear(); return; }
    const live = new Set<number>(), pulse = reduced ? 0.7 : 0.6 + 0.4 * Math.sin(t * 4), bob = reduced ? 0 : Math.sin(t * 2.4) * 3;
    for (const e of lf.events) {
      live.add(e.id); const v = this.vis.get(e.id) ?? (this.vis.set(e.id, this.make(e)), this.vis.get(e.id)!), acc = ARENA_LF[e.variant].accent;
      const dead = LF_TERMINAL.includes(e.st), fade = dead ? Math.max(0, 1 - (s.time - e.ta) / 3.5) : 1, won = e.st === 'won', dist = Math.hypot(e.x - px, e.y - py), near = dist < 300 && !dead;
      const pos = (o: Phaser.GameObjects.Image | undefined, x: number, y: number, a: number) => o?.setPosition(x, y).setAlpha(a).setDepth(o.depth < 6 ? 5 + y / 1600 + (o.depth - Math.floor(o.depth)) * 0.01 : o.depth);
      const glow = (x: number, y: number, r: number, c: number, a: number) => { g.fillStyle(c, a * 0.35 * fade); g.fillCircle(x, y, r); g.fillStyle(c, a * 0.18 * fade); g.fillCircle(x, y, r * 1.4); };
      const ring = (x: number, y: number, r: number, c: number, a: number, w = 3) => { g.lineStyle(w, c, a * fade); g.strokeCircle(x, y, r); };
      const arc = (x: number, y: number, r: number, c: number, p: number, w = 5) => { g.lineStyle(w + 3, 0x05060c, 0.7 * fade); g.beginPath().arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.001, p)).strokePath(); g.lineStyle(w, c, 0.95 * fade); g.beginPath().arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.001, p)).strokePath(); };
      const bar = (x: number, y: number, w: number, p: number, c: number) => { g.fillStyle(0x05060c, 0.8 * fade); g.fillRect(x - w / 2 - 2, y - 2, w + 4, 8); g.fillStyle(c, fade); g.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, p)), 4); };
      const prompt = (s2: string, x: number, y: number) => { v.prompt.setVisible(near && !!s2).setText(s2).setPosition(x, y); };
      v.prompt.setVisible(false);
      switch (e.kind) {
        case 'rift': {
          const open = e.st === 'active' || e.st === 'reward';
          pos(v.main, e.x, e.y, fade); if (v.main && !reduced) v.main.setScale(0.5 + Math.sin(t * 3) * (open ? 0.015 : 0.008));
          glow(e.x, e.y, 70, acc, open ? pulse : 0.5);
          if (e.st === 'idle') { ring(e.x, e.y, F.rift.enterR, acc, 0.5 + 0.3 * pulse); if (e.p > 0) arc(e.x, e.y, F.rift.enterR + 8, 0xffffff, e.p); prompt('STEP INTO THE RING', e.x, e.y - 86); }
          if (e.st === 'active') { g.lineStyle(4, acc, 0.9 * fade); g.strokeCircle(e.x, e.y, e.r); g.lineStyle(2, 0xffffff, 0.35 * fade); g.strokeCircle(e.x, e.y, e.r - 8); if (e.aux[1] > 1.5) { g.lineStyle(6, 0xff5a5a, (0.4 + 0.4 * pulse) * fade); g.strokeCircle(e.x, e.y, e.r + 6); } bar(e.x, e.y - 100, 120, e.p, acc); prompt(e.aux[1] > 1.5 ? 'RETURN TO THE RING' : '', e.x, e.y - 118); }
          if (e.st === 'reward') { v.extra?.setVisible(true).setPosition(e.x, e.y - 16 + bob).setAlpha(fade).setDepth(7); glow(e.x, e.y, 46, 0xfff0a8, pulse); ring(e.x, e.y, F.rift.claimR, 0xfff0a8, 0.9); prompt('CLAIM THE SHARD', e.x, e.y - 70); } else v.extra?.setVisible(false);
          break;
        }
        case 'shrine': {
          const ax = [e.x - F.shrine.spread, e.x + F.shrine.spread], pair = e.pair!;
          pos(v.main, e.x, e.y + 20, fade);
          for (let i = 0; i < 2; i++) {
            const b = BARGAINS[pair[i]], chosen = e.took === b.id, dim = e.took && !chosen ? 0.25 : 1;
            glow(ax[i], e.y, F.shrine.altarR, chosen ? 0xff5a8a : acc, (chosen ? 1 : 0.55) * dim * pulse); ring(ax[i], e.y, F.shrine.altarR, i === 0 ? 0xffd86a : 0xff7aa8, 0.9 * dim, 3);
            g.lineStyle(2, 0xffffff, 0.45 * dim * fade); g.strokeCircle(ax[i], e.y, F.shrine.altarR - 9);
            const ch = e.aux[i] / F.shrine.channel; if (e.st === 'idle' && ch > 0) arc(ax[i], e.y, F.shrine.altarR + 9, 0xffffff, ch);
            const L = i === 0 ? v.label : v.label2; L?.setText(b.name.toUpperCase()).setPosition(ax[i], e.y + F.shrine.altarR + 20).setAlpha(dim * fade);
          }
          prompt(e.st === 'idle' ? 'STAND ON AN ALTAR TO ACCEPT' : '', e.x, e.y - 130);
          break;
        }
        case 'cache': {
          const hid = !e.seen, a = hid ? 0.16 + (reduced ? 0 : 0.1 * Math.sin(t * 5)) : 1, shake = e.st === 'active' && !reduced ? Math.sin(t * 60) * 1.5 : 0;
          pos(v.main, e.x + shake, e.y + 18, a * fade); if (v.main && won) v.main.setAlpha(0);
          if (hid) { for (let k = 0; k < 4; k++) { const th = t * 0.9 + k * 1.6, r = 28 + 10 * Math.sin(t * 2 + k); g.fillStyle(acc, (0.25 + 0.25 * Math.sin(t * 3 + k)) * fade); g.fillCircle(e.x + Math.cos(th) * r, e.y - 20 + Math.sin(th) * r * 0.6, 3); } }
          else if (!dead) { glow(e.x, e.y - 24, 48, acc, pulse); ring(e.x, e.y, F.cache.r, acc, 0.5 + 0.3 * pulse, 2); if (e.p > 0 && e.st === 'idle') arc(e.x, e.y, F.cache.r + 8, 0xffffff, e.p); }
          if (e.st === 'active') { g.lineStyle(2, 0xff5a5a, 0.9 * fade); g.strokeCircle(e.x, e.y, F.cache.ambushR); }
          if (won && v.extra) { const u = (s.time - e.ta) / 1.2; v.extra.setVisible(u < 1).setPosition(e.x, e.y - 24).setScale(0.55 + u * 0.5).setAlpha(Math.max(0, 1 - u)).setDepth(7); } else v.extra?.setVisible(false);
          prompt(e.seen && e.st === 'idle' ? (e.aux[0] > 0 ? 'STAY CLOSE. SOMETHING WAITS.' : 'STAY CLOSE TO ATTUNE') : '', e.x, e.y - 100);
          break;
        }
        case 'elite': {
          const c = MOD_COLOR[e.mod!], act = e.st === 'active';
          ring(e.x, e.y, e.r + 10 + (reduced ? 0 : 3 * Math.sin(t * 5)), c, act ? 0.95 : 0.6, 3); g.lineStyle(2, 0xffffff, 0.35 * fade); g.strokeCircle(e.x, e.y, e.r + 20);
          if (e.mod === 'volatile') { g.lineStyle(2, 0xff9a5a, (0.4 + 0.4 * pulse) * fade); for (let k = 0; k < 4; k++) g.beginPath().arc(e.x, e.y, e.r + 30, t * 2 + k * 1.57, t * 2 + k * 1.57 + 0.6).strokePath(); }
          v.crest?.setPosition(e.x, e.y - e.r - 56 + bob).setAlpha(fade).setVisible(!dead);
          v.label?.setText(e.tag.toUpperCase()).setPosition(e.x, e.y - e.r - 82).setAlpha(fade).setVisible(!dead); bar(e.x, e.y - e.r - 36, 70, e.hpMax ? e.hp / e.hpMax : 0, c);
          break;
        }
        case 'relay': {
          const esc = e.type === 'escort', hpP = e.hpMax ? e.hp / e.hpMax : 0;
          pos(v.main, e.x, e.y + (esc ? bob - 10 : 14), fade); glow(e.x, e.y, 54, acc, pulse);
          if (esc) { const bx = e.aux[0], by = e.aux[1]; g.lineStyle(2, acc, 0.45 * fade); for (let k = 0; k < 24; k++) { const u0 = k / 24, u1 = (k + 0.5) / 24; if (k % 2 === 0) g.lineBetween(e.x + (bx - e.x) * u0, e.y + (by - e.y) * u0, e.x + (bx - e.x) * u1, e.y + (by - e.y) * u1); } ring(bx, by, 50, acc, 0.5 + 0.4 * pulse, 3); ring(bx, by, 30, 0xffffff, 0.5, 2); v.extra?.setVisible(true).setPosition(bx, by - 18 + bob).setAlpha(0.8 * fade).setDepth(5.1); }
          else { g.lineStyle(3, acc, (e.st === 'active' ? 0.8 : 0.45) * fade); g.strokeCircle(e.x, e.y, F.relay.near); if (e.st === 'active') arc(e.x, e.y, F.relay.near - 12, 0xffffff, e.p, 4); v.extra?.setVisible(false); }
          if (esc && e.st === 'active') arc(e.x, e.y, 60, 0xffffff, e.p, 4);
          if (e.st !== 'idle') bar(e.x, e.y - 84, 90, hpP, hpP > 0.35 ? 0x5fe88a : 0xff5a5a); else ring(e.x, e.y, 130, acc, 0.5 + 0.3 * pulse, 2);
          v.label?.setText(esc ? 'ESCORT' : 'DEFEND').setPosition(e.x, e.y - 100).setAlpha(fade).setVisible(e.st !== 'idle' && !dead);
          prompt(e.st === 'idle' ? (esc ? 'STAY BESIDE THE BEACON' : 'STAND IN THE RING') : '', e.x, e.y - 110);
          break;
        }
        case 'echo': {
          const hc = HERO_COLOR[e.hero!], open = e.st === 'active';
          pos(v.main, e.x, e.y, (e.st === 'idle' ? 0.9 : 1) * fade); v.main?.setScale(1, 0.78); if (v.main && !reduced) v.main.setAngle(Math.sin(t * 0.5) * 1.5);
          glow(e.x, e.y, 90, hc, open ? pulse : 0.4);
          if (e.st === 'idle') { ring(e.x, e.y, F.echo.enterR, hc, 0.5 + 0.3 * pulse); if (e.p > 0) arc(e.x, e.y, F.echo.enterR + 8, 0xffffff, e.p); prompt('STEP INTO THE SIGIL', e.x, e.y - 140); }
          if (open) {
            g.lineStyle(4, hc, 0.9 * fade); g.strokeCircle(e.x, e.y, e.r); g.lineStyle(2, 0xffffff, 0.3 * fade); g.strokeCircle(e.x, e.y, e.r - 8); bar(e.x, e.y - e.r - 14, 130, e.p, hc);
            const orbX = e.aux[5], orbY = e.aux[6];
            if ((e.hero === 'ren' && e.aux[7] > 0) || (e.hero === 'sora' && e.aux[9] === 1)) { const left = e.hero === 'ren' ? Math.max(0, (e.aux[7] - s.time) / F.echo.ren.orbT) : Math.max(0, (e.aux[7] - s.time) / F.echo.sora.apexT); glow(orbX, orbY, 30, e.hero === 'ren' ? 0xffd86a : 0x9fe8ff, pulse + 0.3); ring(orbX, orbY, 26, 0xffffff, 0.95, 3); arc(orbX, orbY, 36, 0xffffff, left, 4); v.extra?.setVisible(true).setPosition(orbX, orbY - 14 + bob).setAlpha(0.9).setScale(0.3).setDepth(7); }
            else v.extra?.setVisible(false);
            v.label?.setText(BLESSINGS[e.hero!].place.toUpperCase()).setPosition(e.x, e.y + e.r + 22).setAlpha(fade).setVisible(true);
          } else { v.extra?.setVisible(false); v.label?.setVisible(false); }
          break;
        }
      }
      if (dead) { const u = 1 - fade; if (won) { g.lineStyle(5, 0xfff0a8, fade); g.strokeCircle(e.x, e.y, 40 + u * 220); } else { v.main?.setTint(0x777788); } }
      void ELITE_COPY;
    }
    for (const [id, v] of this.vis) if (!live.has(id)) { this.kill(v); this.vis.delete(id); }
  }
  destroy() { for (const v of this.vis.values()) this.kill(v); this.vis.clear(); this.g.destroy(); }
}
