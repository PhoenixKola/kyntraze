import { ASH_E, ASH_FORM_INFO, ASH_Q, ASH_R, ASH_V } from '../../content/renEclipse';
import { REN_E, REN_FORM_INFO, REN_Q, REN_R, REN_V } from '../../content/renCombat';
import { SORA_E, SORA_FORM_INFO, SORA_Q, SORA_R, SORA_V } from '../../content/soraCombat';
import { VEX1_Q, VEX2_Q, VEX_FORM_INFO } from '../../content/vexCombat';
import { ultArt } from '../../b22/artIcons';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { UiSnapshot } from '../../bridge/UiSnapshot';
import { roundedTime } from '../../core/Math';
import { RULES } from '../../core/Rules';
import type { BossHud } from '../../bridge/UiSnapshot';
import { Minimap } from './Minimap';
import { LivingHud } from './LivingHud';
import { FormSelector } from './FormSelector';
import type { RunHud } from '../../bridge/UiSnapshot';
import { ASSET_BASE } from '../assetBase';
import { CONTRACT_BY_ID } from '../../content/meta';
import { HERO_KIT, REN, SORA } from '../../content/heroKits';
import type { AbilityTip } from '../../bridge/abilityTips';
import { ABILITY_KEYS } from '../../bridge/abilityView';
import { OD, SIG } from '../../content/kaiCombat';

interface Props { s: UiSnapshot; pad: boolean; onPause: () => void; reduced?: boolean; onForm?: (f: 1 | 2 | 3, confirm: boolean) => void; onKey?: (code: string) => void; }
const SLOT_KEY: Record<string, string> = { sig: 'KeyV', od: 'KeyG', shift: 'ShiftLeft', q: 'KeyQ', e: 'KeyE', r: 'KeyR', f: 'KeyF' };

const icon = (name: string) => `url(${ASSET_BASE}ui/icons/${name}.png)`;
const pct = (v: number) => `${Math.max(0, Math.min(100, v))}%`;

