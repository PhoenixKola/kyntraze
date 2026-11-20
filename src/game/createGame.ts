import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { ArenaScene } from './scenes/ArenaScene';
import type { GameBridge } from '../bridge/GameBridge';
import type { ArenaId } from '../content/arenas';
import { isHeroId, type HeroId } from '../content/heroes';
/** The runner this game shows: the saved choice, or (dev server with ?qa=1 only) the ?hero= override. */
export function resolveHero(bridge: GameBridge): HeroId {
  try { const q = new URLSearchParams(globalThis.location?.search ?? ''), h = q.get('hero'); if (import.meta.env.DEV && q.get('qa') === '1' && isHeroId(h)) return h; } catch { /* no location */ }
  const net = bridge.getNet()?.room; if (net && net.players[net.you]) return net.players[net.you].hero;
  return bridge.getRunConfig().hero ?? 'kai';
}
/** Heroes fighting beside the runner: the local co-op partner, or the other players of an online room. */
export function resolveMates(bridge: GameBridge): HeroId[] {
  const partner = bridge.getPartner(), room = bridge.getNet()?.room;
  return [...(partner ? [partner] : []), ...(room ? room.players.map(p => p.hero) : [])];
}
export function createGame(parent: HTMLElement, bridge: GameBridge, seed: number, arena: ArenaId = 'gloam') {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: 960, height: 540, backgroundColor: '#101a29',
    pixelArt: true, roundPixels: true,
    // RESIZE: the canvas fills the window (no letterbox bars); ArenaScene zooms so at least 960x540 world px stay visible
    scale: { mode: Phaser.Scale.RESIZE, width: 960, height: 540 },
    scene: [new BootScene(arena, resolveHero(bridge), resolveMates(bridge)), new ArenaScene(bridge, seed, arena)],
  });
}
