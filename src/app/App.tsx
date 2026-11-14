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
import './App.css';
const initialSave = loadSave();
function GameStage({ bridge, seed, onHome, onSettings }: { bridge: GameBridge; seed: number; onHome: () => void; onSettings: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const snapshot = useSyncExternalStore(listener => bridge.subscribe(listener), () => bridge.snapshot());
  useEffect(() => {
    if (!host) return;
    const game = createGame(host, bridge, seed);
    return () => { game.destroy(true); };
    // Settings are updated as menu state; effect should NOT recreate active game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, bridge, seed]);
  return <div className="game-shell" data-testid="game-shell"><div className="arena-viewport" ref={setHost} aria-label="Playable Kyntraze arena"/><Hud s={snapshot} onPause={() => bridge.togglePause()}/>
    {snapshot.phase === 'upgrade' && <LevelUpScreen level={snapshot.level} offers={snapshot.offers} onChoose={id => bridge.choose(id)} />}
    {snapshot.phase === 'paused' && <PauseMenu onResume={() => bridge.togglePause()} onHome={onHome} onSettings={onSettings}/>}
    {snapshot.phase === 'dead' && snapshot.deathShown && <ResultsScreen s={snapshot} onRetry={() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))} onHome={onHome}/>}
  </div>;
}
export default function App() {
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
  return <div className="app">
    {view === 'title' && <TitleScreen onPlay={() => setView('select')} onSettings={() => setSettingsOpen(true)} save={save}/>}
    {view === 'select' && <HeroSelect onBack={() => setView('title')} onStart={() => start()} seed={seedInput} onSeed={setSeedInput}/>}
    {view === 'game' && <GameStage key={run.serial} bridge={bridge} seed={run.seed} onHome={home} onSettings={() => setSettingsOpen(true)}/>}
    {settingsOpen && <SettingsPanel settings={save.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)}/>}
  </div>;
}
