import type { ArenaId } from './arenas';
import type { UpgradeCategory } from './upgrades';

/** B18 meta-progression catalogue: one currency (Fracture Marks), starting boons (one equipped), run tools, profile crests, opt-in contracts, feats and per-arena mastery. Numbers are first-pass (tuned in B20). */
export const CURRENCY = { name: 'FRACTURE MARKS', short: 'MARKS' } as const;

export type BoonId = 'bulwark' | 'swift' | 'magnet' | 'spark' | 'scholar';
export type ContractId = 'overrun' | 'glass' | 'pressure' | 'nosw';
export type UnlockId = `boon_${BoonId}` | 'tool_reroll' | 'tool_banish' | 'crest_ember' | 'crest_warden' | 'crest_silver';
export type UnlockKind = 'boon' | 'tool' | 'crest';
/** What an unlock needs besides marks: a feat already earned. */
export interface Req { feat?: FeatId; runs?: number; label: string }
export interface UnlockDef { id: UnlockId; kind: UnlockKind; name: string; blurb: string; /** the honest in-run effect (or COSMETIC) */ effect: string; cost: number; req?: Req; icon: string; cosmetic?: boolean }

export const UNLOCKS: UnlockDef[] = [
  { id: 'boon_bulwark', kind: 'boon', name: 'BULWARK START', blurb: 'Deploy with a reinforced frame.', effect: '+20 max health at the start of a run', cost: 15, icon: 'boon_bulwark' },
  { id: 'boon_swift', kind: 'boon', name: 'SWIFT START', blurb: 'Light boots, faster first minutes.', effect: '+8% move speed for the whole run', cost: 20, icon: 'boon_swift' },
  { id: 'boon_magnet', kind: 'boon', name: 'SALVAGE START', blurb: 'Crystals drift toward you from the first wave.', effect: '+40% crystal pull radius', cost: 20, icon: 'boon_magnet' },
  { id: 'boon_spark', kind: 'boon', name: 'SPARK START', blurb: 'The Drive gauge is already warm.', effect: 'Start with 25% Drive', cost: 25, icon: 'boon_spark' },
  { id: 'boon_scholar', kind: 'boon', name: 'SCHOLAR START', blurb: 'Learn faster, level sooner.', effect: '+10% XP from crystals', cost: 35, req: { runs: 3, label: 'Complete 3 runs' }, icon: 'boon_scholar' },
  { id: 'tool_reroll', kind: 'tool', name: 'REROLL MODULE', blurb: 'Redraw a level-up offer you dislike.', effect: '2 rerolls per run (R on the level-up screen)', cost: 60, req: { runs: 2, label: 'Complete 2 runs' }, icon: 'tool_reroll' },
  { id: 'tool_banish', kind: 'tool', name: 'BANISH MODULE', blurb: 'Strike one card from this run for good.', effect: '2 banishes per run (Shift+1/2/3 or the Banish button)', cost: 60, req: { feat: 'warden_down', label: 'Defeat the Fracture Warden' }, icon: 'tool_banish' },
  { id: 'crest_ember', kind: 'crest', name: 'EMBER CREST', blurb: 'A brass-and-ember profile crest.', effect: 'COSMETIC: shown on your profile and results', cost: 15, cosmetic: true, icon: 'crest_ember' },
  { id: 'crest_warden', kind: 'crest', name: 'WARDEN CREST', blurb: 'Struck from the Warden’s own armor.', effect: 'COSMETIC: shown on your profile and results', cost: 0, req: { feat: 'warden_down', label: 'Defeat the Fracture Warden' }, cosmetic: true, icon: 'crest_warden' },
  { id: 'crest_silver', kind: 'crest', name: 'SILVER CREST', blurb: 'Earned where the Seraph fell.', effect: 'COSMETIC: shown on your profile and results', cost: 0, req: { feat: 'first_win', label: 'Defeat the Null Seraph' }, cosmetic: true, icon: 'crest_silver' },
];
export const UNLOCK_BY_ID = Object.fromEntries(UNLOCKS.map(u => [u.id, u])) as Record<UnlockId, UnlockDef>;
export const BOON_IDS: BoonId[] = ['bulwark', 'swift', 'magnet', 'spark', 'scholar'];
export const RUN_TOOLS = { rerolls: 2, banishes: 2 } as const;

export interface ContractDef { id: ContractId; name: string; blurb: string; /** what actually changes, in player words */ rule: string; bonus: number; req?: Req; icon: string }
export const CONTRACTS: ContractDef[] = [
  { id: 'overrun', name: 'OVERRUN PROTOCOL', blurb: 'The fracture floods the arena.', rule: 'Enemies arrive about 40% faster. Boss schedule unchanged.', bonus: 30, req: { runs: 1, label: 'Complete 1 run' }, icon: 'ct_overrun' },
  { id: 'glass', name: 'GLASS VANGUARD', blurb: 'One mistake costs more.', rule: 'Maximum health is reduced to 60%.', bonus: 30, req: { runs: 2, label: 'Complete 2 runs' }, icon: 'ct_glass' },
  { id: 'pressure', name: 'RELIC PRESSURE', blurb: 'The arena itself turns on you.', rule: 'Arena hazards fire about 40% more often (always telegraphed).', bonus: 25, req: { runs: 2, label: 'Complete 2 runs' }, icon: 'ct_pressure' },
  { id: 'nosw', name: 'NO SECOND WIND', blurb: 'There is no coming back.', rule: 'Second Wind never appears in level-up offers.', bonus: 20, req: { feat: 'warden_down', label: 'Defeat the Fracture Warden' }, icon: 'ct_nosw' },
];
export const CONTRACT_BY_ID = Object.fromEntries(CONTRACTS.map(c => [c.id, c])) as Record<ContractId, ContractDef>;
/** Run-rule numbers the sim reads (kept here so the card text and the game cannot disagree). */
export const CONTRACT_RULES = { overrunSpawn: 0.72, glassHp: 0.6, pressureHazard: 0.7 } as const;

