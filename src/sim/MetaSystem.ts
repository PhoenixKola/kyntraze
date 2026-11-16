import { ARENA_IDS, type ArenaId } from '../content/arenas';
import { HERO_IDS, isHeroId, type HeroId } from '../content/heroes';
import { BOON_IDS, CATEGORY_FEAT_STACKS, CONTRACT_BY_ID, CONTRACTS, EARN, FEATS, FEAT_BY_ID, MASTERY, UNLOCKS, UNLOCK_BY_ID, type BoonId, type ContractId, type FeatId, type Req, type UnlockId } from '../content/meta';

/** B18 persistent meta state. Pure data + pure functions: every operation returns a NEW state, so a purchase / grant is atomic with respect to the app's state model. */
export interface ArenaRecord { runs: number; wins: number; bestSeconds: number; bestScore: number; bestLevel: number; wardenKills: number; seraphKills: number }
export interface Counters { runs: number; wins: number; deaths: number; kills: number; wardenKills: number; seraphKills: number }
export interface MetaState {
  v: 1; marks: number; lifetime: number; owned: UnlockId[]; boon: BoonId | null; contract: ContractId | null; crest: UnlockId | null;
  /** feat id -> the lifetime run count when it was earned (0 = credited from a legacy save) */
  feats: Partial<Record<FeatId, number>>; mastery: Record<string, true>; counters: Counters; arenas: Record<ArenaId, ArenaRecord>;
  /** ids of runs whose reward was already granted (newest last, capped) */ granted: string[]; introSeen: boolean; legacyGift: number;
  /** B19 (additive): per-runner record */ heroes: Record<HeroId, HeroRecord>;
}
export interface HeroRecord { runs: number; wins: number; bestSeconds: number; wardenKills: number }
export interface RunResult { /** B19: who played (omitted = Kai) */ hero?: HeroId; runId: string; arena: ArenaId; won: boolean; seconds: number; kills: number; level: number; score: number; wardenKills: number; seraphKills: number; formsUsed: number[]; maxCategoryStacks: number; contract: ContractId | null }
export interface RewardLine { label: string; marks: number }
export interface RunReward { lines: RewardLine[]; total: number; newFeats: FeatId[]; newMastery: string[]; unlocked: UnlockId[]; balance: number; contract: ContractId | null; contractDone: boolean; firstRun: boolean }

export const MARKS_CAP = 999_999, GRANTED_KEEP = 40;
const clampInt = (v: unknown, lo: number, hi: number, d = lo) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d);
const blankRecord = (): ArenaRecord => ({ runs: 0, wins: 0, bestSeconds: 0, bestScore: 0, bestLevel: 0, wardenKills: 0, seraphKills: 0 });
export const blankMeta = (): MetaState => ({ v: 1, marks: 0, lifetime: 0, owned: [], boon: null, contract: null, crest: null, feats: {}, mastery: {}, counters: { runs: 0, wins: 0, deaths: 0, kills: 0, wardenKills: 0, seraphKills: 0 }, arenas: { gloam: blankRecord(), ashen: blankRecord() }, granted: [], introSeen: false, legacyGift: 0, heroes: blankHeroes() });
function blankHeroes(): Record<HeroId, HeroRecord> { return { kai: { runs: 0, wins: 0, bestSeconds: 0, wardenKills: 0 }, ren: { runs: 0, wins: 0, bestSeconds: 0, wardenKills: 0 }, sora: { runs: 0, wins: 0, bestSeconds: 0, wardenKills: 0 } }; }

