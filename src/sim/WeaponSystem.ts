import type { GameState } from './GameState';
import { damageEnemy } from './CombatSystem';
import { distanceSquared } from '../core/Math';
import { heroActivateQ, updateHeroAuto } from './HeroSystem';
import { kaiQ, surgeAutoMul } from './KaiKit';
import { faceOf, fistWorld } from './AbilitySystem';
import { normalize } from '../core/Math';
export function updateAutoWeapon(state: GameState, dt: number) {
  const p = state.player;
  if (state.hero !== 'kai') { updateHeroAuto(state, dt); return; }
  if (state.cast) return;   // signature abilities own Kai's hands; the basic attack resumes afterwards
  p.attackClock -= dt;
  if (p.attackClock > 0) return;
  p.attackClock += Math.max(0.16, p.attackPeriod * (p.form ? 0.75 : 1));
  const candidates = state.enemies.filter(e => e.hp > 0 && distanceSquared(e.x, e.y, p.x, p.y) <= p.attackRange ** 2)
    .sort((a, b) => distanceSquared(a.x, a.y, p.x, p.y) - distanceSquared(b.x, b.y, p.x, p.y));
  const amount = Math.min(candidates.length, p.targets + (p.form ? 1 : 0));
  // one authoritative strike: the body faces the PRIMARY target, every shot of the volley leaves that fist (a secondary shot in another direction visibly branches from the primary release)
  if (amount > 0) { const d = normalize(candidates[0].x - p.x, candidates[0].y - p.y); state.hx.strike = { x: d.x, y: d.y, t: state.time, step: state.hx.autoStep++ % 3 }; }
  const fist = amount > 0 ? fistWorld(state, p.form, faceOf(state.hx.strike.x, state.hx.strike.y)) : { x: p.x, y: p.y - 15 };
  for (let i = 0; i < amount; i++) {
    const target = candidates[i];
    state.impacts.push({ id: state.nextId++, kind: 'shot', x: fist.x, y: fist.y,
      targetX: target.x, targetY: target.y, ttl: 0.2, life: 0.2 });
    damageEnemy(state, target, p.attackDamage * surgeAutoMul(state) * (p.form ? 1.4 * state.mods.formPower : 1));
    if (p.form === 0) p.drive = Math.min(100, p.drive + 1.7 * state.mods.driveGain);
  }
}
export function activateQ(state: GameState) {
  if (state.hero !== 'kai') return heroActivateQ(state);
  return kaiQ(state);
}
