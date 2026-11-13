"""Run on the SAVED file (never saves): blender.exe -b kai-south.blend --python export_blend.py -- <work>
<work>/tex8/<img>.png = 8x Scale2x textures (post.py prep). Writes <work>/native, <work>/big, <work>/verify.json."""
import bpy, json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig as r
work = sys.argv[sys.argv.index("--") + 1]; PX = 0.01
data = json.load(open(os.path.join(HERE, "anim-data.json")))
c = {}; arm = bpy.data.objects.get("KaiSouth_Rig")
c["armature_present"] = arm is not None
c["bones_match_rig"] = {b: p for b, (p, h, t) in r.BONES.items()} == {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
objs = {o["rig_part_id"]: o for o in bpy.data.objects if o.get("rig_part_id")}
c["parts_bound"] = set(objs) == {p["id"] for p in r.PARTS} and all(objs[p["id"]].parent_bone == p["bone"] for p in r.PARTS)
imgs = [im for im in bpy.data.images if im.source == "FILE"]
c["images_packed_relative"] = len(imgs) == len({p["img"] for p in r.PARTS}) and all(im.packed_file and im.filepath.startswith("//") for im in imgs)
same = True
for im in imgs:
    ref = bpy.data.images.load(os.path.join(r.PARTS_DIR, im.name), check_existing=False)
    same &= tuple(ref.size) == tuple(im.size) and float(np.abs(np.array(im.pixels[:]) - np.array(ref.pixels[:])).max()) < 1e-6; bpy.data.images.remove(ref)
c["packed_pixels_equal_parts_folder"] = bool(same)
c["actions_and_frames"] = all(bpy.data.actions.get(k["name"]) and int(bpy.data.actions[k["name"]]["frames"]) == len(k["frames"]) for k in data["clips"])
c["drivers_present"] = sum(len(o.animation_data.drivers) for o in objs.values() if o.animation_data) == 6 + 12 + 4
sc = bpy.context.scene; cam = sc.camera; cam.location.x += 0.004 * PX; cam.location.z -= 0.004 * PX
heads = {}
def render_all(sub, scale):
    os.makedirs(os.path.join(work, sub), exist_ok=True)
    sc.render.resolution_x, sc.render.resolution_y = r.CANVAS[0] * scale, r.CANVAS[1] * scale
    for k in data["clips"]:
        arm.animation_data.action = bpy.data.actions[k["name"]]
        for i in range(len(k["frames"])):
            sc.frame_set(i + 1)
            if sub == "native": heads[f"{k['name']}_{i:02d}"] = {pb.name: [(arm.matrix_world @ pb.head).x / PX, -(arm.matrix_world @ pb.head).z / PX] for pb in arm.pose.bones}
            sc.render.filepath = os.path.join(work, sub, f"{k['name']}_{i:02d}.png"); bpy.ops.render.render(write_still=True)
render_all("native", 1)
for im in imgs:
    big = bpy.data.images.load(os.path.join(work, "tex8", im.name), check_existing=False); big.alpha_mode = "STRAIGHT"; im.user_remap(big)
render_all("big", 8)
json.dump({"checks": c, "pass": all(c.values()), "heads": heads}, open(os.path.join(work, "verify.json"), "w"))
print("V5_CHECKS", json.dumps(c))
