"""Write the Form I ImageGen prompts (one sheet per direction: HEAD + HAIR_BACK) into form-i/source/."""
import os
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(os.path.dirname(HERE), "source")

INTRO = ("Pixel-art parts sheet for a 2D cutout (paper-doll) game rig: the FORM I version of one character's head. Attached images: (1) the CURRENT head piece of the character in this view, magnified 10x with "
 "nearest-neighbour (each art pixel is a clear 10x10 block); (2) the approved full character in this view. Draw the SAME head (identical face shape, jaw, ear, nose, skin tone, neck stub, outline weight, "
 "chunky pixel-block size, palette and shading style as the magnified crop) but powered up into FORM I: the hair becomes much more energetic and spikier, and the brows and eyes become sharper and more intense. "
 "This is an ORIGINAL design, not any existing franchise's hairstyle: asymmetric blade-like spikes, no crown of identical gold spikes. Keep the hair in the SAME dark teal-black palette as the crop "
 "(thin dark outline, dark teal-black body, teal highlight clusters): the colour will be recoloured later by a palette map, so do NOT make it yellow, blonde or any other colour.\n\n")
HAIR = ("HAIR RULES: five or six thick, tapering, blade-like spikes sweeping UP and slightly BACK from the crown with clearly different lengths and angles (the tallest about 1.6x the height of the current hair), "
 "one sharp forelock spike hanging over the brow, two short jagged side locks. Every spike must be thick at the root and be fully connected to the scalp mass (NO detached islands, NO thin hair strands, "
 "NO tiny floating pieces); spike tips are 2-3 art pixels wide at the finest. Strong light-teal highlight clusters along the upper edge of each spike, dark outline around everything.\n"
 "FACE RULES: same face as the crop; brows slightly lower and more angled (determined), eyes a little narrower with a bright pale cyan-white glint in the iris; same small closed mouth; calm focused fierce expression, no teeth, no anger lines, no glow drawn on the face.\n\n")
VIEWS = {
 "south": ("HEAD: the full head in the same three-quarter front view as the crop (face visible, turned slightly to screen right), with the Form I hair, ear, face and a short neck stub below the jaw. About 52 art pixels tall including the tallest spike, face about 30 art pixels wide.",
           "HAIR_BACK: a separate hair piece that sits BEHIND the head: the long rear/side spike cluster of the Form I hair (three long back-swept spikes plus the dark hair mass they grow from). The end where the spikes grow from is a plain wide dark hair mass that will be hidden behind the skull; the spikes flare out from it towards the left, up and down. About 40 wide, 36 tall."),
 "north": ("HEAD: the head seen from BEHIND (no face): the Form I spiky hair mass covering the whole back of the head with its spike structure and highlights, the nape and a short neck stub, a hint of the ears at the sides. About 52 art pixels tall including the tallest spike, 42 wide.",
           "HAIR_BACK: a separate hair piece that hangs from the lower back of the head: three long swept spikes plus the dark hair mass they grow from; the end they grow from is a plain wide dark hair mass hidden behind the head. About 36 wide, 32 tall."),
 "east": ("HEAD: the full head in PROFILE facing RIGHT as in the crop: the Form I hair swept up and back (to the left), ear, sharper brow and eye, nose, small closed mouth, jaw and a short neck stub below. About 54 art pixels tall including the tallest spike, face about 28 wide.",
          "HAIR_BACK: a separate hair piece that sits BEHIND the head in profile: the long back-swept spike cluster streaming to the LEFT (three long spikes plus the dark hair mass they grow from). The end the spikes grow from (on the right) is a plain dark hair mass hidden behind the skull. About 42 wide, 34 tall."),
 "west": ("HEAD: the full head in PROFILE facing LEFT as in the crop: the Form I hair swept up and back (to the right), ear, sharper brow and eye, nose, small closed mouth, jaw and a short neck stub below. About 54 art pixels tall including the tallest spike, face about 28 wide.",
          "HAIR_BACK: a separate hair piece that sits BEHIND the head in profile: the long back-swept spike cluster streaming to the RIGHT (three long spikes plus the dark hair mass they grow from). The end the spikes grow from (on the left) is a plain dark hair mass hidden behind the skull. About 42 wide, 34 tall."),
}
TAIL = ("\nDraw ONLY these 2 pieces, each COMPLETE and isolated on flat magenta (#ff00ff), far apart, nothing overlapping, nothing cropped. Use big chunky 10x10 pixel blocks and NO finer detail than the magnified crop "
 "(no sub-pixel noise, no anti-aliasing, no gradients). Flat solid magenta background. Wide 16:9. No full character, no text, no labels, no watermark.\n")
for d, (head, hair) in VIEWS.items():
    txt = INTRO + HAIR + "1. " + head + "\n2. " + hair + "\n" + TAIL
    open(os.path.join(SRC, f"{d}-heads-prompt.txt"), "w", encoding="utf-8").write(txt)
print("ok")
