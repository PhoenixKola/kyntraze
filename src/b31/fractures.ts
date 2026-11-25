/** B31B Living Fractures: stable definitions for the six world events. Pure data and types; the rules live in sim/LivingFractures.ts and every number the sim, the HUD copy and the tests read is here, so card text and behaviour cannot disagree. */
import type { ArenaId } from '../content/arenas';
import type { MobKind } from '../content/enemies';
import type { HeroId } from '../content/heroes';
import type { SeededRng } from '../core/SeededRng';

export const LF_VERSION = 1;
export type LfKind = 'rift' | 'shrine' | 'cache' | 'elite' | 'relay' | 'echo';
export const LF_KINDS: readonly LfKind[] = ['rift', 'shrine', 'cache', 'elite', 'relay', 'echo'];
/** idle = discoverable, waiting for a fighter; active = the challenge is running; reward = success, a prize waits to be claimed; won / failed / expired = resolved (the entity lingers a moment for its exit animation, then is removed). */
export type LfStatus = 'idle' | 'active' | 'reward' | 'won' | 'failed' | 'expired';
export const LF_TERMINAL: readonly LfStatus[] = ['won', 'failed', 'expired'];
export type EliteMod = 'swift' | 'volatile' | 'warded';
export const ELITE_MODS: readonly EliteMod[] = ['swift', 'volatile', 'warded'];
export type BargainId = 'blood_pact' | 'tempo_debt' | 'hungry_flame' | 'hollow_tithe' | 'ember_oath' | 'wardens_toll' | 'mirror_wager';
export type RelayType = 'escort' | 'defend';

/** One event in the world. Plain numbers and strings only, so the whole thing survives the online snapshot. */
export interface LfEvent {
  id: number; kind: LfKind; variant: ArenaId; x: number; y: number; r: number; st: LfStatus;
  /** created at, state entered at, expires at (sim seconds) */ t0: number; ta: number; ex: number;
  /** discovered by a fighter (hidden caches stay off the minimap until they are) */ seen: boolean;
  /** 0..1 progress of whatever the event is measuring (hold, escort, trial) */ p: number;
  /** a health bar (relay / beacon / roaming elite) */ hp: number; hpMax: number;
  /** slots that took part (eligible for the reward) */ parts: number[];
  /** the slot that owns a bargain / blessing, or -1 */ who: number;
  /** kind-specific scratch: elite modifier, bargain pair, relay type, echo hero, trial step; strings are ids, numbers are timers and coordinates */ tag: string; hero?: HeroId; mod?: EliteMod; type?: RelayType; pair?: [BargainId, BargainId]; took?: BargainId | null;
  ids: number[]; aux: number[];
}
/** A timed effect on one fighter ('slot' >= 0) or on the whole party's world (-1). Boons help, curses cost; both are listed on the HUD with their remaining time. */
export interface LfFx { id: number; slot: number; src: number; kind: 'boon' | 'curse'; label: string; icon: string; until: number; dur: number; dmg?: number; taken?: number; speed?: number; xp?: number; spawn?: number; foeHp?: number; regen?: number; cdr?: number; dashCdr?: number }
export interface LfLog { id: number; t: number; kind: LfKind | 'info'; title: string; sub: string }
export interface LfHist { kind: LfKind; variant: ArenaId; outcome: 'won' | 'failed' | 'expired' | 'declined' | 'ended'; t: number; note: string }
export interface LfStats { discovered: number; started: number; won: number; failed: number; expired: number; relics: number; boons: number; curses: number }
export interface LfState {
  v: number; /** the event director's private stream: never the combat or cosmetic RNG */ rng?: SeededRng; nextAt: number; /** run time the director first wanted to spawn and could not (-1 = not waiting) */ waitSince: number; spawned: number; seq: number; lastKind: LfKind | ''; events: LfEvent[]; fx: LfFx[]; log: LfLog[]; hist: LfHist[]; stats: LfStats; ended: boolean;
}
export const blankLfStats = (): LfStats => ({ discovered: 0, started: 0, won: 0, failed: 0, expired: 0, relics: 0, boons: 0, curses: 0 });

