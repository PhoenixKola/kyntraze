/** B22.6 online co-op wire protocol, shared by the server and the browser / Electron client. Versioned: a client and server that disagree refuse each other with an explicit "update required" error instead of misbehaving. The client may only send INPUT and CHOICES; it can never send damage, health, score, rewards or results. */
import type { InputState } from '../sim/GameState';
import { HERO_IDS, type HeroId } from '../content/heroes';

export const PROTOCOL_VERSION = 1, MAX_MSG_BYTES = 2048, INPUT_HZ = 60;
export type RoomMode = 'classic' | 'fracture_expedition' | 'boss_rush';
export const ROOM_MODES: readonly RoomMode[] = ['classic', 'fracture_expedition', 'boss_rush'];
export type ClientMsg =
  | { t: 'hello'; v: number; name: string; token?: string }
  | { t: 'create'; hero: HeroId; mode: RoomMode; arena: string }
  | { t: 'join'; code: string; hero: HeroId }
  | { t: 'ready'; ready: boolean; hero?: HeroId }
  | { t: 'input'; seq: number; i: WireInput }
  | { t: 'pick'; kind: 'upgrade' | 'branch' | 'relic' | 'legend'; id: string }
  | { t: 'leave' } | { t: 'ping'; n: number };
export interface WireInput { x: number; y: number; dash: boolean; q: boolean; f: boolean; beam: boolean; sphere: boolean; beamHeld: boolean; fHeld: boolean; sig?: boolean; sigHeld?: boolean; od?: boolean; sigAbort?: boolean; flyHeld?: boolean; aimX?: number; aimY?: number; aimSrc?: 'pointer' | 'stick'; aimDist?: number }
export type ServerMsg =
  | { t: 'welcome'; v: number; id: string; token: string; serverTime: number }
  | { t: 'room'; code: string; mode: RoomMode; arena: string; state: 'lobby' | 'running' | 'ended'; you: number; players: { name: string; hero: HeroId; ready: boolean; connected: boolean }[] }
  | { t: 'snap'; tick: number; ack: number; s: unknown }
  | { t: 'result'; won: boolean; seconds: number; kills: number; score: number; runId: string; verified: true; rank?: number }
  | { t: 'error'; code: 'version' | 'bad_message' | 'rate_limit' | 'no_room' | 'room_full' | 'bad_state' | 'forbidden'; msg: string }
  | { t: 'pong'; n: number };

const fin = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export const isHero = (v: unknown): v is HeroId => typeof v === 'string' && (HERO_IDS as readonly string[]).includes(v);
const NAME = /^[\w .-]{1,24}$/, CODE = /^[A-Z2-9]{5}$/;
/** Strict parse of one client message. Returns null for anything malformed, oversized, or out of range: the server never trusts a field it did not validate. */
export function parseClient(raw: string): ClientMsg | null {
  if (typeof raw !== 'string' || raw.length > MAX_MSG_BYTES) return null;
  let m: unknown; try { m = JSON.parse(raw); } catch { return null; } if (typeof m !== 'object' || m === null) return null; const o = m as Record<string, unknown>;
  switch (o.t) {
    case 'hello': return fin(o.v, 0, 1e6) && typeof o.name === 'string' && NAME.test(o.name) && (o.token === undefined || (typeof o.token === 'string' && /^[0-9a-f]{48}$/.test(o.token))) ? { t: 'hello', v: o.v as number, name: o.name, token: o.token as string | undefined } : null;
    case 'create': return isHero(o.hero) && typeof o.mode === 'string' && (ROOM_MODES as readonly string[]).includes(o.mode) && typeof o.arena === 'string' && /^[a-z]{3,12}$/.test(o.arena) ? { t: 'create', hero: o.hero, mode: o.mode as RoomMode, arena: o.arena } : null;
    case 'join': return typeof o.code === 'string' && CODE.test(o.code) && isHero(o.hero) ? { t: 'join', code: o.code, hero: o.hero } : null;
    case 'ready': return typeof o.ready === 'boolean' && (o.hero === undefined || isHero(o.hero)) ? { t: 'ready', ready: o.ready, hero: o.hero as HeroId | undefined } : null;
    case 'input': {
      const i = o.i as Record<string, unknown> | undefined; if (!i || typeof i !== 'object' || !fin(o.seq, 0, 2 ** 31)) return null;
      if (!fin(i.x, -1, 1) || !fin(i.y, -1, 1)) return null; for (const k of ['dash', 'q', 'f', 'beam', 'sphere', 'beamHeld', 'fHeld']) if (typeof i[k] !== 'boolean') return null;
      for (const k of ['sig', 'sigHeld', 'od', 'sigAbort', 'flyHeld']) if (i[k] !== undefined && typeof i[k] !== 'boolean') return null;
      const aim = i.aimX !== undefined ? (fin(i.aimX, -1, 1) && fin(i.aimY, -1, 1) && (i.aimSrc === 'pointer' || i.aimSrc === 'stick') && (i.aimDist === undefined || fin(i.aimDist, 0, 5000))) : true; if (!aim) return null;
      return { t: 'input', seq: o.seq as number, i: i as unknown as WireInput };
    }
    case 'pick': return (o.kind === 'upgrade' || o.kind === 'branch' || o.kind === 'relic' || o.kind === 'legend') && typeof o.id === 'string' && /^[a-z_]{2,32}$/.test(o.id) ? { t: 'pick', kind: o.kind, id: o.id } : null;
    case 'leave': return { t: 'leave' };
    case 'ping': return fin(o.n, 0, 1e9) ? { t: 'ping', n: o.n as number } : null;
    default: return null;
  }
}
export const toInputState = (w: WireInput): InputState => ({ x: w.x, y: w.y, dash: w.dash, q: w.q, f: w.f, beam: w.beam, sphere: w.sphere, beamHeld: w.beamHeld, fHeld: w.fHeld, ...(w.sig ? { sig: true } : {}), ...(w.sigHeld ? { sigHeld: true } : {}), ...(w.od ? { od: true } : {}), ...(w.sigAbort ? { sigAbort: true } : {}), ...(w.flyHeld ? { flyHeld: true } : {}), ...(w.aimX !== undefined ? { aimX: w.aimX, aimY: w.aimY, aimSrc: w.aimSrc, ...(w.aimDist !== undefined ? { aimDist: w.aimDist } : {}) } : {}) });
export const fromInputState = (i: InputState): WireInput => ({ x: i.x, y: i.y, dash: i.dash, q: i.q, f: i.f, beam: !!i.beam, sphere: !!i.sphere, beamHeld: !!i.beamHeld, fHeld: !!i.fHeld, ...(i.sig ? { sig: true } : {}), ...(i.sigHeld ? { sigHeld: true } : {}), ...(i.od ? { od: true } : {}), ...(i.sigAbort ? { sigAbort: true } : {}), ...(i.flyHeld ? { flyHeld: true } : {}), ...(i.aimX !== undefined ? { aimX: i.aimX, aimY: i.aimY, aimSrc: i.aimSrc, ...(i.aimDist !== undefined ? { aimDist: i.aimDist } : {}) } : {}) });
