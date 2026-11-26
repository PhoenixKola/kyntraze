import { SeededRng } from '../core/SeededRng';
import { RULES } from '../core/Rules';
import { makeState, type GameState, type InputState } from './GameState';
import { movePlayer } from './MovementSystem';
import { moveEnemies, updateEnemyShots, updateHazards } from './EnemyAiSystem';
import { updateDirector } from './EnemyDirector';
import { updateAutoWeapon, activateQ } from './WeaponSystem';
import { updateContactDamage } from './CombatSystem';
import { collectPickups } from './PickupSystem';
import { applyUpgrade, createOffer, gainXp } from './UpgradeSystem';
import { activateForm, formInput, updateCinema, updateSelector } from './FormSystem';
import { updateDrive } from './DriveSystem';
import { pruneDeadEntities } from './EntityRegistry';
import type { UpgradeId } from '../content/upgrades';
import { startAbility, updateAbilities, trackAim } from './AbilitySystem';
import { kaiCombatInput, formShiftInput } from './KaiCombat';
import { updateHero } from './HeroSystem';
import { gradeRun } from './GameTelemetry';
import { updateArenaHazards } from './ArenaHazards';
import { setActiveArena } from './CollisionSystem';
import type { ArenaId } from '../content/arenas';
import { applyRunConfig, NO_CONFIG, type RunConfig } from './RunConfig';
import { updateB22 } from './B22Tick';
import { chooseBranch, chooseLegendary, dueBranch, offerBranch, offerLegendary, onCast } from './BranchSystem';
import { startUltimate, ultReady } from './UltimateSystem';
import { chooseRelic, offerRelic } from './B22Encounters';
import type { BranchId } from '../b22/branches';
import type { LegendaryId } from '../b22/legendary';
import type { RelicId } from '../b22/relics';
import { beginEndlessLeg, continueEndless, extractNow } from './B22Tick';
import { startLiving, updateLiving } from './LivingFractures';
import { createParty, inSlot, standing, swapTo, tether, updateRevives, type Slot } from './CoopSystem';
import { resolveCoop } from './CoopCombos';
import type { RunConfig as RunCfg } from './RunConfig';
/** Seconds a refused Q / E / R press stays armed (B20). */
export const ABILITY_BUFFER = 0.15;
export class Simulation {
  readonly state: GameState;
  readonly rng: SeededRng;
  private qHeld = false;
  private fHeld = false;
  private eHeld = false;
  private rHeld = false; private kc = { sig: false, od: false };
  constructor(seed: number, arenaId: ArenaId = 'gloam', cometUnlocked = false, apexUnlocked = false, config: RunConfig = NO_CONFIG) { this.rng = new SeededRng(seed); setActiveArena(arenaId); this.state = makeState(seed, arenaId, cometUnlocked, apexUnlocked); applyRunConfig(this.state, config); startLiving(this.state); if (this.state.plan.cycle > 0) this.state.b22.endless = { fromT: 0, cycle: 0, bossAt: 120, offered: false, extracted: false }; }
  private readonly buf = { q: 0, e: 0, r: 0 };
  /** B22.6: bring a second fighter into the SAME simulation (local couch or an online peer). */
  joinPartner(config: RunCfg, mode: 'local' | 'online' = 'local', names: [string, string] = ['P1', 'P2']) { return createParty(this.state, config, mode, names); }
  step(dt: number, input: InputState, input2?: InputState) {
    const s = this.state; if (s.phase !== 'running') return;
    if (s.party) { this.stepParty(dt, [input, input2 ?? { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false }]); return; }
    { const f = s.player.form, id = s.hero === 'kai' ? f : s.hero === 'ren' ? 10 : s.hero === 'sora' ? 11 : 11 + f; if (f && !s.run.formsUsed.includes(id)) s.run.formsUsed.push(id); }   // B19: Ren / Sora log their own ids (10 / 11), never Kai's Flarebound   // B18: feats read the forms Kai actually used
    if (s.cinema) { updateCinema(s, dt); this.fHeld = !!(input.f || input.fHeld); this.qHeld = input.q; this.eHeld = !!input.beam; this.rHeld = !!input.sphere; return; }   // B12: the reveal freezes the whole run (clock, enemies, shots, hazards, cooldowns, i-frames)
    if (s.selector.open) {   // the form selector freezes the run just like the reveal; only its own input is read
      const fd = !!(input.f || input.fHeld); trackAim(s, input);
      updateSelector(s, dt, { pick: input.selPick, move: input.selMove, confirm: input.selConfirm, cancel: input.selCancel, fEdge: fd && !this.fHeld });
      this.fHeld = fd; this.qHeld = input.q; this.eHeld = !!input.beam || !!input.beamHeld; this.rHeld = !!input.sphere; return;
    }
    s.time += dt;
    trackAim(s, input); s.hx.moving = input.x !== 0 || input.y !== 0;
    movePlayer(s, input, dt);
    // B20 input buffer: a Q / E / R press refused only because a cast or a cooldown is about to end is retried for ABILITY_BUFFER seconds, then dropped. Sora's E is a hold/release charge, so it is never buffered.
    const bf = this.buf; bf.q = Math.max(0, bf.q - dt); bf.e = Math.max(0, bf.e - dt); bf.r = Math.max(0, bf.r - dt);
    const ult = !!s.b22.ult.act;   // B22: the ultimate owns the fighter's hands until it ends
    const castQ = () => { s.b22.ctxSlot = 'q'; const ok = !ult && activateQ(s); s.b22.ctxSlot = null; if (ok) onCast(s, 'q'); return ok; };
    if (input.q && !this.qHeld) { if (!castQ()) bf.q = ABILITY_BUFFER; else bf.q = 0; } else if (bf.q > 0 && castQ()) bf.q = 0;
    const fDown = !!(input.f || input.fHeld); formShiftInput(s, input, fDown, this.fHeld); formInput(s, fDown, this.fHeld);   // the press edge counts too, so a tap shorter than one tick is never lost
    const bufE = s.hero !== 'sora';
    const castE = () => { const ok = !ult && startAbility(s, 'beam'); if (ok) onCast(s, 'e'); return ok; };
    const castR = () => { if (ult) return false; if (ultReady(s) && startUltimate(s)) return true; const ok = startAbility(s, 'sphere'); if (ok) onCast(s, 'r'); return ok; };
    if (input.beam && !this.eHeld) { if (!castE() && bufE) bf.e = ABILITY_BUFFER; else bf.e = 0; } else if (bf.e > 0 && bufE && castE()) bf.e = 0;
    if (input.sphere && !this.rHeld) { if (!castR()) bf.r = ABILITY_BUFFER; else bf.r = 0; } else if (bf.r > 0 && castR()) bf.r = 0;
    this.qHeld = input.q; this.fHeld = fDown; this.eHeld = !!input.beam || !!input.beamHeld; this.rHeld = !!input.sphere; s.eHeld = !!input.beamHeld;
    this.kc = kaiCombatInput(s, input, this.kc);
    const p = s.player; p.qCooldown = Math.max(0, p.qCooldown - dt);
    if (s.mods.regen > 0 && !s.run.noRegen) p.hp = Math.min(p.maxHp, p.hp + s.mods.regen * dt);
    updateDrive(s, dt);
    updateAbilities(s, dt);
    if (s.hero !== 'kai') updateHero(s, dt);
    updateDirector(s, this.rng, dt);
    moveEnemies(s, dt);
    updateEnemyShots(s, dt);
    updateArenaHazards(s);
    updateHazards(s, dt);
    if (!s.b22.ult.act) updateAutoWeapon(s, dt);
    updateB22(s, dt, input, this.rng);
    updateContactDamage(s);
    if (s.phase !== 'running') return;
    if (s.lf) updateLiving(s, dt);
    collectPickups(s, dt, () => { s.upgradeOffers = createOffer(s, this.rng); offerLegendary(s); });
    if (s.phase === 'running' && s.bossReward > 0 && s.time >= s.rewardAt) { s.bossReward--; s.phase = 'upgrade'; s.rewardPick = true; s.upgradeOffers = createOffer(s, this.rng, true); offerLegendary(s); }
    pruneDeadEntities(s);
    for (const fx of s.impacts) fx.ttl -= dt;
    s.impacts = s.impacts.filter(effect => effect.ttl > 0).slice(-RULES.maxFx);
  }
  chooseUpgrade(id: UpgradeId) {
    const applied = this.asChooser(() => { const ok = applyUpgrade(this.state, id); if (ok) this.afterPick(); return ok; });
    if (applied) this.advanceQueue();
    if (applied && this.state.phase === 'running' && this.state.player.xp >= this.state.player.nextXp) {
      // Carry over surplus XP; schedule another legit choice rather than lose earned XP.
      gainXp(this.state, 0.000001, () => { this.state.upgradeOffers = createOffer(this.state, this.rng); });
    }
    return applied;
  }
  /** B22: a normal pick may be followed by an earned branch choice or a boss-paid relic offer; either keeps the pause open. */
  private afterPick() {
    const s = this.state;
    if (dueBranch(s) && offerBranch(s)) { s.phase = 'upgrade'; s.upgradeOffers = []; return; }
    if (s.b22.relicWanted) { s.b22.relicWanted = false; offerRelic(s, this.rng); }
  }
  chooseBranch(id: BranchId) { const ok = this.asChooser(() => chooseBranch(this.state, id)); if (ok) { if (this.state.party) this.advanceQueue(); else if (this.state.player.xp >= this.state.player.nextXp) gainXp(this.state, 0.000001, () => { this.state.upgradeOffers = createOffer(this.state, this.rng); offerLegendary(this.state); }); } return ok; }
  chooseLegendary(id: LegendaryId) { const ok = this.asChooser(() => chooseLegendary(this.state, id)); if (ok) this.advanceQueue(); return ok; }
  chooseRelic(id: RelicId) { const ok = this.asChooser(() => chooseRelic(this.state, id)); if (ok) this.advanceQueue(); return ok; }
  /** Co-op: pick / banish / reroll act on the fighter whose turn it is. */
  asChooser<T>(fn: () => T): T { const p = this.state.party; return p && p.chooser !== null ? inSlot(this.state, p.chooser, fn) : fn(); }
  /** Read the state as the choosing fighter sees it (cards, offers, previews). */
  view<T>(fn: () => T): T { const p = this.state.party; return p && this.state.phase === 'upgrade' ? this.asChooser(fn) : fn(); }
  private advanceQueue() { const s = this.state, p = s.party; if (!p || s.phase !== 'running') return; p.chooser = null; this.beginChoice(); }
  private beginChoice(): void {
    const s = this.state, p = s.party; if (!p || s.phase !== 'running' || !p.queue.length) return;
    const i = p.queue.shift()!; if (!standing(s, i) && p.slots[i].down.out) return this.beginChoice();
    p.chooser = i; inSlot(s, i, () => { s.upgradeOffers = createOffer(s, this.rng, s.rewardPick); offerLegendary(s); }); s.phase = 'upgrade';
  }
  /** B22 Endless: opt in after a Classic victory, extract at a cycle milestone, or push on. */
  continueEndless() { return beginEndlessLeg(this.state); }
  extract() { return extractNow(this.state); }
  pushOn() { return continueEndless(this.state); }
  /** QA / tests: the next level-up, exactly as a real XP pickup would trigger it. */
  debugLevelUp() { const s = this.state; if (s.phase !== 'running') return; gainXp(s, (s.player.nextXp - s.player.xp) / s.mods.xp, () => { s.upgradeOffers = createOffer(s, this.rng); }); }
  /** B18 Reroll Module: redraw the current offer (never the same three when the pool allows). Only on the level-up screen, bounded by the run's charges. */
  reroll() { return this.asChooser(() => this.rerollNow()); }
  private rerollNow() {
    const s = this.state; if (s.phase !== 'upgrade' || s.run.rerollsLeft <= 0) return false;
    s.run.rerollsLeft--; s.upgradeOffers = createOffer(s, this.rng, s.rewardPick, s.upgradeOffers); return true;
  }
  /** B18 Banish Module: strike one offered card from the rest of the run and draw its replacement. */
  banish(id: UpgradeId) { return this.asChooser(() => this.banishNow(id)); }
  private banishNow(id: UpgradeId) {
    const s = this.state; if (s.phase !== 'upgrade' || s.run.banishesLeft <= 0 || !s.upgradeOffers.includes(id)) return false;
    s.run.banishesLeft--; s.run.banished.push(id);
    const keep = s.upgradeOffers.filter(o => o !== id), fresh = createOffer(s, this.rng, s.rewardPick, s.upgradeOffers).find(o => !keep.includes(o));
    s.upgradeOffers = fresh ? [...keep, fresh] : keep; return true;
  }
  togglePause() { const phase = this.state.phase; if (phase === 'running') this.state.phase = 'paused'; else if (phase === 'paused') this.state.phase = 'running'; }
  forcePause() { if (this.state.phase === 'running') this.state.phase = 'paused'; }
  stats() { const s = this.state; return gradeRun({ seed: s.seed, survivalSeconds: s.time, kills: s.kills, level: s.player.level, victory: s.phase === 'victory', bosses: s.bossesDefeated }); }

