import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
interface Props { s: UiSnapshot; onPause: () => void; }
function Cooldown({ label, seconds, max }: { label: string; seconds: number; max?: number }) {
  const [key, ...name] = label.split(' / ');
  return <div className={`cooldown ${seconds > 0 ? 'cooling' : ''}`} data-testid={`cd-${key.toLowerCase()}`}><span><em>{key}</em>{name.length ? <u> / {name.join(' / ')}</u> : null}</span><b>{seconds <= 0 ? 'READY' : `${seconds.toFixed(1)}s`}</b>{max && seconds > 0 ? <i className="cd" style={{ width: `${Math.min(100, seconds / max * 100)}%` }}/> : null}</div>;
}
export function Hud({ s, onPause }: Props) {
  return <div className="hud" data-testid="hud">
    <div className="hud-top"><div className="hud-hero"><span className="hud-monogram">K</span><div><strong>KAI / RUNNER 01</strong><div className="bar hp"><i style={{ width: `${Math.max(0, s.hp / s.maxHp * 100)}%` }}/></div><small>{Math.ceil(s.hp)} / {Math.ceil(s.maxHp)} HP</small></div></div>
      <div className="hud-timer"><span>THE GLOAM CIRCUIT</span><b>{roundedTime(s.seconds)}</b><small>LV {s.level} · {s.kills} ELIMINATIONS · {s.enemies} ACTIVE</small></div>
      <button className="hud-pause" onClick={onPause} aria-label="Pause game">Ⅱ <small>ESC</small></button>
    </div>
    <div className="hud-bottom"><div className="hud-bottom-left"><div className="hud-exp"><div className="bar-label"><span>EXPERIENCE</span><b>LV {s.level} <span>{s.xp.toFixed(0)} / {s.nextXp}</span></b></div><div className="bar xp"><i style={{ width: `${Math.min(100, s.xp / s.nextXp * 100)}%` }}/></div></div><div className="hud-form"><div className="bar-label"><span>{s.form ? 'FLAREBOUND / ACTIVE' : 'DRIVE · F TO TRANSFORM'}</span><b>{Math.floor(s.drive)} / 100</b></div><div className="bar drive"><i style={{ width: `${s.drive}%` }}/></div></div></div>
    <div className="hud-abilities"><Cooldown label="SHIFT / DASH" seconds={s.dashCooldown}/><Cooldown label="Q / IMPACT" seconds={s.qCooldown}/><Cooldown label="E / FRACTURE LANCE" seconds={s.beamCooldown} max={7}/><Cooldown label="R / NOVA BLOOM" seconds={s.sphereCooldown} max={16}/><div className={`cooldown ${!s.form && s.drive < 65 ? 'cooling' : ''}`} data-testid="cd-f"><span><em>F</em><u> / FORM</u></span><b>{s.form ? 'ACTIVE' : s.formCooldown > 0 ? `${s.formCooldown.toFixed(1)}s` : s.drive >= 65 ? 'READY' : 'CHARGE'}</b></div></div></div>
    <div className="hud-build-tag">B00 · TECHNICAL ART PLACEHOLDERS · SEED {s.seed}</div>
  </div>;
}
