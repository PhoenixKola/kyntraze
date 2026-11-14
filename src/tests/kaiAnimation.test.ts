import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GameBridge } from '../bridge/GameBridge';
import { DEATH_RESULTS_HOLD_SECONDS, KAI_CLIPS, KAI_DIRS, KaiAnimator, clipFrame, SIM_DASH_SECONDS, facingFromInput, facingFromVector, parseKaiManifest, type AnimFrameInput, type Facing, type KaiManifests } from '../assets/kaiAnimation';

const pub = (...p: string[]) => join(__dirname, '..', '..', 'public', 'art', 'kai', ...p);
const manifests = Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(JSON.parse(readFileSync(pub(d, 'manifest.json'), 'utf8')), d)])) as KaiManifests;
const pngSize = (file: string) => { const b = readFileSync(file); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const idle: AnimFrameInput = { dt: 1 / 60, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0,
  attackClock: 1, hasTarget: false, targetDx: 0, targetDy: 0, shot: null };

describe('Kai manifests', () => {
  for (const dir of KAI_DIRS) it(`${dir}: sheets match the manifest frame size, counts and the agreed clip contract`, () => {
    const m = manifests[dir];
    expect([m.animations.Idle.frames, m.animations.Idle.fps, m.animations.Idle.loop]).toEqual([16, 10, true]);
    expect([m.animations.Run.frames, m.animations.Run.fps, m.animations.Run.loop]).toEqual([8, 14, true]);
    expect([m.animations.BasicPunch.frames, m.animations.BasicPunch.fps, m.animations.BasicPunch.loop, m.animations.BasicPunch.events.impact]).toEqual([14, 16, false, 5]);
    for (const clip of KAI_CLIPS) {
      const a = m.animations[clip];
      const f = clipFrame(m, clip); expect(pngSize(pub(dir, a.sheet))).toEqual({ w: f.w * a.frames, h: f.h });
      expect(f.ox).toBeLessThan(f.w); expect(f.oy).toBeLessThanOrEqual(f.h);
    }
    expect([m.animations.Dash.frames, m.animations.Dash.loop, m.animations.Dash.events.recover_start]).toEqual([10, false, 7]);
    expect([m.animations.Hurt.frames, m.animations.Hurt.loop]).toEqual([8, false]);
    expect([m.animations.Death.frames, m.animations.Death.loop, m.animations.Death.terminal]).toEqual([18, false, 'hold_last_frame']);
    expect(m.origin_px[0]).toBeLessThan(m.frame_width); expect(m.origin_px[1]).toBeLessThan(m.frame_height);
  });
  it('rejects a manifest for the wrong direction or with baked root motion', () => {
    expect(() => parseKaiManifest(manifests.north, 'south')).toThrow();
    expect(() => parseKaiManifest({ ...manifests.east, root_motion: { baked: true } }, 'east')).toThrow();
  });
  it('canvas sizes really differ per direction (loader must not share dimensions)', () => {
    expect(new Set(KAI_DIRS.map(d => `${manifests[d].frame_width}x${manifests[d].frame_height}`)).size).toBe(4);
  });
});

describe('facing rules', () => {
  it('cardinals map to the matching authored side', () => {
    expect([facingFromInput('south', 1, 0), facingFromInput('south', -1, 0), facingFromInput('east', 0, -1), facingFromInput('east', 0, 1)]).toEqual(['east', 'west', 'north', 'south']);
  });
  it('diagonals are deterministic and sticky: keep the current facing if it is one of the pressed axes, else prefer horizontal', () => {
    expect(facingFromInput('east', 1, -1)).toBe('east'); expect(facingFromInput('north', 1, -1)).toBe('north');
    expect(facingFromInput('south', 1, -1)).toBe('east'); expect(facingFromInput('west', 1, -1)).toBe('east');
    let f: Facing = 'east'; for (let i = 0; i < 50; i++) f = facingFromInput(f, 1, 1); expect(f).toBe('east');
  });
  it('releasing keys keeps the last facing', () => expect(facingFromInput('north', 0, 0)).toBe('north'));
  it('target facing has hysteresis around the 45 degree line', () => {
    expect(facingFromVector('east', 100, 90)).toBe('east'); expect(facingFromVector('south', 100, 90)).toBe('south');
    expect(facingFromVector('east', 10, -100)).toBe('north');
  });
});

describe('KaiAnimator', () => {
  it('runs while moving, idles when stopped, and keeps the Run phase when only the direction changes', () => {
    const a = new KaiAnimator(manifests); const run = { ...idle, moving: true, inputX: 1 };
    for (let i = 0; i < 20; i++) a.update(run, 0.55);
    const east = a.pose(); expect([east.clip, east.facing]).toEqual(['Run', 'east']);
    const turned = a.update({ ...run, inputX: 0, inputY: -1 }, 0.55);
    expect([turned.clip, turned.facing]).toEqual(['Run', 'north']);
    expect(Math.abs(turned.frame - east.frame) % 8).toBeLessThanOrEqual(1);
    expect(a.update(idle, 0.55)).toMatchObject({ clip: 'Idle', facing: 'north', frame: 0 });
  });
  it('B03G Dash: follows the sim dash (anticipation to travel to recovery), then returns to Run/Idle', () => {
    const a = new KaiAnimator(manifests); const frames: number[] = []; let rem = SIM_DASH_SECONDS;
    for (let i = 0; i < 40; i++) {
      const dashing = rem > 0; const p = a.update({ ...idle, moving: dashing, inputX: 1, dashing, dashX: 1, dashRemaining: Math.max(0, rem) }, 0.55); rem -= 1 / 60;
      if (p.clip === 'Dash') frames.push(p.frame);
    }
    expect(frames[0]).toBe(0); expect(frames.slice().sort((x, y) => x - y)).toEqual(frames);
    expect(Math.max(...frames)).toBeGreaterThanOrEqual(8); expect(frames.filter(f => f < 7).length).toBeGreaterThanOrEqual(10);
    expect(a.pose().clip).toBe('Idle');
    const b = new KaiAnimator(manifests); b.update({ ...idle, dashing: true, dashX: -1, dashRemaining: 0.2 }, 0.55); expect(b.pose().facing).toBe('west');
  });
  it('B03G priority: Hurt/Dash never start a punch; Hurt cancels a punch; Death beats everything', () => {
    const target = { ...idle, attackClock: 0.02, hasTarget: true, targetDx: 80 };
    const h = new KaiAnimator(manifests); h.update({ ...target, hurt: true }, 0.55);
    for (let i = 0; i < 6; i++) expect(h.update({ ...target }, 0.55).clip).toBe('Hurt');
    const d = new KaiAnimator(manifests); expect(d.update({ ...target, dashing: true, dashX: 1, dashRemaining: 0.2 }, 0.55).clip).toBe('Dash');
    const p = new KaiAnimator(manifests); for (let i = 0; i < 4; i++) p.update(target, 0.55); expect(p.pose().clip).toBe('BasicPunch');
    expect(p.update({ ...target, hurt: true }, 0.55).clip).toBe('Hurt');
    const k = new KaiAnimator(manifests); k.update({ ...target, hurt: true }, 0.55); expect(k.update({ ...target, alive: false }, 0.55).clip).toBe('Death');
  });
  it('B03G Hurt: plays once, is retriggerable, and a moving player is released after the interruptible frame', () => {
    const a = new KaiAnimator(manifests); a.update({ ...idle, hurt: true }, 0.55); const seen: number[] = [];
    for (let i = 0; i < 40; i++) { const p = a.update(idle, 0.55); if (p.clip === 'Hurt') seen.push(p.frame); }
    expect(seen.length).toBeGreaterThan(0); expect(Math.max(...seen)).toBeLessThanOrEqual(7); expect(a.pose().clip).toBe('Idle');
    a.update({ ...idle, hurt: true }, 0.55); expect(a.pose()).toMatchObject({ clip: 'Hurt', frame: 0 });
    const m = new KaiAnimator(manifests); m.update({ ...idle, hurt: true, moving: true, inputX: 1 }, 0.55); let frames = 0;
    for (let i = 0; i < 60 && m.pose().clip === 'Hurt'; i++, frames++) m.update({ ...idle, moving: true, inputX: 1 }, 0.55);
    expect(frames).toBeLessThanOrEqual(16); expect(m.pose().clip).toBe('Run');
  });
  it('B03G Death: plays once to the last frame, holds, never loops or returns to Idle, and resets for a new run', () => {
    const a = new KaiAnimator(manifests); const dead = { ...idle, alive: false }; const seq: number[] = [];
    for (let i = 0; i < 300; i++) { const p = a.update(dead, 0.55); expect(p.clip).toBe('Death'); seq.push(p.frame); }
    expect(seq[0]).toBe(0); expect(seq.slice().sort((x, y) => x - y)).toEqual(seq); expect(seq[seq.length - 1]).toBe(17); expect(seq.filter(f => f === 17).length).toBeGreaterThan(100);
    const frozen = a.update({ ...dead, dt: 0 }, 0.55).frame; expect(frozen).toBe(17);
    expect(a.update({ ...idle, hurt: true }, 0.55).clip).toBe('Hurt');
    const b = new KaiAnimator(manifests); b.update(dead, 0.55); expect(b.update(idle, 0.55)).toMatchObject({ clip: 'Idle', frame: 0 });
  });
  it('B03G: every direction maps every new clip to its own sheet frame', () => {
    for (const dir of KAI_DIRS) { const a = new KaiAnimator(manifests); a.facing = dir; expect(a.update({ ...idle, alive: false }, 0.55)).toMatchObject({ facing: dir, clip: 'Death', frame: 0 }); }
  });
  it('predicted punch lands its impact frame (5) on the sim weapon tick, with one punch per shot', () => {
    for (const period of [0.55, 0.41, 0.3]) {
      const a = new KaiAnimator(manifests); let clock = period; let impactFrameAtShot = -1; let started = 0; let prev = 'Idle'; let shots = 0;
      for (let step = 0; step < 600; step++) {
        const dt = 1 / 60; clock -= dt; let shot: AnimFrameInput['shot'] = null;
        if (clock <= 0) { clock += period; shot = { dx: 100, dy: 0 }; shots++; }
        const pose = a.update({ ...idle, dt, attackClock: clock, hasTarget: true, targetDx: 100, shot }, period);
        if (pose.clip === 'BasicPunch' && prev !== 'BasicPunch') started++; prev = pose.clip;
        if (shot && step > 120) impactFrameAtShot = pose.frame;
      }
      expect(Math.abs(impactFrameAtShot - 5)).toBeLessThanOrEqual(1);
      expect(Math.abs(started - shots)).toBeLessThanOrEqual(1);
    }
  });
  it('turns toward the target for the punch without movement input, then returns to Idle', () => {
    const a = new KaiAnimator(manifests); let clock = 0.2; let pose = a.pose();
    for (let i = 0; i < 90; i++) {
      clock -= 1 / 60; let shot = null; if (clock <= 0) { clock = 5; shot = { dx: 0, dy: -120 }; }
      pose = a.update({ ...idle, attackClock: clock, hasTarget: i < 30, targetDy: -120, shot }, 0.55);
      if (i === 20) expect(pose).toMatchObject({ clip: 'BasicPunch', facing: 'north' });
    }
    expect(pose.clip).toBe('Idle'); expect(pose.facing).toBe('north');
  });
  it('freezes while paused (dt 0) and death cancels the punch', () => {
    const a = new KaiAnimator(manifests); a.update({ ...idle, attackClock: 0.05, hasTarget: true, targetDx: 50 }, 0.55);
    const p1 = a.pose(); for (let i = 0; i < 100; i++) a.update({ ...idle, dt: 0, attackClock: 0.05, hasTarget: true, targetDx: 50 }, 0.55);
    expect(a.pose()).toEqual(p1);
    expect(a.update({ ...idle, alive: false }, 0.55).clip).toBe('Death');
  });
  it('a target appearing exactly at the weapon tick still gets a punch (snap-in near the impact frame)', () => {
    const a = new KaiAnimator(manifests); const p = a.update({ ...idle, attackClock: 0.5, hasTarget: true, targetDx: 40, shot: { dx: 40, dy: 0 } }, 0.55);
    expect(p).toMatchObject({ clip: 'BasicPunch', facing: 'east' }); expect(p.frame).toBeGreaterThanOrEqual(2);
  });

  it('B03F.1: punching while moving keeps the run cycle on the legs (was frozen stance = skating)', () => {
    const a = new KaiAnimator(manifests); const legs = new Set<number | null>();
    for (let i = 0; i < 60; i++) {
      const p = a.update({ ...idle, moving: true, inputX: 1, attackClock: i < 5 ? 0.05 : 1, hasTarget: true, targetDx: 100 }, 0.55);
      if (p.clip === 'BasicPunch') legs.add(p.legs);
    }
    expect(legs.size).toBeGreaterThan(3); expect(legs.has(null)).toBe(false);
    expect(a.update({ ...idle }, 0.55).legs).toBeNull();
  });
  it('B03F.1: facing cannot flip faster than the dwell while targets alternate or diagonals jitter', () => {
    const a = new KaiAnimator(manifests); let flips = 0; let prev = a.facing;
    for (let i = 0; i < 120; i++) {
      const p = a.update({ ...idle, moving: true, inputX: 1, inputY: i % 2 ? 1 : -1 }, 0.55);
      if (p.facing !== prev) flips++; prev = p.facing;
    }
    expect(flips).toBeLessThanOrEqual(1);
    const b = new KaiAnimator(manifests); let tflips = 0; let pf = b.facing;
    for (let i = 0; i < 240; i++) {
      const p = b.update({ ...idle, attackClock: 0.05, hasTarget: true, targetDx: i % 8 < 4 ? 100 : -100, targetDy: 0 }, 0.2);
      if (p.facing !== pf) tflips++; pf = p.facing;
    }
    expect(tflips).toBeLessThanOrEqual(240 / 7);
  });

  it('B03G.1: deathPresented is false while alive/dying, true only after the clip played through and held; a new run resets it', () => {
    const a = new KaiAnimator(manifests); const dead = { ...idle, alive: false }; const d = manifests.south.animations.Death; const total = d.frames / d.fps + DEATH_RESULTS_HOLD_SECONDS;
    expect(a.deathPresented()).toBe(false);
    let t = 0; let first = -1;
    for (let i = 0; i < 600; i++) { a.update(dead, 0.55); t += 1 / 60; if (a.deathPresented() && first < 0) first = t; }
    expect(first).toBeGreaterThanOrEqual(total - 0.05); expect(first).toBeLessThan(total + 0.1); expect(a.deathPresented()).toBe(true);
    const paused = new KaiAnimator(manifests); paused.update(dead, 0.55); for (let i = 0; i < 300; i++) paused.update({ ...dead, dt: 0 }, 0.55); expect(paused.deathPresented()).toBe(false);
    a.update(idle, 0.55); expect(a.deathPresented()).toBe(false);
  });
});

describe('B03G.1 Results delay contract (GameBridge)', () => {
  const fakeSim = (phase: string) => ({ state: { phase, seed: 1, time: 3, kills: 2, enemies: [], upgradeOffers: [], player: { hp: phase === 'dead' ? 0 : 50, maxHp: 100, xp: 0, nextXp: 7, level: 1, dashCooldown: 0, qCooldown: 0, drive: 0, form: 0, formCooldown: 0 } }, stats: () => ({ score: 0 }) });
  const bridge = (phase: string) => { const b = new GameBridge({ settings: {}, best: { score: 99 } } as never); const sim = fakeSim(phase); b.bind(sim as never); return { b, sim }; };
  it('dead does not show Results until the death animation reports completion', () => {
    const { b } = bridge('dead'); expect(b.snapshot()).toMatchObject({ phase: 'dead', deathShown: false });
    b.markDeathShown(); expect(b.snapshot()).toMatchObject({ phase: 'dead', deathShown: true });
  });
  it('markDeathShown is ignored while the sim is not dead and cannot leak into the next phase or run', () => {
    const { b, sim } = bridge('running'); b.markDeathShown(); expect(b.snapshot().deathShown).toBe(false);
    sim.state.phase = 'dead'; b.publish(true); b.markDeathShown(); expect(b.snapshot().deathShown).toBe(true);
    sim.state.phase = 'running'; b.publish(true); expect(b.snapshot().deathShown).toBe(false);
    expect(bridge('dead').b.snapshot().deathShown).toBe(false);
  });
  it('the player cannot act or revive during the delay: pause toggling leaves the dead phase alone', () => {
    const { b, sim } = bridge('dead'); (sim as unknown as { togglePause?: () => void }).togglePause = () => {}; b.togglePause(); expect(b.snapshot().phase).toBe('dead');
  });
});
