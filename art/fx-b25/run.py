import subprocess, os, sys, concurrent.futures as cf
env=dict(os.environ); env['CODEX_BIN']=r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
REF='public/art/fx/kai-form2/aura_a.png'
jobs=[(f,k) for k in ('dragon','claw','orb','burst','head','sigil') for f in ('flare','comet','still')]+[('ui','icons')]
if len(sys.argv)>1: jobs=[tuple(a.split(':')) for a in sys.argv[1:]]
def run(j):
    d,n=j; r=subprocess.run(['python','scripts/gen-image.py',f'art/fx-b25/{d}',n,'--img',REF],capture_output=True,text=True,env=env); return j,r.returncode,(r.stdout+r.stderr)[-110:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run,jobs): print(r,flush=True)