export interface LegacyFacts { cometheart: boolean; stillfire: boolean; victory: boolean; hadRun: boolean }
/** Idempotent. A save without `meta` is credited ONCE from what it already earned (Warden / Seraph milestones become feats and a one-time marks gift); an existing `meta` is only sanitised. Bad data falls back per field, never wholesale. */
export function migrateMeta(raw: unknown, legacy: LegacyFacts): MetaState {
  const m = blankMeta();
  if (typeof raw !== 'object' || raw === null || (raw as { v?: unknown }).v !== 1) {
    const credit = (id: FeatId) => { m.feats[id] = 0; };
    if (legacy.hadRun) { credit('first_run'); m.counters.runs = 1; }
    if (legacy.cometheart) { credit('warden_down'); m.counters.wardenKills = 1; m.arenas.gloam.wardenKills = 0; }
    if (legacy.stillfire || legacy.victory) { credit('first_win'); credit('warden_down'); m.counters.wins = 1; m.counters.wardenKills = Math.max(1, m.counters.wardenKills); m.counters.seraphKills = 1; }
    m.legacyGift = (legacy.cometheart ? 30 : 0) + (legacy.stillfire || legacy.victory ? 50 : 0); m.marks = m.legacyGift; m.lifetime = m.legacyGift;
    return m;
  }
  const r = raw as Record<string, unknown>;
  m.marks = clampInt(r.marks, 0, MARKS_CAP); m.lifetime = clampInt(r.lifetime, m.marks, 1e9, m.marks); m.introSeen = r.introSeen === true; m.legacyGift = clampInt(r.legacyGift, 0, 1000);
  m.owned = Array.isArray(r.owned) ? [...new Set(r.owned.filter((x): x is UnlockId => typeof x === 'string' && x in UNLOCK_BY_ID))] : [];
  m.boon = typeof r.boon === 'string' && (BOON_IDS as string[]).includes(r.boon) && m.owned.includes(`boon_${r.boon}` as UnlockId) ? r.boon as BoonId : null;
  m.contract = typeof r.contract === 'string' && r.contract in CONTRACT_BY_ID ? r.contract as ContractId : null;
  m.crest = typeof r.crest === 'string' && m.owned.includes(r.crest as UnlockId) && UNLOCK_BY_ID[r.crest as UnlockId]?.kind === 'crest' ? r.crest as UnlockId : null;
  if (typeof r.feats === 'object' && r.feats) for (const f of FEATS) { const v = (r.feats as Record<string, unknown>)[f.id]; if (typeof v === 'number' && Number.isFinite(v)) m.feats[f.id] = Math.max(0, Math.floor(v)); }
  if (typeof r.mastery === 'object' && r.mastery) for (const a of ARENA_IDS) for (const d of MASTERY[a]) if ((r.mastery as Record<string, unknown>)[`${a}.${d.id}`] === true) m.mastery[`${a}.${d.id}`] = true;
  const c = (typeof r.counters === 'object' && r.counters ? r.counters : {}) as Record<string, unknown>;
  for (const k of Object.keys(m.counters) as (keyof Counters)[]) m.counters[k] = clampInt(c[k], 0, 1e9);
  const ar = (typeof r.arenas === 'object' && r.arenas ? r.arenas : {}) as Record<string, Record<string, unknown>>;
  for (const a of ARENA_IDS) for (const k of Object.keys(m.arenas[a]) as (keyof ArenaRecord)[]) m.arenas[a][k] = clampInt(ar[a]?.[k], 0, 1e9);
  const hr = (typeof r.heroes === 'object' && r.heroes ? r.heroes : {}) as Record<string, Record<string, unknown>>;
  for (const h of HERO_IDS) for (const k of Object.keys(m.heroes[h]) as (keyof HeroRecord)[]) m.heroes[h][k] = clampInt(hr[h]?.[k], 0, 1e9);
  m.granted = Array.isArray(r.granted) ? r.granted.filter((x): x is string => typeof x === 'string').slice(-GRANTED_KEEP) : [];
  return m;
}

export function reqMet(m: MetaState, req?: Req): boolean { return !req || ((!req.feat || m.feats[req.feat] !== undefined) && (!req.runs || m.counters.runs >= req.runs)); }
export const contractAvailable = (m: MetaState, id: ContractId) => reqMet(m, CONTRACT_BY_ID[id].req);

