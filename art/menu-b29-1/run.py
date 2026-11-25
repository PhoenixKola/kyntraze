import subprocess, os, sys, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/menu-b29-1'; REF = 'public/art/nexus/bg.webp'
S = ("Premium anime sci-fantasy game environment art, painterly with crisp detail, same world and palette as the reference: dark midnight teal, antique brass and gold accents, elegant fractured ruins. "
     "Wide 16:9. No characters, no people, no text, no letters, no numbers, no logo, no UI, no frame, no watermark. Original design. The centre-left and the right edge keep calm, darker, uncluttered negative space so interface text can sit on them; the focal subject sits clearly off to one side or in the middle distance. ")
P = {
 'hero_chamber': S + "An illuminated HERO CHAMBER: a circular stone dais in the centre lit by a single warm shaft of golden light from a broken oculus above, drifting dust motes, four tall banners hung on carved pillars behind in muted gold, crimson, azure and violet, polished dark floor reflecting the light, a dark teal hall behind. Empty dais.",
 'observatory': S + "A dimensional MISSION OBSERVATORY: a round chamber open to a vast starry void, large floating concentric brass-and-teal astrolabe rings around an empty holographic map table made of fine light lines, distant fractured world fragments, instruments with soft amber lamps. Elegant, calm, cartographic.",
 'vault': S + "A RELIC VAULT: a vaulted stone chamber with brass-bound alcoves and display pedestals, a few empty glowing relic stands with warm amber light, subtle teal fracture cracks in the walls, rich warm gold light pools on dark stone, tidy and valuable-feeling.",
 'altar': S + "A CONTRACT ALTAR: a dark ritual stone altar with floating slowly-turning sigil rings of thin red-gold light above it, thin threads of crimson-gold energy, ominous but elegant, deep shadow with teal rim light, no skulls, no gore.",
 'library': S + "An ARCHIVE LIBRARY of memories: a towering circular stacks hall with endless shelves of old books and glowing glass memory shards floating between them, a soft teal and gold light from above, a long reading table in the middle distance, floating pages, dust motes.",
 'alliance': S + "An ALLIANCE CHAMBER for two heroes: a wide hall with two empty round summoning stations on the left and the right facing each other, joined by a faint ribbon of teal-gold light across the polished floor, a sealed dimensional gate glowing softly in the far centre, banners, warm welcoming lamps. The area between the stations is calm and open.",
 'modes': ("Pixel-art-friendly premium game emblem sheet: SEVEN distinct round medallion emblems, no text, no letters, on a PURE BLACK background (#000000), arranged in a 4 by 2 grid (the last cell empty), each about the same size, painterly crisp style in dark teal, brass and gold, each with its own colour accent and motif: (1) a classic fractured sun with a single sword, teal; (2) an endless looping spiral staircase of light, violet; (3) an exploring compass over a floating island realm, green-gold; (4) a great crowned boss skull-less mask sigil with chains, crimson; (5) a calendar-less sun-and-moon day dial, amber; (6) a week of seven small stars in an arc, blue; (7) a broken oath ring with a shattered blade, white-violet. Same style as the reference."),
}
def run(n):
    open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(P[n])
    r = subprocess.run(['python', 'scripts/gen-image.py', D, n, '--img', REF], capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-110:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, sys.argv[1:] or list(P)): print(r, flush=True)
