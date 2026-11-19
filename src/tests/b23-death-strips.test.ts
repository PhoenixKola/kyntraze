import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { DEATH_STRIP_KINDS } from '../game/render/realmArt';

const pub = (p: string) => new URL(`../../public/art/${p}`, import.meta.url);
const size = (u: URL) => { const b = readFileSync(u); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
describe('B23 authored enemy death animations', () => {
  it('the six classic enemies have a 6-frame strip on their own frame size', () => {
    for (const k of ['pursuer', 'flanker', 'bruiser', 'ranged', 'aegis', 'cantor']) {
      const m = JSON.parse(readFileSync(pub(`enemies/${k}.json`), 'utf8')), [w, h] = size(pub(`enemies/death/${k}.png`)); expect(w, k).toBe(m.frame_width * 6); expect(h, k).toBe(m.frame_height);
    }
  });
  it('the six realm mobs have six death images on their own sprite canvas', () => {
    expect(DEATH_STRIP_KINDS.length).toBe(6);
    for (const k of DEATH_STRIP_KINDS) { const base = size(pub(`b22/${k}.png`)); for (let i = 0; i < 6; i++) { const f = pub(`b22/${k}_d${i}.png`); expect(existsSync(f), `${k}_d${i}`).toBe(true); expect(size(f), `${k}_d${i}`).toEqual(base); } }
  });
});
