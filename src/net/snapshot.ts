/** Server -> client state view. The server serialises ONLY what a renderer / HUD needs (never a raw GameState), rounded and culled to what is near either fighter plus all bosses; the client rebuilds a GameState-shaped object from it so the unchanged renderers and HUD work. */
import type { GameState } from '../sim/GameState';
import { makeState } from '../sim/GameState';
import { CLASSIC_PLAN } from '../b22/plan';
import { inSlot, slotPlayer } from '../sim/CoopSystem';
import { isBoss } from '../content/enemies';

const r1 = (v: number) => Math.round(v * 10) / 10;
const CULL = 1300;
export interface Snap { tick: number; time: number; phase: string; arena: string; kills: number; plan: { id: string; mode: string; name: string; living?: boolean }; announce: GameState['announce']; me: unknown; partner: unknown; enemies: unknown[]; shots: unknown[]; hazards: unknown[]; pickups: unknown[]; impacts: unknown[]; abil: unknown[]; enemyEv: unknown[]; b22: unknown; offers: string[]; stacks: Record<string, number>; chooser: number | null; party: unknown; /** B31B: the shared Living Fractures event world, slots relative to this player (0 = you) */ lf?: unknown }
/** Bounded presentation view of Kai's kit (B22): everything kaiKitFx draws, none of the sim-only bookkeeping (riseHits). Absent when the kit was never used. */
export const kitView = (k: GameState['hx']['kk']) => (k ? { surge: r1(k.surge), surgeForm: k.surgeForm, fired: k.fired, shots: k.shots.slice(0, 40).map(h => ({ ...h, x: r1(h.x), y: r1(h.y) })), clone: k.clone ? { ...k.clone, x: r1(k.clone.x), y: r1(k.clone.y), hitCd: {} } : null, pillars: k.pillars.slice(0, 16), riseDir: k.riseDir, crucible: k.crucible, meteorBeat: k.meteorBeat } : undefined);
const fighter = (s: GameState) => ({ player: { ...s.player, x: r1(s.player.x), y: r1(s.player.y), vx: r1(s.player.vx), vy: r1(s.player.vy) }, hero: s.hero, renF2: s.renF2, hx: { act: s.hx.act, brands: s.hx.brands?.slice(0, 24), bolts: s.hx.bolts.slice(0, 40), orbs: s.hx.orbs, orbPhase: s.hx.orbPhase, rings: s.hx.rings, arcs: s.hx.arcs, strike: s.hx.strike, kk: kitView(s.hx.kk), sf: s.hx.sf?.slice(0, 10), vf: s.hx.vf?.slice(0, 12), moving: s.hx.moving, autoStep: s.hx.autoStep, t: s.hx.t }, cast: s.cast, sphere: s.sphere, mods: s.mods, aim: s.aim, heroFormUnlocked: s.heroFormUnlocked, b22: { ult: s.b22.ult, relics: s.b22.relics, branches: s.b22.branches, legendary: s.b22.legendary, branchOffer: s.b22.branchOffer, relicOffer: s.b22.relicOffer, legendOffer: s.b22.legendOffer, vex: s.b22.vex, marks: s.b22.marks, zones: s.b22.zones, ev: s.b22.ev.slice(-12), m: s.b22.m } });
/** B31B: the event world as one player sees it. No RNG, no director timers; fighter slots are relative (0 = this player, 1 = the partner, -1 = the whole party). */
export function lfView(s: GameState, slot: number) {
  const lf = s.lf!, rel = (i: number) => (i < 0 ? -1 : i === slot ? 0 : 1);
  return { events: lf.events.map(e => ({ ...e, parts: e.parts.map(rel), who: rel(e.who), x: r1(e.x), y: r1(e.y), p: Math.round(e.p * 1000) / 1000, hp: Math.round(e.hp), aux: e.aux.map(r1), ids: e.ids.slice(0, 24) })), fx: lf.fx.map(f => ({ ...f, slot: rel(f.slot), until: r1(f.until) })), log: lf.log.slice(-6), hist: lf.hist.slice(-10), stats: lf.stats, ended: lf.ended };
}
/** Builds the view for one fighter (their fighter becomes "me"). */
export function toSnapshot(s: GameState, tick: number, slot: number): Snap {
  const P = s.party!; const me = inSlot(s, slot, () => fighter(s)), other = inSlot(s, 1 - slot, () => fighter(s)), mp = slotPlayer(s, slot), op = slotPlayer(s, 1 - slot);
  const near = (x: number, y: number) => (x - mp.x) ** 2 + (y - mp.y) ** 2 <= CULL * CULL || (x - op.x) ** 2 + (y - op.y) ** 2 <= CULL * CULL;
  return {
    tick, time: r1(s.time), phase: s.phase, arena: s.arenaId, kills: s.kills, plan: { id: s.plan.id, mode: s.plan.mode, name: s.plan.name, ...(s.plan.living ? { living: true } : {}) }, announce: s.announce,
    me, partner: { ...other, down: P.slots[1 - slot].down }, enemies: s.enemies.filter(e => e.hp > 0 && (isBoss(e.kind) || near(e.x, e.y))).map(e => ({ id: e.id, kind: e.kind, x: r1(e.x), y: r1(e.y), hp: Math.round(e.hp), maxHp: Math.round(e.maxHp), radius: e.radius, mode: e.mode, modeT: r1(e.modeT), attackCd: 0, aimX: r1(e.aimX), aimY: r1(e.aimY), stagger: r1(e.stagger), speed: 0, damage: 0, touchCooldown: 0, spawnedAt: 0, ai: e.ai, ex: e.ex, part: e.part, stepId: e.stepId, blockT: e.blockT })),
    shots: s.enemyShots.filter(h => near(h.x, h.y)).map(h => ({ ...h, x: r1(h.x), y: r1(h.y) })), hazards: s.hazards.filter(h => near(h.x, h.y) || h.r > 300), pickups: s.pickups.filter(p => near(p.x, p.y)).slice(0, 120), impacts: s.impacts.slice(-30),
    abil: s.abilityEvents.slice(-24).map(e => (e.slot === undefined ? e : { ...e, slot: e.slot === slot ? 0 : 1 })), enemyEv: s.enemyEvents.slice(-40), b22: { ev: s.b22.ev.slice(-20), fx: s.b22.fx, endless: s.b22.endless }, offers: s.phase === 'upgrade' && P.chooser === slot ? s.upgradeOffers : [], stacks: me.player ? inSlot(s, slot, () => s.upgradeStacks) : {}, chooser: P.chooser,
    party: { resonance: Math.round(P.shared.resonance), resonanceT: r1(P.shared.resonanceT), pair: P.shared.pair, pairCd: r1(P.shared.pairCd) }, ...(s.lf ? { lf: lfView(s, slot) } : {}),
  };
}
/** Pours one fighter's view into a GameState-shaped object (the local player's state, or the online partner's presentation view). Absent / transient fields are cleared, never left over. */
export function applyFighter(state: GameState, me: ReturnType<typeof fighter>): void {
  Object.assign(state.player, me.player);
  state.hero = me.hero; Object.assign(state.hx, me.hx);
  state.hx.sf = me.hx.sf ?? undefined; state.hx.vf = me.hx.vf ?? undefined;
  state.hx.kk = me.hx.kk ? { riseHits: {}, ...me.hx.kk } : undefined;   // JSON drops an absent kit: clear it explicitly so an expired clone / crucible never lingers
  state.cast = (me.cast ?? null) as GameState['cast']; state.sphere = (me.sphere ?? null) as GameState['sphere'];
  Object.assign(state.mods, me.mods); Object.assign(state.aim, me.aim); state.heroFormUnlocked = me.heroFormUnlocked; state.renF2 = me.renF2;
  Object.assign(state.b22, me.b22);
}
const SHARED_KEYS = ['time', 'phase', 'kills', 'enemies', 'enemyShots', 'hazards', 'pickups', 'impacts', 'abilityEvents', 'enemyEvents', 'plan', 'announce', 'arenaId', 'seed', 'cinema'] as const;
/** The online partner as a read-only presentation view: its own fighter fields (player, hero, hx, cast, mods...) over a private GameState, with the shared world referenced from the real state. Nothing here is ever simulated. `view` is created once per session and reused; the position is eased toward the server position and snapped on a teleport or the first frame. */
export function partnerView(main: GameState, view: GameState, partner: unknown, dt: number): { view: GameState; moveX: number; moveY: number } {
  const np = partner as ReturnType<typeof fighter>, v = view as unknown as Record<string, unknown>, m = main as unknown as Record<string, unknown>;
  for (const k of SHARED_KEYS) v[k] = m[k];
  v.cinema = null; v.abilityEvents = main.abilityEvents.filter(e => e.slot === 1);   // relative slots: 0 = the local fighter, 1 = this partner
  const ox = view.player.x, oy = view.player.y, fresh = view.player.hp === 100 && ox === 0 && oy === 0 || !Number.isFinite(ox);
  applyFighter(view, np);
  const tx = np.player.x, ty = np.player.y, far = Math.hypot(tx - ox, ty - oy) > 260, k = fresh || far ? 1 : 1 - Math.exp(-dt / 0.07);
  view.player.x = ox + (tx - ox) * k; view.player.y = oy + (ty - oy) * k;
  const d = dt > 0 ? Math.hypot(view.player.x - ox, view.player.y - oy) / dt : 0;
  return { view, moveX: d > 30 && !fresh && !far ? (view.player.x - ox) / (d * dt) : 0, moveY: d > 30 && !fresh && !far ? (view.player.y - oy) / (d * dt) : 0 };
}
export const blankPartnerView = (seed: number, arena: GameState['arenaId']): GameState => { const g = makeState(seed, arena); g.player.x = 0; g.player.y = 0; return g; };
/** Client side: pours a snapshot into a GameState-shaped object (created once with makeState defaults). */
export function applySnapshot(state: GameState, n: Snap): void {
  const me = n.me as ReturnType<typeof fighter>, st = state as unknown as Record<string, unknown>;
  state.time = n.time; state.phase = n.phase as GameState['phase']; state.kills = n.kills; state.announce = n.announce; state.plan = { ...CLASSIC_PLAN, ...n.plan } as GameState['plan'];
  state.lf = n.lf ? ({ v: 1, nextAt: 0, waitSince: -1, spawned: 0, seq: 0, lastKind: '', ...(n.lf as object) } as GameState['lf']) : undefined;
  applyFighter(state, me);
  state.upgradeOffers = n.offers as GameState['upgradeOffers']; state.upgradeStacks = n.stacks;
  state.enemies = n.enemies as GameState['enemies']; state.enemyShots = n.shots as GameState['enemyShots']; state.hazards = n.hazards as GameState['hazards']; state.pickups = n.pickups as GameState['pickups']; state.impacts = n.impacts as GameState['impacts'];
  state.abilityEvents = n.abil as GameState['abilityEvents']; state.enemyEvents = n.enemyEv as GameState['enemyEvents']; Object.assign(state.b22, n.b22 as object); st.partner = n.partner; st.netParty = n.party;
}
export const blankClientState = (seed: number, arena: GameState['arenaId']): GameState => makeState(seed, arena);
