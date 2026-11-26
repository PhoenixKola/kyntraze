/** Hero Select read-out: the real abilities of one runner's appearance, straight from the content tables the sim and HUD read (no invented numbers). Pure data, presentation only. */
import { HERO_KIT } from '../content/heroKits';
import { AUTO, SIG } from '../content/kaiCombat';
import { CRUCIBLE, ECHO, METEOR, RISE, SCATTER, SURGE } from '../content/kaiKit';
import { REVERSAL, RIFT } from '../content/stillfire';
import { REN_FORM_INFO } from '../content/renCombat';
import { SORA_FORM_INFO } from '../content/soraCombat';
import { VEX_FORM_INFO } from '../content/vexCombat';
import type { HeroId } from '../content/heroes';

export interface KitAbility { key: string; name: string; text: string; icon: string }
export interface FormView { k: string; label: string; full: string; kitIcon: string; sheet: string; frame: [number, number]; how: string }
const FLIGHT: KitAbility = { key: 'ALT', name: 'Skybreaker flight', text: 'Transformed only (Left Alt; Ctrl in co-op): press once to lift off, press again to land with a slam. Costs Drive while airborne.', icon: 'dash' };
const OD = (hero: HeroId): KitAbility => ({ key: 'G', name: 'Primal Overdrive', text: 'Fight while transformed to fill the meter, then press G for 10 s of +25% damage and a spectral beast.', icon: hero === 'ren' ? 'ren_cf_overdrive' : hero === 'sora' ? 'sora_cf_overdrive' : hero === 'vex' ? 'vex_cf_oath' : 'overdrive' });
const sheetOf = (dir: string, h: HeroId) => `art/${dir}/south/sheets/${h}_south_idle.png`;

/** Appearances in order (base first), with idle sheets, frame sizes and the real unlock wording. */
export function formsFor(hero: HeroId): FormView[] {
  if (hero === 'kai') return [
    { k: 'base', label: 'Base', full: 'Kai', kitIcon: 'crest-base', sheet: sheetOf('kai', 'kai'), frame: [152, 167], how: 'Always available' },
    { k: 'f1', label: 'Flarebound', full: 'Flarebound', kitIcon: 'crest-f1', sheet: sheetOf('kai-f1', 'kai'), frame: [152, 176], how: 'Build Drive to 65%, then press F' },
    { k: 'f2', label: 'Cometheart', full: 'Cometheart', kitIcon: 'crest-f2', sheet: sheetOf('kai-f2', 'kai'), frame: [158, 181], how: 'Defeat the Fracture Warden with Kai, then fill the Drive gauge' },
    { k: 'f3', label: 'Stillfire Apex', full: 'Stillfire Apex', kitIcon: 'crest-f3', sheet: sheetOf('kai-f3', 'kai'), frame: [158, 168], how: 'Win a run by defeating the Null Seraph with Kai' }];
  if (hero === 'ren') return [
    { k: 'base', label: 'Base', full: 'Ren', kitIcon: 'base', sheet: sheetOf('ren', 'ren'), frame: [160, 170], how: 'Always available' },
    { k: 'f1', label: 'Ascendant', full: 'Crimson Ascendant', kitIcon: 'form', sheet: sheetOf('ren-f1', 'ren'), frame: [160, 179], how: 'Defeat the Fracture Warden with Ren' }];
  if (hero === 'sora') return [
    { k: 'base', label: 'Base', full: 'Sora', kitIcon: 'base', sheet: sheetOf('sora', 'sora'), frame: [152, 167], how: 'Always available' },
    { k: 'f1', label: 'Sovereign', full: 'Azure Sovereign', kitIcon: 'form', sheet: sheetOf('sora-f1', 'sora'), frame: [152, 177], how: 'Defeat the Fracture Warden with Sora' }];
  return [
    { k: 'base', label: 'Base', full: 'Vex', kitIcon: 'base', sheet: sheetOf('vex', 'vex'), frame: [166, 170], how: 'Always available' },
    { k: 'f1', label: 'Riftbound', full: 'Riftbound', kitIcon: 'form', sheet: sheetOf('vex-f1', 'vex'), frame: [166, 179], how: 'Defeat the Fracture Warden with Vex, or clear Trial of the Oathbroken chapter 2' },
    { k: 'f2', label: 'Voidheart', full: 'Voidheart Exile', kitIcon: 'form', sheet: sheetOf('vex-f2', 'vex'), frame: [166, 157], how: 'Clear Trial of the Oathbroken chapter 3' }];
}

