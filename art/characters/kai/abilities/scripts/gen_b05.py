"""B05 ability FX source art through the audited Codex bridge (same bridge script + hash check as base/form-i generation).
  python gen_b05.py fx-sheet --img ref.png [--model gpt-6.1-sol]
Reads abilities/source/<name>-prompt.txt, writes abilities/source/<name>.png, logs to abilities/source/PROVENANCE.md."""
import argparse, hashlib, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); AB = os.path.dirname(HERE); KAI = os.path.dirname(AB)
BRIDGE = os.path.join(KAI, "base", "production-south-candidate", "tools", "codex-imagegen", "imagegen.mjs")
EXPECT_HEAD = "c4c21d9f3002a9f2"
CODEX = os.environ.get("CODEX_BIN", r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1106.6628.0_x64__2p2nqsd0c76g0\app\resources\codex.exe")
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("name"); ap.add_argument("--img", action="append", default=[]); ap.add_argument("--model", default="gpt-6.1-sol"); ap.add_argument("--out", default=None); a = ap.parse_args()
    assert hashlib.sha256(open(BRIDGE, "rb").read()).hexdigest().startswith(EXPECT_HEAD), "bridge script changed since audit"
    src = os.path.join(AB, "source")
    cmd = ["node", BRIDGE, "--codex", CODEX, "--model", a.model, "--prompt-file", os.path.join(src, a.name + "-prompt.txt"), "--out", os.path.join(src, a.out or a.name + ".png"),
           "--log", os.path.join(src, "PROVENANCE.md"), "--timeout-sec", "540"]
    for i in a.img: cmd += ["--image", i]
    r = subprocess.run(cmd, capture_output=True, text=True); print(r.stdout.strip()[-300:]); print(r.stderr.strip()[-200:]); sys.exit(r.returncode)
