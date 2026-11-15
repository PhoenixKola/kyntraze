"""Original UI / progression sounds for KYNTRAZE B16 (Relic Plate: brass latch, glass ping, teal energy), synthesised with numpy only.
  python art/audio/ui/synth_b16_ui.py  ->  public/audio/ui/*.wav + loudness.json
Short and tactile on purpose; hover is barely there so a roaming mouse never turns into noise."""
import json, os, sys, wave
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'music'))
from engine import SR, ns, tt, lp, hp, bp, noise, sine, sweep, hz

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, 'public', 'audio', 'ui'); os.makedirs(OUT, exist_ok=True)
def env(n, a=0.001, r=0.02): e = np.ones(n); na, nr = max(1, ns(a)), max(1, ns(r)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e
def ping(f, sec, d=14, parts=((1, 1), (2.76, .35), (5.4, .15))): t = tt(ns(sec)); return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d * (1 + .3 * i)) for i, (r, a) in enumerate(parts))
def latch(sec=0.09, f=520): n = ns(sec); t = tt(n); return 0.7 * hp(noise(n), 2200) * np.exp(-t * 90) + 0.8 * np.sin(2 * np.pi * np.cumsum(f * np.exp(-t * 40) + 150) / SR) * np.exp(-t * 45)
def pad_to(x, n): y = np.zeros(n); y[: len(x)] += x[:n]; return y
def mix(n, *parts):
    y = np.zeros(n)
    for x, t0, g in parts: i = ns(t0) if t0 else 0; y[i:i + len(x)] += x[: n - i] * g
    return y

def ui_hover(): n = ns(.05); return (ping(3200, .05, 60, ((1, 1), (2.1, .3))) * .35 + hp(noise(n), 5000) * np.exp(-tt(n) * 120) * .12) * env(n, .001, .015)
def ui_click(): n = ns(.12); return mix(n, (latch(.09), 0, 1), (ping(1900, .12, 30) * .35, .004, 1)) * env(n, .0008, .03)
def ui_confirm(): n = ns(.34); return mix(n, (latch(.09, 440), 0, 1), (ping(hz(81), .3, 11) * .45, .03, 1), (ping(hz(88), .3, 10) * .4, .085, 1), (np.sin(2 * np.pi * np.cumsum(sweep(110, 70, ns(.2))) / SR) * np.exp(-tt(ns(.2)) * 15) * .5, 0, 1)) * env(n, .001, .05)
def ui_back(): n = ns(.22); return mix(n, (latch(.08, 360), 0, .9), (ping(hz(76), .2, 14) * .4, .02, 1), (ping(hz(71), .2, 14) * .35, .07, 1)) * env(n, .001, .04)
def ui_pause(): n = ns(.3); t = tt(n); return mix(n, (np.sin(2 * np.pi * np.cumsum(sweep(600, 120, n)) / SR) * np.exp(-t * 9) * .5, 0, 1), (latch(.1, 300), 0, 1), (ping(hz(64), .25, 12) * .25, .02, 1)) * env(n, .001, .06)
def ui_resume(): n = ns(.28); t = tt(n); return mix(n, (np.sin(2 * np.pi * np.cumsum(sweep(140, 700, n)) / SR) * np.exp(-t * 7) * .45, 0, 1), (latch(.09, 500), .1, 1), (ping(hz(76), .2, 12) * .3, .1, 1)) * env(n, .001, .06)
def ui_toggle_on(): n = ns(.14); return mix(n, (latch(.07, 500), 0, .8), (ping(hz(84), .12, 20) * .4, .02, 1)) * env(n, .001, .03)
def ui_toggle_off(): n = ns(.14); return mix(n, (latch(.07, 380), 0, .8), (ping(hz(74), .12, 20) * .4, .02, 1)) * env(n, .001, .03)
def ui_slider(): n = ns(.04); return ping(1800, .04, 70, ((1, 1), (2.4, .25))) * .5 * env(n, .0008, .01)
def lv_pick(): n = ns(.5); t = tt(n); return mix(n, (latch(.1, 420), 0, 1), (ping(hz(81), .45, 7) * .5, .02, 1), (ping(hz(88), .45, 7) * .45, .06, 1), (ping(hz(93), .4, 8) * .4, .1, 1), (hp(noise(n), 3000) * np.linspace(0, 1, n) ** 3 * np.exp(-t * 6) * .25, 0, 1)) * env(n, .001, .1)
def lv_epic(): n = ns(1.1); t = tt(n); x = sum(ping(hz(m), 1.0, 4, ((1, 1), (2.01, .2))) * a for m, a in ((86, .4), (90, .3), (93, .3), (98, .25))); return mix(n, (x, 0, 1), (bp(noise(n), 3000, 9000) * np.sin(np.pi * np.minimum(1, t / 1.1)) ** 2 * .1, 0, 1)) * env(n, .01, .3)
def xp_pickup(): n = ns(.09); t = tt(n); return (np.sin(2 * np.pi * np.cumsum(sweep(1500, 2300, n)) / SR) * np.exp(-t * 28) * .6 + ping(3400, .09, 40) * .12) * env(n, .001, .02)
def drive_ready(): n = ns(.7); t = tt(n); return mix(n, (hp(noise(n), 2500) * (t / .7) ** 2 * np.exp(-t * 3) * .12, 0, 1), (np.sin(2 * np.pi * np.cumsum(sweep(300, 1200, ns(.35)) / 1) / SR) * np.hanning(ns(.35)) * .35, 0, 1), (ping(hz(84), .55, 5) * .4, .22, 1), (ping(hz(91), .5, 5) * .3, .3, 1)) * env(n, .003, .15)

SOUNDS = dict(ui_hover=ui_hover, ui_click=ui_click, ui_confirm=ui_confirm, ui_back=ui_back, ui_pause=ui_pause, ui_resume=ui_resume, ui_toggle_on=ui_toggle_on, ui_toggle_off=ui_toggle_off, ui_slider=ui_slider, lv_pick=lv_pick, lv_epic=lv_epic, xp_pickup=xp_pickup, drive_ready=drive_ready)
if __name__ == '__main__':
    rep = {}
    for name, fn in SOUNDS.items():
        x = np.asarray(fn(), float); x -= x.mean(); k = ns(.004); x[-k:] *= np.linspace(1, 0, k)
        peak = {'ui_hover': -14, 'ui_slider': -13, 'xp_pickup': -9}.get(name, -4)  # hover / tick / pickup are meant to sit far below the rest
        x = x / np.max(np.abs(x)) * 10 ** (peak / 20); pcm = np.round(x * 32767).astype('<i2')
        with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        rep[name] = dict(seconds=round(len(pcm) / SR, 3), peak_dBFS=round(float(20 * np.log10(np.max(np.abs(x)))), 2), clipped_samples=int(np.sum(np.abs(pcm) >= 32767))); print(name, rep[name])
    json.dump(rep, open(os.path.join(OUT, 'loudness.json'), 'w'), indent=1)
