import { describe, expect, it } from 'vitest';
import { HeroAnimator, type HeroAnimInput, type HeroActView } from '../assets/heroAnimation';
import { KAI_DIRS, parseKaiManifest, type KaiManifests } from '../assets/kaiAnimation';
import { REN, SORA } from '../content/heroKits';

const clip = (frames: number, fps: number, loop: boolean, events: Record<string, number> = {}) => ({ sheet: 'x.png', frames, fps, loop, events, ...(frames > 0 ? {} : {}) });
function manifests(form: 'base' | 'f1'): KaiManifests {
  const out = {} as KaiManifests;
  for (const d of KAI_DIRS) {
    const animations: Record<string, unknown> = { Idle: clip(8, 8, true), Run: clip(8, 14, true), BasicPunch: clip(14, 16, false, { impact: 6 }), Dash: clip(10, 24, false, { recover_start: 7 }), Hurt: clip(6, 14, false), Death: { ...clip(12, 12, false), terminal: 'hold_last_frame' }, Beam: clip(26, 20, false, { hold_start: 6, hold_end: 9, release: 10 }), Sphere: clip(20, 20, false, { release: 8 }), RunLower: clip(8, 14, true), RunPunchUpper: clip(8 * 14, 16, false, { impact: 6 * 8 }) };
    if (form === 'f1') animations.Transform = clip(18, 20, false, { form_commit: 7 });
    out[d] = parseKaiManifest({ direction: d, frame_width: 152, frame_height: 167, origin_px: [53, 155], root_motion: { baked: false }, animations }, d, form);
  }
  return out;
}
const input = (o: Partial<HeroAnimInput> = {}): HeroAnimInput => ({ dt: 1 / 60, alive: true, moving: false, inputX: 0, inputY: 0, runSpeed: 250, dashing: false, dashX: 0, dashY: 0, dashRemaining: 0, hurt: false, form: 0, cinema: null, act: null, strike: { t: -9, x: 0, y: 1 }, ...o });
const act = (o: Partial<HeroActView>): HeroActView => ({ id: 1, act: 'crimson_break', t: 0, dur: 1, face: 'east', released: false, moving: false, beats: 0, hop: 0, hops: 0, hopT: 0, charge: 0, ...o });

