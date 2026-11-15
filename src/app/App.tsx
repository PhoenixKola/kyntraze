import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { GameBridge } from '../bridge/GameBridge';
import { createGame } from '../game/createGame';
import { parseSeed } from '../core/SeededRng';
import { loadSave, storeSave, type GameSettings } from '../sim/SaveSystem';
import { TitleScreen } from './ui/TitleScreen';
import { HeroSelect } from './ui/HeroSelect';
import { Hud } from './ui/Hud';
import { LevelUpScreen } from './ui/LevelUpScreen';
import { PauseMenu } from './ui/PauseMenu';
import { ResultsScreen } from './ui/ResultsScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { ControllerBadge } from './ui/ControllerBadge';
import { useControllerNav } from './ui/useControllerNav';
import { PadContext } from './ui/Chrome';
import { LoadingScreen } from './ui/LoadingScreen';
import './ui.css';
const initialSave = loadSave();
function GameStage({ bridge, seed, pad, onHome, onSettings }: { bridge: GameBridge; seed: number; pad: boolean; onHome: () => void; onSettings: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const snapshot = useSyncExternalStore(listener => bridge.subscribe(listener), () => bridge.snapshot());
  const [progress, setProgress] = useState(0); const [ready, setReady] = useState(false);
  useEffect(() => { const load = (e: Event) => setProgress(Math.max(0, Math.min(1, (e as CustomEvent<number>).detail))); const done = () => setReady(true); window.addEventListener('kyntraze-load', load); window.addEventListener('kyntraze-ready', done); return () => { window.removeEventListener('kyntraze-load', load); window.removeEventListener('kyntraze-ready', done); }; }, []);
  useEffect(() => {
    if (!host) return;
    const game = createGame(host, bridge, seed);
    return () => { game.destroy(true); };
    // Settings are updated as menu state; effect should NOT recreate active game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, bridge, seed]);
  return <div className="game-shell" data-testid="game-shell"><div className="arena-viewport" ref={setHost} aria-label="Playable Kyntraze arena"/>{ready && <Hud s={snapshot} pad={pad} onPause={() => bridge.togglePause()}/>}{!ready && <LoadingScreen progress={progress}/>}
    {snapshot.phase === 'upgrade' && <LevelUpScreen level={snapshot.level} offers={snapshot.offers} onChoose={id => bridge.choose(id)} />}
    {snapshot.phase === 'paused' && <PauseMenu s={snapshot} onResume={() => bridge.togglePause()} onHome={onHome} onSettings={onSettings}/>}
    {snapshot.phase === 'dead' && snapshot.deathShown && <ResultsScreen s={snapshot} onRetry={() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))} onHome={onHome}/>}
  </div>;
}
export default function App() {
  const pad = useControllerNav();
  const [view, setView] = useState<'title' | 'select' | 'game'>('title');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [save, setSave] = useState(initialSave);
  const [seedInput, setSeedInput] = useState(new URLSearchParams(window.location.search).get('seed') ?? '');
  const [run, setRun] = useState({ seed: 0, serial: 0 });
  const bridge = useMemo(() => new GameBridge(save), [run.serial]); // intentionally new per run
  const start = (same = false) => { const nextSeed = same ? run.seed : parseSeed(seedInput.trim()); setRun(s => ({ seed: nextSeed, serial: s.serial + 1 })); setView('game'); };
  useEffect(() => { const retry = () => start(true); window.addEventListener('kyntraze-retry', retry); return () => window.removeEventListener('kyntraze-retry', retry); });
  const updateSettings = (next: GameSettings) => { bridge.setSettings(next); const updated = { ...save, settings: next }; setSave(updated); storeSave(updated); };
  const home = () => { setView('title'); setSettingsOpen(false); setSave(loadSave()); };
  return <PadContext.Provider value={pad.connected}><div className="app">
    {pad.connected && <ControllerBadge/>}
    {view === 'title' && <TitleScreen onPlay={() => setView('select')} onSettings={() => setSettingsOpen(true)} save={save}/>}
    {view === 'select' && <HeroSelect onBack={() => setView('title')} onStart={() => start()} seed={seedInput} onSeed={setSeedInput}/>}
    {view === 'game' && <GameStage key={run.serial} bridge={bridge} seed={run.seed} pad={pad.connected} onHome={home} onSettings={() => setSettingsOpen(true)}/>}
    {settingsOpen && <SettingsPanel settings={save.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)}/>}
  </div></PadContext.Provider>;
}
