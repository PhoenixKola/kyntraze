"""B22 UI pass art (ImageGen via scripts/gen-image.py): Sora card in the Ren/Vex card style, Aetherfall / Paradox archive medallions, archive tab glyphs, harder-contract icons. Usage: python scripts/uipass-art-gen.py [name ...]"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(ROOT, "art", "uipass", "source"); os.makedirs(OUT, exist_ok=True)
S = lambda n: os.path.join(OUT, n)
J = {
 "card_sora": ("Original character card illustration for KYNTRAZE: FRACTURE RUSH, portrait orientation (3:4). Match the attached Ren and Vex cards EXACTLY in rendering style, palette handling, framing, lighting and the dark ruined-arena backdrop: same painted pixel-art illustration look, same scale of the character in the card, same vignette. Draw SORA, the Azure Fighter, a ranged controller: young man with dark navy hair, dark navy coat with white-blue trim, one hand raised holding a glowing electric-blue orb that crackles with lightning, calm focused expression, azure rim light, ruined stone arches in the dark background tinted deep blue. The character fills the card the same way Ren and Vex do. No text, no frame, no border, no watermark.", ["ref-ren-card.png", "ref-vex-card.png", "ref-sora-card.png"]),
 "arena_icons": ("Two medallion icons for a game UI on a flat pure black (#000000) background, side by side with a wide black gutter, equal size, matching the attached medallion style exactly (octagonal brass frame, pixel-art emblem, dark interior). Left: AETHERFALL CITADEL, a ruined sky fortress, pale gold and ivory columns over a bright abyss, golden halo shard. Right: THE PARADOX EXPANSE, a folded dimension, indigo and violet glass shards with teal-cyan highlights. No text.", ["../../../public/ui/meta/arena_gloam.png", "../../../public/ui/meta/arena_ashen.png"]),
 "tab_icons": ("Archive tab icon sheet. Bold simple thick-stroke WHITE pictogram emblems (pure white glyphs only, no colour, no shading) on a flat pure black (#000000) background, wide black gutters. A clean grid of SIX separate icons (3 columns by 2 rows), equal size, centred, consistent stroke weight, readable at 40 px. Left to right, top to bottom: (1) STORY: an open book with a quill. (2) MASTERY: a laurel wreath around a star. (3) OUTFITS AND CRESTS: a jacket on a hanger beside a small shield crest. (4) CODEX: a closed tome with an eye on the cover. (5) RECORDS: a trophy cup. (6) BOARDS: a podium with three ranked steps. No text, no labels, no grid lines.", []),
 "contract_icons": ("Contract icon sheet for a game UI on a flat pure black (#000000) background, wide black gutters. A clean grid of FOUR separate octagonal brass-framed medallion icons (2 columns by 2 rows), equal size, pixel-art emblems on dark interiors, dangerous and ominous mood, matching the attached medallion style. (1) BLOOD OATH: a bleeding sigil, a heart pierced by a crimson blade. (2) HOLLOW CROWN: a broken black crown with violet cracks. (3) THE LONG NIGHT: a crescent moon over a vast swarm of red eyes. (4) VOID PACT: a black sphere with a violet ring devouring light. No text, no labels.", ["../../../public/ui/meta/ct_glass.png", "../../../public/ui/meta/ct_overrun.png"]),
}
def run(n):
    prompt, refs = J[n]; open(S(n + "-prompt.txt"), "w", encoding="utf8").write(prompt)
    if os.path.exists(S(n + ".png")): print("skip", n); return 0
    env = dict(os.environ); env.setdefault("CODEX_BIN", r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe")
    cmd = [sys.executable, os.path.join(ROOT, "scripts", "gen-image.py"), OUT, n]
    for r in refs: cmd += ["--img", os.path.normpath(os.path.join(OUT, r))]
    r = subprocess.run(cmd, env=env, capture_output=True, text=True); print(n, r.returncode, (r.stdout + r.stderr)[-200:]); return r.returncode
names = sys.argv[1:] or list(J)
with ThreadPoolExecutor(4) as ex: list(ex.map(run, names))
print("UIPASS_DONE")
