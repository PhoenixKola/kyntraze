import { describe, expect, it } from 'vitest';
import { makeState } from '../sim/GameState';
import { activateForm } from '../sim/FormSystem';
import { updateDrive } from '../sim/DriveSystem';
describe('Flarebound form', () => {
  it('requires a Drive threshold and has no upgrade reset', () => { const s=makeState(1);expect(activateForm(s)).toBe(false);s.player.drive=75;s.player.attackDamage=30;expect(activateForm(s)).toBe(true);expect(s.player.form).toBe(1);expect(s.player.attackDamage).toBe(30); });
  it('drains and reverts safely with cooldown', () => { const s=makeState(1);s.player.drive=65;activateForm(s);updateDrive(s,11);expect(s.player.drive).toBe(0);expect(s.player.form).toBe(0);expect(s.player.formCooldown).toBeGreaterThan(0); });
});
