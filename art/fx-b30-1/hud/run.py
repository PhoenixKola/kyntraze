import subprocess, os, glob, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/fx-b30-1/hud'
BASE = ("Premium anime action-roguelite game UI ornament asset on a PURE BLACK (#000000) background, dark fractured sci-fi fantasy, crisp painterly pixel-friendly detail, strong readable silhouette that survives at 60 pixels tall. "
        "Absolutely no text, no letters, no numbers, no logo, no watermark, no UI mockup, no extra objects, no cast shadow, no ground. Original design. Single subject centred with generous black margin.")
def beast(desc, ref):
    return (BASE + " WIDE 3:1 composition. A miniature ornamental beast designed to coil around the OUTSIDE of a horizontal ability bar: body drawn as one long shallow arching ribbon from the tail at the far left to the head raised at the far right facing right, head, neck, body and tail clearly separated shapes, simplified anatomy so it reads at small scale. " + desc, ref)
def frame(mat):
    return (BASE + " SQUARE 1:1. A straight-on symmetric ability-tile frame: a slim bevelled border with small corner ornaments, material: " + mat + ". The ENTIRE interior window is empty and filled with pure black #000000 so it can be cut out; the border is thin (about 8 percent of the width) so the icon space stays large.", None)
def ring(mat):
    return (BASE + " SQUARE 1:1. A circular hero crest medallion ring seen straight-on: an ornate round ring with four small studs, material: " + mat + ". The inside of the ring is empty and pure black #000000 so it can be cut out. Thin ring, large empty centre.", None)
def ref(p):
    g = sorted(glob.glob(p)); return g[0] if g else None
J = {
 'beast_flare': beast("A fiery eastern dragon of molten gold and orange, slow rising solar ribbons trailing from the tail, ember whiskers.", ref('public/art/fx/kai-o/flare_dragon0.png')),
 'beast_comet': beast("A sharp aggressive lightning dragon of gold plating with branching white-gold lightning whiskers, angular jaw, crackling tail.", ref('public/art/fx/kai-o/comet_dragon0.png')),
 'beast_still': beast("A serene celestial dragon of silver-white etched glass, flowing whiskers, crescent-shaped tail, calm pale blue-white glow, no fire.", ref('public/art/fx/kai-o/still_dragon0.png')),
 'beast_fox': beast("A crimson nine-tailed fox: fox head with pointed ears at the right, a fan of nine flowing scarlet tails forming the left half, molten runes on the body, heavy and powerful.", ref('public/art/fx/ren-fox/body0.png')),
 'beast_phoenix': beast("An azure crystalline astral phoenix: head at the right, wings half-spread above the ribbon as clean feather blades, long crystalline tail feathers at the left, blue-white glow.", ref('public/art/fx/sora-phoenix/*0.png')),
 'beast_guard1': beast("A violet-black abyssal guardian beast (Riftbound): armoured serpentine guardian with a horned head and one clawed forearm, broken violet portal arcs, angular plates.", ref('public/art/fx/vex-guardian/*0.png')),
 'beast_guard2': beast("An evolved dark-silver abyssal guardian beast (Voidheart Exile): elegant segmented dark silver armour with black-violet dimensional fragments floating apart, crowned horned head, void glow.", ref('public/art/fx/vex-guardian/*0.png')),
 'frame_kai': frame("dark steel with restrained amber kinetic strokes and a tiny comet spark at the top-left corner"),
 'frame_ren': frame("forged crimson-black steel with heavy riveted corners and ember accents"),
 'frame_sora': frame("blue crystalline steel with faceted azure crystal corners and fine light lines"),
 'frame_vex': frame("obsidian with etched violet edges, offset shadow plates and a thin silver rune line"),
 'ring_kai': ring("dark steel and gold with a tiny comet crest at the top"),
 'ring_ren': ring("crimson forged metal with small flame studs"),
 'ring_sora': ring("azure crystal with faceted blue studs"),
 'ring_vex': ring("obsidian and violet with silver fracture lines"),
 'pause_crest': (BASE + " SQUARE 1:1. A hexagonal command crest: dark steel hexagon with teal fracture-light cracks and thin gold trim, an empty black centre, small wing-like flourishes left and right.", None),
}
def run(n):
    pr, rf = J[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(pr)
    cmd = ['python', 'scripts/gen-image.py', D, n] + (['--img', rf] if rf else [])
    r = subprocess.run(cmd, capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-90:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, list(J)): print(r, flush=True)
