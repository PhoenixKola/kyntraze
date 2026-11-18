"""Vex VOIDHEART EXILE head sheets (ImageGen, same two-piece magenta sheet contract as Ren's Ascendant heads). Writes art/characters/vex/f2/source/<dir>-heads(-prompt).txt|png. Usage: python scripts/vex-f2-heads-gen.py [dir ...]"""
import os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); VEX = os.path.join(ROOT, "art", "characters", "vex"); REN = os.path.join(ROOT, "art", "characters", "ren")
OUT = os.path.join(VEX, "f2", "source"); os.makedirs(OUT, exist_ok=True)
DESIGN = ("but as the VOIDHEART EXILE form: a completely DIFFERENT hairstyle from the ordinary spiked look. The hair becomes LONG, SMOOTH and SWEPT STRAIGHT BACK into one heavy flowing mane that falls past the nape toward the shoulder blades, in cold ASH-SILVER and pale grey with deep black-violet streaks and a dark shadow ramp; a short sharp fringe over the brow; a thin dark void-metal circlet band across the forehead; the eyes glow a pale white-violet (a clear 2-3 pixel glint in the iris); a calm, hollow, grave expression. "
          "Absolutely NO spikes and NO upward-sweeping flames: the silhouette is a smooth tall mass swept back and down. This is an ORIGINAL design, not any existing franchise's hairstyle.")
RULES = ("HAIR RULES: one long smooth mane made of three or four broad overlapping locks that sweep BACK and DOWN from the crown, with a few tapering lock tips of clearly different lengths at the bottom; every lock thick at the root and fully connected to the scalp mass (NO detached islands, NO thin strands, NO tiny floating pieces); the overall width must stay within the head width plus a few pixels (nothing sticks out sideways).")
def build(d):
    t = open(os.path.join(REN, "f1", "source", f"{d}-heads-prompt.txt"), encoding="utf8").read()
    t = re.sub(r"\(2\) REN's approved CRIMSON ASCENDANT pixel-art turnaround \(identity of the new look:[^)]*\)", "(2) REN's Ascendant parts sheet (use ONLY for the sheet layout, piece sizes and chunky pixel-block scale; do NOT copy its red spiky hair)", t)
    t = t.replace("CRIMSON ASCENDANT", "VOIDHEART EXILE").replace("Crimson Ascendant", "Voidheart Exile")
    t = re.sub(r"REN", "VEX", t).replace("REN's", "VEX's").replace("(REN)", "(VEX)")
    t = re.sub(r"but as the ASCENDANT form:.*?ORIGINAL design, not any existing franchise's hairstyle\.", DESIGN, t, flags=re.S)
    t = re.sub(r"HAIR RULES:.*?(?=\n\n1\.)", RULES, t, flags=re.S)
    t = re.sub(r"crimson|maroon", "ash-silver", t, flags=re.I)
    return t
def run(d):
    p = os.path.join(OUT, f"{d}-heads-prompt.txt"); open(p, "w", encoding="utf8").write(build(d))
    if os.path.exists(os.path.join(OUT, f"{d}-heads.png")): print("skip", d); return
    env = dict(os.environ); env.setdefault("CODEX_BIN", r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe")
    cmd = [sys.executable, os.path.join(ROOT, "scripts", "gen-image.py"), OUT, f"{d}-heads", "--img", os.path.join(VEX, "f1", "refs", f"{d}-head-10x.png"), "--img", os.path.join(REN, "f1", "source", f"{d}-heads.png")]
    r = subprocess.run(cmd, env=env, capture_output=True, text=True); print(d, r.returncode, (r.stdout + r.stderr)[-160:])
dirs = sys.argv[1:] or ["south", "north", "east", "west"]
with ThreadPoolExecutor(4) as ex: list(ex.map(run, dirs))
print("HEADS_DONE")
