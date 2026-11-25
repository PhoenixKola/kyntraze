import subprocess, os, sys, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/menu-b29-1'
S = ("Premium anime sci-fantasy environment illustration of a game arena location, painterly with crisp detail, wide 16:9, a sweeping establishing view that shows the atmosphere and the hazard at a glance. "
     "Faithful to the reference image's palette, architecture and mood (it is the real in-game arena). No characters, no people, no text, no letters, no numbers, no logo, no UI, no watermark. Original. Calm darker negative space on the left edge for interface text. ")
P = {
 'arena_gloam': ('public/art/arenas/gloam/card.png', S + "THE GLOAM CIRCUIT: a powered machine-floor still running its last duty cycle, cold steel plates, teal circuitry, generator and reactor blocks, and wide lanes of teal current beginning to flood across the floor behind striped warning markings."),
 'arena_ashen': ('public/art/arenas/ashen/card.png', S + "THE ASHEN RELIQUARY: the burned sanctum of a forgotten order, drifting ash over old verdigris stone, heavy ruined pillars, several charged pylons, one of them glowing orange as a ring of energy discharges around it."),
 'arena_aetherfall': ('public/art/arenas/aetherfall/card.png', S + "THE AETHERFALL CITADEL: a ruined sky fortress over an open abyss, pale gold stone, broken standards and hanging masonry, marked floor sections cracking and pulsing gold before they discharge."),
 'arena_paradox': ('public/art/arenas/paradox/card.png', S + "THE PARADOX EXPANSE: a folded dimension of black-violet glass and mirrored relics, marked folds in the floor previewing an attack pattern and echoing it, uncanny reflections."),
}
def run(n):
    ref, pr = P[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(pr)
    r = subprocess.run(['python', 'scripts/gen-image.py', D, n, '--img', ref], capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-90:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, list(P)): print(r, flush=True)
