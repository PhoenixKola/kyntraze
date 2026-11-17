/** Everything B22 adds to a run, kept in one authoritative, serialisable block on GameState. Renderers read it; only sim systems write it. */
import type { RelicId } from './relics';
import type { BranchId, Slot } from './branches';
import type { LegendaryId } from './legendary';
import type { ModifierId } from './challenges';

/** A timed authoritative effect queued by a branch / legendary / relic / ultimate. Plain data so it survives a snapshot. */
export interface ScheduledFx { id: number; at: number; kind: 'area' | 'cone' | 'line' | 'chain' | 'nova' | 'strike' | 'burst'; x: number; y: number; x2?: number; y2?: number; ang?: number; r: number; w?: number; dmg: number; push: number; stagger: number; cap: number; src: string; tag?: string; hit?: number[] }
/** A lingering damaging zone that hurts ENEMIES (afterburn line, fissure, crater ring, rift, molten field). */
export interface Zone { id: number; kind: 'line' | 'circle' | 'ring'; x: number; y: number; x2: number; y2: number; r: number; t: number; dur: number; tick: number; next: number; dmg: number; push: number; src: string }
export interface Mark { id: number; enemy: number; t: number; power: number; src: string }
export interface B22Event { id: number; kind: string; x: number; y: number; x2?: number; y2?: number; n?: number; tag?: string }
export interface UltAct { id: string; t: number; dur: number; dirX: number; dirY: number; tx: number; ty: number; step: number; hits: number[] }
export interface B22State {
  relics: RelicId[]; relicOffer: RelicId[] | null; relicCd: Record<string, number>;
  prismCount: number; prismAt: number; dawnT: number; sigilCharge: number; sigilAt: number; featherArmed: number; featherBoost: number; hourT: number; lastDashLen: number; dashStart: { x: number; y: number } | null;
  bearings: number[]; heading: { a: number; held: number; dist: number; set: boolean };
  branches: BranchId[]; casts: Record<Slot, number>; branchOffer: { slot: Slot; a: BranchId; b: BranchId } | null; branchDone: Slot[];
  legendary: LegendaryId[]; legendOffer: LegendaryId | null; legendCd: Record<string, number>; legendMisc: Record<string, number>;
  fx: ScheduledFx[]; zones: Zone[]; marks: Mark[];
  hits: { id: number; dmg: number; slot: Slot | null; x: number; y: number }[];
  ult: { unlocked: boolean; charge: number; cd: number; act: UltAct | null };
  /** per-run mastery counters (judged and persisted once at the end of the run) */ m: Record<string, number>;
  ev: B22Event[]; evId: number;
  modifiers: ModifierId[]; momentumT: number; relicGrants: number[];
  endless: { fromT: number; cycle: number; bossAt: number; offered: boolean; extracted: boolean } | null;
  /** boss fight tracking: damage taken since the current boss appeared, for flawless milestones */ bossHurt: boolean;
  /** B22 ids of the plan step events already announced */ announced: Record<string, boolean>;
  /** vex: parry window, riposte state, forms unlocked in the save (index 0 = Riftbound, 1 = Voidheart) */
  vex: { forms: [boolean, boolean]; parryT: number; parryLeft: number; parryCd: number; guardDir: { x: number; y: number }; counterReady: number; riposteT: number; requiem: number; nullWaltz: number; waltzAt: number; markIds: number[] };
  /** a non-boss step that ends the run was completed (the sim wins the run next tick) */ endStep: string | null; /** a boss step paid a relic: offer one once the reward pick is done */ relicWanted: boolean;
  /** co-op party block (null in solo) */ party: PartyState | null;
}
export interface PartyState { pair: string | null; resonance: number; resonanceT: number; resonanceCd: number; pairCd: number; pairMark: { enemy: number; by: number; t: number; kind: string } | null; syncT: number; syncBy: number; time: number }
export const makeB22 = (): B22State => ({
  relics: [], relicOffer: null, relicCd: {}, prismCount: 0, prismAt: -9, dawnT: 0, sigilCharge: 0, sigilAt: -9, featherArmed: 0, featherBoost: 0, hourT: 0, lastDashLen: 0, dashStart: null, bearings: [], heading: { a: 0, held: 0, dist: 0, set: false },
  branches: [], casts: { q: 0, e: 0, r: 0 }, branchOffer: null, branchDone: [], legendary: [], legendOffer: null, legendCd: {}, legendMisc: {},
  fx: [], zones: [], marks: [], hits: [], ult: { unlocked: false, charge: 0, cd: 0, act: null }, m: {}, ev: [], evId: 1, modifiers: [], momentumT: 0, relicGrants: [], endless: null, bossHurt: false, announced: {},
  vex: { forms: [false, false], parryT: 0, parryLeft: 0, parryCd: 0, guardDir: { x: 0, y: 1 }, counterReady: 0, riposteT: 0, requiem: 0, nullWaltz: 0, waltzAt: 0, markIds: [] }, endStep: null, relicWanted: false, party: null,
});
export const b22Emit = (b: B22State, kind: string, x: number, y: number, extra: Partial<B22Event> = {}) => { b.ev.push({ id: b.evId++, kind, x, y, ...extra }); if (b.ev.length > 40) b.ev.splice(0, b.ev.length - 40); };
export const bump = (b: B22State, key: string, n = 1) => { b.m[key] = (b.m[key] ?? 0) + n; };
export const maxm = (b: B22State, key: string, v: number) => { if (v > (b.m[key] ?? 0)) b.m[key] = v; };
