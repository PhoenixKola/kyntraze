export const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v));
export const distanceSquared = (ax: number, ay: number, bx: number, by: number) => (ax - bx) ** 2 + (ay - by) ** 2;
export const normalize = (x: number, y: number) => { const length = Math.hypot(x, y); return length > 0 ? { x: x / length, y: y / length } : { x: 0, y: 0 }; };
export const safe = (n: number, defaultValue = 0) => Number.isFinite(n) ? n : defaultValue;
export const roundedTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