  /* ------------------------------------------------------------------ B22.6 party step */
  private stepParty(dt: number, inputs: [InputState, InputState]) {
    const s = this.state, P = s.party!; s.time += dt; P.shared.time = s.time;
    const evStart = s.abilityEvents.length;
    for (let i = 0; i < P.slots.length; i++) {
      P.slots[i].input = inputs[i];   // the renderer animates each fighter from their own stored input
      if (!standing(s, i)) continue;
      swapTo(s, i); const n0 = s.abilityEvents.length; this.playerPhase(s, dt, inputs[i], P.slots[i]);
      for (let k = n0; k < s.abilityEvents.length; k++) s.abilityEvents[k].slot = i;
    }
    swapTo(s, 0); updateRevives(s, dt); tether(s);
    updateDirector(s, this.rng, dt);
    moveEnemies(s, dt); updateEnemyShots(s, dt); updateArenaHazards(s); updateHazards(s, dt);
    for (let i = 0; i < P.slots.length; i++) {
      if (!standing(s, i)) continue; swapTo(s, i);
      if (!s.b22.ult.act) updateAutoWeapon(s, dt);
      P.slots[i].lastHits = s.b22.hits.slice();
      updateB22(s, dt, inputs[i], this.rng); updateContactDamage(s);
      if (s.phase !== 'running') break;
      collectPickups(s, i === 0 ? dt : 0, () => undefined);
    }
    swapTo(s, 0); void evStart;
    if (s.phase === 'running') resolveCoop(s, dt);
    if (s.phase === 'running' && s.lf) updateLiving(s, dt);
    if (s.phase !== 'running') return;
    if (s.bossReward > 0 && s.time >= s.rewardAt) { s.bossReward--; s.rewardPick = true; for (let i = 0; i < P.slots.length; i++) if (!P.slots[i].down.out) P.queue.push(i); }
    pruneDeadEntities(s);
    if (s.phase === 'running' && P.queue.length) this.beginChoice();
    for (const fx of s.impacts) fx.ttl -= dt; s.impacts = s.impacts.filter(e => e.ttl > 0).slice(-RULES.maxFx);
  }
  /** The solo per-fighter pass, run once per standing fighter with that fighter swapped in. Forms start instantly in co-op (no world freeze); the timed team sync is handled by Resonance. */
  private playerPhase(s: GameState, dt: number, input: InputState, slot: Slot) {
    const edge = slot.edge, bf = edge.buf;
    { const f = s.player.form, id = s.hero === 'kai' ? f : s.hero === 'ren' ? 10 : s.hero === 'sora' ? 11 : 11 + f; if (f && !s.run.formsUsed.includes(id)) s.run.formsUsed.push(id); }
    trackAim(s, input); s.hx.moving = input.x !== 0 || input.y !== 0;
    movePlayer(s, input, dt);
    bf.q = Math.max(0, bf.q - dt); bf.e = Math.max(0, bf.e - dt); bf.r = Math.max(0, bf.r - dt);
    const ult = !!s.b22.ult.act;
    const castQ = () => { s.b22.ctxSlot = 'q'; const ok = !ult && activateQ(s); s.b22.ctxSlot = null; if (ok) onCast(s, 'q'); return ok; };
    if (input.q && !edge.q) { if (!castQ()) bf.q = ABILITY_BUFFER; else bf.q = 0; } else if (bf.q > 0 && castQ()) bf.q = 0;
    const fDown = !!(input.f || input.fHeld); const wasF = edge.f; formShiftInput(s, input, fDown, wasF); formInput(s, fDown, wasF);
    if (s.selector.open) { activateForm(s); s.selector.open = false; }
    if (s.cinema) { const c = s.cinema; s.cinema = null; s.player.form = c.to as 1 | 2 | 3; s.player.drive = 100; s.player.invulnerable = Math.max(s.player.invulnerable, 0.5); if (s.hero === 'vex') s.vexSeen[c.to - 1]++; if (s.hero === 'ren' && c.to === 2) s.renSeen2++; else if (s.hero !== 'kai') s.heroFormSeen++; slot.formAt = s.time; s.b22.ev.push({ id: s.b22.evId++, kind: 'form_instant', x: s.player.x, y: s.player.y }); }
    const bufE = s.hero !== 'sora';
    const castE = () => { const ok = !ult && startAbility(s, 'beam'); if (ok) { onCast(s, 'e'); slot.aimAtE = { x: s.player.aimX, y: s.player.aimY, t: s.time }; } return ok; };
    const castR = () => { if (ult) return false; if (ultReady(s) && startUltimate(s)) return true; const ok = startAbility(s, 'sphere'); if (ok) onCast(s, 'r'); return ok; };
    if (input.beam && !edge.e) { if (!castE() && bufE) bf.e = ABILITY_BUFFER; else bf.e = 0; } else if (bf.e > 0 && bufE && castE()) bf.e = 0;
    if (input.sphere && !edge.r) { if (!castR()) bf.r = ABILITY_BUFFER; else bf.r = 0; } else if (bf.r > 0 && castR()) bf.r = 0;
    edge.q = input.q; edge.f = fDown; edge.e = !!input.beam || !!input.beamHeld; edge.r = !!input.sphere; s.eHeld = !!input.beamHeld;
    { const k = kaiCombatInput(s, input, { sig: !!edge.sig, od: !!edge.od }); edge.sig = k.sig; edge.od = k.od; }
    const p = s.player; p.qCooldown = Math.max(0, p.qCooldown - dt);
    if (s.mods.regen > 0 && !s.run.noRegen) p.hp = Math.min(p.maxHp, p.hp + s.mods.regen * dt);
    updateDrive(s, dt); updateAbilities(s, dt); if (s.hero !== 'kai') updateHero(s, dt);
  }
}
