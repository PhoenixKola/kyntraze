import { useEffect, useState } from 'react';
import { NetClient } from '../../net/RemoteSimulation';
import type { HeroId } from '../../content/heroes';
import { HERO_IDS } from '../../content/heroes';
import { safeServerUrl } from '../../b22/save';
import type { RoomMode } from '../../net/protocol';
import { HintBar } from './Chrome';

interface Props { savedUrl: string; savedName: string; hero: HeroId; onSaveServer: (url: string, name: string) => void; onStart: (net: NetClient, seed: number) => void; onBack: () => void }
/** Online co-op lobby: server address (wss:// only; ws:// to localhost for development), a display name, create / join by room code, hero pick and ready. Nothing is sent until you press CONNECT; solo play never touches the network. */
export function OnlineLobby({ savedUrl, savedName, hero, onSaveServer, onStart, onBack }: Props) {
  const [url, setUrl] = useState(savedUrl), [name, setName] = useState(savedName || 'Runner'), [code, setCode] = useState(''), [mode, setMode] = useState<RoomMode>('classic'), [h, setH] = useState<HeroId>(hero);
  const [net, setNet] = useState<NetClient | null>(null), [, tick] = useState(0), [busy, setBusy] = useState(false);
  const ok = safeServerUrl(url);
  useEffect(() => { if (!net) return; const off = net.on(() => tick(n => n + 1)); return off; }, [net]);
  useEffect(() => { if (net?.room?.state === 'running') onStart(net, 0); }, [net, net?.room?.state, onStart]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); net?.close(); onBack(); } }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [net, onBack]);
  const connect = async () => {
    if (!ok) return; setBusy(true); onSaveServer(ok, name);
    try { const w = window as unknown as { kyntrazeNet?: { setServer: (u: string) => Promise<{ ok: boolean }> } }; if (w.kyntrazeNet) { await w.kyntrazeNet.setServer(ok); } } catch { /* desktop allowlist is best-effort here */ }
    const c = new NetClient(ok, name); try { await c.connect(); setNet(c); } catch { setNet(c); } setBusy(false);
  };
  const room = net?.room;
  return <main className="selection-layout online-layout" data-testid="online-lobby">
    <div className="screen-header"><button className="text-button" onClick={() => { net?.close(); onBack(); }} data-pad-cancel>← BACK</button><span>ONLINE CO-OP · FRACTURE ALLIANCE</span></div>
    <p className="eyebrow">TWO RUNNERS · ONE SERVER-OWNED RUN</p><h2 className="large-heading">{room ? `ROOM ${room.code}` : 'JOIN THE ALLIANCE'}</h2>
    {!net && <div className="online-form">
      <label>SERVER<input value={url} onChange={e => setUrl(e.target.value)} placeholder="wss://your-server.example" data-testid="server-url" spellCheck={false}/></label>
      <label>NAME<input value={name} maxLength={24} onChange={e => setName(e.target.value.replace(/[^\w .-]/g, ''))} data-testid="player-name"/></label>
      <p className="asc-note">{ok ? `Will connect to ${ok}. Only your inputs and choices are sent; the server runs the fight and records verified results.` : 'Enter a wss:// address (ws://127.0.0.1 works for a local test server). Public hosting is up to whoever runs the server.'}</p>
      <button className="primary-button" disabled={!ok || busy} onClick={() => void connect()} data-testid="connect">{busy ? 'CONNECTING…' : 'CONNECT'}</button>
    </div>}
    {net && !room && <div className="online-form">
      {net.error && <p className="asc-note" role="alert" data-testid="net-error">{net.error}</p>}
      <div className="mode-opts">{HERO_IDS.map(x => <button key={x} className={`outlined-button ${h === x ? 'on' : ''}`} onClick={() => setH(x)}>{x.toUpperCase()}</button>)}</div>
      <div className="mode-opts">{(['classic', 'fracture_expedition', 'boss_rush'] as RoomMode[]).map(m => <button key={m} className={`outlined-button ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>{m.replace(/_/g, ' ').toUpperCase()}</button>)}</div>
      <button className="primary-button" onClick={() => net.send({ t: 'create', hero: h, mode, arena: mode === 'fracture_expedition' ? 'aetherfall' : 'gloam' })} data-testid="create-room">CREATE ROOM</button>
      <div className="mode-opts"><input value={code} maxLength={5} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CODE" data-testid="room-code"/><button className="outlined-button" onClick={() => net.send({ t: 'join', code, hero: h })} data-testid="join-room">JOIN</button></div>
    </div>}
    {net && room && <div className="online-form" data-testid="room-view">
      <ul>{room.players.map((p, i) => <li key={i}><b>{p.name}</b> · {p.hero.toUpperCase()} · {p.connected ? (p.ready ? 'READY' : 'not ready') : 'disconnected'}{i === room.you ? ' (you)' : ''}</li>)}</ul>
      <p className="asc-note">{room.players.length < 2 ? `Share the code ${room.code} with your partner.` : 'Both ready starts the run.'} Mode: {room.mode.replace(/_/g, ' ')}</p>
      <button className="primary-button" onClick={() => net.send({ t: 'ready', ready: !room.players[room.you]?.ready })} data-testid="ready">{room.players[room.you]?.ready ? 'NOT READY' : 'READY'}</button>
    </div>}
    <HintBar hints={[{ key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}
