import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { RULES } from '../../core/Rules';
import type { BossHud } from '../../bridge/UiSnapshot';
import { Minimap } from './Minimap';
import type { RunHud } from '../../bridge/UiSnapshot';

interface Props { s: UiSnapshot; pad: boolean; onPause: () => void; reduced?: boolean; }

const icon = (name: string) => `url(${import.meta.env.BASE_URL}ui/icons/${name}.png)`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

interface SlotProps { id: string; name: string; ico: string; keyLabel: string; padLabel: string; pad: boolean; seconds: number; max: number; state?: 'active' | 'locked' | 'ready'; tone?: string; text?: string; /** 0..1 Silver Rift charge, drawn as a thin bar inside the tile */ charge?: number }
/** One ability tile: silhouette icon, a clockwise dark sweep that shrinks as the cooldown ends (readable without reading the number), a seconds readout and the key / pad glyph. */
function Slot({ id, name, ico, keyLabel, padLabel, pad, seconds, max, state, tone, text, charge }: SlotProps) {
  const cooling = seconds > 0 && state !== 'active';
  const cls = state === 'active' ? 'active' : state === 'locked' ? 'locked' : cooling ? 'cooling' : 'ready';
  const style = { '--ico': icon(ico), '--p': `${Math.min(1, seconds / max) * 360}deg` } as CSSProperties;
  return <div className={`slot ${cls} ${tone ?? ''}`} style={style} data-testid={`cd-${id}`} aria-label={`${name}: ${text ?? (cooling ? `${seconds.toFixed(1)} seconds` : 'ready')}`} title={name}>
    <span className="slot-ico" aria-hidden="true"/>{!!charge && <i className="slot-charge" style={{ width: pct(charge * 100) }} aria-hidden="true"/>}{cooling && <span className="slot-sweep" aria-hidden="true"/>}
    {cooling && <b className="slot-num">{seconds >= 10 ? Math.ceil(seconds) : seconds.toFixed(1)}</b>}{!cooling && text && <b className="slot-tag">{text}</b>}
    <kbd className={pad ? 'pad-key' : ''}>{pad ? padLabel : keyLabel}</kbd>
  </div>;
}

const bossArt = (n: string) => `${import.meta.env.BASE_URL}art/bosses/fx/${n}.png`;
/** Boss nameplate + health bar, top-centre under the clock (never over Kai, the ability tiles or the floor warnings). Phase tick sits at the phase-change threshold. */
function BossBar({ b }: { b: BossHud }) {
  const frac = b.hp / b.maxHp, intro = b.intro > 0;
  return <>
    {intro && <div className="boss-warning" data-testid="boss-warning" role="alert"><img src={bossArt('warning-glyph')} alt="" draggable={false}/><b>WARNING</b><span>{b.name}</span></div>}
    <div className={`boss-bar ${b.id} ${b.phase === 2 ? 'p2' : ''} ${b.exposed ? 'exposed' : ''} ${b.invuln ? 'shielded' : ''}`} data-testid="boss-bar" role="progressbar" aria-label={`${b.name} health`} aria-valuenow={Math.ceil(b.hp)} aria-valuemax={b.maxHp}>
      <div className="boss-name"><b>{b.name.toUpperCase()}</b><em>{b.phase === 2 ? 'PHASE II' : 'PHASE I'}</em><u>{b.invuln ? (intro ? '' : 'SHIELDED') : b.exposed ? 'EXPOSED' : ''}</u></div>
      <div className="boss-plate">
        <img className="boss-emblem" src={bossArt(`emblem-${b.id}`)} alt="" draggable={false}/>
        <div className="boss-track"><i className="trail" style={{ width: pct(frac * 100) }}/><i className="fill" style={{ width: pct(frac * 100) }}/><span className="tick" style={{ left: '50%' }}/></div>
      </div>
    </div>
  </>;
}

/** Thin run-progress rail on the clock panel: fill = time toward the finale, a marker at the Warden and the Seraph. */
function RunTrack({ r }: { r: RunHud }) {
  return <div className="run-track" aria-hidden="true"><i style={{ width: pct(r.t / r.finaleAt * 100) }}/><u className={r.wardenDone ? 'done' : ''} style={{ left: pct(r.wardenAt / r.finaleAt * 100) }}/><u className={`end ${r.finaleOut ? 'live' : ''}`} style={{ left: '100%' }}/></div>;
}
const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** Brief red screen-edge flash on a REAL hp loss (not on i-frames, regen, revive or a full-tank refill). Keyed so each new hit restarts it; Reduced Effects gets a short static edge instead of the pulse. */
function useHitVignette(s: UiSnapshot) {
  const prev = useRef(s.hp), [hit, setHit] = useState({ n: 0, k: 0 });
  useEffect(() => {
    const loss = prev.current - s.hp; prev.current = s.hp;
    if (loss > 0.5 && s.phase !== 'victory') setHit(h => ({ n: h.n + 1, k: Math.min(1, 0.4 + (loss / Math.max(1, s.maxHp)) * 2.2) }));
  }, [s.hp, s.maxHp, s.phase]);
  return hit;
}

