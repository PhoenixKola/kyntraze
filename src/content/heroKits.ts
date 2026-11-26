/** B19: every number and every word of Ren's and Sora's kits. The sim, the renderers, the audio and the HUD read these; nothing here knows about Phaser. */
import type { HeroId } from './heroes';
import type { UpgradeCategory, UpgradeId } from './upgrades';

export type HeroAct = 'crimson_break' | 'meteor_rush' | 'bloodstar' | 'azure_volley' | 'celestial_lance' | 'zero_horizon' | 'parry_halo' | 'rift_reversal' | 'oathbreaker_seal' | 'infernal_cyclone' | 'scarlet_rampage' | 'crimson_catastrophe' | 'nova_fist' | 'azure_prison' | 'heavens_spear' | 'azure_collapse' | 'astral_devastation' | 'mirror_guard' | 'rift_execution' | 'oath_ruin' | 'abyssal_fang' | 'phantom_legion' | 'dim_severance' | 'domain_exile' | 'event_horizon' | 'eclipse_maul' | 'ninefold_rupture' | 'ashen_cataclysm' | 'eclipse_fang' | 'constellation_pierce' | 'seraphs_descent' | 'eventide_judgment' | 'astral_rebirth' | 'ultimate';

/** Both new heroes have exactly one transformation (form id 1). The unlock is the same milestone for each, earned by playing that hero. */
export const ASCEND = {
  unlockBoss: 'warden' as const,
  charge: 100, cooldown: 22,
  cinemaFirst: { dur: 2.7, breakAt: 1.55, commitAt: 1.75 },
  cinemaRepeat: { dur: 1.15, breakAt: 0.52, commitAt: 0.64 },
  knockRadius: 260, knockPush: 150, stagger: 0.9,
  ren: { drain: 3.4, speedMul: 1.1, autoMul: 1.3 },
  sora: { drain: 3.4, speedMul: 1.12, autoMul: 1.25 },
  /** Vex has two transformations: Riftbound (form 1) and Voidheart Exile (form 2) */
  vex: { drain: [3.4, 3.0], speedMul: [1.1, 1.14], autoMul: [1.25, 1.4], unlock: ['vex_trial_2', 'vex_trial_3'] },
} as const;

export const REN = {
  base: { hp: 130, speed: 238, attackDamage: 13, attackPeriod: 0.48, attackRange: 104, targets: 2, qDamage: 34, qRadius: 124, radius: 17 },
  auto: { name: 'Hammer Chain', arcDeg: 70, step: 3, finisherMul: 1.7, finisherPush: 120, lunge: 10 },
  q: { name: 'Crimson Break', cooldown: 7.5, beats: 5, gap: 0.115, formBeats: 7, formGap: 0.082, beatMul: 0.2, finisherMul: 1.6, arcDeg: 75, step: 14, moveScale: 0.62, recover: 0.2, formReach: 1.2 },
  e: { name: 'Meteor Rush', cooldown: 9, hops: 3, formHops: 5, seek: 340, chain: 270, hopTime: 0.15, strikeTime: 0.09, blast: 72, damage: 23, fallback: 230, fallbackBlast: 84, fallbackDamage: 20, recover: 0.16, formBlast: 1.35, arrival: 6 },
  r: { name: 'Bloodstar Impact', cooldown: 18, windup: 0.32, flight: 0.46, recover: 0.38, range: 380, defaultRange: 280, radius: 205, damage: 62, edgeFalloff: 0.55, push: 220, stagger: 0.7, ring: 1.32, ringDamage: 0.5, ringAt: 0.2, formRebound: 1.5, reboundAt: 0.55, reboundDamage: 0.6, formDamage: 1.2 },
} as const;

