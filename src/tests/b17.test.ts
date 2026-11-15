import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { B17_NAMES, SERAPH_DEATH_S } from '../game/render/bossPresentation';
import { VICTORY_BEAT_S } from '../game/audio/abilityAudio';
import { BOSSES } from '../content/bosses';
import { winRun, damageEnemy } from '../sim/CombatSystem';
import { makeState } from '../sim/GameState';
import type { Enemy } from '../sim/GameState';

describe('B17 presentation contracts', () => {
  it('every B17 boss effect sprite exists and is registered for loading', () => {
    for (const n of B17_NAMES) { expect(existsSync(join(process.cwd(), 'public/art/bosses/fx/b17', n + '.png')), n).toBe(true); }
  });
  it('the staged Seraph death outlasts the silent beat and the sim death timer (the sim never waits for it)', () => {
    expect(SERAPH_DEATH_S).toBeGreaterThan(BOSSES.seraph.deathT); expect(VICTORY_BEAT_S).toBeLessThan(SERAPH_DEATH_S);
  });
  it('killing the Seraph ends the run at once in the sim: victory phase, one death event, nothing hostile left, no double victory', () => {
    const s = makeState(5); s.player.hp = 100; s.time = 900;
    const e = { id: s.nextId++, kind: 'seraph', x: 100, y: 0, hp: 5, maxHp: 2800, radius: 28, damage: 10, speed: 0, aimX: 1, aimY: 0, mode: 'move', modeT: 1, touchCooldown: 0, stagger: 0, ai: { phase: 2, invuln: false, exposed: false } } as unknown as Enemy; s.enemies.push(e);
    damageEnemy(s, e, 100); const first = s.victoryAt; winRun(s);
    expect(s.phase).toBe('victory'); expect(s.enemies).toHaveLength(0); expect(s.enemyShots).toHaveLength(0); expect(s.hazards).toHaveLength(0); expect(s.victoryAt).toBe(first);
    expect(s.enemyEvents.filter(x => x.kind === 'enemy_death' && x.tag === 'boss')).toHaveLength(1); expect(s.enemyEvents.filter(x => x.kind === 'boss_defeated')).toHaveLength(1);
  });
});
