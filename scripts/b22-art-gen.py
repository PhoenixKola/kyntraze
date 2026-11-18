"""B22 art generator: writes prompts to art/b22/source and runs scripts/gen-image.py for each (skips existing PNGs). Usage: python scripts/b22-art-gen.py [group ...]"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, "art", "b22", "source")
os.makedirs(OUT, exist_ok=True)
STYLE = ("Original 2D game art for the action-survival game KYNTRAZE: FRACTURE RUSH, 'Shattered Horizons' expansion. Chunky pixel-art style: clean dark 3-4 px outline, cel-shaded two-tone shading, crisp hard edges, no soft gradients, no blur, readable at small size. "
  "Seen from a slightly raised three-quarter top-down angle, creature facing right (east). ")
KEY = " Single subject, ONE pose, centred with generous margin, fully inside the frame, on a flat pure green (#00ff00) background. No text, no labels, no ground shadow, no watermark. NO green colour anywhere in the subject itself."
SHEET = " Layout: a clean grid of separate icons on a flat pure green (#00ff00) background with wide green gutters, equal size, each icon fully inside its cell, no text, no labels, no grid lines, no watermark. NO green colour anywhere in the icons."
AF = "Aetherfall palette: ruined celestial citadel, warm ivory / sandstone / sun-gold with pale cream highlights. "
PX = "Paradox palette: folded-dimension void, deep indigo / violet with teal-cyan glass and crystal highlights. "
J = {}
def a(name, text, group): J[name] = (group, text)
# --- enemies
a("e_sky_lancer", STYLE + AF + 'ENEMY "Sky Lancer": a lean ruined celestial lancer in cracked ivory armour with a golden halo-shard crest, huge golden lance held forward, tattered pale cloth, hovering a little above ground. Small (about 60 px tall at final size).' + KEY, "enemies")
a("e_halo_scribe", STYLE + AF + 'ENEMY "Halo Scribe": a robed hovering scribe-spirit, hooded pale cloak, a broken golden halo floating above its head, one hand holding a glowing quill that drips light, floating glyph tablets. Small.' + KEY, "enemies")
a("e_citadel_bulwark", STYLE + AF + 'ENEMY "Citadel Bulwark": a heavy elite guardian, squat and wide, carrying a huge tower-shield of cracked sandstone and gold held in front of it, thick pauldrons, a small helmed head, glowing amber seams. LARGE, near-square silhouette.' + KEY, "enemies")
a("e_rift_mimic", STYLE + PX + 'ENEMY "Rift Mimic": a shapeless translucent teal glass doppelganger, vaguely humanoid, with two dark hollow eyes, rippling edges, a faint duplicate echo of itself offset behind it. Small.' + KEY, "enemies")
a("e_phase_harrier", STYLE + PX + 'ENEMY "Phase Harrier": a fast violet predator-bird made of folded shards, sleek arrowhead body, long trailing tail of afterimages, bright violet eye, sharp crystalline wings swept back. Small.' + KEY, "enemies")
a("e_singularity_husk", STYLE + PX + 'ENEMY "Singularity Husk": a hunched dark armoured husk with a black swirling sphere embedded in its chest, three thin violet orbit rings around the sphere, cracked indigo armour, hanging chains. Medium.' + KEY, "enemies")
# --- bosses
a("b_castellan", STYLE + AF + 'BOSS "The Crownless Castellan": a colossal ruined celestial guardian, broken crown-less head, huge cracked sandstone and gold plate armour, two giant gauntlets, a glowing amber core in the chest, floating shattered halo fragments, imposing and monumental. Boss scale, fills the frame.' + KEY, "bosses")
a("b_regent", STYLE + PX + 'BOSS "The Paradox Regent": a tall elegant monarch of folded space, split-diamond body of violet and teal crystal, floating crown of shards, long asymmetrical cloak that folds into itself like origami, glowing teal core. Boss scale.' + KEY, "bosses")
a("b_oathkeeper", STYLE + PX + 'BOSS "The Oathkeeper": a rival guardian knight of a broken order, dark indigo armour with violet trim, long pale-lilac blade held low, tattered order-banner cape, helmed faceless head with one glowing violet slit, stern duelist stance. Human-sized but menacing.' + KEY, "bosses")
a("b_mirror_tyrant", STYLE + PX + 'BOSS "The Mirror Tyrant": a crystalline commander made of mirrors, an upright diamond body, three floating curved mirror-shield panels orbiting in front like an arc of glass, ice-blue and silver, a cold white core. Boss scale.' + KEY, "bosses")
a("b_chronophage", STYLE + PX + 'BOSS "The Chronophage": a predator of time, a huge circular clock-face body of tarnished gold with roman-numeral tick marks, two long clock-hands like blades, hourglass-shaped jaws, trailing sand, dim amber glow. Boss scale.' + KEY, "bosses")
a("b_hollow_choir", STYLE + PX + 'BOSS CORE "The Hollow Choir silent core": a dark floating sphere of pale-lilac light inside several hollow ring-halos, a cracked mask-like face of silence with no mouth, soft violet glow. Boss scale.' + KEY, "bosses")
a("b_sovereign", STYLE + PX + 'FINAL BOSS "Sovereign of the Void": a vast void-monarch, a hovering colossal armoured torso of black-violet armour with pale-lilac trim, a radiant crown of seven blades, three concentric halo rings, a glowing white-lilac core in the chest, empty hands. Immense, fills the frame.' + KEY, "bosses")
# --- boss parts
a("p_choir_voices", STYLE + PX + 'Three separate small spectral constructs (the Choir voices) in one row on green, equal size: (1) a tall thin pale lilac PILLAR-lance construct with a glowing tip, (2) a wide fan-shaped CONE construct like an open pale-violet bell/horn, (3) a RING construct made of two concentric pale-lilac rings. Same palette, all hollow and ghostly. Flat pure green (#00ff00) background, wide green gutters, no text, no green in subjects.', "parts")
a("p_sovereign_parts", STYLE + PX + 'Three separate parts of the Sovereign of the Void in one row on green, equal size: (1) a triangular ANCHOR crystal obelisk with a glowing core, (2) a large armoured ARM/gauntlet slab with lilac trim, (3) an inverted-triangle crown HEAD mask in pale lilac. Flat pure green (#00ff00) background, wide green gutters, no text, no green in subjects.', "parts")
# --- hero portraits
HP = "Original 2D character portrait for KYNTRAZE: FRACTURE RUSH. Chunky pixel-art style, clean dark 3-4px outline, cel-shaded two-tone shading, crisp hard edges. "
a("v_vex_base", HP + "Hero VEX, the Fallen Vanguard: young exile with short dark hair and a violet scarf, torn dark-indigo vanguard coat with silver trim, a cracked order-crest on the chest, a short counter-blade held low, calm guarded stance, three-quarter view facing right, full body." + KEY, "heroes")
a("v_vex_riftbound", HP + "Hero VEX in RIFTBOUND form: same exile in torn indigo coat, now wreathed in violet rift energy, floating rift shards orbiting, glowing violet cracks across the coat and blade, three-quarter view facing right, full body." + KEY, "heroes")
a("v_vex_voidheart", HP + "Hero VEX in VOIDHEART EXILE form: same exile, armour reforged in black void-metal with pale-lilac trim, a glowing white-lilac void-heart in the chest, a broken halo of void shards behind the head, long dark cape, three-quarter view facing right, full body." + KEY, "heroes")
# --- arenas
a("a_aetherfall_floor", "Seamless top-down game floor texture tile, pixel-art style, no characters: ruined celestial citadel flagstones, large square cream and sandstone slabs with thin gold inlay seams, a few cracks, faint warm dust. Flat, evenly lit, tileable on all four edges, 1:1 square. No text, no border.", "arenas")
a("a_paradox_floor", "Seamless top-down game floor texture tile, pixel-art style, no characters: folded-dimension void floor, dark indigo glass tiles with teal-cyan fracture lines and faint violet reflections, some tiles slightly offset as if folded. Flat, evenly lit, tileable on all four edges, 1:1 square. No text, no border.", "arenas")
a("a_props", STYLE + 'Four separate environment props in a 2x2 grid on green, equal size: top row (Aetherfall, ivory-gold): a broken celestial pillar with a golden halo fragment, a cracked statue plinth with a shattered wing; bottom row (Paradox, indigo-teal): a tall floating violet crystal spire, a folded glass prism block. Flat pure green (#00ff00) background, wide gutters, no text, no green in props.', "arenas")
# --- icon sheets
a("i_relics", "Eight game item icons in a 4x2 grid, pixel-art style with dark outline, glowing: 1 Halo Prism (golden triangular prism refracting a spark), 2 Anchor of Dawn (golden anchor with a sunrise ring), 3 Crownless Sigil (broken crown sigil, cream and gold), 4 Skyforge Feather (a golden feather with an ember trail), 5 Void Hourglass (violet hourglass with frozen sand), 6 Echo Lens (teal glass lens with an echo ring), 7 Rift Key (a violet key shaped like a crack), 8 Paradox Compass (a compass with a folded needle, indigo-teal)." + SHEET, "icons")
a("i_ultimates", "Four game ultimate-ability icons in a 2x2 grid, pixel-art style, dark outline, glowing: 1 a golden kinetic crater-slam fist, 2 a crimson furnace crucible burst, 3 a blue constellation nova of linked stars, 4 a violet judgment blade falling through a rift." + SHEET, "icons")
a("i_legendaries", "Twelve game legendary-upgrade icons in a 4x3 grid, pixel-art style, dark outline, golden rim, glowing core, each a distinct emblem (orbiting orbs, a twin flower, a convergence ring, a starburst, a chain of lightning, a molten hammer, a shield of light, a spiral of sparks, a comet, a crescent blade, a halo crown, a void eye)." + SHEET, "icons")
a("i_branches_a", "Twelve game skill-branch icons in a 4x3 grid, pixel-art style, dark outline, each a small glowing emblem for an ascension branch: gold fist-shockwave, ember cone, chain arc, line-blast, orbiting spark ring, zone pulse, cross-slash, star-burst, wave crest, spiral arrow, anchor mark, flare." + SHEET, "icons")
a("i_branches_b", "Twelve game skill-branch icons in a 4x3 grid, pixel-art style, dark outline, violet and teal emblems: rift-slash, parry shield-crack, riposte spear, seal sigil, shift blink streak, mirrored blades, hourglass, orbiting rift shard, echo ring, folded arrow, void flame, judgment sword." + SHEET, "icons")
# --- outfits
OUT4 = "Four hero outfit concept cards in a 2x2 grid on green, each a full-body pixel-art character in a distinct costume, dark outline, cel shaded, three-quarter view facing right. Flat pure green (#00ff00) background, wide gutters, no text, no labels, no green in the characters. "
a("o_outfits_a", OUT4 + "Kai outfits: 1 Aether Vanguard (cream and gold ceremonial armour over his kinetic jacket), 2 Eclipse Runner (dark indigo stealth suit with gold trim). Ren outfits: 3 Dawnforged (golden-white furnace-smith armour with embers), 4 Cinder Monk (charred robes, crimson sashes, glowing ember prayer beads).", "outfits")
a("o_outfits_b", OUT4 + "Sora outfits: 1 Cartographer (blue coat with star-chart patterns and a compass), 2 Paradox Scholar (teal-violet robes with floating glass lenses). Vex outfits: 3 Order Exile (grey-silver torn vanguard coat with a broken crest), 4 Rift Herald (violet mantle with floating rift shards and a pale crown-shard).", "outfits")
if __name__ == "__main__":
    groups = set(sys.argv[1:]); todo = [n for n, (g, t) in J.items() if (not groups or g in groups) and not os.path.exists(os.path.join(OUT, n + ".png"))]
    for n in todo: open(os.path.join(OUT, n + "-prompt.txt"), "w", encoding="utf8").write(J[n][1])
    def run(n):
        r = None
        for attempt in range(2):
            r = subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "gen-image.py"), OUT, n], capture_output=True, text=True)
            if r.returncode == 0: print("OK", n, flush=True); return
        print("FAIL", n, r.stdout[-200:], r.stderr[-200:], flush=True)
    with ThreadPoolExecutor(3) as ex: list(ex.map(run, todo))
