/** B22.6 Fracture Alliance: two REAL fighters in ONE authoritative simulation. Each fighter is a Slot holding its own player, hero, hx, cast, mods, upgrade stacks, B22 block and input edges. The sim keeps every system single-player-shaped by swapping the active slot into the GameState fields (a pointer swap, never a copy) while it runs a per-player step; shared systems (enemies, shots, hazards, pickups, the plan) run once. Enemies pick the nearest standing fighter; every hit, hazard and shot is tested against each fighter; XP is shared and each fighter chooses their own upgrades in a queue; a downed fighter can be revived by the partner. Solo runs never create a party and take the unchanged code path. */
import type { GameState, InputState } from './GameState';
import { makeState } from './GameState';
import { applyRunConfig, type RunConfig } from './RunConfig';
import type { HeroId } from '../content/heroes';
import { REVIVE, RESONANCE, PAIR_RULES, pairOf } from '../b22/pairs';
import type { PartyState } from '../b22/state';
import type { Enemy } from './GameState';
import { xpThreshold } from './GameState';

export const SLOT_KEYS = ['player', 'hero', 'hx', 'cast', 'sphere', 'mods', 'upgradeStacks', 'aim', 'eHeld', 'b22', 'heroFormUnlocked', 'heroFormUnlockedNow', 'heroFormSeen', 'vexSeen', 'run', 'echoes', 'blasts', 'apexUnlocked', 'apexUnlockedNow', 'cometUnlocked', 'cometUnlockedNow', 'levelUpAt'] as const;
export type SlotBag = Pick<GameState, (typeof SLOT_KEYS)[number]>;
export interface Down { downed: boolean; out: boolean; t: number; revives: number; hold: number }
export interface Edge { sig?: boolean; od?: boolean; q: boolean; f: boolean; e: boolean; r: boolean; buf: { q: number; e: number; r: number } }
export interface Slot { bag: SlotBag; name: string; edge: Edge; down: Down; input: InputState; lastHits: { id: number; dmg: number; slot: string | null; x: number; y: number }[]; formAt: number; aimAtE: { x: number; y: number; t: number } | null; prevForm?: number }
export interface Party { slots: Slot[]; cur: number; queue: number[]; chooser: number | null; mode: 'local' | 'online'; shared: PartyState; names: string[] }
const blankInput = (): InputState => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false });
const mkSlot = (bag: SlotBag, name: string): Slot => ({ bag, name, edge: { q: false, f: false, e: false, r: false, buf: { q: 0, e: 0, r: 0 } }, down: { downed: false, out: false, t: 0, revives: 0, hold: 0 }, input: blankInput(), lastHits: [], formAt: -99, aimAtE: null });
const bagOf = (s: GameState): SlotBag => { const b = {} as Record<string, unknown>; for (const k of SLOT_KEYS) b[k] = s[k]; return b as unknown as SlotBag; };