/** Abilities of one appearance (index into formsFor). */
export function kitFor(hero: HeroId, form: number): KitAbility[] {
  const dash: KitAbility = { key: 'SHIFT', name: 'Dash', text: 'A short burst with brief invulnerability: dash through an attack to dodge it.', icon: 'dash' };
  if (hero === 'kai') {
    const f = Math.min(3, form);
    const q = [SURGE, SCATTER, METEOR, ECHO][f], qi = ['kai_surge', 'kai_scatter', 'kai_meteor', 'kai_echo'][f];
    const qt = ['Channel energy into your stance: faster movement and harder autos for a few seconds.', 'Ten small ki blasts in rapid volleys across nearby enemies.', 'Three fast advancing strikes along your aim; the last hits harder.', 'Summon one silver clone that fights beside you.'][f];
    const e = [['Fracture Lance', 'A piercing blade of light that pulses along its path.', 'lance'], [RISE.name, 'Sweep your palm: a lane of fire pillars erupts in front of you.', 'kai_rise'], ['Dragonfang Rush', 'A comet-fist lunge that bites everything on its line.', 'dragon'], [RIFT.name, 'Hold to charge, release for a piercing silver beam that teleports you between hits.', 'rift']][f];
    const r = [['Nova Bloom', 'Throw a golden sphere that detonates in a large burst.', 'nova'], [CRUCIBLE.name, 'Plant a solar crucible that draws foes in, pulses, then erupts.', 'kai_crucible'], ['Cometbreaker Cannon', 'A huge cannon blast down your aim line.', 'comet'], [REVERSAL.name, 'Strike every enemy in your radius again and again until none is left.', 'reversal']][f];
    const out: KitAbility[] = [{ key: 'AUTO', name: AUTO[f as 0 | 1 | 2 | 3].name, text: 'Automatic four-beat combo on the nearest enemies.', icon: 'impact' }, { key: 'Q', name: q.name, text: qt, icon: qi }, { key: 'E', name: e[0], text: e[1], icon: e[2] }, { key: 'R', name: r[0], text: r[1], icon: r[2] }, dash];
    if (f > 0) { const s = [SIG.flare, SIG.comet, SIG.still][f - 1], st = ['Hold V to charge a rotating solar sphere, release to lunge and detonate it.', 'Hold V to charge a lightning-wrapped star, release to lunge and break.', 'Hold V to gather a silver singularity, release to blink in and implode.'][f - 1]; out.push({ key: 'V', name: s.name, text: st, icon: `sig_${f}` }, OD('kai'), FLIGHT); }
    return out;
  }
  const hk = HERO_KIT[hero];
  const baseIcon = (s: string) => `${hero}_${s}`;
  if (form === 0) return [{ key: 'AUTO', name: hk.auto, text: hk.blurbs.auto, icon: baseIcon('auto') }, { key: 'Q', name: hk.act.q, text: hk.blurbs.q, icon: baseIcon('q') }, { key: 'E', name: hk.act.e, text: hk.blurbs.e, icon: baseIcon('e') }, { key: 'R', name: hk.act.r, text: hk.blurbs.r, icon: baseIcon('r') }, dash];
  const I = hero === 'ren' ? REN_FORM_INFO : hero === 'sora' ? SORA_FORM_INFO : VEX_FORM_INFO[form === 2 ? 2 : 1];
  const ic = hero === 'ren' ? ['ren_auto', 'ren_cf_cyclone', 'ren_cf_rampage', 'ren_cf_catastrophe', 'ren_cf_nova_fist'] : hero === 'sora' ? ['sora_cf_blades', 'sora_cf_prison', 'sora_cf_spear', 'sora_cf_collapse', 'sora_cf_devastation'] : form === 2 ? ['vex_cf_judgment', 'vex_cf_legion', 'vex_cf_sever', 'vex_cf_domain', 'vex_cf_horizon'] : ['vex_cf_auto1', 'vex_cf_mirror', 'vex_cf_execution', 'vex_cf_oath', 'vex_cf_fang'];
  return [{ key: 'AUTO', name: I.auto.name, text: I.auto.text, icon: ic[0] }, { key: 'Q', name: I.q.name, text: I.q.text, icon: ic[1] }, { key: 'E', name: I.e.name, text: I.e.text, icon: ic[2] }, { key: 'R', name: I.r.name, text: I.r.text, icon: ic[3] }, { key: 'V', name: I.v.name, text: I.v.text, icon: ic[4] }, { ...OD(hero), name: I.od.name, text: I.od.text }, dash, FLIGHT];
}