/** B22 The Fallen Vanguard: Vex, the counter hero. Everything he does is a read-and-answer: parry, riposte, mark. */
export const VEX = {
  base: { hp: 124, speed: 248, attackDamage: 14, attackPeriod: 0.5, attackRange: 118, targets: 2, qDamage: 36, qRadius: 120, radius: 17 },
  auto: { name: 'Null Blade', arcDeg: 80, step: 3, finisherMul: 1.8, finisherPush: 90, lunge: 8, markMul: 1.35 },
  q: { name: 'Parry Halo', cooldown: 6, perfect: 0.55, guard: 0.95, recover: 0.25, arcDeg: 230, reduce: 0.7, riposteMul: 2.4, riposteReach: 190, riposteArc: 100, stun: 0.9, refund: 0.5, drive: 12, gap: 0.3, moveScale: 0.7, formPerfect: 1.4 },
  e: { name: 'Rift Reversal', cooldown: 9, distance: 230, iframes: 0.36, riposteMul: 2.0, strikeReach: 170, windup: 0.1, recover: 0.2, perfectWindow: 0.35, formCool: 0.75, formDistance: 1.4 },
  r: { name: 'Oathbreaker Seal', cooldown: 18, marks: 8, marksByForm: [8, 14, 24] as readonly number[], bossMarks: 1, range: 360, windup: 0.4, fuse: 2.2, damage: 1.4, power: 0.12, wave: 150, recover: 0.3, moveScale: 0.5 },
} as const;

export const SORA = {
  base: { hp: 116, speed: 258, attackDamage: 10, attackPeriod: 0.5, attackRange: 360, targets: 1, qDamage: 34, qRadius: 132, radius: 17 },
  auto: { name: 'Azure Needle', speed: 780, radius: 7, homing: 0.045, muzzle: 22, formPierce: 1 },
  q: { name: 'Azure Volley', cooldown: 7.5, bolts: 7, formBolts: 11, spreadDeg: 56, formSpreadDeg: 40, speed: 700, ttl: 0.72, boltMul: 0.17, burst: 0.16, windup: 0.16, recover: 0.2, moveScale: 0.45, formHoming: 0.07, radius: 8 },
  e: { name: 'Celestial Lance', cooldown: 9.5, tiers: [0.3, 0.8, 1.3] as readonly number[], maxCharge: 1.3, minCharge: 0.3, halfWidth: [20, 28, 38] as readonly number[], length: [540, 640, 740] as readonly number[], damage: [24, 38, 58] as readonly number[], fire: 0.26, recover: 0.22, moveCharge: 0.22, moveFire: 0, cancelCooldown: 0.4, formTierBoost: 1, formWidth: 1.3, formArcs: 3, formArcRange: 120, formFlare: 96 },
  r: { name: 'Zero Horizon', cooldown: 23, orbs: 5, formOrbs: 8, summon: 0.5, orbit: 0.7, formOrbit: 0.95, travel: 0.5, orbitRadius: 68, range: 400, radius: 92, damage: 29, formRing: 230, formRingDamage: 0.4, recover: 0.3, moveScale: 0.4, formDamage: 1.2 },
} as const;