/** Turns a solo state into a 2-fighter party. `second` is the partner's loadout (hero, forms, boon...). The partner starts beside the first fighter. */
export function createParty(s: GameState, second: RunConfig, mode: 'local' | 'online' = 'local', names: [string, string] = ['P1', 'P2']): Party {
  const tmp = makeState(s.seed, s.arenaId, s.cometUnlocked, s.apexUnlocked); applyRunConfig(tmp, { ...second, plan: s.plan });
  tmp.player.x = s.player.x + 70; tmp.player.y = s.player.y; tmp.b22.modifiers = [...s.plan.modifiers];
  const shared: PartyState = { pair: pairOf(s.hero, tmp.hero)?.id ?? null, resonance: 0, resonanceT: 0, resonanceCd: 0, pairCd: 0, pairMark: null, syncT: 0, syncBy: -1, time: 0 };
  s.b22.party = shared; tmp.b22.party = shared;
  const party: Party = { slots: [mkSlot(bagOf(s), names[0]), mkSlot(bagOf(tmp), names[1])], cur: 0, queue: [], chooser: null, mode, shared, names };
  s.party = party; return party;
}
/** Saves the live fields into the current slot and loads slot `i` into the state. Pure pointer moves. */
export function swapTo(s: GameState, i: number) {
  const p = s.party; if (!p || p.cur === i) return;
  const cur = p.slots[p.cur].bag as unknown as Record<string, unknown>, nxt = p.slots[i].bag as unknown as Record<string, unknown>, st = s as unknown as Record<string, unknown>;
  for (const k of SLOT_KEYS) { cur[k] = st[k]; st[k] = nxt[k]; }
  p.cur = i;
}
export const standing = (s: GameState, i: number): boolean => { const d = s.party!.slots[i].down; return !d.downed && !d.out; };
export const slotPlayer = (s: GameState, i: number) => (s.party!.cur === i ? s.player : s.party!.slots[i].bag.player);
/** Runs `fn` with slot `i` active, then restores the previous slot. */
export function inSlot<T>(s: GameState, i: number, fn: () => T): T { const p = s.party; if (!p) return fn(); const prev = p.cur; swapTo(s, i); try { return fn(); } finally { swapTo(s, prev); } }
/** Calls `fn` once per standing fighter (that fighter active); stops early when `fn` returns true. Solo: just once. */
export function eachTarget(s: GameState, fn: () => boolean | void) {
  const p = s.party; if (!p) { fn(); return; }
  const prev = p.cur; for (let i = 0; i < p.slots.length; i++) { if (!standing(s, i)) continue; swapTo(s, i); if (fn() === true) break; } swapTo(s, prev);
}
/** The standing fighter nearest to a point; ties go to slot 0. */
export function nearestSlot(s: GameState, x: number, y: number): number {
  const p = s.party!; let best = -1, bd = Infinity;
  for (let i = 0; i < p.slots.length; i++) { if (!standing(s, i)) continue; const q = slotPlayer(s, i), d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return best < 0 ? 0 : best;
}
/** Enemy AI hook: aim this enemy at the nearest standing fighter. */
export function pickTarget(s: GameState, e: Enemy) { if (s.party) swapTo(s, nearestSlot(s, e.x, e.y)); }

/* ------------------------------------------------------------------ shared XP + level-up queue */
/** Shared XP: every fighter gains the crystal's value (each with their own XP modifier); each level-up queues that fighter's own choice. */
export function coopGainXp(s: GameState, amount: number) {
  const p = s.party!; if (!Number.isFinite(amount) || amount <= 0 || s.phase !== 'running') return;
  for (let i = 0; i < p.slots.length; i++) {
    if (p.slots[i].down.out) continue; const q = slotPlayer(s, i), mods = p.cur === i ? s.mods : p.slots[i].bag.mods; q.xp += amount * mods.xp;
    if (q.xp >= q.nextXp) { q.xp -= q.nextXp; q.level++; q.nextXp = xpThreshold(q.level); const lv = p.cur === i ? s.levelUpAt : p.slots[i].bag.levelUpAt; lv.push(s.time); p.queue.push(i); }
  }
}
export const pendingChoice = (s: GameState) => !!s.party && s.party.queue.length > 0;

/* ------------------------------------------------------------------ downed / revive */
export function downFighter(s: GameState) {
  const p = s.party!, i = p.cur, d = p.slots[i].down; if (d.downed || d.out) return;
  s.player.hp = 0; s.player.vx = 0; s.player.vy = 0; s.cast = null; s.hx.act = null; s.b22.ult.act = null;
  d.downed = true; d.t = 0; d.hold = 0; s.impacts.push({ id: s.nextId++, kind: 'hurt', x: s.player.x, y: s.player.y, ttl: 0.5, life: 0.5, heavy: true });
  if (!p.slots.some((_, k) => k !== i && standing(s, k))) s.phase = 'dead';   // nobody left standing
}
/** Bleed-out, revive-by-proximity (stand near your partner for REVIVE.hold seconds: no extra button), per-fighter revive cap, and the party-wipe check. */
export function updateRevives(s: GameState, dt: number) {
  const p = s.party!;
  for (let i = 0; i < p.slots.length; i++) {
    const d = p.slots[i].down; if (!d.downed) continue; d.t += dt; const q = slotPlayer(s, i); let near = false;
    for (let k = 0; k < p.slots.length; k++) if (k !== i && standing(s, k)) { const o = slotPlayer(s, k); if ((o.x - q.x) ** 2 + (o.y - q.y) ** 2 <= 90 ** 2) near = true; }
    d.hold = near && d.revives < REVIVE.maxPerPlayer ? d.hold + dt : Math.max(0, d.hold - dt * 0.5);
    if (d.hold >= REVIVE.hold) { d.downed = false; d.hold = 0; d.revives++; q.hp = q.maxHp * REVIVE.hpFraction; q.invulnerable = REVIVE.grace; s.impacts.push({ id: s.nextId++, kind: 'revive', x: q.x, y: q.y, ttl: 0.6, life: 0.6 }); s.b22.ev.push({ id: s.b22.evId++, kind: 'revive', x: q.x, y: q.y }); }
    else if (d.t >= REVIVE.bleedOut || d.revives >= REVIVE.maxPerPlayer && d.t > 2) { d.downed = false; d.out = true; }
  }
  if (p.slots.every(sl => sl.down.downed || sl.down.out) && s.phase === 'running') s.phase = 'dead';
}
/** Players may not drift so far apart that one leaves the camera: a soft tether pulls the farther one back. */
export const TETHER = 1250;
export function tether(s: GameState) {
  if (!standing(s, 0) || !standing(s, 1)) return;
  const a = slotPlayer(s, 0), b = slotPlayer(s, 1), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
  if (d > TETHER) { const k = ((d - TETHER) / d) * 0.5; a.x += dx * k; a.y += dy * k; b.x -= dx * k; b.y -= dy * k; }
}
void RESONANCE; void PAIR_RULES;
export type { HeroId };
