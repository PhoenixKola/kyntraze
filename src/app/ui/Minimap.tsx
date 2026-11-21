import { useEffect, useRef } from 'react';
import type { MiniMap } from '../../bridge/UiSnapshot';
import { ARENAS, PROP_FOOTPRINTS } from '../../content/arenas';
import { RULES } from '../../core/Rules';

const W = RULES.worldWidth, H = RULES.worldHeight, TAU = Math.PI * 2;
/** Text and tone for the strip under the map: the one-glance read of what the arena is doing. */
export function mapStatus(m: MiniMap, boss: boolean): { text: string; tone: 'calm' | 'warn' | 'danger' | 'boss' | 'hazard' } {
  if (boss) return { text: 'BOSS', tone: 'boss' };
  if (m.hazards.some(h => !h.live && h.warn > 0)) return { text: 'HAZARD', tone: 'hazard' };
  if (m.near >= 16) return { text: 'OVERRUN', tone: 'danger' };
  if (m.near >= 7) return { text: 'SWARM', tone: 'danger' };
  if (m.eliteNear) return { text: 'ELITE', tone: 'warn' };
  if (m.near >= 1) return { text: 'CONTACT', tone: 'warn' };
  return { text: 'CLEAR', tone: 'calm' };
}
const PAL: Record<string, { bg0: string; bg1: string; solid: string; lane: string; laneRing: string; rim: string }> = {
  aetherfall: { bg0: '#2a2616', bg1: '#0b0a05', solid: 'rgba(240,215,138,.42)', lane: 'rgba(244,215,138,.12)', laneRing: 'rgba(244,215,138,.32)', rim: 'rgba(244,215,138,.35)' },
  paradox: { bg0: '#1a1238', bg1: '#05030f', solid: 'rgba(143,128,230,.42)', lane: 'rgba(111,227,225,.12)', laneRing: 'rgba(111,227,225,.32)', rim: 'rgba(111,227,225,.35)' },
  gloam: { bg0: '#0c1f2b', bg1: '#050c14', solid: 'rgba(120,170,190,.42)', lane: 'rgba(95,216,220,.13)', laneRing: 'rgba(95,216,220,.30)', rim: 'rgba(95,216,220,.35)' },
  ashen: { bg0: '#22180f', bg1: '#0a0705', solid: 'rgba(190,150,110,.42)', lane: 'rgba(241,182,111,.10)', laneRing: 'rgba(241,182,111,.30)', rim: 'rgba(241,182,111,.35)' },
};
type Icons = Record<'player' | 'boss', HTMLImageElement>;
const loadIcons = (): Icons => { const mk = (n: string) => { const im = new Image(); im.src = `${import.meta.env.BASE_URL}ui/map/${n}.png`; return im; }; return { player: mk('player'), boss: mk('boss') }; };
const tinted = (src: HTMLImageElement, color: string, size: number) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d')!; g.drawImage(src, 0, 0, size, size); g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, size, size); return c; };
const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0;

