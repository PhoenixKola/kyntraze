export type ArenaId = 'gloam' | 'ashen';
export const ARENA_IDS: ArenaId[] = ['gloam', 'ashen'];
export interface Obstacle { x: number; y: number; w: number; h: number }
/** Footprint rect (ground plane, world px) of every solid prop; the art manifests must match these numbers (tested). */
export const PROP_FOOTPRINTS = {
  generator: { w: 125, h: 55 }, 'freight-pod': { w: 90, h: 180 }, 'console-bank': { w: 155, h: 64 }, 'reactor-block': { w: 165, h: 70 }, 'vent-stack': { w: 145, h: 48 }, 'crate-stack': { w: 120, h: 80 },
  pylon: { w: 60, h: 44 }, 'fallen-column': { w: 170, h: 56 }, 'broken-statue': { w: 80, h: 70 }, sarcophagus: { w: 130, h: 60 }, monolith: { w: 70, h: 110 }, brazier: { w: 50, h: 50 },
} as const;
export type SolidProp = keyof typeof PROP_FOOTPRINTS;
/** x,y = top-left of the footprint rect. */
export interface Placement { prop: SolidProp; x: number; y: number }
export interface DecorPlacement { prop: string; x: number; y: number; rot?: 0 | 90 | 180 | 270; flip?: boolean }

export interface ArenaHazardDef {
  id: 'lane-surge' | 'pylon-pulse'; name: string;
  startAt: number; intervalStart: number; intervalEnd: number; intervalEndAt: number;
  warn: number; active: number; damage: number;
  /** lane-surge: rect centres/sizes cycled in order. pylon-pulse: circle radius around each pylon's footprint (ground point), cycled in `order`. */
  lanes?: { x: number; y: number; w: number; h: number }[];
  radius?: number; order?: number[];
}
export interface ArenaDef {
  id: ArenaId; name: string; blurb: string; mood: string[]; hazardCue: string; difficulty: string;
  solids: Placement[]; decor: DecorPlacement[]; hazard: ArenaHazardDef;
  /** floor tile directory (relative to public/) and the palette used for the baked value shaping */
  floorDir: string; artDir: string; rimMode: 'rotate' | 'strips'; /** px of arena edge covered by wall art: collision keeps characters this far in (plus their radius) */ inset: number; shade: { tint: string; alpha: number; vignette: number };
  unlocked: boolean;
}
export const obstaclesOf = (solids: readonly Placement[]): Obstacle[] => solids.map(s => ({ x: s.x, y: s.y, ...PROP_FOOTPRINTS[s.prop] }));

export const ARENAS: Record<ArenaId, ArenaDef> = {
  gloam: {
    id: 'gloam', name: 'The Gloam Circuit', unlocked: true, difficulty: 'STANDARD',
    blurb: 'A powered machine-floor still running its last duty cycle. Cold steel, teal circuitry, and lanes that flood with current.',
    mood: ['COLD', 'MECHANICAL', 'OPEN'], hazardCue: 'LANE SURGE: teal lanes flood after a striped warning',
    solids: [{ prop: 'generator', x: 690, y: 465 }, { prop: 'freight-pod', x: 1340, y: 500 }, { prop: 'console-bank', x: 780, y: 1155 }, { prop: 'reactor-block', x: 1490, y: 1200 }, { prop: 'vent-stack', x: 1070, y: 235 }, { prop: 'crate-stack', x: 370, y: 930 }],
    decor: [
      { prop: 'core-glyph', x: 1100, y: 832 }, { prop: 'cable-a', x: 520, y: 660 }, { prop: 'cable-b', x: 1580, y: 940, flip: true }, { prop: 'grate', x: 900, y: 1010 }, { prop: 'grate', x: 1480, y: 330 },
      { prop: 'scorch-a', x: 1260, y: 1050 }, { prop: 'scorch-b', x: 620, y: 300 }, { prop: 'crack-a', x: 1700, y: 700 }, { prop: 'crack-b', x: 440, y: 1240 }, { prop: 'stripes', x: 1880, y: 1010 }, { prop: 'puddle', x: 1020, y: 1330 }, { prop: 'stripes', x: 330, y: 560, rot: 90 },
    ],
    // the existing teal lane tiles: row 6 (tx 2..14) and column 8 (ty 2..10)
    hazard: { id: 'lane-surge', name: 'Lane Surge', startAt: 45, intervalStart: 14, intervalEnd: 9, intervalEndAt: 600, warn: 1.6, active: 0.6, damage: 22,
      lanes: [{ x: 1088, y: 832, w: 1664, h: 84 }, { x: 1088, y: 832, w: 84, h: 1152 }] },
    floorDir: 'art/arena', artDir: 'art/arenas/gloam', rimMode: 'rotate', inset: 50, shade: { tint: 'rgba(4,9,18,0.46)', alpha: 0.46, vignette: 0.62 },
  },
  ashen: {
    id: 'ashen', name: 'The Ashen Reliquary', unlocked: true, difficulty: 'STANDARD',
    blurb: 'The burned sanctum of a forgotten order. Ash drifts over old verdigris, and charged pylons wake without warning, except for the one you can read.',
    mood: ['HEAVY', 'ASHEN', 'RUINED'], hazardCue: 'PYLON PULSE: a charging pylon discharges a ring around itself',
    solids: [
      { prop: 'pylon', x: 500, y: 400 }, { prop: 'pylon', x: 1640, y: 400 }, { prop: 'pylon', x: 500, y: 1160 }, { prop: 'pylon', x: 1640, y: 1160 },
      { prop: 'fallen-column', x: 840, y: 330 }, { prop: 'sarcophagus', x: 1230, y: 1210 }, { prop: 'broken-statue', x: 330, y: 760 }, { prop: 'monolith', x: 1820, y: 740 },
      { prop: 'brazier', x: 1010, y: 560 }, { prop: 'brazier', x: 1150, y: 1010 },
    ],
    decor: [
      { prop: 'reliquary-sigil', x: 1100, y: 832 }, { prop: 'rubble-a', x: 640, y: 620 }, { prop: 'rubble-b', x: 1560, y: 920 }, { prop: 'rubble-a', x: 1380, y: 360, flip: true }, { prop: 'ash-a', x: 760, y: 1010 }, { prop: 'ash-b', x: 1420, y: 640 },
      { prop: 'crack-a', x: 560, y: 960 }, { prop: 'crack-b', x: 1700, y: 520 }, { prop: 'bones', x: 940, y: 1260 }, { prop: 'bones', x: 1900, y: 1180, flip: true }, { prop: 'ash-a', x: 420, y: 420 }, { prop: 'ash-b', x: 1000, y: 280 },
    ],
    hazard: { id: 'pylon-pulse', name: 'Pylon Pulse', startAt: 45, intervalStart: 14, intervalEnd: 9, intervalEndAt: 600, warn: 1.5, active: 0.35, damage: 20, radius: 150, order: [0, 3, 1, 2] },
    floorDir: 'art/arenas/ashen', artDir: 'art/arenas/ashen', rimMode: 'strips', inset: 64, shade: { tint: 'rgba(8,6,4,0.06)', alpha: 0.06, vignette: 0.6 },
  },
};
export const DEFAULT_ARENA: ArenaId = 'gloam';
export const isArenaId = (v: unknown): v is ArenaId => v === 'gloam' || v === 'ashen';
