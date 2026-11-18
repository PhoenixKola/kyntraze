/** B22.6: Resonance (a shared meter earned by fighting together), the six hero-pair combination attacks and synchronised transformations. Every pair attack needs real events from BOTH fighters (a setup by one, the payoff by the other), costs Resonance, has a cooldown and a bounded target count; nothing fires from a scripted timer. Runs once per tick after both fighters have been stepped (slot 0 is active). */
import type { GameState } from './GameState';
import { PAIR_RULES, RESONANCE, PAIR_BY_ID } from '../b22/pairs';
import { b22Emit, bump } from '../b22/state';
import { areaFx, lineFx } from './BranchSystem';
import { standing, slotPlayer } from './CoopSystem';
import { slideMove } from './CollisionSystem';
import { isBoss } from '../content/enemies';
import { emit } from './HeroSystem';

const alive = (e: { hp: number }) => e.hp > 0;
export const slotHero = (s: GameState, i: number) => (s.party!.cur === i ? s.hero : s.party!.slots[i].bag.hero);
const slotB22 = (s: GameState, i: number) => (s.party!.cur === i ? s.b22 : s.party!.slots[i].bag.b22);
const ofHero = (s: GameState, h: string) => s.party!.slots.findIndex((_, i) => slotHero(s, i) === h);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const nearestFoe = (s: GameState, x: number, y: number, range: number) => { let b: ReturnType<typeof s.enemies.find> | undefined, bd = range * range; for (const e of s.enemies) { if (!alive(e) || e.part?.role === 'decoy') continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; b = e; } } return b; };