describe('HeroAnimator', () => {
  const mk = (hero: 'ren' | 'sora' = 'ren') => new HeroAnimator(hero, manifests('base'), manifests('f1'));
  it('idles, runs, faces the input, and an automatic strike plays BasicPunch (RunPunchUpper while moving) with its impact frame in range', () => {
    const a = mk(); expect(a.update(input()).clip).toBe('Idle'); expect(a.update(input({ moving: true, inputX: 1 })).clip).toBe('Run');
    const p = a.update(input({ moving: true, inputX: 1, strike: { t: 1, x: 1, y: 0 } })); expect(p.clip).toBe('RunPunchUpper'); expect(p.legs).not.toBeNull(); expect(p.frame).toBeLessThan(8 * 14);
    const b = mk(); const q = b.update(input({ strike: { t: 1, x: -1, y: 0 } })); expect(q.clip).toBe('BasicPunch'); expect(q.facing).toBe('west'); expect(q.frame).toBeGreaterThanOrEqual(3);
  });
  it('Crimson Break replays the punch on every beat and its moving variant uses the layered clip', () => {
    const a = mk(); a.update(input({ act: act({ beats: 0 }) })); const f1 = a.update(input({ act: act({ beats: 1 }) })); expect(f1.clip).toBe('BasicPunch'); expect(f1.facing).toBe('east');
    for (let i = 0; i < 4; i++) a.update(input({ act: act({ beats: 1 }) })); const mid = a.update(input({ act: act({ beats: 1 }) })).frame; const f2 = a.update(input({ act: act({ beats: 2 }) })).frame; expect(f2).toBeLessThanOrEqual(mid);
    const m = mk(); expect(m.update(input({ moving: true, inputX: 1, act: act({ beats: 1, moving: true }) })).clip).toBe('RunPunchUpper');
  });
  it('Meteor Rush: hop = Dash travel, strike pause = BasicPunch, finish = Dash recovery frames', () => {
    const a = mk(); expect(a.update(input({ act: act({ act: 'meteor_rush', hops: 3, hop: 0, hopT: 0.05, face: 'north' }) })).clip).toBe('Dash');
    expect(a.update(input({ act: act({ act: 'meteor_rush', hops: 3, hop: 0, hopT: REN.e.hopTime + 0.04, face: 'north' }) })).clip).toBe('BasicPunch');
    const end = a.update(input({ act: act({ act: 'meteor_rush', hops: 3, hop: 3, t: 3 * (REN.e.hopTime + REN.e.strikeTime) + 0.1, face: 'north' }) })); expect(end.clip).toBe('Dash'); expect(end.frame).toBeGreaterThanOrEqual(7);
  });
  it('Bloodstar and Zero Horizon play the Sphere clip with the release frame at the move\'s release tick', () => {
    const a = mk(); const before = a.update(input({ act: act({ act: 'bloodstar', t: REN.r.windup + REN.r.flight - 0.02, dur: 1.2 }) })), after = a.update(input({ act: act({ act: 'bloodstar', t: REN.r.windup + REN.r.flight + 0.02, dur: 1.2 }) }));
    expect(before.clip).toBe('Sphere'); expect(before.frame).toBeLessThan(8); expect(after.frame).toBeGreaterThanOrEqual(8);
    const s = mk('sora'); expect(s.update(input({ act: act({ act: 'zero_horizon', t: SORA.r.summon + 0.05, dur: 1.5 }) })).frame).toBeGreaterThanOrEqual(8);
  });
  it('Celestial Lance holds the charge loop while charging and plays the release tail after the beam', () => {
    const a = mk('sora'); const f = [0.45, 0.6, 0.75, 0.9].map(c => a.update(input({ act: act({ act: 'celestial_lance', charge: c }) })).frame); for (const x of f) { expect(x).toBeGreaterThanOrEqual(6); expect(x).toBeLessThanOrEqual(9); }
    const rel = a.update(input({ act: act({ act: 'celestial_lance', released: true, charge: 1.3, t: SORA.e.maxCharge + 0.05 }) })); expect(rel.frame).toBeGreaterThanOrEqual(10);
  });
  it('transformation: Transform clip during the reveal, base art until form_commit, f1 art afterwards, base again when it ends', () => {
    const a = mk(); const early = a.update(input({ cinema: { t: 0.5, dur: 2.7, commitAt: 1.75 }, form: 0 })); expect(early.clip).toBe('Transform'); expect(a.visualForm).toBe('base');
    const late = a.update(input({ cinema: { t: 2, dur: 2.7, commitAt: 1.75 }, form: 1 })); expect(late.form).toBe('f1'); expect(a.visualForm).toBe('f1');
    expect(a.update(input({ form: 1 })).form).toBe('f1'); a.update(input({ form: 0 })); expect(a.visualForm).toBe('base');
  });
  it('hurt and dash interrupt a move, death holds its last frame and is presented once played', () => {
    const a = mk(); a.update(input({ act: act({ beats: 1 }) })); expect(a.update(input({ hurt: true, act: act({ beats: 1 }) })).clip).toBe('Hurt'); expect(a.update(input({ dashing: true, dashX: 1, dashRemaining: 0.1, act: act({ beats: 1 }) })).clip).toBe('Dash');
    const d = mk(); let p = d.update(input({ alive: false })); expect(p.clip).toBe('Death'); for (let i = 0; i < 60 * 2; i++) p = d.update(input({ alive: false })); expect(p.frame).toBe(11); expect(d.deathPresented()).toBe(true);
  });
});

describe('HeroAnimator without Ascendant sheets', () => {
  it('never selects the missing f1 art set (a hero whose transformation art is not built keeps drawing the base sheets)', () => {
    const a = new HeroAnimator('ren', manifests('base')); a.update(input({ form: 1 })); expect(a.visualForm).toBe('base'); expect(a.update(input({ form: 1 })).form).toBe('base');
    expect(a.update(input({ cinema: { t: 2, dur: 2.7, commitAt: 1.75 }, form: 1 })).form).toBe('base'); expect(a.update(input({ alive: false })).form).toBe('base');
  });
});
