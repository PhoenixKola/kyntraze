import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { KAI_DIRS, KaiAnimator, castFrame, parseKaiManifest, type AnimFrameInput, type KaiManifests } from '../assets/kaiAnimation';
import { BEAM, SPHERE } from '../content/abilities';
import { Simulation } from '../sim/Simulation';

const load = (root: string, form: 'base' | 'f1') => Object.fromEntries(KAI_DIRS.map(d => [d, parseKaiManifest(JSON.parse(readFileSync(join(__dirname, '..', '..', 'public', 'art', root, d, 'manifest.json'), 'utf8')), d, form)])) as KaiManifests;
const base = load('kai', 'base'), f1 = load('kai-f1', 'f1');
const frame = (o: Partial<AnimFrameInput> = {}): AnimFrameInput => ({ dt: 1 / 60, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, attackClock: 1, hasTarget: false, targetDx: 0, targetDy: 0, shot: null, ...o });
const cast = (kind: 'beam' | 'sphere', t: number, dirX = 1, dirY = 0) => ({ id: 1, kind, face: (Math.abs(dirX) >= Math.abs(dirY) ? (dirX >= 0 ? 'east' : 'west') : (dirY >= 0 ? 'south' : 'north')) as 'east', t, dirX, dirY });

describe('Beam / Sphere clips (manifest contract, both forms, four directions)', () => {
  for (const [name, set] of [['base', base], ['form I', f1]] as const) for (const d of KAI_DIRS) it(`${name} ${d}: Beam 26f / Sphere 24f @ 20fps, release events, no loop`, () => {
    const b = set[d].animations.Beam, s = set[d].animations.Sphere;
    expect([b.frames, b.fps, b.loop, b.events.release]).toEqual([26, 20, false, 10]);
    expect([s.frames, s.fps, s.loop, s.events.release]).toEqual([24, 20, false, 16]);
  });
});

describe('cast timing: the release frame lands on the sim release tick', () => {
  it('frame mapping is monotonic, hits the release frame at the release time and ends on the last frame', () => {
    for (const [kind, rel, total, a] of [['beam', BEAM.charge, BEAM.charge + BEAM.fire + BEAM.recover, base.east.animations.Beam], ['sphere', SPHERE.gather, SPHERE.gather + SPHERE.recover, base.east.animations.Sphere]] as const) {
      let prev = 0;
      for (let t = 0; t < total; t += 1 / 120) { const f = castFrame(a, kind, t); expect(f).toBeGreaterThanOrEqual(prev); prev = f; }
      expect(castFrame(a, kind, rel - 1e-4)).toBe(a.events.release - 1); expect(castFrame(a, kind, rel + 1e-4)).toBe(a.events.release); expect(castFrame(a, kind, total)).toBe(a.frames - 1);
    }
  });
  it('a live sim cast drives the Beam clip, faces the aim direction and returns to Idle', () => {
    const sim = new Simulation(3); const s = sim.state; s.spawnTimer = 1e9; s.nextFlanker = 1e9; s.player.aimX = -1; s.player.aimY = 0;
    const an = new KaiAnimator(base, f1); an.update(frame(), 0.55);
    sim.step(1 / 60, { x: 0, y: 0, dash: false, q: false, f: false, beam: true }); let sawRelease = -1; let pose = an.pose();
    for (let i = 0; i < 90 && s.cast; i++) {
      pose = an.update(frame({ cast: s.cast ? { id: s.cast.id, kind: s.cast.kind, face: s.cast.face, t: s.cast.t, dirX: s.cast.dirX, dirY: s.cast.dirY } : null }), 0.55);
      if (s.cast?.released && sawRelease < 0) sawRelease = pose.frame;
      expect(pose.clip).toBe('Beam'); expect(pose.facing).toBe('west');
      sim.step(1 / 60, { x: 0, y: 0, dash: false, q: false, f: false });
    }
    expect(sawRelease).toBeGreaterThanOrEqual(base.west.animations.Beam.events.release - 1); expect(sawRelease).toBeLessThanOrEqual(base.west.animations.Beam.events.release + 1);
    expect(an.update(frame(), 0.55).clip).toBe('Idle');
  });
  it('hurt and dash take priority over the cast clip; death overrides it', () => {
    const an = new KaiAnimator(base, f1); an.update(frame(), 0.55);
    expect(an.update(frame({ cast: cast('beam', 0.2) }), 0.55).clip).toBe('Beam');
    expect(an.update(frame({ hurt: true, cast: cast('beam', 0.25) }), 0.55).clip).toBe('Hurt');
    const an2 = new KaiAnimator(base, f1); an2.update(frame({ cast: cast('sphere', 0.2) }), 0.55);
    expect(an2.update(frame({ dashing: true, dashX: 1, dashRemaining: 0.2, cast: null }), 0.55).clip).toBe('Dash');
    const an3 = new KaiAnimator(base, f1); an3.update(frame({ cast: cast('sphere', 0.2) }), 0.55);
    expect(an3.update(frame({ alive: false, cast: cast('sphere', 0.3) }), 0.55).clip).toBe('Death');
  });
  it('Form I art plays the Beam clip from the Form I sheets', () => {
    const an = new KaiAnimator(base, f1); an.update(frame({ form: 0 }), 0.55);
    const p = an.update(frame({ form: 0, cast: cast('sphere', 0.3, 0, 1) }), 0.55); expect(p.form).toBe('base'); expect(p.facing).toBe('south');
  });
});
