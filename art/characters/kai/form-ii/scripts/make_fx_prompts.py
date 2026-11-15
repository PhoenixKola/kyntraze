"""Write the B12 Form II FX / UI ImageGen prompts into form-ii/source/fx-<name>-prompt.txt (generate with gen_form_ii.py fx <name> --img <style ref>)."""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(os.path.dirname(HERE), "source")
STYLE = ("Pixel-art game VFX sprite sheet for a 2D top-down action game (character about 80 px tall on screen). Attached image: the existing approved FX sheet, match its chunky pixel-block look (each art pixel is a clear 5x5 block, hard pixel edges, "
 "NO anti-aliasing, NO smooth gradients, at most 5 flat tones per sprite). Draw every sprite in NEUTRAL tones only: pure white, pale cream, light grey, mid grey and a dark grey outline, because they are tinted gold at runtime. "
 "ORIGINAL designs, not any existing franchise's sprites. Every piece must be COMPLETE, isolated on flat magenta (#ff00ff), far apart from the others, nothing touching, nothing cropped, no text, no labels, no watermark. Wide 16:9.\n\n")
SHEETS = {
 "dragon": STYLE + "Draw exactly 2 pieces, stacked vertically, each very wide: an ENERGY DRAGON seen from the SIDE, the head at the RIGHT end, flying to the right, drawn as living lightning-energy (white-hot core, light grey scale-plates, dark grey outline). "
   "Stylised eastern serpent: long S-curved body that tapers to a whip tail on the LEFT, a horned head with an open fanged jaw, flowing mane and whisker streams trailing back, a few small clawed limbs, jagged electric spikes along the spine. "
   "Powerful, aggressive and elegant, not cute. PIECE 1: about 230 art pixels wide and 52 tall, big S-wave body. PIECE 2: a different design, about 230 wide and 52 tall, flatter body with a larger head and longer whiskers. Both dragons must be one continuous connected silhouette.",
 "ground": STYLE + "Draw 10 pieces in two rows. ROW 1: four GROUND CRACK decals seen from above at a slight angle (flattened ellipse footprint, each about 90x50 art pixels): jagged radiating fissures splitting outward from a centre point, dark grey crack edges with a bright WHITE glowing seam inside each crack, "
   "no debris. Make the four different (one star-burst, one long diagonal split, one forked, one short double crack). ROW 2: six small rock DEBRIS chunks (each about 10 to 18 art pixels): angular cracked stone shards, light grey top faces and dark grey sides, a few with a white hot glowing edge.",
 "lightning": STYLE + "Draw 12 pieces in three rows. ROW 1: four LONG jagged lightning bolts, horizontal, each about 90x22 art pixels, white-hot core with a light grey halo, forked once. ROW 2: four SHORT vertical lightning bolts, each about 18x50, different shapes. "
   "ROW 3: (a) a spiky eight-point electric STAR BURST about 60x60, (b) a thin flat ELLIPSE RING of lightning about 110x56 (a ground shockwave ring made of jagged arcs), (c) a tall FLAME-LIKE AURA WISP about 34x80 laced with tiny lightning, (d) a second different aura wisp about 28x64.",
 "comet": STYLE + "Draw 5 pieces: (1) a large COMET CORE sphere about 64x64: blazing white-hot ball with a ragged corona and swirling energy bands, strong spiky rim. (2) A big SPIKED FLASH about 90x90: anime-style radial impact flash with sharp long rays. "
   "(3) A COMET HEAD about 100x44 pointing RIGHT: a glowing ball with a tapered fiery tail streaming to the left. (4) A BEAM SEGMENT about 96x72: a horizontal rush of white-hot energy, brightest in the centre with ragged lightning-laced edges top and bottom, designed to repeat along a beam. "
   "(5) A wide soft HALO RING about 100x100, thin jagged circle with small sparks.",
 "icons": ("Pixel-art HUD icon sheet for a 2D action game. Draw 3 icons, each a SOLID PURE WHITE silhouette on flat magenta (#ff00ff), about 56x56 art pixels (chunky 4x4 pixel blocks, hard edges, no anti-aliasing, no grey, no colour, pure white only with magenta showing through for inner detail): "
   "(1) DRAGONFANG RUSH: a stylised eastern dragon head biting forward with an open fanged jaw, a clenched fist at its base, speed streaks. (2) COMETBREAKER CANNON: a comet with a blazing ball head and a long jagged tail, flying diagonally to the right, with two small cupped hands at the tail. "
   "(3) COMETHEART FORM: a tall flame-spiked crest of five blade spikes crowned over a small lightning bolt. Match the simple bold style of an attached existing icon sheet. Original designs, no text, no labels. Wide 16:9, icons far apart."),
}
for name, txt in SHEETS.items():
    open(os.path.join(SRC, f"fx-{name}-prompt.txt"), "w", encoding="utf-8").write(txt + "\n")
print("ok")
