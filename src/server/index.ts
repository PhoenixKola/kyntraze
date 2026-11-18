/** KYNTRAZE co-op game server. Run: `node dist/server.mjs` (see docs/b22/SERVER.md). Env: PORT (2567), KYNT_DATA (results file), KYNT_ORIGINS (comma list of allowed browser origins), KYNT_MAX_ROOMS (100). Plain ws:// is for localhost and for a TLS-terminating reverse proxy; the public endpoint must be wss://. */
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { attachWs, type WsConn } from './ws';
import { Room, newCode, type Player } from './room';
import { Store } from './store';
import { PROTOCOL_VERSION, parseClient, type ServerMsg } from '../net/protocol';
import { isArenaId } from '../content/arenas';

export interface ServerOpts { port?: number; dataFile?: string | null; origins?: string[]; maxRooms?: number }
export function startServer(o: ServerOpts = {}) {
  const store = new Store(o.dataFile ?? null), rooms = new Map<string, Room>(), maxRooms = o.maxRooms ?? 100, started = Date.now();
  const tokens = new Map<string, { room: Room; player: Player }>();
  const http = createServer((req, res) => {
    const u = new URL(req.url ?? '/', 'http://x'); const cors = { 'Access-Control-Allow-Origin': o.origins?.length ? o.origins[0] : '*', 'Cache-Control': 'no-store' };
    if (u.pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify({ ok: true, v: PROTOCOL_VERSION, rooms: rooms.size, uptime: Math.floor((Date.now() - started) / 1000), results: store.size() })); return; }
    if (u.pathname === '/leaderboard') { const mode = u.searchParams.get('mode') ?? 'classic', party = u.searchParams.get('party') === '1' ? 1 : 2; const rows = store.list(mode.slice(0, 24), party, Number(u.searchParams.get('limit')) || 20, Number(u.searchParams.get('offset')) || 0); res.writeHead(200, { 'Content-Type': 'application/json', ...cors }); res.end(JSON.stringify({ verified: true, rules: 1, rows: rows.map(r => ({ names: r.names, heroes: r.heroes, won: r.won, seconds: r.seconds, kills: r.kills, score: r.score, at: r.at })) })); return; }
    res.writeHead(404); res.end();
  });
  const send = (c: WsConn, m: ServerMsg) => c.send(JSON.stringify(m));
  attachWs(http, (c) => {
    let name = '', me: { room: Room; player: Player } | null = null, hello = false, bucket = 200, last = Date.now(), strikes = 0;
    c.onMessage = text => {
      const now = Date.now(); bucket = Math.min(200, bucket + ((now - last) / 1000) * 140); last = now; if (--bucket < 0) { if (++strikes > 3) { send(c, { t: 'error', code: 'rate_limit', msg: 'slow down' }); c.close(1008); } return; }
      const m = parseClient(text); if (!m) { if (++strikes > 20) c.close(1003); send(c, { t: 'error', code: 'bad_message', msg: 'malformed message' }); return; }
      if (m.t === 'ping') { send(c, { t: 'pong', n: m.n }); return; }
      if (!hello) {
        if (m.t !== 'hello') return; if (m.v !== PROTOCOL_VERSION) { send(c, { t: 'error', code: 'version', msg: `Update required: server protocol ${PROTOCOL_VERSION}` }); c.close(1002); return; }
        name = m.name; hello = true;
        if (m.token && tokens.has(m.token)) { const t = tokens.get(m.token)!; if (t.room.state !== 'ended') { me = t; t.room.rebind(t.player, c); } }
        send(c, { t: 'welcome', v: PROTOCOL_VERSION, id: me?.player.id ?? randomBytes(8).toString('hex'), token: me?.player.token ?? '', serverTime: Date.now() }); return;
      }
      if (m.t === 'create') {
        if (me || rooms.size >= maxRooms) { send(c, { t: 'error', code: me ? 'bad_state' : 'room_full', msg: 'cannot create' }); return; }
        let code = newCode(); while (rooms.has(code)) code = newCode(); const arena = isArenaId(m.arena) ? m.arena : 'gloam';
        const room = new Room(code, m.mode, arena, store, r => { rooms.delete(r.code); for (const [k, v] of tokens) if (v.room === r) tokens.delete(k); r.destroy(); });
        rooms.set(code, room); const p = room.add(name, m.hero, c)!; me = { room, player: p }; tokens.set(p.token, me); send(c, { t: 'welcome', v: PROTOCOL_VERSION, id: p.id, token: p.token, serverTime: Date.now() }); return;
      }
      if (m.t === 'join') {
        const room = rooms.get(m.code); if (!room) { send(c, { t: 'error', code: 'no_room', msg: 'no such room' }); return; } if (me) { send(c, { t: 'error', code: 'bad_state', msg: 'already in a room' }); return; }
        const p = room.add(name, m.hero, c); if (!p) { send(c, { t: 'error', code: 'room_full', msg: 'room is full or already started' }); return; } me = { room, player: p }; tokens.set(p.token, me); send(c, { t: 'welcome', v: PROTOCOL_VERSION, id: p.id, token: p.token, serverTime: Date.now() }); return;
      }
      if (m.t === 'leave') { if (me) { me.room.detach(me.player); me = null; } return; }
      if (me) me.room.handle(me.player, m); else send(c, { t: 'error', code: 'bad_state', msg: 'not in a room' });
    };
    c.onClose = () => { if (me) me.room.detach(me.player); };
  }, { origins: o.origins, maxPayload: 4096 });
  // room expiry: empty / idle lobbies and finished rooms are reaped
  const reap = setInterval(() => { for (const r of rooms.values()) { if (r.state === 'lobby') { r.idle += 30; if (r.idle > 900) r.destroy(), rooms.delete(r.code); } } }, 30000); reap.unref?.();
  return new Promise<{ port: number; close: () => void; rooms: Map<string, Room>; store: Store }>(resolve => http.listen(o.port ?? 2567, () => { const addr = http.address(); resolve({ port: typeof addr === 'object' && addr ? addr.port : 0, close: () => { clearInterval(reap); for (const r of rooms.values()) r.destroy(); http.close(); http.closeAllConnections?.(); }, rooms, store }); }));
}