export function resolveCoop(s: GameState, dt: number) {
  const P = s.party!, sh = P.shared, both = standing(s, 0) && standing(s, 1);
  sh.resonanceT = Math.max(0, sh.resonanceT - dt); sh.resonanceCd = Math.max(0, sh.resonanceCd - dt); sh.pairCd = Math.max(0, sh.pairCd - dt);
  const a = slotPlayer(s, 0), b = slotPlayer(s, 1), near = both && dist(a, b) <= PAIR_RULES.range;
  // Resonance is earned by landing hits while together and drains when apart
  const hits = P.slots[0].lastHits.length + P.slots[1].lastHits.length;
  if (near) sh.resonance = Math.min(100, sh.resonance + hits * RESONANCE.gain * 0.25); else sh.resonance = Math.max(0, sh.resonance - 2 * dt);
  // synchronised transformation: both fighters transform inside the window, with enough Resonance
  for (let i = 0; i < 2; i++) { const q = slotPlayer(s, i), sl = P.slots[i] as typeof P.slots[number] & { prevForm?: number }; if (q.form > 0 && (sl.prevForm ?? 0) === 0) sl.formAt = s.time; sl.prevForm = q.form; }
  if (both && sh.resonanceCd <= 0 && sh.resonance >= PAIR_RULES.resonanceCost && slotPlayer(s, 0).form > 0 && slotPlayer(s, 1).form > 0 && Math.abs(P.slots[0].formAt - P.slots[1].formAt) <= RESONANCE.window && s.time - Math.max(P.slots[0].formAt, P.slots[1].formAt) < 0.25) {
    sh.resonanceT = RESONANCE.duration; sh.resonanceCd = RESONANCE.cooldown; sh.resonance -= PAIR_RULES.resonanceCost; bump(s.b22, 'resonance.sync'); bump(P.slots[1].bag.b22, 'resonance.sync');
    for (const [i, q] of [[0, a], [1, b]] as const) { b22Emit(s.b22, 'resonance', q.x, q.y, { n: 160, tag: slotHero(s, i) }); }
    emit(s, 'finisher', (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  if (sh.pairMark && s.time - sh.pairMark.t > 3) sh.pairMark = null;
  const pair = sh.pair; if (!pair || !both || !near) return;
  const ready = sh.resonance >= PAIR_RULES.resonanceCost && sh.pairCd <= 0, def = PAIR_BY_ID[pair as keyof typeof PAIR_BY_ID]; if (!def) return;
  const fire = (x: number, y: number, tag: string) => { sh.resonance -= PAIR_RULES.resonanceCost; sh.pairCd = PAIR_RULES.cooldown; sh.pairMark = null; bump(s.b22, 'pair.attack'); bump(P.slots[1].bag.b22, 'pair.attack'); b22Emit(s.b22, 'pair_attack', x, y, { n: 150, tag }); emit(s, 'finisher', x, y); };
  const [h0, h1] = def.heroes, i0 = ofHero(s, h0), i1 = ofHero(s, h1); if (i0 < 0 || i1 < 0) return;
  const abil = (i: number) => P.slots[i].lastHits.filter(h => h.slot !== null), any = (i: number) => P.slots[i].lastHits, mark = sh.pairMark;
  const setMark = (id: number, by: number) => { if (!mark && ready) sh.pairMark = { enemy: id, by, t: s.time, kind: pair }; };
  const payoff = (i: number, hitsOf: { id: number; x: number; y: number }[]) => (mark && mark.by !== i ? hitsOf.find(h => h.id === mark.enemy) : undefined);
  switch (pair) {
    case 'kai_ren': {   // Kai's heavy ability hit marks; Ren's heavy strike on the marked foe erupts
      const kai = ofHero(s, 'kai'), ren = ofHero(s, 'ren'); for (const h of abil(kai)) setMark(h.id, kai);
      const p = payoff(ren, abil(ren)); if (p && ready) { areaFx(s, p.x, p.y, 140, PAIR_RULES.damage, 160, 0.6, PAIR_RULES.maxTargets + 4, 'pair_dragonfall'); fire(p.x, p.y, pair); } break;
    }
    case 'kai_sora': {   // both fire E inside 1.2 s: a lance runs through the crossing of their two aim lines
      const k = ofHero(s, 'kai'), so = ofHero(s, 'sora'), ak = P.slots[k].aimAtE, as = P.slots[so].aimAtE;
      if (ak && as && Math.abs(ak.t - as.t) <= 1.2 && s.time - Math.max(ak.t, as.t) < 0.6 && ready && !(P.slots[k] as { used?: number }).used) {
        const pk = slotPlayer(s, k), ps = slotPlayer(s, so), det = ak.x * as.y - ak.y * as.x; let x = (pk.x + ps.x) / 2 + (ak.x + as.x) * 90, y = (pk.y + ps.y) / 2 + (ak.y + as.y) * 90, full = false;
        if (Math.abs(det) > 0.1) { const dx = ps.x - pk.x, dy = ps.y - pk.y, t1 = (dx * as.y - dy * as.x) / det, t2 = (dx * ak.y - dy * ak.x) / det; if (t1 > 40 && t1 < 700 && t2 > 40 && t2 < 700) { x = pk.x + ak.x * t1; y = pk.y + ak.y * t1; full = true; } }
        const f = full ? 1 : 0.6; areaFx(s, x, y, 160, PAIR_RULES.damage * 1.3 * f, 120, 0.5, 12, 'pair_convergence'); lineFx(s, pk.x, pk.y, x, y, 40, PAIR_RULES.damage * 0.6 * f, 8, 'pair_line'); lineFx(s, ps.x, ps.y, x, y, 40, PAIR_RULES.damage * 0.6 * f, 8, 'pair_line'); fire(x, y, pair); P.slots[k].aimAtE = null; P.slots[so].aimAtE = null;
      } break;
    }
    case 'ren_sora': {   // Ren's heavy contact opens a zone; Sora's heavy hit inside it makes the orbitals converge (bounded pull, never on bosses)
      const ren = ofHero(s, 'ren'), so = ofHero(s, 'sora'); for (const h of abil(ren)) setMark(h.id, ren);
      const z = mark ? s.enemies.find(e => e.id === mark.enemy && alive(e)) : undefined, hit = z ? abil(so).find(h => dist(h, z) < 260) : undefined;
      if (z && hit && ready) { for (const e of s.enemies) if (alive(e) && !isBoss(e.kind) && dist(e, z) < 240) slideMove(e, (z.x - e.x) * 5, (z.y - e.y) * 5, 0.2); areaFx(s, z.x, z.y, 150, PAIR_RULES.damage * 1.2, 0, 0.8, 12, 'pair_singularity'); fire(z.x, z.y, pair); } break;
    }
    case 'kai_vex': {   // Vex's earned parry exposes a foe; Kai's next hit on it is a precise burst
      const vx = ofHero(s, 'vex'), kai = ofHero(s, 'kai'), vb = slotB22(s, vx), cnt = vb.m['parry.perfect'] ?? 0, seen = (sh as { vexSeen?: number }).vexSeen ?? 0;
      if (cnt > seen && ready) { (sh as { vexSeen?: number }).vexSeen = cnt; const t = nearestFoe(s, slotPlayer(s, vx).x, slotPlayer(s, vx).y, 280); if (t) setMark(t.id, vx); } else (sh as { vexSeen?: number }).vexSeen = Math.max(seen, cnt);
      const p = payoff(kai, any(kai)); if (p && ready) { areaFx(s, p.x, p.y, 95, PAIR_RULES.damage * 1.3, 90, 1.0, 6, 'pair_oath'); fire(p.x, p.y, pair); } break;
    }
    case 'ren_vex': {   // Vex's defensive reversal sets the foe up; Ren must actually strike it
      const vx = ofHero(s, 'vex'), ren = ofHero(s, 'ren'), vb = slotB22(s, vx), cnt = (vb.m['parry.perfect'] ?? 0) + (vb.m.riposte ?? 0), seen = (sh as { vexSeen?: number }).vexSeen ?? 0;
      if (cnt > seen && ready) { (sh as { vexSeen?: number }).vexSeen = cnt; const t = nearestFoe(s, slotPlayer(s, vx).x, slotPlayer(s, vx).y, 280); if (t) setMark(t.id, vx); } else (sh as { vexSeen?: number }).vexSeen = Math.max(seen, cnt);
      const p = payoff(ren, abil(ren)); if (p && ready) { areaFx(s, p.x, p.y, 125, PAIR_RULES.damage * 1.25, 200, 0.7, 8, 'pair_ruinbreaker'); fire(p.x, p.y, pair); } break;
    }
    case 'sora_vex': {   // Vex's Seal marks are anchors; Sora's heavy hit on one links up to 4 marked foes
      const vx = ofHero(s, 'vex'), so = ofHero(s, 'sora'), marks = slotB22(s, vx).marks.filter(m => m.src === 'seal');
      const hit = abil(so).find(h => marks.some(m => m.enemy === h.id));
      if (hit && marks.length >= 2 && ready) { const foes = marks.map(m => s.enemies.find(e => e.id === m.enemy && alive(e))).filter((e): e is NonNullable<typeof e> => !!e).slice(0, PAIR_RULES.maxTargets); for (let k = 0; k + 1 < foes.length; k++) lineFx(s, foes[k].x, foes[k].y, foes[k + 1].x, foes[k + 1].y, 30, PAIR_RULES.damage * 0.8, 4, 'pair_link'); for (const e of foes) areaFx(s, e.x, e.y, 60, PAIR_RULES.damage, 30, 0.3, 2, 'pair_eclipse'); fire(foes[0]?.x ?? hit.x, foes[0]?.y ?? hit.y, pair); } break;
    }
  }
}
