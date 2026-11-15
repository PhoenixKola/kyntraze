"""Before/after contact sheets for the B07-pre rig fixes. Before = git HEAD (9a65097) sheets, after = working tree public/art. Run from the repo root."""
import io, json, os, subprocess
from PIL import Image, ImageDraw
OUT = os.path.join("art", "characters", "kai", "base", "b07pre-evidence"); BG = (40, 48, 60, 255)
def load(src, form, d, clip):
    root = "public/art/" + ("kai" if form == "base" else "kai-f1"); mp = f"{root}/{d}/manifest.json"
    if src == "before": man = json.loads(subprocess.check_output(["git", "show", "HEAD:" + mp])); png = Image.open(io.BytesIO(subprocess.check_output(["git", "show", f"HEAD:{root}/{d}/{man['animations'][clip]['sheet']}"]))).convert("RGBA")
    else: man = json.load(open(mp)); png = Image.open(f"{root}/{d}/{man['animations'][clip]['sheet']}").convert("RGBA")
    a = man["animations"][clip]; fw = a.get("frame_width", man["frame_width"]); return [png.crop((i * fw, 0, (i + 1) * fw, png.height)) for i in range(a["frames"])]
def row(frames, z, crop=None):
    fs = [f.crop(crop) if crop else f for f in frames]; w, h = fs[0].size; im = Image.new("RGBA", (w * z * len(fs), h * z), BG)
    for i, f in enumerate(fs): im.alpha_composite(f.resize((w * z, h * z), Image.NEAREST), (i * w * z, 0))
    return im
def stack(rows, labels, path):
    W = max(r.width for r in rows); H = sum(r.height + 14 for r in rows); im = Image.new("RGBA", (W, H), BG); y = 0; d = ImageDraw.Draw(im)
    for r, l in zip(rows, labels): d.text((3, y + 1), l, fill=(255, 220, 90, 255)); im.alpha_composite(r, (0, y + 14)); y += r.height + 14
    im.convert("RGB").save(os.path.join(OUT, path), optimize=True); print(path, im.size)
for form in ("base", "f1"):
    for d in ("north", "south"):
        stack([row(load(s, form, d, "Run"), 2) for s in ("before", "after")], [f"{form} {d} Run BEFORE (HEAD)", f"{form} {d} Run AFTER"], f"run-{d}-{form}-before-after-2x.png")
    rows, labels = [], []
    for d in ("south", "east", "west", "north"):
        for s in ("before", "after"):
            fs = load(s, form, d, "Idle"); fr = [fs[0], fs[8]]; rows.append(row(fr, 4, (0, 0, fr[0].width, int(fr[0].height * 0.55)))); labels.append(f"{form} {d} Idle {s} (frames 0, 8) head/neck/shoulder 4x")
    stack(rows, labels, f"idle-head-neck-{form}-before-after-4x.png")
