"""Ashen Eclipse head sheets: python art/characters/ren/f2/gen_heads.py [south north east west]  (ImageGen via the audited bridge; refs = the f1 head magnified 10x + the chosen concept)"""
import os, subprocess, sys, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
R = 'art/characters/ren'; D = f'{R}/f2/source'
def run(d):
    r = subprocess.run([sys.executable, 'scripts/gen-image.py', D, f'{d}-heads', '--img', f'{R}/f1/refs/{d}-head-10x.png', '--img', f'{D}/concept.png'], capture_output=True, text=True, env=env); return d, r.returncode, r.stdout[-90:]
if __name__ == '__main__':
    with cf.ThreadPoolExecutor(4) as ex:
        for r in ex.map(run, sys.argv[1:] or ['south', 'north', 'east', 'west']): print(r, flush=True)
