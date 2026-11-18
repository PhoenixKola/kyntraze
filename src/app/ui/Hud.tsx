import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { RULES } from '../../core/Rules';
import type { BossHud } from '../../bridge/UiSnapshot';
import { Minimap } from './Minimap';
import { FormSelector } from './FormSelector';
import type { RunHud } from '../../bridge/UiSnapshot';
import { ASSET_BASE } from '../assetBase';
import { CONTRACT_BY_ID } from '../../content/meta';
import { HERO_KIT, REN, SORA } from '../../content/heroKits';
import type { AbilityTip } from '../../bridge/abilityTips';

interface Props { s: UiSnapshot; pad: boolean; onPause: () => void; reduced?: boolean; onForm?: (f: 1 | 2 | 3, confirm: boolean) => void; onKey?: (code: string) => void; }
const SLOT_KEY: Record<string, string> = { shift: 'ShiftLeft', q: 'KeyQ', e: 'KeyE', r: 'KeyR', f: 'KeyF' };

const icon = (name: string) => `url(${ASSET_BASE}ui/icons/${name}.png)`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

interface SlotProps { id: string; name: string; ico: string; keyLabel: string; padLabel: string; pad: boolean; seconds: number; max: number; state?: 'active' | 'locked' | 'ready'; tone?: string; text?: string; /** 0..1 Silver Rift charge, drawn as a thin bar inside the tile */ charge?: number; tip?: AbilityTip; onUse?: (code: string) => void }
/** One ability tile: silhouette icon, a clockwise dark sweep that shrinks as the cooldown ends (readable without reading the number), a seconds readout and the key / pad glyph. */
function Slot({ id, name, ico, keyLabel, padLabel, pad, seconds, max, state, tone, text, charge, tip, onUse }: SlotProps) {
  const cooling = seconds > 0 && state !== 'active';
  const cls = state === 'active' ? 'active' : state === 'locked' ? 'locked' : cooling ? 'cooling' : 'ready';
  const style = { '--ico': icon(ico), '--p': `${Math.min(1, seconds / max) * 360}deg` } as CSSProperties;
  return <div className={`slot ${cls} ${tone ?? ''}`} data-ico={ico} style={style} data-testid={`cd-${id}`} role="button" tabIndex={0} aria-label={`${tip?.name ?? name}: ${text ?? (cooling ? `${seconds.toFixed(1)} seconds` : 'ready')}. Click to use.`} onClick={() => onUse?.(SLOT_KEY[id] ?? 'KeyQ')} onKeyDown={e => { if (e.key === 'Enter') onUse?.(SLOT_KEY[id] ?? 'KeyQ'); }}>
    <span className="slot-ico" aria-hidden="true"/>{!!charge && <i className="slot-charge" style={{ width: pct(charge * 100) }} aria-hidden="true"/>}{cooling && <span className="slot-sweep" aria-hidden="true"/>}
    {cooling && <b className="slot-num">{seconds >= 10 ? Math.ceil(seconds) : seconds.toFixed(1)}</b>}{!cooling && text && <b className="slot-tag">{text}</b>}
    <kbd className={pad ? 'pad-key' : ''}>{pad ? padLabel : keyLabel}</kbd>
    <span className="slot-tip" role="tooltip" data-testid={`tip-${id}`}><strong>{tip?.name ?? name}</strong><em>{pad ? (tip?.pad ?? padLabel) : (tip?.key ?? keyLabel)}{cooling ? ` · READY IN ${seconds.toFixed(1)}s` : ''}</em>{tip && <span className="tip-blurb">{tip.blurb}</span>}{tip && <span className="tip-stats">{tip.stats.map(([k, v]) => <span key={k}><b>{k}</b>{v}</span>)}</span>}<small>CLICK TO USE</small></span>
  </div>;
}

const CLASSIC_BOSS = new Set(['warden', 'seraph']);
const bossArt = (n: string) => `${ASSET_BASE}art/bosses/fx/${n.startsWith('emblem-') && !CLASSIC_BOSS.has(n.slice(7)) ? 'emblem-warden' : n}.png`;
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