export type Refusal = 'unknown' | 'owned' | 'locked' | 'funds';
export function purchase(m: MetaState, id: UnlockId): { meta: MetaState; ok: boolean; reason?: Refusal } {
  const u = UNLOCK_BY_ID[id]; if (!u) return { meta: m, ok: false, reason: 'unknown' };
  if (m.owned.includes(id)) return { meta: m, ok: false, reason: 'owned' };
  if (!reqMet(m, u.req)) return { meta: m, ok: false, reason: 'locked' };
  if (m.marks < u.cost) return { meta: m, ok: false, reason: 'funds' };
  const next: MetaState = { ...m, marks: m.marks - u.cost, owned: [...m.owned, id] };
  if (u.kind === 'boon' && !next.boon) next.boon = id.slice(5) as BoonId;   // the first boon you buy is equipped so a purchase always visibly does something
  if (u.kind === 'crest' && !next.crest) next.crest = id;
  return { meta: next, ok: true };
}
export function equipBoon(m: MetaState, boon: BoonId | null): MetaState { return boon === null ? { ...m, boon: null } : m.owned.includes(`boon_${boon}` as UnlockId) ? { ...m, boon } : m; }
export function setContract(m: MetaState, id: ContractId | null): MetaState { return id === null ? { ...m, contract: null } : contractAvailable(m, id) ? { ...m, contract: id } : m; }
export function equipCrest(m: MetaState, id: UnlockId | null): MetaState { return id === null ? { ...m, crest: null } : m.owned.includes(id) && UNLOCK_BY_ID[id]?.kind === 'crest' ? { ...m, crest: id } : m; }

export function featProgress(m: MetaState, id: FeatId): { done: boolean; value: number; goal: number } {
  const def = FEAT_BY_ID[id], done = m.feats[id] !== undefined;
  const value = id === 'wins5' ? m.counters.wins : id === 'hunter' ? m.counters.kills : done ? 1 : 0, goal = def.goal ?? 1;
  return { done, value: Math.min(value, goal), goal };
}
export const masteryDone = (m: MetaState, arena: ArenaId, id: string) => m.mastery[`${arena}.${id}`] === true;
export function masteryProgress(rec: ArenaRecord, id: string): { value: number; goal: number } {
  return id === 'clear' ? { value: Math.min(1, rec.wins), goal: 1 } : id === 'long' ? { value: Math.min(600, rec.bestSeconds), goal: 600 } : { value: Math.min(1, rec.wardenKills), goal: 1 };
}

const available = (m: MetaState) => UNLOCKS.filter(u => !m.owned.includes(u.id) && reqMet(m, u.req)).map(u => u.id);
export function computeEarnings(r: RunResult): RewardLine[] {
  const lines: RewardLine[] = [];
  const surv = Math.min(EARN.survivalCap, Math.floor(r.seconds / EARN.survivalStepSeconds) * EARN.perSurvivalStep); if (surv > 0) lines.push({ label: 'SURVIVAL', marks: surv });
  const kills = Math.min(EARN.killCap, Math.floor(r.kills / EARN.killStep)); if (kills > 0) lines.push({ label: 'ELIMINATIONS', marks: kills });
  if (r.wardenKills > 0) lines.push({ label: 'FRACTURE WARDEN', marks: EARN.warden });
  if (r.seraphKills > 0) lines.push({ label: 'NULL SERAPH', marks: EARN.seraph });
  if (r.won) lines.push({ label: 'VICTORY', marks: EARN.victory });
  if (r.won && r.contract) lines.push({ label: CONTRACT_BY_ID[r.contract].name, marks: CONTRACT_BY_ID[r.contract].bonus });
  return lines;
}