export function Hud({ s, pad, onPause, reduced }: Props) {
  const hit = useHitVignette(s);
  const hpFrac = s.hp / s.maxHp, low = hpFrac <= 0.3;
  const canForm = !s.form && s.drive >= RULES.formCharge && s.formCooldown <= 0;
  const f2 = s.form === 2, f3 = s.form === 3, comet = s.cometReady && !s.cinema, apex = s.apexReady && !s.cinema, fullName = f3 ? 'STILLFIRE APEX' : f2 ? 'COMETHEART' : apex ? 'STILLFIRE READY' : s.form ? 'FLAREBOUND' : comet ? 'COMETHEART READY' : canForm ? 'FORM READY' : 'DRIVE';
  return <div className="hud" data-testid="hud">
    {hit.n > 0 && <div key={hit.n} className={`hit-vignette ${reduced ? 'calm' : ''}`} data-testid="hit-vignette" style={{ '--k': hit.k } as CSSProperties} aria-hidden="true"/>}
    {s.sinceRevive < 1 && <div className="revive-flash" aria-hidden="true"/>}
    <div className="hud-panel hud-health">
      <div className={`portrait ${s.form ? 'is-form' : ''} ${f2 ? 'is-form2' : ''} ${f3 ? 'is-form3' : ''}`}><img src={`${import.meta.env.BASE_URL}ui/kai-portrait-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.png`} alt="" draggable={false}/><img className="crest" src={`${import.meta.env.BASE_URL}ui/kit/crest-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.webp`} alt="" draggable={false}/><span className="lvl" aria-label={`Level ${s.level}`}>{s.level}</span>{s.revives > 0 && <span className="revive-badge" style={{ '--ico': icon('heart') } as CSSProperties} title="Second Wind ready" aria-label="Second Wind ready"/>}</div>
      <div className="vitals">
        <div className={`bar-hp ${low ? 'low' : ''}`} role="progressbar" aria-label="Health" aria-valuenow={Math.ceil(s.hp)} aria-valuemax={Math.ceil(s.maxHp)}>
          <i className="trail" style={{ width: pct(hpFrac * 100) }}/><i className="fill" style={{ width: pct(hpFrac * 100) }}/>
          <span className="hp-num"><span className="hp-ico" style={{ '--ico': icon('heart') } as CSSProperties}/>{Math.ceil(s.hp)}<em>/{Math.ceil(s.maxHp)}</em></span>
        </div>
        <div className={`bar-xp ${s.xp / s.nextXp > 0.85 ? 'near' : ''}`} role="progressbar" aria-label="Experience" aria-valuenow={Math.floor(s.xp)} aria-valuemax={s.nextXp}><i style={{ width: pct(s.xp / s.nextXp * 100) }}/><span><b>LV {s.level}</b><em>{Math.floor(s.xp)}/{s.nextXp}</em></span></div>
        <div className={`bar-form ${s.form ? 'on' : canForm ? 'ready' : ''} ${f2 ? 'form2' : ''} ${f3 ? 'form3' : ''} ${comet ? 'comet-ready' : ''} ${apex ? 'apex-ready' : ''}`} role="progressbar" aria-label="Transformation drive" aria-valuenow={Math.floor(s.drive)} aria-valuemax={100} title={s.apexUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart or (after 10:00) Stillfire Apex; tap F for the selected form, hold F to choose.' : s.cometUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart (Form II).' : 'Drive 65%: F = Flarebound.'}>
          <i style={{ width: pct(s.drive) }}/><u style={{ left: `${RULES.formCharge}%` }}/>{(s.cometUnlocked || s.apexUnlocked) && <u className="tick2" style={{ left: '99%' }}/>}
          <span>{fullName}</span>
        </div>
      </div>
    </div>
    {s.selector.open && <div className="form-selector" data-testid="form-selector" role="listbox" aria-label="Choose form">{s.selector.choices.map(c => <span key={c} role="option" aria-selected={c === s.selector.pick} className={`fs-opt f${c} ${c === s.selector.pick ? 'on' : ''}`}><i/>{c === 1 ? 'FLAREBOUND' : c === 2 ? 'COMETHEART' : 'STILLFIRE APEX'}</span>)}<em>{pad ? 'RELEASE Y' : 'RELEASE F'}</em></div>}
    {s.boss && <BossBar b={s.boss}/>}
    <Minimap map={s.map} boss={!!s.boss}/>
    <div className="hud-panel hud-clock"><span className="clock-label">{s.arenaName}</span><b>{roundedTime(s.seconds)}</b><span className="clock-kills"><i/> {s.kills}{s.run.nextLabel && <em className={`clock-next ${s.run.nextIn < 30 && s.run.nextIn > 0 ? 'soon' : ''}`}>{s.run.nextIn > 0 ? `${s.run.nextLabel} ${mmss(s.run.nextIn)}` : s.run.nextLabel}</em>}</span><RunTrack r={s.run}/></div>
    {s.run.announce && !s.boss && <div className="finale-banner" data-testid="finale-banner" role="alert"><b>{s.run.announce.text}</b><span>{s.run.announce.sub}</span></div>}
    {s.phase === 'victory' && !s.victoryShown && <div className="victory-banner" data-testid="victory-banner" role="status"><b>THE FRACTURE HOLDS</b><span>NULL SERAPH DEFEATED</span></div>}
    <button className="hud-panel hud-pause" onClick={onPause} aria-label="Pause game"><span className="pause-bars"/><kbd className={pad ? 'pad-key' : ''}>{pad ? 'START' : 'ESC'}</kbd></button>
    <div className="hud-slots" role="group" aria-label="Abilities">
      <Slot id="shift" name="Dash" ico="dash" keyLabel="SHIFT" padLabel="A" pad={pad} seconds={s.dashCooldown} max={s.cdMax.dash}/>
      <Slot id="q" name="Impact" ico="impact" keyLabel="Q" padLabel="X" pad={pad} seconds={s.qCooldown} max={8.5}/>
      {f3 ? <Slot id="e" name="Silver Rift - Lance cards apply: damage, width, cooldown, beam time, Drive per hit" ico="rift" keyLabel="E" padLabel="RB" pad={pad} seconds={s.riftCooldown} max={s.cdMax.rift} charge={s.riftCharge} state={s.riftCharge > 0 ? 'active' : undefined} text={s.riftCharge > 0 ? 'HOLD' : undefined}/> : f2 ? <Slot id="e" name="Dragonfang Rush" ico="dragon" keyLabel="E" padLabel="RB" pad={pad} seconds={s.dragonCooldown} max={s.cdMax.dragon}/> : <Slot id="e" name="Fracture Lance" ico="lance" keyLabel="E" padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.beam}/>}
      {f3 ? <Slot id="r" name="Instinct Reversal - Nova cards apply: damage, reach, cooldown, extra strikes (Afterglow +1, Twin Bloom +2)" ico="reversal" keyLabel="R" padLabel="LB" pad={pad} seconds={s.reversalCooldown} max={s.cdMax.reversal}/> : f2 ? <Slot id="r" name="Cometbreaker Cannon" ico="comet" keyLabel="R" padLabel="LB" pad={pad} seconds={s.cometCooldown} max={s.cdMax.comet}/> : <Slot id="r" name="Nova Bloom" ico="nova" keyLabel="R" padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.sphere}/>}
      {f3 && <Slot id="evade" name="Perfect Evasion - automatic sidestep, one hit refused, 9 s recharge" ico="evasion" keyLabel="AUTO" padLabel="AUTO" pad={pad} seconds={s.evadeCooldown} max={s.cdMax.evade} state={s.evadeCooldown > 0 ? undefined : 'ready'} text={s.evadeCooldown > 0 ? undefined : 'READY'}/>}
      <Slot id="f" tone={f3 || apex ? 'tone-f3' : f2 || comet ? 'tone-f2' : s.form ? 'tone-f1' : undefined} name={f3 ? 'Stillfire Apex form' : apex ? 'Stillfire Apex ready' : f2 || comet ? 'Cometheart form' : 'Flarebound form'} ico={f3 || apex ? 'form3' : f2 || comet || (s.cometUnlocked && !s.form) ? 'form2' : 'form'} keyLabel="F" padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={s.cdMax.form}
        state={s.form >= 2 ? 'active' : comet || apex ? 'ready' : s.form ? 'active' : canForm ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : apex ? 'III' : comet ? 'II' : canForm ? 'GO' : s.formCooldown > 0 ? undefined : `${Math.floor(s.drive)}%`}/>
    </div>
  </div>;
}
