/** B31A Fracture Chronicles: the four-hero story campaign. Pure data + pure helpers.
 *  Canon (short): the Order of the Unbroken Line wove the Line across the world's one seam; each Vanguard bonded a fragment of it that took beast shape (Kai the dragon, Ren the fox, Sora the phoenix, Vex the guardian).
 *  The Fracture is that Line cut from the inside by the Accord, the Order's own council, who meant to draw on the seam. Its offices (Warden, Seraph, Castellan, Regent, Mirror Tyrant, Hollow Choir, Sovereign) went hollow; the Oathkeeper kept the vows and exiled the one who objected (Vex).
 *  Every arc finds one clue of that truth; the finale re-knots the Line against the Sovereign and leaves the seam itself open.
 *  Vex's three chapters are the original Trial of the Oathbroken (`vex_trial_1..3`, b22/story.ts) and keep their own plans, rewards and records. */
import type { ArenaId } from '../content/arenas';
import type { HeroId } from '../content/heroes';
import { mk, vexChapterPlan, type EncounterStep, type RunPlan } from '../b22/plan';
import type { ModifierId } from '../b22/challenges';
import { STORY, type StoryBeat } from '../b22/story';

export type ChronicleId = 'kai_1' | 'kai_2' | 'kai_3' | 'ren_1' | 'ren_2' | 'ren_3' | 'sora_1' | 'sora_2' | 'sora_3' | 'vex_1' | 'vex_2' | 'vex_3' | 'finale';
export const CHRONICLE_IDS: readonly ChronicleId[] = ['kai_1', 'kai_2', 'kai_3', 'ren_1', 'ren_2', 'ren_3', 'sora_1', 'sora_2', 'sora_3', 'vex_1', 'vex_2', 'vex_3', 'finale'];
export const isChronicleId = (v: unknown): v is ChronicleId => typeof v === 'string' && (CHRONICLE_IDS as readonly string[]).includes(v);
export const ARC_HEROES: readonly HeroId[] = ['kai', 'ren', 'sora', 'vex'];
export interface LoreEntry { title: string; text: string }
export interface ChronicleDef {
  id: ChronicleId; hero: HeroId | null; n: number; name: string; kicker: string; arena: ArenaId;
  /** one-line mission objective shown on the map, the loading screen and in the HUD */ objective: string; rules: string; length: string;
  plan: RunPlan; intro: StoryBeat; outro: StoryBeat; lore: LoreEntry; art: string;
  /** one-time Marks on first completion (0 for Vex's originals: they keep their own rewards) */ marks: number;
}

const wave = (id: string, trigger: 'time' | 'after_prev', at: number, w: { kind: string; n: number }[], ends = false, text = '', sub = ''): EncounterStep => ({ id, kind: 'elite_wave', trigger, at, reward: ends ? 'victory' : 'none', ends, wave: w, warnAt: trigger === 'time' ? Math.max(0, at - 4) : undefined, warnText: text, warnSub: sub });
const hold = (secs: number, text: string, sub: string): EncounterStep => ({ id: 'hold', kind: 'hold', trigger: 'time', at: 2, hold: secs, reward: 'victory', ends: true, warnAt: 0.4, warnText: text, warnSub: sub });
const duel = (id: string, boss: EncounterStep['boss'], trigger: 'time' | 'after_prev', at: number, hpMul: number, ends: boolean, text: string, sub: string): EncounterStep => ({ id, kind: 'boss', boss, trigger, at, reward: ends ? 'victory' : 'heal_pick', ends, hpMul, warnText: text, warnSub: sub });
const plan = (id: string, name: string, hero: HeroId | null, arena: ArenaId, blurb: string, steps: EncounterStep[], o: { mobs?: 'full' | 'adds' | 'none'; threat?: [number, number][]; cap?: number; mods?: ModifierId[] } = {}): RunPlan =>
  mk({ mode: 'campaign', id: `chronicle_${id}`, name, blurb, heroLock: hero, arena, steps, mobs: o.mobs ?? 'full', breathers: false, ranked: false, duration: o.cap ?? 0, threat: o.threat ?? [[0, 3], [90, 7], [240, 12]], modifiers: o.mods ?? [] });

