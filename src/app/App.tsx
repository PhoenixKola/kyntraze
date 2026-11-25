import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { GameBridge } from '../bridge/GameBridge';
import { createGame } from '../game/createGame';
import { parseSeed } from '../core/SeededRng';
import { loadSave, storeSave, type GameSettings, type SaveV1 } from '../sim/SaveSystem';
import { TitleScreen } from './ui/TitleScreen';
import { HeroSelect } from './ui/HeroSelect';
import { ArenaSelect } from './ui/ArenaSelect';
import type { HeroId } from '../content/heroes';
import { ARENAS, DEFAULT_ARENA, isArenaId, type ArenaId } from '../content/arenas';
import { Hud } from './ui/Hud';
import { LevelUpScreen } from './ui/LevelUpScreen';
import { PauseMenu } from './ui/PauseMenu';
import { AscensionPicker } from './ui/AscensionPicker';
import { ModeSelect, type ModeChoice } from './ui/ModeSelect';
import { OnlineLobby } from './ui/OnlineLobby';
import { ArchivesScreen } from './ui/ArchivesScreen';
import type { NetClient } from '../net/RemoteSimulation';
import { migrateB22 } from '../b22/save';
import { CLASSIC_ARENAS, REALM_ARENAS } from '../content/arenas';
import { planFor, type RunPlan } from '../b22/plan';
import { dailyChallenge, weeklyChallenge } from '../b22/challenges';
import type { RelicId } from '../b22/relics';
import { StoryPanel } from './ui/StoryPanel';
import { chapterStory, type StoryBeat } from '../b22/story';
import { ResultsScreen, type ChronResult } from './ui/ResultsScreen';
import { ChroniclesScreen } from './ui/ChroniclesScreen';
import { CHRONICLE_BY_ID, nextChronicle, type ChronicleId } from '../b31/chronicles';
import { SettingsPanel } from './ui/SettingsPanel';
import { ProgressionScreen, type ProgressTab } from './ui/ProgressionScreen';
import { sharedAbilityAudio } from '../game/audio/abilityAudio';
import { installUiSounds } from './uiSounds';
import { ControllerBadge } from './ui/ControllerBadge';
import { useControllerNav } from './ui/useControllerNav';
import { PadContext } from './ui/Chrome';
import { LoadingScreen } from './ui/LoadingScreen';
import './ui.css';
import { keyHint } from './keyHint';
import { NexusHub, type NexusDest } from './ui/NexusHub';
import './nexus.css';
import './b29.css';
import './b29-hero-mode.css';
import './b29-arena-online.css';
import './b29-archives.css';
import './b29-title.css';
import './b29-1-hero.css';
import './b29-1-mode.css';
import './b29-1-arena.css';
import './b29-1-lobby.css';
import './b29-1-vault.css';
import './b30.css';
import './kit.css';
import './b30-1.css';
import './b30-1-loading.css';
import './b30-1-hud.css';
import './b30-2.css';
import './b31.css';
const initialSave = loadSave();
interface RunSetup { net?: NetClient; coop?: HeroId; plan: RunPlan | null; challengeId?: string; startRelic?: RelicId | null; hero?: HeroId }
function GameStage({ bridge, seed, arena, pad, onHome: leaveToTitle, onLobby, onProgress, onSettings, outro, chronId, onChronNext, onChronMap, onOutroSeen }: { chronId?: ChronicleId | null; onChronNext?: (id: ChronicleId) => void; onChronMap?: () => void; onOutroSeen?: () => void; onLobby: () => void; outro?: StoryBeat; bridge: GameBridge; seed: number; arena: ArenaId; pad: boolean; onHome: () => void; onProgress: () => void; onSettings: () => void }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const snapshot = useSyncExternalStore(listener => bridge.subscribe(listener), () => bridge.snapshot());
  const [outroSeen, setOutroSeen] = useState(false);
  const onHome = () => { bridge.getNet()?.close(); leaveToTitle(); };
  useEffect(() => { const net = bridge.getNet(); if (!net) return; return net.on(() => { if (net.partnerLeft) { net.close(); onLobby(); } }); });
  const [progress, setProgress] = useState(0); const [ready, setReady] = useState(false);
  useEffect(() => { const load = (e: Event) => setProgress(Math.max(0, Math.min(1, (e as CustomEvent<number>).detail))); const done = () => setReady(true); window.addEventListener('kyntraze-load', load); window.addEventListener('kyntraze-ready', done); return () => { window.removeEventListener('kyntraze-load', load); window.removeEventListener('kyntraze-ready', done); }; }, []);
  useEffect(() => {
    if (!host) return;
    const game = createGame(host, bridge, seed, arena);
    return () => { game.destroy(true); };
    // Settings are updated as menu state; effect should NOT recreate active game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, bridge, seed, arena]);
  const chron: ChronResult | undefined = chronId && (snapshot.phase === 'victory' || snapshot.phase === 'dead') ? (() => { const c = CHRONICLE_BY_ID[chronId], sv = loadSave(), nx = snapshot.phase === 'victory' ? nextChronicle({ chronicles: sv.b22?.chronicles, story: { done: sv.b22?.story?.done ?? [] } }, chronId) : null; return { kicker: c.kicker, name: c.name, reward: bridge.firstClearMarks(), onNext: nx && onChronNext ? () => onChronNext(nx) : undefined, nextLabel: nx === 'finale' ? 'THE FINALE' : 'NEXT CHAPTER', onMap: () => onChronMap?.() }; })() : undefined;
  const hint = (slot: Parameters<typeof keyHint>[0]) => keyHint(slot, { pad, chooser: snapshot.party?.chooser ?? 0, coop: !!snapshot.party && !bridge.getNet() });
  return <div className="game-shell" data-testid="game-shell"><div className="arena-viewport" ref={setHost} aria-label="Playable Kyntraze arena"/>{ready && <Hud s={snapshot} pad={pad} onPause={() => bridge.togglePause()} reduced={bridge.getSettings().reducedEffects} onForm={(f, go) => bridge.pickForm(f, go)} onKey={code => bridge.pressKey(code)}/>}{!ready && <LoadingScreen objective={chronId ? CHRONICLE_BY_ID[chronId].objective : undefined} progress={progress} arena={ARENAS[arena].name.toUpperCase()} arenaId={arena} hero={bridge.loadingHeroes().hero} boon={snapshot.boon} contract={snapshot.contract} seed={snapshot.seed} partner={bridge.loadingHeroes().partner}/>}
    {(snapshot.phase === 'upgrade' || snapshot.phase === 'extract') && snapshot.asc && (snapshot.asc.branch || snapshot.asc.relics || snapshot.asc.extract) && <AscensionPicker branchKey={snapshot.asc.branch ? hint(snapshot.asc.branch.slot) : null} asc={snapshot.asc} onBranch={id => bridge.chooseBranch(id)} onRelic={id => bridge.chooseRelic(id)} onExtract={() => bridge.extract()} onPushOn={() => bridge.pushOn()}/>}
    {snapshot.phase === 'upgrade' && !(snapshot.asc?.branch || snapshot.asc?.relics) && snapshot.cards.length === 0 && !snapshot.asc?.legend && <div className="overlay lv-overlay" data-testid="waiting-pick"><section className="lv-modal" role="status"><header className="lv-head"><div><p className="eyebrow">CO-OP</p><h2>YOUR PARTNER IS CHOOSING</h2></div></header></section></div>}
    {snapshot.phase === 'upgrade' && !(snapshot.asc?.branch || snapshot.asc?.relics) && (snapshot.cards.length > 0 || !!snapshot.asc?.legend) && <LevelUpScreen key={`${snapshot.party?.chooser ?? 'solo'}|${snapshot.level}|${snapshot.cards.map(c => c.id).join(',')}`} hint={hint} legend={snapshot.asc?.legend ?? null} onLegend={id => bridge.chooseLegendary(id)} level={snapshot.level} reward={snapshot.rewardPick} cards={snapshot.cards} owned={snapshot.owned} onChoose={id => bridge.choose(id)} rerolls={snapshot.rerolls} banishes={snapshot.banishes} onReroll={() => bridge.reroll()} onBanish={id => bridge.banish(id)} />}
    {snapshot.phase === 'paused' && <PauseMenu s={snapshot} online={!!bridge.getNet()} onResume={() => bridge.togglePause()} onHome={onHome} onSettings={onSettings}/>}
    {outro && !outroSeen && snapshot.phase === 'victory' && snapshot.victoryShown && <StoryPanel beat={outro} onDone={() => { setOutroSeen(true); onOutroSeen?.(); }}/>}
    {(!outro || outroSeen || snapshot.phase !== 'victory') && ((snapshot.phase === 'dead' && snapshot.deathShown) || (snapshot.phase === 'victory' && snapshot.victoryShown)) && <ResultsScreen s={snapshot} onRetry={() => window.dispatchEvent(new CustomEvent('kyntraze-retry'))} onHome={onHome} onProgress={onProgress} onEndless={() => bridge.continueEndless()} chron={chron}/>}
  </div>;
}
export default function App() {
  const pad = useControllerNav();
  const [view, setView] = useState<'title' | 'select' | 'arena' | 'progress' | 'game' | 'mode' | 'online' | 'archives' | 'nexus' | 'chronicles'>('title');
  const [mode, setMode] = useState<ModeChoice>({ id: 'classic' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaving, setLeaving] = useState(false); const [veil, setVeil] = useState(false); const [lobbyNote, setLobbyNote] = useState('');
  type View = 'title' | 'select' | 'arena' | 'progress' | 'game' | 'mode' | 'online' | 'archives' | 'nexus' | 'chronicles';
  /** the screen the player opened from the Fracture Nexus: its BACK returns to the hub instead of its usual parent */
  const [hubEntry, setHubEntry] = useState<View | null>(null);
  /** Menu route change: the current screen eases out (~110 ms) and the next eases in. Input is never blocked after the swap; a second press during the exit is ignored. */
  const go = (to: View) => { if (leaving) return; if (to === 'nexus' || to === 'title') { /* back at the hub or title: the hub-entry shortcut is spent */ } if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setView(to); return; } setLeaving(true); window.setTimeout(() => { setView(to); setLeaving(false); }, 110); };
  const [save, setSave] = useState(initialSave);
  const [seedInput, setSeedInput] = useState(new URLSearchParams(window.location.search).get('seed') ?? '');
  const urlArena = new URLSearchParams(window.location.search).get('arena');
  const [arena, setArena] = useState<ArenaId>(isArenaId(urlArena) ? urlArena : initialSave.arena ?? DEFAULT_ARENA);
  const [run, setRun] = useState<{ seed: number; serial: number; arena: ArenaId; setup: RunSetup }>({ seed: 0, serial: 0, arena, setup: { plan: null } });
  const bridge = useMemo(() => { const base = run.serial === 0 ? save : loadSave(); const b = new GameBridge(run.setup.hero ? { ...base, hero: run.setup.hero } : base); if (run.setup.coop) b.setCoop(run.setup.coop); if (run.setup.net) b.setNet(run.setup.net); if (run.setup.plan) b.setMode(run.setup.plan, { startRelic: run.setup.startRelic, challengeId: run.setup.challengeId, hero: run.setup.hero }); return b; }, [run.serial]); // intentionally new per run
  const allowedArenas = mode.id === 'classic' ? CLASSIC_ARENAS : mode.id === 'fracture_expedition' ? REALM_ARENAS : undefined;
  const modeName = mode.id === 'boss_rush' ? `BOSS RUSH · ${mode.track ?? 'initiation'}${mode.practice ? ' (PRACTICE)' : ''}`.toUpperCase().replace(/_/g, ' ') : mode.id === 'vex_trial' ? `VEX TRIAL · CH ${mode.chapter ?? 1}` : mode.id.replace(/_/g, ' ').toUpperCase();
  const lockedHero = mode.id === 'vex_trial' ? 'vex' as HeroId : null;
  const [story, setStory] = useState<StoryBeat | null>(null);
  const [chronId, setChronId] = useState<ChronicleId | null>(null);
  const [scene, setScene] = useState<{ beat: StoryBeat; after?: () => void } | null>(null);
  /** B31A: scene playback is recorded against a FRESH read of the save (the run writes completion to storage while this component's copy is older). */
  const markSeen = (id: ChronicleId, part: 'intro' | 'outro') => { const cur = loadSave(), b = migrateB22(cur.b22), sid = `${id}.${part}`; if (b.chronicles.seen.includes(sid)) return; const u = { ...cur, b22: { ...b, chronicles: { ...b.chronicles, seen: [...b.chronicles.seen, sid] } } }; storeSave(u); setSave(u); };
  const startChronicle = (id: ChronicleId, intro = true) => {
    const c = CHRONICLE_BY_ID[id];
    const launch = () => { markSeen(id, 'intro'); setScene(null); setChronId(id); setRun(r => ({ seed: parseSeed(''), serial: r.serial + 1, arena: c.arena, setup: { plan: c.plan, hero: c.plan.heroLock ?? save.hero ?? 'kai' } })); setView('game'); };
    if (intro) setScene({ beat: c.intro, after: launch }); else launch();
  };
  useEffect(() => { if (view !== 'nexus') return; const cur = loadSave(), b = migrateB22(cur.b22), u = { ...cur, b22: { ...b, chronicles: { ...b.chronicles, visits: b.chronicles.visits + 1 } } }; storeSave(u); setSave(u); }, [view]);
  const start = (same = false, skipStory = false) => {
    const ch = mode.id === 'vex_trial' ? chapterStory(mode.chapter ?? 1) : undefined;
    if (ch && !same && !skipStory) { setStory(ch.intro); return; }
    if (same) { setRun(s => ({ ...s, serial: s.serial + 1 })); setView('game'); return; }
    setChronId(null);
    const now = Date.now(); let setup: RunSetup = { plan: null }, nextArena = arena, nextSeed = parseSeed(seedInput.trim());
    if (mode.id === 'daily_challenge' || mode.id === 'weekly_challenge') { const ch = mode.id === 'daily_challenge' ? dailyChallenge(now) : weeklyChallenge(now); setup = { plan: ch.plan, challengeId: ch.id, startRelic: ch.startRelic, hero: ch.hero ?? undefined }; nextArena = ch.arena; nextSeed = ch.seed; }
    else if (mode.id !== 'classic') { const a = mode.id === 'fracture_expedition' && !REALM_ARENAS.includes(arena) ? REALM_ARENAS[0] : arena; nextArena = mode.id === 'vex_trial' ? planFor('vex_trial', { chapter: mode.chapter ?? 1 }).arena ?? arena : a; setup = { plan: planFor(mode.id, { arena: nextArena, track: mode.track, chapter: mode.chapter, practice: mode.practice }), hero: lockedHero ?? undefined }; }
    else if (!CLASSIC_ARENAS.includes(arena)) nextArena = CLASSIC_ARENAS[0];
    setup = { ...setup, coop: mode.coop }; setRun(s => ({ seed: nextSeed, serial: s.serial + 1, arena: nextArena, setup })); setView('game');
  };
  const outro = mode.id === 'vex_trial' ? chapterStory(mode.chapter ?? 1)?.outro : undefined;
  useEffect(() => { const retry = () => start(true); window.addEventListener('kyntraze-retry', retry); return () => window.removeEventListener('kyntraze-retry', retry); });
  const updateSettings = (next: GameSettings) => { bridge.setSettings(next); const updated = { ...save, settings: next }; setSave(updated); storeSave(updated); };
  const chooseHero = (id: HeroId) => { const updated = { ...save, hero: id }; setSave(updated); storeSave(updated); };
  const chooseArena = (id: ArenaId) => { setArena(id); const updated = { ...save, arena: id }; setSave(updated); storeSave(updated); };
  // B16 audio: unlock on the first real gesture, follow the saved mix, play the title theme outside a run (the arena scene owns the score during one)
  useEffect(() => { const a = sharedAbilityAudio(); const un = () => { void a?.unlock(); }; window.addEventListener('pointerdown', un); window.addEventListener('keydown', un); const off = installUiSounds(); return () => { window.removeEventListener('pointerdown', un); window.removeEventListener('keydown', un); off(); }; }, []);
  useEffect(() => { const a = sharedAbilityAudio(); a?.setVolumes(save.settings); a?.setMuted(save.settings.mute); }, [save.settings]);
  useEffect(() => { if (view !== 'game' && view !== 'nexus') sharedAbilityAudio()?.setCue('title', 1.2); }, [view]);
  const [progTab, setProgTab] = useState<ProgressTab>('armory'); const [progFrom, setProgFrom] = useState<'title' | 'select' | 'nexus'>('title');
  /** Meta changes (purchase / equip / contract) are saved at once and survive navigation, reload and retries. */
  const updateMeta = (meta: SaveV1['meta']) => { const updated = { ...save, meta }; setSave(updated); storeSave(updated); };
  const openProgress = (from: 'title' | 'select' | 'nexus', tab: ProgressTab = 'armory') => { setProgFrom(from); setProgTab(tab); setSave(loadSave()); go('progress'); };
  const home = () => { setHubEntry(null); setView('nexus'); setSettingsOpen(false); setSave(loadSave()); };
  const nexusGo = (d: NexusDest) => {
    if (d === 'title') { setHubEntry(null); go('title'); return; }
    if (d === 'deploy') { setVeil(true); window.setTimeout(() => setVeil(false), 900); start(); return; }
    if (d === 'settings') { setSettingsOpen(true); return; }
    if (d === 'armory' || d === 'contracts' || d === 'records') { setHubEntry('progress'); openProgress('nexus', d === 'records' ? 'archives' : d); return; }
    if (d === 'chronicles') { setHubEntry('chronicles'); setSave(loadSave()); go('chronicles'); return; }
    const to: View = d === 'heroes' ? 'select' : d === 'modes' ? 'mode' : d === 'online' ? 'online' : 'archives'; setHubEntry(to); go(to);
  };
  const back = (view: View, fallback: View) => () => { if (hubEntry === view) { setHubEntry(null); go('nexus'); } else go(fallback); };
  return <PadContext.Provider value={pad.connected}><div className="app">
    {pad.connected && <ControllerBadge/>}
    {view === 'title' && <div className={`screen ${leaving ? 'leaving' : ''}`}><TitleScreen onArchives={() => go('archives')} onPlay={() => { setHubEntry(null); go('nexus'); }} onSettings={() => setSettingsOpen(true)} onProgress={() => openProgress('title')} save={save}/></div>}
    {view === 'nexus' && <div className={`screen ${leaving ? 'leaving' : ''}`}><NexusHub save={save} hero={save.hero ?? 'kai'} arenaName={ARENAS[arena].name.toUpperCase()} modeName={modeName} onHero={chooseHero} onGo={nexusGo}/></div>}
    {view === 'chronicles' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ChroniclesScreen save={save} onBack={() => { if (scene) return; setHubEntry(null); go('nexus'); }} onBegin={id => startChronicle(id)} onScene={(beat, id, part) => { markSeen(id, part); setScene({ beat }); }}/></div>}
    {view === 'mode' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ModeSelect choice={mode} onChoose={c => { setMode(c); if (c.id === 'fracture_expedition' && !REALM_ARENAS.includes(arena)) chooseArena(REALM_ARENAS[0]); if (c.id === 'classic' && !CLASSIC_ARENAS.includes(arena)) chooseArena(CLASSIC_ARENAS[0]); }} onBack={back('mode', 'select')} onOnline={() => go('online')} save={save}/></div>}
    {view === 'archives' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ArchivesScreen save={save} onBack={back('archives', 'title')} onSave={b => { const u = { ...save, b22: b }; setSave(u); storeSave(u); }}/></div>}
    {view === 'online' && <div className={`screen ${leaving ? 'leaving' : ''}`}><OnlineLobby notice={lobbyNote} savedUrl={save.b22?.server.url ?? ''} savedName={save.b22?.server.name ?? ''} hero={save.hero ?? 'kai'} onSaveServer={(url, name) => { const b = migrateB22(save.b22); const u = { ...save, b22: { ...b, server: { url, name } } }; setSave(u); storeSave(u); }} onBack={back('online', 'mode')} onStart={net => { setRun(r => ({ seed: 1, serial: r.serial + 1, arena: (net.room?.arena as ArenaId) ?? 'gloam', setup: { plan: null, net } })); setView('game'); }}/></div>}
    {view === 'select' && <div className={`screen ${leaving ? 'leaving' : ''}`}><HeroSelect modeName={modeName} onMode={() => go('mode')} locked={lockedHero ? 'HERO LOCKED: VEX' : mode.id === 'daily_challenge' || mode.id === 'weekly_challenge' ? 'ARENA / SEED SET BY THE CHALLENGE' : null} hero={lockedHero ?? save.hero ?? 'kai'} onHero={chooseHero} onBack={back('select', 'nexus')} onStart={() => start()} seed={seedInput} onSeed={setSeedInput} arena={arena} onArena={() => go('arena')} onProgress={tab => openProgress('select', tab)} save={save}/></div>}
    {view === 'progress' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ProgressionScreen vexForms={save.b22?.vexForms ?? [false, false]} meta={save.meta} unlocks={{ cometheart: !!save.unlocks?.cometheart, stillfire: !!save.unlocks?.stillfire, ren: !!save.unlocks?.ren, sora: !!save.unlocks?.sora }} tab={progTab} onTab={setProgTab} onMeta={updateMeta} onBack={() => { if (progFrom === 'nexus') setHubEntry(null); go(progFrom); }} onDeploy={progFrom === 'select' ? () => start() : undefined}/></div>}
    {view === 'arena' && <div className={`screen ${leaving ? 'leaving' : ''}`}><ArenaSelect selected={arena} onSelect={chooseArena} onBack={() => go('select')} allowed={allowedArenas} onSwitchMode={(m, a) => { setMode({ id: m }); chooseArena(a); }}/></div>}
    {view === 'game' && <GameStage chronId={chronId} onChronNext={id => startChronicle(id)} onChronMap={() => { setHubEntry('chronicles'); setSave(loadSave()); setView('chronicles'); }} onOutroSeen={() => chronId && markSeen(chronId, 'outro')} outro={chronId ? CHRONICLE_BY_ID[chronId].outro : run.setup.plan?.mode === 'vex_trial' ? outro : undefined} key={run.serial} bridge={bridge} seed={run.seed} arena={run.arena} pad={pad.connected} onHome={home} onLobby={() => { setLobbyNote('Your partner left the run. Create or join a room to play again.'); setView('online'); }} onProgress={() => { setSave(loadSave()); setProgFrom('select'); setProgTab('armory'); setView('progress'); }} onSettings={() => setSettingsOpen(true)}/>}
    {veil && <div className="nx-veil" aria-hidden="true"/>}
    {scene && <StoryPanel beat={scene.beat} doneLabel={scene.after ? 'BEGIN' : 'CLOSE'} onDone={() => { if (scene.after) scene.after(); else setScene(null); }}/>}
    {story && <StoryPanel beat={story} doneLabel="BEGIN" onDone={() => { setStory(null); start(false, true); }}/>}
    {settingsOpen && <SettingsPanel settings={save.settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)}/>}
  </div></PadContext.Provider>;
}
