import subprocess, os, sys, concurrent.futures as cf
env=dict(os.environ); env['CODEX_BIN']=r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
REF='public/art/fx/kai-form2/aura_a.png'
jobs=[(k,n) for k in ('flare','comet','still') for n in ('ring','wrap','lick')]
if len(sys.argv)>1: jobs=[tuple(a.split(':')) for a in sys.argv[1:]]
def run(j):
    k,n=j; r=subprocess.run(['python','scripts/gen-image.py',f'art/fx-b24/{k}',n,'--img',REF],capture_output=True,text=True,env=env); return j,r.returncode,(r.stdout+r.stderr)[-160:]
with cf.ThreadPoolExecutor(3) as ex:
    for r in ex.map(run,jobs): print(r,flush=True)