/** Display metadata the HUD, hero select and results read. */
export interface HeroKitInfo { act: { q: string; e: string; r: string }; auto: string; form: string; /** a second transformation (Vex) */ form2?: string; formShort: string; quote: string; roleLine: string; blurbs: { auto: string; q: string; e: string; r: string; form: string }; catNames: Partial<Record<UpgradeCategory, string>> }
export const HERO_KIT: Record<'ren' | 'sora' | 'vex', HeroKitInfo> = {
  ren: {
    act: { q: REN.q.name, e: REN.e.name, r: REN.r.name }, auto: REN.auto.name, form: 'Crimson Ascendant', formShort: 'ASCENDANT',
    quote: 'Pressure is the only plan.', roleLine: 'Close-range brawler · risk and momentum',
    blurbs: { auto: 'Heavy chained punches hit every enemy in a short arc; every third blow lands harder.', q: 'A rapid five-beat punch combination that steps into the crowd. Works while moving.', e: 'Rush through up to three nearby enemies, exploding on each. With nobody near, dash forward and burst.', r: 'Leap to the target, slam down and release a crimson shockwave that throws the crowd back.', form: 'Full Drive and F: red hair and a Crimson Nine-Tailed Fox energy. Crimson Fury, Infernal Cyclone, Scarlet Rampage, Crimson Catastrophe, hold V for Crimson Nova Fist, G for the fox Overdrive, hold dash to fly.' },
    catNames: { core: 'CORE', beam: 'RUSH', sphere: 'IMPACT', survival: 'SURVIVAL', mobility: 'MOBILITY', pickup: 'SALVAGE', drive: 'ASCENT' },
  },
  sora: {
    act: { q: SORA.q.name, e: SORA.e.name, r: SORA.r.name }, auto: SORA.auto.name, form: 'Azure Sovereign', formShort: 'SOVEREIGN',
    quote: 'Distance is a kind of grace.', roleLine: 'Ranged controller · spacing and precision',
    blurbs: { auto: 'Fast homing blue needles fire at the nearest enemies from a safe distance.', q: 'A quick fan of blue energy bolts for lane control. Works while moving.', e: 'Hold E to gather a piercing beam, release to fire. Longer charge means wider, longer and harder.', r: 'Summon orbiting spheres, then send them to converge on enemies and detonate together.', form: 'Full Drive and F: electric blue hair and an Astral Phoenix aura. Astral Blades, Azure Prison, Heaven’s Spear, Celestial Collapse, hold V for Astral Devastation, G for the phoenix Overdrive, hold dash to fly.' },
    catNames: { core: 'CORE', beam: 'LANCE', sphere: 'HORIZON', survival: 'SURVIVAL', mobility: 'MOBILITY', pickup: 'SALVAGE', drive: 'SOVEREIGN' },
  },
  vex: {
    act: { q: VEX.q.name, e: VEX.e.name, r: VEX.r.name }, auto: VEX.auto.name, form: 'Riftbound', form2: 'Voidheart Exile', formShort: 'RIFTBOUND',
    quote: 'Every blow tells me where to strike.', roleLine: 'Counter specialist · timing and marks',
    blurbs: {
      auto: 'Angular Null Blade sweeps in a three-beat rhythm; the third strike lands hard. Marked foes take extra.',
      q: 'Raise a guard in front of you. A hit in the first moments is PARRIED: refused, answered by a stunning riposte. A late hit is only softened.',
      e: 'Shift through a short safe path. If a foe is in reach you riposte at the other end; with none, you just reposition.',
      r: 'Mark many foes (one boss; more with each transformation), then detonate them after a short fuse or press R again. Damage dealt while marked adds to the blast.',
      form: 'Riftbound: wider parry timing, faster cooldowns and violet afterimage pressure. Voidheart Exile: silver-black precision, marks spread on a parry, the shift leaves a fracture line.',
    },
    catNames: { core: 'CORE', beam: 'RIFT', sphere: 'SEAL', survival: 'SURVIVAL', mobility: 'MOBILITY', pickup: 'SALVAGE', drive: 'OATH' },
  },
};

