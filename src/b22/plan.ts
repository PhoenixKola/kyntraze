/** B22 run plans: the single description of what a run IS (which bosses, when, what counts as winning, what is rewarded). Pure data + pure helpers; the sim reads `state.plan`, the UI reads the same object for mode cards. Classic is encoded here exactly as it always ran (480 / 870 / 900 s). */
import type { BossKind } from '../content/enemies';
import { THREAT_CURVE } from '../content/encounters';
import type { ArenaId } from '../content/arenas';
import type { HeroId } from '../content/heroes';
import type { ModifierId } from './challenges';

export const PLAN_VERSION = 1;
export type RunModeId = 'classic' | 'endless' | 'fracture_expedition' | 'boss_rush' | 'daily_challenge' | 'weekly_challenge' | 'vex_trial' | 'campaign';
export const RUN_MODE_IDS: readonly RunModeId[] = ['classic', 'endless', 'fracture_expedition', 'boss_rush', 'daily_challenge', 'weekly_challenge', 'vex_trial', 'campaign'];
export type StepKind = 'boss' | 'relic' | 'elite_wave' | 'hold';
/** What defeating a boss step pays: the Warden-style heal + a guaranteed rare pick, a relic offer, nothing extra, or the end of the run. */
export type StepReward = 'heal_pick' | 'relic' | 'none' | 'victory';
export interface EncounterStep {
  id: string; kind: StepKind; boss?: BossKind;
  /** 'time': `at` is run seconds. 'after_prev': `at` is seconds after the previous step finished (boss rush intermission). */
  trigger: 'time' | 'after_prev'; at: number; reward: StepReward;
  /** the run is won when this step completes */ ends?: boolean;
  /** run time of the pre-arrival warning, and its text */ warnAt?: number; warnText?: string; warnSub?: string;
  /** boss health multiplier for shorter tracks (1 = full) */ hpMul?: number;
  /** elite_wave: which mobs to drop (kind, count) */ wave?: { kind: string; n: number }[];
  /** hold: seconds the player must survive from the step's start; the step completes when they have */ hold?: number;
  /** the act this step opens, for the HUD */ act?: number;
}
export type MobPolicy = 'full' | 'adds' | 'none';
export type EnemyPool = 'classic' | 'realm';
export interface ActDef { at: number; name: string; blurb: string }
export interface RunPlan {
  v: number; mode: RunModeId; id: string; name: string; blurb: string; arena: ArenaId | null; heroLock: HeroId | null;
  /** seconds the run is capped at (0 = no cap) */ duration: number;
  steps: EncounterStep[]; pool: EnemyPool; mobs: MobPolicy;
  threat: readonly (readonly [number, number])[]; breathers: boolean; finaleQuietFrom: number | null;
  acts: ActDef[]; /** classic unlock rules (Cometheart, Stillfire, hero forms) apply only here */ unlocks: boolean;
  /** which records / ledgers this run writes to, and whether the run may enter ranked boards (server verification decides the rest) */ ranked: boolean; practice: boolean;
  /** between-boss heal fraction in boss rush */ interHeal: number;
  /** extra rules a challenge carries (ids in b22/challenges.ts) */ modifiers: ModifierId[];
  /** endless: seconds per escalation cycle (0 = not endless) */ cycle: number;
  /** a seed contract version; bumped when spawn / content generation changes */ rules: number;
}

export const mk = (p: Partial<RunPlan> & Pick<RunPlan, 'mode' | 'id' | 'name' | 'steps'>): RunPlan => ({ v: PLAN_VERSION, blurb: '', arena: null, heroLock: null, duration: 0, pool: 'classic', mobs: 'full', threat: THREAT_CURVE, breathers: true, finaleQuietFrom: null, acts: [], unlocks: false, ranked: false, practice: false, interHeal: 0, modifiers: [], cycle: 0, rules: 1, ...p });

export const FINALE_WARN = 870;
/** Classic: the original 15-minute Warden + Seraph campaign. Boss times are NOT tunable per run. */
export const CLASSIC_PLAN: RunPlan = mk({
  mode: 'classic', id: 'classic', name: 'Classic', blurb: 'The original 15-minute campaign: the Fracture Warden at 8:00, the Null Seraph at 15:00.', unlocks: true, ranked: true, finaleQuietFrom: FINALE_WARN,
  steps: [
    { id: 'warden', kind: 'boss', boss: 'warden', trigger: 'time', at: 480, reward: 'heal_pick' },
    { id: 'seraph', kind: 'boss', boss: 'seraph', trigger: 'time', at: 900, reward: 'victory', ends: true, warnAt: FINALE_WARN, warnText: 'THE NULL SERAPH APPROACHES', warnSub: 'Hold your ground. End it.' },
  ],
});

