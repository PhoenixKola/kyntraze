import { useEffect, useState } from 'react';
import { NetClient } from '../../net/RemoteSimulation';
import type { HeroId } from '../../content/heroes';
import { HERO_IDS } from '../../content/heroes';
import { safeServerUrl } from '../../b22/save';
import type { RoomMode } from '../../net/protocol';
import { Card, Chip, Cta, Frame, Panel } from './b29/Kit';
import { HeroSprite } from './HeroSprite';
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
  const them = room ? room.players.find((_, i) => i !== room.you) : undefined;
  const station = (side: 'l' | 'r', who: { name: string; hero: HeroId; ready?: boolean; connected?: boolean } | null, label: string) => <div className={`lb-station ${side} ${who ? '' : 'empty'}`} style={who ? { '--c': ACC[who.hero] } as React.CSSProperties : undefined} data-testid={`station-${side}`}>
    {who ? <HeroSprite hero={who.hero} k={1.35} flip={side === 'r'}/> : <span className="lb-ghost" aria-hidden="true"/>}
    <span className="lb-plate"><b>{who ? who.name : 'Open seat'}</b><small>{who ? `${who.hero.charAt(0).toUpperCase() + who.hero.slice(1)}${room ? (who.connected === false ? ' · disconnected' : who.ready ? ' · ready' : ' · getting ready') : ''}` : label}</small></span></div>;
  const mine = me ? { name: me.name, hero: me.hero, ready: me.ready, connected: me.connected } : { name: name || 'You', hero: h };
  return <Frame testId="online-lobby" className="b29-lobby" eyebrow="ONLINE CO-OP · ALLIANCE CHAMBER" title={room ? `Room ${room.code}` : 'Fight together'} sub={room ? 'Share the code, pick your runner, then ready up.' : 'Team up with a friend over the internet.'} onBack={leave} bg="art/menu/alliance.webp" lit
    right={<><Chip tone={stage === 'ROOM' ? 'gold' : 'teal'}>{stage === 'CONNECT' ? 'Step 1 · Say hello' : stage === 'CHOOSE' ? 'Step 2 · Host or join' : 'Step 3 · Ready up'}</Chip>{net && net.rtt > 0 && <Chip tone="mute">{net.rtt} ms</Chip>}</>}
    hints={[{ key: 'ENTER', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    {station('l', stage === 'CONNECT' || stage === 'CHOOSE' ? { name: name || 'You', hero: h } : mine, 'You')}
    <div className="lb-center">
    {!net && <Panel title="Welcome to the alliance" className="lb-card">
      {notice && <p className="lb-note warn" role="status" data-testid="lobby-notice">{notice}</p>}
      <p className="lb-lead">Two runners, one fight. Choose a name and we will find the room for you to host or join.</p>
      <label className="lb-field">Your name<input value={name} maxLength={24} onChange={e => setName(e.target.value.replace(/[^\w .-]/g, ''))} data-testid="player-name"/></label>
      {busy && <p className="lb-note lb-wait" data-testid="waking"><i className="lb-spin" aria-hidden="true"/>Reaching the alliance. If the server was asleep this can take a minute or more.</p>}
      {fail && !busy && <p className="lb-note err" role="alert" data-testid="net-error"><b>We could not connect.</b> {fail}. Check your internet and try again.</p>}
      <Cta onClick={() => void connect()} disabled={!ok || busy} testId="connect" sub={busy ? 'One moment' : 'Connect to the alliance'}>{busy ? 'CONNECTING…' : fail ? 'TRY AGAIN' : 'FIND A PARTNER'}</Cta>
      <details className="lb-adv" open={!official}><summary>Advanced: server</summary>
        {official ? <p className="lb-note" data-testid="official-server">Using the official server ({DEFAULT_SERVER_URL.replace(/^wss?:\/\//, '')}). <button type="button" className="text-button" onClick={() => setAdv(true)}>Use a custom server</button></p>
          : <label className="lb-field">Server address<input value={url} onChange={e => setUrl(e.target.value)} placeholder="wss://your-server.example" data-testid="server-url" spellCheck={false}/></label>}
        <p className="lb-note">{ok ? `Connects to ${ok}. Only your inputs and choices are sent; the server runs the fight and records verified results.` : 'Enter a wss:// address (ws://127.0.0.1 works for a local test server).'}</p></details>
    </Panel>}
    {net && !room && <Panel title="Pick your runner, then host or join" className="lb-card">
      {net.error && <p className="lb-note err" role="alert" data-testid="net-error">{net.error}</p>}
      {heroPick(h, setH, 'Hero')}
      <div className="lb-split">
        <div className="lb-half"><h4>Host a game</h4><div className="lb-modes" role="group" aria-label="Mode">{(['classic', 'fracture_expedition', 'boss_rush'] as RoomMode[]).map(m => <Card key={m} on={mode === m} onClick={() => setMode(m)}><b>{m === 'classic' ? 'Classic' : m === 'boss_rush' ? 'Boss Rush' : 'Fracture Expedition'}</b></Card>)}</div>
          <p className="lb-note">You get a code to share with your friend.</p><Cta onClick={() => net.send({ t: 'create', hero: h, mode, arena: mode === 'fracture_expedition' ? 'aetherfall' : 'gloam' })} testId="create-room" sub="Get a room code">HOST A GAME</Cta></div>
        <div className="lb-half"><h4>Join a friend</h4><label className="lb-field">Room code<input className="lb-code" value={code} maxLength={5} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="· · · · ·" data-testid="room-code" autoComplete="off" spellCheck={false}/></label>
          <p className="lb-note">{code.length < 5 ? 'Enter the five-character code your friend shares.' : 'Ready to join.'}</p><Cta onClick={() => net.send({ t: 'join', code, hero: h })} testId="join-room" disabled={code.length < 5} sub={code.length < 5 ? `${5 - code.length} more characters` : 'Enter the room'} pad={false}>JOIN</Cta></div>
      </div></Panel>}
    {net && room && <Panel title="Your alliance" className="lb-card" data-testid="room-view">
      <div className="lb-roomcode"><small>Room code</small><b>{room.code}</b><button type="button" className="text-button" onClick={() => void navigator.clipboard?.writeText(room.code)} data-testid="copy-code">Copy</button></div>
      <p className="lb-note">{room.mode === 'classic' ? 'Classic' : room.mode === 'boss_rush' ? 'Boss Rush' : 'Fracture Expedition'} · {room.players.length < 2 ? 'Waiting for your partner to join with the code.' : them?.ready ? 'Your partner is ready.' : 'Your partner is getting ready.'}</p>
      {!me?.ready && <div className="lb-heroes" role="group" aria-label="Your hero">{HERO_IDS.map(x => <Card key={x} on={me?.hero === x} accent={ACC[x]} onClick={() => { setH(x); net.send({ t: 'ready', ready: false, hero: x }); }} testId={`room-hero-${x}`}><b>{x.charAt(0).toUpperCase() + x.slice(1)}</b></Card>)}</div>}
      <Cta onClick={() => net.send({ t: 'ready', ready: !me?.ready })} testId="ready" sub={me?.ready ? 'Press to cancel' : room.players.length < 2 ? 'You can ready up while you wait' : 'Lock in your runner'}>{me?.ready ? 'NOT READY' : 'READY'}</Cta>
    </Panel>}
    </div>
    {station('r', room && them ? { name: them.name, hero: them.hero, ready: them.ready, connected: them.connected } : null, room ? 'Waiting for a partner' : 'Your partner will stand here')}
  </Frame>;
}
