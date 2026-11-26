/** HUD ability tooltips: the real name, key, plain-words description and the numbers THIS run's build produces right now (after cards, branches and form). Pure read of the sim state. */
import type { GameState } from '../sim/GameState';
import { BEAM, SPHERE } from '../content/abilities';
import { REN_E, REN_FORM_INFO, REN_Q, REN_R } from '../content/renCombat';
import { ASH_E, ASH_FORM_INFO, ASH_Q, ASH_R } from '../content/renEclipse';
import { SERA_E, SERA_FORM_INFO, SERA_Q, SERA_R } from '../content/soraSeraph';
import { SORA_E, SORA_FORM_INFO, SORA_Q, SORA_R } from '../content/soraCombat';
import { VEX1_E, VEX1_Q, VEX1_R, VEX2_E, VEX2_Q, VEX2_R, VEX_FORM_INFO } from '../content/vexCombat';
import { HERO_KIT, REN, SORA, VEX } from '../content/heroKits';
import { ULTIMATES } from '../b22/mastery';
import { CHAIN, CRUCIBLE, ECHO, METEOR, RISE, SCATTER, STRIKES, SURGE } from '../content/kaiKit';
import { REVERSAL, RIFT } from '../content/stillfire';

export interface AbilityTip { name: string; key: string; pad: string; blurb: string; stats: [string, string][] }
export type TipSlot = 'dash' | 'q' | 'e' | 'r' | 'f';
const n = (v: number, d = 0) => v.toFixed(d), cd = (v: number) => `${n(v, 1)}s`;
export function abilityTips(s: GameState): Record<TipSlot, AbilityTip> {
  const p = s.player, m = s.mods, f = p.form, q = p.qDamage, hk = s.hero === 'kai' ? null : HERO_KIT[s.hero];
  const dash: AbilityTip = { name: 'Dash', key: 'SHIFT / SPACE', pad: 'A', blurb: 'A short burst of movement. Brief invulnerability: dash through a hostile attack to dodge it.', stats: [['Cooldown', cd(3.2 * m.dashCd)], ['Distance', '~175 px'], ['Invulnerable', '0.25s']] };
  const ult = s.b22.ult.unlocked ? ` When the ULTIMATE gauge is full, R fires ${ULTIMATES[s.hero].name} instead.` : '';
  let qt: AbilityTip, et: AbilityTip, rt: AbilityTip, ft: AbilityTip;
  if (s.hero === 'kai') {
    const rScale = p.qRadius / 132, qd = q / 34;
    qt = f === 1 ? { name: SCATTER.name, key: 'Q', pad: 'X', blurb: 'Ten small ki blasts in rapid alternating volleys, spread across nearby enemies. Each one explodes on impact.', stats: [['Blasts', n(SCATTER.shots)], ['Damage / blast', n(q * SCATTER.damageMul * m.formPower, 1)], ['Blast radius', `${n(SCATTER.blast * rScale)} px`], ['Cooldown', cd(SCATTER.cooldown)]] }
      : f === 2 ? { name: METEOR.name, key: 'Q', pad: 'X', blurb: 'Three fast advancing strikes along your aim. Each beat is a real contact; the last hits harder.', stats: [['Damage / beat', n(q * METEOR.damageMul * m.formPower, 1)], ['Finisher', n(q * METEOR.damageMul * METEOR.finalMul * m.formPower, 1)], ['Travel', `${METEOR.step * METEOR.beats} px`], ['Cooldown', cd(METEOR.cooldown)]] }
      : f === 3 ? { name: ECHO.name, key: 'Q', pad: 'X', blurb: 'Summon one silver clone that fights beside you. It is weaker, draws enemy attention and can be destroyed.', stats: [['Clone HP', n(p.maxHp * ECHO.hpFrac)], ['Clone damage', n(p.attackDamage * 1.4 * m.formPower * ECHO.dmgFrac * Math.sqrt(qd), 1)], ['Duration', `${ECHO.life}s`], ['Cooldown', cd(ECHO.cooldown)]] }
      : { name: SURGE.name, key: 'Q', pad: 'X', blurb: 'Channel energy into your stance: faster movement and harder auto attacks for a few seconds. Ends if you transform.', stats: [['Speed', `+${Math.round((SURGE.speedMul - 1) * 100)}%`], ['Auto damage', `+${Math.round((SURGE.autoMul - 1) * 100)}%`], ['Duration', `${SURGE.duration}s`], ['Cooldown', cd(SURGE.cooldown)]] };
    if (f === 3) { et = { name: RIFT.name, key: 'E', pad: 'RB', blurb: `Hold to charge, release to fire a piercing silver beam. If it damages something you teleport to ${CHAIN.follow} random safe spots and fire again at the nearest enemy each time.`, stats: [['Beams', `1 + up to ${CHAIN.follow}`], ['Follow-up damage', `${Math.round(CHAIN.damageMul * 100)}%`], ['Cooldown', cd(RIFT.cooldown * m.beamCd)], ['Hold', 'longer = stronger']] }; rt = { name: REVERSAL.name, key: 'R', pad: 'LB', blurb: `Strike every enemy inside your radius, over and over, until none is left or you press R again. Full cooldown when it ends.${ult}`, stats: [['Damage / strike', n(REVERSAL.damage * STRIKES.damageMul * m.sphereDamage * m.formPower, 1)], ['Strike every', `${STRIKES.every}s`], ['Radius', `${n(REVERSAL.range * m.sphereRadius)} px`], ['Cooldown', cd(REVERSAL.cooldown * m.sphereCd)]] }; }
    else if (f === 2) { et = { name: 'Dragonfang Rush', key: 'E', pad: 'RB', blurb: 'A comet-fist lunge that bites everything on its line.', stats: [['Cooldown', cd(8 * m.beamCd)], ['Damage', 'scales with Lance cards']] }; rt = { name: 'Cometbreaker Cannon', key: 'R', pad: 'LB', blurb: 'A huge cannon blast down your aim line.' + ult, stats: [['Cooldown', cd(16 * m.sphereCd)], ['Damage', 'scales with Nova cards']] }; }
    else if (f === 1) { et = { name: RISE.name, key: 'E', pad: 'RB', blurb: 'Sweep your palm: a lane of fire pillars erupts one after another in front of you, shoving and staggering common enemies.', stats: [['Pillars', n(RISE.pillars + (m.beamLinger > 0 ? 1 : 0))], ['Damage / pillar', n(RISE.damage * m.beamDamage * m.formPower, 1)], ['Radius', `${n(RISE.radius * m.beamWidth)} px`], ['Cooldown', cd(RISE.cooldown * m.beamCd)]] }; rt = { name: CRUCIBLE.name, key: 'R', pad: 'LB', blurb: 'Gather a golden halo and plant a solar crucible. It draws foes gently inward, pulses, then ends in one rising eruption.' + ult, stats: [['Damage / pulse', n(CRUCIBLE.pulseDamage * m.sphereDamage * m.formPower, 1)], ['Eruption', n(CRUCIBLE.finalDamage * m.sphereDamage * m.formPower)], ['Radius', `${n(CRUCIBLE.radius * m.sphereRadius)} px`], ['Cooldown', cd(CRUCIBLE.cooldown * m.sphereCd)]] }; }
    else { et = { name: 'Fracture Lance', key: 'E', pad: 'RB', blurb: 'A piercing blade of light that pulses along its path.', stats: [['Damage / pulse', n(BEAM.damage * m.beamDamage, 1)], ['Pulses', n(5 + m.beamLinger)], ['Length', `${BEAM.length} px`], ['Cooldown', cd(BEAM.cooldown * m.beamCd)]] }; rt = { name: 'Nova Bloom', key: 'R', pad: 'LB', blurb: 'Throw a golden sphere that detonates in a large burst.' + ult, stats: [['Damage', n(SPHERE.damage * m.sphereDamage)], ['Radius', `${n(SPHERE.radius * m.sphereRadius)} px`], ['Cooldown', cd(SPHERE.cooldown * m.sphereCd)]] }; }
  } else if (s.hero === 'ren') {
    if (f === 2) {   // B33: Ashen Eclipse
      qt = { name: ASH_Q.name, key: 'Q', pad: 'X', blurb: ASH_FORM_INFO.q.text, stats: [['Strikes', `${ASH_Q.strikes}`], ['Finisher', n(q * m.formPower * ASH_Q.finalMul)], ['Cooldown', cd(ASH_Q.cooldown)]] };
      et = { name: ASH_E.name, key: 'E', pad: 'RB', blurb: ASH_FORM_INFO.e.text, stats: [['Rupture', n(q * m.formPower * m.beamDamage * ASH_E.mul)], ['Rupture radius', `${n(ASH_E.R * m.beamWidth)} px`], ['Cooldown', cd(ASH_E.cooldown * m.beamCd)]] };
      rt = { name: ASH_R.name, key: 'R', pad: 'LB', blurb: ASH_FORM_INFO.r.text + ult, stats: [['Strike / rupture', `${n(ASH_R.strikeMul * m.sphereDamage * m.formPower)} / ${n(ASH_R.ruptureMul * m.sphereDamage * m.formPower)}`], ['Rupture radius', `${n(ASH_R.ruptureR * m.sphereRadius)} px`], ['Cooldown', cd(ASH_R.cooldown * m.sphereCd)]] };
    } else if (f >= 1) {   // B26: Crimson Ascendant's own Q / E / R, numbers from the same content table the sim reads
      const rs = p.qRadius / REN.base.qRadius;
      qt = { name: REN_Q.name, key: 'Q', pad: 'X', blurb: REN_FORM_INFO.q.text, stats: [['Release', n(q * m.formPower * REN_Q.releaseMul)], ['Pull / blast radius', `${n(REN_Q.pullR * rs)} / ${n(REN_Q.releaseR * rs)} px`], ['Cooldown', cd(REN_Q.cooldown)]] };
      et = { name: REN_E.name, key: 'E', pad: 'RB', blurb: REN_FORM_INFO.e.text, stats: [['Slam', n(q * m.formPower * m.beamDamage * REN_E.slamMul)], ['Slam radius', `${n(REN_E.slamR * m.beamWidth)} px`], ['Cooldown', cd(REN_E.cooldown * m.beamCd)]] };
      rt = { name: REN_R.name, key: 'R', pad: 'LB', blurb: REN_FORM_INFO.r.text + ult, stats: [['Fist / final', `${n(REN_R.fistMul * m.sphereDamage * m.formPower)} / ${n(REN_R.finalMul * m.sphereDamage * m.formPower)}`], ['Final radius', `${n(REN_R.finalR * m.sphereRadius)} px`], ['Cooldown', cd(REN_R.cooldown * m.sphereCd)]] };
    } else {
    qt = { name: REN.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Damage / beat', n(q * REN.q.beatMul, 1)], ['Beats', n(f ? REN.q.formBeats : REN.q.beats)], ['Cooldown', cd(REN.q.cooldown)]] };
    et = { name: REN.e.name, key: 'E', pad: 'RB', blurb: hk!.blurbs.e, stats: [['Damage / strike', n(REN.e.damage * m.beamDamage)], ['Strikes', n((f ? REN.e.formHops : REN.e.hops) + m.beamLinger)], ['Cooldown', cd(REN.e.cooldown * m.beamCd)]] };
    rt = { name: REN.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage', n(REN.r.damage * m.sphereDamage * (f ? REN.r.formDamage : 1))], ['Radius', `${n(REN.r.radius * m.sphereRadius)} px`], ['Cooldown', cd(REN.r.cooldown * m.sphereCd)]] };
    }
  } else if (s.hero === 'sora' && f === 2) {   // B34: Eventide Seraph
    qt = { name: SERA_Q.name, key: 'Q', pad: 'X', blurb: SERA_FORM_INFO.q.text, stats: [['Damage / lance', n(q * m.formPower * SERA_Q.mul)], ['Lances', n(SERA_Q.lanes)], ['Cooldown', cd(SERA_Q.cooldown)]] };
    et = { name: SERA_E.name, key: 'E', pad: 'RB', blurb: SERA_FORM_INFO.e.text, stats: [['Damage / strike', n(q * m.formPower * m.beamDamage * SERA_E.mul)], ['Nodes', n(Math.min(SERA_E.nodesMax, SERA_E.nodes + Math.max(0, Math.round(m.beamLinger))))], ['Cooldown', cd(SERA_E.cooldown * m.beamCd)]] };
    rt = { name: SERA_R.name, key: 'R', pad: 'LB', blurb: SERA_FORM_INFO.r.text + ult, stats: [['Sweep / nova', `${n(q * m.formPower * m.sphereDamage * SERA_R.sweepMul)} / ${n(q * m.formPower * m.sphereDamage * SERA_R.novaMul)}`], ['Nova radius', `${n(SERA_R.novaR * m.sphereRadius)} px`], ['Cooldown', cd(SERA_R.cooldown * m.sphereCd)]] };
  } else if (s.hero === 'sora' && f >= 1) {   // B27: Azure Sovereign's own Q / E / R, numbers from the same content table the sim reads
    const rs = p.qRadius / SORA.base.qRadius;
    qt = { name: SORA_Q.name, key: 'Q', pad: 'X', blurb: SORA_FORM_INFO.q.text, stats: [['Shatter', n(q * m.formPower * SORA_Q.shatterMul)], ['Prison radius', `${n(SORA_Q.radius * rs)} px`], ['Cooldown', cd(SORA_Q.cooldown)]] };
    et = { name: SORA_E.name, key: 'E', pad: 'RB', blurb: SORA_FORM_INFO.e.text, stats: [['Damage / spear', n(q * m.formPower * m.beamDamage * SORA_E.mul)], ['Spears', n(Math.min(SORA_E.spearsMax, SORA_E.spears + Math.max(0, Math.round(m.beamLinger))))], ['Impact radius', `${n(SORA_E.radius * m.beamWidth)} px`], ['Cooldown', cd(SORA_E.cooldown * m.beamCd)]] };
    rt = { name: SORA_R.name, key: 'R', pad: 'LB', blurb: SORA_FORM_INFO.r.text + ult, stats: [['Burst', n(q * m.formPower * m.sphereDamage * SORA_R.burstMul)], ['Burst radius', `${n(SORA_R.burstR * m.sphereRadius)} px`], ['Cooldown', cd(SORA_R.cooldown * m.sphereCd)]] };
  } else if (s.hero === 'sora') {
    qt = { name: SORA.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Damage / bolt', n(q * SORA.q.boltMul, 1)], ['Bolts', n(f ? SORA.q.formBolts : SORA.q.bolts)], ['Cooldown', cd(SORA.q.cooldown)]] };
    et = { name: SORA.e.name, key: 'E (hold)', pad: 'RB (hold)', blurb: hk!.blurbs.e, stats: [['Damage', `${n(SORA.e.damage[0] * m.beamDamage)} / ${n(SORA.e.damage[1] * m.beamDamage)} / ${n(SORA.e.damage[2] * m.beamDamage)}`], ['Charge tiers', 'T1 / T2 / T3'], ['Cooldown', cd(SORA.e.cooldown * m.beamCd)]] };
    rt = { name: SORA.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage / orb', n(SORA.r.damage * m.sphereDamage * (f ? SORA.r.formDamage : 1))], ['Orbs', n(f ? SORA.r.formOrbs : SORA.r.orbs)], ['Cooldown', cd(SORA.r.cooldown * m.sphereCd)]] };
  } else if (f >= 1) {   // B28: Riftbound / Voidheart Exile's own Q / E / R, numbers from the same content table the sim reads
    const I = VEX_FORM_INFO[f === 2 ? 2 : 1];
    if (f === 1) {
      qt = { name: VEX1_Q.name, key: 'Q', pad: 'X', blurb: I.q.text, stats: [['Echo damage', n(q * m.formPower * VEX1_Q.echoMul)], ['Perfect window', `${n(VEX1_Q.perfect, 2)}s`], ['Cooldown', cd(VEX1_Q.cooldown)]] };
      et = { name: VEX1_E.name, key: 'E', pad: 'RB', blurb: I.e.text, stats: [['Cut', n(q * m.formPower * m.beamDamage * VEX1_E.mul)], ['Range', `${VEX1_E.range} px`], ['Cooldown', cd(VEX1_E.cooldown * m.beamCd)]] };
      rt = { name: VEX1_R.name, key: 'R', pad: 'LB', blurb: I.r.text + ult, stats: [['Seal / final', `${n(q * m.formPower * m.sphereDamage * VEX1_R.mul)} / ${n(q * m.formPower * m.sphereDamage * VEX1_R.finalMul)}`], ['Final radius', `${n(VEX1_R.finalR * m.sphereRadius)} px`], ['Cooldown', cd(VEX1_R.cooldown * m.sphereCd)]] };
    } else {
      qt = { name: VEX2_Q.name, key: 'Q', pad: 'X', blurb: I.q.text, stats: [['Copies', n(VEX2_Q.copies)], ['Lasts', `${VEX2_Q.life}s`], ['Cooldown', cd(VEX2_Q.cooldown)]] };
      et = { name: VEX2_E.name, key: 'E', pad: 'RB', blurb: I.e.text, stats: [['Cut', n(q * m.formPower * m.beamDamage * VEX2_E.mul)], ['Lane', `${VEX2_E.length} px`], ['Cooldown', cd(VEX2_E.cooldown * m.beamCd)]] };
      rt = { name: VEX2_R.name, key: 'R', pad: 'LB', blurb: I.r.text + ult, stats: [['Strike', n(q * m.formPower * m.sphereDamage * VEX2_R.mul)], ['Radius', `${n(VEX2_R.radius * m.sphereRadius)} px`], ['Cooldown', cd(VEX2_R.cooldown * m.sphereCd)]] };
    }
  } else {
    qt = { name: VEX.q.name, key: 'Q', pad: 'X', blurb: hk!.blurbs.q, stats: [['Riposte damage', n(q * VEX.q.riposteMul)], ['Perfect window', `${n(VEX.q.perfect * (f === 1 ? VEX.q.formPerfect : 1), 2)}s`], ['Late guard', `-${Math.round(VEX.q.reduce * 100)}% damage`], ['Cooldown', cd(VEX.q.cooldown)]] };
    et = { name: VEX.e.name, key: 'E', pad: 'RB', blurb: hk!.blurbs.e, stats: [['Riposte damage', n(q * VEX.e.riposteMul * m.beamDamage)], ['Shift', `${n(VEX.e.distance * m.beamWidth)} px`], ['Cooldown', cd(VEX.e.cooldown * m.beamCd)]] };
    rt = { name: VEX.r.name, key: 'R', pad: 'LB', blurb: hk!.blurbs.r + ult, stats: [['Damage / mark', n(q * VEX.r.damage * m.sphereDamage)], ['Marks', `${VEX.r.marksByForm[Math.min(2, f)]} (1 boss)`], ['Cooldown', cd(VEX.r.cooldown * m.sphereCd)]] };
  }
  const formName = s.hero === 'kai' ? (f === 3 ? 'Stillfire Apex' : f === 2 ? 'Cometheart' : 'Flarebound') : f === 2 && hk?.form2 ? hk.form2 : hk?.form ?? 'Flarebound';
  ft = { name: s.hero === 'kai' ? 'Transform' : `${hk!.form}${hk!.form2 ? ' / ' + hk!.form2 : ''}`, key: 'F', pad: 'Y', blurb: hk ? hk.blurbs.form : 'Spend Drive to transform. Flarebound at 65% Drive; Cometheart and Stillfire Apex need a full gauge once unlocked. F opens a pick when several are ready.', stats: [['Drive', `${Math.floor(p.drive)}%`], ['Now', f ? formName : 'Base'], ...(s.hero === 'vex' ? [['Riftbound', s.b22.vex.forms[0] ? 'unlocked' : 'beat the Warden or Trial ch. 2'], ['Voidheart', s.b22.vex.forms[1] ? 'unlocked' : 'beat the Oathkeeper (Trial ch. 3)']] as [string, string][] : [])] };
  if (s.b22.ult.unlocked) rt.stats.push(['Ultimate', s.b22.ult.cd > 0 ? `cooling ${n(s.b22.ult.cd)}s` : `${Math.floor(s.b22.ult.charge)}% charged`]);
  return { dash, q: qt, e: et, r: rt, f: ft };
}