/* ------------------------------------------------------------------ tuning (all of it) */
export const LF_RULES = {
  /** run seconds of the first opportunity per mode, [min, max] */ first: { classic: [140, 195], expedition: [170, 225], endless: [90, 150] } as Record<string, [number, number]>,
  /** seconds between opportunities, [min, max]; Endless repeats with the same cooldown every cycle */ gap: { classic: [170, 225], expedition: [190, 245], endless: [125, 175] } as Record<string, [number, number]>,
  /** no new event within this many seconds of a scripted step, a live boss, the finale or the end of an Endless cycle */ stepGuard: 28, bossAfter: 14, endlessCycleGuard: 30, finaleGuard: 55, maxActive: 1,
  /** how long an undiscovered / unengaged event stays in the world */ life: { rift: 130, shrine: 95, cache: 150, elite: 190, relay: 110, echo: 120 } as Record<LfKind, number>,
  /** a fighter this close notices an event (hidden caches reveal here) */ notice: 520, retry: 3.5, window: 40,
  /** the party scales encounters by this much (enemy counts, relay health) */ party: 1.4,
  spacing: 300, minDist: 380, maxDist: 1100, farDist: 1450,
  rift: { enterR: 74, enterT: 0.7, zoneR: 300, leave: 9, claimR: 48, claimT: 50, minIn: 6, heal: 0.3, boon: { dmg: 1.16, dur: 110 }, hpMul: 1.25, relicCap: 2, clear: 120 },
  shrine: { altarR: 54, channel: 1.3, spread: 98, decay: 0.8, clear: 160 },
  cache: { r: 74, attune: 1.1, guarded: 0.45, ambushDelay: 1.6, ambushR: 175, reveal: 520, heal: 0.18, drive: 22, crystals: [1, 3], clear: 80, fadeT: 4 },
  elite: { aggro: 520, leash: 1100, leashT: 12, roam: 56, hpMul: { swift: 1.9, volatile: 2.4, warded: 2.6 } as Record<EliteMod, number>, swiftMul: 1.5, pounceEvery: 5.5, pounceDelay: 1.1, pounceR: 72, pounceDmg: 14, blastR: 130, blastDelay: 1.3, blastDmg: 24, wardEvery: 7, wardR: 150, wardDelay: 1.2, wardDmg: 16, boon: { dmg: 1.14, dur: 60 }, od: 25, crystals: 3, spawnMin: 640, spawnMax: 900 },
  relay: { hp: 300, defendT: 55, escortSpeed: 50, near: 240, escortNear: 210, abandon: 11, abandonDps: 2.2, raidEvery: 9, raidN: 3, raidR: 520, contact: 42, dpsMul: 0.65, aggroP: 175, surge: { speed: 1.1, cdr: 1.25, dmg: 1.08, dur: 60 }, heal: 0.25, crystals: 2, clear: 90, routeMin: 640, routeMax: 1000 },
  echo: { enterR: 66, enterT: 0.8, zoneR: 250, leave: 4.5, blessDur: 80, spark: { drive: 20, heal: 0.15 }, kai: { dur: 20, waves: 3, per: 4, every: 6, r: 95, dmg: 16, delay: 1.5 }, ren: { orbs: 3, orbT: 6.5, touch: 40, trap: 2, r: 80, dmg: 14, delay: 1.3 }, sora: { lanes: 4, cycles: 2, w: 74, dmg: 15, delay: 1.4, stagger: 0.9, apexT: 7, touch: 46 }, vex: { limit: 36, every: 5, r: 140, dmg: 18, delay: 1.2 }, clear: 150 },
  /** per-run ceilings so event rewards never inflate power without limit */ caps: { relics: 2, boonStack: 4 },
} as const;

