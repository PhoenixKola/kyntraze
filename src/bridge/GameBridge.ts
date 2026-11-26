import { REN_E, REN_R } from '../content/renCombat';
import { ASH, ASH_E, ASH_R } from '../content/renEclipse';
import { SURGE, SCATTER, METEOR, ECHO, RISE, CRUCIBLE } from '../content/kaiKit';
import { sigCharge } from '../sim/KaiCombat';
import { SIG } from '../content/kaiCombat';
import { dashMax } from '../sim/MovementSystem';
import { kitSnap } from '../sim/KaiKit';
import { setOutfitSkin } from '../assets/skin';
import { setEdgeDetails, setFinisherRewards } from '../game/render/edgePalette';
import type { NetClient } from '../net/RemoteSimulation';
import { slotPlayer } from '../sim/CoopSystem';
import { slotHero } from '../sim/CoopCombos';
import { REVIVE } from '../b22/pairs';
import { applyB22Result, migrateB22, type B22Grant, type B22RunResult } from '../b22/save';
import type { RunPlan } from '../b22/plan';
import type { RelicId } from '../b22/relics';
import type { HeroId } from '../content/heroes';
import type { Simulation } from '../sim/Simulation';
import { abilityTips } from './abilityTips';
import { lfHud, lfMarks } from './lfHud';
import { endLiving } from '../sim/LivingFractures';
import { abilityView } from './abilityView';
import { bestFormOf } from '../app/ui/victoryPose';
import { inSlot } from '../sim/CoopSystem';
import type { GameState as GS } from '../sim/GameState';
import { ascView } from './ascView';
import { blankSnapshot, type MiniMap, type OfferCard, type RunHud, type UiSnapshot } from './UiSnapshot';
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
import { CHRONICLE_BY_ID, chronicleOfPlan, type ChronicleId } from '../b31/chronicles';
import { MARKS_CAP, blankMeta, finalizeRun, contractAvailable, type RunReward, type RunResult } from '../sim/MetaSystem';
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
    setOutfitSkin(save.b22?.equipped?.outfit?.[save.hero ?? 'kai'] ?? null); setEdgeDetails(save.b22?.equipped?.aura ?? {}); setFinisherRewards(save.b22?.owned ?? []);
    if (!save.meta) save.meta = blankMeta();   // hand-built saves (tests, very old callers) get an empty meta
    const m = save.meta, tools = toolCharges(m.owned.includes('tool_reroll'), m.owned.includes('tool_banish'));
    const hero = save.hero ?? 'kai';
    this.config = { boon: m.boon && m.owned.includes(`boon_${m.boon}`) ? m.boon : null, contract: m.contract && contractAvailable(m, m.contract) ? m.contract : null, ...tools, hero, heroForm: hero !== 'kai' && !!save.unlocks?.[hero as 'ren' | 'sora'], vexForms: save.b22?.vexForms, renF2: hero === 'ren' && !!save.b22?.renF2 };
  }
  /** B22: deploy into a mode (Endless, Expedition, Boss Rush, Daily / Weekly, Vex Trial); frozen into the run config before the sim is built. */
  setMode(plan: RunPlan, opts: { startRelic?: RelicId | null; challengeId?: string; hero?: HeroId } = {}) { this.config = { ...this.config, plan, startRelic: opts.startRelic ?? null, ...(opts.hero ? { hero: opts.hero } : {}) }; this.challengeId = opts.challengeId; }
  getB22Grant() { return this.b22Grant; }
  /** B22.6 local couch co-op: the partner's hero (a fresh loadout; no saved unlocks are shared). */
  private partner: HeroId | null = null;
  setCoop(hero2: HeroId | null) { this.partner = hero2; }
  /** Heroes of this run known before the sim is ready (loading screen): own hero (online: your seat) and the partner. */
  loadingHeroes(): { hero: HeroId; partner: HeroId | null } { const r = this.net?.room; if (r) { const me = r.players[r.you], them = r.players.find((_, i) => i !== r.you); return { hero: me?.hero ?? this.save.hero ?? 'kai', partner: them?.hero ?? null }; } return { hero: this.save.hero ?? 'kai', partner: this.partner }; }
  /** B22.6 online: the run is owned by the server (no local sim, no local rewards: only the server's verified result counts). */
  private net: NetClient | null = null; setNet(n: NetClient | null) { this.net = n; } getNet() { return this.net; }
  getPartner() { return this.partner; }
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
  /** Co-op (local couch): the upgrade / branch / relic / legend offers live in the CHOOSING fighter's slot, so the screen must be built from that slot, not from player 1's. Online clients only ever hold their own slot, so this is a plain call there. */
  private asChooserView<T>(fn: () => T): T { const sm = this.sim as unknown as { view?: <U>(f: () => U) => U }; return sm && typeof sm.view === 'function' && this.sim?.state.phase === 'upgrade' ? sm.view(fn) : fn(); }
  /** Cheap fingerprint of whatever the level-up screen shows, so the UI is republished the moment a chooser, card set, branch, relic or legend offer changes inside one upgrade phase. */
  offerSignature(): string { const s = this.sim?.state; if (!s) return ''; return this.asChooserView(() => `${s.party?.chooser ?? ''}|${s.upgradeOffers.join(',')}|${s.b22.branchOffer ? `${s.b22.branchOffer.a}${s.b22.branchOffer.b}` : ''}|${s.b22.relicOffer?.join(',') ?? ''}|${s.b22.legendOffer ?? ''}`); }
  publish(force = false) {
    const s = this.sim?.state; if (!s) return;
    if (!this.net && s.lf && (s.phase === 'dead' || s.phase === 'victory')) endLiving(s);   // B31B: nothing outlives the run, and the result summary is final
    const p = s.player, lance = s.hx?.act?.act === 'celestial_lance' && !s.hx.act.released ? s.hx.act : null;
    const phaseChanged = this.lastPhase !== s.phase;
    if (s.renF2Now) { s.renF2Now = false; this.save.b22 = { ...(this.save.b22 ?? migrateB22(null)), renF2: true }; storeSave(this.save); }   // B33: a Null Seraph victory as Ren earns Ashen Eclipse for the NEXT run
    if (s.apexUnlockedNow) { s.apexUnlockedNow = false; this.save.unlocks = { cometheart: false, ...(this.save.unlocks ?? {}), stillfire: true }; storeSave(this.save); }
    if (s.heroFormUnlockedNow && s.hero !== 'kai') { s.heroFormUnlockedNow = false; this.save.unlocks = { cometheart: false, ...(this.save.unlocks ?? {}), [s.hero]: true }; storeSave(this.save); }   // B19: the Warden unlocked this runner's transformation for good
    if (s.cometUnlockedNow) { s.cometUnlockedNow = false; this.save.unlocks = { ...(this.save.unlocks ?? { cometheart: false }), cometheart: true }; storeSave(this.save); }
    if (s.phase !== 'dead') this.deathShown = false;
    if (s.phase !== 'victory') this.victoryShown = false;
    this.current = { b22Crest: this.save.b22?.equipped?.crest ?? null, bestForm: bestFormOf(s.hero, s.run?.formsUsed ?? []), partner: (() => { const P = s.party; const np = (s as unknown as { partner?: { player: { hp: number; maxHp: number; form: number; drive: number; level: number; xp?: number; nextXp?: number }; hero: HeroId; down: { downed: boolean; out: boolean; hold: number } } }).partner; if (!P && np) return { bar: onlineBar(s, np), name: 'P2', hero: np.hero, hp: np.player.hp, maxHp: np.player.maxHp, form: np.player.form, drive: np.player.drive, down: np.down.downed, out: np.down.out, revive: np.down.hold / REVIVE.hold, level: np.player.level, xp: np.player.xp ?? 0, nextXp: np.player.nextXp ?? 1 }; if (!P) return null; const q = slotPlayer(s, 1), d = P.slots[1].down; return { bar: (() => { try { return inSlot(s, 1, () => abilityView(s)); } catch { return null; } })(), name: P.names[1], hero: slotHero(s, 1), hp: q.hp, maxHp: q.maxHp, form: q.form, drive: q.drive, down: d.downed, out: d.out, revive: d.hold / REVIVE.hold, level: q.level, xp: q.xp, nextXp: q.nextXp }; })(), party: s.party ? { resonance: s.party.shared.resonance, resonanceT: s.party.shared.resonanceT, pair: s.party.shared.pair, chooser: s.party.chooser } : null, asc: (() => { try { return this.asChooserView(() => ascView(s)); } catch { return null; } })(), tips: (() => { try { return abilityTips(s); } catch { return null; } })(), phase: s.phase, seed: s.seed, hp: p.hp, maxHp: p.maxHp, xp: p.xp,
      nextXp: p.nextXp, level: p.level, seconds: s.time, kills: s.kills, enemies: s.enemies.length,
      dashCooldown: p.dashCooldown, sigCd: p.sigCd, odMeter: p.odMeter, odT: p.odT, sigCharge: sigCharge(s) ? Math.min(1, sigCharge(s)!.charge / SIG.stages[2]) : 0, sigTier: sigCharge(s)?.tier ?? -1, flying: p.flyT > 0, dashLeft: dashMax(s) - Math.min(dashMax(s), p.dashUsed), dashMax: dashMax(s), qCooldown: p.qCooldown, beamCooldown: p.beamCooldown, sphereCooldown: p.sphereCooldown, drive: p.drive, form: p.form, dragonCooldown: p.dragonCooldown, cometCooldown: p.cometCooldown, hero: s.hero, heroFormUnlocked: s.hero === 'vex' ? (s.b22.vex.forms[0] || s.b22.vex.forms[1]) : s.heroFormUnlocked, heroReady: s.hero !== 'kai' && formChoices(s).includes(1), lanceCharge: lance ? lance.charge / SORA.e.maxCharge : 0, lanceTier: lance ? SORA.e.tiers.reduce((t, v, i) => (lance.charge >= v ? i : t), -1) : -1, heroAct: s.hx?.act?.act ?? '', cometUnlocked: s.cometUnlocked, cometReady: formChoices(s).includes(2), apexUnlocked: s.apexUnlocked, apexReady: formChoices(s).includes(3), riftCooldown: p.riftCooldown, reversalCooldown: p.reversalCooldown, evadeCooldown: p.evadeCooldown, riftCharge: s.cast?.kind === 'rift' && !s.cast.released ? Math.min(1, s.cast.t / RIFT.maxCharge) : 0, selector: { open: !!s.selector?.open, pick: selectedForm(s) ?? 0, choices: formChoices(s), left: Math.max(0, SELECTOR_MAX - (s.selector?.held ?? 0)) }, cinema: !!s.cinema,
      formCooldown: p.formCooldown, offers: [...s.upgradeOffers], score: this.sim!.stats().score, deathShown: this.deathShown, boss: bossHud(s), cards: s.phase === 'upgrade' ? this.asChooserView(() => s.upgradeOffers.map(id => offerCard(s, id))) : [], owned: this.asChooserView(() => UPGRADES.filter(u => (s.upgradeStacks[u.id] ?? 0) > 0).map(u => ({ id: u.id, stacks: s.upgradeStacks[u.id] }))), map: withAlly(s, miniMap(s)),
      kit: kitSnap(s), cdMax: { q: [SURGE.cooldown, SCATTER.cooldown, METEOR.cooldown, ECHO.cooldown][p.form] ?? SURGE.cooldown, flare: RISE.cooldown * s.mods.beamCd, crucible: CRUCIBLE.cooldown * s.mods.sphereCd, dash: 3.2 * s.mods.dashCd, beam: (s.hero === 'ren' ? (p.form === 2 ? ASH_E.cooldown : p.form ? REN_E.cooldown : REN.e.cooldown) : s.hero === 'sora' ? SORA.e.cooldown : BEAM.cooldown) * s.mods.beamCd, sphere: (s.hero === 'ren' ? (p.form === 2 ? ASH_R.cooldown : p.form ? REN_R.cooldown : REN.r.cooldown) : s.hero === 'sora' ? SORA.r.cooldown : SPHERE.cooldown) * s.mods.sphereCd, form: (s.hero === 'kai' ? RULES.formCooldown : s.hero === 'ren' && p.form === 2 ? ASH.cooldown : ASCEND.cooldown) * s.mods.formCd, dragon: DRAGON.cooldown * s.mods.beamCd, comet: CANNON.cooldown * s.mods.sphereCd, rift: RIFT.cooldown * s.mods.beamCd, reversal: REVERSAL.cooldown * s.mods.sphereCd, evade: EVASION.cooldown }, run: runHud(s), victoryShown: this.victoryShown, rewardPick: s.rewardPick, contract: this.config.contract, boon: this.config.boon, rerolls: s.run?.rerollsLeft ?? 0, banishes: s.run?.banishesLeft ?? 0, reward: this.reward, lf: lfHud(s), marks: this.save.meta.marks, crest: this.save.meta.crest, bosses: s.bossesDefeated, sinceRevive: s.time - s.reviveAt, revives: s.mods.revive, arenaName: (ARENAS[s.arenaId] ?? ARENAS.gloam).name.toUpperCase() };
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
    if (this.finalized) return; this.finalized = true; if (this.net) return; if (this.endlessLeg) { this.recordB22(s, true); return; }   // the Classic result was recorded at the victory; the Endless leg never repeats Classic rewards
    let maxCat = 0; for (const c of ['core', 'beam', 'sphere', 'survival', 'mobility', 'pickup', 'drive'] as UpgradeCategory[]) maxCat = Math.max(maxCat, categoryStacks(s, c));
    const won = s.phase === 'victory', warden = s.bossesDefeated >= 1 || won;
    const classic = (s.plan?.mode ?? 'classic') === 'classic', practice = !!s.plan?.practice || s.plan?.mode === 'campaign';   // story missions are unranked and never pay per-run Marks (the one-time chapter reward is granted in recordB22)
    const result: RunResult = { hero: s.hero, runId: this.runId, arena: s.arenaId, won: classic && won, seconds: s.time, kills: s.kills, level: s.player.level, score: this.sim!.stats().score, wardenKills: classic && warden ? 1 : 0, seraphKills: classic && won ? 1 : 0, formsUsed: [...(s.run?.formsUsed ?? [])], maxCategoryStacks: maxCat, contract: this.config.contract };
    const out = practice ? { meta: this.save.meta, reward: null } : finalizeRun(this.save.meta, result);
    this.recordB22(s, false);
    this.save.meta = { ...out.meta, introSeen: true };
    for (const id of this.b22Grant?.chronicles ?? []) if (this.save.meta) { const m = CHRONICLE_BY_ID[id as ChronicleId].marks; this.save.meta = { ...this.save.meta, marks: Math.min(MARKS_CAP, this.save.meta.marks + m), lifetime: this.save.meta.lifetime + m }; }
    // B31A: the one-time chapter reward is applied after the run's own meta so it is never overwritten
    this.reward = out.reward ? { ...out.reward, firstRun: out.reward.firstRun && !out.meta.introSeen } : null; storeSave(this.save);
  }
  /** B22 records / mastery / cosmetics, applied at most once per run id (the ledger inside the save). Offline numbers stay LOCAL records. */
  private recordB22(s: GameState, endlessLeg: boolean) {
    if (!s.plan || !s.b22) return;   // hand-built states (tests) carry no B22 block
    const won = s.phase === 'victory', mode = endlessLeg ? 'endless' as const : s.plan.mode, cyc = s.b22.endless?.cycle ?? 0;
    const chapter = mode === 'vex_trial' ? Number(s.plan.id.slice(-1)) as 1 | 2 | 3 : undefined;
    const res: B22RunResult = { runId: endlessLeg ? `${this.runId}:endless` : this.runId, mode, hero: s.hero, arena: s.arenaId, party: s.b22.party ? 2 : 1, won: endlessLeg ? !!s.b22.endless?.extracted : won, seconds: s.time, kills: s.kills, level: s.player.level, score: this.sim!.stats().score, cycle: cyc, counters: s.b22.m, relics: s.b22.relics, branches: s.b22.branches, legends: s.b22.legendary, bosses: s.plan.steps.filter(st => st.kind === 'boss' && s.encounter.doneAt[st.id] !== undefined).map(st => st.boss!).concat(s.bossesDefeated > 0 && s.plan.mode === 'classic' ? ['warden'] : []), challengeId: this.challengeId, storyChapter: chapter, chronicleId: chronicleOfPlan(s.plan) ?? undefined, extracted: s.b22.endless?.extracted, practice: s.plan.practice, living: !!s.plan.living };
    const out = applyB22Result(migrateB22(this.save.b22), res); this.save.b22 = out.save; this.b22Grant = out.grant;
    storeSave(this.save);
  }
  /** Called by the renderer when the Death clip has finished and held. Ignored unless the sim is actually dead, so it can never show Results early. */
  /** B31A: marks earned for the chapter this run just completed for the first time (0 on replays and failures). */
  firstClearMarks(): number { const id = chronicleOfPlan(this.sim?.state.plan ?? { id: '', mode: '' }); return id && this.b22Grant?.chronicles.includes(id) ? CHRONICLE_BY_ID[id].marks : 0; }
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

