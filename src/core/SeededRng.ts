/** Mulberry32 RNG; never use Math.random in authoritative game simulation. */
export class SeededRng {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number { this.state = (this.state + 0x6D2B79F5) >>> 0; let t = this.state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  int(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }
  between(min: number, max: number): number { return min + this.next() * (max - min); }
}
export function parseSeed(input: string | null): number {
  if (!input) return Date.now() >>> 0;
  if (/^\d+$/.test(input)) return Number(BigInt(input) % BigInt(4294967296));
  let n = 2166136261; for (let i = 0; i < input.length; i++) { n ^= input.charCodeAt(i); n = Math.imul(n, 16777619); } return n >>> 0;
}
