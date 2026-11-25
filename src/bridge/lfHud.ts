/** B31B: what the HUD, minimap and results screen show of the Living Fractures world. Read-only; works on the local simulation and on the online client's snapshot copy alike (slot 0 is always the local fighter). */
import type { GameState } from '../sim/GameState';
import { ARENA_LF, BARGAINS, BLESSINGS, ELITE_COPY, LF_COPY, LF_RULES as F, LF_TERMINAL, type BargainId, type LfHist, type LfKind, type LfStats, type LfStatus } from '../b31/fractures';
import { PLAYER_FOOT_DY } from '../content/enemies';

export interface LfPreview { id: BargainId; name: string; boon: string; curse: string; dur: number; scope: 'you' | 'party' }
export interface LfHudEvent { id: number; kind: LfKind; name: string; st: LfStatus; line: string; sub: string; p: number; left: number; dist: number; ang: number; hp: number; hpMax: number; seen: boolean; near: boolean; accent: number; preview?: LfPreview[]; channel?: number }
export interface LfHudFx { id: number; kind: 'boon' | 'curse'; label: string; icon: string; left: number; dur: number; scope: string }
export interface LfToast { id: number; kind: string; title: string; sub: string; age: number }
export interface LfHud { events: LfHudEvent[]; fx: LfHudFx[]; toasts: LfToast[]; summary: { stats: LfStats; hist: LfHist[]; ended: boolean } }
export const NAMES: Record<LfKind, (v: GameState['arenaId']) => string> = { rift: v => ARENA_LF[v].rift.name, shrine: v => ARENA_LF[v].shrine.name, cache: v => ARENA_LF[v].cache.name, elite: () => 'Roaming Elite', relay: v => ARENA_LF[v].relay.name, echo: v => ARENA_LF[v].echoName };

export function lfHud(s: GameState): LfHud | null {
  const lf = s.lf; if (!lf) return null;
  const px = s.player.x, py = s.player.y + PLAYER_FOOT_DY, left = (t: number) => Math.max(0, t - s.time);
  const events: LfHudEvent[] = [];
  for (const e of lf.events) {
    if (LF_TERMINAL.includes(e.st)) continue;
    const dx = e.x - px, dy = e.y - py, dist = Math.hypot(dx, dy), a = e.aux; let line = '', sub = '', ev: Partial<LfHudEvent> = {};
    switch (e.kind) {
      case 'rift': line = e.st === 'idle' ? 'Step into the ring to open it' : e.st === 'active' ? `Break the guard: ${Math.round(e.hp)} left` : 'Touch the shard to claim it'; sub = e.st === 'active' ? 'Leave the ring for 9 s and it collapses' : 'Rare reward: relic and Rift Surge'; break;
      case 'shrine': line = e.st === 'idle' ? 'Stand on an altar to accept. Walk away to decline.' : `${BARGAINS[e.took!].name} is active`; sub = e.st === 'active' ? `${BARGAINS[e.took!].boon} · ${BARGAINS[e.took!].curse}` : 'Every boon carries a curse'; if (e.st === 'idle') { ev = { preview: e.pair!.map(id => ({ id, name: BARGAINS[id].name, boon: BARGAINS[id].boon, curse: BARGAINS[id].curse, dur: BARGAINS[id].dur, scope: BARGAINS[id].scope })), channel: Math.max(a[0], a[1]) / F.shrine.channel }; } break;
      case 'cache': line = e.st === 'idle' ? (e.seen ? 'Stay close to attune the crystal' : 'A cache hums nearby') : `Ambush: ${Math.round(e.hp)} left`; sub = e.st === 'active' ? 'Break the ambush to open it' : a[0] > 0 ? 'Guarded: expect company' : 'Sealed'; break;
      case 'elite': line = e.tag; sub = ELITE_COPY[e.mod!].cue; ev = { hp: e.hp, hpMax: e.hpMax }; break;
      case 'relay': line = e.type === 'escort' ? (e.st === 'idle' ? 'Stay beside the beacon to wake it' : 'Escort the beacon to the far marker') : e.st === 'idle' ? 'Stand in the ring to wake the relay' : 'Hold the ring while it charges'; sub = 'Protect its health. Waves come from outside.'; ev = { hp: e.hp, hpMax: e.hpMax }; break;
      case 'echo': line = e.st === 'idle' ? `${BLESSINGS[e.hero!].place}: step into the sigil` : BLESSINGS[e.hero!].trial; sub = `Reward: ${BLESSINGS[e.hero!].name}, ${BLESSINGS[e.hero!].boon}`; break;
    }
    events.push({ id: e.id, kind: e.kind, name: e.kind === 'elite' ? LF_COPY.elite.name : NAMES[e.kind](e.variant), st: e.st, line, sub, p: e.p, left: e.st === 'active' || e.st === 'idle' || e.st === 'reward' ? left(e.ex) : 0, dist, ang: Math.atan2(dy, dx), hp: e.hp, hpMax: e.hpMax, seen: e.seen, near: dist < F.notice, accent: ARENA_LF[e.variant].accent, ...ev });
  }
  events.sort((x, y) => (x.st === 'idle' ? 1 : 0) - (y.st === 'idle' ? 1 : 0) || x.dist - y.dist);
  const fx = lf.fx.filter(f => f.until > s.time).map(f => ({ id: f.id, kind: f.kind, label: f.label, icon: f.icon, left: left(f.until), dur: f.dur, scope: f.slot < 0 ? 'party' : s.party ? (f.slot === 0 ? 'P1' : 'P2') : '' }));
  const toasts = lf.log.filter(l => s.time - l.t < 6 && s.time >= l.t).map(l => ({ id: l.id, kind: l.kind, title: l.title, sub: l.sub, age: s.time - l.t }));
  return { events, fx, toasts, summary: { stats: lf.stats, hist: lf.hist, ended: lf.ended } };
}
/** Minimap markers: k = kind index, h = a vague hint for a hidden cache. Hidden caches show only a faint ping once a fighter is near enough to feel them. */
export function lfMarks(s: GameState): { x: number; y: number; k: number; st: number; p: number; h: number }[] {
  const lf = s.lf; if (!lf) return []; const out = [], K: LfKind[] = ['rift', 'shrine', 'cache', 'elite', 'relay', 'echo'];
  for (const e of lf.events) { if (LF_TERMINAL.includes(e.st)) continue; const d = Math.hypot(e.x - s.player.x, e.y - s.player.y), hidden = e.kind === 'cache' && !e.seen; if (hidden && d > 1150) continue; out.push({ x: e.x, y: e.y, k: K.indexOf(e.kind), st: e.st === 'idle' ? 0 : e.st === 'active' ? 1 : 2, p: e.p, h: hidden ? 1 : 0 }); }
  return out;
}
