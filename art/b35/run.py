"""B35 ImageGen: HUD Overdrive mantle beasts for Ren's Eclipse Nine-Tailed Fox and Sora's Eventide Phoenix (same composition as public/ui/hud/beast_fox.webp / beast_phoenix.webp: wide, tail on the left, body in the middle, head on the right facing right). python art/b35/run.py ; process.py cuts them to public/ui/hud."""
import subprocess, os, concurrent.futures as cf
env = dict(os.environ); env['CODEX_BIN'] = r'C:\Program Files\WindowsApps\OpenAI.Codex_26.1111.2228.0_x64__2p2nqsd0c76g0\app\resources\codex.exe'
D = 'art/b35'
COMP = "Very wide banner composition about 3.3 to 1 (width to height), the whole creature stretched horizontally in one elegant sweeping S-curve: the TAIL fan on the LEFT third, the BODY in the middle third, the HEAD on the RIGHT third facing RIGHT, leaping forward. Hand-painted 2D pixel-art-inspired premium game illustration, crisp bold silhouette, rim-lit, flat PURE BLACK (#000000) background, no ground, no text, no letters, no watermark, nothing else in the image. "
J = {
 'beast_ashfox': ("The Eclipse Nine-Tailed Fox, a mythic predator fox of charcoal ash, shadow and ember. Nine individually readable long tails fanning out on the left, charcoal-black fur with pale ivory ash rim light and thin glowing orange fissures, a black eclipse disc with an orange corona glowing in the chest, glowing orange eyes, bared fangs, claws extended. " + COMP + "Palette: obsidian charcoal, pale bone ash, burnt orange embers; NOT bright red.", ['public/ui/hud/beast_fox.webp', 'public/art/b33/ef_head.webp']),
 'beast_eventide': ("The Eventide Phoenix, a mythic celestial bird of luminous cream and mother-of-pearl feathers with pale rose and dusk-violet tips and prism rim light. Very long trailing constellation tail streamers with tiny four-pointed stars on the left, two large articulated feathered wings in the middle with a glowing star core between them, an elegant crested head on the right with an open beak. " + COMP + "Palette: cream pearl, pale rose, dusk violet, thin aqua-pink-gold prism edges; NOT blue.", ['public/ui/hud/beast_phoenix.webp', 'public/art/b34/ph_head.webp']),
}
def run(n):
    pr, rf = J[n]; open(f'{D}/{n}-prompt.txt', 'w', encoding='utf-8').write(pr)
    cmd = ['python', 'scripts/gen-image.py', D, n]
    for r in rf: cmd += ['--img', r]
    r = subprocess.run(cmd, capture_output=True, text=True, env=env); return n, r.returncode, (r.stdout + r.stderr)[-140:]
if __name__ == '__main__':
    with cf.ThreadPoolExecutor(2) as ex:
        for r in ex.map(run, list(J)): print(r, flush=True)
