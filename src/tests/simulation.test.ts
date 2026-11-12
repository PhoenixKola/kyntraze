import { describe, expect, it } from 'vitest';
import { Simulation } from '../sim/Simulation';
import { blocked } from '../sim/CollisionSystem';
import { migrateSave } from '../sim/SaveSystem';
const idle = { x:0,y:0,dash:false,q:false,f:false };
describe('simulation and persistence', () => {
  it('moves diagonally at normalized speed', () => {const a=new Simulation(2),b=new Simulation(2);a.step(1/60,{...idle,x:1,y:0});b.step(1/60,{...idle,x:1,y:1});expect(Math.hypot(b.state.player.x-1100,b.state.player.y-800)).toBeCloseTo(a.state.player.x-1100,4);});
  it('pausing freezes game clock and enemy simulation', () => {const s=new Simulation(3);s.step(1/60,idle);s.forcePause();const time=s.state.time;for(let i=0;i<50;i++)s.step(1/60,idle);expect(s.state.time).toBe(time);});
  it('same seed yields same early waves', () => { const a=new Simulation(71), b=new Simulation(71);for(let i=0;i<200;i++){a.step(1/60,idle);b.step(1/60,idle);}expect(a.state.enemies).toEqual(b.state.enemies); });
  it('obstacle footprints block paths', () => {expect(blocked(700,490,17)).toBe(true);expect(blocked(1100,800,17)).toBe(false);});
  it('corrupt or previous save data migrates safely', () => {expect(migrateSave(null).version).toBe(1);expect(migrateSave({settings:{mute:true},best:{score:'INVALID'}}).best).toBe(null);expect(migrateSave({settings:{mute:true}}).settings.mute).toBe(true);});
});
