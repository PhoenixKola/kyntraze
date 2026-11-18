/** HUD ability tooltips: the real name, key, plain-words description and the numbers THIS run's build produces right now (after cards, branches and form). Pure read of the sim state. */
import type { GameState } from '../sim/GameState';
import { BEAM, SPHERE } from '../content/abilities';
import { HERO_KIT, REN, SORA, VEX } from '../content/heroKits';
import { ULTIMATES } from '../b22/mastery';

export interface AbilityTip { name: string; key: string; pad: string; blurb: string; stats: [string, string][] }
export type TipSlot = 'dash' | 'q' | 'e' | 'r' | 'f';
const n = (v: number, d = 0) => v.toFixed(d), cd = (v: number) => `${n(v, 1)}s`;
export function abilityTips(s: GameState): Record<TipSlot, AbilityTip> {
  const p = s.player, m = s.mods, f = p.form, q = p.qDamage, hk = s.hero === 'kai' ? null : HERO_KIT[s.hero];
  const dash: AbilityTip = { name: 'Dash', key: 'SHIFT / SPACE', pad: 'A', blurb: 'A short burst of movement. Brief invulnerability: dash through a hostile attack to dodge it.', stats: [['Cooldown', cd(3.2 * m.dashCd)], ['Distance', '~175 px'], ['Invulnerable', '0.25s']] };
  const ult = s.b22.ult.unlocked ? ` When the ULTIMATE gauge is full, R fires ${ULTIMATES[s.hero].name} instead.` : '';
  let qt: AbilityTip, et: AbilityTip, rt: AbilityTip, ft: AbilityTip;
  if (s.hero === 'kai') {
    qt = { name: 'Impact Pulse', key: 'Q', pad: 'X', blurb: 'A burst of force around Kai that hits every nearby enemy.', stats: [['Damage', n(q * (f ? 1.25 : 1))], ['Radius', `${n(p.qRadius * (f ? 1.25 : 1))} px`], ['Cooldown', cd(8.5)]] };
    if (f === 3) { et = { name: 'Silver Rift', key: 'E', pad: 'RB', blurb: 'Hold to charge, release to blink and cut a precise line. Lance cards apply.', stats: [['Cooldown', cd(s.mods.beamCd * 6)], ['Hold', 'longer = stronger']] }; rt = { name: 'Instinct Reversal', key: 'R', pad: 'LB', blurb: 'A chain of reversal strikes on nearby enemies. Nova cards apply.', stats: [['Cooldown', cd(s.mods.sphereCd * 14)]] }; }
    else if (f === 2) { et = { name: 'Dragonfang Rush', key: 'E', pad: 'RB', blurb: 'A comet-fist lunge that bites everything on its line.', stats: [['Cooldown', cd(8 * m.beamCd)], ['Damage', 'scales with Lance cards']] }; rt = { name: 'Cometbreaker Cannon', key: 'R', pad: 'LB', blurb: 'A huge cannon blast down your aim line.', stats: [['Cooldown', cd(16 * m.sphereCd)], ['Damage', 'scales with Nova cards']] }; }
    else { et = { name: 'Fracture Lance', key: 'E', pad: 'RB', blurb: 'A piercing blade of light that pulses along its path.', stats: [['Damage / pulse', n(BEAM.damage * m.beamDamage * (f ? BEAM.formDamage : 1), 1)], ['Pulses', n(5 + m.beamLinger)], ['Length', `${BEAM.length} px`], ['Cooldown', cd(BEAM.cooldown * m.beamCd)]] }; rt = { name: 'Nova Bloom', key: 'R', pad: 'LB', blurb: 'Gather energy, launch it, and detonate in a wide blast.' + ult, stats: [['Damage', n(SPHERE.damage * m.sphereDamage * (f ? SPHERE.formDamage : 1))], ['Radius', `${n(SPHERE.radius * m.sphereRadius * (f ? SPHERE.formRadius : 1))} px`], ['Cooldown', cd(SPHERE.cooldown * m.sphereCd)]] }; }
  } else if (s.hero === 'ren') {
    qt = { name: REN.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Damage / beat', n(q * REN.q.beatMul, 1)], ['Beats', n(f ? REN.q.formBeats : REN.q.beats)], ['Cooldown', cd(REN.q.cooldown)]] };
    et = { name: REN.e.name, key: 'E', pad: 'RB', blurb: hk!.blurbs.e, stats: [['Damage / strike', n(REN.e.damage * m.beamDamage)], ['Strikes', n((f ? REN.e.formHops : REN.e.hops) + m.beamLinger)], ['Cooldown', cd(REN.e.cooldown * m.beamCd)]] };
    rt = { name: REN.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage', n(REN.r.damage * m.sphereDamage * (f ? REN.r.formDamage : 1))], ['Radius', `${n(REN.r.radius * m.sphereRadius)} px`], ['Cooldown', cd(REN.r.cooldown * m.sphereCd)]] };
  } else if (s.hero === 'sora') {
    qt = { name: SORA.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Damage / bolt', n(q * SORA.q.boltMul, 1)], ['Bolts', n(f ? SORA.q.formBolts : SORA.q.bolts)], ['Cooldown', cd(SORA.q.cooldown)]] };
    et = { name: SORA.e.name, key: 'E (hold)', pad: 'RB (hold)', blurb: hk!.blurbs.e, stats: [['Damage', `${n(SORA.e.damage[0] * m.beamDamage)} / ${n(SORA.e.damage[1] * m.beamDamage)} / ${n(SORA.e.damage[2] * m.beamDamage)}`], ['Charge tiers', 'T1 / T2 / T3'], ['Cooldown', cd(SORA.e.cooldown * m.beamCd)]] };
    rt = { name: SORA.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage / orb', n(SORA.r.damage * m.sphereDamage * (f ? SORA.r.formDamage : 1))], ['Orbs', n(f ? SORA.r.formOrbs : SORA.r.orbs)], ['Cooldown', cd(SORA.r.cooldown * m.sphereCd)]] };
  } else {
    qt = { name: VEX.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Riposte damage', n(q * VEX.q.riposteMul)], ['Perfect window', `${n(VEX.q.perfect * (f === 1 ? VEX.q.formPerfect : 1), 2)}s`], ['Late guard', `-${Math.round(VEX.q.reduce * 100)}% damage`], ['Cooldown', cd(VEX.q.cooldown)]] };
    et = { name: VEX.e.name, key: 'E', pad: 'RB', blurb: hk!.blurbs.e, stats: [['Riposte damage', n(q * VEX.e.riposteMul * m.beamDamage)], ['Shift', `${n(VEX.e.distance * m.beamWidth)} px`], ['Cooldown', cd(VEX.e.cooldown * m.beamCd)]] };
    rt = { name: VEX.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage / mark', n(q * VEX.r.damage * m.sphereDamage)], ['Marks', `${VEX.r.marks} (1 boss)`], ['Cooldown', cd(VEX.r.cooldown * m.sphereCd)]] };
  }
  const formName = s.hero === 'kai' ? (f === 3 ? 'Stillfire Apex' : f === 2 ? 'Cometheart' : 'Flarebound') : f === 2 && hk?.form2 ? hk.form2 : hk?.form ?? 'Flarebound';
  ft = { name: s.hero === 'kai' ? 'Transform' : `${hk!.form}${hk!.form2 ? ' / ' + hk!.form2 : ''}`, key: 'F', pad: 'Y', blurb: hk ? hk.blurbs.form : 'Spend Drive to transform. Flarebound at 65% Drive; Cometheart and Stillfire Apex need a full gauge once unlocked. F opens a pick when several are ready.', stats: [['Drive', `${Math.floor(p.drive)}%`], ['Now', f ? formName : 'Base'], ...(s.hero === 'vex' ? [['Riftbound', s.b22.vex.forms[0] ? 'unlocked' : 'beat the Warden or Trial ch. 2'], ['Voidheart', s.b22.vex.forms[1] ? 'unlocked' : 'beat the Oathkeeper (Trial ch. 3)']] as [string, string][] : [])] };
  if (s.b22.ult.unlocked) rt.stats.push(['Ultimate', s.b22.ult.cd > 0 ? `cooling ${n(s.b22.ult.cd)}s` : `${Math.floor(s.b22.ult.charge)}% charged`]);
  return { dash, q: qt, e: et, r: rt, f: ft };
}