const P = { kai: 'ui/kai-portrait-base.png', kaiF1: 'ui/kai-portrait-f1.png', kaiF2: 'ui/kai-portrait-f2.png', kaiF3: 'ui/kai-portrait-f3.png', ren: 'ui/heroes/ren-portrait-base.webp', renF: 'ui/heroes/ren-portrait-f1.webp', sora: 'ui/heroes/sora-portrait-base.webp', soraF: 'ui/heroes/sora-portrait-f1.webp', vex: 'ui/heroes/vex-portrait-base.webp', vexF1: 'ui/heroes/vex-portrait-f1.webp', vexF2: 'ui/heroes/vex-portrait-f2.webp' };
const L = (who: string, text: string) => ({ who, text });
const beat = (title: string, place: string, art: string, portraits: Record<string, string>, lines: { who: string; text: string }[]): StoryBeat => ({ title, place, art: `art/chronicles/${art}.webp`, portraits, lines });

type Draft = Omit<ChronicleDef, 'plan' | 'marks'> & { plan: RunPlan; marks?: number };
const DRAFTS: Draft[] = [
  { id: 'kai_1', hero: 'kai', n: 1, name: 'The Ignition Debt', kicker: 'KAI · I', arena: 'gloam', objective: 'Hold the reactor for 3:30', rules: 'Survive while the core overloads. No form needed.', length: '~4 min', art: 'kai_1',
    plan: plan('kai_1', 'The Ignition Debt', 'kai', 'gloam', 'Hold the Gloam reactor while the core overloads.', [hold(210, 'HOLD THE REACTOR', 'Survive 3:30 while the core overloads')], { cap: 280, threat: [[0, 3], [60, 7], [150, 12], [240, 16]] }),
    intro: beat('I · THE IGNITION DEBT', 'The Gloam Circuit, one hour after the blackout', 'kai_1', { KAI: P.kai }, [
      L('NARRATOR', 'Three nights ago a relay tower in the Gloam went dark. Kai was the one who ran past it.'),
      L('KAI', 'I saw the alarm. I thought I could clear the next sector first. Fast was the whole plan.'),
      L('NARRATOR', 'The reactor is still bleeding power into a fracture that grows by the minute. Someone has to stand in the hall until it settles.'),
      L('KAI', 'Then it is my hall. I will not run past this one.')]),
    outro: beat('THE DEBT IS PAID', 'The Gloam Circuit, after', 'kai_1', { KAI: P.kai }, [
      L('KAI', 'The relay log is still readable. The cut was not an overload. Someone opened the tower from inside.'),
      L('NARRATOR', 'The signature is old and precise: a key of the Order of the Unbroken Line.'),
      L('KAI', 'Fast got me here. It will not get me the rest of the way. I need to learn to stand.')]),
    lore: { title: 'The Relay Log', text: 'The Gloam relay did not fail. Its seal was opened with an Order key, cleanly, from the inside. Whoever cut the tower knew exactly where the Line was weakest.' } },
  { id: 'kai_2', hero: 'kai', n: 2, name: 'The Dragon’s Weight', kicker: 'KAI · II', arena: 'ashen', objective: 'Break two assaults, then the Warden’s echo', rules: 'Dash chaining is rewarded. No form needed.', length: '~6 min', art: 'kai_2',
    plan: plan('kai_2', 'The Dragon’s Weight', 'kai', 'ashen', 'Two assaults and the echo of the Fracture Warden.', [
      wave('assault1', 'time', 20, [{ kind: 'aegis', n: 1 }, { kind: 'pursuer', n: 4 }], false, 'FIRST ASSAULT', 'Break the shield-bearer'),
      wave('assault2', 'after_prev', 10, [{ kind: 'aegis', n: 2 }, { kind: 'pursuer', n: 5 }], false, 'SECOND ASSAULT', 'They come harder'),
      duel('warden_echo', 'warden', 'after_prev', 8, 0.4, true, 'AN ECHO OF THE WARDEN', 'Hold your ground')], { mobs: 'none', cap: 540, mods: ['fractured_momentum'] }),
    intro: beat('II · THE DRAGON’S WEIGHT', 'The Ashen Reliquary, under falling ash', 'kai_2', { KAI: P.kaiF1 }, [
      L('NARRATOR', 'Whenever Kai burns, something vast answers: a dragon of solar fire that has never once asked to be called.'),
      L('KAI', 'It follows me into every fight. I used to think it was a weapon.'),
      L('NARRATOR', 'The Fracture Warden has come to the Reliquary. It carries a severed thread of light, the same colour as the dragon.'),
      L('KAI', 'If that thread is the same as my bond, then the dragon is not mine. It is the Line’s. And it chose to stay.')]),
    outro: beat('THE WEIGHT HELD', 'The Ashen Reliquary, after', 'kai_2', { KAI: P.kaiF2 }, [
      L('NARRATOR', 'The Warden’s echo falls apart into ash and one loose thread of the Line.'),
      L('KAI', 'It guarded the seam. For years. Then someone told it to stand aside, and the office went hollow.'),
      L('NARRATOR', 'Cometheart rises in him: not fury, but a decision to carry the dragon’s weight on purpose.')]),
    lore: { title: 'The Warden’s Thread', text: 'The Fracture Warden once guarded the seam. The thread it carries is a piece of the Unbroken Line, and it matches the bond of Kai’s dragon: the beasts are the Line, choosing to stay.' } },
  { id: 'kai_3', hero: 'kai', n: 3, name: 'Stillfire', kicker: 'KAI · III', arena: 'aetherfall', objective: 'Defeat the Crownless Castellan in a duel', rules: 'No wandering enemies. Just the Castellan.', length: '~4 min', art: 'kai_3',
    plan: plan('kai_3', 'Stillfire', 'kai', 'aetherfall', 'A duel with the Crownless Castellan.', [duel('castellan', 'castellan', 'time', 3, 0.55, true, 'THE CROWNLESS CASTELLAN', 'Stand still. Strike true.')], { mobs: 'none', cap: 420 }),
    intro: beat('III · STILLFIRE', 'The Aetherfall Citadel, between two storms', 'kai_3', { KAI: P.kaiF2 }, [
      L('NARRATOR', 'The Castellan has stood at the Citadel gate since before the Fracture, a crown of nothing on its head.'),
      L('KAI', 'It carries a seal I know. It is stamped with the mark of the Accord, the council that ran the Order.'),
      L('NARRATOR', 'There is no horde here. Only the gate, and the one who keeps it.'),
      L('KAI', 'Calm. Not slow. Calm.')]),
    outro: beat('STILLFIRE APEX', 'The Aetherfall Citadel, after', 'kai_3', { KAI: P.kaiF3 }, [
      L('KAI', 'The Castellan’s seal is the Accord’s. They did not lose the Line. They cut it.'),
      L('NARRATOR', 'The silver dragon settles around him like a held breath. Stillfire Apex is not a new power. It is a quieter way of using the same one.'),
      L('KAI', 'Then we find the others. This is bigger than one hall.')]),
    lore: { title: 'The Accord’s Seal', text: 'The Castellan’s gate-seal carries the mark of the Accord, the Order’s council. It was set the night the Line was cut, to keep anyone from walking the Citadel and seeing why.' } },

  { id: 'ren_1', hero: 'ren', n: 1, name: 'Crossed Oath', kicker: 'REN · I', arena: 'ashen', objective: 'Break three waves with half your health', rules: 'You take double damage in effect (half health), and earn more XP.', length: '~5 min', art: 'ren_1',
    plan: plan('ren_1', 'Crossed Oath', 'ren', 'ashen', 'Three waves at the Ashen gate under the Glass Vanguard rule.', [
      wave('gate1', 'time', 12, [{ kind: 'pursuer', n: 6 }], false, 'THE GATE', 'Hold the doorway'),
      wave('gate2', 'after_prev', 8, [{ kind: 'aegis', n: 1 }, { kind: 'pursuer', n: 4 }], false, 'SECOND RANK', 'Shields forward'),
      wave('gate3', 'after_prev', 8, [{ kind: 'aegis', n: 2 }], true, 'LAST RANK', 'End it')], { mobs: 'none', cap: 480, mods: ['glass_vanguard'] }),
    intro: beat('I · CROSSED OATH', 'The Ashen Reliquary, the outer gate', 'ren_1', { REN: P.ren }, [
      L('NARRATOR', 'Ren swore to hold the Reliquary gate until the wounded were out. The order to abandon the gate came the same night.'),
      L('REN', 'Strong enough to stay. That was the only vow I knew how to keep.'),
      L('NARRATOR', 'Shield-bearers push against the gate in ranks. Ren has half of his usual strength to give: a wound that has not closed.'),
      L('REN', 'Half is enough if I stop swinging at everything.')]),
    outro: beat('THE GATE STANDS', 'The Ashen Reliquary, after', 'ren_1', { REN: P.ren }, [
      L('NARRATOR', 'Behind the gate, in the dust of a records vault, a single order remains: abandon the outer gates. It is stamped with the Accord’s mark.'),
      L('REN', 'They told us to leave. Not because we would lose. Because someone needed the gates open.'),
      L('REN', 'I held a door for nothing. No. For them. That still counts.')]),
    lore: { title: 'Order to Abandon', text: 'The Reliquary vault holds one surviving order: abandon the outer gates. It carries the Accord’s mark and the date the Line was cut. The gates were opened on purpose.' } },
  { id: 'ren_2', hero: 'ren', n: 2, name: 'Nine Tails', kicker: 'REN · II', arena: 'gloam', objective: 'Hold the line against shield-bearers for 4:00', rules: 'Shield-bearers gather in numbers, and XP is doubled.', length: '~5 min', art: 'ren_2',
    plan: plan('ren_2', 'Nine Tails', 'ren', 'gloam', 'Hold the Gloam under the Guardian’s Burden rule.', [hold(240, 'HOLD THE LINE', 'Survive 4:00 against the shield-bearers')], { cap: 320, threat: [[0, 4], [60, 8], [180, 14], [260, 18]], mods: ['guardians_burden'] }),
    intro: beat('II · NINE TAILS', 'The Gloam Circuit, the last transit hall', 'ren_2', { REN: P.ren }, [
      L('NARRATOR', 'A fox of crimson flame has walked beside Ren since the first fight. It has nine tails, and it has never lit all of them.'),
      L('REN', 'It will not unfold until I stop trying to win.'),
      L('NARRATOR', 'The shield-bearers advance together, in lines, the way the Order taught them. Ren has fought beside them before.'),
      L('REN', 'They are not my enemy. They are the ones nobody came back for.')]),
    outro: beat('THE LINE HOLDS', 'The Gloam Circuit, after', 'ren_2', { REN: P.renF }, [
      L('NARRATOR', 'The fox’s ninth tail lights, and every thread it casts is a piece of the Unbroken Line, tying itself back to something.'),
      L('REN', 'The Line was never a wall. It was a promise between people. That is why it could be cut.'),
      L('NARRATOR', 'The shield-bearers kneel, and then dissolve into quiet light.')]),
    lore: { title: 'A Promise, Not a Wall', text: 'The nine-tailed fox is a fragment of the Line given shape. Its tails are bonds between keepers. The Line holds only while the promise between people holds, and that is why a council could cut it.' } },
  { id: 'ren_3', hero: 'ren', n: 3, name: 'The Price of Ascension', kicker: 'REN · III', arena: 'paradox', objective: 'Defeat the Mirror Tyrant without a second wind', rules: 'No Second Wind. The Mirror Tyrant at reduced health.', length: '~5 min', art: 'ren_3',
    plan: plan('ren_3', 'The Price of Ascension', 'ren', 'paradox', 'A duel with the Mirror Tyrant. No Second Wind.', [duel('mirror', 'mirror_tyrant', 'time', 4, 0.5, true, 'THE MIRROR TYRANT', 'Your reflection fights as you do')], { mobs: 'adds', cap: 480, mods: ['no_second_wind'] }),
    intro: beat('III · THE PRICE OF ASCENSION', 'The Paradox Expanse, the mirrored hall', 'ren_3', { REN: P.ren }, [
      L('NARRATOR', 'Crimson Ascendant makes Ren stronger every moment it burns, and it takes something back with every flame.'),
      L('REN', 'I always paid the price with my own health. Today I want to see what it costs the world.'),
      L('NARRATOR', 'The Mirror Tyrant waits in the folded glass, and it fights exactly as Ren does. There is no second wind in this hall.'),
      L('REN', 'Strength against strength gets us both killed. So I will not give it the strength to copy.')]),
    outro: beat('CRIMSON ASCENDANT', 'The Paradox Expanse, after', 'ren_3', { REN: P.renF }, [
      L('NARRATOR', 'In the shards of the Tyrant’s mirror, a council of seven robed figures cuts a glowing line with one stroke.'),
      L('REN', 'Seven of them. They thought strength was a thing you could take from the seam.'),
      L('REN', 'Strength is what you spend to keep a promise. Not what you keep.')]),
    lore: { title: 'Seven in the Glass', text: 'The Mirror Tyrant’s shards replay the cut: seven robed members of the Accord severing the Line together. Ren recognises the gesture. It is the same one used to open a vow.' } },

  { id: 'sora_1', hero: 'sora', n: 1, name: 'Zero Horizon', kicker: 'SORA · I', arena: 'aetherfall', objective: 'Break two aerial assaults under a rain of fire', rules: 'Enemy ranged fire is heavier. Precision matters.', length: '~5 min', art: 'sora_1',
    plan: plan('sora_1', 'Zero Horizon', 'sora', 'aetherfall', 'Two assaults at the Citadel under the Prismatic Rain rule.', [
      wave('lance1', 'time', 15, [{ kind: 'sky_lancer', n: 4 }], false, 'THE FIRST VOLLEY', 'Find the lancers'),
      wave('lance2', 'after_prev', 10, [{ kind: 'sky_lancer', n: 3 }, { kind: 'citadel_bulwark', n: 2 }], true, 'THE BULWARK', 'Break their guard')], { mobs: 'none', cap: 420, mods: ['prismatic_rain'] }),
    intro: beat('I · ZERO HORIZON', 'The Aetherfall Citadel, the broken bridge', 'sora_1', { SORA: P.sora }, [
      L('NARRATOR', 'Sora has never missed a shot that mattered. That is the problem. A person who never misses begins to think nothing needs trusting.'),
      L('SORA', 'Every line I draw lands where I want it. I stopped asking whether I should.'),
      L('NARRATOR', 'Sky lancers fill the air with light. The Citadel is old, and every fall is a long one.'),
      L('SORA', 'Zero horizon. Nothing in the way. Then let us see how far that sees.')]),
    outro: beat('THE LINE IS CLEAN', 'The Aetherfall Citadel, after', 'sora_1', { SORA: P.sora }, [
      L('SORA', 'The cuts across the Citadel are straight, every one. No struggle, no panic. Nothing like a fracture.'),
      L('NARRATOR', 'It was surgery. The Line was opened by hands that knew exactly where it would hold.'),
      L('SORA', 'Whoever did this was as precise as I am. I do not like how that feels.')]),
    lore: { title: 'The Surgical Cut', text: 'Every wound across the Aetherfall Citadel is perfectly straight. No panic, no resistance. The Line was not broken in a fight. It was cut by someone who understood it completely.' } },
  { id: 'sora_2', hero: 'sora', n: 2, name: 'Trust Fall', kicker: 'SORA · II', arena: 'paradox', objective: 'Hold the folds for 4:30', rules: 'Mirror March: reflections of enemies join in. No form needed.', length: '~5 min', art: 'sora_2',
    plan: plan('sora_2', 'Trust Fall', 'sora', 'paradox', 'Hold the Paradox folds under the Mirror March rule.', [hold(270, 'HOLD THE FOLDS', 'Survive 4:30 while the mirrors march')], { cap: 340, threat: [[0, 3], [90, 8], [200, 13], [300, 16]], mods: ['mirror_march'] }),
    intro: beat('II · TRUST FALL', 'The Paradox Expanse, the folded stair', 'sora_2', { SORA: P.sora }, [
      L('NARRATOR', 'The Paradox Expanse shows what happened here, if you stop trying to control where you stand.'),
      L('SORA', 'I cannot aim at a place that moves. So I will have to trust it before I can shoot.'),
      L('NARRATOR', 'Reflections of the enemy march in behind the real ones. The fold wants to see how Sora fights when nothing is certain.'),
      L('SORA', 'Falling backwards is easier when you know someone is behind you. I only know a phoenix.')]),
    outro: beat('THE CATCH', 'The Paradox Expanse, after', 'sora_2', { SORA: P.soraF }, [
      L('NARRATOR', 'In the last fold the night of the cut plays through: seven figures, then a closing door, then a voice that says “now”.'),
      L('SORA', 'They did not hesitate. They did not even look at what they were cutting.'),
      L('NARRATOR', 'Something catches Sora from behind: feathers of pale blue light. The phoenix has been there all along.')]),
    lore: { title: 'The Closing Door', text: 'The last fold replays the night of the cut: seven figures, a door that closes, and a single spoken word. The Accord did not hesitate. Sora’s phoenix has been catching every fall.' } },
  { id: 'sora_3', hero: 'sora', n: 3, name: 'Azure Sovereign', kicker: 'SORA · III', arena: 'aetherfall', objective: 'Silence the Hollow Choir', rules: 'A duel with the Choir. Wandering enemies join only while it lives.', length: '~5 min', art: 'sora_3',
    plan: plan('sora_3', 'Azure Sovereign', 'sora', 'aetherfall', 'Silence the Hollow Choir above the Citadel.', [duel('choir', 'hollow_choir', 'time', 4, 0.5, true, 'THE HOLLOW CHOIR', 'Their song names the lost')], { mobs: 'adds', cap: 480 }),
    intro: beat('III · AZURE SOVEREIGN', 'The Aetherfall Citadel, the choir loft', 'sora_3', { SORA: P.soraF }, [
      L('NARRATOR', 'The Hollow Choir sings one list over and over: the names of every keeper who volunteered to hold the Line.'),
      L('SORA', 'They are all in there. Hundreds. They never asked to be cut loose.'),
      L('NARRATOR', 'Sora can finish this precisely. Or give up the safe angle and let the phoenix burn the Choir’s hollow song down to its last true name.'),
      L('SORA', 'I trust you. Go.')]),
    outro: beat('AZURE SOVEREIGN', 'The Aetherfall Citadel, after', 'sora_3', { SORA: P.soraF }, [
      L('NARRATOR', 'The Choir’s song ends on a single name, and it is not a keeper’s. It is the name of the council’s last seat: the Sovereign.'),
      L('SORA', 'The Sovereign is still sitting. It never stopped cutting. It only stopped being seen.'),
      L('NARRATOR', 'The phoenix burns pale blue, and does not dim.')]),
    lore: { title: 'The Names in the Song', text: 'The Hollow Choir’s song is the roll of every keeper who volunteered to hold the Line. It ends on the name of the council’s last seat: the Sovereign, who never stopped cutting.' } },

  { id: 'vex_1', hero: 'vex', n: 1, name: 'The Broken Oath', kicker: 'VEX · I', arena: 'gloam', objective: 'Break the Order’s trial wave', rules: 'The original Trial of the Oathbroken, chapter I.', length: '~3 min', art: 'story_1', plan: vexChapterPlan(1), intro: STORY[0].intro, outro: STORY[0].outro,
    lore: { title: 'The Exile’s Word', text: 'Vex objected on the night the Accord voted to cut the Line. For that the Order called Vex the cause. The wardens sent to finish the exile were taught to hold straight, certain, and late.' }, marks: 0 },
  { id: 'vex_2', hero: 'vex', n: 2, name: 'The Fractured Accord', kicker: 'VEX · II', arena: 'paradox', objective: 'Survive the folds, then face a shadow of the Order', rules: 'The original Trial, chapter II. Unlocks Riftbound.', length: '~5 min', art: 'story_2', plan: vexChapterPlan(2), intro: STORY[1].intro, outro: STORY[1].outro,
    lore: { title: 'An Argument in Every Fold', text: 'The Accord never agreed on what the Order was for. The Paradox Expanse kept each of their old arguments alive, and that is how Vex learned which of them had wanted the Line cut.' }, marks: 0 },
  { id: 'vex_3', hero: 'vex', n: 3, name: 'Judgment of the Exile', kicker: 'VEX · III', arena: 'paradox', objective: 'Duel the Oathkeeper', rules: 'The original Trial, chapter III. Unlocks Voidheart Exile.', length: '~4 min', art: 'story_3', plan: vexChapterPlan(3), intro: STORY[2].intro, outro: STORY[2].outro,
    lore: { title: 'The Oathkeeper’s Verdict', text: 'The Oathkeeper kept the vows, and so exiled Vex. In the end it judged not for the Order, but for the oath, which is the same side the guardian has always stood on.' }, marks: 0 },

  { id: 'finale', hero: null, n: 4, name: 'The Unbroken Line', kicker: 'FINALE', arena: 'paradox', objective: 'Re-knot the Line: two waves, the Regent, then the Sovereign', rules: 'Pick any runner. Four stages, a heal and a card between the Regent and the Sovereign.', length: '~10 min', art: 'finale',
    plan: plan('finale', 'The Unbroken Line', null, 'paradox', 'The shared finale against the Sovereign.', [
      wave('knot1', 'time', 10, [{ kind: 'phase_harrier', n: 4 }, { kind: 'rift_mimic', n: 3 }], false, 'THE FIRST KNOT', 'Break the vanguard'),
      wave('knot2', 'after_prev', 6, [{ kind: 'citadel_bulwark', n: 2 }, { kind: 'sky_lancer', n: 3 }, { kind: 'aegis', n: 2 }], false, 'THE SECOND KNOT', 'Hold together'),
      duel('regent', 'regent', 'after_prev', 6, 0.35, false, 'THE PARADOX REGENT', 'The Accord’s hand'),
      duel('sovereign', 'sovereign', 'after_prev', 8, 0.45, true, 'THE SOVEREIGN', 'End the cutting')], { mobs: 'adds', cap: 1500, threat: [[0, 2], [120, 6], [600, 10]] }),
    intro: beat('THE UNBROKEN LINE', 'The Nexus, where the world holds still', 'finale', { KAI: P.kaiF3, REN: P.renF, SORA: P.soraF, VEX: P.vexF2 }, [
      L('NARRATOR', 'Four runners, four clues. A key opened from inside; a thread that chose to stay; a gate left open by order; seven figures in the glass; a song that ends on a single name.'),
      L('KAI', 'The Accord cut the Line to draw on the seam. The offices went hollow because the promise that held them was gone.'),
      L('REN', 'It was never a wall. It was us. Every bond was a stitch.'),
      L('SORA', 'And the Sovereign is still sitting in the last seat, still cutting.'),
      L('VEX', 'Then we stop it. Not for the Order. For the oath.')]),
    outro: beat('THE LINE, KNOTTED', 'The Nexus, after', 'finale', { KAI: P.kaiF3, REN: P.renF, SORA: P.soraF, VEX: P.vexF2 }, [
      L('NARRATOR', 'The Sovereign’s severed end falls into four bonded hands, and the Line ties itself back together: a thread for each beast, a stitch for each keeper.'),
      L('KAI', 'The Fracture is still there.'),
      L('SORA', 'Of course it is. The seam was never closed. We only stopped it being cut.'),
      L('REN', 'Then something else has been on the other side this whole time.'),
      L('VEX', 'And now it knows the Line holds.')]),
    lore: { title: 'The Knotted Line', text: 'The Sovereign’s end of the Line is knotted back by four bonded keepers. The seam itself remains open. Something on the far side has noticed that the promise holds again.' }, marks: 600 },
];
const MARKS: Record<string, number> = { kai_1: 150, kai_2: 200, kai_3: 250, ren_1: 150, ren_2: 200, ren_3: 250, sora_1: 150, sora_2: 200, sora_3: 250 };
export const CHRONICLES: readonly ChronicleDef[] = DRAFTS.map(d => ({ ...d, marks: d.marks ?? MARKS[d.id] ?? 0 }));
export const CHRONICLE_BY_ID = Object.fromEntries(CHRONICLES.map(c => [c.id, c])) as Record<ChronicleId, ChronicleDef>;
export const arcOf = (h: HeroId) => CHRONICLES.filter(c => c.hero === h);
/** The chapter a campaign plan belongs to (`chronicle_kai_1` or the original `vex_trial_N`). */
export function chronicleOfPlan(plan: { id: string; mode: string }): ChronicleId | null {
  if (plan.mode === 'campaign') { const id = plan.id.replace(/^chronicle_/, ''); return isChronicleId(id) ? id : null; }
  if (plan.mode === 'vex_trial') { const id = `vex_${plan.id.slice(-1)}`; return isChronicleId(id) ? id : null; }
  return null;
}

