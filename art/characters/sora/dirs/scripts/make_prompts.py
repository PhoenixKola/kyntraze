"""Write the ImageGen part-sheet prompts for NORTH / EAST / WEST (one text file per sheet) and the attachment list used by gen_all.py."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)

STYLE = ("Parts sheet for a 2D cutout (paper-doll) game rig. Attached images: (1) the {DIR} view of the character, a full-figure design reference for how every piece looks "
 "from this direction; (2) the approved original character; (3) the finished SOUTH parts sheet of the SAME character, showing the same kind of pieces at the exact pixel scale, "
 "chunky pixel-block size, palette and outline weight to match. Draw the equivalent pieces of the SAME character for the {DIR} view, copying the rendering of the attached images faithfully: "
 "thin dark controlled outlines (no thick halo), navy-charcoal jacket with lighter purple-grey highlight folds and cream piping/cuff trim, warm tan skin, off-white wraps with grey-brown stripe lines, "
 "baggy dark grey-purple trousers with lighter folds, solid dark combat boots with a strap and grey-brown sole, golden sash with darker orange-brown shadow stripes, teal-black hair with teal highlights. "
 "Same slightly-from-above game camera. {FACING}\n\n"
 "CONSTRUCTION: every piece is COMPLETE as if nothing were in front of it and hangs straight down, drawn foreshortened, short and chunky exactly like the SOUTH pieces. "
 "Draw ONLY the pieces listed, each isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped. Sizes are in art pixels (one art pixel = one 10x10 block) and match the SOUTH sheet; do not draw larger.\n\n")
TAIL = ("\nDraw every piece with big chunky 10x10 pixel blocks and NO finer detail than the attached references (no sub-pixel noise, no anti-aliasing, no gradients). "
 "Flat solid magenta background everywhere. Wide 16:9. No full character, no text, no labels, no watermark.\n")

FACING = {
 "EAST": "Kai faces screen RIGHT and is seen from his RIGHT side (his right shoulder with the single gold epaulette is nearest the camera). His left hand leads.",
 "WEST": "Kai faces screen LEFT and is seen from his LEFT side (his left shoulder is nearest the camera; the gold epaulette is on his far RIGHT shoulder). His left hand leads and is the near hand.",
 "NORTH": "Kai is seen from BEHIND (back to the camera): we see the back of his head, the plain back of the jacket with cream trim only along hem and cuffs, the gold epaulette on his RIGHT shoulder (screen RIGHT), and the sash tails down his back. His left hand (screen LEFT) leads.",
}

def sheets(d):
    D = d.upper(); east = d == "east"; west = d == "west"; north = d == "north"
    pt = "RIGHT" if east else "LEFT"
    head = {"east": "HEAD: the full head in PROFILE facing right: swept spiky hair streaming back to the left, ear, brow and eye, nose, a small visible closed mouth, jaw, and a short neck stub below. 46 wide, 48 tall.",
            "west": "HEAD: the full head in PROFILE facing left: swept spiky hair streaming back to the right, ear, brow and eye, nose, a small visible closed mouth, jaw, and a short neck stub below. 46 wide, 48 tall.",
            "north": "HEAD: the head seen from BEHIND: swept spiky teal-black hair mass with its back structure and highlights, the nape and a short neck stub, a hint of the ears at the sides, NO face. 46 wide, 48 tall."}[d]
    side = ("SIDE FIST: a clenched wrapped fist seen from the side with its knuckles pointing %s: white wrap over the back of the hand and wrist with grey-brown stripes, four finger segments and thumb visible, "
            "a clean wrist opening on the opposite end. Drawn horizontally. 27 wide, 22 tall." % pt)
    guard = {"east": "GUARD FIST: a raised clenched wrapped fist seen from the side, thumb side toward the viewer, fist on top, wrap running down to a clean wrist opening at the bottom. Drawn upright. 23 wide, 28 tall.",
             "west": "GUARD FIST: a raised clenched wrapped fist seen from the side, thumb side toward the viewer, fist on top, wrap running down to a clean wrist opening at the bottom. Drawn upright. 23 wide, 28 tall.",
             "north": "GUARD FIST: a raised clenched wrapped fist seen from BEHIND: the back of the wrapped hand and knuckle tops, fist on top, wrap running down to a clean wrist opening at the bottom. Drawn upright. 23 wide, 28 tall."}[d]
    s1 = "Draw ONLY these 3 pieces:\n1. " + head + "\n2. " + side + "\n3. " + guard + "\n"
    torso = {"east": "TORSO: the cropped navy jacket body in PROFILE facing right, with the cream-piped open front edge and high collar on the right side, black undershirt visible at the front, back of the jacket on the left, NO sleeves, NO arms, plain rounded shoulder stump, bottom ends at the jacket hem. 34 wide, 46 tall.",
             "west": "TORSO: the cropped navy jacket body in PROFILE facing left, with the cream-piped open front edge and high collar on the left side, black undershirt visible at the front, back of the jacket on the right, NO sleeves, NO arms, plain rounded shoulder stump, bottom ends at the jacket hem. 34 wide, 46 tall.",
             "north": "TORSO: the cropped navy jacket body seen from BEHIND: plain back with a folded high collar at the top, cream piping only along the hem, NO sleeves, NO arms, plain rounded shoulder stumps, bottom ends at the jacket hem. 44 wide, 46 tall."}[d]
    epa_n = d == "east"; epa_f = d in ("west", "north")
    sl_n = "NEAR UPPER-ARM SLEEVE: puffy navy sleeve, rounded shoulder top%s, rounded elbow end at the bottom, NO cuff and NO opening. 24 wide, 26 tall." % (" with the gold epaulette (with the small cream ball) sitting on the top of the shoulder" if epa_n else ", no epaulette")
    sl_f = "FAR UPPER-ARM SLEEVE: the same puffy sleeve%s, rounded elbow end, no cuff. 21 wide, 24 tall." % (" with the gold epaulette (with the small cream ball) sitting on the top of the shoulder" if epa_f else ", no epaulette")
    near_name = "NEAR" if not north else "SCREEN-LEFT (his left arm)"; far_name = "FAR" if not north else "SCREEN-RIGHT (his right arm)"
    if north:
        sl_n = sl_n.replace("NEAR UPPER-ARM", "LEFT-ARM (screen left) UPPER-ARM"); sl_f = sl_f.replace("FAR UPPER-ARM", "RIGHT-ARM (screen right) UPPER-ARM")
    fa_n = "%s FOREARM: at the top the flared sleeve end with the cream cuff trim ring (about 20 wide, 9 tall), the bare tan forearm coming out of the cuff, off-white wrap over the lower half, clean wrist opening at the bottom. 20 wide at the cuff, 16 wide below, 32 tall in total." % ("NEAR" if not north else "LEFT-ARM (screen left)")
    fa_f = "%s FOREARM: the same, 18 wide at the cuff, 14 wide below it, 30 tall in total." % ("FAR" if not north else "RIGHT-ARM (screen right)")
    s2 = "Draw ONLY these 5 pieces:\n1. " + torso + "\n2. " + sl_n + "\n3. " + sl_f + "\n4. " + fa_n + "\n5. " + fa_f + "\n"
    hips = {"east": "HIP BLOCK: the baggy trouser hip and seat region in PROFILE, one piece, flat straight TOP edge (it hides under the sash), the bottom edge a plain inverted V where the legs begin, no round bulges, a few diagonal folds. 38 wide, 25 tall.",
            "west": "HIP BLOCK: the baggy trouser hip and seat region in PROFILE, one piece, flat straight TOP edge (it hides under the sash), the bottom edge a plain inverted V where the legs begin, no round bulges, a few diagonal folds. 38 wide, 25 tall.",
            "north": "HIP BLOCK: the baggy trouser hip and seat region seen from BEHIND, one broad piece, flat straight TOP edge (it hides under the sash), the bottom edge a plain wide inverted V where the legs begin, no round buttocks, a few diagonal folds. 52 wide, 25 tall."}[d]
    band = {"east": "SASH BAND: the golden sash wrapped around the waist in PROFILE with its knot at the front (right) side, no tails. 32 wide, 16 tall.",
            "west": "SASH BAND: the golden sash wrapped around the waist in PROFILE with its knot at the front (left) side, no tails. 32 wide, 16 tall.",
            "north": "SASH BAND: the golden sash wrapped around the waist seen from BEHIND, a plain band with the knot at the centre back, no tails. 40 wide, 16 tall."}[d]
    tails = "SASH TAILS: the two golden tails that hang down from the knot, one longer, overlapping slightly. 18 wide, 28 tall."
    th_n = "%s THIGH: the very baggy trouser leg from the hip to the knee, wide and voluminous with diagonal cloth folds; flat/open top end, the bottom end gathers in at the knee. 32 wide, 45 tall." % ("NEAR" if not north else "LEFT-LEG (screen left)")
    th_f = "%s THIGH: the same, slightly narrower. 29 wide, 42 tall." % ("FAR" if not north else "RIGHT-LEG (screen right)")
    s3 = "Draw ONLY these 5 pieces:\n1. " + hips + "\n2. " + band + "\n3. " + tails + "\n4. " + th_n + "\n5. " + th_f + "\n"
    boots = {"east": ("NEAR BOOT: one solid dark combat boot in PROFILE, toe pointing right, strap across the shaft, grey sole, shaft opening at the top. 24 wide, 26 tall.", "FAR BOOT: the same boot in profile, toe pointing right. 24 wide, 26 tall."),
             "west": ("NEAR BOOT: one solid dark combat boot in PROFILE, toe pointing left, strap across the shaft, grey sole, shaft opening at the top. 24 wide, 26 tall.", "FAR BOOT: the same boot in profile, toe pointing left. 24 wide, 26 tall."),
             "north": ("LEFT BOOT (screen left): one solid dark combat boot seen from BEHIND, showing the heel and back of the shaft with its strap and the grey sole. 22 wide, 26 tall.", "RIGHT BOOT (screen right): the same boot from behind. 22 wide, 26 tall.")}[d]
    shn = "%s SHIN: squat baggy trouser lower leg, rounded top end (knee), gathered hem at the bottom. 24 wide, 22 tall." % ("NEAR" if not north else "LEFT-LEG (screen left)")
    shf = "%s SHIN: the same, 22 wide, 21 tall." % ("FAR" if not north else "RIGHT-LEG (screen right)")
    s4 = "Draw ONLY these 4 pieces:\n1. " + shn + "\n2. " + shf + "\n3. " + boots[0] + "\n4. " + boots[1] + "\n"
    return {"s1-heads-fists": s1, "s2-torso-arms": s2, "s3-hips-thighs": s3, "s4-shins-boots": s4}

SOUTH_REF = {"s1-heads-fists": "s1-head-hands.png", "s2-torso-arms": "s6-arms.png", "s3-hips-thighs": "s3-lower-a.png", "s4-shins-boots": "s5-limbs.png"}

if __name__ == "__main__":
    plan = {}
    for d in ("east", "west", "north"):
        os.makedirs(os.path.join(ROOT, d, "source"), exist_ok=True)
        for name, body in sheets(d).items():
            txt = STYLE.format(DIR=d.upper(), FACING=FACING[d.upper()]) + body + TAIL
            open(os.path.join(ROOT, d, "source", name + "-prompt.txt"), "w", encoding="utf-8").write(txt)
            plan.setdefault(d, []).append(name)
    print(json.dumps(plan))
