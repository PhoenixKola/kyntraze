import subprocess, os, sys, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/fx-nexus'; REF = 'public/ui/kai-keyart.webp'
STYLE = ("Premium anime sci-fantasy game art, painterly with crisp detail, dark midnight blue palette, teal and cyan fracture energy with small gold and orange accent lights, elegant ruined architecture, calm powerful mood, soft volumetric glow. "
         "No characters, no people, no text, no logo, no UI, no border, no watermark. Original design. ")
P = {
 'bg': STYLE + "A wide 16:9 backdrop of FRACTURE NEXUS: a colossal dimensional sanctuary hall seen from inside, a vast dark cavernous space with huge broken gothic-sci-fi arches and colonnades receding into misty depth, distant floating ruined platforms and shattered towers drifting in a deep midnight-blue void sky with faint stars, thin teal fracture cracks of light in the far architecture, a soft glow on the horizon. The lower third is a calm dark reflective stone floor with faint teal seams, kept uncluttered for UI. Centre kept open and slightly darker for a focal gate. Dark enough that bright UI text stays readable.",
 'mid': STYLE + "A wide 16:9 sheet of floating broken platforms, shattered stone pillars, hanging chains and ruined arch fragments drifting at different sizes, with thin glowing teal cracks and a few warm gold lamps on them, ALL on a PURE BLACK background (#000000) so it can be screen-blended over another image. Sparse: leave the centre and the bottom third empty black. No ground plane.",
 'gate': STYLE + "A single tall RIFT GATE / fracture core as the focal altar of the sanctuary: a large upright ring-shaped gate of dark carved stone and metal with glowing teal-cyan dimensional fracture light inside it, jagged cracks radiating outward, floating stone shards orbiting, gold-orange accent runes along the frame, a round stepped altar base. Centred, symmetrical, vertical (portrait orientation 3:4), on a PURE BLACK background (#000000) so it can be screen-blended. No floor beyond the altar base.",
 'plinth': STYLE + "A horizontal row of FOUR distinct hero shrine plinths / summoning pads, evenly spaced side by side, each a low round stepped stone-and-metal podium with a glowing sigil ring on top and a faint upward light beam, each with its own accent colour: first FLAME ORANGE and gold, second CRIMSON red, third AZURE blue and white, fourth VIOLET and silver. Seen from a slight three-quarter top-down angle, all the same size and level, on a PURE BLACK background (#000000), nothing else, wide 16:9 sheet.",
}
P.update({
 'swirl': STYLE + "A single circular dimensional VORTEX seen straight on, centred: layered spiral arms of luminous teal-cyan energy swirling into a bright white-cyan core, thin gold-orange filaments, wispy smoke-like curls, radially symmetric and soft-edged so it fades to black at the rim (nothing touches the image edge), on a PURE BLACK background (#000000), square 1:1, to be screen-blended and rotated.",
 'rays': STYLE + "Soft volumetric GOD-RAYS: a fan of long diagonal teal-cyan light shafts with faint gold highlights and drifting dust, widening downward from a bright point at the top centre, very soft edges, on a PURE BLACK background (#000000), wide 16:9, to be screen-blended. No objects, no ground.",
 'shards': STYLE + "A sheet of eight separate floating crystal-stone SHARDS and broken carved rune fragments of different shapes and sizes, spaced widely apart in a 4x2 arrangement, each with glowing teal fracture edges and tiny gold rune accents, each fully separated by empty black, on a PURE BLACK background (#000000), wide 16:9.",
})
def run(n):
    open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(P[n])
    r = subprocess.run(['python', 'scripts/gen-image.py', D, n, '--img', REF], capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-120:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, sys.argv[1:] or list(P)): print(r, flush=True)