/** Records the run, awards marks / feats / mastery exactly once per `runId`, and returns the breakdown for the Results screen. A repeated id is a no-op (reward: null). */
export function finalizeRun(prev: MetaState, r: RunResult): { meta: MetaState; reward: RunReward | null } {
  if (!r.runId || prev.granted.includes(r.runId)) return { meta: prev, reward: null };
  const m: MetaState = { ...prev, owned: [...prev.owned], feats: { ...prev.feats }, mastery: { ...prev.mastery }, counters: { ...prev.counters }, arenas: { gloam: { ...prev.arenas.gloam }, ashen: { ...prev.arenas.ashen } }, granted: [...prev.granted], heroes: { kai: { ...prev.heroes.kai }, ren: { ...prev.heroes.ren }, sora: { ...prev.heroes.sora } } };
  const before = available(prev), firstRun = prev.counters.runs === 0;
  const seconds = Math.max(0, Number.isFinite(r.seconds) ? r.seconds : 0), kills = clampInt(r.kills, 0, 1e6);
  const run: RunResult = { ...r, seconds, kills };
  const c = m.counters; c.runs++; c.kills = Math.min(1e9, c.kills + kills); if (r.won) c.wins++; else c.deaths++; c.wardenKills += r.wardenKills > 0 ? 1 : 0; c.seraphKills += r.seraphKills > 0 ? 1 : 0;
  const a = m.arenas[r.arena]; a.runs++; if (r.won) a.wins++; a.bestSeconds = Math.max(a.bestSeconds, Math.floor(seconds)); a.bestScore = Math.max(a.bestScore, clampInt(r.score, 0, 1e9)); a.bestLevel = Math.max(a.bestLevel, clampInt(r.level, 0, 1e4)); a.wardenKills += r.wardenKills > 0 ? 1 : 0; a.seraphKills += r.seraphKills > 0 ? 1 : 0;
  { const hid: HeroId = isHeroId(r.hero) ? r.hero : 'kai', h = m.heroes[hid]; h.runs++; if (r.won) h.wins++; h.bestSeconds = Math.max(h.bestSeconds, Math.floor(seconds)); h.wardenKills += r.wardenKills > 0 ? 1 : 0; }
  const lines = computeEarnings(run), newFeats: FeatId[] = [], newMastery: string[] = [];
  const earn = (id: FeatId, ok: boolean) => { if (ok && m.feats[id] === undefined) { m.feats[id] = c.runs; newFeats.push(id); lines.push({ label: `FEAT · ${FEAT_BY_ID[id].name}`, marks: FEAT_BY_ID[id].reward }); } };
  earn('first_run', c.runs >= 1); earn('warden_down', c.wardenKills >= 1); earn('first_win', c.wins >= 1); earn('gloam_win', m.arenas.gloam.wins >= 1); earn('ashen_win', m.arenas.ashen.wins >= 1); earn('wins5', c.wins >= 5);
  earn('flare', r.formsUsed.includes(1)); earn('comet', r.formsUsed.includes(2)); earn('apex', r.formsUsed.includes(3)); earn('ren_ascend', r.formsUsed.includes(10)); earn('sora_ascend', r.formsUsed.includes(11)); earn('specialist', r.maxCategoryStacks >= CATEGORY_FEAT_STACKS);
  earn('survivor10', seconds >= 600); earn('level20', r.level >= 20); earn('contract_win', r.won && !!r.contract); earn('hunter', c.kills >= 1000);
  for (const d of MASTERY[r.arena]) {
    const key = `${r.arena}.${d.id}`, p = masteryProgress(a, d.id);
    if (!m.mastery[key] && p.value >= p.goal) { m.mastery[key] = true; newMastery.push(key); lines.push({ label: `MASTERY · ${d.name.toUpperCase()}`, marks: d.reward }); }
  }
  const total = Math.max(0, lines.reduce((s, l) => s + l.marks, 0));
  m.marks = Math.min(MARKS_CAP, m.marks + total); m.lifetime = Math.min(1e9, m.lifetime + total);
  m.granted = [...m.granted, r.runId].slice(-GRANTED_KEEP);
  const unlocked = available(m).filter(id => !before.includes(id));
  return { meta: m, reward: { lines, total, newFeats, newMastery, unlocked, balance: m.marks, contract: r.contract, contractDone: !!r.contract && r.won, firstRun } };
}
export { CONTRACTS };
