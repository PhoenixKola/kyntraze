"""Rebuild the Form I rigs + sheets for one direction (or all): python build_form_i.py [south|north|east|west|all] [work_dir]
Uses the base pipelines unchanged apart from their KAI_FORM=f1 switch; base .blend/sheets are never written (everything lands in art/characters/kai/form-i/<dir>/).
Needs Blender 5.2 (BLENDER env or the default path), Python with numpy+Pillow, ffmpeg on PATH."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); FORM = os.path.dirname(HERE); BASE = os.path.join(os.path.dirname(FORM), "base")
BLENDER = os.environ.get("BLENDER", r"F:\Blender\blender-5.2.3-windows-x64\blender.exe")
which = sys.argv[1] if len(sys.argv) > 1 else "all"; work = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get("TEMP", "."), "kai-form-work")
os.makedirs(work, exist_ok=True)
def sh(cmd, cwd, env, grep=None):
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True); out = r.stdout + r.stderr
    if r.returncode: print(out[-2500:]); sys.exit(r.returncode)
    for line in out.splitlines():
        if grep and any(g in line for g in grep): print(line[:260])
def prepare(d): sh([sys.executable, os.path.join(HERE, "prepare_parts.py"), d], FORM, dict(os.environ))
def others(d):
    env = dict(os.environ, KAI_ROOT=FORM, KAI_FORM="f1"); cwd = os.path.join(BASE, "production-other-directions-candidate")
    sh([sys.executable, os.path.join(cwd, "scripts", "build_dir.py"), d, work], cwd, env, grep=["BUILD", "CHECKS", d + " "])
def south():
    env = dict(os.environ, KAI_ROOT_SOUTH=os.path.join(FORM, "south"), KAI_FORM="f1"); rig = os.path.join(BASE, "production-south-candidate", "rig"); wk = os.path.join(work, "south")
    os.makedirs(wk, exist_ok=True); os.makedirs(os.path.join(FORM, "south", "rig"), exist_ok=True)
    sh([sys.executable, "-c", f"import anim; anim.export(r'{os.path.join(FORM, 'south', 'rig', 'anim-data.json')}')"], rig, env)
    sh([BLENDER, "-b", "--python", "build_blend.py"], rig, env, grep=["BUILD", "Traceback", "Error"])
    sh([sys.executable, "post.py", "hashes", wk], rig, env); sh([sys.executable, "post.py", "prep", wk], rig, env)
    sh([BLENDER, "-b", os.path.join(FORM, "south", "rig", "kai-south.blend"), "--python", "export_blend.py", "--", wk], rig, env, grep=["V5_CHECKS", "Traceback", "Error"])
    sh([sys.executable, "post.py", "final", wk], rig, env, grep=["Idle", "Run", "BasicPunch", "Dash", "Hurt", "Death", "Transform", "protected"])
for d in (["south", "north", "east", "west"] if which == "all" else [which]):
    prepare(d); (south() if d == "south" else others(d)); print("built", d)
