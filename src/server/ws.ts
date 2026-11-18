/** A small, dependency-free WebSocket (RFC 6455) server for the co-op game server: HTTP upgrade handshake, masked client frames, text / ping / pong / close, fragmentation, a hard payload cap. Written in-repo so a self-hosted server has no third-party runtime dependency. TLS is terminated by the reverse proxy (see docs/b22/SERVER.md): production traffic is wss://. */
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export class WsConn {
  onMessage: (text: string) => void = () => undefined; onClose: () => void = () => undefined; closed = false; remote = ''; private buf = Buffer.alloc(0); private frag: Buffer[] = []; private fragLen = 0;
  constructor(private readonly sock: Duplex, private readonly maxPayload: number) {
    sock.on('data', d => this.data(d)); sock.on('close', () => this.end()); sock.on('error', () => this.end()); (sock as unknown as { setNoDelay?: (v: boolean) => void }).setNoDelay?.(true);
  }
  private end() { if (this.closed) return; this.closed = true; this.onClose(); }
  private frame(op: number, payload: Buffer) {
    const n = payload.length, h = n < 126 ? Buffer.from([0x80 | op, n]) : n < 65536 ? Buffer.from([0x80 | op, 126, n >> 8, n & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 0x80 | op; b[1] = 127; b.writeBigUInt64BE(BigInt(n), 2); return b; })();
    return Buffer.concat([h, payload]);
  }
  send(text: string) { if (!this.closed) this.sock.write(this.frame(1, Buffer.from(text, 'utf8'))); }
  close(code = 1000) { if (this.closed) return; try { const p = Buffer.alloc(2); p.writeUInt16BE(code); this.sock.write(this.frame(8, p)); } catch { /* socket gone */ } this.sock.end(); this.end(); }
  private data(d: Buffer) {
    this.buf = Buffer.concat([this.buf, d]); if (this.buf.length > this.maxPayload * 2 + 16) return this.close(1009);
    for (;;) {
      const b = this.buf; if (b.length < 2) return; const fin = !!(b[0] & 0x80), op = b[0] & 15, masked = !!(b[1] & 0x80); let len = b[1] & 127, off = 2;
      if (!masked) return this.close(1002);   // clients MUST mask
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; } else if (len === 127) { if (b.length < 10) return; const big = b.readBigUInt64BE(2); if (big > BigInt(this.maxPayload)) return this.close(1009); len = Number(big); off = 10; }
      if (len > this.maxPayload) return this.close(1009); if (b.length < off + 4 + len) return;
      const mask = b.subarray(off, off + 4), payload = Buffer.from(b.subarray(off + 4, off + 4 + len)); for (let i = 0; i < len; i++) payload[i] ^= mask[i & 3];
      this.buf = b.subarray(off + 4 + len);
      if (op === 8) return this.close(1000); if (op === 9) { this.sock.write(this.frame(10, payload)); continue; } if (op === 10) continue;
      if (op === 1 || op === 0) {
        if (op === 1) { this.frag = []; this.fragLen = 0; } this.frag.push(payload); this.fragLen += len; if (this.fragLen > this.maxPayload) return this.close(1009);
        if (fin) { const text = Buffer.concat(this.frag).toString('utf8'); this.frag = []; this.fragLen = 0; this.onMessage(text); }
      } else return this.close(1003);
    }
  }
}
export function attachWs(server: Server, onConn: (c: WsConn, req: IncomingMessage) => void, opts: { maxPayload?: number; origins?: string[] } = {}) {
  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'], origin = req.headers.origin;
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || typeof key !== 'string' || req.headers['sec-websocket-version'] !== '13' || (opts.origins && opts.origins.length && origin && !opts.origins.includes(origin))) { sock.write('HTTP/1.1 400 Bad Request\r\n\r\n'); sock.destroy(); return; }
    const accept = createHash('sha1').update(key + GUID).digest('base64');
    sock.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const c = new WsConn(sock, opts.maxPayload ?? 4096); c.remote = String(req.socket.remoteAddress ?? ''); onConn(c, req);
  });
}
