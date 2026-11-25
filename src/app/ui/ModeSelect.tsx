import { useState } from 'react';
import type { SaveV1 } from '../../sim/SaveSystem';
import { BOSS_RUSH_TRACKS, type BossRushTrack, type RunModeId } from '../../b22/plan';
import { dailyChallenge, weeklyChallenge, untilReset, MODIFIER_BY_ID } from '../../b22/challenges';
import { ARENAS } from '../../content/arenas';
import { Card, Chip, Cta, Frame, Panel } from './b29/Kit';
import { recordKey } from '../../b22/save';
import { ASSET_BASE } from '../assetBase';
import { isQaRoute } from '../../sim/SaveSystem';

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
  const b22 = save.b22, daily = dailyChallenge(t), weekly = weeklyChallenge(t), done = b22?.story.done ?? [];
  const best = (id: RunModeId) => { let x = 0; for (const k of Object.keys(b22?.records ?? {})) if (k.startsWith(id + '|')) x = Math.max(x, b22!.records[k].bestScore); return x; };
  void recordKey;
  const chal = choice.id === 'daily_challenge' ? daily : choice.id === 'weekly_challenge' ? weekly : null;
  const cur = MODES.find(m => m.id === choice.id) ?? MODES[0], qa = isQaRoute(), pick = (id: RunModeId) => onChoose({ coop: id === 'vex_trial' || id === 'daily_challenge' || id === 'weekly_challenge' ? undefined : choice.coop, id, track: id === 'boss_rush' ? (choice.track ?? 'initiation') : undefined, chapter: id === 'vex_trial' ? (choice.chapter ?? 1) : undefined });
  const face = (h: HeroId) => h === 'kai' ? `${ASSET_BASE}ui/kai-portrait-base.png` : `${ASSET_BASE}ui/heroes/${h}-portrait-base.webp`;
  const coopLocked = ['vex_trial', 'daily_challenge', 'weekly_challenge'].includes(choice.id);
  const support = (id: RunModeId) => id === 'vex_trial' || id === 'daily_challenge' || id === 'weekly_challenge' ? ['SOLO'] : id === 'classic' || id === 'boss_rush' || id === 'fracture_expedition' ? ['SOLO', 'LOCAL CO-OP', 'ONLINE'] : ['SOLO', 'LOCAL CO-OP'];
  const party = choice.coop ? 'local' : 'solo';
  return <Frame testId="mode-select" eyebrow="00 / MODE SELECTION" title="HOW DOES THE FRACTURE END?" sub="Choose the run, then who fights beside you." onBack={onBack} className="ms" accent="#ffcf86"
    hints={[{ key: 'CLICK', pad: 'A', label: 'SELECT' }, { key: 'TAB', pad: 'D-PAD', label: 'NAVIGATE' }, { key: 'ESC', pad: 'B', label: 'BACK' }]}>
    <nav className="ms-list" role="radiogroup" aria-label="Mode">
      {MODES.map((m, i) => { const on = choice.id === m.id; return <button key={m.id} type="button" role="radio" aria-checked={on} className={`ms-mode ${on ? 'on' : ''}`} data-testid={`mode-${m.id}`} data-pad-default={on ? '' : undefined} onClick={() => pick(m.id)}>
        <img src={`${ASSET_BASE}ui/modes/${m.id}.png`} alt="" draggable={false}/><span className="ms-mode-t"><small>0{i + 1} · {m.length}{best(m.id) > 0 ? ` · BEST ${best(m.id).toLocaleString()}` : ''}</small><b>{m.name}</b></span>{on && <em className="ms-on" aria-hidden="true">✓</em>}</button>; })}
    </nav>
    <div className="ms-right">
      <Panel className="ms-detail" aria-live="polite">
        <header className="ms-dhead"><img src={`${ASSET_BASE}ui/modes/${cur.id}.png`} alt="" draggable={false}/><div><p className="eyebrow">SELECTED MODE</p><h3>{cur.name}</h3><div className="ms-chips">{support(cur.id).map(s => <Chip key={s} tone={s === 'SOLO' ? 'teal' : 'gold'}>{s}</Chip>)}<Chip tone="mute">{cur.length}</Chip></div></div></header>
        <p className="ms-blurb">{cur.blurb}</p>
        <p className="ms-reward"><em>REWARDS</em>{cur.ranked}</p>
        <section className="mode-detail ms-opts" data-testid="mode-detail">
          {choice.id === 'boss_rush' && <div className="ms-optrow">{(Object.keys(BOSS_RUSH_TRACKS) as BossRushTrack[]).map(k => <button key={k} type="button" className={`ms-opt ${choice.track === k ? 'on' : ''}`} data-testid={`track-${k}`} onClick={() => onChoose({ ...choice, track: k })}>{BOSS_RUSH_TRACKS[k].name.toUpperCase()} · {BOSS_RUSH_TRACKS[k].bosses.length} BOSSES</button>)}<button type="button" className={`ms-opt ${choice.practice ? 'on' : ''}`} data-testid="practice-toggle" onClick={() => onChoose({ ...choice, practice: !choice.practice })}>PRACTICE (UNRANKED): {choice.practice ? 'ON' : 'OFF'}</button></div>}
          {choice.id === 'vex_trial' && <div className="ms-optrow">{([1, 2, 3] as const).map(c => { const open = qa || c === 1 || done.includes((c - 1) as 1 | 2); return <button key={c} type="button" disabled={!open} className={`ms-opt ${choice.chapter === c ? 'on' : ''}`} data-testid={`chapter-${c}`} onClick={() => onChoose({ ...choice, chapter: c })}>{['I · THE BROKEN OATH', 'II · THE FRACTURED ACCORD', 'III · JUDGMENT OF THE EXILE'][c - 1]} {done.includes(c) ? '✓' : open ? '' : '🔒'}</button>; })}{qa && <small className="dim">QA route: all chapters open.</small>}</div>}
          {chal && <div className="mode-chal ms-chal" data-testid="challenge-preview"><b>{chal.id}</b> · {ARENAS[chal.arena].name} · {chal.hero ? `hero: ${chal.hero.toUpperCase()}` : 'any hero'} · resets in {fmt(untilReset(chal, t))} (UTC)
            <ul>{chal.modifiers.map(m => <li key={m}><b>{MODIFIER_BY_ID[m].name}</b>: {MODIFIER_BY_ID[m].rule} <em>{MODIFIER_BY_ID[m].upside}</em></li>)}</ul>
            <p>{b22?.challenges[chal.id] ? `Your local best: ${b22.challenges[chal.id].best.toLocaleString()} (${b22.challenges[chal.id].attempts} attempts)` : 'No attempt yet.'} Local ranking only: scores are not verified without a server.</p></div>}
        </section>
      </Panel>
      <Panel title="PARTY · FRACTURE ALLIANCE" className="ms-party" data-testid="coop-options" aria-label="Fracture Alliance">
        <div className="ms-seg" role="radiogroup" aria-label="Players">
          <button type="button" role="radio" aria-checked={party === 'solo'} className={`ms-segb ${party === 'solo' ? 'on' : ''}`} data-testid="coop-off" onClick={() => onChoose({ ...choice, coop: undefined })}><b>SOLO</b><small>1 player</small></button>
          <button type="button" role="radio" aria-checked={party === 'local'} className={`ms-segb ${party === 'local' ? 'on' : ''}`} data-testid="coop-local" disabled={coopLocked} onClick={() => onChoose({ ...choice, coop: choice.coop ?? 'ren' })}><b>LOCAL CO-OP</b><small>same screen</small></button>
          {onOnline && <button type="button" role="radio" aria-checked={false} className="ms-segb" data-testid="coop-online" onClick={onOnline}><b>ONLINE CO-OP</b><small>needs a server ›</small></button>}
        </div>
        <div className={`ms-partner ${party === 'solo' ? 'dim' : ''}`}>
          <span className="ms-plabel">PLAYER 2 · PARTNER HERO</span>
          <div className="ms-pheroes">{HERO_IDS.map(h => <Card key={h} on={choice.coop === h} onClick={() => onChoose({ ...choice, coop: h })} disabled={coopLocked} testId={`coop-${h}`} className="ms-ph" label={`Partner ${h}`}><img src={face(h)} alt="" draggable={false}/><b>{h.toUpperCase()}</b></Card>)}</div>
        </div>
        <small className="ms-note">{coopLocked ? 'This mode is single-player.' : choice.coop ? 'Local couch co-op. P1: WASD + mouse or pad 1. P2: pad 2 (or your only pad) or Arrows + Enter (dash) + , . / ; (Q E R F). Revive by standing near a downed partner.' : 'Pick a partner hero for local couch co-op, or play online with a friend (needs a server).'}</small>
      </Panel>
      <div className="ms-confirm"><Cta onClick={onBack} testId="mode-confirm" sub={`${cur.name}${choice.coop ? ` · CO-OP WITH ${choice.coop.toUpperCase()}` : ' · SOLO'}`}>CONFIRM MODE</Cta></div>
    </div>
  </Frame>;
}
