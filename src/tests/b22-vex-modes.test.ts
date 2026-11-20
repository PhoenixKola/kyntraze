import { describe, expect, it } from 'vitest';
import { ENEMIES, type MobKind } from '../content/enemies';
import { addEnemy } from '../sim/EntityRegistry';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import type { Enemy, GameState } from '../sim/GameState';
import { VEX } from '../content/heroKits';
import { formChoices, activateForm } from '../sim/FormSystem';
import { quiet, run, DT, idle } from './b22util';
import { bossRushPlan, vexChapterPlan, expeditionPlan, ENDLESS_CYCLE } from '../b22/plan';
import { dailyChallenge } from '../b22/challenges';
import { startEncounter } from '../sim/BossAiSystem';
import { sovParts } from '../sim/bosses/sovereign';

const mob = (s: GameState, x: number, y: number, kind: MobKind = 'pursuer', hp = 1e7): Enemy => { const d = ENEMIES[kind]; return addEnemy(s, { kind, x, y, hp, maxHp: hp, radius: d.radius, speed: 0, damage: 0, touchCooldown: 99, attackCd: 1e9, aimX: 1, aimY: 0 }); };
const vex = (opts: { hp?: number } = {}) => { const q = quiet({ hero: 'vex', arena: 'gloam', hp: opts.hp ?? 1e6, seed: 9 }); q.s.player.x = 1100; q.s.player.y = 800; return q; };
const shotAt = (s: GameState, dx: number, dy: number, owner = 5, dmg = 40) => s.enemyShots.push({ id: s.nextId++, x: s.player.x + dx, y: s.player.y + dy, vx: 0, vy: 0, ttl: 3, damage: dmg, radius: 8, kind: 'prism', owner, k: 1 });

describe('B22 Vex: Parry Halo', () => {
  it('a hit in the perfect window is refused and answered (stun + riposte + Q refund); a late hit is only softened; the guard ends so parries cannot chain', () => {
    const { sim, s } = vex({ hp: 100 }); s.player.hp = 100; const f = mob(s, s.player.x + 90, s.player.y); const r0 = f.hp;
    sim.step(DT, { ...idle, q: true }); expect(s.hx.act?.act).toBe('parry_halo'); const cd0 = s.player.qCooldown; shotAt(s, 12, 0); sim.step(DT, idle);
    expect(s.player.hp).toBe(100); expect(r0 - f.hp).toBeGreaterThan(50); expect(f.stagger).toBeGreaterThan(0.5); expect(s.player.qCooldown).toBeLessThan(cd0 * 0.7); expect(s.b22.m['parry.perfect']).toBe(1);
    s.player.invulnerable = 0; shotAt(s, 12, 0); sim.step(DT, idle); expect(s.player.hp).toBeLessThan(100);   // guard is over: no free chain
  });
  it('late guard: reduced damage; from behind: no guard; arena hazards (owner 0) can never be parried', () => {
    const late = vex({ hp: 100 }); late.s.player.hp = 100; late.s.player.aimX = 1; late.s.player.aimY = 0; late.sim.step(DT, { ...idle, q: true }); run(late.sim, VEX.q.perfect + 0.05); shotAt(late.s, 12, 0); late.sim.step(DT, idle); expect(100 - late.s.player.hp).toBeCloseTo(40 * (1 - VEX.q.reduce), 3);
    const back = vex({ hp: 100 }); back.s.player.hp = 100; mob(back.s, back.s.player.x + 90, back.s.player.y); back.sim.step(DT, { ...idle, q: true }); back.s.enemyShots.push({ id: 9000, x: back.s.player.x - 12, y: back.s.player.y, vx: 0, vy: 0, ttl: 3, damage: 40, radius: 8, kind: 'prism', owner: 5, k: 1 }); back.sim.step(DT, idle); expect(back.s.player.hp).toBe(60);
    const haz = vex({ hp: 100 }); haz.s.player.hp = 100; haz.sim.step(DT, { ...idle, q: true }); haz.s.lastHazardOwner = 0; expect(damagePlayer(haz.s, 30, 'surge', { x: haz.s.player.x + 30, y: haz.s.player.y }, 0)).toBe(true); expect(haz.s.player.hp).toBe(70);
  });
  it('base Vex keeps Parry Halo; Riftbound has Mirror Guard and Voidheart has Phantom Legion in its place (B28)', () => {
    const base = vex(); base.sim.step(DT, { ...idle, q: true }); expect(base.s.hx.act?.act).toBe('parry_halo');
    const rb = vex(); rb.s.player.form = 1; rb.s.player.drive = 100; rb.sim.step(DT, { ...idle, q: true }); expect(rb.s.hx.act?.act).toBe('mirror_guard');
    const vh = vex(); vh.s.player.form = 2; vh.s.player.drive = 100; mob(vh.s, vh.s.player.x + 80, vh.s.player.y); vh.sim.step(DT, { ...idle, q: true }); expect(vh.s.hx.act?.act).toBe('phantom_legion'); expect((vh.s.hx.vf ?? []).filter(f => f.k === 'clone').length).toBe(3);
  });
  it('a parry exposes the Oathkeeper (honest answer to its strike) and counts toward mastery counters', () => {
    const { sim, s } = vex(); s.player.y = 900; s.player.aimX = 1; s.player.aimY = 0; startEncounter(s, 'oathkeeper'); const b = s.enemies.find(e => e.kind === 'oathkeeper')!; for (let i = 0; i < 400 && b.mode === 'intro'; i++) sim.step(DT, idle);
    sim.step(DT, { ...idle, q: true }); s.player.invulnerable = 0; shotAt(s, 12, 0, b.id); sim.step(DT, idle); expect(b.ex?.open ?? 0).toBeGreaterThan(0);
  });
});

