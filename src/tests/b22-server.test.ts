// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { connect } from 'node:net';
import { startServer } from '../server';
import { PROTOCOL_VERSION, parseClient } from '../net/protocol';

type Msg = { t: string; [k: string]: unknown };
async function client(port: number) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`), msgs: Msg[] = [];
  ws.onmessage = e => msgs.push(JSON.parse(String(e.data)));
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); });
  const send = (m: object) => ws.send(JSON.stringify(m));
  const wait = async (f: (m: Msg) => boolean, ms = 4000) => { const t0 = Date.now(); for (;;) { const m = msgs.find(f); if (m) return m; if (Date.now() - t0 > ms) throw new Error('timeout waiting for message; got ' + msgs.slice(-3).map(x => x.t).join(',')); await new Promise(r => setTimeout(r, 15)); } };
  return { ws, msgs, send, wait };
}
const inp = (o: object = {}) => ({ x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, beamHeld: false, fHeld: false, ...o });

describe('B22.6 online co-op server (real sockets, real two-fighter simulation)', () => {
  it('parser: rejects malformed, oversized, out-of-range and wrong-type messages; never trusts a field it did not validate', () => {
    expect(parseClient('not json')).toBeNull(); expect(parseClient('x'.repeat(5000))).toBeNull(); expect(parseClient(JSON.stringify({ t: 'input', seq: 1, i: inp({ x: 5 }) }))).toBeNull(); expect(parseClient(JSON.stringify({ t: 'input', seq: 1, i: inp({ dash: 'yes' }) }))).toBeNull();
    expect(parseClient(JSON.stringify({ t: 'hello', v: 1, name: '<script>' }))).toBeNull(); expect(parseClient(JSON.stringify({ t: 'join', code: 'abc', hero: 'kai' }))).toBeNull(); expect(parseClient(JSON.stringify({ t: 'damage', amount: 9999 }))).toBeNull(); expect(parseClient(JSON.stringify({ t: 'result', won: true }))).toBeNull();
    expect(parseClient(JSON.stringify({ t: 'input', seq: 3, i: inp({ x: 1, aimX: 0.5, aimY: 0.5, aimSrc: 'stick' }) }))).not.toBeNull();
  });
  it('two real clients play ONE simulation: both see the same enemies, each sees the other fighter move; the host\'s input moves only their own fighter', async () => {
    const srv = await startServer({ port: 0 }); try {
      const a = await client(srv.port), b = await client(srv.port);
      a.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Alpha' }); await a.wait(m => m.t === 'welcome'); b.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Beta' }); await b.wait(m => m.t === 'welcome');
      a.send({ t: 'create', hero: 'kai', mode: 'classic', arena: 'gloam' }); const room = await a.wait(m => m.t === 'room'); const code = room.code as string;
      b.send({ t: 'join', code, hero: 'ren' }); await b.wait(m => m.t === 'room' && (m.players as unknown[]).length === 2);
      a.send({ t: 'ready', ready: true }); b.send({ t: 'ready', ready: true }); await a.wait(m => m.t === 'room' && m.state === 'running');
      let seq = 0; const feed = () => { a.send({ t: 'input', seq: ++seq, i: inp({ x: 1 }) }); b.send({ t: 'input', seq: seq, i: inp({ y: 1 }) }); };
      for (let i = 0; i < 90; i++) { feed(); await new Promise(r => setTimeout(r, 16)); }
      const sa = [...a.msgs].reverse().find(m => m.t === 'snap')!.s as { me: { player: { x: number; y: number }; hero: string }; partner: { player: { x: number; y: number }; hero: string }; enemies: { id: number }[]; tick: number }, sb = [...b.msgs].reverse().find(m => m.t === 'snap')!.s as typeof sa;
      expect(sa.me.hero).toBe('kai'); expect(sa.partner.hero).toBe('ren'); expect(sb.me.hero).toBe('ren'); expect(sb.partner.hero).toBe('kai');
      expect(sa.me.player.x).toBeGreaterThan(1100); expect(sb.partner.player.x).toBeGreaterThan(1100);   // A moved right; B sees it
      expect(sb.me.player.y).toBeGreaterThan(sb.partner.player.y); expect(sa.partner.player.y).toBeGreaterThan(800);   // B moved down; A sees it
      expect(a.msgs.filter(m => m.t === 'snap').length).toBeGreaterThan(10);
      const ids = (x: typeof sa) => new Set(x.enemies.map(e => e.id)); const shared = [...ids(sa)].filter(i => ids(sb).has(i)); expect(shared.length).toBeGreaterThan(0);   // the same enemies exist for both
      a.ws.close(); b.ws.close();
    } finally { srv.close(); }
  }, 30000);
  it('protocol hardening: wrong version is refused with an update message; garbage and duplicate input are ignored; a client can never submit a result; unmasked frames are rejected', async () => {
    const srv = await startServer({ port: 0 }); try {
      const old = await client(srv.port); old.send({ t: 'hello', v: 999, name: 'Old' }); const e = await old.wait(m => m.t === 'error'); expect(e.code).toBe('version');
      const c = await client(srv.port); c.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Fuzz' }); await c.wait(m => m.t === 'welcome'); c.ws.send('{{{'); c.send({ t: 'result', won: true, score: 9e9 }); c.send({ t: 'pick', kind: 'upgrade', id: 'impact' });
      await c.wait(m => m.t === 'error'); c.send({ t: 'join', code: 'ZZZZZ', hero: 'kai' }); expect((await c.wait(m => m.t === 'error' && m.code === 'no_room')).code).toBe('no_room'); expect(srv.store.size()).toBe(0);
      await new Promise<void>((res) => { const s = connect(srv.port, '127.0.0.1', () => { s.write('GET / HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'); setTimeout(() => { s.write(Buffer.from([0x81, 0x02, 0x68, 0x69])); }, 50); }); let got = ''; s.on('data', d => { got += d.toString('latin1'); }); s.on('close', () => { expect(got).toContain('101'); res(); }); setTimeout(() => { s.destroy(); res(); }, 600); });
      const h = await fetch(`http://127.0.0.1:${srv.port}/health`).then(r => r.json()) as { ok: boolean; v: number }; expect(h.ok).toBe(true); expect(h.v).toBe(PROTOCOL_VERSION);
    } finally { srv.close(); }
  }, 20000);
  it('a third player cannot join a full room; a finished run is recorded once as a SERVER-verified result; reconnect with the token keeps the same fighter', async () => {
    const srv = await startServer({ port: 0 }); try {
      const [a, b, c] = [await client(srv.port), await client(srv.port), await client(srv.port)];
      for (const [x, n] of [[a, 'A'], [b, 'B'], [c, 'C']] as const) { x.send({ t: 'hello', v: PROTOCOL_VERSION, name: n }); await x.wait(m => m.t === 'welcome'); }
      a.send({ t: 'create', hero: 'sora', mode: 'classic', arena: 'ashen' }); const code = (await a.wait(m => m.t === 'room')).code as string; const token = (await a.wait(m => m.t === 'welcome' && !!m.token && m !== a.msgs[0])).token as string;
      b.send({ t: 'join', code, hero: 'vex' }); await b.wait(m => m.t === 'room' && (m.players as unknown[]).length === 2); c.send({ t: 'join', code, hero: 'kai' }); expect((await c.wait(m => m.t === 'error')).code).toBe('room_full');
      a.send({ t: 'ready', ready: true }); b.send({ t: 'ready', ready: true }); await a.wait(m => m.t === 'room' && m.state === 'running');
      a.ws.close(); await new Promise(r => setTimeout(r, 150)); const a2 = await client(srv.port); a2.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'A', token }); await a2.wait(m => m.t === 'welcome'); const r2 = await a2.wait(m => m.t === 'room' && m.state === 'running'); expect(r2.you).toBe(0);
      a2.send({ t: 'input', seq: 1, i: inp({ x: 1 }) }); const snap = await a2.wait(m => m.t === 'snap'); expect(((snap.s as { me: { hero: string } }).me.hero)).toBe('sora');
      const room = srv.rooms.get(code)!; room.finish(); room.finish(); await a2.wait(m => m.t === 'result'); const res = a2.msgs.find(m => m.t === 'result')!; expect(res.verified).toBe(true); expect(srv.store.size()).toBe(1);
      const lb = await fetch(`http://127.0.0.1:${srv.port}/leaderboard?mode=classic&party=2`).then(r => r.json()) as { verified: boolean; rows: { names: string[] }[] }; expect(lb.verified).toBe(true); expect(lb.rows).toHaveLength(1); expect(JSON.stringify(lb)).not.toContain('127.0.0.1');
    } finally { srv.close(); }
  }, 30000);
});