const CATEGORY_SLOT: Partial<Record<string, OfferCard['slot']>> = { core: 'auto', beam: 'e', sphere: 'r', drive: 'f' };
const UPGRADE_SLOT: Partial<Record<UpgradeId, OfferCard['slot']>> = { pulse: 'q', dashcool: 'dash' };
function offerCard(s: GameState, id: UpgradeId): OfferCard {
  const u = UPGRADE_BY_ID[id], pv = previewUpgrade(s, id), ov = s.hero === 'kai' ? undefined : UPGRADE_OVERRIDES[s.hero][id];
  return { slot: UPGRADE_SLOT[id] ?? CATEGORY_SLOT[u.category], id, name: ov?.name ?? u.name, blurb: ov?.blurb ?? u.blurb, catName: s.hero === 'kai' ? undefined : HERO_KIT[s.hero].catNames[u.category], category: u.category, rarity: u.rarity, stack: s.upgradeStacks[id] ?? 0, max: u.maxStacks, label: pv.label, before: pv.before, after: pv.after };
}
function withAlly(s: GameState, m: MiniMap): MiniMap {
  const np = (s as unknown as { partner?: { player: { x: number; y: number; aimX: number; aimY: number }; down: { downed: boolean } } }).partner;
  if (s.party) { const q = slotPlayer(s, 1); return { ...m, ally: { x: q.x, y: q.y, ax: q.aimX, ay: q.aimY, down: s.party.slots[1].down.downed || s.party.slots[1].down.out } }; }
  if (np) return { ...m, ally: { x: np.player.x, y: np.player.y, ax: np.player.aimX, ay: np.player.aimY, down: np.down.downed } };
  return m;
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
  return { lf: s.lf ? lfMarks(s) : undefined, arena: s.arenaId, px: p.x, py: p.y, ax: p.aimX, ay: p.aimY, foes, near, nearest: Math.round(nearest), eliteNear, bossNear,
    hazards: s.hazards.filter(h => h.shape !== 'sigil' && h.damage > 0).map(h => ({ shape: h.shape, x: h.x, y: h.y, r: h.r, w: h.w ?? 0, h: h.h ?? 0, warn: h.fired ? 1 : 1 - Math.max(0, h.delay) / Math.max(0.01, h.total), live: h.fired })) };
}

