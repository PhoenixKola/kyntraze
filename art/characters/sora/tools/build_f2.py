"""Build Sora Eventide Seraph ('f2') rigs + sheets: python build_f1.py [south|north|east|west|all]
Parts must exist (tools/prepare_f2.py). Uses Sora's own rig copies with Kai's KAI_FORM=f1 switch; outputs: south-f2/{rig,sheets,review}, dirs-f2/<d>/{rig,sheets,review}."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SORA = os.path.dirname(HERE)
BLENDER = os.environ.get('BLENDER', r'F:\Blender\blender-5.2.3-windows-x64\blender.exe')
which = sys.argv[1] if len(sys.argv) > 1 else 'all'; work = os.path.join(os.environ.get('TEMP', '.'), 'sora-f2-work'); os.makedirs(work, exist_ok=True)


def sh(cmd, cwd, env, grep=None):
    r = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True); out = r.stdout + r.stderr
    if r.returncode:
        print(out[-2500:]); sys.exit(r.returncode)
    for line in out.splitlines():
        if grep and any(g in line for g in grep):
            print(line[:240])


def south():
    root = os.path.join(SORA, 'south-f2'); env = dict(os.environ, KAI_ROOT_SOUTH=root, KAI_FORM='f1', KAI_PAD_TOP='24', KAI_PAD_LEFT='16'); rig = os.path.join(SORA, 'south', 'rig'); wk = os.path.join(work, 'south'); os.makedirs(wk, exist_ok=True); os.makedirs(os.path.join(root, 'rig'), exist_ok=True)
    sh([sys.executable, '-c', "import anim; anim.export(r'%s')" % os.path.join(root, 'rig', 'anim-data.json')], rig, env)
    sh([BLENDER, '-b', '--python', 'build_blend.py'], rig, env, grep=['BUILD', 'Traceback', 'Error'])
    sh([sys.executable, 'post.py', 'hashes', wk], rig, env); sh([sys.executable, 'post.py', 'prep', wk], rig, env)
    sh([BLENDER, '-b', os.path.join(root, 'rig', 'sora-south.blend'), '--python', 'export_blend.py', '--', wk], rig, env, grep=['V5_CHECKS', 'Traceback', 'Error'])
    sh([sys.executable, 'post.py', 'final', wk], rig, env, grep=['Transform', 'Traceback'])


def others(d):
    env = dict(os.environ, KAI_ROOT=os.path.join(SORA, 'dirs-f2'), KAI_FORM='f1', KAI_PAD_TOP='24')
    sh([sys.executable, os.path.join(SORA, 'dirs', 'scripts', 'build_dir.py'), d, work], os.path.join(SORA, 'dirs'), env, grep=['BUILD', 'CHECKS', d + ' ', 'Traceback'])


for d in (['south', 'north', 'east', 'west'] if which == 'all' else [which]):
    (south() if d == 'south' else others(d)); print('built', d)