/** Endless: entered only by an explicit choice after a Classic victory (or started directly as a 0:00 survival variant). Every `cycle` seconds the mix, the budget and the boss rotation escalate. */
export const ENDLESS_CYCLE = 300;
export const ENDLESS_BOSS_ROTATION: readonly BossKind[] = ['warden', 'seraph', 'castellan', 'regent', 'mirror_tyrant', 'chronophage', 'hollow_choir', 'sovereign'];
export const ENDLESS_PLAN: RunPlan = mk({ mode: 'endless', id: 'endless', name: 'Endless', blurb: 'Survive the Fracture. Every five minutes the pressure changes shape; extract at a milestone to keep your rewards.', cycle: ENDLESS_CYCLE, steps: [], breathers: true, ranked: true });

export const EXPEDITION_LENGTH = 1200;
const expeditionSteps = (arena: 'aetherfall' | 'paradox'): EncounterStep[] => {
  const boss: BossKind = arena === 'aetherfall' ? 'castellan' : 'regent';
  const wave = arena === 'aetherfall' ? [{ kind: 'citadel_bulwark', n: 2 }, { kind: 'sky_lancer', n: 3 }] : [{ kind: 'rift_mimic', n: 3 }, { kind: 'phase_harrier', n: 3 }];
  return [
    { id: 'shrine1', kind: 'relic', trigger: 'time', at: 330, reward: 'relic', act: 1, warnAt: 320, warnText: 'A RELIC SHRINE STIRS', warnSub: 'Choose one realm relic' },
    { id: 'gauntlet', kind: 'elite_wave', trigger: 'time', at: 600, reward: 'relic', act: 2, wave, warnAt: 585, warnText: arena === 'aetherfall' ? 'SIEGE OF THE GATE' : 'THE FOLD OPENS', warnSub: 'Break the elite wave to claim a relic' },
    { id: boss, kind: 'boss', boss, trigger: 'time', at: 1080, reward: 'victory', ends: true, act: 3, warnAt: 1050, warnText: boss === 'castellan' ? 'THE CROWNLESS CASTELLAN RISES' : 'THE PARADOX REGENT UNFOLDS', warnSub: 'End the expedition.' },
  ];
};
const EXPEDITION_THREAT: readonly (readonly [number, number])[] = [[0, 3], [60, 7], [180, 14], [360, 22], [600, 32], [780, 38], [960, 46], [1080, 50], [1200, 50]];
export const expeditionPlan = (arena: 'aetherfall' | 'paradox'): RunPlan => mk({
  mode: 'fracture_expedition', id: `expedition_${arena}`, name: arena === 'aetherfall' ? 'Fracture Expedition: Aetherfall' : 'Fracture Expedition: Paradox', arena, pool: 'realm', ranked: true, duration: EXPEDITION_LENGTH + 120, threat: EXPEDITION_THREAT, finaleQuietFrom: 1050,
  blurb: 'A 20-minute, three-act run through a new realm with its own enemies, hazards, relics and a final boss.',
  acts: [{ at: 0, name: 'ACT I', blurb: 'Learn the realm' }, { at: 360, name: 'ACT II', blurb: 'Rising pressure' }, { at: 780, name: 'ACT III', blurb: 'The crown falls' }],
  steps: expeditionSteps(arena),
});

export type BossRushTrack = 'initiation' | 'veteran' | 'sovereign_trial';
export const BOSS_RUSH_TRACKS: Record<BossRushTrack, { name: string; blurb: string; bosses: BossKind[]; hpMul: number; heal: number }> = {
  initiation: { name: 'Initiation Gauntlet', blurb: 'Three tuned fights with a clear reward.', bosses: ['warden', 'castellan', 'mirror_tyrant'], hpMul: 0.7, heal: 0.4 },
  veteran: { name: 'Veteran Gauntlet', blurb: 'Five fights, rising pattern complexity.', bosses: ['warden', 'seraph', 'regent', 'chronophage', 'hollow_choir'], hpMul: 0.75, heal: 0.3 },
  sovereign_trial: { name: 'Sovereign Trial', blurb: 'The curated road to the Sovereign.', bosses: ['mirror_tyrant', 'chronophage', 'hollow_choir', 'oathkeeper', 'sovereign'], hpMul: 0.8, heal: 0.25 },
};
export function bossRushPlan(track: BossRushTrack, practice = false): RunPlan {
  const t = BOSS_RUSH_TRACKS[track];
  const steps: EncounterStep[] = t.bosses.map((b, i) => ({ id: `${b}_${i}`, kind: 'boss' as const, boss: b, trigger: i === 0 ? 'time' as const : 'after_prev' as const, at: i === 0 ? 4 : 8, reward: i === t.bosses.length - 1 ? 'victory' as const : 'heal_pick' as const, ends: i === t.bosses.length - 1, hpMul: t.hpMul, warnText: `${t.name.toUpperCase()} · ${i + 1} / ${t.bosses.length}`, warnSub: b.replace(/_/g, ' ').toUpperCase() }));
  return mk({ mode: 'boss_rush', id: `boss_rush_${track}${practice ? '_practice' : ''}`, name: t.name, blurb: t.blurb, steps, mobs: 'adds', breathers: false, ranked: !practice, practice, interHeal: t.heal, threat: [[0, 0], [30, 6], [600, 10]] });
}

