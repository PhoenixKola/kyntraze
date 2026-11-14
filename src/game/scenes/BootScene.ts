import Phaser from 'phaser';
import { STARTER_TEXTURES } from '../../assets/atlasRegistry';
import { FORM_FX_NAMES, formFxKey, formFxUrl } from '../render/formFx';
import { KAI_CLIPS, KAI_DIRS, KAI_F1_CLIPS, KAI_F1_REGISTRY_KEY, KAI_REGISTRY_KEY, kaiManifestUrl, kaiSheetUrl, kaiTextureKey, parseKaiManifest, type KaiManifests } from '../../assets/kaiAnimation';
export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    STARTER_TEXTURES.forEach(tex => this.load.image(tex.key, tex.path));
    KAI_DIRS.forEach(dir => this.load.json(`kai-manifest-${dir}`, kaiManifestUrl(dir)));
    KAI_DIRS.forEach(dir => this.load.json(`kai-f1-manifest-${dir}`, kaiManifestUrl(dir, 'f1')));
    FORM_FX_NAMES.forEach(n => this.load.image(formFxKey(n), formFxUrl(n)));
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => console.error(`[boot] failed to load ${file.key} (${file.url})`));
  }
  create() {
    // Frame sizes, origins, fps and loop flags come from each direction's own manifest: the canvases differ per direction.
    const manifests = {} as KaiManifests;
    for (const dir of KAI_DIRS) manifests[dir] = parseKaiManifest(this.cache.json.get(`kai-manifest-${dir}`), dir);
    this.registry.set(KAI_REGISTRY_KEY, manifests);
    const f1 = {} as KaiManifests;
    for (const dir of KAI_DIRS) f1[dir] = parseKaiManifest(this.cache.json.get(`kai-f1-manifest-${dir}`), dir, 'f1');
    this.registry.set(KAI_F1_REGISTRY_KEY, f1);
    for (const dir of KAI_DIRS) for (const clip of KAI_F1_CLIPS) {
      const m = f1[dir], a = m.animations[clip]!;
      this.load.spritesheet(kaiTextureKey(dir, clip, 'f1'), kaiSheetUrl(dir, a, 'f1'), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    for (const dir of KAI_DIRS) for (const clip of KAI_CLIPS) {
      const m = manifests[dir], a = m.animations[clip];
      this.load.spritesheet(kaiTextureKey(dir, clip), kaiSheetUrl(dir, a), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start('ArenaScene'));
    this.load.start();
  }
}
