/** Server-verified results only: a run is recorded because the SERVER simulated it, never because a client posted a number. Idempotent by run id (reconnects and restarts cannot double-record), paginated, rank-aware, privacy-minded (only the display names players chose; no IPs). JSON file persistence with atomic writes: simple, human-inspectable, backed up by copying one file. */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const RULES_VERSION = 1;
export interface Entry { runId: string; mode: string; arena: string; party: 1 | 2; names: string[]; heroes: string[]; won: boolean; seconds: number; kills: number; score: number; at: number; rules: number; verified: true }
export class Store {
  private entries: Entry[] = []; private ids = new Set<string>();
  constructor(private readonly path: string | null = null, private readonly cap = 5000) {
    if (path && existsSync(path)) { try { const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries?: Entry[] }; for (const e of raw.entries ?? []) if (e && typeof e.runId === 'string' && !this.ids.has(e.runId)) { this.entries.push({ ...e, verified: true }); this.ids.add(e.runId); } } catch { /* a corrupt file starts clean; the old one is left in place */ } }
  }
  private flush() { if (!this.path) return; try { mkdirSync(dirname(this.path), { recursive: true }); const tmp = `${this.path}.tmp`; writeFileSync(tmp, JSON.stringify({ v: 1, entries: this.entries })); renameSync(tmp, this.path); } catch { /* disk problems never stop a running game */ } }
  /** Returns the 1-based rank within (mode, party) by score, or null if the run id was already recorded. */
  add(e: Omit<Entry, 'verified' | 'rules'>): number | null {
    if (this.ids.has(e.runId)) return null; const entry: Entry = { ...e, rules: RULES_VERSION, verified: true }; this.entries.push(entry); this.ids.add(e.runId);
    if (this.entries.length > this.cap) { const drop = this.entries.sort((a, b) => b.score - a.score).splice(this.cap); for (const d of drop) this.ids.delete(d.runId); }
    this.flush(); return this.list(e.mode, e.party, 1e6, 0).findIndex(x => x.runId === e.runId) + 1;
  }
  list(mode: string, party: 1 | 2, limit = 20, offset = 0): Entry[] { return this.entries.filter(e => e.mode === mode && e.party === party).sort((a, b) => b.score - a.score || a.at - b.at).slice(offset, offset + Math.min(100, limit)); }
  size() { return this.entries.length; }
}
