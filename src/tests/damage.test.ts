import { describe, expect, it } from 'vitest';
import { makeState } from '../sim/GameState';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import { addEnemy } from '../sim/EntityRegistry';
describe('damage invariants', () => {
  it('damage and invulnerability protect the player', () => { const s=makeState(1);expect(damagePlayer(s,10)).toBe(true);expect(s.player.hp).toBe(90);expect(damagePlayer(s,10)).toBe(false);expect(s.player.hp).toBe(90); });
  it('lethal damage causes death', () => { const s=makeState(1);damagePlayer(s,999);expect(s.player.hp).toBe(0);expect(s.phase).toBe('dead'); });
  it('enemy deaths reward exactly one XP orb and drive', () => { const s=makeState(1);const e=addEnemy(s,{kind:'pursuer',x:1100,y:790,hp:5,maxHp:5,radius:17,speed:40,damage:10,touchCooldown:0});expect(damageEnemy(s,e,8)).toBe(true);expect(damageEnemy(s,e,8)).toBe(false);expect(s.kills).toBe(1);expect(s.pickups).toHaveLength(1);expect(s.player.drive).toBe(8); });
});
