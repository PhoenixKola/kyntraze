import subprocess, os, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/fractures'
R1 = 'public/art/arenas/gloam/props/generator.png'; R2 = 'public/art/arenas/ashen/props/pylon.png'; R3 = 'public/art/arenas/ashen/props/brazier.png'
BASE = ("Game world-prop sprite sheet for a premium anime action-roguelite, dark fractured sci-fi fantasy, seen from a 2D OVERHEAD three-quarter faux-depth camera (like the reference props: chunky painterly shapes, crisp clean edges, strong silhouette that stays readable at 90 pixels). "
        "PURE BLACK (#000000) background, every subject separated by generous pure-black margin so they can be cut out, no ground plane, no cast shadow, no scenery. "
        "Absolutely no text, no letters, no numbers, no logo, no watermark, no UI. Original design, glow is allowed only as part of the object itself.")
ARENA_LOOKS = ("Four arena variants in a 2 by 2 grid. TOP-LEFT The Gloam Circuit: cold steel, teal circuitry, cables and glass. TOP-RIGHT The Ashen Reliquary: charred stone, verdigris bronze, ember orange light. "
               "BOTTOM-LEFT Aetherfall Citadel: pale gold stone, white-gold light, feather and sky motifs. BOTTOM-RIGHT The Paradox Expanse: black-violet mirrored glass, teal-violet light, folded geometry. ")
J = {
 'portals': (BASE + " " + ARENA_LOOKS + "SUBJECT: a RIFT PORTAL on the floor, a flat elliptical ring portal seen from above-front with a stone or metal rim, an inner swirling energy vortex, small floating rim fragments. Each variant fills its own quadrant, the same size and framing, centred in its quadrant.", [R1, R2]),
 'shrines': (BASE + " " + ARENA_LOOKS + "SUBJECT: a CORRUPTED SHRINE ALTAR, a low stone or metal altar plinth with a hovering cracked crystal above it leaking dark red-violet corruption mixed with the arena's own light colour, offering a dangerous bargain. Each variant fills its own quadrant, same size and framing, centred.", [R1, R2]),
 'caches': (BASE + " " + ARENA_LOOKS + "SUBJECT: a FRACTURE CACHE, a large faceted energy crystal embedded in a small cracked floor base, glowing from inside, intact and sealed. Each variant fills its own quadrant, same size, centred.", [R2, R3]),
 'cache_states': (BASE + " THREE items in one horizontal row, left to right: a sealed faceted amber-teal energy crystal on a cracked base; the same crystal now covered in bright glowing cracks about to burst; the crystal SHATTERED into floating shards with a burst of light and the empty base. Same scale, centred in thirds.", [R2]),
 'relays': (BASE + " " + ARENA_LOOKS + "SUBJECT per quadrant, the same framing: an ENERGY RELAY tower, a short fat pylon with a glowing core orb held by prongs on a hexagonal base, in the arena's own materials. Make each variant clearly belong to its arena.", [R1, R2]),
 'beacons': (BASE + " " + ARENA_LOOKS + "SUBJECT per quadrant: a small floating ESCORT BEACON, a luminous energy orb in a slim gyroscopic cage with two thin ring bands, hovering slightly above a tiny shadowless base disc, in the arena's own materials and light colour.", [R3]),
 'echoes': (BASE + " FOUR items in a 2 by 2 grid, each a CIRCULAR RITUAL SIGIL seen from above on the floor: a glowing carved ring with a large central beast emblem. TOP-LEFT an eastern dragon coiling in a ring, molten gold and orange. TOP-RIGHT a fox with nine tails in a ring, crimson and gold. BOTTOM-LEFT a phoenix with spread wings in a ring, azure and white-blue crystal. BOTTOM-RIGHT a horned abyssal guardian beast in a ring, violet-black with silver lines. Each sigil fills its quadrant, same size, centred, glow part of the sigil.", [R3]),
 'emblems': (BASE + " SIX small round event EMBLEM icons in a 3 by 2 grid, each a bold simple glyph inside a dark round medallion with a bright rim that reads at 40 pixels: 1 a swirling portal ring (violet), 2 a cracked crystal shrine with two flames (red-violet), 3 a faceted crystal (amber), 4 a horned skull-crown elite mark (crimson), 5 a pylon with signal arcs (teal), 6 a stylised four-point star with a beast silhouette (white-gold). Equal size, evenly spaced.", None),
 'marks': (BASE + " SIX icons in a 3 by 2 grid. Top row: three ELITE MODIFIER crests, each a bold heraldic badge: SWIFT a winged blade with speed streaks (cyan), VOLATILE a cracked sphere about to burst (orange-red), WARDED a layered shield ring (gold-violet). Bottom row: three REWARD illustrations as shiny collectible items: a glowing floating rare relic shard (white-gold), a temporary boon flame orb (teal), a trophy crest with a gem (gold). Equal size, evenly spaced.", None),
 'banner': (BASE + " WIDE 3:1. ONE ornate HUD announcement plate: a long slim horizontal banner of dark steel and glass with fine fractured gold-teal trim, pointed end caps with small wing-like flourishes, completely EMPTY dark interior (pure black) where text will go. Symmetric, thin border, large empty centre.", None),
}
def run(n):
    pr, rf = J[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(pr)
    cmd = ['python', 'scripts/gen-image.py', D, n]
    for r in (rf or []): cmd += ['--img', r]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-120:]
if __name__ == '__main__':
    import sys
    names = sys.argv[1:] or list(J)
    with cf.ThreadPoolExecutor(4) as ex:
        for r in ex.map(run, names): print(r, flush=True)