/* ------------------------------------------------------------------ bargains (Corrupted Shrine) */
export interface Bargain { id: BargainId; name: string; boon: string; curse: string; dur: number; scope: 'you' | 'party'; fx: Omit<LfFx, 'id' | 'slot' | 'src' | 'until' | 'dur' | 'kind' | 'label' | 'icon'>[]; curseFx: Omit<LfFx, 'id' | 'slot' | 'src' | 'until' | 'dur' | 'kind' | 'label' | 'icon'>[]; /** one-off energy paid on acceptance */ drive?: number; od?: number }
export const BARGAINS: Record<BargainId, Bargain> = {
  blood_pact: { id: 'blood_pact', name: 'Blood Pact', dur: 90, scope: 'you', boon: 'Deal 28% more damage', curse: 'Take 35% more damage', fx: [{ dmg: 1.28 }], curseFx: [{ taken: 1.35 }] },
  tempo_debt: { id: 'tempo_debt', name: 'Tempo Debt', dur: 90, scope: 'you', boon: 'Abilities recharge 35% faster and you move 10% faster', curse: 'You gain half the experience', fx: [{ cdr: 1.35, speed: 1.1 }], curseFx: [{ xp: 0.5 }] },
  hungry_flame: { id: 'hungry_flame', name: 'Hungry Flame', dur: 90, scope: 'party', boon: 'Gain 60% more experience (you)', curse: 'The whole party faces 30% more enemies', fx: [{ xp: 1.6 }], curseFx: [{ spawn: 1.3 }] },
  hollow_tithe: { id: 'hollow_tithe', name: 'Hollow Tithe', dur: 75, scope: 'party', boon: 'Regenerate 3 health a second and take 15% less damage (you)', curse: 'Every enemy the party meets has 25% more health', fx: [{ regen: 3, taken: 0.85 }], curseFx: [{ foeHp: 1.25 }] },
  ember_oath: { id: 'ember_oath', name: 'Ember Oath', dur: 60, scope: 'you', boon: 'At once: +60 Drive and +40 Overdrive energy', curse: 'Take 40% more damage', fx: [], curseFx: [{ taken: 1.4 }], drive: 60, od: 40 },
  wardens_toll: { id: 'wardens_toll', name: "Warden's Toll", dur: 90, scope: 'you', boon: 'Take 30% less damage', curse: 'Move 12% slower and deal 10% less damage', fx: [{ taken: 0.7 }], curseFx: [{ speed: 0.88, dmg: 0.9 }] },
  mirror_wager: { id: 'mirror_wager', name: 'Mirror Wager', dur: 45, scope: 'you', boon: 'Deal 45% more damage', curse: 'Take 60% more damage', fx: [{ dmg: 1.45 }], curseFx: [{ taken: 1.6 }] },
};
export const BARGAIN_IDS = Object.keys(BARGAINS) as BargainId[];

/* ------------------------------------------------------------------ Celestial Echo blessings (one per hero) */
export interface Blessing { name: string; place: string; trial: string; boon: string; dur: number; fx: Omit<LfFx, 'id' | 'slot' | 'src' | 'until' | 'dur' | 'kind' | 'label' | 'icon'>; drive: number; od: number }
export const BLESSINGS: Record<HeroId, Blessing> = {
  kai: { name: "Dragon's Breath", place: 'Echo of the Dragon', trial: 'Ember Gauntlet: stand in the ring while cinder storms fall for 20 seconds.', boon: 'Abilities recharge 30% faster, +18% damage', dur: 80, fx: { cdr: 1.3, dmg: 1.18 }, drive: 40, od: 35 },
  ren: { name: 'Fox Spirit', place: 'Echo of the Nine-Tailed Fox', trial: 'Fox Hunt: catch three spirit lights, each trapped, before they fade.', boon: 'Move 14% faster, dash recharges 60% faster', dur: 80, fx: { speed: 1.14, cdr: 1.12, dashCdr: 1.6 }, drive: 35, od: 30 },
  sora: { name: 'Phoenix Grace', place: 'Echo of the Astral Phoenix', trial: 'Updraft: weave through the falling lanes, then reach the apex.', boon: 'Regenerate 2 health a second, take 12% less damage, +10% damage', dur: 80, fx: { regen: 2, taken: 0.88, dmg: 1.1 }, drive: 35, od: 30 },
  vex: { name: "Guardian's Vow", place: 'Echo of the Abyssal Guardian', trial: 'Oath Ward: break the ward-bearer before the oath-rings overwhelm you.', boon: 'Take 22% less damage, +12% damage', dur: 80, fx: { taken: 0.78, dmg: 1.12 }, drive: 30, od: 25 },
};

