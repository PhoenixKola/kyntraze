/** B22 persistence: ONE additive block (`save.b22`) next to the untouched B18 meta. Sanitised per field, idempotent to migrate, and every run result is granted at most once through a ledger of run ids. Offline numbers are LOCAL records; nothing here is ever labelled "verified" (only the server can verify). */
import { HERO_IDS, isHeroId, type HeroId } from '../content/heroes';
import { ARENA_IDS, isArenaId, type ArenaId } from '../content/arenas';
import { FORM_KEYS, MILESTONES, MILESTONE_BY_ID, isMilestoneId, type FormKey } from './mastery';
import { COSMETICS, OUTFITS, isCosmeticId, isCrestId, isOutfitId, type OutfitDef, type OutfitId } from './cosmetics';
import { RUN_MODE_IDS, type RunModeId } from './plan';
import { RELIC_IDS, type RelicId } from './relics';
import { BRANCHES } from './branches';
import { LEGENDARIES } from './legendary';
import { BOSS_KINDS } from '../content/enemies';

export const B22_SAVE_VERSION = 1, LEDGER_KEEP = 80;
export interface ModeRecord { runs: number; wins: number; bestSeconds: number; bestScore: number; bestKills: number; bestCycle: number; bestLevel: number }
export interface ChallengeProof { best: number; attempts: number; done: boolean; /** always 'local': only a server may mark a score verified */ status: 'local' }
export interface B22Save {
  v: 1; vexForms: [boolean, boolean]; story: { done: (1 | 2 | 3)[]; seen: boolean };
  mastery: Record<string, true>; owned: string[]; equipped: { outfit: Partial<Record<HeroId, OutfitId>>; crest: string | null; /** edge detail reward id per mastery form (FormKey) */ aura: Partial<Record<FormKey, string>> };
  records: Record<string, ModeRecord>; challenges: Record<string, ChallengeProof>;
  seen: { relics: RelicId[]; branches: string[]; legends: string[]; bosses: string[] };
  server: { url: string; name: string };
  ledger: string[];
}
const blankRecord = (): ModeRecord => ({ runs: 0, wins: 0, bestSeconds: 0, bestScore: 0, bestKills: 0, bestCycle: 0, bestLevel: 0 });
export const blankB22 = (): B22Save => ({ v: 1, vexForms: [false, false], story: { done: [], seen: false }, mastery: {}, owned: [], equipped: { outfit: {}, crest: null, aura: {} }, records: {}, challenges: {}, seen: { relics: [], branches: [], legends: [], bosses: [] }, server: { url: '', name: '' }, ledger: [] });
const num = (v: unknown, hi = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(0, Math.floor(v))) : 0);
const strs = (v: unknown, ok: (x: string) => boolean, cap = 400): string[] => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))].slice(0, cap) : []);
export const recordKey = (mode: RunModeId | string, hero: HeroId, arena: ArenaId, party = 1) => `${mode}|${hero}|${arena}|${party}`;
/** Strict wss only (plus plain ws to localhost for development): a game server URL is never trusted blindly. */
export function safeServerUrl(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 200) return '';
  try { const u = new URL(raw.trim()); const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost'; if (u.protocol === 'wss:' || (u.protocol === 'ws:' && local)) return `${u.protocol}//${u.host}`; } catch { /* not a URL */ }
  return '';
}
/** Idempotent: a missing / partial / corrupt block degrades field by field; running it twice changes nothing. */
export function migrateB22(raw: unknown): B22Save {
  const b = blankB22(); if (typeof raw !== 'object' || raw === null) return b; const r = raw as Record<string, unknown>;
  if (Array.isArray(r.vexForms)) b.vexForms = [r.vexForms[0] === true, r.vexForms[1] === true];
  const st = (typeof r.story === 'object' && r.story ? r.story : {}) as Record<string, unknown>; b.story = { done: ([1, 2, 3] as const).filter(c => Array.isArray(st.done) && st.done.includes(c)), seen: st.seen === true };
  if (typeof r.mastery === 'object' && r.mastery) for (const k of Object.keys(r.mastery)) if (isMilestoneId(k) && (r.mastery as Record<string, unknown>)[k] === true) b.mastery[k] = true;
  b.owned = strs(r.owned, x => isCosmeticId(x) || isOutfitId(x));
  const eq = (typeof r.equipped === 'object' && r.equipped ? r.equipped : {}) as Record<string, unknown>, eo = (typeof eq.outfit === 'object' && eq.outfit ? eq.outfit : {}) as Record<string, unknown>;
  for (const h of HERO_IDS) { const v = eo[h]; if (isOutfitId(v) && b.owned.includes(v) && OUTFITS.find(o => o.id === v)?.hero === h) b.equipped.outfit[h] = v; }
  b.equipped.crest = typeof eq.crest === 'string' && b.owned.includes(eq.crest) && isCrestId(eq.crest) ? eq.crest : null;
  { const ea = (typeof eq.aura === 'object' && eq.aura ? eq.aura : {}) as Record<string, unknown>; for (const f of FORM_KEYS) { const v = ea[f]; if (v === `aura_detail_${f}` && b.owned.includes(v)) b.equipped.aura[f] = v; } }   // B23: the seven edge details are equippable per form (older saves never restored them)
  const rec = (typeof r.records === 'object' && r.records ? r.records : {}) as Record<string, Record<string, unknown>>;
  for (const k of Object.keys(rec).slice(0, 400)) { const [mode, hero, arena, party] = k.split('|'); if (!(RUN_MODE_IDS as readonly string[]).includes(mode) || !isHeroId(hero) || !isArenaId(arena) || !/^[1-2]$/.test(party ?? '')) continue; const x = rec[k] ?? {}; b.records[k] = { runs: num(x.runs), wins: num(x.wins), bestSeconds: num(x.bestSeconds), bestScore: num(x.bestScore), bestKills: num(x.bestKills), bestCycle: num(x.bestCycle, 1e4), bestLevel: num(x.bestLevel, 1e4) }; }
  const ch = (typeof r.challenges === 'object' && r.challenges ? r.challenges : {}) as Record<string, Record<string, unknown>>;
  for (const k of Object.keys(ch).slice(0, 500)) if (/^[DW]-\d{8}$/.test(k)) b.challenges[k] = { best: num(ch[k]?.best), attempts: num(ch[k]?.attempts, 1e4), done: ch[k]?.done === true, status: 'local' };
  const se = (typeof r.seen === 'object' && r.seen ? r.seen : {}) as Record<string, unknown>;
  b.seen = { relics: strs(se.relics, x => (RELIC_IDS as string[]).includes(x)) as RelicId[], branches: strs(se.branches, x => BRANCHES.some(y => y.id === x)), legends: strs(se.legends, x => LEGENDARIES.some(y => y.id === x)), bosses: strs(se.bosses, x => (BOSS_KINDS as readonly string[]).includes(x)) };
  const sv = (typeof r.server === 'object' && r.server ? r.server : {}) as Record<string, unknown>; b.server = { url: safeServerUrl(sv.url), name: typeof sv.name === 'string' ? sv.name.replace(/[^\w .-]/g, '').slice(0, 24) : '' };
  b.ledger = strs(r.ledger, x => x.length < 80, LEDGER_KEEP);
  return b;
}
/** What one finished run carries into the B22 save. `counters` are the sim's per-run mastery counters. */
export interface B22RunResult { runId: string; mode: RunModeId; hero: HeroId; arena: ArenaId; party: 1 | 2; won: boolean; seconds: number; kills: number; level: number; score: number; cycle: number; counters: Record<string, number>; relics: string[]; branches: string[]; legends: string[]; bosses: string[]; challengeId?: string; storyChapter?: 1 | 2 | 3; extracted?: boolean; practice?: boolean }
export interface B22Grant { milestones: string[]; cosmetics: string[]; vexForms: number[]; story: number[] }
export const judgeMilestones = (counters: Record<string, number>, have: Record<string, true>): string[] => MILESTONES.filter(m => !have[m.id] && (counters[m.counter] ?? 0) >= m.goal).map(m => m.id);
/** Applies a result exactly once per run id. A repeated id returns the same save and an empty grant. */
export function applyB22Result(prev: B22Save, r: B22RunResult): { save: B22Save; grant: B22Grant } {
  const empty: B22Grant = { milestones: [], cosmetics: [], vexForms: [], story: [] };
  if (!r.runId || prev.ledger.includes(r.runId) || r.practice) return { save: prev, grant: empty };
  const s: B22Save = { ...prev, mastery: { ...prev.mastery }, owned: [...prev.owned], records: { ...prev.records }, challenges: { ...prev.challenges }, seen: { relics: [...prev.seen.relics], branches: [...prev.seen.branches], legends: [...prev.seen.legends], bosses: [...prev.seen.bosses] }, vexForms: [...prev.vexForms] as [boolean, boolean], story: { done: [...prev.story.done], seen: prev.story.seen }, ledger: [...prev.ledger, r.runId].slice(-LEDGER_KEEP) };
  const grant: B22Grant = { milestones: [], cosmetics: [], vexForms: [], story: [] };
  const k = recordKey(r.mode, r.hero, r.arena, r.party), x = { ...(s.records[k] ?? blankRecord()) };
  x.runs++; if (r.won) x.wins++; x.bestSeconds = Math.max(x.bestSeconds, Math.floor(r.seconds)); x.bestScore = Math.max(x.bestScore, Math.floor(r.score)); x.bestKills = Math.max(x.bestKills, r.kills); x.bestCycle = Math.max(x.bestCycle, r.cycle); x.bestLevel = Math.max(x.bestLevel, r.level); s.records[k] = x;
  for (const id of judgeMilestones(r.counters, s.mastery)) { s.mastery[id] = true; grant.milestones.push(id); const rw = MILESTONE_BY_ID[id].reward.id; if (!s.owned.includes(rw)) { s.owned.push(rw); grant.cosmetics.push(rw); } }
  for (const id of r.relics) if (!s.seen.relics.includes(id as RelicId) && (RELIC_IDS as string[]).includes(id)) s.seen.relics.push(id as RelicId);
  for (const id of r.branches) if (!s.seen.branches.includes(id) && BRANCHES.some(b => b.id === id)) s.seen.branches.push(id);
  for (const id of r.legends) if (!s.seen.legends.includes(id) && LEGENDARIES.some(l => l.id === id)) s.seen.legends.push(id);
  for (const id of r.bosses) if (!s.seen.bosses.includes(id) && (BOSS_KINDS as readonly string[]).includes(id)) s.seen.bosses.push(id);
  if (r.challengeId && /^[DW]-\d{8}$/.test(r.challengeId)) { const c = s.challenges[r.challengeId] ?? { best: 0, attempts: 0, done: false, status: 'local' as const }; s.challenges[r.challengeId] = { best: Math.max(c.best, Math.floor(r.score)), attempts: c.attempts + 1, done: c.done || r.won, status: 'local' }; }
  if (r.hero === 'vex' && r.bosses.includes('warden') && !s.vexForms[0]) { s.vexForms[0] = true; grant.vexForms.push(1); }   // Riftbound: defeat the Fracture Warden as Vex
  if (r.mode === 'vex_trial' && r.won && r.storyChapter) {
    if (!s.story.done.includes(r.storyChapter)) { s.story.done = [...s.story.done, r.storyChapter].sort() as (1 | 2 | 3)[]; grant.story.push(r.storyChapter); }
    if (r.storyChapter >= 2 && !s.vexForms[0]) { s.vexForms[0] = true; grant.vexForms.push(1); }   // Riftbound: finish chapter 2
    if (r.storyChapter === 3 && !s.vexForms[1]) { s.vexForms[1] = true; grant.vexForms.push(2); }   // Voidheart Exile: defeat the Oathkeeper in the final chapter
  }
  const crest = r.mode === 'endless' && r.cycle >= 3 ? 'crest_endless' : r.mode === 'boss_rush' && r.won ? (r.bosses.includes('sovereign') ? 'crest_sovereign' : 'crest_boss_rush') : r.mode === 'fracture_expedition' && r.won ? 'crest_expedition' : r.mode === 'vex_trial' && r.won && r.storyChapter === 3 ? 'crest_vanguard' : r.mode === 'daily_challenge' && r.won ? 'crest_daily' : r.party === 2 && r.won ? 'crest_alliance' : '';
  if (crest && isCosmeticId(crest) && !s.owned.includes(crest)) { s.owned.push(crest); grant.cosmetics.push(crest); }
  void COSMETICS; return { save: s, grant };
}
/** Outfit unlock conditions, evaluated from real saved facts (never granted for free). */
export function outfitUnlocked(o: OutfitDef, ctx: { heroWins: Record<string, number>; b22: B22Save }): boolean {
  const u = o.unlock; if (ctx.b22.owned.includes(o.id)) return true;
  switch (u.kind) { case 'default': return true; case 'wins': return (ctx.heroWins[u.hero] ?? 0) >= u.n; case 'boss': return ctx.b22.seen.bosses.includes(u.boss); case 'mastery': return !!ctx.b22.mastery[u.milestone]; case 'story': return ctx.b22.story.done.includes(3); case 'mode': return Object.keys(ctx.b22.records).some(k => k.startsWith(`${u.mode}|`) && ctx.b22.records[k].wins > 0); }
}
export const equipOutfit = (s: B22Save, hero: HeroId, id: OutfitId | null, ctx: { heroWins: Record<string, number> }): B22Save => {
  if (id === null) { const o = { ...s.equipped.outfit }; delete o[hero]; return { ...s, equipped: { ...s.equipped, outfit: o } }; }
  const def = OUTFITS.find(x => x.id === id); if (!def || def.hero !== hero || !outfitUnlocked(def, { heroWins: ctx.heroWins, b22: s })) return s;
  return { ...s, owned: s.owned.includes(id) ? s.owned : [...s.owned, id], equipped: { ...s.equipped, outfit: { ...s.equipped.outfit, [hero]: id } } };
};
void ARENA_IDS;

/** Equip / remove a form's mastery edge detail. Only an earned detail of that very form can be equipped. */
export const equipAura = (s: B22Save, form: FormKey, on: boolean): B22Save => {
  const id = `aura_detail_${form}`, a = { ...s.equipped.aura };
  if (!on) { delete a[form]; return { ...s, equipped: { ...s.equipped, aura: a } }; }
  if (!s.owned.includes(id)) return s; a[form] = id; return { ...s, equipped: { ...s.equipped, aura: a } };
};
/** Equip / remove a crest (mastery crest or mode crest). Must be owned. */
export const equipB22Crest = (s: B22Save, id: string | null): B22Save => (id === null ? { ...s, equipped: { ...s.equipped, crest: null } } : s.owned.includes(id) && isCrestId(id) ? { ...s, equipped: { ...s.equipped, crest: id } } : s);
