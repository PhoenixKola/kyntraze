/** Browser / Electron online client. Presents the same surface the scene and bridge use from `Simulation`, but the state comes from the authoritative server: the client sends INPUT and CHOICES and renders what the server says. Own movement is smoothed toward the server position every frame (interpolation, no authority). Result / rewards come from the server's `result` message only. */
import type { GameState, InputState } from '../sim/GameState';
import { applySnapshot, blankClientState, type Snap } from './snapshot';
import { PROTOCOL_VERSION, fromInputState, type RoomMode, type ServerMsg } from './protocol';
import type { HeroId } from '../content/heroes';
import type { ArenaId } from '../content/arenas';

export interface RoomView { code: string; mode: RoomMode; arena: string; state: 'lobby' | 'running' | 'ended'; you: number; players: { name: string; hero: HeroId; ready: boolean; connected: boolean }[] }
export interface NetResult { won: boolean; seconds: number; kills: number; score: number; runId: string; verified: true; rank?: number }
export class NetClient {
  ws: WebSocket | null = null; room: RoomView | null = null; result: NetResult | null = null; error: string | null = null; token = ''; latest: Snap | null = null; private seq = 0; private listeners = new Set<() => void>(); private pings = 0; rtt = 0;
  constructor(private readonly url: string, private readonly name: string) {}
  on(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit() { this.listeners.forEach(f => f()); }
  connect(token?: string): Promise<void> {
    return new Promise((res, rej) => {
      const ws = this.ws = new WebSocket(this.url); const fail = () => { this.error = 'Could not reach the server'; this.emit(); rej(new Error('connect')); };
      ws.onerror = fail; ws.onclose = () => { this.error ??= 'Disconnected'; this.emit(); };
      ws.onopen = () => { this.send({ t: 'hello', v: PROTOCOL_VERSION, name: this.name, ...(token ? { token } : {}) }); };
      ws.onmessage = e => {
        let m: ServerMsg; try { m = JSON.parse(String(e.data)) as ServerMsg; } catch { return; }
        if (m.t === 'welcome') { if (m.token) this.token = m.token; this.error = null; res(); }
        else if (m.t === 'room') this.room = m; else if (m.t === 'snap') this.latest = m.s as Snap; else if (m.t === 'result') this.result = m;
        else if (m.t === 'error') { this.error = m.code === 'version' ? 'Update required: this client and the server use different protocol versions.' : m.msg; if (m.code === 'version') rej(new Error('version')); }
        else if (m.t === 'pong') this.rtt = Date.now() - m.n; this.emit();
      };
      setInterval(() => { if (ws.readyState === 1) this.send({ t: 'ping', n: Date.now() + (this.pings++ * 0) }); }, 3000);
    });
  }
  send(m: object) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  sendInput(i: InputState) { this.send({ t: 'input', seq: ++this.seq, i: fromInputState(i) }); }
  close() { this.send({ t: 'leave' }); this.ws?.close(); }
}
/** Stands in for `Simulation` in the arena scene during an online run. */
export class RemoteSimulation {
  readonly state: GameState; private target = { x: 0, y: 0 }; private first = true;
  constructor(private readonly net: NetClient, seed: number, arena: ArenaId) { this.state = blankClientState(seed, arena); }
  step(_dt: number, input: InputState) {
    const n = this.net.latest; this.net.sendInput(input);
    if (n) { const was = { x: this.state.player.x, y: this.state.player.y }; applySnapshot(this.state, n); this.target = { x: this.state.player.x, y: this.state.player.y }; if (!this.first) { const k = 0.35; this.state.player.x = was.x + (this.target.x - was.x) * k; this.state.player.y = was.y + (this.target.y - was.y) * k; } this.first = false; this.net.latest = null; }
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