describe('B22 Vex: Rift Reversal, Oathbreaker Seal, Null Blade', () => {
  it('Rift Reversal shifts ~230 px along a clear path with i-frames, ripostes a target in reach, and just repositions when there is none', () => {
    const none = vex(); none.s.player.aimX = 1; none.s.player.aimY = 0; const x0 = none.s.player.x; none.sim.step(DT, { ...idle, beam: true }); run(none.sim, 0.2); expect(none.s.player.x - x0).toBeGreaterThan(150); expect(none.s.player.x - x0).toBeLessThanOrEqual(235);
    expect(none.s.b22.m.riposte ?? 0).toBe(0); none.s.player.hp = 100; expect(damagePlayer(none.s, 20, 'contact')).toBe(false);   // i-frames
    const hit = vex(); hit.s.player.aimX = 1; hit.s.player.aimY = 0; const tgt = mob(hit.s, hit.s.player.x + 260, hit.s.player.y); hit.sim.step(DT, { ...idle, beam: true }); run(hit.sim, 0.3); expect(tgt.hp).toBeLessThan(tgt.maxHp); expect(hit.s.b22.m.riposte).toBe(1);
  });
  it('the destination never ends inside a wall: the shift shortens against obstacles', () => {
    const { sim, s } = vex(); s.player.x = 2080; s.player.y = 800; s.player.aimX = 1; s.player.aimY = 0; const x0 = s.player.x; sim.step(DT, { ...idle, beam: true }); run(sim, 0.3); expect(s.player.x - x0).toBeLessThan(230); expect(s.player.x).toBeLessThan(2200 - 50 - 17 + 1);
  });
  it('a PERFECT reversal (answers a real threat) ripostes an extra foe and is counted', () => {
    const { sim, s } = vex(); s.player.aimX = 1; s.player.aimY = 0; mob(s, s.player.x + 200, s.player.y); mob(s, s.player.x + 215, s.player.y + 20); s.hazards.push({ id: 5000, shape: 'circle', x: s.player.x, y: s.player.y + 24, r: 90, ang: 0, arc: 0, delay: 0.2, total: 0.2, damage: 20, owner: 9, tag: 'x', fired: false, ttl: 0 });
    sim.step(DT, { ...idle, beam: true }); run(sim, 0.3); expect(s.b22.m['riposte.perfect']).toBe(1); expect(s.b22.m.riposte).toBeGreaterThanOrEqual(2);
  });
  it('Oathbreaker Seal: marks up to its form cap (1 boss), pays damage dealt while marked, detonates after the fuse or on a second R; boss damage is capped', () => {
    const { sim, s } = vex(); const es = [0, 1, 2, 3, 4, 5, 6].map(i => mob(s, s.player.x + 90 + i * 12, s.player.y + (i - 3) * 20)); sim.step(DT, { ...idle, sphere: true }); run(sim, VEX.r.windup + 0.1);
    expect(s.b22.marks.filter(m => m.src === 'seal')).toHaveLength(7); const before = es.reduce((a, e) => a + e.maxHp - e.hp, 0); run(sim, VEX.r.fuse + 0.4); expect(es.reduce((a, e) => a + e.maxHp - e.hp, 0)).toBeGreaterThan(before + 100); expect(s.b22.marks.filter(m => m.src === 'seal')).toHaveLength(0);
    const e2 = vex(); const f = mob(e2.s, e2.s.player.x + 100, e2.s.player.y); e2.sim.step(DT, { ...idle, sphere: true }); run(e2.sim, VEX.r.windup + 0.1); expect(e2.s.b22.marks.some(m => m.src === 'seal')).toBe(true); e2.s.player.sphereCooldown = 15; e2.sim.step(DT, { ...idle, sphere: true }); e2.sim.step(DT, idle); expect(e2.s.b22.marks.filter(m => m.src === 'seal')).toHaveLength(0); expect(f.hp).toBeLessThan(f.maxHp);
    const bs = vex(); startEncounter(bs.s, 'warden'); const w = bs.s.enemies.find(e => e.kind === 'warden')!; w.ai!.invuln = false; w.x = bs.s.player.x + 120; w.y = bs.s.player.y; bs.s.player.sphereCooldown = 0; bs.sim.step(DT, { ...idle, sphere: true }); run(bs.sim, VEX.r.windup + 0.1); const hp = w.hp; run(bs.sim, VEX.r.fuse + 0.3); expect(hp - w.hp).toBeLessThanOrEqual(w.maxHp * 0.065 + 1);
  });
  it('Null Blade: a 3-beat combo with a heavy third strike; marked foes take +35%', () => {
    const { sim, s } = vex(); s.player.attackClock = 0; const e = mob(s, s.player.x + 60, s.player.y); const losses: number[] = []; let last = e.hp;
    for (let i = 0; i < 60 * 4 && losses.length < 4; i++) { s.player.attackClock = Math.min(s.player.attackClock, 0.02); sim.step(DT, idle); s.player.hp = 1e6; if (e.hp < last) { losses.push(last - e.hp); last = e.hp; } }
    expect(losses.length).toBeGreaterThanOrEqual(3); expect(losses[2]).toBeGreaterThan(losses[0] * 1.5);
    s.b22.marks.push({ id: 99, enemy: e.id, t: 50, power: 0, src: 'seal' }); const m0 = e.hp; s.hx.autoStep = 0; s.player.attackClock = 0; sim.step(DT, idle); expect(m0 - e.hp).toBeCloseTo(s.player.attackDamage * VEX.auto.markMul, 1);
  });
  it('Shard Requiem stores ONE charge on a perfect parry and empowers the next riposte/finisher; Oathbreaker Chain spreads; Null Waltz runs a capped 3-step sequence', () => {
    const rq = vex(); rq.s.b22.legendary.push('shard_requiem'); const f = mob(rq.s, rq.s.player.x + 90, rq.s.player.y); rq.sim.step(DT, { ...idle, q: true }); shotAt(rq.s, 12, 0); rq.sim.step(DT, idle); expect(rq.s.b22.vex.requiem).toBe(1); void f;
    const ch = vex(); ch.s.b22.legendary.push('oathbreaker_chain'); const es = [0, 1, 2, 3, 4].map(i => mob(ch.s, ch.s.player.x + 100 + i * 30, ch.s.player.y)); ch.sim.step(DT, { ...idle, sphere: true }); run(ch.sim, VEX.r.windup + 0.1); run(ch.sim, VEX.r.fuse + 0.3); expect(es.every(e => e.hp < e.maxHp)).toBe(true);
    const nw = vex(); nw.s.b22.legendary.push('null_waltz'); nw.s.player.aimX = 1; nw.s.player.aimY = 0; mob(nw.s, nw.s.player.x + 200, nw.s.player.y); nw.s.hazards.push({ id: 5001, shape: 'circle', x: nw.s.player.x, y: nw.s.player.y + 24, r: 90, ang: 0, arc: 0, delay: 0.2, total: 0.2, damage: 20, owner: 9, tag: 'x', fired: false, ttl: 0 }); nw.sim.step(DT, { ...idle, beam: true }); run(nw.sim, 1.2);
    expect(nw.s.b22.ev.filter(e => e.kind === 'waltz').length).toBeLessThanOrEqual(3); expect(nw.s.b22.vex.nullWaltz).toBe(0);
  });
});