export type FeatId = 'first_run' | 'first_win' | 'warden_down' | 'wins5' | 'gloam_win' | 'ashen_win' | 'flare' | 'comet' | 'apex' | 'specialist' | 'survivor10' | 'contract_win' | 'hunter' | 'level20' | 'ren_ascend' | 'sora_ascend';
export interface FeatDef { id: FeatId; name: string; blurb: string; reward: number; /** lifetime goal shown as progress when the feat counts something */ goal?: number; icon: string }
export const FEATS: FeatDef[] = [
  { id: 'first_run', name: 'FIRST FRACTURE', blurb: 'Complete a run.', reward: 5, icon: 'ft_first_run' },
  { id: 'warden_down', name: 'WARDEN BREAKER', blurb: 'Defeat the Fracture Warden.', reward: 20, icon: 'ft_warden' },
  { id: 'first_win', name: 'THE FRACTURE HOLDS', blurb: 'Defeat the Null Seraph.', reward: 40, icon: 'ft_win' },
  { id: 'gloam_win', name: 'CIRCUIT SEALED', blurb: 'Win in the Gloam Circuit.', reward: 15, icon: 'ft_gloam' },
  { id: 'ashen_win', name: 'RELIQUARY SEALED', blurb: 'Win in the Ashen Reliquary.', reward: 15, icon: 'ft_ashen' },
  { id: 'wins5', name: 'VETERAN', blurb: 'Win 5 runs.', reward: 40, goal: 5, icon: 'ft_veteran' },
  { id: 'flare', name: 'IGNITION', blurb: 'Awaken Flarebound.', reward: 10, icon: 'ft_flare' },
  { id: 'comet', name: 'COMETHEART', blurb: 'Awaken Cometheart.', reward: 15, icon: 'ft_comet' },
  { id: 'apex', name: 'STILLFIRE', blurb: 'Awaken Stillfire Apex.', reward: 25, icon: 'ft_apex' },
  { id: 'ren_ascend', name: 'CRIMSON ASCENDANT', blurb: "Awaken Ren's crimson transformation.", reward: 20, icon: 'ft_flare' },
  { id: 'sora_ascend', name: 'AZURE SOVEREIGN', blurb: "Awaken Sora's azure transformation.", reward: 20, icon: 'ft_comet' },
  { id: 'specialist', name: 'SPECIALIST', blurb: 'End a run with 8 upgrades in one category.', reward: 15, icon: 'ft_specialist' },
  { id: 'survivor10', name: 'TEN MINUTES', blurb: 'Survive 10:00.', reward: 15, icon: 'ft_survivor' },
  { id: 'level20', name: 'OVERCLOCKED', blurb: 'Reach level 20.', reward: 15, icon: 'ft_level' },
  { id: 'contract_win', name: 'UNDER CONTRACT', blurb: 'Win with a contract active.', reward: 35, icon: 'ft_contract' },
  { id: 'hunter', name: 'HORDE BREAKER', blurb: 'Eliminate 1,000 enemies across all runs.', reward: 20, goal: 1000, icon: 'ft_hunter' },
];
export const FEAT_BY_ID = Object.fromEntries(FEATS.map(f => [f.id, f])) as Record<FeatId, FeatDef>;

export interface MasteryDef { id: string; name: string; blurb: string; reward: number }
export const MASTERY: Record<ArenaId, MasteryDef[]> = {
  gloam: [
    { id: 'clear', name: 'Seal the Circuit', blurb: 'Win a run here.', reward: 12 },
    { id: 'long', name: 'Long Haul', blurb: 'Survive 10:00 here.', reward: 12 },
    { id: 'warden', name: 'Circuit Breaker', blurb: 'Defeat the Warden here.', reward: 12 },
  ],
  ashen: [
    { id: 'clear', name: 'Seal the Reliquary', blurb: 'Win a run here.', reward: 12 },
    { id: 'long', name: 'Ash Walker', blurb: 'Survive 10:00 here.', reward: 12 },
    { id: 'warden', name: 'Ritual Breaker', blurb: 'Defeat the Warden here.', reward: 12 },
  ],
  aetherfall: [
    { id: 'clear', name: 'Reclaim the Citadel', blurb: 'Defeat the Crownless Castellan here.', reward: 15 },
    { id: 'long', name: 'Skywalker', blurb: 'Survive 10:00 here.', reward: 12 },
    { id: 'warden', name: 'Fallen Crown', blurb: 'Defeat the Castellan in a run that lasted 10:00 or more.', reward: 12 },
  ],
  paradox: [
    { id: 'clear', name: 'Unfold the Expanse', blurb: 'Defeat the Paradox Regent here.', reward: 15 },
    { id: 'long', name: 'Echo Walker', blurb: 'Survive 10:00 here.', reward: 12 },
    { id: 'warden', name: 'Shattered Reflection', blurb: 'Defeat the Regent in a run that lasted 10:00 or more.', reward: 12 },
  ],
};

/** Mark earnings for one completed run. */
export const EARN = { perSurvivalStep: 1, survivalStepSeconds: 20, survivalCap: 45, killStep: 40, killCap: 20, warden: 15, seraph: 25, victory: 40 } as const;
export const CATEGORY_FEAT_STACKS = 8 as const;
export type { UpgradeCategory };
