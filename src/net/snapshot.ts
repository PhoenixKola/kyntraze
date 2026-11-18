/** Server -> client state view. The server serialises ONLY what a renderer / HUD needs (never a raw GameState), rounded and culled to what is near either fighter plus all bosses; the client rebuilds a GameState-shaped object from it so the unchanged renderers and HUD work. */
import type { GameState } from '../sim/GameState';
import { makeState } from '../sim/GameState';
import { CLASSIC_PLAN } from '../b22/plan';
import { inSlot, slotPlayer } from '../sim/CoopSystem';
import { isBoss } from '../content/enemies';

const r1 = (v: number) => Math.round(v * 10) / 10;
const CULL = 1300;
export interface Snap { tick: number; time: number; phase: string; arena: string; kills: number; plan: { id: string; mode: string; name: string }; announce: GameState['announce']; me: unknown; partner: unknown; enemies: unknown[]; shots: unknown[]; hazards: unknown[]; pickups: unknown[]; impacts: unknown[]; abil: unknown[]; enemyEv: unknown[]; b22: unknown; offers: string[]; stacks: Record<string, number>; chooser: number | null; party: unknown }
const fighter = (s: GameState) => ({ player: { ...s.player, x: r1(s.player.x), y: r1(s.player.y), vx: r1(s.player.vx), vy: r1(s.player.vy) }, hero: s.hero, hx: { act: s.hx.act, bolts: s.hx.bolts.slice(0, 40), orbs: s.hx.orbs, orbPhase: s.hx.orbPhase, rings: s.hx.rings, arcs: s.hx.arcs, strike: s.hx.strike, moving: s.hx.moving, autoStep: s.hx.autoStep, t: s.hx.t }, cast: s.cast, sphere: s.sphere, mods: s.mods, aim: s.aim, heroFormUnlocked: s.heroFormUnlocked, b22: { ult: s.b22.ult, relics: s.b22.relics, branches: s.b22.branches, legendary: s.b22.legendary, branchOffer: s.b22.branchOffer, relicOffer: s.b22.relicOffer, legendOffer: s.b22.legendOffer, vex: s.b22.vex, marks: s.b22.marks, zones: s.b22.zones, ev: s.b22.ev.slice(-12), m: s.b22.m } });
/** Builds the view for one fighter (their fighter becomes "me"). */
export function toSnapshot(s: GameState, tick: number, slot: number): Snap {
  const P = s.party!; const me = inSlot(s, slot, () => fighter(s)), other = inSlot(s, 1 - slot, () => fighter(s)), mp = slotPlayer(s, slot), op = slotPlayer(s, 1 - slot);
  const near = (x: number, y: number) => (x - mp.x) ** 2 + (y - mp.y) ** 2 <= CULL * CULL || (x - op.x) ** 2 + (y - op.y) ** 2 <= CULL * CULL;
  return {
    tick, time: r1(s.time), phase: s.phase, arena: s.arenaId, kills: s.kills, plan: { id: s.plan.id, mode: s.plan.mode, name: s.plan.name }, announce: s.announce,
    me, partner: { ...other, down: P.slots[1 - slot].down }, enemies: s.enemies.filter(e => e.hp > 0 && (isBoss(e.kind) || near(e.x, e.y))).map(e => ({ id: e.id, kind: e.kind, x: r1(e.x), y: r1(e.y), hp: Math.round(e.hp), maxHp: Math.round(e.maxHp), radius: e.radius, mode: e.mode, modeT: r1(e.modeT), attackCd: 0, aimX: r1(e.aimX), aimY: r1(e.aimY), stagger: r1(e.stagger), speed: 0, damage: 0, touchCooldown: 0, spawnedAt: 0, ai: e.ai, ex: e.ex, part: e.part, stepId: e.stepId, blockT: e.blockT })),
    shots: s.enemyShots.filter(h => near(h.x, h.y)).map(h => ({ ...h, x: r1(h.x), y: r1(h.y) })), hazards: s.hazards.filter(h => near(h.x, h.y) || h.r > 300), pickups: s.pickups.filter(p => near(p.x, p.y)).slice(0, 120), impacts: s.impacts.slice(-30),
    abil: s.abilityEvents.slice(-24), enemyEv: s.enemyEvents.slice(-40), b22: { ev: s.b22.ev.slice(-20), fx: s.b22.fx, endless: s.b22.endless }, offers: s.phase === 'upgrade' && P.chooser === slot ? s.upgradeOffers : [], stacks: me.player ? inSlot(s, slot, () => s.upgradeStacks) : {}, chooser: P.chooser,
    party: { resonance: Math.round(P.shared.resonance), resonanceT: r1(P.shared.resonanceT), pair: P.shared.pair, pairCd: r1(P.shared.pairCd) },
  };
}
/** Client side: pours a snapshot into a GameState-shaped object (created once with makeState defaults). */
export function applySnapshot(state: GameState, n: Snap): void {
  const me = n.me as ReturnType<typeof fighter>, st = state as unknown as Record<string, unknown>;
  state.time = n.time; state.phase = n.phase as GameState['phase']; state.kills = n.kills; state.announce = n.announce; state.plan = { ...CLASSIC_PLAN, ...n.plan } as GameState['plan'];
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k, was = { x: state.player.x, y: state.player.y };
  Object.assign(state.player, me.player); const dx = was.x - state.player.x, dy = was.y - state.player.y;
  if (Math.hypot(dx, dy) < 60) { state.player.x = lerp(state.player.x, was.x, 0.0); state.player.y = state.player.y; }   // interpolation target; see RemoteSimulation.smooth
  state.hero = me.hero; Object.assign(state.hx, me.hx); state.cast = me.cast as GameState['cast']; state.sphere = me.sphere as GameState['sphere']; Object.assign(state.mods, me.mods); Object.assign(state.aim, me.aim); state.heroFormUnlocked = me.heroFormUnlocked;
  Object.assign(state.b22, me.b22); state.upgradeOffers = n.offers as GameState['upgradeOffers']; state.upgradeStacks = n.stacks;
  state.enemies = n.enemies as GameState['enemies']; state.enemyShots = n.shots as GameState['enemyShots']; state.hazards = n.hazards as GameState['hazards']; state.pickups = n.pickups as GameState['pickups']; state.impacts = n.impacts as GameState['impacts'];
  state.abilityEvents = n.abil as GameState['abilityEvents']; state.enemyEvents = n.enemyEv as GameState['enemyEvents']; Object.assign(state.b22, n.b22 as object); st.partner = n.partner; st.netParty = n.party;
}
export const blankClientState = (seed: number, arena: GameState['arenaId']): GameState => makeState(seed, arena);
