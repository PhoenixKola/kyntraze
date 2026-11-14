"""Whole pipeline for one direction: python build_dir.py east <work>   (needs Blender at BLENDER or the default path)"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.environ.get("KAI_ROOT") or os.path.dirname(HERE)
d, work = sys.argv[1], sys.argv[2]; os.makedirs(work, exist_ok=True)
BLENDER = os.environ.get("BLENDER", r"F:\Blender\blender-5.2.3-windows-x64\blender.exe")
env = dict(os.environ, KAI_DIR=d); py = sys.executable
def run(cmd, grep=None):
    r = subprocess.run(cmd, env=env, capture_output=True, text=True); out = r.stdout + r.stderr
    if r.returncode: print(out[-1500:]); sys.exit(r.returncode)
    for line in out.splitlines():
        if grep and any(g in line for g in grep): print(line[:330])
    return out
run([py, os.path.join(HERE, "make_config.py"), d], grep=["parts"])
run([py, "-c", f"import sys; sys.path.insert(0, r'{HERE}'); import danim; danim.export(r'{os.path.join(ROOT, d, 'rig', 'anim-data.json')}')"])
run([BLENDER, "-b", "--python", os.path.join(HERE, "build_blend.py")], grep=["BUILD", "Traceback", "Error"])
run([py, os.path.join(HERE, "post.py"), "prep", work])
run([BLENDER, "-b", os.path.join(ROOT, d, "rig", f"kai-{d}.blend"), "--python", os.path.join(HERE, "export_blend.py"), "--", work], grep=["CHECKS", "Traceback", "Error"])
run([py, os.path.join(HERE, "post.py"), "final", work], grep=[d])
