/** The once-per-tick B22 update: relic timers and triggers, real-event scanning (mastery counters, branch / legendary effects), scheduled effects and zones, the ultimate, challenge modifiers, Endless cycles and extraction, the time cap and non-boss run endings. Called from Simulation.step after the classic systems so it only ever reads what they just did. */
import type { GameState, InputState } from './GameState';
import type { SeededRng } from '../core/SeededRng';
import { RELIC_RULES } from '../b22/relics';
import { b22Emit, bump } from '../b22/state';
import { MODIFIER_RULES } from '../b22/challenges';
import { ENDLESS_CYCLE, ENDLESS_PLAN } from '../b22/plan';
import { isBoss } from '../content/enemies';
import { onAbilityEvent, updateFx, zoneFx, areaFx } from './BranchSystem';
import { updateUltimate, updateUltimateUnlock } from './UltimateSystem';
import { gambleRelics, updateEncounters } from './B22Encounters';
import { winRun } from './CombatSystem';
import { activeForm } from './B22Mastery';
import { normalize } from '../core/Math';

const alive = (e: { hp: number }) => e.hp > 0;
export function onPerfectDodge(s: GameState) {
  const b = s.b22; bump(b, 'dodge.perfect');
  if (b.relics.includes('void_hourglass') && (b.relicCd.void_hourglass ?? 0) <= 0) { b.relicCd.void_hourglass = RELIC_RULES.hourglass.cooldown; b.hourT = RELIC_RULES.hourglass.duration; b22Emit(b, 'hourglass', s.player.x, s.player.y, { n: RELIC_RULES.hourglass.radius }); }
}
export function updateB22(s: GameState, dt: number, input: InputState, rng: SeededRng) {
  const b = s.b22, p = s.player, mods = s.plan.modifiers;
  for (const k in b.relicCd) b.relicCd[k] = Math.max(0, b.relicCd[k] - dt);
  b.dawnT = Math.max(0, b.dawnT - dt); b.hourT = Math.max(0, b.hourT - dt); b.featherArmed = Math.max(0, b.featherArmed - dt); b.momentumT = Math.max(0, b.momentumT - dt);
  if (b.sigilCharge > 0 && s.time - b.sigilAt > RELIC_RULES.sigil.expire) b.sigilCharge = 0;
  b.bearings = b.bearings.filter(t => t > s.time);
  for (const k in b.legendCd) void k;
  if (b.vex.requiem < 0) b.vex.requiem = 0;

  /* ---- dash start / end: Anchor of Dawn, Rift Key, Skyforge Feather arming, Fractured Momentum */
  const dashing = p.dashRemaining > 0;
  if (dashing && !b.dashStart) {
    b.dashStart = { x: p.x, y: p.y };
    if (mods.includes('fractured_momentum')) b.momentumT = MODIFIER_RULES.momentum.secs;
    if (b.relics.includes('skyforge_feather') && (b.relicCd.skyforge_feather ?? 0) <= 0) b.featherArmed = RELIC_RULES.feather.window;
    if (b.relics.includes('rift_key') && (b.relicCd.rift_key ?? 0) <= 0 && s.enemies.some(e => alive(e) && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < 180 ** 2)) {
      b.relicCd.rift_key = RELIC_RULES.key.cooldown; zoneFx(s, { kind: 'circle', x: p.x, y: p.y, x2: p.x, y2: p.y, r: RELIC_RULES.key.radius, dur: RELIC_RULES.key.duration, tick: 0.2, dmg: RELIC_RULES.key.dps * 0.2, push: RELIC_RULES.key.push, src: 'rift_key' }); b22Emit(b, 'rift', p.x, p.y, { n: RELIC_RULES.key.radius });
    }
  } else if (!dashing && b.dashStart) {
    const len = Math.hypot(p.x - b.dashStart.x, p.y - b.dashStart.y); b.lastDashLen = len; b.dashStart = null;
    if (b.relics.includes('anchor_of_dawn') && len >= RELIC_RULES.dawn.minDash && (b.relicCd.anchor_of_dawn ?? 0) <= 0) { b.relicCd.anchor_of_dawn = RELIC_RULES.dawn.cooldown; b.dawnT = RELIC_RULES.dawn.duration; areaFx(s, p.x, p.y, RELIC_RULES.dawn.radius, 0, RELIC_RULES.dawn.push, 0.3, 10, 'dawn_ring'); }
  }

  /* ---- Paradox Compass: reversing heading after a real hold; stick jitter never counts */
  if (b.relics.includes('paradox_compass')) {
    const d = normalize(input.x, input.y), moving = d.x !== 0 || d.y !== 0, h = b.heading;
    if (moving) {
      const a = Math.atan2(d.y, d.x);
      if (!h.set) { h.a = a; h.held = 0; h.dist = 0; h.set = true; }
      else { let da = a - h.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) >= Math.PI / 2 && h.held >= RELIC_RULES.compass.hold && h.dist >= RELIC_RULES.compass.travel) { if (b.bearings.length < RELIC_RULES.compass.max) b.bearings.push(s.time + RELIC_RULES.compass.life); else b.bearings[0] = s.time + RELIC_RULES.compass.life; b22Emit(b, 'bearing', p.x, p.y, { n: b.bearings.length }); h.a = a; h.held = 0; h.dist = 0; }
        else if (Math.abs(da) < Math.PI / 4) { h.held += dt; h.dist += p.speed * dt; h.a = a; }
        else { h.held = 0; h.dist = 0; h.a = a; } }   // an early flip is jitter: the hold starts over
    } else { h.held = 0; h.dist = 0; }
  }

  /* ---- Crownless Sigil: a boss opens, or a shield-bearer drops its guard */
  if (b.relics.includes('crownless_sigil')) {
    for (const e of s.enemies) {
      if (!alive(e)) continue; const open = (isBoss(e.kind) && !e.part && !!e.ai?.exposed) || ((e.kind === 'aegis' || e.kind === 'citadel_bulwark') && e.mode === 'recover'); const key = `sg${e.id}`, was = b.relicCd[key] ?? 0;
      if (open && !was) { b.sigilCharge = 1; b.sigilAt = s.time; b22Emit(b, 'sigil', e.x, e.y); } b.relicCd[key] = open ? 1e9 : 0;
    }
    if (s.time % 7 < dt) for (const k in b.relicCd) if (k.startsWith('sg') && !s.enemies.some(e => `sg${e.id}` === k)) delete b.relicCd[k];
  }

  /* ---- real events -> mastery counters + branch / legendary effects */
  for (const ev of s.abilityEvents) {
    if (ev.id <= b.evCursor) continue; b.evCursor = Math.max(b.evCursor, ev.id);
    onAbilityEvent(s, ev.kind, ev.x, ev.y, ev.n);
  }
  if (s.hero === 'sora' && b.branches.includes('stormline_array')) for (const bo of s.hx.bolts) if (bo.kind === 'volley' && bo.id > (b.legendMisc.lastBolt ?? 0)) { bo.pierce = 3; bo.homing = 0; b.legendMisc.lastBolt = Math.max(b.legendMisc.lastBolt ?? 0, bo.id); }
  updateFx(s, dt);
  if (s.hero === 'vex' && b.vex.nullWaltz > 0 && s.time >= b.vex.waltzAt) {
    const t = s.enemies.filter(alive).sort((x, y) => (x.x - p.x) ** 2 + (x.y - p.y) ** 2 - ((y.x - p.x) ** 2 + (y.y - p.y) ** 2))[0];
    b.vex.nullWaltz--; b.vex.waltzAt = s.time + 0.22;
    if (t && (t.x - p.x) ** 2 + (t.y - p.y) ** 2 < 230 ** 2) { areaFx(s, t.x, t.y, 70, p.qDamage * 1.1, 40, 0.3, 3, 'waltz'); }
  }
  updateUltimateUnlock(s); updateUltimate(s, dt);

  /* ---- plan bookkeeping */
  updateEncounters(s, rng); gambleRelics(s, rng);
  b.hits.length = 0;
  const form = activeForm(s); if (form) bump(b, `time.${form}`, dt);
  if (s.phase === 'running') {
    if (b.endStep) { b.endStep = null; winRun(s); return; }
    const plan = s.plan;
    if (plan.duration > 0 && s.time >= plan.duration && !plan.steps.some(x => s.encounter.doneAt[x.id] !== undefined && x.ends)) { s.phase = 'dead'; b.timeUp = true; return; }
    if (b.endless) {
      const cyc = Math.floor((s.time - b.endless.fromT) / ENDLESS_CYCLE);
      if (cyc > b.endless.cycle) { b.endless.cycle = cyc; b.endless.offered = false; }
      if (cyc >= 1 && !b.endless.offered && s.time - b.endless.fromT >= cyc * ENDLESS_CYCLE) { b.endless.offered = true; s.phase = 'extract'; s.announce = { id: 'extract', text: `CYCLE ${cyc} SURVIVED`, sub: 'Extract with your rewards, or push into the next cycle', at: s.time }; }
    }
  }
}
/** Starts the Endless leg after a Classic victory (an explicit player choice). The Classic result must already be recorded by the caller. */
export function beginEndlessLeg(s: GameState): boolean {
  if (s.phase !== 'victory' || s.plan.mode !== 'classic') return false;
  s.plan = ENDLESS_PLAN; s.phase = 'running'; s.victoryAt = -1; s.b22.endless = { fromT: s.time, cycle: 0, bossAt: s.time + 120, offered: false, extracted: false };
  s.encounter.forced = false; s.spawnTimer = 1.5; s.arenaHazard.nextAt = s.time + 20; s.lastBossDefeatAt = s.time; s.player.hp = Math.min(s.player.maxHp, s.player.hp + s.player.maxHp * 0.5);
  s.b22.m['endless.legs'] = 1; return true;
}
export const extractNow = (s: GameState) => { if (s.phase !== 'extract' || !s.b22.endless) return false; s.b22.endless.extracted = true; s.phase = 'victory'; s.victoryAt = s.time; s.hazards = []; s.enemyShots = []; s.enemies = []; return true; };
export const continueEndless = (s: GameState) => { if (s.phase !== 'extract') return false; s.phase = 'running'; return true; };
