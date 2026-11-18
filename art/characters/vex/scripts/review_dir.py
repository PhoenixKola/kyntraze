"""Review strips: Ren (top) vs Kai (below, same scale) for one direction. python review_dir.py north"""
import json, os, sys
from PIL import Image
VEX = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); KAIO = os.path.join(os.path.dirname(VEX), "kai", "base", "production-other-directions-candidate")
def rows(root, d, char, clips, per):
    m = json.load(open(os.path.join(root, d, "sheets", "manifest.json"))); out = []
    for c in clips:
        a = m["animations"][c]; sh = Image.open(os.path.join(root, d, a["sheet"])).convert("RGBA"); fw = a.get("frame_width", m["frame_width"]); fh = a.get("frame_height", m["frame_height"]); n = a["frames"]
        idx = [round(i * (n - 1) / (per - 1)) for i in range(per)]; row = Image.new("RGBA", (fw * per, fh), (70, 78, 88, 255))
        for k, i in enumerate(idx): row.alpha_composite(sh.crop((i * fw, 0, (i + 1) * fw, fh)), (k * fw, 0))
        out.append(row)
    return out
if __name__ == "__main__":
    d = sys.argv[1]; clips = ["Idle", "Run", "BasicPunch", "Dash", "Hurt", "Death", "Beam", "Sphere"]; per = 6
    a = rows(VEX, d, "ren", clips, per); b = rows(KAIO, d, "kai", ["Idle", "Run", "BasicPunch"], per)
    W = max(r.width for r in a + b); H = sum(r.height for r in a + b) + 10
    o = Image.new("RGBA", (W, H), (30, 34, 40, 255)); y = 0
    for r in a: o.alpha_composite(r, (0, y)); y += r.height
    y += 10
    for r in b: o.alpha_composite(r, (0, y)); y += r.height
    os.makedirs(os.path.join(VEX, "review"), exist_ok=True)
    o = o.resize((int(W * 1.5), int(H * 1.5)), Image.NEAREST); o.convert("RGB").save(os.path.join(VEX, "review", f"{d}-ren-vs-kai.png")); print(o.size)
