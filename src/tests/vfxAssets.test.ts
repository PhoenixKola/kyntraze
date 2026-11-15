import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VFX_NAMES } from '../game/render/vfxNames';

const dir = resolve(__dirname, '../../public/art/fx/kai-abilities/vfx');
/** PNG IHDR width/height without a decoder. */
const size = (f: string) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), alpha: b[25] === 6 }; };

describe('B07-pre VFX sprites (ImageGen, colour-mapped)', () => {
  it('every sprite exists in both the cyan and the solar variant with identical size and an alpha channel', () => {
    for (const n of VFX_NAMES) {
      const b = resolve(dir, `${n}_b.png`), s = resolve(dir, `${n}_s.png`);
      expect(existsSync(b), `${n}_b`).toBe(true); expect(existsSync(s), `${n}_s`).toBe(true);
      const a = size(b), c = size(s); expect(a.w).toBe(c.w); expect(a.h).toBe(c.h); expect(a.alpha).toBe(true); expect(a.w).toBeGreaterThan(8);
    }
  });
  it('the circular reach art keeps the exact sizes the renderer scales from (circ_wave 303, circ_zone 277, circ_rune 288, circ_crack 279)', () => {
    const w = (n: string) => size(resolve(dir, `${n}_b.png`)).w;
    expect([w('circ_wave'), w('circ_zone'), w('circ_rune'), w('circ_crack')]).toEqual([303, 277, 288, 279]);
  });
});
