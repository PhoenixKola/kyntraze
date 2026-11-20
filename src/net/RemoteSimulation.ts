/** Browser / Electron online client. Presents the same surface the scene and bridge use from `Simulation`, but the state comes from the authoritative server: the client sends INPUT and CHOICES and renders what the server says. Own movement is smoothed toward the server position every frame (interpolation, no authority). Result / rewards come from the server's `result` message only. */
import { MovePredictor, reconcile } from './prediction';
import type { GameState, InputState } from '../sim/GameState';
import { applySnapshot, blankClientState, type Snap } from './snapshot';
import { PROTOCOL_VERSION, fromInputState, type RoomMode, type ServerMsg } from './protocol';
import type { HeroId } from '../content/heroes';
import type { ArenaId } from '../content/arenas';
import { CONNECT_TIMEOUT_MS } from './defaultServer';

export interface RoomView { code: string; mode: RoomMode; arena: string; state: 'lobby' | 'running' | 'ended'; you: number; players: { name: string; hero: HeroId; ready: boolean; connected: boolean }[] }
export interface NetResult { won: boolean; seconds: number; kills: number; score: number; runId: string; verified: true; rank?: number }
export class NetClient {
  ws: WebSocket | null = null; room: RoomView | null = null; result: NetResult | null = null; error: string | null = null; token = ''; latest: Snap | null = null; private seq = 0; private listeners = new Set<() => void>(); private pings = 0; rtt = 0; private beat: ReturnType<typeof setInterval> | null = null; private pending = new Map<number, number>();
  private stopBeat() { if (this.beat) clearInterval(this.beat); this.beat = null; this.pending.clear(); }
  constructor(private readonly url: string, private readonly name: string) {}
  on(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(f => f()); }
  connect(token?: string): Promise<void> {
    return new Promise((res, rej) => {
      this.stopBeat(); this.ws?.close(); const ws = this.ws = new WebSocket(this.url); let welcomed = false; const timer = setTimeout(() => { if (!welcomed) { this.error = 'The server did not answer in time. It may still be waking up; try again.'; this.emit(); ws.close(); rej(new Error('timeout')); } }, CONNECT_TIMEOUT_MS);
      const fail = () => { clearTimeout(timer); if (welcomed) return; this.error = 'Could not reach the server'; this.emit(); rej(new Error('connect')); };
      ws.onerror = fail; ws.onclose = () => { clearTimeout(timer); if (this.ws === ws) this.stopBeat(); this.error ??= 'Disconnected'; this.emit(); if (!welcomed) rej(new Error('closed')); };
      ws.onopen = () => { this.send({ t: 'hello', v: PROTOCOL_VERSION, name: this.name, ...(token ? { token } : {}) }); };
      ws.onmessage = e => {
        let m: ServerMsg; try { m = JSON.parse(String(e.data)) as ServerMsg; } catch { return; }
        if (m.t === 'welcome') { welcomed = true; clearTimeout(timer); if (m.token) this.token = m.token; this.error = null; if (!this.beat) this.beat = setInterval(() => { if (ws.readyState !== 1) return; const n = this.pings = (this.pings + 1) % 1e9; this.pending.set(n, performance.now()); if (this.pending.size > 4) this.pending.delete(this.pending.keys().next().value as number); this.send({ t: 'ping', n }); }, 3000); res(); }
        else if (m.t === 'room') this.room = m; else if (m.t === 'snap') { this.latest = m.s as Snap; this.ack = typeof m.ack === 'number' ? m.ack : this.ack; } else if (m.t === 'result') this.result = m;
        else if (m.t === 'error') { this.error = m.code === 'version' ? 'Update required: this client and the server use different protocol versions.' : m.msg; if (m.code === 'version') rej(new Error('version')); }
        else if (m.t === 'pong') { const t0 = this.pending.get(m.n); if (t0 !== undefined) { this.pending.delete(m.n); this.rtt = Math.round(performance.now() - t0); } } this.emit();
      };
    });
  }
  send(m: object) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  ack = 0;
  sendInput(i: InputState) { this.send({ t: 'input', seq: ++this.seq, i: fromInputState(i) }); return this.seq; }
  close() { this.send({ t: 'leave' }); this.stopBeat(); this.ws?.close(); }
}
/** Stands in for `Simulation` in the arena scene during an online run. */
export class RemoteSimulation {
  readonly state: GameState; private first = true;
  constructor(private readonly net: NetClient, seed: number, arena: ArenaId) { this.state = blankClientState(seed, arena); }
  private readonly pred = new MovePredictor();
  /** Movement is only predicted while the fighter is free to walk: not casting, dashing, in a reveal, down or dead (the server position is used as is then). */
  private canPredict() { const s = this.state, p = s.player; return s.phase === 'running' && p.hp > 0 && p.dashRemaining <= 0 && !s.cast && !s.hx.act && !s.cinema && !s.b22.ult.act; }
  step(dt: number, input: InputState) {
    const n = this.net.latest, seq = this.net.sendInput(input), free = this.canPredict();
    if (free) this.pred.record(seq, input.x, input.y, dt); else this.pred.reset();
    if (n) {
      const was = { x: this.state.player.x, y: this.state.player.y }; applySnapshot(this.state, n); this.pred.ack(this.net.ack);
      const base = { x: this.state.player.x, y: this.state.player.y }, speed = this.state.player.speed, goal = free && !this.first ? this.pred.replay(base.x, base.y, speed) : base;
      if (this.first) { this.first = false; } else { const r = reconcile(was.x, was.y, goal.x, goal.y); this.state.player.x = r.x; this.state.player.y = r.y; }
      this.net.latest = null;
    } else if (free && !this.first) {   // between snapshots: advance by this tick's own input, the next snapshot corrects it
      const l = Math.hypot(input.x, input.y), k = l > 1 ? 1 / l : 1, p = this.state.player; p.x += input.x * k * p.speed * dt; p.y += input.y * k * p.speed * dt;
    }
  }
  chooseUpgrade(id: string) { this.net.send({ t: 'pick', kind: 'upgrade', id }); return true; }
  chooseBranch(id: string) { this.net.send({ t: 'pick', kind: 'branch', id }); return true; }
  chooseRelic(id: string) { this.net.send({ t: 'pick', kind: 'relic', id }); return true; }
  chooseLegendary(id: string) { this.net.send({ t: 'pick', kind: 'legend', id }); return true; }
  togglePause() { /* no pause in a shared run */ } forcePause() { /* none */ }
  reroll() { return false; } banish() { return false; } continueEndless() { return false; } extract() { return false; } pushOn() { return false; }
  debugLevelUp() { /* server owns progression */ }
  view<T>(fn: () => T): T { return fn(); } asChooser<T>(fn: () => T): T { return fn(); }
  stats() { const s = this.state; return { seed: s.seed, survivalSeconds: s.time, kills: s.kills, level: s.player.level, victory: s.phase === 'victory', bosses: s.bossesDefeated, score: this.net.result?.score ?? 0 }; }
}
