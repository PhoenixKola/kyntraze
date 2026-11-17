import { resolvePick } from './b22util';
import { describe, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import type { InputState } from '../sim/GameState';
import type { HeroId } from '../content/heroes';
import type { ArenaId } from '../content/arenas';
import { SeededRng } from '../core/SeededRng';

/** B20 balance probe. NOT a player: one shared, mortal kiting policy for every hero (no god HP). Run with  BALANCE=1 npx vitest run src/tests/balance.bot.test.ts  Results are relative evidence only. */
const RUN = !!process.env.BALANCE;
const DT = 1 / 60;
type Policy = 'kite' | 'strafe';
function play(hero: HeroId, arena: ArenaId, seed: number, formUnlocked: boolean, policy: Policy = 'kite') {
  const sim = new Simulation(seed, arena, false, false, { ...NO_CONFIG, hero, heroForm: formUnlocked }), s = sim.state, pick = new SeededRng(seed ^ 0x9e37);
  let heldFor = 0, form = 0, dmgTaken = 0, prevHp = s.player.hp, lastDash = -9;
  for (let i = 0; i < 60 * 1100 && s.phase !== 'victory' && s.phase !== 'dead' && s.player.hp > 0; i++) {
    if (s.phase === 'upgrade') { if (s.b22.branchOffer || s.b22.relicOffer || !s.upgradeOffers.length) resolvePick(sim); else sim.chooseUpgrade(s.upgradeOffers[Math.floor(pick.next() * s.upgradeOffers.length)]); continue; }
    const p = s.player; let fx = 0, fy = 0, near = 1e9, nx = 0, ny = 0, close = 0, mid = 0;
    for (const e of s.enemies) { if (e.hp <= 0) continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; if (d < near) { near = d; nx = dx / d; ny = dy / d; } if (d < 150) { close++; fx -= dx / d * (150 - d) / 150; fy -= dy / d * (150 - d) / 150; } if (d < 320) mid++; }
    const want = Math.max(60, p.attackRange * 0.8); let mx = 0, my = 0;
    if (close >= 2 || (close === 1 && near < 70)) { mx = fx; my = fy; } else if (near < 1e9) { const k = near > want ? 1 : -0.4; mx = nx * k; my = ny * k; }
    if (policy === 'strafe' && near < 1e9) { const rad = near > want ? 1 : -0.6, side = ((Math.floor(s.time / 2.5) + seed) % 2 ? 1 : -1); mx = nx * rad - ny * side * 0.9 + fx * 0.6; my = ny * rad + nx * side * 0.9 + fy * 0.6; }
    const m = Math.hypot(mx, my) || 1; const t = s.time;
    const dash = close >= 3 && p.hp < p.maxHp * 0.6 && t - lastDash > 3; if (dash) lastDash = t;
    if (heldFor > 0) heldFor--; else if (mid >= 2 && p.beamCooldown <= 0 && !s.hx.act) heldFor = 40;
    const input: InputState = { x: mx / m, y: my / m, dash, q: mid >= 2 && p.qCooldown <= 0, f: p.drive >= 70 && !p.form, beam: false, beamHeld: heldFor > 0, sphere: mid >= 4 && p.sphereCooldown <= 0, selConfirm: s.selector.open };
    sim.step(DT, input);
    if (p.hp < prevHp) dmgTaken += prevHp - p.hp; prevHp = p.hp; if (p.form) form++;
  }
  return { t: s.time, win: s.phase === 'victory', lvl: s.player.level, kills: s.kills, dmgTaken: Math.round(dmgTaken), formSec: Math.round(form / 60) };
}
describe.skipIf(!RUN)('B20 balance probe (mortal bot, relative)', () => {
  it('survival by hero x arena x seed', () => {
    const rows: string[] = []; const avg: Record<string, number[]> = {};
    for (const policy of ['kite', 'strafe'] as Policy[]) for (const hero of ['kai', 'ren', 'sora'] as HeroId[]) for (const arena of ['gloam', 'ashen'] as ArenaId[]) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const r = play(hero, arena, seed, true, policy); (avg[`${policy} ${hero}/${arena}`] ??= []).push(r.t);
      rows.push(`${policy} ${hero} ${arena} seed${seed}: ${r.win ? 'WIN ' : 'died'} ${(r.t / 60).toFixed(1)} min  lvl ${r.lvl}  kills ${r.kills}  dmg ${r.dmgTaken}  formSec ${r.formSec}`);
    }
    console.log(rows.join('\n')); for (const [k, v] of Object.entries(avg)) console.log(`AVG ${k}: ${(v.reduce((a, b) => a + b, 0) / v.length / 60).toFixed(2)} min (min ${(Math.min(...v) / 60).toFixed(1)}, max ${(Math.max(...v) / 60).toFixed(1)})`);
  }, 900000);
});
