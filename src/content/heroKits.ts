/** B19: every number and every word of Ren's and Sora's kits. The sim, the renderers, the audio and the HUD read these; nothing here knows about Phaser. */
import type { HeroId } from './heroes';
import type { UpgradeCategory, UpgradeId } from './upgrades';

export type HeroAct = 'crimson_break' | 'meteor_rush' | 'bloodstar' | 'azure_volley' | 'celestial_lance' | 'zero_horizon';

/** Both new heroes have exactly one transformation (form id 1). The unlock is the same milestone for each, earned by playing that hero. */
export const ASCEND = {
  unlockBoss: 'warden' as const,
  charge: 100, cooldown: 22,
  cinemaFirst: { dur: 2.7, breakAt: 1.55, commitAt: 1.75 },
  cinemaRepeat: { dur: 1.15, breakAt: 0.52, commitAt: 0.64 },
  knockRadius: 260, knockPush: 150, stagger: 0.9,
  ren: { drain: 3.4, speedMul: 1.1, autoMul: 1.3 },
  sora: { drain: 3.4, speedMul: 1.12, autoMul: 1.25 },
} as const;

export const REN = {
  base: { hp: 130, speed: 238, attackDamage: 13, attackPeriod: 0.48, attackRange: 104, targets: 2, qDamage: 34, qRadius: 124, radius: 17 },
  auto: { name: 'Hammer Chain', arcDeg: 70, step: 3, finisherMul: 1.7, finisherPush: 120, lunge: 10 },
  q: { name: 'Crimson Break', cooldown: 7.5, beats: 5, gap: 0.115, formBeats: 7, formGap: 0.082, beatMul: 0.2, finisherMul: 1.6, arcDeg: 75, step: 14, moveScale: 0.62, recover: 0.2, formReach: 1.2 },
  e: { name: 'Meteor Rush', cooldown: 9, hops: 3, formHops: 5, seek: 340, chain: 270, hopTime: 0.15, strikeTime: 0.09, blast: 72, damage: 23, fallback: 230, fallbackBlast: 84, fallbackDamage: 20, recover: 0.16, formBlast: 1.35, arrival: 6 },
  r: { name: 'Bloodstar Impact', cooldown: 18, windup: 0.32, flight: 0.46, recover: 0.38, range: 380, defaultRange: 280, radius: 205, damage: 62, edgeFalloff: 0.55, push: 220, stagger: 0.7, ring: 1.32, ringDamage: 0.5, ringAt: 0.2, formRebound: 1.5, reboundAt: 0.55, reboundDamage: 0.6, formDamage: 1.2 },
} as const;

export const SORA = {
  base: { hp: 116, speed: 258, attackDamage: 10, attackPeriod: 0.5, attackRange: 360, targets: 1, qDamage: 34, qRadius: 132, radius: 17 },
  auto: { name: 'Azure Needle', speed: 780, radius: 7, homing: 0.045, muzzle: 22, formPierce: 1 },
  q: { name: 'Azure Volley', cooldown: 7.5, bolts: 7, formBolts: 11, spreadDeg: 56, formSpreadDeg: 40, speed: 700, ttl: 0.72, boltMul: 0.17, burst: 0.16, windup: 0.16, recover: 0.2, moveScale: 0.45, formHoming: 0.07, radius: 8 },
  e: { name: 'Celestial Lance', cooldown: 9.5, tiers: [0.3, 0.8, 1.3] as readonly number[], maxCharge: 1.3, minCharge: 0.3, halfWidth: [20, 28, 38] as readonly number[], length: [540, 640, 740] as readonly number[], damage: [24, 38, 58] as readonly number[], fire: 0.26, recover: 0.22, moveCharge: 0.22, moveFire: 0, cancelCooldown: 0.4, formTierBoost: 1, formWidth: 1.3, formArcs: 3, formArcRange: 120, formFlare: 96 },
  r: { name: 'Zero Horizon', cooldown: 23, orbs: 5, formOrbs: 8, summon: 0.5, orbit: 0.7, formOrbit: 0.95, travel: 0.5, orbitRadius: 68, range: 400, radius: 92, damage: 29, formRing: 230, formRingDamage: 0.4, recover: 0.3, moveScale: 0.4, formDamage: 1.2 },
} as const;

