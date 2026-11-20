"""B25.1: rebuild the Kai clip sheets (adds Kick / Glide / Dive) for one form and direction through the existing Blender pipeline.
Usage: python scripts/b25-kai-build.py <base|f1|f2|f3> <south|north|east|west|all> [work_dir]
base -> base pipelines (outputs in art/characters/kai/base/...), f1 -> form-i, f2 -> form-ii, f3 -> form-iii (their own build scripts). Only the NEW clip sheets are published afterwards by scripts/b25-kai-publish.py."""
import os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); K = os.path.join(ROOT, "art", "characters", "kai"); BASE = os.path.join(K, "base")
BLENDER = os.environ.get("BLENDER", r"F:\Blender\blender-5.2.3-windows-x64\blender.exe")
form, which = sys.argv[1], sys.argv[2]; work = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.environ.get("TEMP", "."), "kai-b25-work")
os.makedirs(work, exist_ok=True)
def sh(cmd, cwd, env, grep=None):
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True); out = r.stdout + r.stderr
    if r.returncode: print(out[-2500:]); sys.exit(r.returncode)
    for line in out.splitlines():
        if grep and any(g in line for g in grep): print(line[:260])
if form == "base":
    rig = os.path.join(BASE, "production-south-candidate", "rig"); oth = os.path.join(BASE, "production-other-directions-candidate")
    for d in (["south", "north", "east", "west"] if which == "all" else [which]):
        if d == "south":
            wk = os.path.join(work, "south"); os.makedirs(wk, exist_ok=True); env = dict(os.environ)
            sh([sys.executable, "-c", "import anim; anim.export('anim-data.json')"], rig, env)
            sh([BLENDER, "-b", "--python", "build_blend.py"], rig, env, grep=["BUILD", "Traceback", "Error"])
            sh([sys.executable, "post.py", "hashes", wk], rig, env); sh([sys.executable, "post.py", "prep", wk], rig, env)
            sh([BLENDER, "-b", "kai-south.blend", "--python", "export_blend.py", "--", wk], rig, env, grep=["V5_CHECKS", "Traceback", "Error"])
            sh([sys.executable, "post.py", "final", wk], rig, env, grep=["Idle", "protected"])
        else:
            sh([sys.executable, os.path.join(oth, "scripts", "build_dir.py"), d, work], oth, dict(os.environ), grep=["BUILD", "CHECKS", d + " "])
        print("built", form, d, flush=True)
else:
    script = os.path.join(K, {"f1": "form-i", "f2": "form-ii", "f3": "form-iii"}[form], "scripts", {"f1": "build_form_i.py", "f2": "build_form_ii.py", "f3": "build_form_iii.py"}[form])
    for d in (["south", "north", "east", "west"] if which == "all" else [which]):
        sh([sys.executable, script, d, work], os.path.dirname(os.path.dirname(script)), dict(os.environ), grep=["built", "Traceback", "Error"])
        print("built", form, d, flush=True)
