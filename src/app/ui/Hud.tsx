import type { CSSProperties } from 'react';
import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { RULES } from '../../core/Rules';

interface Props { s: UiSnapshot; pad: boolean; onPause: () => void; }

const icon = (name: string) => `url(${import.meta.env.BASE_URL}ui/icons/${name}.png)`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

interface SlotProps { id: string; name: string; ico: string; keyLabel: string; padLabel: string; pad: boolean; seconds: number; max: number; state?: 'active' | 'locked' | 'ready'; text?: string }
/** One ability tile: silhouette icon, a clockwise dark sweep that shrinks as the cooldown ends (readable without reading the number), a seconds readout and the key / pad glyph. */
function Slot({ id, name, ico, keyLabel, padLabel, pad, seconds, max, state, text }: SlotProps) {
  const cooling = seconds > 0 && state !== 'active';
  const cls = state === 'active' ? 'active' : state === 'locked' ? 'locked' : cooling ? 'cooling' : 'ready';
  const style = { '--ico': icon(ico), '--p': `${Math.min(1, seconds / max) * 360}deg` } as CSSProperties;
  return <div className={`slot ${cls}`} style={style} data-testid={`cd-${id}`} aria-label={`${name}: ${text ?? (cooling ? `${seconds.toFixed(1)} seconds` : 'ready')}`} title={name}>
    <span className="slot-ico" aria-hidden="true"/>{cooling && <span className="slot-sweep" aria-hidden="true"/>}
    {cooling && <b className="slot-num">{seconds >= 10 ? Math.ceil(seconds) : seconds.toFixed(1)}</b>}{!cooling && text && <b className="slot-tag">{text}</b>}
    <kbd className={pad ? 'pad-key' : ''}>{pad ? padLabel : keyLabel}</kbd>
  </div>;
}

export function Hud({ s, pad, onPause }: Props) {
  const hpFrac = s.hp / s.maxHp, low = hpFrac <= 0.3;
  const canForm = !s.form && s.drive >= RULES.formCharge && s.formCooldown <= 0;
  return <div className="hud" data-testid="hud">
    <div className="hud-panel hud-health">
      <div className={`portrait ${s.form ? 'is-form' : ''}`}><img src={`${import.meta.env.BASE_URL}ui/kai-portrait-${s.form ? 'f1' : 'base'}.png`} alt="" draggable={false}/><span className="lvl" aria-label={`Level ${s.level}`}>{s.level}</span></div>
      <div className="vitals">
        <div className={`bar-hp ${low ? 'low' : ''}`} role="progressbar" aria-label="Health" aria-valuenow={Math.ceil(s.hp)} aria-valuemax={Math.ceil(s.maxHp)}>
          <i className="trail" style={{ width: pct(hpFrac * 100) }}/><i className="fill" style={{ width: pct(hpFrac * 100) }}/>
          <span className="hp-num"><span className="hp-ico" style={{ '--ico': icon('heart') } as CSSProperties}/>{Math.ceil(s.hp)}<em>/{Math.ceil(s.maxHp)}</em></span>
        </div>
        <div className="bar-xp" role="progressbar" aria-label="Experience" aria-valuenow={Math.floor(s.xp)} aria-valuemax={s.nextXp}><i style={{ width: pct(s.xp / s.nextXp * 100) }}/></div>
        <div className={`bar-form ${s.form ? 'on' : canForm ? 'ready' : ''}`} role="progressbar" aria-label="Transformation drive" aria-valuenow={Math.floor(s.drive)} aria-valuemax={100}>
          <i style={{ width: pct(s.drive) }}/><u style={{ left: `${RULES.formCharge}%` }}/>
          <span>{s.form ? 'FLAREBOUND' : canForm ? 'FORM READY' : 'DRIVE'}</span>
        </div>
      </div>
    </div>
    <div className="hud-panel hud-clock"><span className="clock-label">THE GLOAM CIRCUIT</span><b>{roundedTime(s.seconds)}</b><span className="clock-kills"><i/> {s.kills}</span></div>
    <button className="hud-panel hud-pause" onClick={onPause} aria-label="Pause game"><span className="pause-bars"/><kbd className={pad ? 'pad-key' : ''}>{pad ? 'START' : 'ESC'}</kbd></button>
    <div className="hud-slots" role="group" aria-label="Abilities">
      <Slot id="shift" name="Dash" ico="dash" keyLabel="SHIFT" padLabel="A" pad={pad} seconds={s.dashCooldown} max={3.2}/>
      <Slot id="q" name="Impact" ico="impact" keyLabel="Q" padLabel="X" pad={pad} seconds={s.qCooldown} max={8.5}/>
      <Slot id="e" name="Fracture Lance" ico="lance" keyLabel="E" padLabel="RB" pad={pad} seconds={s.beamCooldown} max={7}/>
      <Slot id="r" name="Nova Bloom" ico="nova" keyLabel="R" padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={16}/>
      <Slot id="f" name="Flarebound form" ico="form" keyLabel="F" padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={RULES.formCooldown}
        state={s.form ? 'active' : canForm ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : canForm ? 'GO' : s.formCooldown > 0 ? undefined : `${Math.floor(s.drive)}%`}/>
    </div>
  </div>;
}
