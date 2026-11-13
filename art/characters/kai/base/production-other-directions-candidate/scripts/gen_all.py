"""Generate the four part sheets for one direction sequentially (anchor first). python gen_all.py east [sheet ...]"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
KAI = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
from make_prompts import SOUTH_REF
d = sys.argv[1]; only = sys.argv[2:] or list(SOUTH_REF)
for name in only:
    imgs = [os.path.join(ROOT, d, "source", "anchor.png"), os.path.join(ROOT, "refs", "approved-6x.png"),
            os.path.join(KAI, "production-south-candidate", "source", SOUTH_REF[name])]
    cmd = [sys.executable, os.path.join(HERE, "gen.py"), d, name] + sum([["--img", i] for i in imgs], [])
    r = subprocess.run(cmd, capture_output=True, text=True); print(d, name, "OK" if r.returncode == 0 else "FAIL", r.stdout.strip()[-120:], flush=True)