/** Vex's Trial of the Oathbroken: three authored chapters. The chapter table lives in b22/story.ts. */
export const vexChapterPlan = (chapter: 1 | 2 | 3): RunPlan => mk({
  mode: 'vex_trial', id: `vex_trial_${chapter}`, name: ['The Broken Oath', 'The Fractured Accord', 'Judgment of the Exile'][chapter - 1], heroLock: 'vex', arena: chapter === 3 ? 'paradox' : 'gloam', ranked: false,
  mobs: chapter === 3 ? 'none' : 'full', breathers: false, duration: chapter === 1 ? 240 : chapter === 2 ? 420 : 0,
  threat: chapter === 1 ? [[0, 2], [60, 5], [240, 8]] : [[0, 3], [60, 8], [180, 14], [420, 20]],
  steps: chapter === 3 ? [{ id: 'oathkeeper', kind: 'boss', boss: 'oathkeeper', trigger: 'time', at: 3, reward: 'victory', ends: true, warnText: 'THE OATHKEEPER', warnSub: 'Judgment of the Exile' }]
    : chapter === 2 ? [{ id: 'oath_herald', kind: 'boss', boss: 'oathkeeper', trigger: 'time', at: 300, reward: 'victory', ends: true, hpMul: 0.45, warnAt: 285, warnText: 'A SHADOW OF THE ORDER', warnSub: 'The Oathkeeper tests you' }]
    : [{ id: 'trial1', kind: 'elite_wave', trigger: 'time', at: 150, reward: 'victory', ends: true, wave: [{ kind: 'aegis', n: 1 }, { kind: 'pursuer', n: 4 }] }],
});

export const planFor = (mode: RunModeId, opts: { arena?: ArenaId; track?: BossRushTrack; chapter?: 1 | 2 | 3; practice?: boolean } = {}): RunPlan => {
  switch (mode) {
    case 'endless': return ENDLESS_PLAN;
    case 'fracture_expedition': return expeditionPlan(opts.arena === 'paradox' ? 'paradox' : 'aetherfall');
    case 'boss_rush': return bossRushPlan(opts.track ?? 'initiation', opts.practice);
    case 'vex_trial': return vexChapterPlan(opts.chapter ?? 1);
    default: return CLASSIC_PLAN;
  }
};

export const stepById = (plan: RunPlan, id: string) => plan.steps.find(s => s.id === id);
export const planEndsOn = (plan: RunPlan): EncounterStep | undefined => plan.steps.find(s => s.ends);
/** Threat budget on a plan's own curve (linear interpolation, same contract as encounters.threatBudget). */
export function planBudget(plan: RunPlan, t: number): number {
  const c = plan.threat; if (!c.length) return 0; if (t <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (t <= c[i][0]) { const [t0, v0] = c[i - 1], [t1, v1] = c[i]; return v0 + (v1 - v0) * ((t - t0) / (t1 - t0)); }
  return c[c.length - 1][1];
}
/** The versioned seed contract: everything that must match for two runs to be the same run. */
export interface SeedContract { v: number; seed: number; mode: RunModeId; planId: string; rules: number; arena: ArenaId; hero: HeroId; players: HeroId[]; challengeId: string | null; branches: string[]; relics: string[]; modifiers: string[] }
export const seedContract = (c: Omit<SeedContract, 'v'>): SeedContract => ({ v: PLAN_VERSION, ...c });
export const contractKey = (c: SeedContract) => [c.v, c.seed >>> 0, c.mode, c.planId, c.rules, c.arena, c.hero, c.players.join('+'), c.challengeId ?? '-', [...c.modifiers].sort().join(',')].join('|');
/** Stable sub-streams: unrelated systems (UI, FX, network, new content) never consume the main simulation RNG, so Classic replays identically. */
export function streamSeed(seed: number, stream: string): number { let h = (seed >>> 0) ^ 0x9e3779b9; for (let i = 0; i < stream.length; i++) { h = Math.imul(h ^ stream.charCodeAt(i), 16777619); h ^= h >>> 15; } return h >>> 0; }
