import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { GameBridge } from '../bridge/GameBridge';
import { createGame } from '../game/createGame';
import { parseSeed } from '../core/SeededRng';
import { loadSave, storeSave, type GameSettings } from '../sim/SaveSystem';
import { TitleScreen } from './ui/TitleScreen';
import { HeroSelect } from './ui/HeroSelect';
import { ArenaSelect } from './ui/ArenaSelect';
import { ARENAS, DEFAULT_ARENA, isArenaId, type ArenaId } from '../content/arenas';
import { Hud } from './ui/Hud';
import { LevelUpScreen } from './ui/LevelUpScreen';
import { PauseMenu } from './ui/PauseMenu';
import { ResultsScreen } from './ui/ResultsScreen';
import { SettingsPanel } from './ui/SettingsPanel';
import { sharedAbilityAudio } from '../game/audio/abilityAudio';
import { installUiSounds } from './uiSounds';
import { ControllerBadge } from './ui/ControllerBadge';
import { useControllerNav } from './ui/useControllerNav';
import { PadContext } from './ui/Chrome';
import { LoadingScreen } from './ui/LoadingScreen';
import './ui.css';
import './kit.css';
const initialSave = loadSave();
function GameStage({ bridge, seed, arena, pad, onHome, onSettings }: { bridge: GameBridge; seed: number; arena: ArenaId; pad: boolean; onHome: () => void; onSettings: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const snapshot = useSyncExternalStore(listener => bridge.subscribe(listener), () => bridge.snapshot());
  const [progress, setProgress] = useState(0); const [ready, setReady] = useState(false);
  useEffect(() => { const load = (e: Event) => setProgress(Math.max(0, Math.min(1, (e as CustomEvent<number>).detail))); const done = () => setReady(true); window.addEventListener('kyntraze-load', load); window.addEventListener('kyntraze-ready', done); return () => { window.removeEventListener('kyntraze-load', load); window.removeEventListener('kyntraze-ready', done); }; }, []);
  useEffect(() => {
    if (!host) return;
    const game = createGame(host, bridge, seed, arena);
    return () => { game.destroy(true); };
    // Settings are updated as menu state; effect should NOT recreate active game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, bridge, seed, arena]);
  return <div className="game-shell" data-testid="game-shell"><div className="arena-viewport" ref={setHost} aria-label="Playable Kyntraze arena"/>{ready && <Hud s={snapshot} pad={pad} onPause={() => bridge.togglePause()} reduced={bridge.getSettings().reducedEffects} onForm={(f, go) => bridge.pickForm(f, go)}/>}{!ready && <LoadingScreen progress={progress} arena={ARENAS[arena].name.toUpperCase()}/>}
    {snapshot.phase === 'upgrade' && <LevelUpScreen level={snapshot.level} reward={snapshot.rewardPick} cards={snapshot.cards} owned={snapshot.owned} onChoose={id => bridge.choose(id)} />}
    {snapshot.phase === 'paused' && <PauseMenu s={snapshot} onResume={() => bridge.togglePause()} onHome={onHome} onSettings={onSettings}/>}
    {((snapshot.phase === 'dead' && snapshot.deathShown) || (snapshot.phase === 'victory' && snapshot.victoryShown)) && <ResultsScreen s={snapshot} onRetry={() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))} onHome={onHome}/>}
  </div>;
}
export default function App() {
  const pad = useControllerNav();
  const [view, setView] = useState<'title' | 'select' | 'arena' | 'game'>('title');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  type View = 'title' | 'select' | 'arena' | 'game';
  /** Menu route change: the current screen eases out (~110 ms) and the next eases in. Input is never blocked after the swap; a second press during the exit is ignored. */
  const go = (to: View) => { if (leaving) return; if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setView(to); return; } setLeaving(true); window.setTimeout(() => { setView(to); setLeaving(false); }, 110); };
  const [save, setSave] = useState(initialSave);
  const [seedInput, setSeedInput] = useState(new URLSearchParams(window.location.search).get('seed') ?? '');
  const urlArena = new URLSearchParams(window.location.search).get('arena');
  const [arena, setArena] = useState<ArenaId>(isArenaId(urlArena) ? urlArena : initialSave.arena ?? DEFAULT_ARENA);
  const [run, setRun] = useState({ seed: 0, serial: 0, arena });
  const bridge = useMemo(() => new GameBridge(save), [run.serial]); // intentionally new per run
  const start = (same = false) => { const nextSeed = same ? run.seed : parseSeed(seedInput.trim()); setRun(s => ({ seed: nextSeed, serial: s.serial + 1, arena: same ? s.arena : arena })); setView('game'); };
  useEffect(() => { const retry = () => start(true); window.addEventListener('kyntraze-retry', retry); return () => window.removeEventListener('kyntraze-retry', retry); });
  const updateSettings = (next: GameSettings) => { bridge.setSettings(next); const updated = { ...save, settings: next }; setSave(updated); storeSave(updated); };
  const chooseArena = (id: ArenaId) => { setArena(id); const updated = { ...save, arena: id }; setSave(updated); storeSave(updated); };
  // B16 audio: unlock on the first real gesture, follow the saved mix, play the title theme outside a run (the arena scene owns the score during one)
  useEffect(() => { const a = sharedAbilityAudio(); const un = () => { void a?.unlock(); }; window.addEventListener('pointerdown', un); window.addEventListener('keydown', un); const off = installUiSounds(); return () => { window.removeEventListener('pointerdown', un); window.removeEventListener('keydown', un); off(); }; }, []);
  useEffect(() => { const a = sharedAbilityAudio(); a?.setVolumes(save.settings); a?.setMuted(save.settings.mute); }, [save.settings]);
  useEffect(() => { if (view !== 'game') sharedAbilityAudio()?.setCue('title', 1.2); }, [view]);
  const home = () => { setView('title'); setSettingsOpen(false); setSave(loadSave()); };
  return <PadContext.Provider value={pad.connected}><div className="app">
    {pad.connected && <ControllerBadge/>}
    {view === 'title' && <div className={`screen ${leaving ? 'leaving' : ''}`}><TitleScreen onPlay={() => go('select')} onSettings={() => setSettingsOpen(true)} save={save}/></div>}
    {view === 'select' && <div className={`screen ${leaving ? 'leaving' : ''}`}><HeroSelect onBack={() => go('title')} onStart={() => start()} seed={seedInput} onSeed={setSeedInput} arena={arena} onArena={() => go('arena')} save={save}/></div>}
    {view === 'arena' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ArenaSelect selected={arena} onSelect={chooseArena} onBack={() => go('select')}/></div>}
    {view === 'game' && <GameStage key={run.serial} bridge={bridge} seed={run.seed} arena={run.arena} pad={pad.connected} onHome={home} onSettings={() => setSettingsOpen(true)}/>}
    {settingsOpen && <SettingsPanel settings={save.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)}/>}
  </div></PadContext.Provider>;
}