export function Hud({ s, pad, onPause, reduced, onForm, onKey }: Props) {
  const T = s.tips;
  const hit = useHitVignette(s);
  const hpFrac = s.hp / s.maxHp, low = hpFrac <= 0.3;
  const hk = s.hero !== 'kai' ? HERO_KIT[s.hero] : null, H = s.hero === 'vex' ? 'ren' : s.hero;   // B22 interim: Vex borrows Ren's UI art (hue-shifted in CSS)
  const canForm = hk ? s.heroReady : !s.form && s.drive >= RULES.formCharge && s.formCooldown <= 0;
  const f2 = s.form === 2, f3 = s.form === 3, comet = s.cometReady && !s.cinema, apex = s.apexReady && !s.cinema, fullName = hk ? (s.form ? hk.form.toUpperCase() : s.heroReady ? `${hk.formShort} READY` : s.heroFormUnlocked ? 'DRIVE' : 'DRIVE · SEALED') : f3 ? 'STILLFIRE APEX' : f2 ? 'COMETHEART' : apex ? 'STILLFIRE READY' : s.form ? 'FLAREBOUND' : comet ? 'COMETHEART READY' : canForm ? 'FORM READY' : 'DRIVE';
  return <div className={`hud ${s.hero === 'vex' ? 'hero-vex' : ''}`} data-testid="hud">
    {hit.n > 0 && <div key={hit.n} className={`hit-vignette ${reduced ? 'calm' : ''}`} data-testid="hit-vignette" style={{ '--k': hit.k } as CSSProperties} aria-hidden="true"/>}
    {s.sinceRevive < 1 && <div className="revive-flash" aria-hidden="true"/>}
    <div className="hud-panel hud-health">
      <div className={`portrait ${s.form ? 'is-form' : ''} ${f2 ? 'is-form2' : ''} ${f3 ? 'is-form3' : ''}`}><img src={hk ? `${ASSET_BASE}ui/heroes/${H}-portrait-${s.form ? 'f1' : 'base'}.webp` : `${ASSET_BASE}ui/kai-portrait-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.png`} alt="" draggable={false}/><img className="crest" src={hk ? `${ASSET_BASE}ui/heroes/${H}-crest-${s.form ? 'form' : 'base'}.webp` : `${ASSET_BASE}ui/kit/crest-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.webp`} alt="" draggable={false}/><span className="lvl" aria-label={`Level ${s.level}`}>{s.level}</span>{s.revives > 0 && <span className="revive-badge" style={{ '--ico': icon('heart') } as CSSProperties} title="Second Wind ready" aria-label="Second Wind ready"/>}</div>
      <div className="vitals">
        <div className={`bar-hp ${low ? 'low' : ''}`} role="progressbar" aria-label="Health" aria-valuenow={Math.ceil(s.hp)} aria-valuemax={Math.ceil(s.maxHp)}>
          <i className="trail" style={{ width: pct(hpFrac * 100) }}/><i className="fill" style={{ width: pct(hpFrac * 100) }}/>
          <span className="hp-num"><span className="hp-ico" style={{ '--ico': icon('heart') } as CSSProperties}/>{Math.ceil(s.hp)}<em>/{Math.ceil(s.maxHp)}</em></span>
        </div>
        <div className={`bar-xp ${s.xp / s.nextXp > 0.85 ? 'near' : ''}`} role="progressbar" aria-label="Experience" aria-valuenow={Math.floor(s.xp)} aria-valuemax={s.nextXp}><i style={{ width: pct(s.xp / s.nextXp * 100) }}/><span><b>LV {s.level}</b><em>{Math.floor(s.xp)}/{s.nextXp}</em></span></div>
        <div className={`bar-form ${s.form ? 'on' : canForm ? 'ready' : ''} ${f2 ? 'form2' : ''} ${f3 ? 'form3' : ''} ${comet ? 'comet-ready' : ''} ${apex ? 'apex-ready' : ''}`} role="progressbar" aria-label="Transformation drive" aria-valuenow={Math.floor(s.drive)} aria-valuemax={100} title={s.apexUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart or (after 10:00) Stillfire Apex; F opens the form picker (1-2-3 / A-D, F confirms; F F = last form).' : s.cometUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart (Form II).' : 'Drive 65%: F = Flarebound.'}>
          <i style={{ width: pct(s.drive) }}/>{!hk && <u style={{ left: `${RULES.formCharge}%` }}/>}{(s.cometUnlocked || s.apexUnlocked) && <u className="tick2" style={{ left: '99%' }}/>}
          <span>{fullName}</span>
        </div>
      </div>
    </div>
    <FormSelector open={s.selector.open} pick={s.selector.pick} choices={s.selector.choices} left={s.selector.left} pad={pad} onHover={f => onForm?.(f, false)} onChoose={f => onForm?.(f, true)}/>
    {s.boss && <BossBar b={s.boss}/>}
    <Minimap map={s.map} boss={!!s.boss}/>
    <div className="hud-panel hud-clock"><span className="clock-label">{s.arenaName}</span><b>{roundedTime(s.seconds)}</b><span className="clock-kills"><i/> {s.kills}{s.run.nextLabel && <em className={`clock-next ${s.run.nextIn < 30 && s.run.nextIn > 0 ? 'soon' : ''}`}>{s.run.nextIn > 0 ? `${s.run.nextLabel} ${mmss(s.run.nextIn)}` : s.run.nextLabel}</em>}</span><RunTrack r={s.run}/>{s.contract && <span className="clock-contract" data-testid="hud-contract">CONTRACT · {CONTRACT_BY_ID[s.contract].name}</span>}</div>
    {s.run.announce && !s.boss && <div className="finale-banner" data-testid="finale-banner" role="alert"><b>{s.run.announce.text}</b><span>{s.run.announce.sub}</span></div>}
    {s.phase === 'victory' && !s.victoryShown && <div className="victory-banner" data-testid="victory-banner" role="status"><b>THE FRACTURE HOLDS</b><span>NULL SERAPH DEFEATED</span></div>}
    <button className="hud-panel hud-pause" onClick={onPause} aria-label="Pause game"><span className="pause-bars"/><kbd className={pad ? 'pad-key' : ''}>{pad ? 'START' : 'ESC'}</kbd></button>
    <div className="hud-slots" role="group" aria-label="Abilities">
      <Slot id="shift" tip={T?.dash} onUse={onKey} name="Dash" ico="dash" keyLabel="SHIFT" padLabel="A" pad={pad} seconds={s.dashCooldown} max={s.cdMax.dash}/>
      <Slot id="q" tip={T?.q} onUse={onKey} name={hk ? hk.act.q : 'Impact'} ico={hk ? `${H}_q` : 'impact'} keyLabel="Q" padLabel="X" pad={pad} seconds={s.qCooldown} max={hk ? (H === 'ren' ? REN.q.cooldown : SORA.q.cooldown) : 8.5}/>
      {hk ? <Slot id="e" tip={T?.e} onUse={onKey} name={`${hk.act.e} - ${hk.blurbs.e}`} ico={`${H}_e`} keyLabel="E" padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.beam} charge={H === 'sora' ? s.lanceCharge : 0} state={H === 'sora' && s.lanceCharge > 0 ? 'active' : undefined} text={H === 'sora' && s.lanceCharge > 0 ? `T${s.lanceTier + 1}` : undefined}/> : f3 ? <Slot id="e" tip={T?.e} onUse={onKey} name="Silver Rift - Lance cards apply: damage, width, cooldown, beam time, Drive per hit" ico="rift" keyLabel="E" padLabel="RB" pad={pad} seconds={s.riftCooldown} max={s.cdMax.rift} charge={s.riftCharge} state={s.riftCharge > 0 ? 'active' : undefined} text={s.riftCharge > 0 ? 'HOLD' : undefined}/> : f2 ? <Slot id="e" tip={T?.e} onUse={onKey} name="Dragonfang Rush" ico="dragon" keyLabel="E" padLabel="RB" pad={pad} seconds={s.dragonCooldown} max={s.cdMax.dragon}/> : <Slot id="e" tip={T?.e} onUse={onKey} name="Fracture Lance" ico="lance" keyLabel="E" padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.beam}/>}
      {hk ? <Slot id="r" tip={T?.r} onUse={onKey} name={`${hk.act.r} - ${hk.blurbs.r}`} ico={`${H}_r`} keyLabel="R" padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.sphere}/> : f3 ? <Slot id="r" tip={T?.r} onUse={onKey} name="Instinct Reversal - Nova cards apply: damage, reach, cooldown, extra strikes (Afterglow +1, Twin Bloom +2)" ico="reversal" keyLabel="R" padLabel="LB" pad={pad} seconds={s.reversalCooldown} max={s.cdMax.reversal}/> : f2 ? <Slot id="r" tip={T?.r} onUse={onKey} name="Cometbreaker Cannon" ico="comet" keyLabel="R" padLabel="LB" pad={pad} seconds={s.cometCooldown} max={s.cdMax.comet}/> : <Slot id="r" tip={T?.r} onUse={onKey} name="Nova Bloom" ico="nova" keyLabel="R" padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.sphere}/>}
      {f3 && <Slot id="evade" name="Perfect Evasion - automatic sidestep, one hit refused, 9 s recharge" ico="evasion" keyLabel="AUTO" padLabel="AUTO" pad={pad} seconds={s.evadeCooldown} max={s.cdMax.evade} state={s.evadeCooldown > 0 ? undefined : 'ready'} text={s.evadeCooldown > 0 ? undefined : 'READY'}/>}
      {hk ? <Slot id="f" tip={T?.f} onUse={onKey} tone="tone-f1" name={`${hk.form} - ${hk.blurbs.form}`} ico={`${H}_f`} keyLabel="F" padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={s.cdMax.form} state={s.form ? 'active' : s.heroReady ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : s.heroReady ? 'GO' : s.formCooldown > 0 ? undefined : !s.heroFormUnlocked ? 'SEALED' : `${Math.floor(s.drive)}%`}/> : <Slot id="f" tip={T?.f} onUse={onKey} tone={f3 || apex ? 'tone-f3' : f2 || comet ? 'tone-f2' : s.form ? 'tone-f1' : undefined} name={f3 ? 'Stillfire Apex form' : apex ? 'Stillfire Apex ready' : f2 || comet ? 'Cometheart form' : 'Flarebound form'} ico={f3 || apex ? 'form3' : f2 || comet || (s.cometUnlocked && !s.form) ? 'form2' : 'form'} keyLabel="F" padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={s.cdMax.form}
        state={s.form >= 2 ? 'active' : comet || apex ? 'ready' : s.form ? 'active' : canForm ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : apex ? 'III' : comet ? 'II' : canForm ? 'GO' : s.formCooldown > 0 ? undefined : `${Math.floor(s.drive)}%`}/>}
    </div>
  </div>;
}
