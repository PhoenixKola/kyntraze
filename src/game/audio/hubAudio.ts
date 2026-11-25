import { sharedAbilityAudio } from './abilityAudio';

/** Fracture Nexus sound: all synthesized at runtime (no sample files). Ambient pad + shimmer bells + wind + a portal hum that swells when the gate is hovered, plus hub-specific interaction sounds. Routed through the shared music / sfx / ui buses, so mute and the volume sliders apply. Nothing here has been verified by ear. */
type HeroKey = 'kai' | 'ren' | 'sora' | 'vex';
const CHORDS: number[][] = [[110, 164.81, 220, 261.63], [87.31, 130.81, 174.61, 220], [130.81, 196, 261.63, 329.63], [98, 146.83, 196, 246.94]];
const PENTA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
interface Graph { ctx: AudioContext; music: AudioNode; sfx: AudioNode; ui: AudioNode }

class HubAudio {
  private g: Graph | null = null; private out: GainNode | null = null; private nodes: AudioScheduledSourceNode[] = []; private timers: number[] = []; private portal: GainNode | null = null; private on = false; private chord = 0; private oscs: OscillatorNode[] = [];
  private graph(): Graph | null { const a = sharedAbilityAudio() as unknown as { synthGraph?: Graph | null } | null; return a?.synthGraph ?? null; }
  private noise(ctx: AudioContext, sec = 2) { const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; return s; }
  /** Begin the ambience (idempotent). Returns false when audio is not unlocked yet, so the caller can retry on the next gesture. */
  start(): boolean {
    if (this.on) return true; const g = this.graph(); if (!g) return false; this.g = g; this.on = true; const { ctx } = g;
    const out = this.out = ctx.createGain(); out.gain.value = 0; out.gain.setTargetAtTime(1, ctx.currentTime, 1.2); out.connect(g.music);
    // pad: four detuned voices through a slowly breathing low-pass
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.6; const padG = ctx.createGain(); padG.gain.value = 0.11; lp.connect(padG); padG.connect(out);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = ctx.createGain(); lfoG.gain.value = 260; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start(); this.nodes.push(lfo);
    CHORDS[0].forEach((f, i) => { for (const det of [-6, 7]) { const o = ctx.createOscillator(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = det; const vg = ctx.createGain(); vg.gain.value = i === 0 ? 0.5 : 0.28; o.connect(vg); vg.connect(lp); o.start(); this.nodes.push(o); this.oscs.push(o); } });
    this.timers.push(window.setInterval(() => { if (!this.on || !this.g) return; this.chord = (this.chord + 1) % CHORDS.length; const t = this.g.ctx.currentTime; this.oscs.forEach((o, i) => o.frequency.setTargetAtTime(CHORDS[this.chord][Math.floor(i / 2)], t, 1.6)); }, 9000));
    // shimmer bells through a feedback echo
    const dly = ctx.createDelay(1.5); dly.delayTime.value = 0.62; const fb = ctx.createGain(); fb.gain.value = 0.42; const wet = ctx.createGain(); wet.gain.value = 0.55; dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
    const bell = () => { if (!this.on || !this.g) return; const c = this.g.ctx, t = c.currentTime, f = PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.2 ? 0.5 : 1); const o = c.createOscillator(), o2 = c.createOscillator(), e = c.createGain(); o.type = 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 2.01; const g2 = c.createGain(); g2.gain.value = 0.25; o.connect(e); o2.connect(g2); g2.connect(e); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.05, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0008, t + 2.6); e.connect(dly); e.connect(out); o.start(t); o2.start(t); o.stop(t + 2.8); o2.stop(t + 2.8); this.timers.push(window.setTimeout(bell, 2200 + Math.random() * 4200)); };
    this.timers.push(window.setTimeout(bell, 1800));
    // environment: distant wind and a faint stone-crackle tick
    const wind = this.noise(ctx, 3), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.8; const wg = ctx.createGain(); wg.gain.value = 0.045; const wl = ctx.createOscillator(); wl.frequency.value = 0.11; const wlg = ctx.createGain(); wlg.gain.value = 0.03; wl.connect(wlg); wlg.connect(wg.gain); wind.connect(bp); bp.connect(wg); wg.connect(out); wind.start(); wl.start(); this.nodes.push(wind, wl);
    const tick = () => { if (!this.on || !this.g) return; const c = this.g.ctx, t = c.currentTime, s = this.noise(c, 0.1), hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const e = c.createGain(); e.gain.setValueAtTime(0.03, t); e.gain.exponentialRampToValueAtTime(0.0005, t + 0.05); s.connect(hp); hp.connect(e); e.connect(out); s.start(t); s.stop(t + 0.08); this.timers.push(window.setTimeout(tick, 1500 + Math.random() * 5000)); };
    this.timers.push(window.setTimeout(tick, 2500));
    // portal hum (sfx bus): a low pair with slow tremolo; hovering the gate swells it
    const hum = ctx.createGain(); hum.gain.value = 0.05; this.portal = hum; hum.connect(g.sfx);
    for (const [f, ty] of [[55, 'sine'], [82.4, 'triangle'], [165.2, 'sine']] as const) { const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = f < 100 ? 0.6 : 0.12; o.connect(og); og.connect(hum); o.start(); this.nodes.push(o); }
    const tr = ctx.createOscillator(); tr.frequency.value = 0.35; const trg = ctx.createGain(); trg.gain.value = 0.015; tr.connect(trg); trg.connect(hum.gain); tr.start(); this.nodes.push(tr);
    return true;
  }
  stop(fade = 0.8) {
    if (!this.on) return; this.on = false; const g = this.g; this.timers.forEach(t => { window.clearInterval(t); window.clearTimeout(t); }); this.timers = [];
    if (g && this.out) { const t = g.ctx.currentTime; this.out.gain.setTargetAtTime(0, t, fade / 4); this.portal?.gain.setTargetAtTime(0, t, fade / 4); }
    const nodes = this.nodes; this.nodes = []; this.oscs = []; this.portal = null; window.setTimeout(() => { for (const n of nodes) { try { n.stop(); n.disconnect(); } catch { /* already stopped */ } } }, fade * 1000 + 200); this.out = null;
  }
  /** Gate hover: the hum swells and rises a touch. */
  gate(near: boolean) { if (!this.g || !this.portal) return; this.portal.gain.setTargetAtTime(near ? 0.16 : 0.05, this.g.ctx.currentTime, 0.25); }
  private env(bus: 'ui' | 'sfx', f: (c: AudioContext, t: number, out: GainNode) => void, vol = 1) { const g = this.g ?? this.graph(); if (!g) return; const c = g.ctx, o = c.createGain(); o.gain.value = vol; o.connect(bus === 'ui' ? g.ui : g.sfx); f(c, c.currentTime, o); window.setTimeout(() => { try { o.disconnect(); } catch { /* gone */ } }, 3500); }
  private tone(c: AudioContext, o: GainNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, delay = 0) { const s = c.createOscillator(), e = c.createGain(); s.type = type; s.frequency.setValueAtTime(f0, t + delay); s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + delay + dur); e.gain.setValueAtTime(0, t + delay); e.gain.linearRampToValueAtTime(peak, t + delay + 0.008); e.gain.exponentialRampToValueAtTime(0.0006, t + delay + dur); s.connect(e); e.connect(o); s.start(t + delay); s.stop(t + delay + dur + 0.05); }
  hover() { this.env('ui', (c, t, o) => this.tone(c, o, 'sine', 1180, 1560, t, 0.07, 0.07), 1); }
  select() { this.env('ui', (c, t, o) => { this.tone(c, o, 'triangle', 660, 660, t, 0.12, 0.12); this.tone(c, o, 'sine', 990, 990, t, 0.2, 0.09, 0.06); }); }
  /** A distinct signature per hero: Kai bright fifth, Ren low thud and ember hiss, Sora crystal arpeggio, Vex detuned void sweep. */
  hero(h: HeroKey) {
    this.env('ui', (c, t, o) => {
      if (h === 'kai') { this.tone(c, o, 'triangle', 392, 392, t, 0.35, 0.14); this.tone(c, o, 'triangle', 587, 587, t, 0.4, 0.12, 0.05); this.tone(c, o, 'sine', 784, 1180, t, 0.5, 0.08, 0.1); }
      else if (h === 'ren') { this.tone(c, o, 'sine', 140, 45, t, 0.4, 0.3); this.tone(c, o, 'sawtooth', 110, 80, t, 0.25, 0.08); const n = this.noise(c, 0.4), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; const e = c.createGain(); e.gain.setValueAtTime(0.0001, t + 0.03); e.gain.linearRampToValueAtTime(0.05, t + 0.08); e.gain.exponentialRampToValueAtTime(0.0005, t + 0.45); n.connect(bp); bp.connect(e); e.connect(o); n.start(t); n.stop(t + 0.5); }
      else if (h === 'sora') { [880, 1174.7, 1568, 2093].forEach((f, i) => this.tone(c, o, 'sine', f, f, t, 0.5, 0.08, i * 0.07)); }
      else { this.tone(c, o, 'sawtooth', 220, 70, t, 0.6, 0.07); this.tone(c, o, 'sawtooth', 233, 74, t, 0.6, 0.07); this.tone(c, o, 'sine', 1400, 300, t, 0.5, 0.05, 0.04); }
    });
  }
  /** Deploy: a rising filtered rush into a sub drop with a bright shimmer tail. */
  deploy() {
    this.env('sfx', (c, t, o) => {
      const n = this.noise(c, 1.6), bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(5200, t + 0.9); const e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.linearRampToValueAtTime(0.22, t + 0.8); e.gain.exponentialRampToValueAtTime(0.0005, t + 1.35); n.connect(bp); bp.connect(e); e.connect(o); n.start(t); n.stop(t + 1.5);
      this.tone(c, o, 'sine', 90, 36, t, 1.1, 0.28, 0.8); [523.25, 783.99, 1046.5, 1568].forEach((f, i) => this.tone(c, o, 'sine', f, f * 1.01, t, 0.9, 0.05, 0.55 + i * 0.05));
    }, 1);
  }
}
export const hubAudio = new HubAudio();