/* ------------------------------------------------------------------ arena variants */
export interface ArenaLf {
  rift: { name: string; group: { kind: MobKind; n: number }[] }; cache: { name: string; ambush: { kind: MobKind; n: number }[] };
  elite: { kinds: MobKind[] }; shrine: { name: string; pairs: [BargainId, BargainId][] }; relay: { name: string; type: RelayType; raid: MobKind[] };
  echoName: string; weights: Record<LfKind, number>; accent: number;
}
export const ARENA_LF: Record<ArenaId, ArenaLf> = {
  gloam: {
    rift: { name: 'Conduit Rift', group: [{ kind: 'bruiser', n: 1 }, { kind: 'flanker', n: 5 }, { kind: 'ranged', n: 2 }] }, cache: { name: 'Charged Core', ambush: [{ kind: 'flanker', n: 4 }, { kind: 'ranged', n: 1 }] },
    elite: { kinds: ['bruiser', 'cantor'] }, shrine: { name: 'Breaker Shrine', pairs: [['blood_pact', 'tempo_debt'], ['hungry_flame', 'wardens_toll']] }, relay: { name: 'Reactor Relay', type: 'defend', raid: ['pursuer', 'flanker'] },
    echoName: 'Circuit Echo', weights: { rift: 2, shrine: 2, cache: 3, elite: 2, relay: 2, echo: 1 }, accent: 0x5ff0e0,
  },
  ashen: {
    rift: { name: 'Ember Gate', group: [{ kind: 'aegis', n: 1 }, { kind: 'pursuer', n: 6 }, { kind: 'cantor', n: 1 }] }, cache: { name: 'Reliquary Cache', ambush: [{ kind: 'pursuer', n: 5 }, { kind: 'ranged', n: 1 }] },
    elite: { kinds: ['aegis', 'bruiser'] }, shrine: { name: 'Ashen Shrine', pairs: [['ember_oath', 'wardens_toll'], ['blood_pact', 'hollow_tithe']] }, relay: { name: "Pilgrim's Lantern", type: 'escort', raid: ['pursuer', 'bruiser'] },
    echoName: 'Reliquary Echo', weights: { rift: 2, shrine: 3, cache: 2, elite: 2, relay: 2, echo: 1 }, accent: 0xff9a4a,
  },
  aetherfall: {
    rift: { name: 'Skygate', group: [{ kind: 'citadel_bulwark', n: 1 }, { kind: 'sky_lancer', n: 3 }, { kind: 'halo_scribe', n: 2 }] }, cache: { name: 'Gilded Cache', ambush: [{ kind: 'sky_lancer', n: 3 }, { kind: 'halo_scribe', n: 1 }] },
    elite: { kinds: ['citadel_bulwark', 'sky_lancer'] }, shrine: { name: 'Gilded Shrine', pairs: [['tempo_debt', 'hollow_tithe'], ['mirror_wager', 'hungry_flame']] }, relay: { name: 'Skybeacon', type: 'escort', raid: ['pursuer', 'sky_lancer'] },
    echoName: 'Skyfall Echo', weights: { rift: 2, shrine: 2, cache: 2, elite: 2, relay: 3, echo: 1 }, accent: 0xf6d98c,
  },
  paradox: {
    rift: { name: 'Mirror Tear', group: [{ kind: 'singularity_husk', n: 1 }, { kind: 'rift_mimic', n: 3 }, { kind: 'phase_harrier', n: 3 }] }, cache: { name: 'Folded Cache', ambush: [{ kind: 'phase_harrier', n: 3 }, { kind: 'rift_mimic', n: 2 }] },
    elite: { kinds: ['phase_harrier', 'rift_mimic'] }, shrine: { name: 'Mirror Shrine', pairs: [['mirror_wager', 'wardens_toll'], ['ember_oath', 'hungry_flame']] }, relay: { name: 'Echo Relay', type: 'defend', raid: ['pursuer', 'phase_harrier'] },
    echoName: 'Paradox Echo', weights: { rift: 3, shrine: 2, cache: 2, elite: 2, relay: 2, echo: 2 }, accent: 0xb18cff,
  },
};

export const LF_COPY: Record<LfKind, { name: string; verb: string; icon: string; short: string }> = {
  rift: { name: 'Rift Portal', verb: 'Step into the ring', icon: 'rift', short: 'RIFT' },
  shrine: { name: 'Corrupted Shrine', verb: 'Stand on an altar to accept; walk away to decline', icon: 'shrine', short: 'SHRINE' },
  cache: { name: 'Fracture Cache', verb: 'Stay close to attune the crystal', icon: 'cache', short: 'CACHE' },
  elite: { name: 'Roaming Elite', verb: 'Hunt it, or avoid it', icon: 'elite', short: 'ELITE' },
  relay: { name: 'Containment', verb: 'Protect the relay', icon: 'relay', short: 'RELAY' },
  echo: { name: 'Celestial Echo', verb: 'Step into the sigil', icon: 'echo', short: 'ECHO' },
};
export const ELITE_COPY: Record<EliteMod, { name: string; cue: string }> = {
  swift: { name: 'Swift', cue: 'Marks the ground where it will pounce' },
  volatile: { name: 'Volatile', cue: 'Detonates when it dies: step away' },
  warded: { name: 'Warded', cue: 'Pulses a ward ring around itself' },
};
