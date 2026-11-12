import { RULES } from '../core/Rules';
export class FixedStep {
  private accumulator = 0;
  tick(deltaMs: number, step: (dt: number) => void): number {
    this.accumulator += Math.min(Math.max(deltaMs / 1000, 0), RULES.maxFrameDelta);
    let ticks = 0;
    while (this.accumulator >= RULES.fixedDelta && ticks < 6) {
      step(RULES.fixedDelta); this.accumulator -= RULES.fixedDelta; ticks++;
    }
    return ticks;
  }
  reset() { this.accumulator = 0; }
}