const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
/** B31A: what the player is doing right now in a Chronicles mission, from the plan and the live encounter state. */
function campaignObjective(s: GameState): string {
  const st = s.plan.steps.find(x => s.encounter.doneAt[x.id] === undefined);
  if (!st) return 'MISSION COMPLETE';
  const up = !!s.encounter.spawned[st.id];
  if (st.kind === 'hold') return up ? `HOLD THE LINE · ${clock(Math.max(0, st.at + (st.hold ?? 0) - s.time))}` : 'PREPARE';
  if (st.kind === 'elite_wave') { const n = (s.encounter.waves?.[st.id] ?? []).filter(id => s.enemies.some(e => e.id === id && e.hp > 0)).length; return up ? `BREAK THE WAVE · ${n} LEFT` : st.trigger === 'time' ? `ASSAULT IN ${clock(Math.max(0, st.at - s.time))}` : 'BRACE'; }
  if (st.kind === 'boss') return up ? `DEFEAT ${(st.warnText ?? 'THE BOSS').replace(/^(THE|AN ECHO OF THE|A SHADOW OF THE) /, '')}` : 'BRACE';
  return 'MISSION';
}
function runHud(s: GameState): RunHud {
  const [w, f] = [BOSS_SCHEDULE[0].at, BOSS_SCHEDULE[1].at], wardenDone = !!s.encounter.spawned.warden && !s.enemies.some(e => e.kind === 'warden' && e.hp > 0);
  const finaleOut = !!s.encounter.spawned.seraph, bossUp = s.enemies.some(e => isBoss(e.kind) && e.hp > 0);
  const next = !s.encounter.spawned.warden ? { label: 'FRACTURE WARDEN', at: w } : !finaleOut ? { label: 'NULL SERAPH', at: f } : { label: bossUp ? 'DEFEAT THE SERAPH' : '', at: 0 };
  const a = s.announce && s.time - s.announce.at < 6 ? { text: s.announce.text, sub: s.announce.sub, age: s.time - s.announce.at } : null;
  return { t: s.time, wardenAt: w, finaleAt: f, wardenDone: wardenDone || s.bossesDefeated > 0, finaleOut, nextLabel: next.label, nextIn: Math.max(0, next.at - s.time), announce: a, objText: s.plan?.mode === 'campaign' ? campaignObjective(s) : undefined };
}

/** Online: the partner's fighter snapshot (player, hero, hx, cast, mods, ultimate) laid over the local state gives the same ability view as a local second fighter. */
function onlineBar(s: GS, np: unknown) {
  try {
    const q = np as { player: GS['player']; hero: GS['hero']; hx?: GS['hx']; cast?: GS['cast']; mods?: GS['mods']; heroFormUnlocked?: boolean; b22?: { ult?: GS['b22']['ult']; vex?: GS['b22']['vex'] } };
    const view = { ...s, player: q.player, hero: q.hero, hx: q.hx ?? s.hx, cast: q.cast ?? null, mods: q.mods ?? s.mods, heroFormUnlocked: q.heroFormUnlocked ?? s.heroFormUnlocked, b22: { ...s.b22, ult: q.b22?.ult ?? s.b22.ult, vex: q.b22?.vex ?? s.b22.vex } } as GS;
    return abilityView(view);
  } catch { return null; }
}
