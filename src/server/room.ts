/** One co-op room: a lobby of at most two players, then an authoritative fixed-step Simulation with two real fighters. Clients send input and choices only; the room owns enemies, bosses, damage, XP, level-up offers, revives, results and the RNG seed. */
import { randomBytes } from 'node:crypto';
import { Simulation } from '../sim/Simulation';
import { NO_CONFIG } from '../sim/RunConfig';
import { CLASSIC_PLAN, bossRushPlan, expeditionPlan, type RunPlan } from '../b22/plan';
import { CLASSIC_ARENAS, REALM_ARENAS, isArenaId, type ArenaId } from '../content/arenas';
import type { HeroId } from '../content/heroes';
import type { InputState } from '../sim/GameState';
import { toSnapshot } from '../net/snapshot';
import { toInputState, type ClientMsg, type RoomMode, type ServerMsg, type WireInput } from '../net/protocol';
import { inSlot } from '../sim/CoopSystem';
import type { WsConn } from './ws';
import type { Store } from './store';

export const GRACE_S = 30, PICK_TIMEOUT_S = 25, SNAP_EVERY = 3, DT = 1 / 60;
const NO_PULSE = { dash: false, q: false, f: false, beam: false, sphere: false, sig: false, od: false, sigAbort: false, selPick: 0 as 0 | 1 | 2 | 3 };
export interface Player { id: string; token: string; name: string; hero: HeroId; ready: boolean; conn: WsConn | null; lastSeq: number; input: WireInput | null; pulse: { dash: boolean; q: boolean; f: boolean; beam: boolean; sphere: boolean; sig: boolean; od: boolean; sigAbort: boolean; selPick: 0 | 1 | 2 | 3 }; absentFor: number; slot: number; unlock: boolean }
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const newCode = () => { const b = randomBytes(5); let s = ''; for (const x of b) s += CODE_CHARS[x % CODE_CHARS.length]; return s; };
const planOf = (mode: RoomMode, arena: ArenaId): { plan: RunPlan; arena: ArenaId } => mode === 'fracture_expedition' ? { plan: expeditionPlan(REALM_ARENAS.includes(arena) ? (arena as 'aetherfall' | 'paradox') : 'aetherfall'), arena: REALM_ARENAS.includes(arena) ? arena : 'aetherfall' } : mode === 'boss_rush' ? { plan: bossRushPlan('initiation'), arena: 'gloam' } : { plan: CLASSIC_PLAN, arena: CLASSIC_ARENAS.includes(arena) ? arena : 'gloam' };
export class Room {
  players: Player[] = []; state: 'lobby' | 'running' | 'ended' = 'lobby'; sim: Simulation | null = null; tick = 0; private acc = 0; private last = 0; private timer: ReturnType<typeof setInterval> | null = null; private pickClock = 0; idle = 0;
  readonly runId = randomBytes(9).toString('hex'); private seed = randomBytes(4).readUInt32BE(0);
  constructor(readonly code: string, readonly mode: RoomMode, readonly arena: ArenaId, private readonly store: Store, private readonly onEmpty: (r: Room) => void) {}
  private send(p: Player, m: ServerMsg) { p.conn?.send(JSON.stringify(m)); }
  broadcastRoom() { for (const p of this.players) this.send(p, { t: 'room', code: this.code, mode: this.mode, arena: this.arena, state: this.state, you: p.slot, players: this.players.map(q => ({ name: q.name, hero: q.hero, ready: q.ready, connected: !!q.conn })) }); }
  add(name: string, hero: HeroId, conn: WsConn, unlock = false): Player | null {
    if (this.players.length >= 2 || this.state !== 'lobby') return null;
    const p: Player = { id: randomBytes(8).toString('hex'), token: randomBytes(24).toString('hex'), name, hero, ready: false, conn, lastSeq: 0, input: null, pulse: { ...NO_PULSE }, absentFor: 0, slot: this.players.length, unlock };
    this.players.push(p); this.broadcastRoom(); return p;
  }
  rebind(p: Player, conn: WsConn) { p.conn = conn; p.absentFor = 0; this.broadcastRoom(); }
  detach(p: Player) { p.conn = null; if (this.state === 'lobby') { this.players = this.players.filter(q => q !== p); this.players.forEach((q, i) => (q.slot = i)); if (!this.players.length) this.onEmpty(this); else this.broadcastRoom(); } else this.broadcastRoom(); }
  /** An intentional leave. In the lobby the player just drops out; in a running game the shared run ends for both and the partner is sent back to the waiting room. */
  leave(p: Player) {
    if (this.state !== 'running') { this.detach(p); return; }
    this.state = 'ended'; if (this.timer) clearInterval(this.timer); p.conn = null;
    for (const q of this.players) if (q !== p) { this.send(q, { t: 'error', code: 'partner_left', msg: 'Your partner left the run.' }); setTimeout(() => q.conn?.close(), 1500); }
    setTimeout(() => this.onEmpty(this), 2000);
  }
  handle(p: Player, m: ClientMsg) {
    switch (m.t) {
      case 'ready': if (this.state !== 'lobby') return; p.ready = m.ready; if (m.hero) p.hero = m.hero; this.broadcastRoom(); if (this.players.length === 2 && this.players.every(q => q.ready)) this.start(); break;
      case 'input': if (this.state !== 'running' || m.seq <= p.lastSeq) return; p.lastSeq = m.seq; p.input = m.i; p.pulse.dash ||= m.i.dash; p.pulse.q ||= m.i.q; p.pulse.f ||= m.i.f; p.pulse.beam ||= m.i.beam; p.pulse.sphere ||= m.i.sphere; p.pulse.sig ||= !!m.i.sig; p.pulse.od ||= !!m.i.od; p.pulse.sigAbort ||= !!m.i.sigAbort; if (m.i.selPick) p.pulse.selPick = m.i.selPick; break;
      case 'pause': { const s = this.sim?.state; if (!s || this.state !== 'running' || (s.phase !== 'running' && s.phase !== 'paused')) return; s.phase = m.on === undefined ? (s.phase === 'running' ? 'paused' : 'running') : m.on ? 'paused' : 'running'; break; }
      case 'pick': this.pick(p, m.kind, m.id); break;
      default: break;
    }
  }
  private pick(p: Player, kind: string, id: string) {
    const sim = this.sim; if (!sim || this.state !== 'running' || sim.state.phase !== 'upgrade' || sim.state.party?.chooser !== p.slot) return;
    const ok = kind === 'upgrade' ? (sim.state.upgradeOffers as string[]).includes(id) && sim.chooseUpgrade(id as never) : kind === 'branch' ? sim.chooseBranch(id as never) : kind === 'relic' ? sim.chooseRelic(id as never) : sim.chooseLegendary(id as never);
    if (ok) this.pickClock = 0;
  }
  start() {
    const { plan, arena } = planOf(this.mode, this.arena); const [a, b] = this.players;
    const cfg = (q: Player) => ({ ...NO_CONFIG, hero: q.hero, heroForm: q.unlock && q.hero !== 'kai', ...(q.unlock ? { vexForms: [true, true] as [boolean, boolean] } : {}) });
    this.sim = new Simulation(this.seed, arena, a.unlock, a.unlock, { ...cfg(a), plan }); this.sim.joinPartner(cfg(b), 'online', [a.name, b.name]);
    { const bag = this.sim.state.party!.slots[1].bag; bag.cometUnlocked = b.unlock; bag.apexUnlocked = b.unlock; }
    this.state = 'running'; this.last = performance.now(); this.broadcastRoom(); this.timer = setInterval(() => this.loop(), 8);
  }
  private inputFor(p: Player): InputState {
    const base = p.input && p.conn ? toInputState(p.input) : { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false } as InputState;
    const out: InputState = { ...base, dash: p.pulse.dash, q: p.pulse.q, f: p.pulse.f, beam: p.pulse.beam || !!base.beam, sphere: p.pulse.sphere, ...(p.pulse.sig ? { sig: true } : {}), ...(p.pulse.od ? { od: true } : {}), ...(p.pulse.sigAbort ? { sigAbort: true } : {}), ...(p.pulse.selPick ? { selPick: p.pulse.selPick } : {}) }; p.pulse = { ...NO_PULSE }; return out;
  }
  private loop() {
    const sim = this.sim; if (!sim || this.state !== 'running') return; const now = performance.now(); this.acc += Math.min(0.25, (now - this.last) / 1000); this.last = now;
    while (this.acc >= DT) {
      this.acc -= DT; const s = sim.state;
      if (s.phase === 'upgrade') { this.pickClock += DT; if (this.pickClock > PICK_TIMEOUT_S) { this.pickClock = 0; const c = s.upgradeOffers[0]; if (c) sim.chooseUpgrade(c); else if (s.b22.branchOffer) sim.chooseBranch(s.b22.branchOffer.a); } }
      for (const p of this.players) if (!p.conn) { p.absentFor += DT; if (p.absentFor < GRACE_S) inSlot(s, p.slot, () => { s.player.invulnerable = Math.max(s.player.invulnerable, 0.2); }); else if (s.party && !s.party.slots[p.slot].down.out) { s.party.slots[p.slot].down.downed = true; s.party.slots[p.slot].down.out = true; s.party.slots[p.slot].bag.player.hp = 0; } }
      sim.step(DT, this.inputFor(this.players[0]), this.inputFor(this.players[1])); this.tick++;
      if (this.tick % SNAP_EVERY === 0) for (const p of this.players) if (p.conn) this.send(p, { t: 'snap', tick: this.tick, ack: p.lastSeq, s: toSnapshot(s, this.tick, p.slot) });
      if (s.phase === 'victory' || s.phase === 'dead') { this.finish(); return; }
      if (this.players.every(p => !p.conn && p.absentFor > GRACE_S)) { this.finish(true); return; }
    }
  }
  finish(abandoned = false) {
    if (this.state === 'ended') return; this.state = 'ended'; if (this.timer) clearInterval(this.timer); const s = this.sim!.state, won = s.phase === 'victory' && !abandoned, score = this.sim!.stats().score;
    const rank = abandoned || this.players.some(p => p.unlock) ? null : this.store.add({ runId: this.runId, mode: this.mode, arena: s.arenaId, party: 2, names: this.players.map(p => p.name), heroes: this.players.map(p => p.hero), won, seconds: Math.floor(s.time), kills: s.kills, score, at: Date.now() });
    for (const p of this.players) this.send(p, { t: 'snap', tick: this.tick, ack: p.lastSeq, s: toSnapshot(s, this.tick, p.slot) });
    for (const p of this.players) this.send(p, { t: 'result', won, seconds: Math.floor(s.time), kills: s.kills, score, runId: this.runId, verified: true, ...(rank ? { rank } : {}) });
    this.broadcastRoom(); setTimeout(() => { for (const p of this.players) p.conn?.close(); this.onEmpty(this); }, 5000);
  }
  destroy() { if (this.timer) clearInterval(this.timer); }
}
export const isArena = isArenaId;
