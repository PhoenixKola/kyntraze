import { describe, expect, it } from 'vitest';
import { makeState } from '../sim/GameState';
import { damageEnemy, damagePlayer } from '../sim/CombatSystem';
import { AbilityAudio, COMBAT_SOUNDS, type CtxLike } from '../game/audio/abilityAudio';
import type { Enemy } from '../sim/GameState';

const mk = (state: ReturnType<typeof makeState>, kind: string, x: number, y: number, extra: Partial<Enemy> = {}) => {
  const e = { id: state.nextId++, kind, x, y, hp: 200, maxHp: 200, radius: 18, damage: 5, speed: 0, aimX: 1, aimY: 0, mode: 'move', modeT: 1, touchCooldown: 0, stagger: 0, ...extra } as unknown as Enemy;
  state.enemies.push(e); return e;
};
const last = (s: ReturnType<typeof makeState>) => s.impacts[s.impacts.length - 1];

describe('B15 impact semantics', () => {
  it('player damage emits hurt, never hit; heavy flag follows the damage', () => {
    const s = makeState(1); damagePlayer(s, 8); expect(last(s).kind).toBe('hurt'); expect(last(s).heavy).toBe(false);
    s.player.invulnerable = 0; damagePlayer(s, 26); expect(last(s).heavy).toBe(true);
  });
  it('an invulnerable Kai produces no hurt impact', () => {
    const s = makeState(1); s.player.invulnerable = 1; const n = s.impacts.length; expect(damagePlayer(s, 20)).toBe(false); expect(s.impacts.length).toBe(n);
  });
  it('enemy damage emits hit; weight classes are flagged', () => {
    const s = makeState(1); const e = mk(s, 'pursuer', 50, 0);
    damageEnemy(s, e, 17); expect(last(s)).toMatchObject({ kind: 'hit', boss: false, heavy: false, kill: false });
    damageEnemy(s, e, 40); expect(last(s).heavy).toBe(true);
    damageEnemy(s, e, 1000); expect(last(s).kill).toBe(true);
  });
  it('a shield block emits block (not hit) and an area hit bypasses the shield', () => {
    const s = makeState(1); s.player.x = 100; s.player.y = 0; const e = mk(s, 'aegis', 0, 0, { aimX: 1 });
    damageEnemy(s, e, 20); expect(last(s).kind).toBe('block');
    damageEnemy(s, e, 20, { area: true }); expect(last(s).kind).toBe('hit');
  });
  it('an invulnerable boss emits nothing', () => {
    const s = makeState(1); const e = mk(s, 'warden', 0, 0, { ai: { invuln: true } } as never); const n = s.impacts.length; damageEnemy(s, e, 50); expect(s.impacts.length).toBe(n);
  });
});

describe('B15 combat audio routing', () => {
  const mkAudio = async () => {
    const ctx = { state: 'running', currentTime: 0, destination: {}, createGain: () => ({ gain: { value: 1, setTargetAtTime() {} }, connect() {}, disconnect() {} }), createBufferSource: () => ({ buffer: null, playbackRate: { value: 1 }, onended: null, connect() {}, start() {}, stop() {}, disconnect() {} }), resume: async () => {}, suspend: async () => {}, decodeAudioData: async () => ({}) } as unknown as CtxLike;
    const a = new AbilityAudio(ctx, async () => new ArrayBuffer(8)); await a.unlock(); return { a, ctx };
  };
  const imp = (kind: string, extra = {}) => ({ id: 1, kind, x: 0, y: 0, ttl: 1, life: 1, ...extra }) as never;
  it('registers every combat sound', () => expect(COMBAT_SOUNDS.length).toBe(7));
  it('hit / block / hurt each pick their own sound', async () => {
    const { a, ctx } = await mkAudio(); const go = (i: never) => { ctx.currentTime += 1; a['voices'].clear(); a.handleImpact(i, 0, 0); };
    go(imp('hit')); go(imp('hit', { heavy: true })); go(imp('hit', { boss: true })); go(imp('block')); go(imp('hurt')); go(imp('revive'));
    expect(a.started).toEqual(['hit_light', 'hit_heavy', 'hit_boss', 'block_deflect', 'player_hurt', 'revive']);
  });
  it('light hits are rate limited so a swarm cannot buzz', async () => {
    const { a } = await mkAudio(); for (let i = 0; i < 40; i++) a.handleImpact(imp('hit'), 0, 0); expect(a.started.length).toBe(1);
  });
});
