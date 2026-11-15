"""Form III FX / UI / portrait source art through the audited Codex bridge (same bridge + hash check as form-ii/scripts/gen_form_ii.py).
  python gen_fx.py <name> [--img ref.png ...] [--model gpt-6.1-sol] [--out-name v2]
Reads form-iii/source/<name>-prompt.txt, writes form-iii/source/<out-name or name>.png, logs to form-iii/source/PROVENANCE.md. Set CODEX_BIN if the default Codex path is stale."""
import argparse, hashlib, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); KAI = os.path.dirname(FORM)
BRIDGE = os.path.join(KAI, "base", "production-south-candidate", "tools", "codex-imagegen", "imagegen.mjs")
EXPECT_HEAD = "c4c21d9f3002a9f2"
CODEX = os.environ.get("CODEX_BIN", r"C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe")
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("name"); ap.add_argument("--img", action="append", default=[]); ap.add_argument("--model", default="gpt-6.1-sol"); ap.add_argument("--out-name"); a = ap.parse_args()
    assert hashlib.sha256(open(BRIDGE, "rb").read()).hexdigest().startswith(EXPECT_HEAD), "bridge script changed since audit"
    if not os.path.exists(CODEX): sys.exit("Codex desktop CLI not found; set CODEX_BIN")
    src = os.path.join(FORM, "source")
    cmd = ["node", BRIDGE, "--codex", CODEX, "--model", a.model, "--prompt-file", os.path.join(src, a.name + "-prompt.txt"), "--out", os.path.join(src, (a.out_name or a.name) + ".png"),
           "--log", os.path.join(src, "PROVENANCE.md"), "--timeout-sec", "540"]
    for i in a.img: cmd += ["--image", i]
    r = subprocess.run(cmd, capture_output=True, text=True); print(r.stdout.strip()[-300:]); print(r.stderr.strip()[-200:]); sys.exit(r.returncode)
