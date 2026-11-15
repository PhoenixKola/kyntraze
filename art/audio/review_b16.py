"""B16 verification + owner listening pack (everything built from the SHIPPED game files).
  python art/audio/review_b16.py   ->  art/audio/review/b16/{verify.json, b16_montage.mp3, montage_cues.txt, index.html}
Programmatic checks (clipping, loop seam, tail, duration) are NOT a judgement of how anything sounds; the montage is for the owner's ears."""
import json, os, subprocess, glob
import numpy as np
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUB = os.path.join(ROOT, 'public', 'audio'); OUT = os.path.join(ROOT, 'art', 'audio', 'review', 'b16'); os.makedirs(OUT, exist_ok=True)
SR = 44100


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).T.copy()


def db(x): return round(float(20 * np.log10(max(x, 1e-9))), 2)


def verify():
    rep = {}
    loops = {'title', 'gloam', 'ashen', 'warden', 'seraph'}
    for f in sorted(glob.glob(os.path.join(PUB, '**', '*.*'), recursive=True)):
        if f.endswith('.json'): continue
        rel = os.path.relpath(f, PUB).replace('\\', '/'); y = load(f); n = y.shape[1]; name = os.path.splitext(os.path.basename(f))[0]
        r = dict(seconds=round(n / SR, 2), peak_dBFS=db(np.max(np.abs(y))), rms_dBFS=db(np.sqrt(np.mean(y ** 2))), clipped=int(np.sum(np.abs(y) >= 0.999)))
        w = int(0.05 * SR); r['tail_rms_dBFS'] = db(np.sqrt(np.mean(y[:, -w:] ** 2))); r['head_rms_dBFS'] = db(np.sqrt(np.mean(y[:, :w] ** 2)))
        if rel.startswith('music/') and name in loops:
            jump = float(np.max(np.abs(y[:, 0] - y[:, -1]))); typ = float(np.median(np.abs(np.diff(y, axis=1))) + 1e-9)
            r['loop_seam_jump'] = round(jump, 4); r['loop_seam_vs_median_step'] = round(jump / typ, 1); r['loop_seam_ok'] = bool(jump < 0.08)
        rep[rel] = r
    json.dump(rep, open(os.path.join(OUT, 'verify.json'), 'w'), indent=1); return rep


