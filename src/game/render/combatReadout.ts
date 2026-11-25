import Phaser from 'phaser';
import type { GameState, Enemy } from '../../sim/GameState';
import { ENEMIES, isBoss } from '../../content/enemies';

/** B30: combat readability. Small health bars over enemies (always for elites and bosses, for ordinary enemies only while they are hurt and recently engaged) and floating damage numbers (white = hit, gold = heavy hit, steel = reduced by a shield, bigger on kills). Pooled and capped, driven only by the sim's own 'hit' / 'block' impacts, so it never affects gameplay. */
const MAX_NUMBERS = 36, MAX_BARS = 70, BAR_FADE_AFTER = 2.6, NUM_LIFE = 0.78;
interface Num { t: Phaser.GameObjects.Text; age: number; x: number; y: number; vx: number; eid: number; pri: number; sum: number; big: number }
const hash = (n: number) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; return ((x >>> 0) % 1000) / 1000; };
export class CombatReadout {
  private readonly bars: Phaser.GameObjects.Graphics; private readonly nums: Num[] = []; private readonly live = new Map<number, Num>(); private readonly lastHit = new Map<number, number>(); private readonly shown = new Map<number, number>(); private lastImpact = 0; private clock = 0;
  constructor(scene: Phaser.Scene) {
    this.bars = scene.add.graphics().setDepth(11.8);
    for (let i = 0; i < MAX_NUMBERS; i++) this.nums.push({ t: scene.add.text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#ffffff', stroke: '#06101a', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(12).setVisible(false), age: 99, x: 0, y: 0, vx: 0, eid: -1, pri: 0, sum: 0, big: 1 });
  }
  private spawn(eid: number, x: number, y: number, dmg: number, heavy: boolean, block: boolean, kill: boolean, boss: boolean, reduced: boolean) {
    const pri = (kill ? 3 : heavy ? 2 : block ? 0 : 1) + (boss ? 1 : 0), cur = this.live.get(eid);
    if (cur && cur.age < 0.14 && cur.eid === eid) { cur.sum += dmg; cur.pri = Math.max(cur.pri, pri); this.style(cur, heavy || cur.big > 1.1, block, kill, boss); cur.t.setText(String(cur.sum)); return; }   // rapid hits on one enemy add up instead of stacking
    let slot = this.nums.find(n => n.age >= NUM_LIFE);
    if (!slot) { slot = this.nums.reduce((a, b) => (b.pri < a.pri || (b.pri === a.pri && b.age > a.age) ? b : a)); if (slot.pri > pri) return; }
    slot.age = 0; slot.eid = eid; slot.sum = dmg; slot.pri = pri; slot.x = x + (hash(eid * 7 + dmg) - 0.5) * 18; slot.y = y; slot.vx = (hash(eid + dmg * 3) - 0.5) * 22 * (reduced ? 0 : 1); slot.big = 1;
    this.style(slot, heavy, block, kill, boss); slot.t.setText(String(dmg)).setVisible(true); this.live.set(eid, slot);
  }
  private style(n: Num, heavy: boolean, block: boolean, kill: boolean, boss: boolean) {
    n.big = kill ? 1.35 : heavy ? 1.2 : block ? 0.9 : 1;
    n.t.setColor(block ? '#a9c8ee' : kill ? '#ffe9a8' : heavy ? '#ffcf5a' : boss ? '#ffd9c8' : '#ffffff').setStroke(block ? '#0a1626' : heavy || kill ? '#3a1d00' : '#06101a', 3).setFontSize(`${Math.round(14 * n.big)}px`);
  }
  update(s: GameState, dtSec: number, reduced: boolean) {
    this.clock += dtSec;
    for (const im of s.impacts) {   // impacts live a few frames, so the id gate reads each exactly once
      if (im.id <= this.lastImpact) continue; this.lastImpact = Math.max(this.lastImpact, im.id);
      if ((im.kind !== 'hit' && im.kind !== 'block') || !im.dmg || im.eid === undefined) continue;
      this.lastHit.set(im.eid, this.clock); this.spawn(im.eid, im.x, im.y - 26, im.dmg, !!im.heavy, im.kind === 'block', !!im.kill, !!im.boss, reduced);
    }
    for (const n of this.nums) {
      if (n.age >= NUM_LIFE) { if (n.t.visible) { n.t.setVisible(false); if (this.live.get(n.eid) === n) this.live.delete(n.eid); } continue; }
      n.age += dtSec; const u = Math.min(1, n.age / NUM_LIFE), rise = 1 - (1 - u) ** 3, pop = u < 0.16 ? 1.5 - 2.9 * u : 1;
      n.t.setPosition(Math.round(n.x + n.vx * rise), Math.round(n.y - 30 * rise)).setScale(pop * (reduced ? 1 : 1)).setAlpha(u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
    }
    const g = this.bars; g.clear(); let drawn = 0; const p = s.player;
    const list: Enemy[] = []; for (const e of s.enemies) { if (e.hp <= 0 || e.hp >= e.maxHp && !this.elite(e)) continue; list.push(e); }
    list.sort((a, b) => (a.x - p.x) ** 2 + (a.y - p.y) ** 2 - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2));
    for (const e of list) {
      if (drawn >= MAX_BARS) break; const boss = isBoss(e.kind) && !e.part, elite = !boss && this.elite(e), lh = this.lastHit.get(e.id);
      let a = 1; if (!elite && !boss) { if (lh === undefined) continue; const idle = this.clock - lh; if (idle > BAR_FADE_AFTER) continue; a = idle > BAR_FADE_AFTER - 0.6 ? (BAR_FADE_AFTER - idle) / 0.6 : 1; }
      const w = boss ? 76 : elite ? 40 : 26, h = boss ? 6 : elite ? 5 : 3, x = Math.round(e.x - w / 2), y = Math.round(e.y - e.radius * 2.15 - (boss ? 24 : 10)), f = Math.max(0, Math.min(1, e.hp / e.maxHp));
      const prev = this.shown.get(e.id) ?? f, cur = prev + (f - prev) * Math.min(1, dtSec * 12); this.shown.set(e.id, cur);
      g.fillStyle(0x05090f, 0.78 * a).fillRect(x - 1, y - 1, w + 2, h + 2);
      if (cur > f) g.fillStyle(0xffffff, 0.55 * a).fillRect(x, y, Math.max(1, Math.round(w * cur)), h);   // the chunk you just took drains out white
      g.fillStyle(boss ? 0xff5d6a : elite ? 0xffc65a : f < 0.3 ? 0xff6a4a : 0xe4506a, a).fillRect(x, y, Math.max(1, Math.round(w * f)), h);
      if (elite || boss) { g.lineStyle(1, boss ? 0xff9aa2 : 0xffe2a0, 0.9 * a).strokeRect(x - 1.5, y - 1.5, w + 3, h + 3); }
      drawn++;
    }
    if (this.shown.size > 400) for (const id of [...this.shown.keys()]) if (!s.enemies.some(e => e.id === id)) { this.shown.delete(id); this.lastHit.delete(id); }
  }
  private elite(e: Enemy) { return !isBoss(e.kind) && !!(ENEMIES as Record<string, { elite?: boolean }>)[e.kind]?.elite || (isBoss(e.kind) && !e.part); }
  destroy() { this.bars.destroy(); for (const n of this.nums) n.t.destroy(); this.live.clear(); }
}