interface SlotProps { idp?: string; id: string; name: string; ico: string; keyLabel: string; padLabel: string; pad: boolean; seconds: number; max: number; state?: 'active' | 'locked' | 'ready'; tone?: string; text?: string; /** 0..1 Silver Rift charge, drawn as a thin bar inside the tile */ charge?: number; tip?: AbilityTip; onUse?: (code: string) => void; /** a form shift is settling: no ready / cast flourishes on any tile */ quiet?: boolean }
/** One ability tile: silhouette icon, a clockwise dark sweep that shrinks as the cooldown ends (readable without reading the number), a seconds readout and the key / pad glyph. */
type BarView = Pick<UiSnapshot, (typeof ABILITY_KEYS)[number]>;
/** One fighter's ability row: dash, Q, E, R, F with real cooldown sweeps, charge / active state and tooltips. Used for the first player and (compact, no click) for the second co-op fighter. */
const BEAST: Record<string, string> = { kai1: 'flare', kai2: 'comet', kai3: 'still', ren1: 'fox', sora1: 'phoenix', vex1: 'guard1', vex2: 'guard2' };
/** B30.1: the Overdrive mantle. One authored beast per transformed form, split into tail / body / head segments that move on their own clocks, drawn OUTSIDE the ability row and only while Overdrive is actually running (odT > 0). Leaves with a short fade. Pure decoration: no pointer events, no state of its own beyond in / out. */
function Mantle({ k, on, compact }: { k: string; on: boolean; compact: boolean }) {
  const [vis, setVis] = useState<'off' | 'in' | 'out'>('off'), last = useRef(k);
  useEffect(() => { if (on) { last.current = k; setVis('in'); } else setVis(v => (v === 'in' ? 'out' : 'off')); }, [on, k]);
  useEffect(() => { if (vis !== 'out') return; const t = window.setTimeout(() => setVis('off'), 520); return () => window.clearTimeout(t); }, [vis]);
  const name = BEAST[last.current]; if (vis === 'off' || !name) return null;
  const src = `${ASSET_BASE}ui/hud/beast_${name}.webp`;
  return <div className={`mantle ${vis} b-${name} ${compact ? 'compact' : ''}`} aria-hidden="true" data-testid="od-mantle" data-beast={name}>{compact ? <img className="seg whole" src={src} alt="" draggable={false}/> : <><img className="seg tail" src={src} alt="" draggable={false}/><img className="seg body" src={src} alt="" draggable={false}/><img className="seg head" src={src} alt="" draggable={false}/></>}</div>;
}
const FORM_KEY = (hero: string, form: number) => `${hero}${form}`;
export function AbilityBar({ s, pad, onKey, prefix = '', compact = false, reduced = false }: { s: BarView; pad: boolean; onKey?: (code: string) => void; prefix?: string; compact?: boolean; reduced?: boolean }) {
  const [xf, setXf] = useState<0 | 1 | 2>(0), prevForm = useRef<number | null>(null);
  useEffect(() => { const p = prevForm.current; prevForm.current = s.form; if (p === null || p === s.form) return; setXf(s.form === 0 ? 2 : 1); const t = window.setTimeout(() => setXf(0), 850); return () => window.clearTimeout(t); }, [s.form]);
  const KL = compact ? { shift: 'ENTER', q: ',', e: '.', r: '/', f: ';', sig: "'", od: '\\' } : { shift: 'SHIFT', q: 'Q', e: 'E', r: 'R', f: 'F', sig: 'V', od: 'G' };
  const T = s.tips, hk = s.hero !== 'kai' ? HERO_KIT[s.hero] : null, H = s.hero === 'vex' ? 'ren' : s.hero, U = s.hero, rf = s.hero === 'ren' && s.form >= 1, af = s.hero === 'ren' && s.form === 2, RI = af ? ASH_FORM_INFO : REN_FORM_INFO, sf = s.hero === 'sora' && s.form >= 1, vx = s.hero === 'vex' && s.form >= 1, VF = vx ? VEX_FORM_INFO[s.form === 2 ? 2 : 1] : null, vi = s.form === 2 ? 'vex_cf_2' : 'vex_cf_1';   // rf: Ren's Crimson Ascendant kit (B26)
  const canForm = hk ? s.heroReady : !s.form && s.drive >= RULES.formCharge && s.formCooldown <= 0;
  const KQ = [{ name: 'Surge Step', ico: 'kai_surge' }, { name: 'Scatter Burst', ico: 'kai_scatter' }, { name: 'Meteor Drive', ico: 'kai_meteor' }, { name: 'Silver Echo', ico: 'kai_echo' }] as const;
  const f2 = s.form === 2, f3 = s.form === 3, comet = s.cometReady && !s.cinema, apex = s.apexReady && !s.cinema;
  const quiet = xf !== 0;
  return (<div className={`hud-slots ${compact ? 'compact' : ''} ${s.form ? 'tf' : ''} ${xf === 1 ? 'xform' : xf === 2 ? 'xexit' : ''} ${reduced ? 'fx-off' : ''}`} data-hero={s.hero} data-form={FORM_KEY(s.hero, s.form)} role="group" aria-label={compact ? 'Player 2 abilities' : 'Abilities'} data-testid={`slots-${prefix || 'p1'}`}>
    <Slot quiet={quiet} idp={prefix} id="shift" tip={T?.dash} onUse={onKey} name="Dash" ico="dash" keyLabel={KL.shift} padLabel="A" pad={pad} seconds={s.dashLeft > 0 ? 0 : s.dashCooldown} max={s.cdMax.dash} text={s.dashMax > 1 ? `x${s.dashLeft}` : undefined}/>
    <Slot quiet={quiet} idp={prefix} id="q" tip={T?.q} onUse={onKey} name={rf ? (af ? ASH_Q.name : REN_Q.name) : sf ? SORA_Q.name : vx ? VF!.q.name : hk ? hk.act.q : KQ[s.form].name} ico={rf ? (af ? 'ren2_q' : 'ren_cf_cyclone') : sf ? 'sora_cf_prison' : vx ? (s.form === 1 ? 'vex_cf_mirror' : 'vex_cf_legion') : hk ? `${U}_q` : KQ[s.form].ico} keyLabel={KL.q} padLabel="X" pad={pad} seconds={s.qCooldown} max={hk ? (H === 'ren' ? (vx ? (s.form === 1 ? VEX1_Q.cooldown : VEX2_Q.cooldown) : rf ? (af ? ASH_Q.cooldown : REN_Q.cooldown) : REN.q.cooldown) : sf ? SORA_Q.cooldown : SORA.q.cooldown) : s.cdMax.q} state={!hk && (s.kit.surge > 0 || s.kit.cloneLife > 0 || s.kit.beat > 0) ? 'active' : undefined} text={!hk && s.kit.beat > 0 ? `${s.kit.beat}/3` : !hk && s.kit.surge > 0 ? `${Math.ceil(s.kit.surge)}s` : !hk && s.kit.cloneLife > 0 ? `${Math.ceil(s.kit.cloneLife)}s` : undefined}/>
    {hk ? <Slot quiet={quiet} idp={prefix} id="e" tip={T?.e} onUse={onKey} name={rf ? `${af ? ASH_E.name : REN_E.name} - ${RI.e.text}` : sf ? `${SORA_E.name} - ${SORA_FORM_INFO.e.text}` : vx ? `${VF!.e.name} - ${VF!.e.text}` : `${hk.act.e} - ${hk.blurbs.e}`} ico={rf ? (af ? 'ren2_e' : 'ren_cf_rampage') : sf ? 'sora_cf_spear' : vx ? (s.form === 1 ? 'vex_cf_execution' : 'vex_cf_sever') : `${U}_e`} keyLabel={KL.e} padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.beam} charge={H === 'sora' ? s.lanceCharge : 0} state={H === 'sora' && s.lanceCharge > 0 ? 'active' : undefined} text={H === 'sora' && s.lanceCharge > 0 ? `T${s.lanceTier + 1}` : undefined}/> : s.form === 1 ? <Slot quiet={quiet} idp={prefix} id="e" tip={T?.e} onUse={onKey} name="Rising Flare - four fire pillars erupt along the lane" ico="kai_rise" keyLabel={KL.e} padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.flare}/> : f3 ? <Slot quiet={quiet} idp={prefix} id="e" tip={T?.e} onUse={onKey} name="Silver Rift - Lance cards apply: damage, width, cooldown, beam time, Drive per hit" ico="rift" keyLabel={KL.e} padLabel="RB" pad={pad} seconds={s.riftCooldown} max={s.cdMax.rift} charge={s.riftCharge} state={s.riftCharge > 0 ? 'active' : undefined} text={s.riftCharge > 0 ? 'HOLD' : undefined}/> : f2 ? <Slot quiet={quiet} idp={prefix} id="e" tip={T?.e} onUse={onKey} name="Dragonfang Rush" ico="dragon" keyLabel={KL.e} padLabel="RB" pad={pad} seconds={s.dragonCooldown} max={s.cdMax.dragon}/> : <Slot quiet={quiet} idp={prefix} id="e" tip={T?.e} onUse={onKey} name="Fracture Lance" ico="lance" keyLabel={KL.e} padLabel="RB" pad={pad} seconds={s.beamCooldown} max={s.cdMax.beam}/>}
    {hk ? <Slot quiet={quiet} idp={prefix} id="r" tip={T?.r} onUse={onKey} name={rf ? `${af ? ASH_R.name : REN_R.name} - ${RI.r.text}` : sf ? `${SORA_R.name} - ${SORA_FORM_INFO.r.text}` : vx ? `${VF!.r.name} - ${VF!.r.text}` : `${hk.act.r} - ${hk.blurbs.r}`} ico={rf ? (af ? 'ren2_r' : 'ren_cf_catastrophe') : sf ? 'sora_cf_collapse' : vx ? (s.form === 1 ? 'vex_cf_oath' : 'vex_cf_domain') : `${U}_r`} keyLabel={KL.r} padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.sphere}/> : s.form === 1 ? <Slot quiet={quiet} idp={prefix} id="r" tip={T?.r} onUse={onKey} name="Sunfall Crucible - a solar zone that pulses, then erupts" ico="kai_crucible" keyLabel={KL.r} padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.crucible} state={s.kit.crucible ? 'active' : undefined} text={s.kit.crucible ? 'LIVE' : undefined}/> : f3 ? <Slot quiet={quiet} idp={prefix} id="r" tip={T?.r} onUse={onKey} name="Instinct Reversal - Nova cards apply: damage, reach, cooldown, extra strikes (Afterglow +1, Twin Bloom +2)" ico="reversal" keyLabel={KL.r} padLabel="LB" pad={pad} seconds={s.reversalCooldown} max={s.cdMax.reversal}/> : f2 ? <Slot quiet={quiet} idp={prefix} id="r" tip={T?.r} onUse={onKey} name="Cometbreaker Cannon" ico="comet" keyLabel={KL.r} padLabel="LB" pad={pad} seconds={s.cometCooldown} max={s.cdMax.comet}/> : <Slot quiet={quiet} idp={prefix} id="r" tip={T?.r} onUse={onKey} name="Nova Bloom" ico="nova" keyLabel={KL.r} padLabel="LB" pad={pad} seconds={s.sphereCooldown} max={s.cdMax.sphere}/>}
    {f3 && <Slot quiet={quiet} idp={prefix} id="evade" name="Perfect Evasion - automatic sidestep, one hit refused, 9 s recharge" ico="evasion" keyLabel="AUTO" padLabel="AUTO" pad={pad} seconds={s.evadeCooldown} max={s.cdMax.evade} state={s.evadeCooldown > 0 ? undefined : 'ready'} text={s.evadeCooldown > 0 ? undefined : 'READY'}/>}
    {hk ? <Slot quiet={quiet} idp={prefix} id="f" tip={T?.f} onUse={onKey} tone="tone-f1" name={af ? 'Ashen Eclipse - Crimson Ascendant is one press of F away (Shift costs Drive)' : `${hk.form} - ${hk.blurbs.form}`} ico={af ? 'ren2_form' : `${U}_f`} keyLabel={KL.f} padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={s.cdMax.form} state={s.form ? 'active' : s.heroReady ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : s.heroReady ? 'GO' : s.formCooldown > 0 ? undefined : !s.heroFormUnlocked ? 'SEALED' : `${Math.floor(s.drive)}%`}/> : <Slot quiet={quiet} idp={prefix} id="f" tip={T?.f} onUse={onKey} tone={f3 || apex ? 'tone-f3' : f2 || comet ? 'tone-f2' : s.form ? 'tone-f1' : undefined} name={f3 ? 'Stillfire Apex form' : apex ? 'Stillfire Apex ready' : f2 || comet ? 'Cometheart form' : 'Flarebound form'} ico={f3 || apex ? 'form3' : f2 || comet || (s.cometUnlocked && !s.form) ? 'form2' : 'form'} keyLabel={KL.f} padLabel="Y" pad={pad} seconds={s.form ? 0 : s.formCooldown} max={s.cdMax.form}
      state={s.form >= 2 ? 'active' : comet || apex ? 'ready' : s.form ? 'active' : canForm ? 'ready' : s.formCooldown > 0 ? undefined : 'locked'} text={s.form ? 'ON' : apex ? 'III' : comet ? 'II' : canForm ? 'GO' : s.formCooldown > 0 ? undefined : `${Math.floor(s.drive)}%`}/>}
    {(!hk || s.hero === 'ren' || s.hero === 'sora' || s.hero === 'vex') && <Slot quiet={quiet} idp={prefix} id="sig" tone="tone-sig" name={s.hero === 'vex' ? (vx ? `${VF!.v.name} - ${VF!.v.text}` : 'Vex signature - transform to unlock') : s.hero === 'sora' ? (sf ? `${SORA_V.name} - ${SORA_FORM_INFO.v.text}` : `${SORA_V.name} - transform to unlock`) : s.hero === 'ren' ? (rf ? `${af ? ASH_V.name : REN_V.name} - ${RI.v.text}` : `${REN_V.name} - transform to unlock`) : s.form === 1 ? 'Solar Vortex - hold to charge a rotating solar sphere, release to lunge and detonate it (hold V)' : s.form === 2 ? 'Thunderstar Breaker - hold to charge a lightning-wrapped star, release to lunge and break (hold V)' : s.form === 3 ? 'Singularity Palm - hold to gather a silver singularity, release to blink in and implode (hold V)' : 'Signature technique - transform to unlock'} ico={rf ? (af ? 'ren2_v' : 'ren_cf_nova_fist') : sf ? 'sora_cf_devastation' : vx ? (s.form === 1 ? 'vex_cf_fang' : 'vex_cf_horizon') : `sig_${s.form || 1}`} keyLabel={KL.sig} padLabel="RT" pad={pad} seconds={s.form ? s.sigCd : 0} max={SIG.cooldown} charge={s.sigCharge} state={s.sigTier >= 0 ? 'active' : s.form === 0 ? 'locked' : s.sigCd <= 0 ? 'ready' : undefined} text={s.sigTier >= 0 ? `T${s.sigTier + 1}` : s.form && s.sigCd <= 0 ? 'READY' : undefined} onUse={onKey}/>}
    {(!hk || s.hero === 'ren' || s.hero === 'sora' || s.hero === 'vex') && <Slot quiet={quiet} idp={prefix} id="od" tone="tone-od" name={s.hero === 'vex' ? (vx ? `${VF!.od.name} - ${VF!.od.text}` : 'Primal Overdrive - transform to unlock') : s.hero === 'sora' ? `${SORA_FORM_INFO.od.name} - ${SORA_FORM_INFO.od.text}` : s.hero === 'ren' ? `${RI.od.name} - ${RI.od.text}` : 'Primal Overdrive - fight while transformed to fill the meter, then press G to unleash the spectral dragon'} ico={rf ? (af ? 'ren2_od' : 'ren_cf_overdrive') : sf ? 'sora_cf_overdrive' : vx ? vi + '_guard' : 'overdrive'} keyLabel={KL.od} padLabel="B" pad={pad} seconds={0} max={1} charge={s.odT > 0 ? s.odT / OD.duration : s.odMeter / 100} state={s.odT > 0 ? 'active' : s.form > 0 && s.odMeter >= 100 ? 'ready' : 'locked'} text={s.odT > 0 ? `${Math.ceil(s.odT)}s` : s.form > 0 && s.odMeter >= 100 ? 'READY' : `${Math.floor(s.odMeter)}%`} onUse={onKey}/>}
      <Mantle k={FORM_KEY(s.hero, s.form)} on={s.odT > 0} compact={compact}/>
  </div>);
}

