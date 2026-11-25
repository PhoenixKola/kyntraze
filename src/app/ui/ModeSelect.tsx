import { useState } from 'react';
import type { SaveV1 } from '../../sim/SaveSystem';
import { BOSS_RUSH_TRACKS, type BossRushTrack, type RunModeId } from '../../b22/plan';
import { dailyChallenge, weeklyChallenge, untilReset, MODIFIER_BY_ID } from '../../b22/challenges';
import { ARENAS } from '../../content/arenas';
import { Card, Cta, Frame, Panel } from './b29/Kit';
import { recordKey } from '../../b22/save';
import { ASSET_BASE } from '../assetBase';
import { isQaRoute } from '../../sim/SaveSystem';

import { HERO_IDS, type HeroId } from '../../content/heroes';
export interface ModeChoice { id: RunModeId; track?: BossRushTrack; chapter?: 1 | 2 | 3; practice?: boolean; /** B22.6 local couch co-op: the partner's hero (undefined = solo) */ coop?: HeroId }
interface Props { onOnline?: () => void; choice: ModeChoice; onChoose: (c: ModeChoice) => void; onBack: () => void; save: SaveV1; now?: number }
const fmt = (s: number) => `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
const MODES: { id: RunModeId; title: string; name: string; blurb: string; length: string; ranked: string }[] = [
  { id: 'classic', title: 'Classic', name: 'CLASSIC', blurb: 'The original campaign: the Fracture Warden at 8:00, the Null Seraph at 15:00.', length: '15–18 min', ranked: 'Records · Marks · unlocks' },
  { id: 'endless', title: 'Endless', name: 'ENDLESS', blurb: 'Survive escalating five-minute cycles. Extract at a milestone or push on. Also offered after a Classic win.', length: 'open-ended', ranked: 'Own records · no Classic rewards repeated' },
  { id: 'fracture_expedition', title: 'Fracture Expedition', name: 'FRACTURE EXPEDITION', blurb: 'Three acts through Aetherfall Citadel or the Paradox Expanse: new enemies, hazards, relics and a realm boss.', length: '≈ 20 min', ranked: 'Own records · relic collection' },
  { id: 'boss_rush', title: 'Boss Rush', name: 'BOSS RUSH', blurb: 'Back-to-back bosses with a heal and a pick between fights. Choose a gauntlet.', length: '4–12 min', ranked: 'Own records · practice is unranked' },
  { id: 'daily_challenge', title: 'Daily Challenge', name: 'DAILY CHALLENGE', blurb: 'Same seed, arena and rules for everyone on the same UTC day.', length: '≈ 8 min', ranked: 'LOCAL record · not server-verified' },
  { id: 'weekly_challenge', title: 'Weekly Challenge', name: 'WEEKLY CHALLENGE', blurb: 'A longer seeded run with two modifiers, fixed for the UTC week.', length: '≈ 15 min', ranked: 'LOCAL record · not server-verified' },
  { id: 'vex_trial', title: 'Trial of the Oathbroken', name: 'TRIAL OF THE OATHBROKEN', blurb: "Vex's three-chapter story: the Broken Oath, the Fractured Accord, Judgment of the Exile.", length: '3 chapters', ranked: 'Unlocks Riftbound and Voidheart Exile' },
];
export function ModeSelect({ onOnline, choice, onChoose, onBack, save, now }: Props) {
  const [t] = useState(() => now ?? Date.now());
  const b22 = save.b22, daily = dailyChallenge(t), weekly = weeklyChallenge(t), done = b22?.story.done ?? [];
  const best = (id: RunModeId) => { let x = 0; for (const k of Object.keys(b22?.records ?? {})) if (k.startsWith(id + '|')) x = Math.max(x, b22!.records[k].bestScore); return x; };
  void recordKey;
  const chal = choice.id === 'daily_challenge' ? daily : choice.id === 'weekly_challenge' ? weekly : null;
  const cur = MODES.find(m => m.id === choice.id) ?? MODES[0], qa = isQaRoute(), pick = (id: RunModeId) => onChoose({ coop: id === 'vex_trial' || id === 'daily_challenge' || id === 'weekly_challenge' ? undefined : choice.coop, id, track: id === 'boss_rush' ? (choice.track ?? 'initiation') : undefined, chapter: id === 'vex_trial' ? (choice.chapter ?? 1) : undefined });
  const face = (h: HeroId) => h === 'kai' ? `${ASSET_BASE}ui/kai-portrait-base.png` : `${ASSET_BASE}ui/heroes/${h}-portrait-base.webp`;
  const coopLocked = ['vex_trial', 'daily_challenge', 'weekly_challenge'].includes(choice.id);
  const support = (id: RunModeId) => id === 'vex_trial' || id === 'daily_challenge' || id === 'weekly_challenge' ? ['SOLO'] : id === 'classic' || id === 'boss_rush' || id === 'fracture_expedition' ? ['SOLO', 'LOCAL CO-OP', 'ONLINE'] : ['SOLO', 'LOCAL CO-OP'];
  const party = choice.coop ? 'local' : 'solo';
  const facts: [string, string][] = [['Length', cur.length], ['Players', support(cur.id).map(s => s.charAt(0) + s.slice(1).toLowerCase()).join(' · ')], ['Rewards', cur.ranked]];
  return <Frame testId="mode-select" eyebrow="00 / MISSION OBSERVATORY" title="How does the fracture end?" sub="Pick the run, then who fights beside you." onBack={onBack} className="ms" accent="#ffcf86" bg="art/menu/observatory.webp" lit
    hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <nav className="ms-list" role="radiogroup" aria-label="Mode">
      {MODES.map((m, i) => { const on = choice.id === m.id; return <button key={m.id} type="button" role="radio" aria-checked={on} className={`ms-mode ${on ? 'on' : ''}`} data-testid={`mode-${m.id}`} data-pad-default={on ? '' : undefined} onClick={() => pick(m.id)}>
        <img src={`${ASSET_BASE}art/menu/mode-${m.id}.webp`} alt="" draggable={false}/><span className="ms-mode-t"><b>{m.title}</b><small>{m.length}{best(m.id) > 0 ? ` · Best ${best(m.id).toLocaleString()}` : ''}</small></span><i className="ms-no" aria-hidden="true">0{i + 1}</i>{on && <em className="ms-on" aria-hidden="true">✓</em>}</button>; })}
    </nav>
    <div className="ms-right">
      <section className="ms-poster" aria-live="polite" key={cur.id}>
        <div className="ms-emblem"><span className="ms-halo" aria-hidden="true"/><img src={`${ASSET_BASE}art/menu/mode-${cur.id}.webp`} alt="" draggable={false}/></div>
        <div className="ms-copy"><p className="eyebrow">Selected mode</p><h3>{cur.title}</h3><p className="ms-blurb">{cur.blurb}</p>
          <dl className="ms-facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
        <section className="mode-detail ms-opts" data-testid="mode-detail">
          {choice.id === 'boss_rush' && <div className="ms-optrow">{(Object.keys(BOSS_RUSH_TRACKS) as BossRushTrack[]).map(k => <button key={k} type="button" className={`ms-opt ${choice.track === k ? 'on' : ''}`} data-testid={`track-${k}`} onClick={() => onChoose({ ...choice, track: k })}>{BOSS_RUSH_TRACKS[k].name} · {BOSS_RUSH_TRACKS[k].bosses.length} bosses</button>)}<button type="button" className={`ms-opt ${choice.practice ? 'on' : ''}`} data-testid="practice-toggle" onClick={() => onChoose({ ...choice, practice: !choice.practice })}>Practice (unranked): {choice.practice ? 'on' : 'off'}</button></div>}
          {choice.id === 'vex_trial' && <div className="ms-optrow">{([1, 2, 3] as const).map(c => { const open = qa || c === 1 || done.includes((c - 1) as 1 | 2); return <button key={c} type="button" disabled={!open} className={`ms-opt ${choice.chapter === c ? 'on' : ''}`} data-testid={`chapter-${c}`} onClick={() => onChoose({ ...choice, chapter: c })}>{['I · The Broken Oath', 'II · The Fractured Accord', 'III · Judgment of the Exile'][c - 1]} {done.includes(c) ? '✓' : open ? '' : '🔒'}</button>; })}{qa && <small className="dim">QA route: all chapters open.</small>}</div>}
          {chal && <div className="mode-chal ms-chal" data-testid="challenge-preview"><b>{chal.id}</b> · {ARENAS[chal.arena].name} · {chal.hero ? `hero: ${chal.hero.toUpperCase()}` : 'any hero'} · resets in {fmt(untilReset(chal, t))} (UTC)
            <ul>{chal.modifiers.map(m => <li key={m}><b>{MODIFIER_BY_ID[m].name}</b>: {MODIFIER_BY_ID[m].rule} <em>{MODIFIER_BY_ID[m].upside}</em></li>)}</ul>
            <p>{b22?.challenges[chal.id] ? `Your local best: ${b22.challenges[chal.id].best.toLocaleString()} (${b22.challenges[chal.id].attempts} attempts)` : 'No attempt yet.'} Local ranking only: scores are not verified without a server.</p></div>}
        </section>
      </section>
      <Panel title="Who is playing?" className="ms-party" data-testid="coop-options" aria-label="Fracture Alliance">
        <div className="ms-seg" role="radiogroup" aria-label="Players">
          <button type="button" role="radio" aria-checked={party === 'solo'} className={`ms-segb ${party === 'solo' ? 'on' : ''}`} data-testid="coop-off" onClick={() => onChoose({ ...choice, coop: undefined })}><b>Solo</b><small>Just you</small></button>
          <button type="button" role="radio" aria-checked={party === 'local'} className={`ms-segb ${party === 'local' ? 'on' : ''}`} data-testid="coop-local" disabled={coopLocked} onClick={() => onChoose({ ...choice, coop: choice.coop ?? 'ren' })}><b>Local co-op</b><small>Two players, one screen</small></button>
          {onOnline && <button type="button" role="radio" aria-checked={false} className="ms-segb" data-testid="coop-online" onClick={onOnline}><b>Online co-op</b><small>Play with a friend over the internet ›</small></button>}
        </div>
        {party === 'local' && !coopLocked ? <div className="ms-partner"><span className="ms-plabel">Player 2 plays as</span>
          <div className="ms-pheroes">{HERO_IDS.map(h => <Card key={h} on={choice.coop === h} onClick={() => onChoose({ ...choice, coop: h })} testId={`coop-${h}`} className="ms-ph" label={`Partner ${h}`}><img src={face(h)} alt="" draggable={false}/><b>{h.charAt(0).toUpperCase() + h.slice(1)}</b></Card>)}</div>
          <small className="ms-note">P1: WASD + mouse or pad 1. P2: arrows, Enter (dash), , . / ; for Q E R F, or pad 2. Fly: Ctrl / Right Ctrl.</small></div>
          : <small className="ms-note">{coopLocked ? `${cur.title} is a solo mode.` : party === 'solo' ? 'Fighting alone. Choose Local co-op to bring a second player onto this screen.' : ''}</small>}
      </Panel>
      <div className="ms-confirm"><Cta onClick={onBack} testId="mode-confirm" sub={`${cur.title}${choice.coop ? ` · with ${choice.coop.charAt(0).toUpperCase() + choice.coop.slice(1)}` : ' · solo'}`}>CONFIRM</Cta></div>
    </div>
  </Frame>;
}
