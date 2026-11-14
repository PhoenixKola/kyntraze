"""Generic Codex ImageGen bridge wrapper (same audited bridge + hash check as the Kai pipeline). Usage: python scripts/gen-image.py <dir-with-prompt> <name> [--img ref.png]... [--model gpt-6.1-sol]
Reads <dir>/<name>-prompt.txt, writes <dir>/<name>.png, appends provenance to <dir>/PROVENANCE.md."""
import argparse, hashlib, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIDGE = os.path.join(ROOT, "art", "characters", "kai", "base", "production-south-candidate", "tools", "codex-imagegen", "imagegen.mjs")
CODEX = os.environ.get("CODEX_BIN", r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1106.6628.0_x64__2p2nqsd0c76g0\app\resources\codex.exe")
ap = argparse.ArgumentParser(); ap.add_argument("dir"); ap.add_argument("name"); ap.add_argument("--img", action="append", default=[]); ap.add_argument("--model", default="gpt-6.1-sol"); a = ap.parse_args()
assert hashlib.sha256(open(BRIDGE, "rb").read()).hexdigest().startswith("c4c21d9f3002a9f2"), "bridge script changed since audit"
cmd = ["node", BRIDGE, "--codex", CODEX, "--model", a.model, "--prompt-file", os.path.join(a.dir, a.name + "-prompt.txt"), "--out", os.path.join(a.dir, a.name + ".png"), "--log", os.path.join(a.dir, "PROVENANCE.md"), "--timeout-sec", "540"]
for i in a.img: cmd += ["--image", i]
r = subprocess.run(cmd, capture_output=True, text=True); print(a.name, r.stdout.strip()[-200:], r.stderr.strip()[-200:]); sys.exit(r.returncode)