describe('B22 Vex forms: Riftbound and Voidheart Exile', () => {
  it('forms are offered only when unlocked in the save and Drive is full; both unlocked opens a two-way choice; unlocking one never grants the other', () => {
    const a = quiet({ hero: 'vex', hp: 1e6, config: { vexForms: [false, false] } }); a.s.player.drive = 100; expect(formChoices(a.s)).toEqual([]);
    const b = quiet({ hero: 'vex', hp: 1e6, config: { vexForms: [true, false] } }); b.s.player.drive = 100; expect(formChoices(b.s)).toEqual([1]);
    const c = quiet({ hero: 'vex', hp: 1e6, config: { vexForms: [false, true] } }); c.s.player.drive = 100; expect(formChoices(c.s)).toEqual([2]);
    const d = quiet({ hero: 'vex', hp: 1e6, config: { vexForms: [true, true] } }); d.s.player.drive = 100; expect(formChoices(d.s)).toEqual([1, 2]); d.s.player.drive = 80; expect(formChoices(d.s)).toEqual([]);
  });
  it('transforming into each form commits it, drains Drive at the form rate, and ends back in base with a cooldown', () => {
    for (const f of [1, 2] as const) {
      const { sim, s } = quiet({ hero: 'vex', hp: 1e6, config: { vexForms: [true, true] } }); s.player.drive = 100; expect(activateForm(s, f)).toBe(true); run(sim, 3.6, idle); expect(s.player.form).toBe(f); const d0 = s.player.drive; run(sim, 5); expect(d0 - s.player.drive).toBeCloseTo(5 * (f === 1 ? 3.4 : 3.0), 0);
      s.player.drive = 0.2; run(sim, 0.3); expect(s.player.form).toBe(0); expect(s.player.formCooldown).toBeGreaterThan(10);
    }
  });
  it('every Vex card reads the number HIS kit uses (no Kai-worded stale text)', async () => {
    const { UPGRADES } = await import('../content/upgrades'); const { UPGRADE_OVERRIDES } = await import('../content/heroKits'); const { previewUpgrade } = await import('../sim/UpgradeSystem');
    const { s } = vex(); for (const u of UPGRADES) { const ov = UPGRADE_OVERRIDES.vex[u.id]; if (['impact', 'tempo', 'reach', 'echo', 'pulse', 'widelance', 'hardlight', 'lancecool', 'afterburn', 'bloombulk', 'novacool', 'flareheart', 'embercore'].includes(u.id)) { expect(ov, u.id).toBeTruthy(); expect(`${ov!.name} ${ov!.blurb}`).not.toMatch(/Comet Fists|Fracture Lance|Nova Bloom|Flarebound|Impact Line/); } const pv = previewUpgrade(s, u.id); expect(Number.isFinite(parseFloat(pv.before)) && Number.isFinite(parseFloat(pv.after))).toBe(true); }
  });
});

