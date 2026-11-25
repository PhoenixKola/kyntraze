/** B31A: what the selected runner says in the Nexus. Reacts to real campaign state (last mission result, arc progress, the finale, the other runners' arcs, unlocked forms) and rotates with the visit counter, so the same line never repeats on consecutive returns. Pure. */
import type { HeroId } from '../content/heroes';
import { CHRONICLE_BY_ID, allArcsDone, arcDone, chronicleDone, type ProgressSource } from './chronicles';

export interface Chatter { who: string; text: string }
const NAME: Record<HeroId, string> = { kai: 'KAI', ren: 'REN', sora: 'SORA', vex: 'VEX' };
const OTHERS: Record<HeroId, HeroId[]> = { kai: ['ren', 'sora', 'vex'], ren: ['kai', 'sora', 'vex'], sora: ['kai', 'ren', 'vex'], vex: ['kai', 'ren', 'sora'] };

const LOST: Record<HeroId, string[]> = {
  kai: ['I went in too fast again. Next time I stand first, then strike.', 'Falling is part of the run. Getting back up is the part that counts.', 'The dragon did not leave. That is something.'],
  ren: ['Strength alone did not carry that one. I am working on the rest.', 'I can take another round. Give me a moment to catch my breath.', 'The fox is still beside me. That is enough to try again.'],
  sora: ['I missed a read. One bad angle is all the Expanse needs.', 'Precision is not the same as certainty. Noted.', 'The phoenix caught the fall. I should let it do that more often.'],
  vex: ['The oath bends. It does not break. Again.', 'A parry kept late is still a parry kept.', 'The guardian waits. It has always been patient with me.'],
};
const ARC: Record<HeroId, string[][]> = {
  kai: [['The Chronicles are open. Someone cut a relay from inside. I want to know who.', 'Every run I hear that tower going dark. Let me go back and hold it.'],
    ['Holding the reactor taught me something. The rest of the story is about standing, not running.', 'The Warden carries a piece of the Line. The dragon is the same kind of thread.'],
    ['The Castellan’s seal is the Accord’s. I keep turning that over.', 'Stillfire is calm, not slow. I am still getting used to it.'],
    ['Three halls, one clue each. The Accord cut the Line. Now the others have to bring theirs.']],
  ren: [['There is a gate in the Reliquary I could not hold. I would like to try again.', 'The Chronicles are open. I do not like leaving a door unfinished.'],
    ['Half strength was enough. I still do not know what to make of that.', 'The abandon order bears a council mark. I keep checking it.'],
    ['The tails answer when I stop trying to win. Odd, for a fighter.', 'Ascendant costs something. I am starting to see who pays.'],
    ['Seven of them, cutting together. I will remember the gesture.']],
  sora: [['I never miss. That might be the problem. The Chronicles are open if you want to find out.', 'The Aetherfall bridge is waiting. So are the lancers.'],
    ['Every cut in the Citadel was straight. Nothing about that is an accident.', 'Someone who knew the Line completely opened it. I want a name.'],
    ['I let the phoenix catch me. It is harder than aiming.', 'The Paradox folds replay the cut. I would rather not watch it twice.'],
    ['The Choir ends on one name. I know who is still sitting.']],
  vex: [['The trial is still there if you want it. The Order will not wait.', 'Exile is a long walk. Chronicles shows where it leads.'],
    ['Riftbound is a promise kept inside a broken place. Everyone should have one.', 'The Accord never agreed. That is how I learned who wanted the cut.'],
    ['The Oathkeeper ruled for the oath, not the Order. I did not expect it.', 'Voidheart is quiet. The guardian is quieter.'],
    ['I told them what the Accord did. They are only now believing me.']],
};
const FINALE: Record<HeroId, string[]> = {
  kai: ['The Line holds. The seam is still open. I can feel something looking back.', 'We tied it. Now we find out what kept watching.'],
  ren: ['A knot is a promise people keep. We kept it. Let them try to cut it again.', 'I would hold that gate again, if I had to.'],
  sora: ['Something on the other side saw the Line tighten. I would like to be ready for it.', 'The phoenix is still pale blue. It does not dim.'],
  vex: ['The oath is kept. The exile is over. The watch is not.', 'We do not need the Order. We have the Line.'],
};
/** What `from` says about `about`'s arc (only after that arc has real progress, never before). */
function cross(from: HeroId, about: HeroId, n: number): string | null {
  const k = `${from}>${about}`;
  const T: Record<string, string> = {
    'kai>ren': 'Ren held a door nobody asked them to. That counts for more than winning.', 'kai>sora': 'Sora sees every angle. Learning to trust the fall is harder than it sounds.', 'kai>vex': 'Vex kept the oath after the Order stopped keeping it. I respect that.',
    'ren>kai': 'Kai learned to stand still. I would not have bet on it.', 'ren>sora': 'Sora is learning to be caught. I could teach them. Maybe.', 'ren>vex': 'Vex kept every word. I would follow that kind of loyalty.',
    'sora>kai': 'Kai holds the reactor now. Fast is no longer the whole plan.', 'sora>ren': 'Ren has the shape of a fighter and the heart of a gate. Good combination.', 'sora>vex': 'Vex parries like a sentence ending. I am learning from it.',
    'vex>kai': 'The dragon chooses to stay. Kai is learning why.', 'vex>ren': 'Ren fights like a promise. I know that look.', 'vex>sora': 'Sora is learning trust. The exile has some advice.',
  };
  return n >= 1 ? T[k] ?? null : null;
}
export function nexusLine(b: ProgressSource, hero: HeroId, forms: { done: number; total: number }, visit: number): Chatter {
  const who = NAME[hero], pool: string[] = [], last = b.chronicles?.last ?? null;
  if (last && CHRONICLE_BY_ID[last.id as keyof typeof CHRONICLE_BY_ID]?.hero === hero && !last.won) pool.push(...LOST[hero]);
  if (allArcsDone(b)) pool.push(...FINALE[hero]);
  else pool.push(...ARC[hero][Math.min(3, arcDone(b, hero))]);
  for (const o of OTHERS[hero]) { const c = cross(hero, o, arcDone(b, o)); if (c) pool.push(c); }
  if (forms.total > 0 && forms.done === forms.total) pool.push(`${forms.done === 1 ? 'My form is' : 'Every form is'} awake. It feels less like power and more like a promise.`);
  if (chronicleDone(b, 'finale')) pool.push(...FINALE[hero]);
  const seen = new Set<string>(), uniq = pool.filter(t => !seen.has(t) && (seen.add(t), true));
  return { who, text: uniq[Math.abs(visit) % uniq.length] };
}