/** Draws one frame of the map. Everything is in world units scaled by `k`; marker sizes scale with the canvas and have a floor so they survive 640x360. */
export function drawMinimap(ctx: CanvasRenderingContext2D, cw: number, ch: number, m: MiniMap, t: number, icons: Icons, cache: Map<string, HTMLCanvasElement>) {
  const k = cw / W, def = ARENAS[m.arena] ?? ARENAS.gloam, pal = PAL[m.arena] ?? PAL.gloam, px = Math.max(1.25, cw / 135);
  ctx.clearRect(0, 0, cw, ch);
  const bg = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, cw * 0.62); bg.addColorStop(0, pal.bg0); bg.addColorStop(1, pal.bg1); ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
  ctx.strokeStyle = 'rgba(160,200,215,.06)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 220; x < W; x += 220) { ctx.moveTo(x * k, 0); ctx.lineTo(x * k, ch); }
  for (let y = 220; y < H; y += 220) { ctx.moveTo(0, y * k); ctx.lineTo(cw, y * k); }
  ctx.stroke();
  // arena landmarks: hazard geometry (faint, so you learn where it can strike), then solid props
  const hz = def.hazard;
  if (hz.lanes) { ctx.fillStyle = pal.lane; for (const l of hz.lanes) ctx.fillRect((l.x - l.w / 2) * k, (l.y - l.h / 2) * k, l.w * k, l.h * k); }
  if (hz.radius) { ctx.strokeStyle = pal.laneRing; ctx.lineWidth = px * 0.8; for (const s of def.solids) if (s.prop === 'pylon') { const fp = PROP_FOOTPRINTS.pylon; ctx.beginPath(); ctx.arc((s.x + fp.w / 2) * k, (s.y + fp.h / 2) * k, hz.radius * k, 0, TAU); ctx.stroke(); } }
  ctx.fillStyle = pal.solid; for (const s of def.solids) { const fp = PROP_FOOTPRINTS[s.prop]; ctx.fillRect(s.x * k, s.y * k, Math.max(2, fp.w * k), Math.max(2, fp.h * k)); }
  ctx.strokeStyle = pal.rim; ctx.lineWidth = px; ctx.strokeRect(def.inset * k, def.inset * k, cw - def.inset * 2 * k, ch - def.inset * 2 * k);
  // live hazards: an amber charge-up that fills in, then a hot flash
  const flick = 0.5 + 0.5 * Math.sin(t * 14);
  for (const h of m.hazards) {
    ctx.fillStyle = h.live ? 'rgba(255,120,90,.8)' : `rgba(255,190,90,${0.22 + 0.3 * flick * h.warn})`; ctx.strokeStyle = h.live ? '#fff3d6' : 'rgba(255,210,120,.9)'; ctx.lineWidth = px;
    if (h.shape === 'rect') { ctx.fillRect((h.x - h.w / 2) * k, (h.y - h.h / 2) * k, h.w * k, h.h * k); ctx.strokeRect((h.x - h.w / 2) * k, (h.y - h.h / 2) * k, h.w * k, h.h * k); }
    else { ctx.beginPath(); ctx.arc(h.x * k, h.y * k, h.r * k, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  // the camera's view, so "just off screen" is readable at a glance
  const vw = 960 * k, vh = 540 * k, vx = Math.min(Math.max(m.px * k - vw / 2, 0), cw - vw), vy = Math.min(Math.max(m.py * k - vh / 2, 0), ch - vh);
  ctx.strokeStyle = 'rgba(220,240,245,.28)'; ctx.lineWidth = px; ctx.setLineDash([px * 3, px * 2]); ctx.strokeRect(vx, vy, vw, vh); ctx.setLineDash([]);
  // foes: additive dots so a crowd reads as a glowing density; casters violet, elites amber diamonds
  const f = m.foes; ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < f.length; i += 3) {
    const kind = f[i + 2]; if (kind >= 2) continue;
    const near = Math.hypot(f[i] - m.px, f[i + 1] - m.py) < 380;
    ctx.fillStyle = kind === 1 ? (near ? 'rgba(210,130,255,.95)' : 'rgba(190,110,255,.65)') : (near ? 'rgba(255,100,115,.95)' : 'rgba(255,90,105,.55)');
    ctx.beginPath(); ctx.arc(f[i] * k, f[i + 1] * k, px * (near ? 1.5 : 1.15), 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const pulse = 0.5 + 0.5 * Math.sin(t * 5);
  for (let i = 0; i < f.length; i += 3) {
    if (f[i + 2] !== 2) continue; const x = f[i] * k, y = f[i + 1] * k, r = px * 3.6;
    ctx.fillStyle = '#ffcf7a'; ctx.strokeStyle = '#2a1604'; ctx.lineWidth = px * 0.9; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (let i = 0; i < f.length; i += 3) {
    if (f[i + 2] !== 3) continue; const x = f[i] * k, y = f[i + 1] * k, s = Math.round(px * 12);
    ctx.strokeStyle = `rgba(255,80,90,${0.35 + 0.5 * pulse})`; ctx.lineWidth = px * 1.4; ctx.beginPath(); ctx.arc(x, y, px * (7 + 3 * pulse), 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(40,6,12,.85)'; ctx.beginPath(); ctx.arc(x, y, px * 6.2, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ff5a64'; ctx.lineWidth = px; ctx.stroke();
    const key = `boss${s}`; let img = cache.get(key); if (!img && ready(icons.boss)) { img = tinted(icons.boss, '#ffe9ea', s); cache.set(key, img); } if (img) ctx.drawImage(img, x - s / 2, y - s / 2);
  }
  // player: the strongest mark: a teal halo, then the facing chevron
  const ppx = m.px * k, ppy = m.py * k, ps = Math.round(px * 15), hr = px * 11, halo = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, hr);
  halo.addColorStop(0, 'rgba(95,216,220,.55)'); halo.addColorStop(1, 'rgba(95,216,220,0)'); ctx.fillStyle = halo; ctx.fillRect(ppx - hr, ppy - hr, hr * 2, hr * 2);
  const pk = `player${ps}`; let pimg = cache.get(pk); if (!pimg && ready(icons.player)) { pimg = tinted(icons.player, '#9ff7ff', ps); cache.set(pk, pimg); }
  ctx.save(); ctx.translate(ppx, ppy); ctx.rotate(Math.atan2(m.ay, m.ax) + Math.PI / 2);
  if (pimg) ctx.drawImage(pimg, -ps / 2, -ps / 2); else { ctx.fillStyle = '#9ff7ff'; ctx.beginPath(); ctx.arc(0, 0, px * 3, 0, TAU); ctx.fill(); }
  ctx.restore();
  // partner (co-op): a gold chevron with its own halo and a "2", greyed while downed
  const a = m.ally; if (a) {
    const ax = a.x * k, ay = a.y * k, as = Math.round(px * 13), ar = px * 10, col = a.down ? 'rgba(160,160,170,' : 'rgba(255,200,110,', ag = ctx.createRadialGradient(ax, ay, 0, ax, ay, ar);
    ag.addColorStop(0, col + '.5)'); ag.addColorStop(1, col + '0)'); ctx.fillStyle = ag; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    const ak = `ally${as}${a.down ? 'd' : ''}`; let aimg = cache.get(ak); if (!aimg && ready(icons.player)) { aimg = tinted(icons.player, a.down ? '#9aa0a8' : '#ffd488', as); cache.set(ak, aimg); }
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(a.ay, a.ax) + Math.PI / 2);
    if (aimg) ctx.drawImage(aimg, -as / 2, -as / 2); else { ctx.fillStyle = a.down ? '#9aa0a8' : '#ffd488'; ctx.beginPath(); ctx.arc(0, 0, px * 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = a.down ? '#9aa0a8' : '#ffe2a8'; ctx.font = `bold ${Math.round(px * 6)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('2', ax, ay - as * 0.7);
  }
}

export function Minimap({ map, boss }: { map: MiniMap; boss: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null); const icons = useRef<Icons | null>(null); const cache = useRef(new Map<string, HTMLCanvasElement>());
  useEffect(() => { icons.current ??= loadIcons(); });
  useEffect(() => {
    const cv = ref.current; if (!cv || !icons.current) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr);
    if (cw < 8) return; if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; cache.current.clear(); }
    const ctx = cv.getContext('2d'); if (ctx) drawMinimap(ctx, cw, ch, map, performance.now() / 1000, icons.current, cache.current);
  });
  const st = mapStatus(map, boss);
  return <div className={`hud-panel hud-map tone-${st.tone}`} data-testid="minimap" role="img" aria-label={`Minimap. Status ${st.text}. ${map.near} enemies nearby.`}>
    <canvas ref={ref} className="map-canvas"/>
    <div className="map-foot"><i className="map-led"/><b>{st.text}</b>{map.near > 0 && <span>{map.near}</span>}</div>
  </div>;
}
