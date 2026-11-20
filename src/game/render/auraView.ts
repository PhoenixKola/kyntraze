/** B21.3: the living aura of the five transformed states (ren, sora, flare, comet, still), drawn from the ImageGen flipbooks in public/art/fx/b21/aura/<state>/. A handful of persistent additive images (no per-frame allocation): two stepped back wings behind the body, a thin front veil, a ground sigil and a velocity ribbon. All motion comes from the AuraSample (idle → moving → dash → charge → release → settle). */
import Phaser from 'phaser';
import type { AuraSample } from './auraState';
import { b21Key } from './b21Assets';
import { violetKey } from './vexTint';

export type AuraState = 'ren' | 'sora' | 'flare' | 'comet' | 'still';
export class AuraView {
  private readonly back: Phaser.GameObjects.Image[] = []; private readonly veil: Phaser.GameObjects.Image; private readonly ground: Phaser.GameObjects.Image; private readonly trail: Phaser.GameObjects.Image;
  private clock = 0; private readonly ok: boolean; private prevPulse = 0; private lastSurge = -9;
  constructor(private readonly scene: Phaser.Scene, private readonly state: AuraState) {
    const k = (n: string) => b21Key('aura', `${state}/${n}`);
    this.ok = scene.textures.exists(k('back_0'));
    const add = (n: string, depth: number) => scene.add.image(0, 0, scene.textures.exists(k(n)) ? k(n) : k('back_0')).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setVisible(false);
    this.back = [add('back_0', 9.4), add('back_1', 9.3)]; this.veil = add('veil', 10.6); this.ground = add('ground', 3.7); this.trail = add('trail', 9.2);
  }
  /** Vex Riftbound shares Ren's rig; its ground sigil is recoloured violet instead of crimson. */
  violet = false;
  get available() { return this.ok; }
  hide() { for (const i of [...this.back, this.veil, this.ground, this.trail]) i.setVisible(false); }
  destroy() { for (const i of [...this.back, this.veil, this.ground, this.trail]) i.destroy(); }

  /** foot = ground point between the soles; dt in seconds (0 while paused); strength scales everything (Reduced Effects / crowds pass < 1). */
  update(a: AuraSample, dt: number, foot: { x: number; y: number }, _vx: number, _vy: number, strength: number, _calm: boolean) {
    if (!this.ok || strength <= 0.01) { this.hide(); return; }
    if (a.pulse > 0.85 && this.prevPulse <= 0.85 && this.clock - this.lastSurge > 0.8) { this.lastSurge = this.clock; this.scene.events.emit('b21-cue', this.state === 'ren' ? 'aura_surge_ren' : this.state === 'sora' ? 'aura_surge_sora' : this.state === 'still' ? 'aura_surge_silver' : 'aura_surge_gold', 0.5); }
    this.prevPulse = a.pulse;
    this.clock += dt;
    // B21.3 (revised): the aura itself is the body-fit glow filter on the sprite (EntityRenderer.updateAura). This view only keeps a small ground sigil under the feet and the release surge cue.
    const br = 1 + 0.03 * Math.sin(this.clock * 3.1), kk = a.k * strength;
    this.back[0].setVisible(false); this.back[1].setVisible(false); this.veil.setVisible(false); this.trail.setVisible(false);
    const g = this.ground, key = b21Key('aura', `${this.state}/ground`); if (this.scene.textures.exists(key)) g.setTexture(this.violet ? violetKey(this.scene, key) : key);
    g.setVisible(kk > 0.02).setPosition(Math.round(foot.x), Math.round(foot.y + 5)).setOrigin(0.5, 0.5).setScale(0.19 * (1 + 0.25 * a.pulse) * br, 0.19 * (1 + 0.25 * a.pulse) * br * 0.9).setRotation(0).setAlpha(Math.min(0.6, 0.45 * kk));
  }
}
