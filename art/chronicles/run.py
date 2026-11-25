import subprocess, os, glob, concurrent.futures as cf
from PIL import Image
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/chronicles'; R = D + '/refs'
def ref(src, name):
    out = f'{R}/{name}.png'
    if not os.path.exists(out): Image.open(src).convert('RGB').save(out)
    return out
H = {'kai': ref('public/ui/kai-keyart.webp', 'kai'), 'ren': ref('public/ui/heroes/ren-card.webp', 'ren'), 'sora': ref('public/ui/heroes/sora-card.webp', 'sora'), 'vex': ref('public/ui/heroes/vex-card.webp', 'vex')}
A = {a: ref(f'public/art/arenas/{a}/card.png', a) for a in ['gloam', 'ashen', 'aetherfall', 'paradox']}
KAI3 = ref('public/ui/kai-portrait-f3.png', 'kai_f3')
BASE = ("Premium anime action-RPG chapter key art, cinematic 16:9 widescreen composition, painterly with crisp detail, dark fractured sci-fantasy with teal fracture energy and warm gold accents, dramatic lighting, strong silhouette and clear focal point, calm darker space on the left third for interface text. "
        "Characters must match the reference images exactly (hair, clothing, proportions, colours). No text, no letters, no numbers, no logo, no watermark, no UI. Original.")
J = {
 'kai_1': ("KAI, CHAPTER ONE 'IGNITION DEBT': Kai sprints through a collapsing reactor hall of the Gloam Circuit, teal overload arcs tearing from the generators, a severed cable bleeding light behind him, guilt and urgency in his stance.", [H['kai'], A['gloam']]),
 'kai_2': ("KAI, CHAPTER TWO 'THE DRAGON'S WEIGHT': Kai stands among burnt pillars of the Ashen Reliquary, fists lowered, while a vast spectral solar dragon of molten gold coils protectively behind him; restraint, not rage.", [H['kai'], A['ashen']]),
 'kai_3': ("KAI, CHAPTER THREE 'STILLFIRE': Kai in his silver-white Stillfire Apex form hovers calmly above the cracked Aetherfall Citadel, a serene silver dragon haloing him, a crowned silhouette waiting far ahead.", [KAI3, A['aetherfall']]),
 'ren_1': ("REN, CHAPTER ONE 'CROSSED OATH': Ren holds a ruined ashen gate alone, bandaged fists raised, embers drifting, the silhouettes of wounded allies sheltering behind, shield-bearing enemies ahead.", [H['ren'], A['ashen']]),
 'ren_2': ("REN, CHAPTER TWO 'NINE TAILS': Ren in the Gloam Circuit with nine spectral crimson fox tails fanning out behind, surrounded by armoured shield-bearers, loyalty tested.", [H['ren'], A['gloam']]),
 'ren_3': ("REN, CHAPTER THREE 'THE PRICE OF ASCENSION': Ren in his Crimson Ascendant form faces a dark mirrored reflection of himself in the folded glass of the Paradox Expanse, strength against restraint.", [H['ren'], A['paradox']]),
 'sora_1': ("SORA, CHAPTER ONE 'ZERO HORIZON': Sora stands on a broken bridge of the Aetherfall Citadel, drawing a precise fan of azure light needles across a rain of enemy fire; perfect focus.", [H['sora'], A['aetherfall']]),
 'sora_2': ("SORA, CHAPTER TWO 'TRUST FALL': Sora falls backward with arms open through mirrored folds of the Paradox Expanse, drifting azure feathers, trust over control.", [H['sora'], A['paradox']]),
 'sora_3': ("SORA, CHAPTER THREE 'AZURE SOVEREIGN': Sora with great astral phoenix wings of blue crystal spread over the Aetherfall Citadel, a hollow choir of silhouettes below; sacrifice and resolve.", [H['sora'], A['aetherfall']]),
 'finale': ("FINALE 'THE UNBROKEN LINE': Kai, Ren, Sora and Vex stand together, side by side, before a colossal severed line of luminous threads hanging in the void above the Nexus rift gate, their four bonded beasts (gold dragon, crimson fox, azure phoenix, violet guardian) as faint shapes behind them.", [H['kai'], H['ren'], H['sora'], H['vex'], 'public/art/nexus/bg.webp']),
}
def run(n):
    desc, refs = J[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(BASE + ' ' + desc)
    cmd = ['python', 'scripts/gen-image.py', D, n]
    for r in refs:
        if r.endswith('.webp'): r = ref(r, 'nexusbg')
        cmd += ['--img', r]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-100:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, list(J)): print(r, flush=True)
