"""B28 sheet definitions (Vex: Riftbound + Voidheart Exile, two Abyssal Guardian looks): name -> (theme, sprite count, description). Prompts are generated from these so alternatives can be re-run (suffix @2 -> _v2). Themes: R = Riftbound (fractured violet), V = Voidheart Exile (graphite and silver, ultraviolet seams)."""
BASE = ("Pixel-art game VFX in the chunky crisp pixel style of the reference image (visible pixels, hard edges, limited palette, no smooth airbrush gradients, no painterly blur). "
        "PURE BLACK background (#000000) everywhere, no ground plane, no character, no text, no frame, no border, no watermark. Original design. Additive-blend friendly: glows are bright shapes on black. ")
THEME = {
  'R': "Theme: RIFTBOUND, a fallen guardian's fractured dimensional power in deep VIOLET and indigo with magenta-violet highlights and white-violet edge lines, jagged angular shards, sharp broken geometry. Palette strictly: indigo, violet, magenta-violet, white-violet highlight; no red, no orange, no gold, no green, no cyan. ",
  'V': "Theme: VOIDHEART EXILE, calm oppressive mastery of space in GRAPHITE, dark slate and SILVER-WHITE with thin subtle ULTRAVIOLET seams, elegant smooth geometry, quiet and refined, not noisy. Palette strictly: graphite, slate, silver-white highlight, thin violet seams; no red, no orange, no gold, no green, no saturated blue. ",
}
GR = "an original spectral ARMORED GUARDIAN (a tall armored humanoid made of translucent spectral plates, NOT an animal, NOT a dragon, NOT a fox, NOT copied from any existing artwork, not a samurai ghost)"
GRR = GR + ": fractured violet armor, a sharp narrow visor helm with a jagged crest, strong clawed gauntlets, layered broken shoulder plates with a jagged opaque edge, aggressive forward lean"
GRV = GR + ": towering and ethereal graphite and silver armor, a smooth faceless helm with glowing white rim and white eyes, a long levitating mantle, separate floating armor plates, graceful slender spectral forearms, subtle ultraviolet seams, composed and calm"
def S(t, n, d): return (t, n, d)
SHEETS = {
 # ---- Guardians (two coordinated sets)
 'g1_concept': S('R', 1, f"ONE single large sprite: {GRR}, the whole figure in a heroic crouched-forward pose seen from the side facing RIGHT, translucent spectral look, as a fighter-wrapping aura. Concept sheet."),
 'g2_concept': S('V', 1, f"ONE single large sprite: {GRV}, the whole figure standing calmly seen from the side facing RIGHT, mantle drifting, plates orbiting, translucent spectral look, as a fighter-wrapping aura. Concept sheet."),
 'g1_head': S('R', 4, f"Each is ONLY the HEAD and neck of {GRR} (no body) in profile facing RIGHT. Four variants: calm, visor flaring, roaring with the helm split open, lunging forward."),
 'g2_head': S('V', 4, f"Each is ONLY the HEAD and neck of {GRV} (no body) in profile facing RIGHT. Four variants: calm, eyes glowing brighter, rim flaring, tilted down in judgment."),
 'g1_front': S('R', 4, f"Each is ONLY the HEAD and shoulders of {GRR} seen from the FRONT, symmetrical. Four variants: calm, visor flaring, arms raised, glaring."),
 'g2_front': S('V', 4, f"Each is ONLY the HEAD and shoulders of {GRV} seen from the FRONT, symmetrical. Four variants: calm, eyes brighter, hands raised, tilted."),
 'g1_back': S('R', 4, f"Each is ONLY the BACK of the helm, shoulders and spine plates of {GRR} seen from BEHIND. Four variants of the same, plates shifting."),
 'g2_back': S('V', 4, f"Each is ONLY the BACK of the helm and the long mantle of {GRV} seen from BEHIND. Four variants of the same, mantle drifting."),
 'g1_torso': S('R', 4, f"Each is the TORSO and layered shoulder plates of {GRR} seen from the side facing RIGHT, no head, no arms: four variants, shoulders rising, shoulders hunched, chest plate opening, plates snapping shut."),
 'g2_torso': S('V', 4, f"Each is the TORSO and long mantle of {GRV} seen from the side facing RIGHT, no head, no arms: four variants of the mantle drifting and plates floating apart."),
 'g1_arm': S('R', 4, f"Each is one spectral ARM of {GRR}: upper arm, forearm and a large clawed gauntlet, striking to the RIGHT. Four frames: raised back, swinging, full-extension slash with claws, recoil."),
 'g2_arm': S('V', 4, f"Each is one graceful spectral ARM of {GRV}: slender forearm and open hand, gesturing to the RIGHT. Four frames: raised, palm opening, a precise slicing gesture, settling."),
 'g1_plates': S('R', 4, f"Each is a set of loose broken ARMOR PLATES (shoulder, mantle shards) of {GRR} drifting, seen from the side. Four loop frames."),
 'g2_plates': S('V', 4, f"Each is a set of separate floating ARMOR PLATES and mantle ribbons of {GRV} orbiting an empty centre, seen from the side. Four loop frames."),
 'g1_activation': S('R', 4, f"Each is the materialisation of {GRR} around a standing figure with a violet crack roar: shards gathering, silhouette forming, armor snapping on in a burst, settle."),
 'g2_activation': S('V', 4, f"Each is the SILENT materialisation of {GRV} around a standing figure: plates fading in one by one, the mantle unfurling, a silver rim igniting, settle."),
 'g1_dissolve': S('R', 4, f"Each is {GRR} dissolving into drifting violet shards, from mostly solid to almost only shards. Four frames."),
 'g2_dissolve': S('V', 4, f"Each is {GRV} dissolving into slow drifting silver fragments, from mostly solid to almost only fragments. Four frames."),
 # ---- Riftbound FX
 'r_slash': S('R', 4, "Each is a violet spectral BLADE SLASH arc: a sharp crescent cut with a white-violet edge and a dark core, tapered at both ends. Four variants: near-side arc, far-side arc, crossing X cut, wide curved finishing sweep."),
 'r_mirror': S('R', 4, "Each is a reflective MIRROR GUARD panel: a tall violet-silver arc-shaped panel with a glassy reflection and thin cracks. Four frames: forming, solid, struck with a flash, shattering."),
 'r_echo': S('R', 4, "Each is a spectral ECHO STRIKE: a ghostly violet silhouette of a swordsman mid-slash, translucent, with a trailing cut line. Four variants of the pose, fading."),
 'r_portal': S('R', 4, "Each is a violet PORTAL seen on the ground and upright: an elliptical rift with a bright rim and a dark interior, jagged edges. Four frames: opening, wide open, swirling, closing."),
 'r_crack': S('R', 4, "Each is a violet dimensional FRACTURE: a jagged crack line in space with sharp shards and a glow. Four frames: hairline, widening, wide open, collapsing."),
 'r_seal': S('R', 4, "Each is a ground SEAL seen in perspective as a squashed ellipse (3:1): a violet glyph circle breaking open into a fracture pillar. Four frames: faint warning glyph, glowing and cracking, eruption pillar of shards, fading."),
 'r_pillar': S('R', 4, "Each is a violet FRACTURE PILLAR erupting from the ground, seen from the front at a low angle: a column of jagged shards and light. Four frames: forming, full, breaking, fading."),
 'r_fang': S('R', 4, "Each is an energy BLADE forged along a forearm: a long violet-silver blade with a bright edge, pointing RIGHT. Four stages of length: short, medium, long, overcharged with a fracture glow."),
 'r_fangcut': S('R', 4, "Each is a long diagonal SLASH silhouette with a fracture line and shards, pointing RIGHT, violet with a white edge. Four frames in sequence: cut appearing, full, fracturing, fading."),
 'r_impact': S('R', 4, "Each is a violet IMPACT burst: sharp radial shards and a white-violet core, no fire. Four frames in sequence: flash, burst, spreading, fading."),
 # ---- Voidheart FX
 'v_cut': S('V', 4, "Each is a precise DIMENSIONAL CUT: a thin straight or angular silver line in space with a hair-thin dark gap and a small spark at each end. Four variants: single diagonal cut, angular zigzag cut, two crossing cuts, a fan of four cuts."),
 'v_clone': S('V', 4, "Each is a graphite-and-silver SPECTRAL COPY emerging: a translucent humanoid silhouette formed of thin silver lines, dissolving at the edges. Four frames: emerging from a crack, solid, cutting, dissolving."),
 'v_seam': S('V', 4, "Each is a long horizontal SPATIAL SEAM strip pointing RIGHT: a thin dark-silver line of torn space with a bright silver rim and a few small shards, with a tapered start and end. Four frames: hairline, opening, fully open, closing."),
 'v_shard': S('V', 4, "Each is a burst of silver SHARDS collapsing INWARD to a centre line then a reconnect flash: elegant silver fragments with ultraviolet edges. Four frames in sequence: shards scattered, converging, meeting, flash."),
 'v_ring': S('V', 4, "Each is a refined black-and-silver DOMAIN RING seen in perspective as a squashed ellipse (3:1): a thin silver ring with fine fracture lines and a faint dark interior fading to nothing at the centre. Four frames: forming, steady, steady with pulse, dissolving."),
 'v_blade': S('V', 4, "Each is a long thin spectral silver BLADE striking DOWN from above, seen from the side with the point at the bottom: a faceted silver blade with a white edge and faint violet seams. Four frames: appearing, descending, striking, fading."),
 'v_core': S('V', 4, "Each is a small dark CORE held between two hands (no hands drawn): a black sphere inside a bright rotating silver-violet rim with floating shards bending inward. Four stages: small, medium, large, overcharged with a double rim."),
 'v_implode': S('V', 4, "Each is a black-hole IMPLOSION seen from the front: shards and light lines streaming INTO a dark centre ringed by a bright silver rim. Four frames of growing intensity."),
 'v_erupt': S('V', 4, "Each is a silver-violet ERUPTION: a bright silver-white core with a clean expanding ring and radial thin rays, elegant, no fire. Four frames in sequence: ignition, full, spreading, dissipating."),
 # ---- Voidheart reveal
 'v_reveal_crack': S('V', 4, "Each is a large DIMENSIONAL CRACK panel: a tall jagged tear in the air with a silver rim and darkness inside, with small fragments hanging in place. Four frames: hairline cracks, opening, wide open, closing."),
 'v_reveal_halo': S('V', 4, "Each is a ring of floating HALO FRAGMENTS: broken silver arcs and shards arranged in a circle seen in perspective, slowly rotating. Four frames: scattered, gathering, nearly closed, closed into a fractured shadow-ring."),
 'v_reveal_flash': S('V', 4, "Each is a refined silver-violet PRESSURE PULSE: a thin clean expanding ring with a soft white core and radial fine lines, quiet and elegant, no fire. Four frames in sequence."),
 'v_reveal_hair': S('V', 4, "Each is long flowing SILVER hair strands lifted weightlessly by an invisible force, drifting upward, with a few tiny sparkles. Four loop frames."),
 # ---- shared presence
 'r_ground': S('R', 4, "Each is a flat GROUND RING seen in perspective as a wide squashed ellipse (3:1): a thin violet ring with fracture lines and a few shards, expanding. Four frames."),
 'v_ground': S('V', 4, "Each is a flat GROUND RING seen in perspective as a wide squashed ellipse (3:1): a thin silver ring with fine seams and a few floating fragments, expanding. Four frames."),
 'r_wisp': S('R', 4, "Each is a small body-bound violet SHARD WISP: a short tapered jagged lick of violet energy about the size of a forearm, flickering, with a white-violet core. Four animation frames of the same wisp, rising."),
 'v_wisp': S('V', 4, "Each is a small body-bound silver FRAGMENT RIBBON: a short thin tapered silver ribbon with a few tiny fragments, about the size of a forearm, drifting. Four animation frames."),
 'v_frag': S('V', 4, "Each is a tiny cluster of floating silver FRAGMENTS and dust, like broken glass hanging in the air. Four variants."),
 'r_fly': S('R', 4, "Each is a forceful violet PROPULSION burst streaming DOWN and BACK from a flying figure: a fanned jagged plume of violet shards. Four loop frames."),
 'v_fly': S('V', 4, "Each is a restrained silver SPATIAL TRAIL streaming back from a gliding figure: a few thin silver-violet ribbons and fragments, elegant. Four loop frames."),
 'icons_r': S('R', 6, "Each is a square game ICON on black in a bold readable pixel style with a thick bright outline, one per skill, in order left to right and top to bottom: 1) a mirror panel with a crack (mirror guard), 2) a portal with a slash through it (rift execution), 3) a ground seal circle breaking with a pillar (oath of ruin), 4) a long violet blade (abyssal fang), 5) an armored visor helm (guardian), 6) a crossing blade slash (phantom edge)."),
 'icons_v': S('V', 6, "Each is a square game ICON on black in a bold readable pixel style with a thick bright outline, one per skill, in order left to right and top to bottom: 1) three spectral humanoid silhouettes (legion), 2) a thin silver cut line in space with torn edges (severance), 3) a silver ring with fractures (domain), 4) a black sphere with a bright rim between two small hands (event horizon), 5) a smooth faceless helm with glowing white eyes (guardian), 6) an open hand with a precise cut line (judgment)."),
}
def prompt(name):
    th, n, d = SHEETS[name]
    lay = "Sheet with exactly ONE sprite, centred." if n == 1 else ("Sheet with exactly SIX separate sprites in a grid, evenly spaced, separated by wide black gaps." if n == 6 else "Sheet with exactly FOUR separate sprites in one row, evenly spaced, separated by wide black gaps (no sprite touching another or the sheet edge).")
    return BASE + THEME[th] + lay + " " + d
