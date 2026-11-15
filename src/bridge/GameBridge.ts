import type { Simulation } from '../sim/Simulation';
import { blankSnapshot, type MiniMap, type RunHud, type UiSnapshot } from './UiSnapshot';
import { UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '../content/upgrades';
import { previewUpgrade } from '../sim/UpgradeSystem';
import { ENEMIES, isBoss } from '../content/enemies';
import { BOSSES } from '../content/bosses';
import { ARENAS } from '../content/arenas';
import { BEAM, SPHERE } from '../content/abilities';
import { CANNON, DRAGON } from '../content/cometheart';
import { EVASION, REVERSAL, RIFT } from '../content/stillfire';
import { formChoices, selectedForm, activateForm, SELECTOR_MAX } from '../sim/FormSystem';
import { BOSS_SCHEDULE } from '../content/encounters';
import { RULES } from '../core/Rules';
import { storeSave, type SaveV1, type GameSettings } from '../sim/SaveSystem';
export class GameBridge {
  private listeners = new Set<() => void>();
  private sim: Simulation | null = null;
  private current = blankSnapshot;
  private lastPhase = '';
  private deathShown = false;
  private victoryShown = false;
  constructor(private readonly save: SaveV1) {}
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
    const p = s.player;
    const phaseChanged = this.lastPhase !== s.phase;
    if (s.apexUnlockedNow) { s.apexUnlockedNow = false; this.save.unlocks = { cometheart: false, ...(this.save.unlocks ?? {}), stillfire: true }; storeSave(this.save); }
    if (s.cometUnlockedNow) { s.cometUnlockedNow = false; this.save.unlocks = { ...(this.save.unlocks ?? { cometheart: false }), cometheart: true }; storeSave(this.save); }
    if (s.phase !== 'dead') this.deathShown = false;
    if (s.phase !== 'victory') this.victoryShown = false;
    this.current = { phase: s.phase, seed: s.seed, hp: p.hp, maxHp: p.maxHp, xp: p.xp,
      nextXp: p.nextXp, level: p.level, seconds: s.time, kills: s.kills, enemies: s.enemies.length,
      dashCooldown: p.dashCooldown, qCooldown: p.qCooldown, beamCooldown: p.beamCooldown, sphereCooldown: p.sphereCooldown, drive: p.drive, form: p.form, dragonCooldown: p.dragonCooldown, cometCooldown: p.cometCooldown, cometUnlocked: s.cometUnlocked, cometReady: formChoices(s).includes(2), apexUnlocked: s.apexUnlocked, apexReady: formChoices(s).includes(3), riftCooldown: p.riftCooldown, reversalCooldown: p.reversalCooldown, evadeCooldown: p.evadeCooldown, riftCharge: s.cast?.kind === 'rift' && !s.cast.released ? Math.min(1, s.cast.t / RIFT.maxCharge) : 0, selector: { open: !!s.selector?.open, pick: selectedForm(s) ?? 0, choices: formChoices(s), left: Math.max(0, SELECTOR_MAX - (s.selector?.held ?? 0)) }, cinema: !!s.cinema,
      formCooldown: p.formCooldown, offers: [...s.upgradeOffers], score: this.sim!.stats().score, deathShown: this.deathShown, boss: bossHud(s), cards: s.phase === 'upgrade' ? s.upgradeOffers.map(id => offerCard(s, id)) : [], owned: UPGRADES.filter(u => (s.upgradeStacks[u.id] ?? 0) > 0).map(u => ({ id: u.id, stacks: s.upgradeStacks[u.id] })), map: miniMap(s),
      cdMax: { dash: 3.2 * s.mods.dashCd, beam: BEAM.cooldown * s.mods.beamCd, sphere: SPHERE.cooldown * s.mods.sphereCd, form: RULES.formCooldown * s.mods.formCd, dragon: DRAGON.cooldown * s.mods.beamCd, comet: CANNON.cooldown * s.mods.sphereCd, rift: RIFT.cooldown * s.mods.beamCd, reversal: REVERSAL.cooldown * s.mods.sphereCd, evade: EVASION.cooldown }, run: runHud(s), victoryShown: this.victoryShown, rewardPick: s.rewardPick, bosses: s.bossesDefeated, sinceRevive: s.time - s.reviveAt, revives: s.mods.revive, arenaName: (ARENAS[s.arenaId] ?? ARENAS.gloam).name.toUpperCase() };
    if ((s.phase === 'dead' || s.phase === 'victory') && phaseChanged) {
      const stats = this.sim!.stats();
      if (!this.save.best || stats.score > this.save.best.score) { this.save.best = stats; storeSave(this.save); }
    }
    this.lastPhase = s.phase;
    if (force || phaseChanged || this.listeners.size) this.listeners.forEach(listener => listener());
  }
  /** Called by the renderer when the Death clip has finished and held. Ignored unless the sim is actually dead, so it can never show Results early. */
  markDeathShown() { if (this.sim?.state.phase !== 'dead' || this.deathShown) return; this.deathShown = true; this.publish(true); }
  /** Called by the scene once the victory beat has played. Ignored unless the run is actually won. */
  markVictoryShown() { if (this.sim?.state.phase !== 'victory' || this.victoryShown) return; this.victoryShown = true; this.publish(true); }
  pause() { this.sim?.forcePause(); this.publish(true); }
  togglePause() { this.sim?.togglePause(); this.publish(true); }
  /** Form selector, from the pointer: hover highlights a card, a click starts it. */
  pickForm(f: 1 | 2 | 3, confirm: boolean) { const s = this.sim?.state; if (!s?.selector.open || !formChoices(s).includes(f)) return; s.selector.pick = f; if (confirm) activateForm(s, f); this.publish(true); }
  choose(id: UpgradeId) { this.sim?.chooseUpgrade(id); this.publish(true); }
  debugGrantXp(offers?: UpgradeId[]) { const sim = this.sim; if (!sim) return; sim.debugLevelUp(); if (offers && sim.state.phase === 'upgrade') sim.state.upgradeOffers = offers; this.publish(true); }
}

import type { GameState } from '../sim/GameState';
import type { BossHud } from './UiSnapshot';
function bossHud(s: GameState): BossHud | null {
  const b = s.enemies.find(e => (e.kind === 'warden' || e.kind === 'seraph') && e.hp > 0); if (!b || !b.ai) return null;
  const def = BOSSES[b.kind as 'warden' | 'seraph'];
  return { id: def.id, name: def.name, hp: b.hp, maxHp: b.maxHp, phase: b.ai.phase, phases: 2, mode: b.mode, intro: b.mode === 'intro' ? b.modeT : 0, invuln: b.ai.invuln, exposed: b.ai.exposed };
}

function offerCard(s: GameState, id: UpgradeId) {
  const u = UPGRADE_BY_ID[id], pv = previewUpgrade(s, id);
  return { id, name: u.name, blurb: u.blurb, category: u.category, rarity: u.rarity, stack: s.upgradeStacks[id] ?? 0, max: u.maxStacks, label: pv.label, before: pv.before, after: pv.after };
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
