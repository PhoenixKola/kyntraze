/** Trial of the Oathbroken: authored story beats shown before (intro) and after (outro) each chapter. Pure data; the UI (StoryPanel) plays them, can skip them and replays unlocked ones from the Archives. */
export interface StoryLine { who: string; text: string }
export interface StoryBeat { title: string; place: string; lines: StoryLine[]; portraits?: Record<string, string>; art?: string }
export interface Chapter { n: 1 | 2 | 3; name: string; intro: StoryBeat; outro: StoryBeat }

export const STORY: readonly Chapter[] = [
  { n: 1, name: 'The Broken Oath',
    intro: { title: 'I · THE BROKEN OATH', place: 'The Gloam, an hour before the fracture bells', lines: [
      { who: 'NARRATOR', text: 'Vex once stood at the right hand of the Order of the Unbroken Line. Then the line broke, and the Order named Vex the cause.' },
      { who: 'VEX', text: 'I kept every word I swore. The Order is the one that stopped keeping them.' },
      { who: 'NARRATOR', text: 'The Order sends its wardens to finish the exile. Hold the Gloam until the bells fall silent.' } ] },
    outro: { title: 'THE OATH HOLDS', place: 'The Gloam, after', lines: [
      { who: 'VEX', text: 'They fought as they were taught. Straight, and certain, and late.' },
      { who: 'NARRATOR', text: 'Something answers from the rift: a path that was not there before. It is open to anyone who will stand in it.' } ] } },
  { n: 2, name: 'The Fractured Accord',
    intro: { title: 'II · THE FRACTURED ACCORD', place: 'The Paradox Expanse, the first fold', lines: [
      { who: 'NARRATOR', text: 'The Order never agreed on what it was. Each fold of the Expanse keeps one of its old arguments alive.' },
      { who: 'VEX', text: 'A parry is a promise kept at the last moment. Let them swing first.' },
      { who: 'NARRATOR', text: 'A shadow of the Order walks the folds ahead. It tests those who claim the oath.' } ] },
    outro: { title: 'RIFTBOUND', place: 'The Paradox Expanse, after', lines: [
      { who: 'VEX', text: 'The folds do not fight me now. They lean toward the oath, the way iron leans toward a lodestone.' },
      { who: 'NARRATOR', text: 'Riftbound is yours: a second form, born from keeping a promise inside a broken place.' } ] } ,
  },
  { n: 3, name: 'Judgment of the Exile',
    intro: { title: 'III · JUDGMENT OF THE EXILE', place: 'The Oathkeeper’s hall, between two ticks of the clock', lines: [
      { who: 'OATHKEEPER', text: 'You were sworn to the line. You are standing outside it. Which of those is the lie?' },
      { who: 'VEX', text: 'Neither. The line is what I carry. You only kept the room.' },
      { who: 'NARRATOR', text: 'No wardens, no crowd. A duel, with the oath itself as the judge.' } ] },
    outro: { title: 'VOIDHEART EXILE', place: 'The Oathkeeper’s hall, after', lines: [
      { who: 'OATHKEEPER', text: 'Then the judgment stands. Not for the Order. For the oath.' },
      { who: 'VEX', text: 'It was never a verdict. It was a promise I finally got to keep.' },
      { who: 'NARRATOR', text: 'Voidheart Exile awakens, and the Vanguard crest is yours.' } ] } },
];
export const chapterStory = (n: number): Chapter | undefined => STORY.find(c => c.n === n);
/** Speaker -> portrait file (public/art/b22) for a beat: Vex shows the form earned at that point of the story. */
export const storyPortraits = (n: number, part: 'intro' | 'outro'): Record<string, string> => ({ VEX: part === 'outro' && n === 2 ? 'vex_riftbound' : part === 'outro' && n === 3 ? 'vex_voidheart' : 'vex_base', OATHKEEPER: 'oathkeeper' });
for (const c of STORY) { c.intro.portraits = storyPortraits(c.n, 'intro'); c.outro.portraits = storyPortraits(c.n, 'outro'); c.intro.art = c.outro.art = `story_${c.n}`; }
