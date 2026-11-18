import { useEffect, useState } from 'react';
import type { SaveV1 } from '../../sim/SaveSystem';
import { BOSS_RUSH_TRACKS, type BossRushTrack, type RunModeId } from '../../b22/plan';
import { dailyChallenge, weeklyChallenge, untilReset, MODIFIER_BY_ID } from '../../b22/challenges';
import { ARENAS } from '../../content/arenas';
import { HintBar } from './Chrome';
import { recordKey } from '../../b22/save';

import { HERO_IDS, type HeroId } from '../../content/heroes';
export interface ModeChoice { id: RunModeId; track?: BossRushTrack; chapter?: 1 | 2 | 3; practice?: boolean; /** B22.6 local couch co-op: the partner's hero (undefined = solo) */ coop?: HeroId }
interface Props { onOnline?: () => void; choice: ModeChoice; onChoose: (c: ModeChoice) => void; onBack: () => void; save: SaveV1; now?: number }
const fmt = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
const MODES: { id: RunModeId; name: string; blurb: string; length: string; ranked: string }[] = [
  { id: 'classic', name: 'CLASSIC', blurb: 'The original campaign: the Fracture Warden at 8:00, the Null Seraph at 15:00.', length: '15–18 min', ranked: 'Records · Marks · unlocks' },
  { id: 'endless', name: 'ENDLESS', blurb: 'Survive escalating five-minute cycles. Extract at a milestone or push on. Also offered after a Classic win.', length: 'open-ended', ranked: 'Own records · no Classic rewards repeated' },
  { id: 'fracture_expedition', name: 'FRACTURE EXPEDITION', blurb: 'Three acts through Aetherfall Citadel or the Paradox Expanse: new enemies, hazards, relics and a realm boss.', length: '≈ 20 min', ranked: 'Own records · relic collection' },
  { id: 'boss_rush', name: 'BOSS RUSH', blurb: 'Back-to-back bosses with a heal and a pick between fights. Choose a gauntlet.', length: '4–12 min', ranked: 'Own records · practice is unranked' },
  { id: 'daily_challenge', name: 'DAILY CHALLENGE', blurb: 'Same seed, arena and rules for everyone on the same UTC day.', length: '≈ 8 min', ranked: 'LOCAL record · not server-verified' },
  { id: 'weekly_challenge', name: 'WEEKLY CHALLENGE', blurb: 'A longer seeded run with two modifiers, fixed for the UTC week.', length: '≈ 15 min', ranked: 'LOCAL record · not server-verified' },
  { id: 'vex_trial', name: 'TRIAL OF THE OATHBROKEN', blurb: "Vex's three-chapter story: the Broken Oath, the Fractured Accord, Judgment of the Exile.", length: '3 chapters', ranked: 'Unlocks Riftbound and Voidheart Exile' },
];
export function ModeSelect({ onOnline, choice, onChoose, onBack, save, now }: Props) {
  const [t] = useState(() => now ?? Date.now());
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onBack(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onBack]);
  const b22 = save.b22, daily = dailyChallenge(t), weekly = weeklyChallenge(t), done = b22?.story.done ?? [];
  const best = (id: RunModeId) => { let x = 0; for (const k of Object.keys(b22?.records ?? {})) if (k.startsWith(id + '|')) x = Math.max(x, b22!.records[k].bestScore); return x; };
  void recordKey;
  const chal = choice.id === 'daily_challenge' ? daily : choice.id === 'weekly_challenge' ? weekly : null;
  return <main className="selection-layout mode-layout" data-testid="mode-select">
    <div className="screen-header"><button className="text-button" onClick={onBack} data-pad-cancel>← BACK</button><span>00 / MODE SELECTION</span></div>
    <p className="eyebrow">CHOOSE THE RUN</p><h2 className="large-heading">HOW DOES THE FRACTURE END?</h2>
    <div className="mode-grid" role="radiogroup" aria-label="Mode">
      {MODES.map((m, i) => { const on = choice.id === m.id, locked = false; return <button key={m.id} role="radio" aria-checked={on} className={`mode-card ${on ? 'selected' : ''}`} data-testid={`mode-${m.id}`} data-pad-default={on ? '' : undefined} onClick={() => onChoose({ coop: m.id === 'vex_trial' || m.id === 'daily_challenge' || m.id === 'weekly_challenge' ? undefined : choice.coop, id: m.id, track: m.id === 'boss_rush' ? (choice.track ?? 'initiation') : undefined, chapter: m.id === 'vex_trial' ? (choice.chapter ?? 1) : undefined })} disabled={locked}>
        <span className="mode-index">0{i + 1}</span><b>{m.name}</b><span className="mode-blurb">{m.blurb}</span><span className="mode-meta"><i>{m.length}</i><i>{m.ranked}</i>{best(m.id) > 0 && <i>BEST {best(m.id).toLocaleString()}</i>}</span>
      </button>; })}
    </div>
    <section className="mode-coop" data-testid="coop-options" aria-label="Fracture Alliance">
      <b>FRACTURE ALLIANCE · 2 PLAYERS</b>
      <button className={`outlined-button ${!choice.coop ? 'on' : ''}`} data-testid="coop-off" onClick={() => onChoose({ ...choice, coop: undefined })}>SOLO</button>
      {HERO_IDS.map(h => <button key={h} className={`outlined-button ${choice.coop === h ? 'on' : ''}`} data-testid={`coop-${h}`} disabled={['vex_trial', 'daily_challenge', 'weekly_challenge'].includes(choice.id)} onClick={() => onChoose({ ...choice, coop: h })}>P2: {h.toUpperCase()}</button>)}
      {onOnline && <button className="outlined-button" data-testid="coop-online" onClick={onOnline}>ONLINE CO-OP…</button>}
      <small>{choice.coop ? 'Local couch co-op. P1: WASD + mouse or pad 1. P2: pad 2 (or your only pad) or Arrows + Enter (dash) + , . / ; (Q E R F). Revive by standing near a downed partner.' : 'Pick a partner hero for local couch co-op. Online co-op needs a server (Settings → Online).'}</small></section>
    <section className="mode-detail" data-testid="mode-detail" aria-live="polite">
      {choice.id === 'boss_rush' && <div className="mode-opts">{(Object.keys(BOSS_RUSH_TRACKS) as BossRushTrack[]).map(k => <button key={k} className={`outlined-button ${choice.track === k ? 'on' : ''}`} data-testid={`track-${k}`} onClick={() => onChoose({ ...choice, track: k })}>{BOSS_RUSH_TRACKS[k].name.toUpperCase()} · {BOSS_RUSH_TRACKS[k].bosses.length} BOSSES</button>)}<button className={`outlined-button ${choice.practice ? 'on' : ''}`} data-testid="practice-toggle" onClick={() => onChoose({ ...choice, practice: !choice.practice })}>PRACTICE (UNRANKED, NO REWARDS): {choice.practice ? 'ON' : 'OFF'}</button></div>}
      {choice.id === 'vex_trial' && <div className="mode-opts">{([1, 2, 3] as const).map(c => { const open = c === 1 || done.includes((c - 1) as 1 | 2); return <button key={c} disabled={!open} className={`outlined-button ${choice.chapter === c ? 'on' : ''}`} data-testid={`chapter-${c}`} onClick={() => onChoose({ ...choice, chapter: c })}>{['I · THE BROKEN OATH', 'II · THE FRACTURED ACCORD', 'III · JUDGMENT OF THE EXILE'][c - 1]} {done.includes(c) ? '✓' : open ? '' : '🔒'}</button>; })}</div>}
      {chal && <div className="mode-chal" data-testid="challenge-preview"><b>{chal.id}</b> · {ARENAS[chal.arena].name} · {chal.hero ? `hero: ${chal.hero.toUpperCase()}` : 'any hero'} · resets in {fmt(untilReset(chal, t))} (UTC)
        <ul>{chal.modifiers.map(m => <li key={m}><b>{MODIFIER_BY_ID[m].name}</b>: {MODIFIER_BY_ID[m].rule} <em>{MODIFIER_BY_ID[m].upside}</em></li>)}</ul>
        <p>{b22?.challenges[chal.id] ? `Your local best: ${b22.challenges[chal.id].best.toLocaleString()} (${b22.challenges[chal.id].attempts} attempts)` : 'No attempt yet.'} Local ranking only: scores are not verified without a server.</p></div>}
    </section>
    <div className="start-row"><button className="primary-button" onClick={onBack} data-testid="mode-confirm">CONFIRM MODE</button></div>
    <HintBar hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}/>
  </main>;
}