function Slot({ idp, id, name, ico, keyLabel, padLabel, pad, seconds, max, state, tone, text, charge, tip, onUse, quiet = false }: SlotProps) {
  const cooling = seconds > 0 && state !== 'active';
  const cls = state === 'active' ? 'active' : state === 'locked' ? 'locked' : cooling ? 'cooling' : 'ready';
  const style = { '--ico': icon(ico), '--p': `${Math.min(1, seconds / max) * 360}deg`, '--r': Math.min(1, seconds / max) } as CSSProperties;
  const live = !!onUse, code = SLOT_KEY[id];
  const prev = useRef<{ cooling: boolean; seconds: number } | null>(null), timer = useRef(0), [fx, setFx] = useState('');
  const flash = (k: string, ms: number) => { setFx(k); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setFx(''), ms); };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // Cosmetic edges only: unavailable -> ready, and a cooldown that just started (an accepted cast). Nothing fires on first mount or while a form shift is settling.
  useEffect(() => {
    const p = prev.current; prev.current = { cooling, seconds };
    if (!p || quiet) return;
    if (p.cooling && !cooling && state !== 'locked') flash('ready', 360);
    else if (!p.cooling && cooling && seconds > 0.4 && p.seconds <= 0.05) flash('cast', 160);
  }, [cooling, seconds, state, quiet]);
  const use = () => { if (!live || !code) return; if (cls === 'cooling' || cls === 'locked') flash('deny', 170); onUse?.(code); };
  return <div className={`slot ${cls} ${tone ?? ''} ${ico.startsWith('ren_cf_') || ico.startsWith('ren2_') || ico.startsWith('sora_cf_') || ico.startsWith('vex_cf_') ? 'art' : ''} ${fx ? `fx-${fx}` : ''} ${live ? '' : 'passive'}`} data-ico={ico} data-slot={id} style={style} data-testid={`cd-${idp ?? ''}${id}`} title={`${tip?.name ?? name}`} role={live ? 'button' : 'img'} tabIndex={live ? 0 : -1} aria-label={`${tip?.name ?? name}: ${text ?? (cooling ? `${seconds.toFixed(1)} seconds` : 'ready')}.${live ? ' Click to use.' : ''}`} onMouseDown={e => e.preventDefault()} onClick={e => { use(); e.currentTarget.blur(); }} onMouseLeave={e => e.currentTarget.blur()} onKeyDown={e => { if (e.key === 'Enter') use(); }}>
    <span className="slot-ico" aria-hidden="true"/>{!!charge && <i className="slot-charge" style={{ width: pct(Math.min(1, charge) * 72) }} aria-hidden="true"/>}{cooling && <span className="slot-sweep" aria-hidden="true"/>}<i className="slot-ring" aria-hidden="true"/>{state === 'locked' && <i className="slot-lock" aria-hidden="true"/>}
    {cooling && <b className="slot-num">{seconds >= 10 ? Math.ceil(seconds) : seconds.toFixed(1)}</b>}{!cooling && text && <b className="slot-tag">{text}</b>}
    <kbd className={pad ? 'pad-key' : ''}>{pad ? padLabel : keyLabel}</kbd>
    <span className="slot-tip" role="tooltip" data-testid={`tip-${id}`}>
      <span className="tip-head"><span className="tip-ico" aria-hidden="true"/><span className="tip-title"><strong>{tip?.name ?? name}</strong>{cooling && <em>READY IN {seconds.toFixed(1)}s</em>}</span><kbd className={`tip-key ${pad ? 'pad-key' : ''}`}>{pad ? (tip?.pad ?? padLabel) : (tip?.key ?? keyLabel)}</kbd></span>
      {tip && <span className="tip-blurb">{tip.blurb}</span>}{tip && <span className="tip-stats">{tip.stats.map(([k, v]) => <span key={k}><b>{k}</b><i>{v}</i></span>)}</span>}<small>{live ? 'CLICK OR PRESS TO USE' : id === 'evade' ? 'PASSIVE · AUTOMATIC' : 'READ-ONLY'}</small></span>
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
      {b.parts.length > 0 && <div className="boss-parts" data-testid="boss-parts">{b.parts.map(p => <span key={p.id} className={`bp bp-${p.role}`} title={p.role}><em>{p.role.toUpperCase()}</em><i style={{ width: pct(p.hp / p.maxHp * 100) }}/></span>)}{b.shielded && <u>CORE SHIELDED</u>}</div>}
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
  const hit = useHitVignette(s);
  const hpFrac = s.hp / s.maxHp, low = hpFrac <= 0.3;
  const hk = s.hero !== 'kai' ? HERO_KIT[s.hero] : null, U = s.hero;   // U = whose UI art to show
  const canForm = hk ? s.heroReady : !s.form && s.drive >= RULES.formCharge && s.formCooldown <= 0;
  const f2 = s.form === 2, f3 = s.form === 3, comet = s.cometReady && !s.cinema, apex = s.apexReady && !s.cinema, fullName = hk ? (s.form ? (s.hero === 'vex' && s.form === 2 && hk.form2 ? hk.form2 : hk.form).toUpperCase() : s.heroReady ? `${hk.formShort} READY` : s.heroFormUnlocked ? 'DRIVE' : 'DRIVE · SEALED') : f3 ? 'STILLFIRE APEX' : f2 ? 'COMETHEART' : apex ? 'STILLFIRE READY' : s.form ? 'FLAREBOUND' : comet ? 'COMETHEART READY' : canForm ? 'FORM READY' : 'DRIVE';
  return <div className={`hud ${s.hero === 'vex' ? 'hero-vex' : ''}`} data-testid="hud">
    {hit.n > 0 && <div key={hit.n} className={`hit-vignette ${reduced ? 'calm' : ''}`} data-testid="hit-vignette" style={{ '--k': hit.k } as CSSProperties} aria-hidden="true"/>}
    {s.sinceRevive < 1 && <div className="revive-flash" aria-hidden="true"/>}
    <div className={`hud-panel hud-health ${s.partner ? '' : 'solo'}`} data-hero={s.hero} data-form={`${s.hero}${s.form}`}>
      <div className={`portrait ${s.form ? 'is-form' : ''} ${f2 ? 'is-form2' : ''} ${f3 ? 'is-form3' : ''}`}><img src={hk ? `${ASSET_BASE}ui/heroes/${U}-portrait-${s.hero === 'vex' && s.form === 2 ? 'f2' : s.form ? 'f1' : 'base'}.webp` : `${ASSET_BASE}ui/kai-portrait-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.png`} alt="" draggable={false}/><img className="crest" src={hk ? `${ASSET_BASE}ui/heroes/${U}-crest-${s.form ? 'form' : 'base'}.webp` : `${ASSET_BASE}ui/kit/crest-${f3 ? 'f3' : f2 ? 'f2' : s.form ? 'f1' : 'base'}.webp`} alt="" draggable={false}/><span className="lvl" aria-label={`Level ${s.level}`}>{s.level}</span>{!s.partner && <i className="lvl-ring" aria-hidden="true"/>}{!s.partner && s.odT > 0 && BEAST[`${s.hero}${s.form}`] && <i className="od-sigil" aria-hidden="true" style={{ backgroundImage: `url(${ASSET_BASE}ui/hud/beast_${BEAST[`${s.hero}${s.form}`]}.webp)` }}/>}{s.revives > 0 && <span className="revive-badge" style={{ '--ico': icon('heart') } as CSSProperties} title="Second Wind ready" aria-label="Second Wind ready"/>}</div>
      <div className="vitals">
        <div className={`bar-hp ${low ? 'low' : ''}`} role="progressbar" aria-label="Health" aria-valuenow={Math.ceil(s.hp)} aria-valuemax={Math.ceil(s.maxHp)}>
          <i className="trail" style={{ width: pct(hpFrac * 100) }}/><i className="fill" style={{ width: pct(hpFrac * 100) }}/>
          <span className="hp-num"><span className="hp-ico" style={{ '--ico': icon('heart') } as CSSProperties}/>{Math.ceil(s.hp)}<em>/{Math.ceil(s.maxHp)}</em></span>
        </div>
        <div className={`bar-xp ${s.xp / s.nextXp > 0.85 ? 'near' : ''}`} role="progressbar" aria-label="Experience" aria-valuenow={Math.floor(s.xp)} aria-valuemax={s.nextXp}><i style={{ width: pct(s.xp / s.nextXp * 100) }}/><span><b>LV {s.level}</b><em>{Math.floor(s.xp)}/{s.nextXp}</em></span></div>
        <div className={`bar-form ${s.form ? 'on' : canForm ? 'ready' : ''} ${f2 ? 'form2' : ''} ${f3 ? 'form3' : ''} ${comet ? 'comet-ready' : ''} ${apex ? 'apex-ready' : ''}`} role="progressbar" aria-label="Transformation drive" aria-valuenow={Math.floor(s.drive)} aria-valuemax={100} title={s.apexUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart or Stillfire Apex; F opens the form picker (1-2-3 / A-D, F confirms; F F = last form).' : s.cometUnlocked ? 'Drive 65%: F = Flarebound. Full Drive: F = Cometheart (Form II).' : 'Drive 65%: F = Flarebound.'}>
          <i style={{ width: pct(s.drive) }}/>{!hk && <u style={{ left: `${RULES.formCharge}%` }}/>}{(s.cometUnlocked || s.apexUnlocked) && <u className="tick2" style={{ left: '99%' }}/>}
          <span>{fullName}</span>
        </div>
      </div>
    </div>
    {s.partner && <div className={`hud-panel hud-partner ${s.partner.down ? 'down' : ''} ${s.partner.out ? 'out' : ''}`} data-testid="hud-partner" data-hero={s.partner.hero} aria-label="Player 2">
      <header className="pp-head"><span className="pp-tag">P2</span><b>{s.partner.hero.toUpperCase()}</b><span className="pp-lv">LV {s.partner.level}</span>
        <span className={`pp-state ${s.partner.out ? 'out' : s.partner.down ? 'down' : s.partner.form ? 'form' : ''}`}>{s.partner.out ? 'OUT' : s.partner.down ? `DOWN ${Math.round(s.partner.revive * 100)}%` : s.partner.form ? 'TRANSFORMED' : ''}</span></header>
      <div className="pp-hp" role="progressbar" aria-label="Partner health" aria-valuenow={Math.ceil(s.partner.hp)} aria-valuemax={Math.ceil(s.partner.maxHp)}><i style={{ width: pct(s.partner.hp / s.partner.maxHp * 100) }}/><span>{Math.ceil(s.partner.hp)} / {Math.ceil(s.partner.maxHp)}</span></div>
      <div className="pp-mini">
        <div className="pp-xp" role="progressbar" aria-label="Partner experience" aria-valuenow={Math.floor(s.partner.xp)} aria-valuemax={s.partner.nextXp}><i style={{ width: pct(s.partner.xp / Math.max(1, s.partner.nextXp) * 100) }}/><span>XP</span></div>
        <div className={`pp-drive ${s.partner.form ? 'on' : ''}`} role="progressbar" aria-label="Partner transformation drive" aria-valuenow={Math.floor(s.partner.drive)} aria-valuemax={100}><i style={{ width: pct(s.partner.form ? 100 : s.partner.drive) }}/><span>{s.partner.form ? `FORM ${s.partner.form}` : 'DRIVE'}</span></div>
      </div>
      {s.partner.bar && <AbilityBar s={s.partner.bar} pad={pad} prefix="p2-" compact/>}
      {s.party && <u className={`res-bar ${s.party.resonanceT > 0 ? 'live' : ''}`} title="Resonance: earned by fighting together"><i style={{ width: pct(s.party.resonance) }}/></u>}</div>}
    <FormSelector hero={s.hero} open={s.selector.open} pick={s.selector.pick} choices={s.selector.choices} left={s.selector.left} pad={pad} onHover={f => onForm?.(f, false)} onChoose={f => onForm?.(f, true)}/>
    {s.boss && <BossBar b={s.boss}/>}
    {s.lf && <LivingHud lf={s.lf}/>}
    <Minimap map={s.map} boss={!!s.boss}/>
    <div className="hud-panel hud-clock b30-strip"><span className="clock-label"><i aria-hidden="true"/>{s.arenaName}<i aria-hidden="true"/></span><b>{roundedTime(s.seconds)}</b>
      <div className="clock-row"><span className="clock-kills" aria-label={`${s.kills} defeated`}><i/> {s.kills}<small>defeated</small></span>{(s.run.objText || s.run.nextLabel) && <><span className="clock-sep" aria-hidden="true"/>{s.run.objText ? <em className="clock-next obj" data-testid="hud-objective">{s.run.objText}</em> : <em className={`clock-next ${s.run.nextIn < 30 && s.run.nextIn > 0 ? 'soon' : ''}`}>{s.run.nextIn > 0 ? `${s.run.nextLabel} in ${mmss(s.run.nextIn)}` : s.run.nextLabel}</em>}</>}</div>
      <RunTrack r={s.run}/>{s.contract && <span className="clock-contract" data-testid="hud-contract">CONTRACT · {CONTRACT_BY_ID[s.contract].name}</span>}</div>
    {s.run.announce && !s.boss && <div className="finale-banner" data-testid="finale-banner" role="alert"><b>{s.run.announce.text}</b><span>{s.run.announce.sub}</span></div>}
    {s.phase === 'victory' && !s.victoryShown && <div className="victory-banner" data-testid="victory-banner" role="status"><b>THE FRACTURE HOLDS</b><span>NULL SERAPH DEFEATED</span></div>}
    <button className="hud-panel hud-pause" onClick={onPause} aria-label="Pause game"><span className="pause-bars"/><kbd className={pad ? 'pad-key' : ''}>{pad ? 'START' : 'ESC'}</kbd></button>
    {s.asc?.ult && <div className={`hud-ult ${s.asc.ult.ready ? 'ready' : ''}`} data-testid="hud-ult" aria-label={`Ultimate ${s.asc.ult.name}`}><img className="hud-ult-icon" src={`${ASSET_BASE}art/b22/${ultArt(s.hero)}.png`} alt="" draggable={false} onError={e => { e.currentTarget.style.display = 'none'; }}/><b>{s.asc.ult.name.toUpperCase()}</b><span><i style={{ width: pct(s.asc.ult.charge) }}/></span><em>{s.asc.ult.active ? 'ACTIVE' : s.asc.ult.cd > 0 ? `${Math.ceil(s.asc.ult.cd)}s` : s.asc.ult.ready ? (pad ? 'PRESS LB' : 'PRESS R') : `${Math.floor(s.asc.ult.charge)}%`}</em></div>}
    {s.asc && s.asc.recipes.length > 0 && <aside className="hud-quest" data-testid="hud-recipes" aria-label="Legendary recipes"><h4><i aria-hidden="true"/>Legendary recipes</h4><ul>{s.asc.recipes.slice(0, 3).map(r => <li key={r.id} title={r.needs} className={r.met === r.total ? 'met' : ''}><span className="q-name">{r.name}</span><span className="q-pips" aria-hidden="true">{Array.from({ length: r.total }, (_, k) => <u key={k} className={k < r.met ? 'on' : ''}/>)}</span><b>{r.met}/{r.total}</b></li>)}</ul></aside>}
    <AbilityBar s={s} pad={pad} onKey={onKey} reduced={reduced}/>
  </div>;
}
