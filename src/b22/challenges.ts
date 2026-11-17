/** B22 Challenge Arenas: deterministic daily / weekly challenges. IDs come from the UTC calendar (never local time), the seed and every rule from a pure hash of that ID plus the rules version, so every player on the same ID plays the same conditions in browser and Electron. */
import { ARENA_IDS, type ArenaId } from '../content/arenas';
import type { HeroId } from '../content/heroes';
import { HERO_IDS } from '../content/heroes';
import { CLASSIC_PLAN, type EncounterStep, type RunPlan, PLAN_VERSION, streamSeed } from './plan';
import { RELIC_IDS, type RelicId } from './relics';

export const CHALLENGE_RULES_VERSION = 1;
export type ModifierId = 'no_second_wind' | 'fractured_momentum' | 'glass_vanguard' | 'prismatic_rain' | 'relic_gamble' | 'mirror_march' | 'guardians_burden' | 'skyfall_circuit';
export interface ModifierDef { id: ModifierId; name: string; rule: string; upside: string; bonus: number; conflicts: ModifierId[]; /** arenas it makes sense in (omitted = any) */ arenas?: ArenaId[]; icon: string }
export const MODIFIERS: readonly ModifierDef[] = [
  { id: 'no_second_wind', name: 'No Second Wind', rule: 'Second Wind never appears and nothing revives you.', upside: 'Score bonus +20%.', bonus: 0.2, conflicts: ['glass_vanguard'], icon: 'mod_no_second_wind' },
  { id: 'fractured_momentum', name: 'Fractured Momentum', rule: 'Every dash grants +15% damage for 3 s, but arena hazards fire 30% more often.', upside: 'Rewards aggressive movement.', bonus: 0.1, conflicts: ['skyfall_circuit'], icon: 'mod_fractured_momentum' },
  { id: 'glass_vanguard', name: 'Glass Vanguard', rule: 'Maximum health is halved.', upside: '+30% XP, extra build opportunities.', bonus: 0.25, conflicts: ['no_second_wind'], icon: 'mod_glass_vanguard' },
  { id: 'prismatic_rain', name: 'Prismatic Rain', rule: 'More ranged enemies, but their shots move 20% slower and are always telegraphed.', upside: 'Easier to read, harder to cross.', bonus: 0.1, conflicts: [], icon: 'mod_prismatic_rain' },
  { id: 'relic_gamble', name: 'Relic Gamble', rule: 'You are granted a random realm relic at levels 5, 10 and 15 instead of choosing; no relic shrines.', upside: 'Up to three relics.', bonus: 0.15, conflicts: [], icon: 'mod_relic_gamble' },
  { id: 'mirror_march', name: 'Mirror March', rule: 'Rift Mimics join the horde: they replay attacks after a countdown.', upside: 'Learnable echoes.', bonus: 0.15, conflicts: [], arenas: ['paradox', 'gloam', 'ashen'], icon: 'mod_mirror_march' },
  { id: 'guardians_burden', name: "Guardian's Burden", rule: 'Far more shield-bearers.', upside: 'Breaking a shield pays double XP.', bonus: 0.15, conflicts: [], icon: 'mod_guardians_burden' },
  { id: 'skyfall_circuit', name: 'Skyfall Circuit', rule: 'The arena hazard cycles 40% faster (always telegraphed).', upside: 'Realm arenas only.', bonus: 0.2, conflicts: ['fractured_momentum'], arenas: ['aetherfall', 'paradox'], icon: 'mod_skyfall_circuit' },
];
export const MODIFIER_BY_ID = Object.fromEntries(MODIFIERS.map(m => [m.id, m])) as Record<ModifierId, ModifierDef>;
export const isModifierId = (v: unknown): v is ModifierId => typeof v === 'string' && v in MODIFIER_BY_ID;
/** Numbers the sim reads for each modifier (kept here beside the card text). */
export const MODIFIER_RULES = { momentum: { dmg: 1.15, secs: 3, hazard: 0.77 }, glass: { hp: 0.5, xp: 1.3 }, rain: { shot: 0.8, rangedWeight: 2.2 }, gamble: { levels: [5, 10, 15] }, burden: { aegisWeight: 3, aegisCapAdd: 2, xp: 2 }, skyfall: { hazard: 0.6 }, mirror: { mimicWeight: 0.12 } } as const;

