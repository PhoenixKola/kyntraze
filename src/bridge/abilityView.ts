/** B23: everything the HUD ability bar needs for ONE fighter, read from a state with that fighter active (the second co-op fighter is computed with `inSlot(s, 1, ...)`, an online partner from a state view built on their snapshot). Same expressions the first player's snapshot uses, so both bars always agree with the sim. */
import { REN_E, REN_R } from '../content/renCombat';
import { SORA_E, SORA_R } from '../content/soraCombat';
import type { GameState } from '../sim/GameState';
import { ASCEND, REN, SORA } from '../content/heroKits';
import { BEAM, SPHERE } from '../content/abilities';
import { CANNON, DRAGON } from '../content/cometheart';
import { EVASION, REVERSAL, RIFT } from '../content/stillfire';
import { CRUCIBLE, ECHO, METEOR, RISE, SCATTER, SURGE } from '../content/kaiKit';
import { RULES } from '../core/Rules';
import { sigCharge } from '../sim/KaiCombat';
import { SIG } from '../content/kaiCombat';
import { dashMax } from '../sim/MovementSystem';
import { kitSnap } from '../sim/KaiKit';
import { formChoices } from '../sim/FormSystem';
import { abilityTips, type AbilityTip, type TipSlot } from './abilityTips';
import type { HeroId } from '../content/heroes';

export interface AbilityView {
  hero: HeroId; form: 0 | 1 | 2 | 3; drive: number; formCooldown: number; dashCooldown: number; sigCd: number; odMeter: number; odT: number; sigCharge: number; sigTier: number; flying: boolean; dashLeft: number; dashMax: number; qCooldown: number; beamCooldown: number; sphereCooldown: number; dragonCooldown: number; cometCooldown: number; riftCooldown: number; reversalCooldown: number; evadeCooldown: number;
  heroFormUnlocked: boolean; heroReady: boolean; cometUnlocked: boolean; cometReady: boolean; apexUnlocked: boolean; apexReady: boolean; cinema: boolean; lanceCharge: number; lanceTier: number; riftCharge: number;
  kit: { surge: number; cloneHp: number; cloneLife: number; crucible: boolean; chain: 'none' | 'rift' | 'reversal' };
  cdMax: { q: number; flare: number; crucible: number; dash: number; beam: number; sphere: number; form: number; dragon: number; comet: number; rift: number; reversal: number; evade: number };
  tips: Record<TipSlot, AbilityTip> | null; ult: { name: string; charge: number; cd: number; ready: boolean; active: boolean } | null;
}
export function abilityView(s: GameState): AbilityView {
  const p = s.player, lance = s.hx?.act?.act === 'celestial_lance' && !s.hx.act.released ? s.hx.act : null;
  let tips: AbilityView['tips'] = null; try { tips = abilityTips(s); } catch { /* partial online view: no tooltips */ }
  const u = s.b22?.ult;
  return {
    hero: s.hero, form: p.form as 0 | 1 | 2 | 3, drive: p.drive, formCooldown: p.formCooldown, dashCooldown: p.dashCooldown, sigCd: p.sigCd, odMeter: p.odMeter, odT: p.odT, sigCharge: sigCharge(s) ? Math.min(1, sigCharge(s)!.charge / SIG.stages[2]) : 0, sigTier: sigCharge(s)?.tier ?? -1, flying: p.flyT > 0, dashLeft: dashMax(s) - Math.min(dashMax(s), p.dashUsed), dashMax: dashMax(s), qCooldown: p.qCooldown, beamCooldown: p.beamCooldown, sphereCooldown: p.sphereCooldown, dragonCooldown: p.dragonCooldown, cometCooldown: p.cometCooldown, riftCooldown: p.riftCooldown, reversalCooldown: p.reversalCooldown, evadeCooldown: p.evadeCooldown,
    heroFormUnlocked: s.hero === 'vex' ? !!(s.b22?.vex?.forms?.[0] || s.b22?.vex?.forms?.[1]) : s.heroFormUnlocked, heroReady: s.hero !== 'kai' && formChoices(s).includes(1), cometUnlocked: s.cometUnlocked, cometReady: formChoices(s).includes(2), apexUnlocked: s.apexUnlocked, apexReady: formChoices(s).includes(3), cinema: !!s.cinema,
    lanceCharge: lance ? lance.charge / SORA.e.maxCharge : 0, lanceTier: lance ? SORA.e.tiers.reduce((t, v, i) => (lance.charge >= v ? i : t), -1) : -1, riftCharge: s.cast?.kind === 'rift' && !s.cast.released ? Math.min(1, s.cast.t / RIFT.maxCharge) : 0,
    kit: kitSnap(s),
    cdMax: { q: [SURGE.cooldown, SCATTER.cooldown, METEOR.cooldown, ECHO.cooldown][p.form] ?? SURGE.cooldown, flare: RISE.cooldown * s.mods.beamCd, crucible: CRUCIBLE.cooldown * s.mods.sphereCd, dash: 3.2 * s.mods.dashCd, beam: (s.hero === 'ren' ? (p.form ? REN_E.cooldown : REN.e.cooldown) : s.hero === 'sora' ? (p.form ? SORA_E.cooldown : SORA.e.cooldown) : BEAM.cooldown) * s.mods.beamCd, sphere: (s.hero === 'ren' ? (p.form ? REN_R.cooldown : REN.r.cooldown) : s.hero === 'sora' ? (p.form ? SORA_R.cooldown : SORA.r.cooldown) : SPHERE.cooldown) * s.mods.sphereCd, form: (s.hero === 'kai' ? RULES.formCooldown : ASCEND.cooldown) * s.mods.formCd, dragon: DRAGON.cooldown * s.mods.beamCd, comet: CANNON.cooldown * s.mods.sphereCd, rift: RIFT.cooldown * s.mods.beamCd, reversal: REVERSAL.cooldown * s.mods.sphereCd, evade: EVASION.cooldown },
    tips, ult: u && u.unlocked ? { name: u.act ? 'ACTIVE' : 'ULTIMATE', charge: u.charge, cd: u.cd, ready: u.charge >= 100 && u.cd <= 0, active: !!u.act } : null,
  };
}
/** The fighter-specific slice of a UiSnapshot, so the same ability bar component renders either player. */
export const ABILITY_KEYS = ['hero', 'form', 'drive', 'formCooldown', 'dashCooldown', 'sigCd', 'odMeter', 'odT', 'sigCharge', 'sigTier', 'flying', 'dashLeft', 'dashMax', 'qCooldown', 'beamCooldown', 'sphereCooldown', 'dragonCooldown', 'cometCooldown', 'riftCooldown', 'reversalCooldown', 'evadeCooldown', 'heroFormUnlocked', 'heroReady', 'cometUnlocked', 'cometReady', 'apexUnlocked', 'apexReady', 'cinema', 'lanceCharge', 'lanceTier', 'riftCharge', 'kit', 'cdMax', 'tips'] as const;
