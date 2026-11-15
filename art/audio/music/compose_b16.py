"""KYNTRAZE B16 original score. Everything is composed here as note data and rendered by engine.py (no samples, no third-party material).
  python art/audio/music/compose_b16.py [cue ...]   ->  public/audio/music/<cue>.ogg  (+ art/audio/music/manifest.json)
KYNTRAZE motif (D minor): D F A G | F E D  (m3 up, 5th, step back).  Boss-threat interval: the tritone D-Ab (A-Eb in the Seraph).  Victory: the same shape lifted to D major, D F# A D' (rising hope)."""
import json, os, sys
import numpy as np
from engine import *

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT = os.path.join(ROOT, 'public', 'audio', 'music')
MOTIF = [(62, 1), (65, 1), (69, 1.5), (67, .5), (65, 1), (64, 1), (62, 2)]  # (midi, beats)


def clock(bpm):
    spb = 60 / bpm
    return spb, (lambda bar, beat=0: (bar * 4 + beat) * spb)


def chord_at(prog, bar, per=2): return prog[(bar // per) % len(prog)]


def title():
    bpm = 84; spb, at = clock(bpm); bars = 24; m = Mix(bars * 4 * spb, tail=3.5)
    prog = [dict(r=38, c=[50, 57, 62, 65]), dict(r=34, c=[46, 53, 58, 62]), dict(r=31, c=[43, 50, 55, 58]), dict(r=33, c=[45, 52, 57, 61])]
    for b in range(0, bars, 2):
        ch = chord_at(prog, b)
        for n_ in ch['c']: m.add('pad', pad(n_, 2 * 4 * spb, bright=1500 + 200 * (b > 6), att=1.4, rel=1.5), at(b), 0.5, send=0.35)
        m.add('main', sub(ch['r'], 2 * 4 * spb - 0.2), at(b), 0.55)
        if b >= 0: m.add('main', glass(ch['c'][-1] + 24, 3), at(b, 2), 0.35, pan=0.4, send=0.5)
    for b in range(4, bars - 2, 4):  # motif on bells, answered an octave up
        t0 = at(b)
        for p, d in MOTIF: m.add('main', bell(p + 12, 2.2, vol=.42), t0, 1, pan=-0.2, send=0.5); t0 += d * spb
    for b in range(8, 16):  # pulse + kinetic percussion arrive
        ch = chord_at(prog, b)
        for s in range(8): m.add('main', bass_pluck(ch['r'] + (12 if s % 4 == 3 else 0), spb * 0.5 * .9, 700), at(b, s * 0.5), 0.5)
        m.add('drum', kick(0.8), at(b), 1); m.add('drum', kick(0.6), at(b, 2.5), 1); m.add('drum', snare(.5), at(b, 3), 1)
        for s in range(8): m.add('drum', hat(0.18 + 0.1 * (s % 2)), at(b, s * 0.5), 1, pan=0.3)
        for s in range(16): m.add('main', pluck(ch['c'][s % 4] + 24 + (12 if s % 8 == 7 else 0), 0.22), at(b, s * 0.25), 0.33, pan=-0.4 if s % 2 else 0.4, send=0.3)
    m.pump([at(b, k) for b in range(8, 16) for k in (0, 2.5)], 0.35, 0.2)
    t0 = at(16)  # the lead states the motif in full
    for rep in range(2):
        for p, d in MOTIF: m.add('main', lead(p + 12, d * spb * 0.92, 3000), t0, 0.9, send=0.45); t0 += d * spb
        t0 = at(20)
    for b in (16, 20): m.add('drum', taiko(70, .8), at(b), 1); m.add('drum', taiko(58, .7), at(b, 2), 1)
    m.add('main', riser(2 * spb * 4, 400, 6000, .22, False), at(22), 1, send=0.2)
    return m.render(rev_sec=3.2, rev_decay=1.7, rev_gain=0.5, target_rms_db=-21), dict(bpm=bpm, bars=bars)


def gloam():
    bpm = 126; spb, at = clock(bpm); bars = 32; m = Mix(bars * 4 * spb, tail=2.0)
    prog = [dict(r=28, c=[52, 55, 59, 62]), dict(r=24, c=[48, 52, 55, 59]), dict(r=26, c=[50, 54, 57, 62]), dict(r=23, c=[47, 50, 54, 57])]
    for b in range(bars):
        ch = chord_at(prog, b); sec = b // 8; last = (b % 8) == 7
        # bass: syncopated 16ths with octave jumps
        pat = [0, 0, 12, 0, 0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0] if sec != 3 else [0] * 16
        for s in range(16):
            if sec == 0 and b < 2 and s % 2: continue
            m.add('main', bass_pluck(ch['r'] + pat[s], spb * .24, 800 + 500 * (sec >= 2)), at(b, s * .25), 0.5)
        m.add('drum', kick(1.0), at(b), 1); m.add('drum', kick(.9), at(b, 1), 1); m.add('drum', kick(1.0), at(b, 2), 1); m.add('drum', kick(.9), at(b, 3), 1)
        if sec >= 1 or b > 3:
            m.add('drum', clap(.55), at(b, 1), 1); m.add('drum', clap(.55), at(b, 3), 1)
        for s in range(8): m.add('drum', hat(.28 if s % 2 else .18, open_=(s % 4 == 3)), at(b, s * .5 + .25 * (s % 2 == 1) * 0), 1, pan=.35)
        if sec >= 1:
            for s in (1.5, 3.5): m.add('drum', metal(.4, 380 + 70 * ((b // 2) % 3)), at(b, s), 1, pan=-.4)
        if sec >= 1:  # machine arp
            for s in range(16):
                if sec == 3 and s % 2: continue
                m.add('main', pluck(ch['c'][(s * 3 + b) % 4] + 24, .2, 5000), at(b, s * .25), .3, pan=(-.5 if s % 2 else .5), send=.25)
        if sec in (1, 2):
            for n_ in ch['c'][:3]: m.add('pad', pad(n_ + 12, 4 * spb, 1400, att=.8, rel=1.0), at(b), .35 if b % 1 == 0 else 0, send=.3) if b % 2 == 0 else None
        if last: m.add('main', riser(4 * spb, 500, 8000, .35, False), at(b), 1); m.add('drum', snare(.7), at(b, 3.5), 1); m.add('drum', snare(.6), at(b, 3.75), 1)
    for b in range(16, 24):  # lead: the motif, hardened (E minor)
        if b % 4: continue
        t0 = at(b)
        for p, d in MOTIF: m.add('main', lead(p + 14, d * spb * .9, 3600), t0, .85, send=.4); t0 += d * spb
    for b in range(24, 32, 4):
        for k, n_ in enumerate((64, 67, 71, 69)): m.add('main', bell(n_ + 12, 1.4, vol=.34), at(b, k), 1, pan=.3, send=.5)
    m.pump([at(b, k) for b in range(bars) for k in (0, 1, 2, 3)], .4, .16)
    return m.render(rev_sec=1.6, rev_decay=3.0, rev_gain=.3, target_rms_db=-19), dict(bpm=bpm, bars=bars)


def ashen():
    bpm = 96; spb, at = clock(bpm); bars = 32; m = Mix(bars * 4 * spb, tail=3.5)
    prog = [dict(r=26, c=[50, 57, 62, 65]), dict(r=27, c=[51, 58, 63, 67]), dict(r=26, c=[50, 57, 62, 65]), dict(r=24, c=[48, 55, 60, 64])]  # Dm | Eb | Dm | C  (Phrygian-flavoured)
    for b in range(0, bars, 2):
        ch = chord_at(prog, b); sec = b // 8
        m.add('pad', pad(26, 8 * spb, 700, voices=3, att=1.6, rel=2.0), at(b), .5, send=.5) if b % 4 == 0 else None
        for n_ in ch['c']: m.add('pad', pad(n_, 8 * spb, 1100 + 600 * (sec == 2), att=1.5, rel=2.0), at(b), .3 + .12 * (sec >= 1), send=.5)
    for b in range(bars):
        sec = b // 8
        m.add('drum', taiko(60, 1.0), at(b), 1); m.add('drum', taiko(52, .8), at(b, 2), 1, pan=-.2)
        if sec >= 1 or b % 4 == 3:
            for k, (s, f, v) in enumerate(((2.5, 110, .5), (3, 95, .55), (3.5, 85, .6))): m.add('drum', tom(f, v, 4.5), at(b, s), 1, pan=.25)
        for s in range(8): m.add('drum', shaker(.12 + .08 * (s % 2)), at(b, s * .5), 1, pan=.4)
        if sec >= 2: m.add('drum', metal(.25, 600), at(b, 1.5), 1, pan=-.4, send=.3)
    ph = [74, 75, 74, 72, 69, 70, 69, 67]  # D Eb D C A Bb A G  (b2 gives the unsettled colour)
    for b in range(8, 24, 4):
        t0 = at(b)
        for k, p in enumerate(ph): d = (1.5 if k % 4 == 0 else .5) * 1.0; m.add('main', flute(p, d * spb * 2 * .9), t0, .8, send=.55); t0 += d * spb * 2
    for b in range(16, 32, 4):
        for k, n_ in enumerate((86, 82, 81, 77)): m.add('main', bell(n_, 2.4, idx=1.8, vol=.3), at(b + 1 + k * .5), 1, pan=-.35 + k * .2, send=.6)
    for b in (7, 15, 23, 31): m.add('main', riser(3 * spb, 300, 5000, .25, False), at(b, 1), 1, send=.3); m.add('drum', taiko(70, 1.1), at(b, 3.75), 1)
    return m.render(rev_sec=3.0, rev_decay=1.6, rev_gain=.5, target_rms_db=-20), dict(bpm=bpm, bars=bars)


def warden():
    bpm = 88; spb, at = clock(bpm); bars = 24; m = Mix(bars * 4 * spb, tail=3.0)
    prog = [dict(r=26, c=[38, 45, 50, 53]), dict(r=26, c=[38, 45, 50, 56]), dict(r=22, c=[34, 41, 46, 50]), dict(r=21, c=[33, 40, 45, 49])]  # Dm | Dm(b5-flavoured Ab) | Bb | A
    for b in range(bars):
        ch = chord_at(prog, b, 2); sec = b // 6
        m.add('main', sub(ch['r'] - 12, 4 * spb - .1, 2.4), at(b), .8)
        m.add('drum', taiko(48, 1.1), at(b), 1); m.add('drum', taiko(48, .9), at(b, 1.5 if sec else 2), 1)
        m.add('drum', snare(.9), at(b, 2), 1); m.add('drum', clap(.5), at(b, 2), 1)
        if sec >= 1:
            for s in (2.75, 3, 3.25, 3.5): m.add('drum', tom(78 + 6 * s, .7, 4), at(b, s), 1, pan=.3)
        if sec >= 2:
            for s in range(8): m.add('drum', hat(.22), at(b, s * .5), 1, pan=-.3)
            m.add('drum', kick(.9, 40), at(b, 1), 1); m.add('drum', kick(.9, 40), at(b, 3), 1)
        if b % 2 == 0:
            for n_ in ch['c'][1:]: m.add('main', brass(n_ + 12, 1.5 * spb, 2200 + 600 * sec), at(b), .55, send=.3)
            m.add('main', brass(ch['c'][0] + 24, .6 * spb, 3000), at(b, 2.5), .4, send=.3)
    for b in range(0, bars, 4):  # low-brass motif with the tritone threat (D F A Ab)
        t0 = at(b + 2)
        for p, d in ((50, 1), (53, 1), (57, 1), (56, 3)): m.add('main', brass(p, d * spb * .95, 1800), t0, .8, send=.35); t0 += d * spb
    for b in range(12, 24, 2):
        for n_ in (62, 65, 69): m.add('pad', choir(n_ - 12 + (1 if n_ == 69 and b % 4 == 2 else 0), 8 * spb, att=1, rel=1, bright=900), at(b), .5, send=.4) if b % 4 == 0 else None
    for b in (5, 11, 17, 23): m.add('main', riser(3 * spb, 200, 5000, .4), at(b, 1), 1); m.add('main', impact(.8), at(b + 1) if b < 23 else at(0) - 0.0, .6)
    m.pump([at(b) for b in range(bars)], .3, .3)
    return m.render(rev_sec=2.2, rev_decay=2.2, rev_gain=.35, target_rms_db=-18.5), dict(bpm=bpm, bars=bars)


def seraph():
    bpm = 112; spb, at = clock(bpm); bars = 32; m = Mix(bars * 4 * spb, tail=3.5)
    prog = [dict(r=33, c=[57, 60, 64, 69]), dict(r=29, c=[53, 57, 60, 65]), dict(r=36, c=[55, 60, 64, 67]), dict(r=31, c=[55, 59, 62, 67])]  # Am | F | C | G
    for b in range(bars):
        ch = chord_at(prog, b, 2); sec = b // 8
        for s in range(8):  # crystalline arpeggio
            n_ = ch['c'][[0, 1, 2, 3, 2, 1, 3, 2][s]] + 24 + (12 if sec >= 2 and s % 4 == 3 else 0)
            m.add('main', glass(n_, 1.1, .22 + .06 * (sec >= 1)), at(b, s * .5), 1, pan=-.5 + s * .14, send=.55)
        if b % 2 == 0:
            for n_ in ch['c']: m.add('pad', choir(n_, 8 * spb - .2 if False else 2 * 4 * spb, att=1.2, rel=1.4, bright=1600 + 400 * sec), at(b), .45, send=.5)
        if sec >= 1:
            for s in range(8): m.add('main', sub(ch['r'], spb * .45, 1.3), at(b, s * .5), .5 if s % 2 == 0 else .3)
            m.add('drum', hat(.2), at(b, 1.5), 1, pan=.4); m.add('drum', hat(.2), at(b, 3.5), 1, pan=.4)
        if sec >= 2:
            m.add('drum', kick(.85, 44), at(b), 1); m.add('drum', kick(.7, 44), at(b, 2), 1); m.add('drum', snare(.6), at(b, 1), 1); m.add('drum', snare(.6), at(b, 3), 1)
        if sec == 3 and b % 2 == 1: m.add('main', metal(.3, 700), at(b, 3), 1, pan=-.3, send=.4)
    for b in range(8, 32, 4):  # bell lead: the motif transposed to A minor, tritone cry (Eb) on the turn
        t0 = at(b)
        for p, d in MOTIF: m.add('main', bell(p + 19, 2.0, idx=2.2, vol=.38), t0, 1, pan=.1, send=.6); t0 += d * spb
        m.add('main', bell(75, 3.0, idx=2.8, vol=.3), at(b + 2, 2), 1, pan=-.2, send=.6)
    for b in (7, 15, 23, 31): m.add('main', riser(4 * spb, 800, 9000, .3), at(b), 1, send=.3)
    m.pump([at(b, k) for b in range(16, 32) for k in (0, 2)], .3, .2)
    return m.render(rev_sec=3.6, rev_decay=1.4, rev_gain=.55, target_rms_db=-20), dict(bpm=bpm, bars=bars)


def victory():
    bpm = 96; spb, at = clock(bpm); bars = 10; m = Mix(bars * 4 * spb, tail=3.5, loop=False)
    prog = [dict(r=38, c=[50, 57, 62, 66]), dict(r=33, c=[45, 52, 57, 61]), dict(r=35, c=[47, 54, 59, 62]), dict(r=31, c=[43, 50, 55, 59]), dict(r=38, c=[50, 57, 62, 66])]
    for b in range(0, 10, 2):
        ch = prog[(b // 2) % 5]
        for n_ in ch['c']: m.add('pad', pad(n_ + (12 if b >= 6 else 0), 8 * spb, 2600, att=.5, rel=1.2), at(b), .45, send=.5)
        m.add('main', sub(ch['r'], 8 * spb - .1), at(b), .7)
        for n_ in ch['c'][1:]: m.add('main', brass(n_ + 12, 2 * spb, 3200), at(b), .5, send=.35)
        m.add('drum', taiko(60, 1.0), at(b), 1); m.add('drum', taiko(52, .8), at(b, 2), 1)
        m.add('drum', taiko(60, 1.0), at(b, 4), 1) if b < 8 else None
    VM = [(62, 1), (66, 1), (69, 1.5), (74, .5), (73, 1), (69, 1), (74, 4)]  # the motif lifted to D major, ending on the octave
    t0 = at(0, 0)
    for rep in range(2):
        for p, d in VM:
            m.add('main', lead(p, d * spb * .95, 3800, att=.02, rel=.3), t0, .85, send=.45); m.add('main', bell(p + 12, 2.2, vol=.36), t0, 1, pan=.3, send=.55); t0 += d * spb
        t0 = at(4)
    for k, n_ in enumerate((74, 78, 81, 86)): m.add('main', bell(n_, 4.0, idx=1.6, vol=.4), at(8, k * .25), 1, pan=-.3 + k * .2, send=.6)
    m.add('drum', riser(2 * spb * 4 * .25, 500, 9000, .3, False), at(7, 2), 1)
    for s in range(8): m.add('drum', snare(.4 + .06 * s), at(7, 2 + s * .25), 1)
    m.add('main', impact(1.0), at(8), .8); m.add('main', glass(86, 5.0, .4), at(8, .5), 1, send=.7)
    return m.render(rev_sec=3.5, rev_decay=1.5, rev_gain=.5, target_rms_db=-18.5), dict(bpm=bpm, bars=bars, loop=False)


def defeat():
    bpm = 64; spb, at = clock(bpm); m = Mix(7.5 * spb * 2, tail=3.0, loop=False)
    for k, n_ in enumerate((74, 69, 65, 62)): m.add('main', bell(n_, 3.0, idx=1.4, vol=.4), at(0, k * 1.5), 1, pan=.2 - k * .1, send=.7)
    for n_ in (38, 45, 50, 53): m.add('pad', pad(n_, 8 * spb, 900, att=.8, rel=1.5), at(0), .5, send=.5)
    m.add('main', sub(26, 6 * spb), at(0), .7); m.add('drum', taiko(52, .7), at(0), 1); m.add('drum', taiko(46, .6), at(2), 1)
    return m.render(rev_sec=3.0, rev_decay=1.5, rev_gain=.5, target_rms_db=-22), dict(bpm=bpm, loop=False)


def stinger_boss():
    m = Mix(3.6, tail=2.5, loop=False)
    m.add('main', impact(1.0), 0, .9); m.add('main', riser(.9, 200, 6000, .35), 0, 1)
    for k, n_ in enumerate((50, 56)): m.add('main', brass(n_, 1.6, 1800), .9, .8, send=.3)  # D + Ab (tritone)
    m.add('drum', taiko(48, 1.1), .9, 1); m.add('drum', taiko(40, 1), 1.5, 1)
    return m.render(rev_sec=2.4, rev_decay=2.0, rev_gain=.4, target_rms_db=-17), dict(loop=False)


def stinger_final_warning():
    spb = 60 / 120; m = Mix(8 * spb * 1.0, tail=2.5, loop=False)
    t = 0.0; gap = 1.0
    for k in range(12):  # an accelerating tritone pulse
        m.add('main', brass(45 if k % 2 == 0 else 51, .3, 1500), t, .5, send=.25); m.add('drum', tom(70 + 4 * k, .7, 6), t, 1); t += gap; gap = max(.15, gap * .74)
        if t > 3.9: break
    m.add('main', riser(3.8, 200, 8000, .45), 0.2, 1)
    m.add('main', impact(.9), 4.0, .8)
    return m.render(rev_sec=2.4, rev_decay=2.0, rev_gain=.4, target_rms_db=-18), dict(loop=False)


def stinger_reward():
    m = Mix(3.4, tail=2.5, loop=False)
    for k, n_ in enumerate((62, 66, 69, 74)): m.add('main', bell(n_ + 12, 2.2, vol=.45), k * .13, 1, pan=-.3 + k * .2, send=.6)
    for n_ in (50, 57, 62, 66): m.add('pad', pad(n_, 1.6, 2800, att=.1, rel=1.0), .3, .5, send=.4)
    m.add('drum', taiko(60, .9), 0, 1)
    return m.render(rev_sec=2.8, rev_decay=1.7, rev_gain=.45, target_rms_db=-18), dict(loop=False)


def stinger_levelup():
    m = Mix(1.7, tail=1.5, loop=False)
    for k, n_ in enumerate((74, 78, 81)): m.add('main', glass(n_ + 12, 1.2, .5), k * .08, 1, pan=-.2 + k * .2, send=.5)
    m.add('main', bell(86, 1.4, vol=.4), .24, 1, send=.5)
    return m.render(rev_sec=1.8, rev_decay=2.4, rev_gain=.4, target_rms_db=-19), dict(loop=False)


CUES = dict(title=title, gloam=gloam, ashen=ashen, warden=warden, seraph=seraph, victory=victory, defeat=defeat,
            stinger_boss=stinger_boss, stinger_final_warning=stinger_final_warning, stinger_reward=stinger_reward, stinger_levelup=stinger_levelup)

if __name__ == '__main__':
    mf = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'manifest.json')
    man = json.load(open(mf)) if os.path.exists(mf) else {}
    for name in (sys.argv[1:] or CUES):
        y, info = CUES[name](); p = os.path.join(OUT, name + '.ogg'); write_ogg(y, p)
        info.update(seconds=round(y.shape[1] / SR, 2), peak_dBFS=round(float(20 * np.log10(np.max(np.abs(y)))), 2), rms_dBFS=round(float(20 * np.log10(np.sqrt(np.mean(y ** 2)))), 2), bytes=os.path.getsize(p))
        man[name] = info; print(name, info, flush=True)
    json.dump(man, open(mf, 'w'), indent=1)
