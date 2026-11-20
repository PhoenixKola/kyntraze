import subprocess, os, sys, concurrent.futures as cf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from sheets import SHEETS, prompt
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
REF = 'public/art/fx/kai-form2/aura_a.png'; D = 'art/fx-b27'
names = sys.argv[1:] or list(SHEETS)
def run(n):
    base = n.split('@')[0]; out = n.replace('@', '_v')
    open(f'{D}/{out}-prompt.txt', 'w', encoding='utf-8').write(prompt(base) + (' ALTERNATIVE: vary the composition and silhouettes from a previous attempt, keep it clean and readable.' if '@' in n else ''))
    r = subprocess.run(['python', 'scripts/gen-image.py', D, out, '--img', REF], capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-100:]
with cf.ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, names): print(r, flush=True)
