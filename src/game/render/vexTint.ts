import type Phaser from 'phaser';
/** Vex's effect colour follows his contour: violet for Riftbound, dark gray for Voidheart Exile (so dashes, hits and blinks read as the same form). */
export const vexTint = (form: number) => (form === 2 ? { main: 0x9aa2ad, hot: 0xd5dae2, ghost: 0x6b727d } : { main: 0xa070ff, hot: 0xc58bff, ghost: 0x9a6bff });

/** Voidheart Exile effect art: the violet ImageGen sheets are desaturated once into cool dark-gray copies (`<key>_g`), so every ability reads in the form's colour. */
export function grayKey(scene: Phaser.Scene, key: string): string {
  const gk = `${key}_g`; if (scene.textures.exists(gk) || !scene.textures.exists(key)) return scene.textures.exists(gk) ? gk : key;
  try {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); if (!x) return key;
    x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) * 1.05); a[i] = l * 0.86; a[i + 1] = l * 0.9; a[i + 2] = l; }
    x.putImageData(d, 0, 0); scene.textures.addCanvas(gk, c); return gk;
  } catch { return key; }
}

/** Riftbound recolour for art that only exists in Ren's red (the transformed ground sigil): shading kept, hue moved to violet, cached as `<key>_v`. */
export function violetKey(scene: Phaser.Scene, key: string): string {
  const vk = `${key}_v`; if (scene.textures.exists(vk) || !scene.textures.exists(key)) return scene.textures.exists(vk) ? vk : key;
  try {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); if (!x) return key;
    x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) * 1.25); a[i] = l * 0.68; a[i + 1] = l * 0.42; a[i + 2] = Math.min(255, l * 1.1); }
    x.putImageData(d, 0, 0); scene.textures.addCanvas(vk, c); return vk;
  } catch { return key; }
}

/** Kai's base-form (azure) recolour for warm ImageGen art: multiplying a gold / orange sprite by a blue tint lands on olive green, so the shading is kept and the hue moved to blue once, cached as `<key>_b`. */
export function blueKey(scene: Phaser.Scene, key: string): string {
  const bk = `${key}_b`; if (scene.textures.exists(bk) || !scene.textures.exists(key)) return scene.textures.exists(bk) ? bk : key;
  try {
    const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement, c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); if (!x) return key;
    x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, c.width, c.height), a = d.data;
    for (let i = 0; i < a.length; i += 4) { const l = Math.min(255, (0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) * 1.2); a[i] = l * 0.42; a[i + 1] = l * 0.8; a[i + 2] = Math.min(255, l * 1.15); }
    x.putImageData(d, 0, 0); scene.textures.addCanvas(bk, c); return bk;
  } catch { return key; }
}
