// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { startServer } from '../server';
import { PROTOCOL_VERSION } from '../net/protocol';

type Msg = { t: string; [k: string]: unknown };
async function client(port: number) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`), msgs: Msg[] = []; ws.onmessage = e => msgs.push(JSON.parse(String(e.data)));
  await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error('ws error')); });
  const send = (m: object) => ws.send(JSON.stringify(m));
  const wait = async (f: (m: Msg) => boolean, ms = 4000) => { const t0 = Date.now(); for (;;) { const m = msgs.find(f); if (m) return m; if (Date.now() - t0 > ms) throw new Error('timeout; got ' + msgs.slice(-3).map(x => x.t).join(',')); await new Promise(r => setTimeout(r, 15)); } };
  return { ws, msgs, send, wait };
}
async function room(port: number, lf: boolean) {
  const a = await client(port), b = await client(port);
  a.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Alpha' }); await a.wait(m => m.t === 'welcome'); b.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Beta' }); await b.wait(m => m.t === 'welcome');
  a.send({ t: 'create', hero: 'kai', mode: 'classic', arena: 'gloam', ...(lf ? { lf: true } : {}) }); const r = await a.wait(m => m.t === 'room'); b.send({ t: 'join', code: r.code, hero: 'sora' }); await b.wait(m => m.t === 'room' && (m.players as unknown[]).length === 2);
  a.send({ t: 'ready', ready: true }); b.send({ t: 'ready', ready: true }); await a.wait(m => m.t === 'room' && m.state === 'running');
  const inp = { x: 0, y: 0, dash: false, q: false, f: false, beam: false, sphere: false, beamHeld: false, fHeld: false }; let seq = 0;
  for (let i = 0; i < 30; i++) { a.send({ t: 'input', seq: ++seq, i: inp }); b.send({ t: 'input', seq, i: inp }); await new Promise(r2 => setTimeout(r2, 16)); }
  return { a, b, room: r };
}
describe('B31B online: real sockets, two real clients', () => {
  it('a Living Fractures room announces itself, both players receive the same shared event world, and nothing else changes', async () => {
    const srv = await startServer({ port: 0 }); try {
      const { a, b, room: r } = await room(srv.port, true); expect(r.lf).toBe(true);
      const sa = [...a.msgs].reverse().find(m => m.t === 'snap')!.s as { lf: { events: unknown[]; stats: unknown }; plan: { living?: boolean; id: string } }, sb = [...b.msgs].reverse().find(m => m.t === 'snap')!.s as typeof sa;
      expect(sa.plan.living).toBe(true); expect(sa.plan.id).toBe('classic+lf'); expect(sa.lf.events).toEqual(sb.lf.events); expect(sa.lf.stats).toEqual(sb.lf.stats); a.ws.close(); b.ws.close();
    } finally { srv.close(); }
  }, 30000);
  it('with the option off, existing online sessions are unchanged: no event world is sent', async () => {
    const srv = await startServer({ port: 0 }); try {
      const { a, b, room: r } = await room(srv.port, false); expect(r.lf).toBe(false);
      const sa = [...a.msgs].reverse().find(m => m.t === 'snap')!.s as { lf?: unknown; plan: { id: string; living?: boolean } }; expect(sa.lf).toBeUndefined(); expect(sa.plan.id).toBe('classic'); expect(sa.plan.living).toBeUndefined(); a.ws.close(); b.ws.close();
    } finally { srv.close(); }
  }, 30000);
  it('a client on the old protocol is refused with an explicit update message, and a forged event claim is rejected', async () => {
    const srv = await startServer({ port: 0 }); try {
      const old = await client(srv.port); old.send({ t: 'hello', v: 1, name: 'Old' }); const e = await old.wait(m => m.t === 'error'); expect(e.code).toBe('version');
      const c = await client(srv.port); c.send({ t: 'hello', v: PROTOCOL_VERSION, name: 'Fuzz' }); await c.wait(m => m.t === 'welcome'); c.send({ t: 'lf_claim', id: 1, reward: 'relic' }); const bad = await c.wait(m => m.t === 'error'); expect(bad.code).toBe('bad_message'); c.ws.close();
    } finally { srv.close(); }
  }, 30000);
});