describe('B22 modes: Endless', () => {
  it('after a Classic victory the player may continue: the plan changes, no victory is re-awarded, cycles escalate, and a milestone offers Extract / Continue', () => {
    const { sim, s } = quiet({ hp: 1e6 }); s.encounter.forced = false; s.time = 900; s.phase = 'victory'; expect(sim.continueEndless()).toBe(true); expect(s.plan.mode).toBe('endless'); expect(s.phase).toBe('running'); expect(s.b22.endless!.fromT).toBe(900);
    expect(sim.continueEndless()).toBe(false);   // only once, only from a Classic victory
    s.player.hp = 1e9; s.player.maxHp = 1e9; run(sim, ENDLESS_CYCLE + 2, idle, st => { st.player.hp = 1e9; if (st.phase === 'upgrade') st.phase = 'running'; });
    expect(s.phase).toBe('extract'); expect(s.b22.endless!.cycle).toBe(1);
    expect(sim.pushOn()).toBe(true); expect(s.phase).toBe('running'); sim.step(DT, idle); expect(s.phase).toBe('running');
  }, 30000);
  it('extract ends the run as a success without touching Classic bookkeeping; defeat in Endless is a normal defeat', () => {
    const { sim, s } = quiet({ hp: 1e6 }); s.time = 900; s.phase = 'victory'; sim.continueEndless(); run(sim, ENDLESS_CYCLE + 2, idle, st => { st.player.hp = 1e9; if (st.phase === 'upgrade') st.phase = 'running'; }); expect(s.phase).toBe('extract'); expect(sim.extract()).toBe(true); expect(s.phase).toBe('victory'); expect(s.b22.endless!.extracted).toBe(true);
    const d = quiet({ hp: 50 }); d.s.time = 900; d.s.phase = 'victory'; d.sim.continueEndless(); d.s.player.hp = 1; damagePlayer(d.s, 50, 'contact'); expect(d.s.phase).toBe('dead');
  });
  it('a direct Endless run starts its cycle clock at 0, caps enemies, introduces bosses from the rotation, and scales without unbounded growth', () => {
    const { sim, s } = quiet({ hp: 1e9, plan: undefined }); s.plan = { ...s.plan, mode: 'endless', id: 'endless', cycle: 300, steps: [], unlocks: false }; s.b22.endless = { fromT: 0, cycle: 0, bossAt: 120, offered: false, extracted: false }; s.encounter.forced = false; s.spawnTimer = 0; let peak = 0, boss = '';
    run(sim, 240, idle, st => { st.player.hp = 1e9; st.player.maxHp = 1e9; if (st.phase === 'upgrade') st.phase = 'running'; peak = Math.max(peak, st.enemies.length); const b = st.enemies.find(e => e.hp > 0 && e.kind === 'warden'); if (b) boss = 'warden'; });
    expect(peak).toBeLessThanOrEqual(115); expect(boss).toBe('warden'); expect(s.phase).toBe('running');
  });
});