/** Display metadata the HUD, hero select and results read. */
export interface HeroKitInfo { act: { q: string; e: string; r: string }; auto: string; form: string; formShort: string; quote: string; roleLine: string; blurbs: { auto: string; q: string; e: string; r: string; form: string }; catNames: Partial<Record<UpgradeCategory, string>> }
export const HERO_KIT: Record<'ren' | 'sora', HeroKitInfo> = {
  ren: {
    act: { q: REN.q.name, e: REN.e.name, r: REN.r.name }, auto: REN.auto.name, form: 'Crimson Ascendant', formShort: 'ASCENDANT',
    quote: 'Pressure is the only plan.', roleLine: 'Close-range brawler · risk and momentum',
    blurbs: { auto: 'Heavy chained punches hit every enemy in a short arc; every third blow lands harder.', q: 'A rapid five-beat punch combination that steps into the crowd. Works while moving.', e: 'Rush through up to three nearby enemies, exploding on each. With nobody near, dash forward and burst.', r: 'Leap to the target, slam down and release a crimson shockwave that throws the crowd back.', form: 'Full Drive and F: deep red hair, a crimson aura and faster, harder Break, Rush and Impact.' },
    catNames: { core: 'CORE', beam: 'RUSH', sphere: 'IMPACT', survival: 'SURVIVAL', mobility: 'MOBILITY', pickup: 'SALVAGE', drive: 'ASCENT' },
  },
  sora: {
    act: { q: SORA.q.name, e: SORA.e.name, r: SORA.r.name }, auto: SORA.auto.name, form: 'Azure Sovereign', formShort: 'SOVEREIGN',
    quote: 'Distance is a kind of grace.', roleLine: 'Ranged controller · spacing and precision',
    blurbs: { auto: 'Fast homing blue needles fire at the nearest enemies from a safe distance.', q: 'A quick fan of blue energy bolts for lane control. Works while moving.', e: 'Hold E to gather a piercing beam, release to fire. Longer charge means wider, longer and harder.', r: 'Summon orbiting spheres, then send them to converge on enemies and detonate together.', form: 'Full Drive and F: electric blue hair, a blue-white aura, finer Volley, a brighter Lance and a wider Horizon.' },
    catNames: { core: 'CORE', beam: 'LANCE', sphere: 'HORIZON', survival: 'SURVIVAL', mobility: 'MOBILITY', pickup: 'SALVAGE', drive: 'SOVEREIGN' },
  },
};

export interface UpgradeOverride { name?: string; blurb?: string; label?: string; /** replaces the card's number (the actual stat of THIS hero's ability) */ read?: (s: { player: { attackDamage: number; attackPeriod: number; attackRange: number; targets: number; qDamage: number; qRadius: number }; mods: { beamWidth: number; beamDamage: number; beamCd: number; beamLinger: number; sphereRadius: number; sphereDamage: number; sphereCd: number; sphereEcho: number; formDrain: number; formPower: number } }) => number; unit?: string; digits?: number }
const RS = { ren: REN, sora: SORA };
/** Hero-specific wording and the number each card actually changes. Cards not listed keep Kai's wording (they are hero-neutral: health, speed, pickup, XP, dash, regen...). */
export const UPGRADE_OVERRIDES: Record<'ren' | 'sora', Partial<Record<UpgradeId, UpgradeOverride>>> = {
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
};
export const heroKit = (hero: HeroId) => (hero === 'kai' ? null : HERO_KIT[hero]);
export const heroBase = (hero: 'ren' | 'sora') => RS[hero].base;
