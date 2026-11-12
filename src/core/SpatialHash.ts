/** Broadphase is intentionally reusable for the larger B04 horde. */
export class SpatialHash<T extends { x: number; y: number }> {
  private buckets = new Map<string, T[]>();
  constructor(private readonly cellSize: number) {}
  rebuild(items: readonly T[]) { this.buckets.clear(); for (const item of items) { const key = this.key(item.x, item.y); const bucket = this.buckets.get(key); if (bucket) bucket.push(item); else this.buckets.set(key, [item]); } }
  query(x: number, y: number, radius: number): T[] { const out: T[] = []; const a = Math.floor((x - radius) / this.cellSize), b = Math.floor((x + radius) / this.cellSize), c = Math.floor((y - radius) / this.cellSize), d = Math.floor((y + radius) / this.cellSize); for (let i = a; i <= b; i++) for (let j = c; j <= d; j++) out.push(...(this.buckets.get(`${i},${j}`) ?? [])); return out; }
  private key(x: number, y: number) { return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`; }
}