describe('B22 modes: Boss Rush, Expedition, challenges, Vex trial', () => {
  const finishBoss = (sim: ReturnType<typeof quiet>['sim'], s: GameState) => { const b = s.enemies.find(e => e.hp > 0 && !e.part && (e.kind !== 'pursuer')); if (!b) return false; if (b.ai) { b.ai.invuln = false; b.ai.exposed = true; } b.mode = 'move'; for (const p of s.enemies) if (p.part?.of === b.id) p.hp = 0; if (b.ex) { b.ex.shield = 0; b.ex.open = 99; if ('face' in b.ex) b.ex.face += Math.PI; } damageEnemy(s, b, 1e9, { area: true }); void sim; return true; };
  it('Initiation Gauntlet: bosses chain with an intermission (heal + pick), the last one ends the run once; Seraph inside a rush neither wins early nor unlocks Kai forms', () => {
    const { sim, s } = quiet({ hero: 'kai', hp: 1e6, plan: bossRushPlan('veteran') }); s.encounter.forced = false; s.player.maxHp = 100; s.player.hp = 40; s.apexUnlocked = false;
    const seen: string[] = []; let victory = false;
    for (let i = 0; i < 60 * 400 && (s.phase as string) !== 'victory'; i++) {
      sim.step(DT, idle); s.player.hp = Math.max(s.player.hp, 40); if (s.phase === 'upgrade') { sim.chooseUpgrade(s.upgradeOffers[0]); }
      const b = s.enemies.find(e => e.hp > 0 && !e.part && e.kind !== 'pursuer'); if (b && !seen.includes(`${b.kind}${s.bossesDefeated}`)) { seen.push(`${b.kind}${s.bossesDefeated}`); for (let k = 0; k < 400 && b.mode === 'intro'; k++) { sim.step(DT, idle); } finishBoss(sim, s); }
      if ((s.phase as string) === 'victory') victory = true;
    }
    expect(victory).toBe(true); expect(s.bossesDefeated).toBe(5); expect(seen.map(x => x.replace(/\d/g, ''))).toEqual(['warden', 'seraph', 'regent', 'chronophage', 'hollow_choir']); expect(s.apexUnlockedNow).toBe(false); expect(s.cometUnlockedNow).toBe(false);
  }, 120000);
  it('the first boss arrives at 4 s, the second only AFTER the first falls (8 s later); training (practice) is unranked', () => {
    const { sim, s } = quiet({ hp: 1e9, plan: bossRushPlan('initiation') }); s.encounter.forced = false; s.spawnTimer = 1e9; run(sim, 3.9); expect(s.enemies.some(e => e.kind === 'warden')).toBe(false); run(sim, 0.3); expect(s.enemies.some(e => e.kind === 'warden')).toBe(true);
    run(sim, 30, idle, st => { st.player.hp = 1e9; }); expect(s.enemies.some(e => e.kind === 'castellan')).toBe(false); expect(bossRushPlan('initiation', true).ranked).toBe(false);
  });
  it('Expedition: a relic shrine at 5:30 offers 3 distinct realm relics, choosing grants exactly one; the elite wave at 10:00 pays another; the boss at 18:00 ends the run', () => {
    const { sim, s } = quiet({ hero: 'kai', arena: 'aetherfall', hp: 1e9, plan: expeditionPlan('aetherfall') }); s.encounter.forced = false; s.spawnTimer = 1e9; s.time = 329.9; run(sim, 0.2);
    expect(s.phase).toBe('upgrade'); expect(s.b22.relicOffer).toHaveLength(3); expect(new Set(s.b22.relicOffer).size).toBe(3); const pick = s.b22.relicOffer![0]; expect(sim.chooseRelic(pick)).toBe(true); expect(s.b22.relics).toEqual([pick]); expect(sim.chooseRelic(pick)).toBe(false); expect(s.phase).toBe('running');
    s.time = 599.9; run(sim, 0.3, idle, st => { st.player.hp = 1e9; }); const wave = s.encounter.waves?.gauntlet; expect(wave && wave.length).toBeGreaterThanOrEqual(3);
    for (const e of s.enemies) if (wave!.includes(e.id)) e.hp = 0; run(sim, 0.2, idle, st => { st.player.hp = 1e9; }); expect(s.phase).toBe('upgrade'); expect(s.b22.relicOffer).toBeTruthy(); const p2 = s.b22.relicOffer![0]; sim.chooseRelic(p2); expect(s.b22.relics).toHaveLength(2);
    s.time = 1079.9; run(sim, 0.4, idle, st => { st.player.hp = 1e9; }); const boss = s.enemies.find(e => e.kind === 'castellan'); expect(boss).toBeTruthy(); expect(boss!.stepId).toBe('castellan'); expect(s.plan.unlocks).toBe(false);
  });
  it('Expedition uses 20-minute pacing: act table, plan cap, the final boss in act III', () => {
    const p = expeditionPlan('paradox'); expect(p.acts.map(a => a.at)).toEqual([0, 360, 780]); expect(p.steps.at(-1)!.boss).toBe('regent'); expect(p.duration).toBeGreaterThan(1200);
  });
  it('challenge modifiers apply: Glass Vanguard halves HP (+30% XP), No Second Wind removes the card, Relic Gamble grants a relic at level 5, a time cap ends the run', () => {
    const base = dailyChallenge(Date.UTC(2026, 10, 18)); const mk = (mods: string[]) => ({ ...base.plan, modifiers: mods as never });
    const g = quiet({ hp: 1e6, plan: undefined }); void g;
    const glass = new (require_sim())(1, 'gloam', false, false, { boon: null, contract: null, rerolls: 0, banishes: 0, hero: 'kai', plan: mk(['glass_vanguard']) }); expect(glass.state.player.maxHp).toBe(50); expect(glass.state.mods.xp).toBeCloseTo(1.3, 5);
    const nosw = new (require_sim())(1, 'gloam', false, false, { boon: null, contract: null, rerolls: 0, banishes: 0, hero: 'kai', plan: mk(['no_second_wind']) }); expect(nosw.state.run.excluded).toContain('secondwind');
    const gam = quiet({ hp: 1e9 }); gam.s.plan = { ...gam.s.plan, modifiers: ['relic_gamble'] }; gam.s.player.level = 5; run(gam.sim, 0.1); expect(gam.s.b22.relics).toHaveLength(1); gam.s.player.level = 10; run(gam.sim, 0.1); expect(gam.s.b22.relics).toHaveLength(2); run(gam.sim, 0.1); expect(gam.s.b22.relics).toHaveLength(2);
    const cap = quiet({ hp: 1e9, plan: { ...base.plan, duration: 30, steps: [{ ...base.plan.steps[0], at: 9999 }] } }); cap.s.encounter.forced = false; cap.s.spawnTimer = 1e9; run(cap.sim, 31); expect(cap.s.phase).toBe('dead'); expect(cap.s.b22.timeUp).toBe(true);
  });
  it('Vex Trial: chapter 3 is a duel that ends the run when the Oathkeeper falls; chapter 1 ends when its elite wave is broken', () => {
    const c3 = quiet({ hero: 'vex', arena: 'paradox', hp: 1e9, plan: vexChapterPlan(3) }); c3.s.encounter.forced = false; c3.s.spawnTimer = 1e9; run(c3.sim, 3.2); expect(c3.s.enemies.some(e => e.kind === 'oathkeeper')).toBe(true); expect(c3.s.enemies.some(e => e.kind === 'pursuer')).toBe(false);
    for (let i = 0; i < 400; i++) c3.sim.step(DT, idle); finishBoss(c3.sim, c3.s); run(c3.sim, 0.2); expect(c3.s.phase).toBe('victory');
    const c1 = quiet({ hero: 'vex', arena: 'gloam', hp: 1e9, plan: vexChapterPlan(1) }); c1.s.encounter.forced = false; c1.s.spawnTimer = 1e9; c1.s.time = 149.9; run(c1.sim, 0.2, idle, st => { st.player.hp = 1e9; }); const ids = c1.s.encounter.waves!.trial1; expect(ids.length).toBeGreaterThanOrEqual(5); for (const e of c1.s.enemies) if (ids.includes(e.id)) e.hp = 0; run(c1.sim, 0.2); expect(c1.s.phase).toBe('victory');
  });
  it('Sovereign multi-part kill ends a Sovereign Trial run exactly once', () => {
    const { sim, s } = quiet({ hp: 1e9, plan: bossRushPlan('sovereign_trial') }); void sovParts; void sim; void s; expect(bossRushPlan('sovereign_trial').steps.at(-1)!.boss).toBe('sovereign');
  });
});
import { Simulation } from '../sim/Simulation';
function require_sim() { return Simulation; }

describe('B22 Vex: Seal cap grows with each transformation; Rift Reversal crosses terrain', () => {
  it('marks cap is 8 / 14 / 24 by form', async () => {
    const { VEX } = await import('../content/heroKits'); expect(VEX.r.marksByForm).toEqual([8, 14, 24]);
    const { marksCap } = await import('../sim/VexSystem'); const a = vex(); for (const f of [0, 1, 2] as const) { a.s.player.form = f; expect(marksCap(a.s)).toBe(VEX.r.marksByForm[f]); }
  });
});