/** Minimal save view the helpers need (kept structural so tests can pass plain objects). */
export interface ChronicleProgress { done: string[]; seen: string[]; visits: number; last: { id: string; won: boolean } | null }
export interface ProgressSource { chronicles?: ChronicleProgress; story: { done: number[] } }
export function chronicleDone(b: ProgressSource, id: ChronicleId): boolean {
  if (b.chronicles?.done.includes(id)) return true;
  return id.startsWith('vex_') && b.story.done.includes(Number(id.slice(-1)));   // legacy Trial completions count without any migration
}
export const arcDone = (b: ProgressSource, h: HeroId) => arcOf(h).filter(c => chronicleDone(b, c.id)).length;
export const allArcsDone = (b: ProgressSource) => ARC_HEROES.every(h => arcDone(b, h) === 3);
/** null = open; otherwise the plain-language reason it is sealed. */
export function chronicleLock(b: ProgressSource, id: ChronicleId): string | null {
  const c = CHRONICLE_BY_ID[id];
  if (id === 'finale') { if (allArcsDone(b)) return null; const left = ARC_HEROES.filter(h => arcDone(b, h) < 3).map(h => h[0].toUpperCase() + h.slice(1)); return `Finish every arc: ${left.join(', ')} still unfinished`; }
  if (c.n === 1) return null;
  const prev = CHRONICLE_BY_ID[`${c.hero}_${c.n - 1}` as ChronicleId];
  return chronicleDone(b, prev.id) ? null : `Finish ${prev.name} first`;
}
export const sceneId = (id: ChronicleId, part: 'intro' | 'outro') => `${id}.${part}`;
/** A scene may be replayed once it was played or its chapter finished. */
export const sceneUnlocked = (b: ProgressSource, id: ChronicleId, part: 'intro' | 'outro') => chronicleDone(b, id) || (b.chronicles?.seen.includes(sceneId(id, part)) ?? false);
/** Next chapter after finishing `id` (null at the end of an arc or after the finale). */
export function nextChronicle(b: ProgressSource, id: ChronicleId): ChronicleId | null {
  const c = CHRONICLE_BY_ID[id]; if (id === 'finale') return null;
  if (c.n < 3) { const n = `${c.hero}_${c.n + 1}` as ChronicleId; return chronicleLock(b, n) === null ? n : null; }
  return allArcsDone(b) ? 'finale' : null;
}