def montage():
    L = lambda p: load(os.path.join(PUB, p))
    cues = {k: L(f'music/{k}.ogg') for k in ('title', 'gloam', 'ashen', 'warden', 'seraph', 'victory')}
    st = {k: L(f'music/{k}.ogg') for k in ('stinger_boss', 'stinger_final_warning', 'stinger_reward', 'stinger_levelup')}
    def sfx(n):
        for d in ('kai-abilities', 'enemies', 'bosses', 'combat', 'ui'):
            p = os.path.join(PUB, d, n + '.wav')
            if os.path.exists(p): return load(p)
        raise FileNotFoundError(n)
    T = 118; out = np.zeros((2, int(T * SR))); mus = np.zeros_like(out); fx = np.zeros_like(out); duck = np.ones(out.shape[1]); log = []
    def put(buf, sig, t, g=1.0):
        i = int(t * SR); m = min(sig.shape[1], buf.shape[1] - i); buf[:, i:i + m] += sig[:, :m] * g
    def music(name, t0, dur, off=0.0, fade=1.5):
        seg = cues[name][:, int(off * SR):int((off + dur) * SR)].copy(); n = seg.shape[1]; f = int(fade * SR); seg[:, :f] *= np.linspace(0, 1, f); seg[:, -f:] *= np.linspace(1, 0, f); put(mus, seg, t0)
    def dk(t0, t1, lvl, tc=0.15):
        a, b = int(t0 * SR), int(t1 * SR); duck[a:b] = np.minimum(duck[a:b], lvl); r = int(0.5 * SR); duck[b:b + r] = np.minimum(duck[b:b + r], lvl + (1 - lvl) * np.linspace(0, 1, r))
    def note(t, text): log.append(f'{int(t // 60)}:{t % 60:04.1f}  {text}')
    note(0, 'MENU: title theme (motif on bells), click / confirm UI sounds'); music('title', 0, 10, 8)
    fx_ = lambda n, t, g=1.0: put(fx, sfx(n), t, g)
    fx_('ui_hover', 5.2, .6); fx_('ui_click', 6.0, .8); fx_('ui_confirm', 8.4, .9)
    note(9, 'ARENA START: Gloam Circuit theme (industrial pulse)'); music('gloam', 9, 24, 20)
    for k, t in enumerate((11.0, 11.6, 12.2, 12.8, 13.4)): fx_('hit_light', t, .6)
    fx_('hit_heavy', 14.2); fx_('block_deflect', 15.0); fx_('player_hurt', 16.0); fx_('death_small', 17.0, .8); fx_('xp_pickup', 17.5, .6); fx_('xp_pickup', 17.6, .6)
    note(11, 'combat: light hits, heavy hit (14.2), shield block (15.0), player hurt (16.0), mob death (17.0), xp pickups')
    note(22, 'WARDEN ARRIVES (8:00): boss stinger + warning, theme crossfades in'); put(fx, st['stinger_boss'], 22, .9); dk(22, 24.2, .5); fx_('boss_warning', 22, .8); fx_('warden_roar', 23.5, .9); music('warden', 22, 15, 14, 1.0)
    for t in (27, 28.4, 29.8): fx_('hit_boss', t, .8)
    fx_('warden_death', 33, 1.0); note(33, 'Warden defeated: death payoff, then reward stinger')
    put(fx, st['stinger_reward'], 35.5); dk(35, 38, .55); music('ashen', 35.5, 14, 30, 2.4); note(35.5, 'REWARD stinger -> back to the arena (Ashen Reliquary theme shown here)')
    put(fx, st['stinger_levelup'], 43); fx_('lv_pick', 46, .9); note(43, 'LEVEL-UP stinger (music ducked), card pick at 46')
    dk(43, 47, .5)
    note(50, 'COMETHEART (Form II): music ducks, charge -> break -> commit, then Dragonfang lunge + hit, Cometbreaker beam'); dk(50, 54, .3)
    fx_('form2_charge', 50, .9); fx_('form2_break', 53.3); fx_('form2_commit', 53.6); fx_('dragon_windup', 56.2, .8); fx_('dragon_launch', 57.2); fx_('dragon_hit', 57.7); fx_('comet_gather', 59.0, .8); fx_('comet_fire', 60.1); fx_('comet_end', 61.6, .8)
    note(66, 'STILLFIRE APEX (Form III): the mix drops to near-silence for the 3.6 s reveal'); dk(66, 69.6, .04); fx_('form3_silence', 66, .9); fx_('form3_omen', 68.2, .8); fx_('form3_reveal', 69.6, 1.0)
    fx_('rift_charge', 72, .8); fx_('rift_blink', 74, .9); fx_('rift_fire', 74.4, .9); fx_('evasion', 76.5, 1.0); note(72, 'Silver Rift charge / blink / fire, Perfect Evasion (76.5)')
    music('gloam', 67.5, 12, 40, 2.0)
    note(82, 'FINAL WARNING (14:30) stinger'); put(fx, st['stinger_final_warning'], 82); dk(82, 86, .45)
    note(86, 'NULL SERAPH (15:00): boss stinger + theme'); put(fx, st['stinger_boss'], 86, .9); dk(86, 88, .5); fx_('seraph_arrive', 86.5, .9); music('seraph', 86, 18, 16, 1.0)
    fx_('hit_boss', 91, .8); fx_('seraph_phase', 94, .9); fx_('seraph_volley_fire', 97, .7)
    fx_('seraph_death', 101, 1.0); note(101, 'SERAPH FALLS: death payoff, then VICTORY theme'); music('victory', 102, 16, 0, .15)
    mix = mus * 0.35 * duck + fx * 1.0
    mix *= 0.8; pk = np.max(np.abs(mix)); mix = mix / pk * 10 ** (-1.5 / 20) if pk > 0.89 else mix
    pcm = np.round(mix.T * 32767).astype('<i2'); tmp = os.path.join(OUT, '_m.wav')
    with wave.open(tmp, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-b:a', '128k', os.path.join(OUT, 'b16_montage.mp3')], check=True); os.remove(tmp)
    open(os.path.join(OUT, 'montage_cues.txt'), 'w').write('\n'.join(log) + '\n'); return log


def index(rep):
    rows = ''.join(f'<tr><td>{k}</td><td>{v["seconds"]} s</td><td>{v["peak_dBFS"]} / {v["rms_dBFS"]}</td><td><audio controls preload="none" src="../../../../public/audio/{k}"></audio></td></tr>' for k, v in rep.items())
    open(os.path.join(OUT, 'index.html'), 'w').write(f'<!doctype html><meta charset=utf-8><title>KYNTRAZE B16 audition</title><body style="font:14px system-ui;background:#101820;color:#dde"><h1>B16 audition</h1><p><audio controls src="b16_montage.mp3"></audio> montage - cue list in montage_cues.txt</p><table cellpadding=4><tr><th>file</th><th>length</th><th>peak/rms dBFS</th><th>play</th></tr>{rows}</table>')


if __name__ == '__main__':
    rep = verify(); log = montage(); index(rep)
    bad = {k: v for k, v in rep.items() if v['clipped'] or v.get('loop_seam_ok') is False}
    print(len(rep), 'files checked; problems:', bad or 'none'); print('\n'.join(log))
