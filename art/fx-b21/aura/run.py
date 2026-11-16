import subprocess, os, sys, concurrent.futures as cf
env=dict(os.environ); env['CODEX_BIN']=r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
REF={'ren':'public/art/fx/ren/ra_back1.png','sora':'public/art/fx/sora/sm_back1.png','flare':'public/art/fx/ren/ra_back1.png','comet':'public/art/fx/sora/sm_back1.png','still':'public/art/fx/sora/sm_back1.png'}
jobs=[(k,n) for k in REF for n in ('back','misc')]
if len(sys.argv)>1: jobs=[tuple(a.split(':')) for a in sys.argv[1:]]
def run(j):
    k,n=j; d=f'art/fx-b21/aura/{k}'
    r=subprocess.run(['python','scripts/gen-image.py',d,n,'--img',REF[k]],capture_output=True,text=True,env=env); return j,r.returncode,(r.stdout+r.stderr)[-200:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run,jobs): print(r)