export type ChallengeKind = 'daily' | 'weekly';
export interface ChallengeDef {
  id: string; kind: ChallengeKind; rules: number; seed: number; arena: ArenaId; hero: HeroId | null; modifiers: ModifierId[]; startRelic: RelicId | null; plan: RunPlan;
  startsAt: number; endsAt: number; /** seconds the run is capped at */ cap: number; scoreRule: string;
}
const DAY = 86_400_000;
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
/** UTC day ID: `D-YYYYMMDD`. */
export function dailyId(ms: number): string { const d = new Date(Math.floor(ms / DAY) * DAY); return `D-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; }
/** UTC week ID: `W-YYYYMMDD` of the Monday that starts the week. */
export function weeklyId(ms: number): string { const day = Math.floor(ms / DAY); const dow = (new Date(day * DAY).getUTCDay() + 6) % 7; const d = new Date((day - dow) * DAY); return `W-${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`; }
export const dayStart = (ms: number) => Math.floor(ms / DAY) * DAY;
export const weekStart = (ms: number) => { const day = Math.floor(ms / DAY), dow = (new Date(day * DAY).getUTCDay() + 6) % 7; return (day - dow) * DAY; };
export const idHash = (id: string) => streamSeed(CHALLENGE_RULES_VERSION * 7919, id);
/** Tiny deterministic generator so a challenge never depends on Math.random or Date.now. */
function rngOf(seed: number) { let s = seed >>> 0; return { next() { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } }; }

function pickModifiers(n: number, arena: ArenaId, r: ReturnType<typeof rngOf>): ModifierId[] {
  const pool = MODIFIERS.filter(m => !m.arenas || m.arenas.includes(arena)), chosen: ModifierDef[] = [];
  for (let guard = 0; chosen.length < n && guard < 40; guard++) {
    const m = pool[Math.floor(r.next() * pool.length)];
    if (chosen.some(c => c.id === m.id || c.conflicts.includes(m.id) || m.conflicts.includes(c.id))) continue;
    chosen.push(m);
  }
  return chosen.map(m => m.id);
}
/** The one generator. `arenaPool` lets the caller restrict arenas to what the player has legitimately unlocked (the ID and seed stay the same either way for a given pool). */
export function makeChallenge(kind: ChallengeKind, id: string, startsAt: number, arenaPool: readonly ArenaId[] = ARENA_IDS): ChallengeDef {
  const seed = idHash(id), r = rngOf(seed), pool = arenaPool.length ? arenaPool : ARENA_IDS;
  const arena = pool[Math.floor(r.next() * pool.length)];
  const heroLocked = r.next() < 0.25, hero = heroLocked ? HERO_IDS[Math.floor(r.next() * HERO_IDS.length)] : null;
  const modifiers = pickModifiers(kind === 'daily' ? 1 : 2, arena, r);
  const startRelic = (arena === 'aetherfall' || arena === 'paradox') && r.next() < 0.5 ? RELIC_IDS.filter(x => (arena === 'aetherfall') === ['halo_prism', 'anchor_of_dawn', 'crownless_sigil', 'skyforge_feather'].includes(x))[Math.floor(r.next() * 4)] : null;
  const realm = arena === 'aetherfall' || arena === 'paradox', bossId = realm ? (arena === 'aetherfall' ? 'castellan' : 'regent') : 'warden';
  // daily: a tight 8-minute run with one boss; weekly: a 15-minute run ending on the arena's finale boss (Classic's Seraph, or the realm's boss)
  const bossAt = kind === 'daily' ? 330 : 780, cap = kind === 'daily' ? 480 : 900;
  const finale: EncounterStep = { id: bossId, kind: 'boss', boss: realm ? bossId : (kind === 'weekly' ? 'seraph' : 'warden'), trigger: 'time', at: bossAt, reward: 'victory', ends: true, warnAt: bossAt - 20, warnText: 'CHALLENGE FINALE', warnSub: 'End it before the clock does', hpMul: kind === 'daily' ? 0.6 : 0.85 };
  const plan: RunPlan = { ...CLASSIC_PLAN, v: PLAN_VERSION, mode: kind === 'daily' ? 'daily_challenge' : 'weekly_challenge', id, name: kind === 'daily' ? 'Daily Challenge' : 'Weekly Challenge', arena, heroLock: hero, duration: cap, steps: [finale], pool: realm ? 'realm' : 'classic', modifiers, unlocks: false, ranked: false, finaleQuietFrom: bossAt - 20, rules: CHALLENGE_RULES_VERSION, threat: kind === 'daily' ? [[0, 4], [90, 12], [240, 24], [330, 30], [480, 30]] : CLASSIC_PLAN.threat };
  const span = kind === 'daily' ? DAY : 7 * DAY;
  return { id, kind, rules: CHALLENGE_RULES_VERSION, seed, arena, hero, modifiers, startRelic, plan, startsAt, endsAt: startsAt + span, cap, scoreRule: 'Victory first, then time remaining, then kills. Modifier bonuses are multipliers.' };
}
export const dailyChallenge = (ms: number, pool?: readonly ArenaId[]) => makeChallenge('daily', dailyId(ms), dayStart(ms), pool);
export const weeklyChallenge = (ms: number, pool?: readonly ArenaId[]) => makeChallenge('weekly', weeklyId(ms), weekStart(ms), pool);
/** Seconds until the next UTC reset (for the countdown). */
export const untilReset = (c: ChallengeDef, ms: number) => Math.max(0, Math.ceil((c.endsAt - ms) / 1000));
export const challengeState = (c: ChallengeDef, ms: number): 'upcoming' | 'live' | 'expired' => (ms < c.startsAt ? 'upcoming' : ms >= c.endsAt ? 'expired' : 'live');
/** Deterministic, comparable score. Defeat scores only what was achieved, so a win always outranks a loss. */
export function challengeScore(c: ChallengeDef, r: { won: boolean; seconds: number; kills: number }): number {
  const bonus = 1 + c.modifiers.reduce((s, m) => s + MODIFIER_BY_ID[m].bonus, 0);
  const base = r.won ? 100_000 + Math.max(0, c.cap - r.seconds) * 50 + r.kills * 10 : Math.min(r.seconds, c.cap) * 20 + r.kills * 5;
  return Math.round(base * bonus);
}
