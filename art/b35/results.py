"""B35 ImageGen for the redesigned results screens: defeat key art and a defeat crest. python art/b35/results.py ; then python art/b35/results_process.py"""
import subprocess, os, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/b35'
J = {
 'defeat-key': ("Cinematic key art for a premium anime action game DEFEAT screen, wide 16:9, painterly hand-painted 2D, no characters, no text. A vast dark ruined sanctum at the edge of a collapsing dimensional fracture: a huge vertical rift of cold teal light cracking the air in the centre-right, shattered stone floor and broken pillars silhouetted, drifting embers and ash, a single faint beam of pale light falling from above onto an empty cracked ring sigil on the ground, heavy atmospheric fog, mostly deep navy-black with muted teal and dim ember orange accents, large calm dark areas on the left and right for UI, moody, melancholic but dignified.", ['public/ui/victory-key.webp']),
 'defeat-crest': ("An emblem for a defeat screen: a circular seal of dark iron and aged gold, hexagonal fracture lines splitting it diagonally, one half dimmed and desaturated, thin teal light leaking from the crack, a small broken star at the centre, ornate and premium, hand-painted game icon, front view, centred. Flat PURE BLACK (#000000) background, large black margin, no text, no letters, no watermark.", ['public/ui/victory-crest.png']),
}
def run(n):
    pr, rf = J[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(pr)
    cmd = ['python', 'scripts/gen-image.py', D, n]
    for r in rf: cmd += ['--img', r]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-120:]
if __name__ == '__main__':
    with cf.ThreadPoolExecutor(2) as ex:
        for r in ex.map(run, list(J)): print(r, flush=True)
