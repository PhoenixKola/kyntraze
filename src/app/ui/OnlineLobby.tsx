import { useEffect, useState } from 'react';
import { NetClient } from '../../net/RemoteSimulation';
import type { HeroId } from '../../content/heroes';
import { HERO_IDS } from '../../content/heroes';
import { safeServerUrl } from '../../b22/save';
import type { RoomMode } from '../../net/protocol';
import { Card, Chip, Cta, Frame, Panel } from './b29/Kit';
import { DEFAULT_SERVER_URL } from '../../net/defaultServer';

interface Props { notice?: string; savedUrl: string; savedName: string; hero: HeroId; onSaveServer: (url: string, name: string) => void; onStart: (net: NetClient, seed: number) => void; onBack: () => void }
/** Online co-op lobby: server address (wss:// only; ws:// to localhost for development), a display name, create / join by room code, hero pick and ready. Nothing is sent until you press CONNECT; solo play never touches the network. */
export function OnlineLobby({ notice, savedUrl, savedName, hero, onSaveServer, onStart, onBack }: Props) {
  const [url, setUrl] = useState(savedUrl || DEFAULT_SERVER_URL), [name, setName] = useState(savedName || 'Runner'), [code, setCode] = useState(''), [mode, setMode] = useState<RoomMode>('classic'), [h, setH] = useState<HeroId>(hero);
  const [net, setNet] = useState<NetClient | null>(null), [, tick] = useState(0), [busy, setBusy] = useState(false), [fail, setFail] = useState(''), [adv, setAdv] = useState(false);
  const ok = safeServerUrl(url);
  useEffect(() => { if (!net) return; const off = net.on(() => tick(n => n + 1)); return off; }, [net]);
  useEffect(() => { if (net?.room?.state === 'running') onStart(net, 0); }, [net, net?.room?.state, onStart]);
  const connect = async () => {
    if (!ok) return; setBusy(true); onSaveServer(ok, name);
    try { const w = window as unknown as { kyntrazeNet?: { setServer: (u: string) => Promise<{ ok: boolean }> } }; if (w.kyntrazeNet) { await w.kyntrazeNet.setServer(ok); } } catch { /* desktop allowlist is best-effort here */ }
    const c = new NetClient(ok, name); try { await c.connect(); setNet(c); setFail(''); } catch { c.close(); setFail(c.error ?? 'Could not reach the server'); } setBusy(false);
  };
  const room = net?.room, leave = () => { net?.close(); onBack(); }, me = room?.players[room.you], official = url === DEFAULT_SERVER_URL && !adv;
  const ACC: Record<string, string> = { kai: '#ffab4a', ren: '#ff4a5c', sora: '#5eb6ff', vex: '#a982ff' };
  const heroPick = (cur: HeroId, pick: (x: HeroId) => void, label: string, testPrefix?: string) => <div className="lb-heroes" role="group" aria-label={label}>{HERO_IDS.map(x => <Card key={x} on={cur === x} accent={ACC[x]} onClick={() => pick(x)} testId={testPrefix ? `${testPrefix}-${x}` : undefined}><b>{x.toUpperCase()}</b></Card>)}</div>;
  const stage = !net ? 'CONNECT' : !room ? 'CHOOSE' : 'ROOM';
  return <Frame testId="online-lobby" className="b29-lobby" eyebrow="ONLINE CO-OP · FRACTURE ALLIANCE" title={room ? `ROOM ${room.code}` : 'JOIN THE ALLIANCE'} sub="TWO RUNNERS · ONE SERVER-OWNED RUN" onBack={leave}
    right={<><Chip tone={stage === 'ROOM' ? 'gold' : 'teal'}>{stage === 'CONNECT' ? '1 · CONNECT' : stage === 'CHOOSE' ? '2 · ROOM' : '3 · READY UP'}</Chip>{net && net.rtt > 0 && <Chip tone="mute">{net.rtt} MS</Chip>}</>}
    hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    {!net && <div className="lb-col wide"><Panel title="SERVER">
      {notice && <p className="lb-note warn" role="status" data-testid="lobby-notice">{notice}</p>}
      {official ? <p className="lb-note" data-testid="official-server">OFFICIAL SERVER · {DEFAULT_SERVER_URL.replace(/^wss?:\/\//, '')} <button className="text-button" onClick={() => setAdv(true)}>custom server</button></p>
        : <label className="lb-field">SERVER ADDRESS<input value={url} onChange={e => setUrl(e.target.value)} placeholder="wss://your-server.example" data-testid="server-url" spellCheck={false}/></label>}
      <label className="lb-field">DISPLAY NAME<input value={name} maxLength={24} onChange={e => setName(e.target.value.replace(/[^\w .-]/g, ''))} data-testid="player-name"/></label>
      <p className="lb-note">{ok ? `Will connect to ${ok}. Only your inputs and choices are sent; the server runs the fight and records verified results.` : 'Enter a wss:// address (ws://127.0.0.1 works for a local test server). Public hosting is up to whoever runs the server.'}</p>
      {busy && <p className="lb-note lb-wait" data-testid="waking"><i className="lb-spin" aria-hidden="true"/>Connecting. A sleeping free server can take a minute or more to wake up; please wait.</p>}
      {fail && !busy && <p className="lb-note err" role="alert" data-testid="net-error">{fail}</p>}
      <Cta onClick={() => void connect()} disabled={!ok || busy} testId="connect" sub={busy ? 'Please wait' : 'Open a connection'}>{busy ? 'CONNECTING…' : fail ? 'RETRY' : 'CONNECT'}</Cta>
    </Panel></div>}
    {net && !room && <div className="lb-col wide">
      {net.error && <p className="lb-note err" role="alert" data-testid="net-error">{net.error}</p>}
      <Panel title="YOUR RUNNER">{heroPick(h, setH, 'Hero')}</Panel>
      <div className="lb-split">
        <Panel title="CREATE A ROOM"><div className="lb-modes" role="group" aria-label="Mode">{(['classic', 'fracture_expedition', 'boss_rush'] as RoomMode[]).map(m => <Card key={m} on={mode === m} onClick={() => setMode(m)}><b>{m.replace(/_/g, ' ').toUpperCase()}</b></Card>)}</div>
          <p className="lb-note">You get a code to share with your partner.</p><Cta onClick={() => net.send({ t: 'create', hero: h, mode, arena: mode === 'fracture_expedition' ? 'aetherfall' : 'gloam' })} testId="create-room" sub="New room">CREATE ROOM</Cta></Panel>
        <Panel title="JOIN WITH A CODE"><label className="lb-field">ROOM CODE<input className="lb-code" value={code} maxLength={5} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="· · · · ·" data-testid="room-code" autoComplete="off" spellCheck={false}/></label>
          <p className="lb-note">Ask the host for their five-character code.</p><Cta onClick={() => net.send({ t: 'join', code, hero: h })} testId="join-room" disabled={code.length < 5} sub="Enter room" pad={false}>JOIN</Cta></Panel>
      </div></div>}
    {net && room && <div className="lb-col wide" data-testid="room-view">
      <Panel className="lb-roomcode"><small>SHARE THIS CODE</small><b>{room.code}</b><p className="lb-note">Mode: {room.mode.replace(/_/g, ' ').toUpperCase()}</p></Panel>
      <div className="lb-slots">{[0, 1].map(i => { const p = room.players[i]; return p ? <div key={i} className={`lb-slot ${p.ready ? 'ready' : ''}`} style={{ '--c': ACC[p.hero] } as React.CSSProperties}><span className="who"><b>{p.name}{i === room.you ? ' (you)' : ''}</b><Chip tone={!p.connected ? 'red' : p.ready ? 'gold' : 'mute'}>{!p.connected ? 'DISCONNECTED' : p.ready ? 'READY' : 'NOT READY'}</Chip></span><small>{p.hero.toUpperCase()}</small></div> : <div key={i} className="lb-slot empty"><span className="lb-wait"><i className="lb-spin" aria-hidden="true"/>Waiting for partner…</span></div>; })}</div>
      {!me?.ready && <Panel title="CHANGE RUNNER"><div className="lb-heroes" role="group" aria-label="Your hero">{HERO_IDS.map(x => <Card key={x} on={me?.hero === x} accent={ACC[x]} onClick={() => { setH(x); net.send({ t: 'ready', ready: false, hero: x }); }} testId={`room-hero-${x}`}><b>{x.toUpperCase()}</b></Card>)}</div></Panel>}
      <p className="lb-note">{room.players.length < 2 ? 'The run starts when both players are ready.' : 'Both ready starts the run.'}</p>
      <Cta onClick={() => net.send({ t: 'ready', ready: !me?.ready })} testId="ready" sub={me?.ready ? 'Press to cancel' : 'Lock in your runner'}>{me?.ready ? 'NOT READY' : 'READY'}</Cta>
    </div>}
  </Frame>;
}
