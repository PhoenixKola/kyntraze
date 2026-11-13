"""Thin wrapper around the audited SOUTH bridge (production-south-candidate/tools/codex-imagegen/imagegen.mjs, not duplicated).
  python gen.py <direction> <name> --img a.png --img b.png [--model gpt-6.1-sol]
Reads  <direction>/source/<name>-prompt.txt, writes <direction>/source/<name>.png and appends to <direction>/source/PROVENANCE.md.
Read-only sandboxed Codex, ChatGPT login only (no API key)."""
import argparse, glob, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
BRIDGE = os.path.join(KAI, "production-south-candidate", "tools", "codex-imagegen", "imagegen.mjs")
EXPECT_HEAD = "c4c21d9f3002a9f2"       # sha256 prefix of the audited script

CODEX_DEFAULT = r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1106.6628.0_x64__2p2nqsd0c76g0\app\resources\codex.exe"

def codex_exe():
    p = os.environ.get("CODEX_BIN", CODEX_DEFAULT)
    if not os.path.exists(p): sys.exit("Codex desktop CLI not found; set CODEX_BIN")
    return p

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("direction"); ap.add_argument("name"); ap.add_argument("--img", action="append", default=[])
    ap.add_argument("--model", default="gpt-6.1-sol"); a = ap.parse_args()
    import hashlib
    assert hashlib.sha256(open(BRIDGE, "rb").read()).hexdigest().startswith(EXPECT_HEAD), "bridge script changed since audit"
    src = os.path.join(ROOT, a.direction, "source"); os.makedirs(src, exist_ok=True)
    cmd = ["node", BRIDGE, "--codex", codex_exe(), "--model", a.model, "--prompt-file", os.path.join(src, a.name + "-prompt.txt"),
           "--out", os.path.join(src, a.name + ".png"), "--log", os.path.join(src, "PROVENANCE.md"), "--timeout-sec", "540"]
    for i in a.img: cmd += ["--image", i]
    r = subprocess.run(cmd, capture_output=True, text=True); print(r.stdout.strip()[-300:]); print(r.stderr.strip()[-200:]); sys.exit(r.returncode)
