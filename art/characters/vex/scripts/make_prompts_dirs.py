"""Ren NORTH/EAST/WEST part-sheet prompts + generation. python make_prompts_dirs.py north east west [--gen]"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); VEX = os.path.dirname(HERE); ART = os.path.dirname(os.path.dirname(VEX)); REPO = os.path.dirname(ART)
KAIO = os.path.join(ART, "art", "characters", "kai", "base", "production-other-directions-candidate") if False else os.path.join(REPO, "art", "characters", "kai", "base", "production-other-directions-candidate")

STYLE = ("Parts sheet for a 2D cutout (paper-doll) game rig, pixel art. Attached images: (1) REN's approved pixel-art turnaround (identity: south three-quarter on the left, east profile facing right in the middle, north back view on the right); "
 "(2) REN's finished SOUTH parts sheet, showing his pieces at the exact pixel scale, chunky pixel-block size, palette and outline weight to match; (3) KAI's equivalent {DIR} parts sheet, which defines the REQUIRED piece order, layout, piece sizes, view angle and pixel-block size (one art pixel = one clear 10x10 block). "
 "Draw the equivalent pieces of REN for the {DIR} view in the same sizes and positions as the Kai sheet, but in REN's costume: a heavy brawler with wild dark brown-black hair and a scar on the cheek, a black SLEEVELESS coat-vest with crimson trim and a high crimson-lined collar, bare muscular tan arms, bulky black-and-crimson gauntlets with crimson straps over black fingerless gloves, a black belt with silver buckle and a RED sash, baggy black cargo trousers with a red side stripe, heavy black laced combat boots with red soles. Do NOT copy Kai's colours or costume. "
 "Thin dark outlines, 3-4 tone cel shading with light from the upper left, limited palette, no anti-aliasing, no gradients, no sub-pixel noise. Same slightly-from-above game camera. {FACING}\n\n"
 "CONSTRUCTION: every piece is COMPLETE as if nothing were in front of it and hangs straight down, drawn foreshortened, short and chunky exactly like the SOUTH pieces. Draw ONLY the pieces listed, each isolated on flat solid magenta #ff00ff, far apart, nothing overlapping or cropped, wide 16:9. Sizes are in art pixels and match the Kai sheet; do not draw larger.\n\n")
TAIL = "\nBig chunky pixel blocks, NO finer detail. Flat solid magenta background. No full character, no text, no labels, no watermark.\n"
FACING = {"EAST": "Ren faces screen RIGHT and is seen from his right side. His near arm and fist lead.",
          "WEST": "Ren faces screen LEFT and is seen from his left side (the mirror situation of the east view, drawn as its own view): the near arm and fist lead.",
          "NORTH": "Ren is seen from BEHIND (back to the camera): the back of his head with wild dark hair, the plain back of the black coat-vest with its crimson trim and the high collar seen from behind (no front details at all), the sash knotted behind with two red tails."}


def sheets(d):
    n = d == "north"; pt = "RIGHT" if d == "east" else "LEFT"
    head = {"east": "HEAD: full head in PROFILE facing right: wild dark hair swept back with a few rough spikes, ear, fierce eye and brow, nose, scar, small closed stern mouth, jaw, short neck stub below. 48 wide, 50 tall.",
            "west": "HEAD: full head in PROFILE facing left: wild dark hair swept back with a few rough spikes, ear, fierce eye and brow, nose, scar, small closed stern mouth, jaw, short neck stub below. 48 wide, 50 tall.",
            "north": "HEAD: the head seen from BEHIND: the wild dark hair mass with rough spikes and highlights, the nape and a short neck stub, a hint of the ears, NO face. 48 wide, 50 tall."}[d]
    side = f"SIDE FIST: a clenched fist in a black fingerless glove seen from the side with its knuckles pointing {pt}, with a stub of bulky crimson-black gauntlet at the opposite end, drawn horizontally. 30 wide, 20 tall."
    guard = {"east": "GUARD FIST: a raised clenched gloved fist seen from the side, fist on top, a stub of gauntlet below, drawn upright. 22 wide, 28 tall.",
             "west": "GUARD FIST: a raised clenched gloved fist seen from the side, fist on top, a stub of gauntlet below, drawn upright. 22 wide, 28 tall.",
             "north": "GUARD FIST: a raised clenched gloved fist seen from BEHIND: the back of the glove and knuckle tops, fist on top, a stub of gauntlet below, drawn upright. 22 wide, 28 tall."}[d]
    s1 = "Draw ONLY these 3 pieces:\n1. " + head + "\n2. " + side + "\n3. " + guard + "\n"
    torso = {"east": "TORSO: the sleeveless black coat-vest body in PROFILE facing right, open front edge with crimson trim and the high collar on the right, black undershirt at the front, the back on the left, belt at the bottom, NO sleeves and NO arms, plain rounded shoulder stump. 38 wide, 46 tall.",
             "west": "TORSO: the sleeveless black coat-vest body in PROFILE facing left, open front edge with crimson trim and the high collar on the left, black undershirt at the front, the back on the right, belt at the bottom, NO sleeves and NO arms, plain rounded shoulder stump. 38 wide, 46 tall.",
             "north": "TORSO: the sleeveless black coat-vest seen from BEHIND: a plain back with a crimson inlay pattern, the tall folded collar at the top, crimson trim only along the hem and armholes, belt at the bottom, NO sleeves and NO arms, plain rounded shoulder stumps. 48 wide, 46 tall."}[d]
    nm = lambda a, b: (a if not n else b)
    ua_n = f"{nm('NEAR', 'LEFT-ARM (screen left)')} UPPER ARM: a bare, thick, muscular tan upper arm with a diagonal red scar, round shoulder cap on top, rounded elbow end, hanging straight down, no sleeve. 26 wide, 27 tall."
    ua_f = f"{nm('FAR', 'RIGHT-ARM (screen right)')} UPPER ARM: the same, slightly narrower. 23 wide, 25 tall."
    fa_n = f"{nm('NEAR', 'LEFT-ARM (screen left)')} FOREARM: at the top a flared bulky black-and-crimson gauntlet collar with a crimson strap ring (about 21 wide, 10 tall) from which a thick black armoured gauntlet extends down to a clean wrist opening. 20 wide below, 33 tall in total."
    fa_f = f"{nm('FAR', 'RIGHT-ARM (screen right)')} FOREARM: the same, 19 wide at the collar, 17 below, 31 tall in total."
    s2 = "Draw ONLY these 5 pieces:\n1. " + torso + "\n2. " + ua_n + "\n3. " + ua_f + "\n4. " + fa_n + "\n5. " + fa_f + "\n"
    hips = {"east": "HIP BLOCK: baggy black cargo trouser hip and seat in PROFILE, one piece, flat straight TOP edge, plain inverted-V bottom, a few diagonal folds, a red stripe. 40 wide, 25 tall.",
            "west": "HIP BLOCK: baggy black cargo trouser hip and seat in PROFILE, one piece, flat straight TOP edge, plain inverted-V bottom, a few diagonal folds, a red stripe. 40 wide, 25 tall.",
            "north": "HIP BLOCK: baggy black cargo trouser hip and seat seen from BEHIND, one broad piece, flat straight TOP edge, plain wide inverted-V bottom, no round buttocks, folds and a red stripe. 52 wide, 25 tall."}[d]
    band = {"east": "SASH BAND: Ren's black belt with a silver buckle and the red sash wrapped over it, in PROFILE, knot at the front (right) side, no tails. 34 wide, 15 tall.",
            "west": "SASH BAND: Ren's black belt with a silver buckle and the red sash wrapped over it, in PROFILE, knot at the front (left) side, no tails. 34 wide, 15 tall.",
            "north": "SASH BAND: Ren's black belt and the red sash wrapped around the waist seen from BEHIND, a plain band with the knot at the centre back, no buckle, no tails. 42 wide, 15 tall."}[d]
    tails = "SASH TAILS: the two red cloth tails that hang down from the knot, one longer, overlapping slightly. 18 wide, 28 tall."
    th_n = f"{nm('NEAR', 'LEFT-LEG (screen left)')} THIGH: very baggy black cargo trouser leg hip to knee, voluminous with diagonal folds and a red side stripe, flat/open top end, gathers in at the knee. 34 wide, 46 tall."
    th_f = f"{nm('FAR', 'RIGHT-LEG (screen right)')} THIGH: the same, slightly narrower. 30 wide, 43 tall."
    s3 = "Draw ONLY these 5 pieces:\n1. " + hips + "\n2. " + band + "\n3. " + tails + "\n4. " + th_n + "\n5. " + th_f + "\n"
    shn = f"{nm('NEAR', 'LEFT-LEG (screen left)')} SHIN: squat baggy black trouser lower leg with a heavy buckled strap above the gathered hem, rounded top end (knee). 26 wide, 22 tall."
    shf = f"{nm('FAR', 'RIGHT-LEG (screen right)')} SHIN: the same, 23 wide, 21 tall."
    boots = {"east": ("NEAR BOOT: one solid heavy black laced combat boot with a thick RED sole in PROFILE, toe pointing right. 24 wide, 26 tall.", "FAR BOOT: the same boot in profile, toe pointing right. 24 wide, 26 tall."),
             "west": ("NEAR BOOT: one solid heavy black laced combat boot with a thick RED sole in PROFILE, toe pointing left. 24 wide, 26 tall.", "FAR BOOT: the same boot in profile, toe pointing left. 24 wide, 26 tall."),
             "north": ("LEFT BOOT (screen left): one heavy black combat boot seen from BEHIND, showing the heel and back of the shaft with its strap and the thick red sole. 22 wide, 26 tall.", "RIGHT BOOT (screen right): the same boot from behind. 22 wide, 26 tall.")}[d]
    s4 = "Draw ONLY these 4 pieces:\n1. " + shn + "\n2. " + shf + "\n3. " + boots[0] + "\n4. " + boots[1] + "\n"
    return {"s1": s1, "s2": s2, "s3": s3, "s4": s4}


if __name__ == "__main__":
    dirs = [a for a in sys.argv[1:] if not a.startswith("--")]
    kd = {"s1": "s1-heads-fists", "s2": "s2-torso-arms", "s3": "s3-hips-thighs", "s4": "s4-shins-boots"}
    procs = []
    for d in dirs:
        src = os.path.join(VEX, d, "source"); os.makedirs(src, exist_ok=True)
        for k, body in sheets(d).items():
            open(os.path.join(src, f"vex-{k}-prompt.txt"), "w", encoding="utf-8").write(STYLE.format(DIR=d.upper(), FACING=FACING[d.upper()]) + body + TAIL)
            if "--gen" in sys.argv:
                kai_sheet = os.path.join(KAIO, d, "source", kd[k] + ".png")
                procs.append(subprocess.Popen([sys.executable, os.path.join(REPO, "scripts", "gen-image.py"), src, f"vex-{k}", "--img", os.path.join(VEX, "concept", "ren-px-base.png"), "--img", os.path.join(VEX, "parts", "ren-px-parts-base.png"), "--img", kai_sheet], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True))
    for p in procs:
        print(p.communicate()[0][-160:])
