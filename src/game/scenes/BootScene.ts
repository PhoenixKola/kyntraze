import Phaser from 'phaser';
import { STARTER_TEXTURES } from '../../assets/atlasRegistry';
import { ABILITY_FX_NAMES, abilityFxKey, abilityFxUrl } from '../render/abilityFx';
import { KK_FX, kkKey, kkUrl } from '../render/kaiKitFx';
import { VFX_NAMES, vfxKey, vfxUrl } from '../render/fxPool';
import { ARENA_FX, FLOOR_TILE_COUNT, HAZARD_FX, PROPS_KEY, arenaAssetUrl, arenaFxKey, arenaPropNames, floorTileKey, floorTileUrl, parsePropManifest, propKey } from '../render/arenaWorld';
import { B22_ART } from '../render/realmArt';
import { ARENAS, type ArenaId } from '../../content/arenas';
import { ENEMY_FX_NAMES, enemyFxKey, enemyFxUrl, enemyManifestKey, enemyManifestUrl, enemySheetKey, enemySheetUrl, type EnemyManifest } from '../render/enemyRenderer';
import { BOSS_FX_NAMES, BOSS_KINDS, bossFxKey, bossFxUrl, bossManifestKey, bossManifestUrl, bossSheetKey, bossSheetUrl, type BossManifest } from '../render/bossRenderer';
import { ENEMY_KINDS } from '../../content/enemies';
import type { HeroId } from '../../content/heroes';
import { HERO_FX_NAMES, heroFxKey, heroFxUrl } from '../render/heroFxView';
import { setVexSkin, artHero, HERO_SHEETS, HERO_ANCHORS_KEY, HERO_REGISTRY_KEY, heroAnchorsUrl, heroManifestUrl, heroSheetUrl, heroTextureKey } from '../../assets/heroAnimation';
import { FORM_FX_NAMES, formFxKey, formFxUrl } from '../render/formFx';
import { COMET_FX_NAMES, cometFxKey, cometFxUrl } from '../render/cometFx';
import { B14_FX_NAMES, b14Key, b14Url } from '../render/b14fx';
import { B21_GROUPS, b21Key, b21ManifestKey, b21ManifestUrl, b21Names, b21Url } from '../render/b21Assets';
import { F3_FX_MANIFEST_KEY, F3_FX_MANIFEST_URL, f3fxKey, f3fxUrl } from '../render/stillfireFx';
import { KAI_F3_REGISTRY_KEY, KAI_F2_REGISTRY_KEY, KAI_ANCHORS_KEY, KAI_ANCHORS_URL, KAI_CLIPS, KAI_KIT_CLIPS, KAI_DIRS, KAI_F1_CLIPS, KAI_F1_REGISTRY_KEY, KAI_REGISTRY_KEY, kaiManifestUrl, kaiSheetUrl, kaiTextureKey, parseKaiManifest, type KaiClipInfo, type KaiManifests } from '../../assets/kaiAnimation';
export class BootScene extends Phaser.Scene {
  constructor(private readonly arena: ArenaId = 'gloam', private readonly hero: HeroId = 'kai') { super({ key: 'BootScene' }); setVexSkin(hero === 'vex'); }
  /** Two load phases (starter assets, then the ~100 Kai sheets whose frame sizes come from the manifests): report one combined 0..1 to the loading screen. */
  private report(phase: 0 | 1, v: number) { window.dispatchEvent(new CustomEvent('kyntraze-load', { detail: phase === 0 ? v * 0.2 : 0.2 + v * 0.8 })); }
  preload() {
    this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => this.report(0, v));
    STARTER_TEXTURES.forEach(tex => this.load.image(tex.key, tex.path));
    KAI_DIRS.forEach(dir => this.load.json(`kai-manifest-${dir}`, kaiManifestUrl(dir)));
    KAI_DIRS.forEach(dir => this.load.json(`kai-f1-manifest-${dir}`, kaiManifestUrl(dir, 'f1')));
    KAI_DIRS.forEach(dir => this.load.json(`kai-f2-manifest-${dir}`, kaiManifestUrl(dir, 'f2')));
    KAI_DIRS.forEach(dir => this.load.json(`kai-f3-manifest-${dir}`, kaiManifestUrl(dir, 'f3')));   // B13: optional - without them Form III falls back to the Form II art
    if (this.hero === 'vex') KAI_DIRS.forEach(dir => this.load.json(`hero-ren-f2-manifest-${dir}`, `/art/vex-f2/${dir}/manifest.json`));
    if (this.hero !== 'kai' && HERO_SHEETS[artHero(this.hero)].base) { const h = artHero(this.hero); KAI_DIRS.forEach(dir => { this.load.json(`hero-${h}-base-manifest-${dir}`, heroManifestUrl(h, dir, 'base')); if (HERO_SHEETS[h].f1) this.load.json(`hero-${h}-f1-manifest-${dir}`, heroManifestUrl(h, dir, 'f1')); }); if (HERO_SHEETS[h].anchors) this.load.json(HERO_ANCHORS_KEY(h), heroAnchorsUrl(h)); }   // B19: Ren / Sora sheets (same contract as Kai's); absent art falls back to the dev placeholder body
    if (this.hero !== 'kai') HERO_FX_NAMES[artHero(this.hero)].forEach((n: string) => this.load.image(heroFxKey(artHero(this.hero), n), heroFxUrl(artHero(this.hero), n)));
    this.load.json(F3_FX_MANIFEST_KEY, F3_FX_MANIFEST_URL);
    B21_GROUPS.forEach(g => this.load.json(b21ManifestKey(g), b21ManifestUrl(g)));   // B21: optional art groups, a missing manifest is ignored
    B22_ART.forEach(n => this.load.image(`b22-${n}`, `art/b22/${n}.png`));
    COMET_FX_NAMES.forEach(n => this.load.image(cometFxKey(n), cometFxUrl(n)));
    B14_FX_NAMES.forEach(n => this.load.image(b14Key(n), b14Url(n)));
    FORM_FX_NAMES.forEach(n => this.load.image(formFxKey(n), formFxUrl(n)));
    VFX_NAMES.forEach(n => { this.load.image(vfxKey(n, false), vfxUrl(n, false)); this.load.image(vfxKey(n, true), vfxUrl(n, true)); });
    if (!ARENAS[this.arena].procedural) { for (let i = 0; i < FLOOR_TILE_COUNT; i++) this.load.image(floorTileKey(i), floorTileUrl(this.arena, i)); this.load.json(PROPS_KEY(this.arena), arenaAssetUrl(this.arena, 'props.json')); }   // B22 realms are drawn procedurally
    ENEMY_KINDS.forEach(k => this.load.json(enemyManifestKey(k), enemyManifestUrl(k)));
    ENEMY_FX_NAMES.forEach(n => this.load.image(enemyFxKey(n), enemyFxUrl(n)));
    BOSS_KINDS.forEach(k => this.load.json(bossManifestKey(k), bossManifestUrl(k)));
    BOSS_FX_NAMES.forEach(n => this.load.image(bossFxKey(n), bossFxUrl(n)));
    this.load.json(KAI_ANCHORS_KEY, KAI_ANCHORS_URL);
    ABILITY_FX_NAMES.forEach(n => this.load.image(abilityFxKey(n), abilityFxUrl(n)));
    KK_FX.forEach(n => this.load.image(kkKey(n), kkUrl(n)));
    for (let i = 0; i < 4; i++) this.load.image(`xpgem${i}`, `/art/fx/xp/gem${i}.png`);
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
    const f2 = {} as KaiManifests;
    for (const dir of KAI_DIRS) f2[dir] = parseKaiManifest(this.cache.json.get(`kai-f2-manifest-${dir}`), dir, 'f2');
    this.registry.set(KAI_F2_REGISTRY_KEY, f2);
    const f3Raw = KAI_DIRS.map(dir => this.cache.json.get(`kai-f3-manifest-${dir}`)); const f3Ok = f3Raw.every(r => r && typeof r === 'object' && (r as { direction?: string }).direction);
    if (f3Ok) {
      const f3 = {} as KaiManifests;
      KAI_DIRS.forEach((dir, i) => { f3[dir] = parseKaiManifest(f3Raw[i], dir, 'f3'); });
      this.registry.set(KAI_F3_REGISTRY_KEY, f3);
      for (const dir of KAI_DIRS) for (const clip of [...KAI_F1_CLIPS, ...KAI_KIT_CLIPS, 'IdleSpecial'] as const) {
        const m = f3[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo | undefined; if (!a) continue;
        this.load.spritesheet(kaiTextureKey(dir, clip, 'f3'), kaiSheetUrl(dir, a, 'f3'), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
      }
    }
    if (this.hero !== 'kai' && HERO_SHEETS[artHero(this.hero)].base) {
      const h = artHero(this.hero);
      for (const form of ['base', 'f1'] as const) {
        if (!HERO_SHEETS[h][form]) continue;
        const raw = KAI_DIRS.map(dir => this.cache.json.get(`hero-${h}-${form}-manifest-${dir}`)); if (!raw.every(r => r && typeof r === 'object' && (r as { direction?: string }).direction)) continue;
        const set = {} as KaiManifests; KAI_DIRS.forEach((dir, i) => { set[dir] = parseKaiManifest(raw[i], dir, form); }); this.registry.set(HERO_REGISTRY_KEY(h, form), set);
        for (const dir of KAI_DIRS) for (const clip of form === 'f1' ? KAI_F1_CLIPS : KAI_CLIPS) { const m = set[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo; this.load.spritesheet(heroTextureKey(h, dir, clip, form), heroSheetUrl(h, dir, a, form), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 }); }
      }
      if (this.hero === 'vex') { const raw = KAI_DIRS.map(dir => this.cache.json.get(`hero-ren-f2-manifest-${dir}`)); if (raw.every(r => r && typeof r === 'object' && (r as { direction?: string }).direction)) { const set = {} as KaiManifests; KAI_DIRS.forEach((dir, i) => { set[dir] = parseKaiManifest(raw[i], dir, 'f1'); }); this.registry.set(HERO_REGISTRY_KEY('ren', 'f2' as 'f1'), set); for (const dir of KAI_DIRS) for (const clip of KAI_F1_CLIPS) { const m = set[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo; this.load.spritesheet(`vexf2-${dir}-${clip}`, `/art/vex-f2/${dir}/${a.sheet}`, { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 }); } } }
      this.registry.set(HERO_ANCHORS_KEY(h), this.cache.json.get(HERO_ANCHORS_KEY(h)));
    }
    for (const g of B21_GROUPS) for (const n of b21Names(this.cache.json.get(b21ManifestKey(g)))) this.load.image(b21Key(g, n), b21Url(g, n));
    const fx3 = this.cache.json.get(F3_FX_MANIFEST_KEY) as Record<string, unknown> | undefined;
    if (fx3 && typeof fx3 === 'object') for (const n of Object.keys((fx3 as { sprites?: Record<string, unknown> }).sprites ?? fx3)) if (/^[a-z0-9_]+$/.test(n)) this.load.image(f3fxKey(n), f3fxUrl(n));
    for (const dir of KAI_DIRS) for (const clip of [...KAI_F1_CLIPS, ...KAI_KIT_CLIPS] as const) {
      const m = f2[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo | undefined; if (!a) continue;
      this.load.spritesheet(kaiTextureKey(dir, clip, 'f2'), kaiSheetUrl(dir, a, 'f2'), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    for (const k of ENEMY_KINDS) { const m = this.cache.json.get(enemyManifestKey(k)) as EnemyManifest; this.load.spritesheet(enemySheetKey(k), enemySheetUrl(k), { frameWidth: m.frame_width, frameHeight: m.frame_height, endFrame: m.frames - 1 }); }
    if (!ARENAS[this.arena].procedural) {
    // arena art (selected arena only): props/decor named by the arena data, rim, corner, ambience and hazard fx
    const man = parsePropManifest(this.cache.json.get(PROPS_KEY(this.arena)));
    for (const n of arenaPropNames(this.arena)) { const e = man[n]; if (e) this.load.image(propKey(n), arenaAssetUrl(this.arena, e.file)); }
    this.load.image(arenaFxKey('rim'), arenaAssetUrl(this.arena, 'rim.png')); this.load.image(arenaFxKey('corner'), arenaAssetUrl(this.arena, 'corner.png'));
    if (ARENAS[this.arena].rimMode === 'strips') { this.load.image(arenaFxKey('rim-bottom'), arenaAssetUrl(this.arena, 'rim-bottom.png')); this.load.image(arenaFxKey('rim-side'), arenaAssetUrl(this.arena, 'rim-side.png')); }
    for (const n of [...ARENA_FX, ...HAZARD_FX[this.arena]]) this.load.image(arenaFxKey(n), arenaAssetUrl(this.arena, `fx/${n}.png`));
    }
    for (const k of BOSS_KINDS) { const m = this.cache.json.get(bossManifestKey(k)) as BossManifest; this.load.spritesheet(bossSheetKey(k), bossSheetUrl(k), { frameWidth: m.frame_width, frameHeight: m.frame_height, endFrame: m.frames - 1 }); }
    for (const dir of KAI_DIRS) for (const clip of [...KAI_F1_CLIPS, ...KAI_KIT_CLIPS] as const) {
      const m = f1[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo | undefined; if (!a) continue;
      this.load.spritesheet(kaiTextureKey(dir, clip, 'f1'), kaiSheetUrl(dir, a, 'f1'), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    for (const dir of KAI_DIRS) for (const clip of [...KAI_CLIPS, ...KAI_KIT_CLIPS] as const) {
      const m = manifests[dir], a = m.animations[clip as keyof typeof m.animations] as KaiClipInfo | undefined; if (!a) continue;
      this.load.spritesheet(kaiTextureKey(dir, clip), kaiSheetUrl(dir, a), { frameWidth: a.frame_width ?? m.frame_width, frameHeight: a.frame_height ?? m.frame_height, endFrame: a.frames - 1 });
    }
    this.load.off(Phaser.Loader.Events.PROGRESS); this.load.on(Phaser.Loader.Events.PROGRESS, (v: number) => this.report(1, v));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.scene.start('ArenaScene'));
    this.load.start();
  }
}
