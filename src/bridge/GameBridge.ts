import { applyB22Result, migrateB22, type B22Grant, type B22RunResult } from '../b22/save';
import type { RunPlan } from '../b22/plan';
import type { RelicId } from '../b22/relics';
import type { HeroId } from '../content/heroes';
import type { Simulation } from '../sim/Simulation';
import { abilityTips } from './abilityTips';
import { ascView } from './ascView';
import { blankSnapshot, type MiniMap, type RunHud, type UiSnapshot } from './UiSnapshot';
import { UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '../content/upgrades';
import { previewUpgrade } from '../sim/UpgradeSystem';
import { ENEMIES, isBoss, type BossKind } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { ARENAS } from '../content/arenas';
import { BEAM, SPHERE } from '../content/abilities';
import { CANNON, DRAGON } from '../content/cometheart';
import { EVASION, REVERSAL, RIFT } from '../content/stillfire';
import { formChoices, selectedForm, activateForm, SELECTOR_MAX } from '../sim/FormSystem';
import { BOSS_SCHEDULE } from '../content/encounters';
import { RULES } from '../core/Rules';
import { storeSave, type SaveV1, type GameSettings } from '../sim/SaveSystem';
import { blankMeta, finalizeRun, contractAvailable, type RunReward, type RunResult } from '../sim/MetaSystem';
import { NO_CONFIG, toolCharges, type RunConfig } from '../sim/RunConfig';
import { ASCEND, HERO_KIT, REN, SORA, UPGRADE_OVERRIDES } from '../content/heroKits';
import { categoryStacks } from '../sim/UpgradeSystem';
import type { UpgradeCategory } from '../content/upgrades';
export class GameBridge {
  private listeners = new Set<() => void>();
  private sim: Simulation | null = null;
  private current = blankSnapshot;
  private lastPhase = '';
  private deathShown = false;
  private victoryShown = false;
  /** B18: one identity per run (never derived from the seed, so retrying the same seed is a new run); its reward is granted at most once. */
  readonly runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  private reward: RunReward | null = null; private finalized = false;
  private config: RunConfig; private challengeId: string | undefined; private b22Grant: B22Grant | null = null;
  constructor(private readonly save: SaveV1) {
    if (!save.meta) save.meta = blankMeta();   // hand-built saves (tests, very old callers) get an empty meta
    const m = save.meta, tools = toolCharges(m.owned.includes('tool_reroll'), m.owned.includes('tool_banish'));
    const hero = save.hero ?? 'kai';
    this.config = { boon: m.boon && m.owned.includes(`boon_${m.boon}`) ? m.boon : null, contract: m.contract && contractAvailable(m, m.contract) ? m.contract : null, ...tools, hero, heroForm: hero !== 'kai' && !!save.unlocks?.[hero as 'ren' | 'sora'], vexForms: save.b22?.vexForms };
  }
  /** B22: deploy into a mode (Endless, Expedition, Boss Rush, Daily / Weekly, Vex Trial); frozen into the run config before the sim is built. */
  setMode(plan: RunPlan, opts: { startRelic?: RelicId | null; challengeId?: string; hero?: HeroId } = {}) { this.config = { ...this.config, plan, startRelic: opts.startRelic ?? null, ...(opts.hero ? { hero: opts.hero } : {}) }; this.challengeId = opts.challengeId; }
  getB22Grant() { return this.b22Grant; }
  /** The loadout this run was deployed with (frozen at construction). */
  getRunConfig(): RunConfig { return this.config ?? NO_CONFIG; }
  bind(sim: Simulation) { this.sim = sim; this.publish(true); }
  unbind() { this.sim = null; }
  setSettings(next: GameSettings) { this.save.settings = next; }
  getSettings() { return this.save.settings; }
  /** Permanent unlocks (read once when a run starts). */
  getUnlocks() { return { cometheart: false, stillfire: false, ...(this.save.unlocks ?? {}) }; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  snapshot(): UiSnapshot { return this.current; }
  publish(force = false) {
    const s = this.sim?.state; if (!s) return;
    const p = s.player, lance = s.hx?.act?.act === 'celestial_lance' && !s.hx.act.released ? s.hx.act : null;
    const phaseChanged = this.lastPhase !== s.phase;
    if (s.apexUnlockedNow) { s.apexUnlockedNow = false; this.save.unlocks = { cometheart: false, ...(this.save.unlocks ?? {}), stillfire: true }; storeSave(this.save); }
    if (s.heroFormUnlockedNow && s.hero !== 'kai') { s.heroFormUnlockedNow = false; this.save.unlocks = { cometheart: false, ...(this.save.unlocks ?? {}), [s.hero]: true }; storeSave(this.save); }   // B19: the Warden unlocked this runner's transformation for good
    if (s.cometUnlockedNow) { s.cometUnlockedNow = false; this.save.unlocks = { ...(this.save.unlocks ?? { cometheart: false }), cometheart: true }; storeSave(this.save); }
    if (s.phase !== 'dead') this.deathShown = false;
    if (s.phase !== 'victory') this.victoryShown = false;
    this.current = { asc: (() => { try { return ascView(s); } catch { return null; } })(), tips: (() => { try { return abilityTips(s); } catch { return null; } })(), phase: s.phase, seed: s.seed, hp: p.hp, maxHp: p.maxHp, xp: p.xp,
      nextXp: p.nextXp, level: p.level, seconds: s.time, kills: s.kills, enemies: s.enemies.length,
      dashCooldown: p.dashCooldown, qCooldown: p.qCooldown, beamCooldown: p.beamCooldown, sphereCooldown: p.sphereCooldown, drive: p.drive, form: p.form, dragonCooldown: p.dragonCooldown, cometCooldown: p.cometCooldown, hero: s.hero, heroFormUnlocked: s.heroFormUnlocked, heroReady: s.hero !== 'kai' && formChoices(s).includes(1), lanceCharge: lance ? lance.charge / SORA.e.maxCharge : 0, lanceTier: lance ? SORA.e.tiers.reduce((t, v, i) => (lance.charge >= v ? i : t), -1) : -1, heroAct: s.hx?.act?.act ?? '', cometUnlocked: s.cometUnlocked, cometReady: formChoices(s).includes(2), apexUnlocked: s.apexUnlocked, apexReady: formChoices(s).includes(3), riftCooldown: p.riftCooldown, reversalCooldown: p.reversalCooldown, evadeCooldown: p.evadeCooldown, riftCharge: s.cast?.kind === 'rift' && !s.cast.released ? Math.min(1, s.cast.t / RIFT.maxCharge) : 0, selector: { open: !!s.selector?.open, pick: selectedForm(s) ?? 0, choices: formChoices(s), left: Math.max(0, SELECTOR_MAX - (s.selector?.held ?? 0)) }, cinema: !!s.cinema,
      formCooldown: p.formCooldown, offers: [...s.upgradeOffers], score: this.sim!.stats().score, deathShown: this.deathShown, boss: bossHud(s), cards: s.phase === 'upgrade' ? s.upgradeOffers.map(id => offerCard(s, id)) : [], owned: UPGRADES.filter(u => (s.upgradeStacks[u.id] ?? 0) > 0).map(u => ({ id: u.id, stacks: s.upgradeStacks[u.id] })), map: miniMap(s),
      cdMax: { dash: 3.2 * s.mods.dashCd, beam: (s.hero === 'ren' ? REN.e.cooldown : s.hero === 'sora' ? SORA.e.cooldown : BEAM.cooldown) * s.mods.beamCd, sphere: (s.hero === 'ren' ? REN.r.cooldown : s.hero === 'sora' ? SORA.r.cooldown : SPHERE.cooldown) * s.mods.sphereCd, form: (s.hero === 'kai' ? RULES.formCooldown : ASCEND.cooldown) * s.mods.formCd, dragon: DRAGON.cooldown * s.mods.beamCd, comet: CANNON.cooldown * s.mods.sphereCd, rift: RIFT.cooldown * s.mods.beamCd, reversal: REVERSAL.cooldown * s.mods.sphereCd, evade: EVASION.cooldown }, run: runHud(s), victoryShown: this.victoryShown, rewardPick: s.rewardPick, contract: this.config.contract, boon: this.config.boon, rerolls: s.run?.rerollsLeft ?? 0, banishes: s.run?.banishesLeft ?? 0, reward: this.reward, marks: this.save.meta.marks, crest: this.save.meta.crest, bosses: s.bossesDefeated, sinceRevive: s.time - s.reviveAt, revives: s.mods.revive, arenaName: (ARENAS[s.arenaId] ?? ARENAS.gloam).name.toUpperCase() };
    if ((s.phase === 'dead' || s.phase === 'victory') && phaseChanged) {
      const stats = this.sim!.stats();
      this.finalizeMeta(s);
      if (!this.save.best || stats.score > this.save.best.score) { this.save.best = { ...stats, hero: s.hero }; storeSave(this.save); }
    }
    this.lastPhase = s.phase;
    if (force || phaseChanged || this.listeners.size) this.listeners.forEach(listener => listener());
  }
  /** Records the finished run in the meta state exactly once (guarded by the run id and the saved ledger) and stores it before any Results button can be pressed. */
  private finalizeMeta(s: GameState) {
    if (this.finalized) return; this.finalized = true; if (this.endlessLeg) { this.recordB22(s, true); return; }   // the Classic result was recorded at the victory; the Endless leg never repeats Classic rewards
    let maxCat = 0; for (const c of ['core', 'beam', 'sphere', 'survival', 'mobility', 'pickup', 'drive'] as UpgradeCategory[]) maxCat = Math.max(maxCat, categoryStacks(s, c));
    const won = s.phase === 'victory', warden = s.bossesDefeated >= 1 || won;
    const classic = s.plan.mode === 'classic', practice = s.plan.practice;
    const result: RunResult = { hero: s.hero, runId: this.runId, arena: s.arenaId, won: classic && won, seconds: s.time, kills: s.kills, level: s.player.level, score: this.sim!.stats().score, wardenKills: classic && warden ? 1 : 0, seraphKills: classic && won ? 1 : 0, formsUsed: [...(s.run?.formsUsed ?? [])], maxCategoryStacks: maxCat, contract: this.config.contract };
    const out = practice ? { meta: this.save.meta, reward: null } : finalizeRun(this.save.meta, result);
    this.recordB22(s, false);
    this.save.meta = { ...out.meta, introSeen: true }; this.reward = out.reward ? { ...out.reward, firstRun: out.reward.firstRun && !out.meta.introSeen } : null; storeSave(this.save);
  }
  /** B22 records / mastery / cosmetics, applied at most once per run id (the ledger inside the save). Offline numbers stay LOCAL records. */
  private recordB22(s: GameState, endlessLeg: boolean) {
    const won = s.phase === 'victory', mode = endlessLeg ? 'endless' as const : s.plan.mode, cyc = s.b22.endless?.cycle ?? 0;
    const chapter = mode === 'vex_trial' ? Number(s.plan.id.slice(-1)) as 1 | 2 | 3 : undefined;
    const res: B22RunResult = { runId: endlessLeg ? `${this.runId}:endless` : this.runId, mode, hero: s.hero, arena: s.arenaId, party: s.b22.party ? 2 : 1, won: endlessLeg ? !!s.b22.endless?.extracted : won, seconds: s.time, kills: s.kills, level: s.player.level, score: this.sim!.stats().score, cycle: cyc, counters: s.b22.m, relics: s.b22.relics, branches: s.b22.branches, legends: s.b22.legendary, bosses: s.plan.steps.filter(st => st.kind === 'boss' && s.encounter.doneAt[st.id] !== undefined).map(st => st.boss!).concat(s.bossesDefeated > 0 && s.plan.mode === 'classic' ? ['warden'] : []), challengeId: this.challengeId, storyChapter: chapter, extracted: s.b22.endless?.extracted, practice: s.plan.practice };
    const out = applyB22Result(migrateB22(this.save.b22), res); this.save.b22 = out.save; this.b22Grant = out.grant; storeSave(this.save);
  }
  /** Called by the renderer when the Death clip has finished and held. Ignored unless the sim is actually dead, so it can never show Results early. */
  markDeathShown() { if (this.sim?.state.phase !== 'dead' || this.deathShown) return; this.deathShown = true; this.publish(true); }
  /** Called by the scene once the victory beat has played. Ignored unless the run is actually won. */
  markVictoryShown() { if (this.sim?.state.phase !== 'victory' || this.victoryShown) return; this.victoryShown = true; this.publish(true); }
  pause() { this.sim?.forcePause(); this.publish(true); }
  togglePause() { this.sim?.togglePause(); this.publish(true); }
  /** B22: a clicked ability tile feeds the same input path as its key / button (so cooldowns, buffering and Sora's charge all behave identically). */
  private injector: ((code: string) => void) | null = null;
  setInjector(fn: ((code: string) => void) | null) { this.injector = fn; }
  pressKey(code: string) { if (this.sim?.state.phase === 'running') this.injector?.(code); }
  /** Form selector, from the pointer: hover highlights a card, a click starts it. */
  pickForm(f: 1 | 2 | 3, confirm: boolean) { const s = this.sim?.state; if (!s?.selector.open || !formChoices(s).includes(f)) return; s.selector.pick = f; if (confirm) activateForm(s, f); this.publish(true); }
  chooseBranch(id: string) { if (this.sim?.chooseBranch(id as never)) this.publish(true); }
  chooseRelic(id: string) { if (this.sim?.chooseRelic(id as never)) this.publish(true); }
  chooseLegendary(id: string) { if (this.sim?.chooseLegendary(id as never)) this.publish(true); }
  /** Endless: the Classic victory is already recorded (once); the endless leg writes its own records and never re-awards Classic rewards. */
  continueEndless() { if (this.sim?.continueEndless()) { this.endlessLeg = true; this.victoryShown = false; this.publish(true); } }
  extract() { if (this.sim?.extract()) this.publish(true); }
  pushOn() { if (this.sim?.pushOn()) this.publish(true); }
  private endlessLeg = false;
  reroll() { if (this.sim?.reroll()) this.publish(true); }
  banish(id: UpgradeId) { if (this.sim?.banish(id)) this.publish(true); }
  choose(id: UpgradeId) { this.sim?.chooseUpgrade(id); this.publish(true); }
  debugGrantXp(offers?: UpgradeId[]) { const sim = this.sim; if (!sim) return; sim.debugLevelUp(); if (offers && sim.state.phase === 'upgrade') sim.state.upgradeOffers = offers; this.publish(true); }
}

import type { GameState } from '../sim/GameState';
import type { BossHud } from './UiSnapshot';
function bossHud(s: GameState): BossHud | null {
  const b = s.enemies.find(e => isBoss(e.kind) && !e.part && e.hp > 0); if (!b || !b.ai) return null;
  const def = BOSSES[b.kind as BossKind], parts = s.enemies.filter(p => p.part?.of === b.id && p.part.role !== 'decoy' && p.hp > 0).map(p => ({ role: p.part!.role, hp: p.hp, maxHp: p.maxHp, id: p.id }));
  return { id: def.id, name: def.name, hp: b.hp, maxHp: b.maxHp, phase: b.ai.phase, phases: def.phaseAt2 !== undefined || def.id === 'sovereign' ? 3 : 2, mode: b.mode, intro: b.mode === 'intro' ? b.modeT : 0, invuln: b.ai.invuln, exposed: b.ai.exposed, parts, shielded: (b.ex?.shield ?? 0) > 0 };
}

function offerCard(s: GameState, id: UpgradeId) {
  const u = UPGRADE_BY_ID[id], pv = previewUpgrade(s, id), ov = s.hero === 'kai' ? undefined : UPGRADE_OVERRIDES[s.hero][id];
  return { id, name: ov?.name ?? u.name, blurb: ov?.blurb ?? u.blurb, catName: s.hero === 'kai' ? undefined : HERO_KIT[s.hero].catNames[u.category], category: u.category, rarity: u.rarity, stack: s.upgradeStacks[id] ?? 0, max: u.maxStacks, label: pv.label, before: pv.before, after: pv.after };
}
function miniMap(s: GameState): MiniMap {
  const p = s.player, foes: number[] = []; let near = 0, nearest = 9999, eliteNear = false, bossNear = false;
  for (const e of s.enemies) {
    if (e.hp <= 0) continue;
    const boss = isBoss(e.kind), def = boss ? null : ENEMIES[e.kind as keyof typeof ENEMIES], k = boss ? 3 : def!.elite ? 2 : def!.caster ? 1 : 0;
    foes.push(Math.round(e.x), Math.round(e.y), k);
    const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < nearest) nearest = d;
    if (d < 380) { near++; if (k === 2) eliteNear = true; }
    if (k === 3 && d < 700) bossNear = true;
  }
  return { arena: s.arenaId, px: p.x, py: p.y, ax: p.aimX, ay: p.aimY, foes, near, nearest: Math.round(nearest), eliteNear, bossNear,
    hazards: s.hazards.filter(h => h.shape !== 'sigil' && h.damage > 0).map(h => ({ shape: h.shape, x: h.x, y: h.y, r: h.r, w: h.w ?? 0, h: h.h ?? 0, warn: h.fired ? 1 : 1 - Math.max(0, h.delay) / Math.max(0.01, h.total), live: h.fired })) };
}

function runHud(s: GameState): RunHud {
  const [w, f] = [BOSS_SCHEDULE[0].at, BOSS_SCHEDULE[1].at], wardenDone = !!s.encounter.spawned.warden && !s.enemies.some(e => e.kind === 'warden' && e.hp > 0);
  const finaleOut = !!s.encounter.spawned.seraph, bossUp = s.enemies.some(e => isBoss(e.kind) && e.hp > 0);
  const next = !s.encounter.spawned.warden ? { label: 'FRACTURE WARDEN', at: w } : !finaleOut ? { label: 'NULL SERAPH', at: f } : { label: bossUp ? 'DEFEAT THE SERAPH' : '', at: 0 };
  const a = s.announce && s.time - s.announce.at < 6 ? { text: s.announce.text, sub: s.announce.sub, age: s.time - s.announce.at } : null;
  return { t: s.time, wardenAt: w, finaleAt: f, wardenDone: wardenDone || s.bossesDefeated > 0, finaleOut, nextLabel: next.label, nextIn: Math.max(0, next.at - s.time), announce: a };
}
