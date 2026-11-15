import Phaser from 'phaser';
import { STARTER_TEXTURES } from '../../assets/atlasRegistry';
import { ABILITY_FX_NAMES, abilityFxKey, abilityFxUrl } from '../render/abilityFx';
import { VFX_NAMES, vfxKey, vfxUrl } from '../render/fxPool';
import { FLOOR_TILE_COUNT, floorTileKey, floorTileUrl } from '../render/arenaArt';
import { ENEMY_FX_NAMES, enemyFxKey, enemyFxUrl, enemyManifestKey, enemyManifestUrl, enemySheetKey, enemySheetUrl, type EnemyManifest } from '../render/enemyRenderer';
import { ENEMY_KINDS } from '../../content/enemies';
import { FORM_FX_NAMES, formFxKey, formFxUrl } from '../render/formFx';
import { KAI_ANCHORS_KEY, KAI_ANCHORS_URL, KAI_CLIPS, KAI_DIRS, KAI_F1_CLIPS, KAI_F1_REGISTRY_KEY, KAI_REGISTRY_KEY, kaiManifestUrl, kaiSheetUrl, kaiTextureKey, parseKaiManifest, type KaiManifests } from '../../assets/kaiAnimation';
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  /** Two load phases (starter assets, then the ~100 Kai sheets whose frame sizes come from the manifests): report one combined 0..1 to the loading screen. */
  private report(phase: 0 | 1, v: number) { window.dispatchEvent(new CustomEvent('kyntraze-load', { detail: phase === 0 ? v * 0.2 : 0.2 + v * 0.8 })); }
  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => this.report(0, v));
    STARTER_TEXTURES.forEach(tex => this.load.image(tex.key, tex.path));
    KAI_DIRS.forEach(dir => this.load.json(`kai-manifest-${dir}`, kaiManifestUrl(dir)));
    KAI_DIRS.forEach(dir => this.load.json(`kai-f1-manifest-${dir}`, kaiManifestUrl(dir, 'f1')));
    FORM_FX_NAMES.forEach(n => this.load.image(formFxKey(n), formFxUrl(n)));
    VFX_NAMES.forEach(n => { this.load.image(vfxKey(n, false), vfxUrl(n, false)); this.load.image(vfxKey(n, true), vfxUrl(n, true)); });
    for (let i = 0; i < FLOOR_TILE_COUNT; i++) this.load.image(floorTileKey(i), floorTileUrl(i));
    ENEMY_KINDS.forEach(k => this.load.json(enemyManifestKey(k), enemyManifestUrl(k)));
    ENEMY_FX_NAMES.forEach(n => this.load.image(enemyFxKey(n), enemyFxUrl(n)));
    this.load.json(KAI_ANCHORS_KEY, KAI_ANCHORS_URL);
    ABILITY_FX_NAMES.forEach(n => this.load.image(abilityFxKey(n), abilityFxUrl(n)));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => console.error(`[boot] failed to load ${file.key} (${file.url})`));
  }
  create() {
    // Frame sizes, origins, fps and loop flags come from each direction's own manifest: the canvases differ per direction.
    const manifests = {} as KaiManifests;
    for (const dir of KAI_DIRS) manifests[dir] = parseKaiManifest(this.cache.json.get(`kai-manifest-${dir}`), dir);
    this.registry.set(KAI_REGISTRY_KEY, manifests);
    this.registry.set(KAI_ANCHORS_KEY, this.cache.json.get(KAI_ANCHORS_KEY));
    const f1 = {} as KaiManifests;
    for (const dir of KAI_DIRS) f1[dir] = parseKaiManifest(this.cache.json.get(`kai-f1-manifest-${dir}`), dir, 'f1');
    this.registry.set(KAI_F1_REGISTRY_KEY, f1);
    for (const k of ENEMY_KINDS) { const m = this.cache.json.get(enemyManifestKey(k)) as EnemyManifest; this.load.spritesheet(enemySheetKey(k), enemySheetUrl(k), { frameWidth: m.frame_width, frameHeight: m.frame_height, endFrame: m.frames - 1 }); }
    for (const dir of KAI_DIRS) for (const clip of KAI_F1_CLIPS) {
      const m = f1[dir], a = m.animations[clip]!;
      this.load.spritesheet(kaiTextureKey(dir, clip, 'f1'), kaiSheetUrl(dir, a, 'f1'), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    for (const dir of KAI_DIRS) for (const clip of KAI_CLIPS) {
      const m = manifests[dir], a = m.animations[clip];
      this.load.spritesheet(kaiTextureKey(dir, clip), kaiSheetUrl(dir, a), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    this.load.off(Phaser.Loader.Events.PROGRESS); this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => this.report(1, v));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start('ArenaScene'));
    this.load.start();
  }
}