export interface UpgradeOverride { name?: string; blurb?: string; label?: string; /** replaces the card's number (the actual stat of THIS hero's ability) */ read?: (s: { player: { attackDamage: number; attackPeriod: number; attackRange: number; targets: number; qDamage: number; qRadius: number }; mods: { beamWidth: number; beamDamage: number; beamCd: number; beamLinger: number; sphereRadius: number; sphereDamage: number; sphereCd: number; sphereEcho: number; formDrain: number; formPower: number } }) => number; unit?: string; digits?: number }
const RS = { ren: REN, sora: SORA, vex: VEX };
/** Hero-specific wording and the number each card actually changes. Cards not listed keep Kai's wording (they are hero-neutral: health, speed, pickup, XP, dash, regen...). */
export const UPGRADE_OVERRIDES: Record<'ren' | 'sora' | 'vex', Partial<Record<UpgradeId, UpgradeOverride>>> = {
  ren: {
    impact: { name: 'HEAVY HAND', blurb: 'Hammer Chain punches hit harder.', label: 'Punch damage' },
    tempo: { name: 'QUICKEN', blurb: 'Hammer Chain strikes faster.', label: 'Chains / sec' },
    reach: { name: 'LONG ARC', blurb: 'Hammer Chain reaches further.', label: 'Punch range' },
    echo: { name: 'TWIN IMPACT', blurb: 'Hammer Chain hits one more enemy per punch.', label: 'Targets / punch' },
    pulse: { name: 'BREAK ENGINE', blurb: 'Crimson Break hits harder and reaches wider.', label: 'Break damage / beat', read: s => s.player.qDamage * REN.q.beatMul },
    widelance: { name: 'WIDE RUSH', blurb: 'Meteor Rush explosions grow wider.', label: 'Rush blast', read: s => REN.e.blast * s.mods.beamWidth },
    hardlight: { name: 'METEOR WEIGHT', blurb: 'Meteor Rush strikes hit harder.', label: 'Rush damage', read: s => REN.e.damage * s.mods.beamDamage },
    lancecool: { name: 'RUSH COOLING', blurb: 'Meteor Rush recharges sooner.', label: 'Rush cooldown', read: s => REN.e.cooldown * s.mods.beamCd, unit: 's', digits: 1 },
    afterburn: { name: 'CHAIN HUNGER', blurb: 'Meteor Rush chains into one more enemy.', label: 'Rush strikes', read: s => REN.e.hops + s.mods.beamLinger },
    conductor: { name: 'BLOODRUSH', blurb: 'Every enemy Meteor Rush strikes feeds your Drive.', label: 'Drive per strike' },
    bloombulk: { name: 'CRATER MAKER', blurb: 'Bloodstar Impact lands bigger and harder.', label: 'Impact radius', read: s => REN.r.radius * s.mods.sphereRadius },
    novacool: { name: 'IMPACT COOLING', blurb: 'Bloodstar Impact recharges sooner.', label: 'Impact cooldown', read: s => REN.r.cooldown * s.mods.sphereCd, unit: 's', digits: 1 },
    afterglow: { name: 'AFTERSHOCK', blurb: 'Bloodstar Impact quakes again at half strength.', label: 'Second quake' },
    twinbloom: { name: 'TWIN QUAKE', blurb: 'The Aftershock lands at full strength.', label: 'Second quake' },
    flareheart: { name: 'EMBER HEART', blurb: 'Crimson Ascendant burns longer before it fades.', label: 'Ascendant drain' },
    embercore: { name: 'BLOODSTAR CORE', blurb: 'Crimson Ascendant hits much harder and returns twice as fast.', label: 'Ascendant power' },
    surgecell: { blurb: 'Build Drive faster from punches and kills.' },
  },
  sora: {
    impact: { name: 'FINE EDGE', blurb: 'Azure Needles hit harder.', label: 'Needle damage' },
    tempo: { name: 'QUICKEN', blurb: 'Azure Needles fire faster.', label: 'Needles / sec' },
    reach: { name: 'LONG SIGHT', blurb: 'Azure Needles reach further.', label: 'Needle range' },
    echo: { name: 'TWIN NEEDLE', blurb: 'Azure Needles fire at one more enemy at once.', label: 'Targets' },
    pulse: { name: 'VOLLEY ENGINE', blurb: 'Azure Volley hits harder and fires more bolts.', label: 'Volley bolts', read: s => SORA.q.bolts + Math.max(0, Math.round((s.player.qRadius - SORA.base.qRadius) / 25)) },
    widelance: { name: 'WIDE LANCE', blurb: 'Celestial Lance becomes a broader beam.', label: 'Lance width', read: s => 100 * s.mods.beamWidth, unit: '%' },
    hardlight: { name: 'HARD LIGHT', blurb: 'Celestial Lance hits harder.', label: 'Lance damage', read: s => 100 * s.mods.beamDamage, unit: '%' },
    lancecool: { name: 'LANCE COOLING', blurb: 'Celestial Lance recharges sooner.', label: 'Lance cooldown', read: s => SORA.e.cooldown * s.mods.beamCd, unit: 's', digits: 1 },
    afterburn: { name: 'LANCE AFTERBURN', blurb: 'The Lance keeps burning after release: extra damage pulses.', label: 'Lance pulses', read: s => 2 + s.mods.beamLinger },
    conductor: { name: 'RESONANCE', blurb: 'Every enemy the Lance pierces feeds your Drive.', label: 'Drive per hit' },
    bloombulk: { name: 'WIDE HORIZON', blurb: 'Zero Horizon detonations grow bigger and harder.', label: 'Detonation radius', read: s => SORA.r.radius * s.mods.sphereRadius },
    novacool: { name: 'HORIZON COOLING', blurb: 'Zero Horizon recharges sooner.', label: 'Horizon cooldown', read: s => SORA.r.cooldown * s.mods.sphereCd, unit: 's', digits: 1 },
    afterglow: { name: 'AFTERIMAGE', blurb: 'Zero Horizon detonates a second time at half strength.', label: 'Second detonation' },
    twinbloom: { name: 'TWIN HORIZON', blurb: 'The Afterimage detonation lands at full strength.', label: 'Second detonation' },
    flareheart: { name: 'SOVEREIGN HEART', blurb: 'Azure Sovereign lasts longer before it fades.', label: 'Sovereign drain' },
    embercore: { name: 'ZENITH CORE', blurb: 'Azure Sovereign hits much harder and returns twice as fast.', label: 'Sovereign power' },
  },
  vex: {
    impact: { name: 'KEEN EDGE', blurb: 'Null Blade strikes hit harder.', label: 'Blade damage' },
    tempo: { name: 'QUICKEN', blurb: 'Null Blade strikes faster.', label: 'Strikes / sec' },
    reach: { name: 'LONG EDGE', blurb: 'Null Blade reaches further.', label: 'Blade range' },
    echo: { name: 'TWIN EDGE', blurb: 'Null Blade hits one more enemy per sweep.', label: 'Targets / sweep' },
    pulse: { name: 'HALO ENGINE', blurb: 'Parry Halo ripostes hit harder and reach wider.', label: 'Riposte damage', read: s => s.player.qDamage * VEX.q.riposteMul },
    widelance: { name: 'LONG SHIFT', blurb: 'Rift Reversal shifts further and its riposte reaches wider.', label: 'Shift distance', read: s => VEX.e.distance * s.mods.beamWidth },
    hardlight: { name: 'KEEN RIPOSTE', blurb: 'Rift Reversal ripostes hit harder.', label: 'Riposte damage', read: s => s.player.qDamage * VEX.e.riposteMul * s.mods.beamDamage },
    lancecool: { name: 'REVERSAL COOLING', blurb: 'Rift Reversal recharges sooner.', label: 'Reversal cooldown', read: s => VEX.e.cooldown * s.mods.beamCd, unit: 's', digits: 1 },
    afterburn: { name: 'FRACTURE TRAIL', blurb: 'Rift Reversal ripostes one more foe.', label: 'Riposte targets', read: s => 1 + s.mods.beamLinger },
    conductor: { name: 'OATH CONDUCTOR', blurb: 'Every riposte and perfect parry feeds your Drive.', label: 'Drive per riposte' },
    bloombulk: { name: 'WIDE SEAL', blurb: 'Oathbreaker Seal detonations hit harder and wider.', label: 'Seal wave', read: s => VEX.r.wave * s.mods.sphereRadius },
    novacool: { name: 'SEAL COOLING', blurb: 'Oathbreaker Seal recharges sooner.', label: 'Seal cooldown', read: s => VEX.r.cooldown * s.mods.sphereCd, unit: 's', digits: 1 },
    afterglow: { name: 'OATH ECHO', blurb: 'The Seal detonates a second time at half strength.', label: 'Second detonation' },
    twinbloom: { name: 'TWIN OATH', blurb: 'The Oath Echo lands at full strength.', label: 'Second detonation' },
    flareheart: { name: 'RIFT HEART', blurb: 'Riftbound and Voidheart last longer before they fade.', label: 'Form drain' },
    embercore: { name: 'EXILE CORE', blurb: 'Your transformation hits much harder and returns twice as fast.', label: 'Form power' },
    surgecell: { blurb: 'Build Drive faster from strikes, parries and kills.' },
    plating: { blurb: 'Take less damage from everything; a late guard softens even more.' },
  },
};
export const heroKit = (hero: HeroId) => (hero === 'kai' ? null : HERO_KIT[hero]);
export const heroBase = (hero: 'ren' | 'sora' | 'vex') => RS[hero].base;
