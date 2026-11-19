/** B23 victory pose: the win screen shows the hero standing in the look they actually reached this run, from the authored sprite sheets. A transformed look uses the held frames of that form's Transform clip (after the commit frame); the untransformed look uses the raised-hands hold of the Sphere clip. Never a transformed pose for a form that was not reached. Pure data so it is unit-tested. */
export interface VictoryPose { root: string; clip: 'Transform' | 'Sphere'; sheetKey: string }
/** A set's own authored Victory clip (Blender, B23) wins when its manifest has one: the intro plays once, then frames `hold`..last loop. */
export const VICTORY_CLIP = 'Victory' as const;
/** `form` = the highest transformation reached this run in that hero's own numbering: Kai 0-3, Ren / Sora 0-1, Vex 0-2. */
export function victoryPoseFor(hero: string, form: number): VictoryPose {
  const f = Math.max(0, Math.floor(form));
  if (hero === 'kai') { const r = f >= 3 ? 'kai-f3' : f === 2 ? 'kai-f2' : f === 1 ? 'kai-f1' : 'kai'; return { root: r, clip: f ? 'Transform' : 'Sphere', sheetKey: r }; }
  if (hero === 'vex') { const r = f >= 2 ? 'vex-f2' : f === 1 ? 'vex-f1' : 'vex'; return { root: r, clip: f ? 'Transform' : 'Sphere', sheetKey: r }; }
  const h = hero === 'sora' ? 'sora' : 'ren', r = f >= 1 ? `${h}-f1` : h; return { root: r, clip: f ? 'Transform' : 'Sphere', sheetKey: r };
}
/** The frames to loop (inclusive), from a clip's manifest entry: the held reveal for Transform, the raised hold for Sphere. */
export function victoryFrames(clip: 'Transform' | 'Sphere' | 'Victory', frames: number, events: Record<string, number> = {}): { from: number; to: number } {
  const last = frames - 1;
  if (clip === 'Victory') { const from = Math.min(last, events.hold ?? Math.floor(frames / 2)); return { from, to: last }; }
  if (clip === 'Transform') { const from = Math.min(last, events.reveal_hold ?? Math.floor(frames / 2)); return { from, to: Math.max(from, Math.min(last, (events.interruptible_from ?? last) + 2)) }; }
  const from = Math.min(last, events.hold ?? Math.floor(frames / 2)); return { from, to: Math.max(from, Math.min(last, events.release ?? from + 4)) };
}
/** Highest transformation reached, from the run's `formsUsed` ids (Kai 1-3, Ren 10, Sora 11, Vex 12 = Riftbound / 13 = Voidheart). */
export function bestFormOf(hero: string, used: readonly number[]): number {
  if (hero === 'kai') return Math.max(0, ...used.filter(x => x >= 1 && x <= 3));
  if (hero === 'vex') return used.includes(13) ? 2 : used.includes(12) ? 1 : 0;
  return used.includes(hero === 'ren' ? 10 : 11) ? 1 : 0;
}
