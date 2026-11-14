"""Blender 5.2 (factory scene not required): build rig/kai-south.blend from rig.py geometry + anim-data.json.
Usage: blender.exe -b --python build_blend.py"""
import bpy, json, math, os, sys
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rig as r
PX = 0.01
data = json.load(open(os.path.join(r.RIG_DIR, "anim-data.json")))
def W(p, depth=0.0): return Vector((p[0] * PX, depth, -p[1] * PX))

sc = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.cameras, bpy.data.lights, bpy.data.actions):
    for d in list(coll): coll.remove(d)

arm_data = bpy.data.armatures.new("KaiSouth_Armature"); arm = bpy.data.objects.new("KaiSouth_Rig", arm_data)
sc.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for b, (par, h, t) in r.BONES.items():
    eb = arm_data.edit_bones.new(b); eb.head = W(h); eb.tail = W(t)
for b, (par, h, t) in r.BONES.items():
    eb = arm_data.edit_bones[b]
    if par: eb.parent = arm_data.edit_bones[par]
    eb.use_connect = False; eb.align_roll(Vector((0, -1, 0)))
bpy.ops.object.mode_set(mode="OBJECT")
for b in r.NO_INHERIT_SCALE: arm_data.bones[b].inherit_scale = "NONE"
arm_data.display_type = "STICK"; arm.show_in_front = True
for pb in arm.pose.bones: pb.rotation_mode = "XYZ"
root = arm.pose.bones["root"]; root["far_leg_front"] = 0; root["hand_n_slot"] = 0; root["hand_f_slot"] = 0; root["lining_f_hide"] = 0; root["lining_n_hide"] = 0
LIN = ("lining_f", "lining_n") + (("lining_w",) if r.FORM == "f1" else ())
if r.FORM == "f1": root["lining_w_hide"] = 0
FORMSLOT = {"base": 0, "f1": 1}; root["form_slot"] = 1   # Form I rigs: which head/hair set is visible

coll = bpy.data.collections.new("KaiSouth_Parts"); sc.collection.children.link(coll)
objs = {}; images = {}
for i, p in enumerate(r.PARTS):
    if p["img"] not in images:
        im = bpy.data.images.load(os.path.join(r.PARTS_DIR, p["img"]), check_existing=False)
        im.alpha_mode = "STRAIGHT"; im.pack(); im.filepath = "//../parts/" + p["img"]; im.name = p["img"]; images[p["img"]] = im
    im = images[p["img"]]; w, h = im.size
    mat = bpy.data.materials.new("M_" + p["id"]); nt = mat.node_tree; nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = im; tex.interpolation = "Closest"; tex.extension = "CLIP"
    em = nt.nodes.new("ShaderNodeEmission"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader"); out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"]); nt.links.new(tex.outputs["Alpha"], mx.inputs["Fac"])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs["Surface"])
    A, t = r.part_rest(p)
    depth = -(i + 1) * 0.002
    corners = [(0, h), (w, h), (w, 0), (0, 0)]
    verts = [W(tuple(A @ [cx, cy] + t), depth) for cx, cy in corners]
    me = bpy.data.meshes.new("ME_" + p["id"]); me.from_pydata(verts, [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for li, (u, v) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[li].uv = (u, v)
    me.materials.append(mat)
    ob = bpy.data.objects.new(p["id"], me); coll.objects.link(ob)
    bone = arm_data.bones[p["bone"]]
    ob.parent = arm; ob.parent_type = "BONE"; ob.parent_bone = p["bone"]
    ob.matrix_parent_inverse = (arm.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))).inverted()
    ob["rig_part_id"] = p["id"]; ob["draw_index"] = i
    objs[p["id"]] = (ob, depth)

def drive(ob, path, index, expr, prop):
    fc = ob.driver_add(path, index) if index is not None else ob.driver_add(path); d = fc.driver; d.type = "SCRIPTED"
    v = d.variables.new(); v.name = "s"; v.type = "SINGLE_PROP"
    v.targets[0].id_type = "OBJECT"; v.targets[0].id = arm; v.targets[0].data_path = f'pose.bones["root"]["{prop}"]'
    d.expression = expr
for a_, b_ in (("shin_f", "shin_n"), ("boot_f", "boot_n"), ("thigh_f", "thigh_n")):
    da, db = objs[a_][1], objs[b_][1]
    drive(objs[a_][0], "location", 1, f"s*({db - da:.6f})", "far_leg_front"); drive(objs[b_][0], "location", 1, f"s*({da - db:.6f})", "far_leg_front")
for side, trio in (("n", ("fist_waist", "fist_front_n", "fist_angle_n")), ("f", ("fist_guard", "fist_front_f", "fist_angle_f", "fist_side_f"))):
    for k, oid in enumerate(trio):
        for prop in ("hide_render", "hide_viewport"): drive(objs[oid][0], prop, None, f"s != {k}", f"hand_{side}_slot")

for lid in LIN:
    for prop in ("hide_render", "hide_viewport"): drive(objs[lid][0], prop, None, "s == 1", lid + "_hide")

for p in r.PARTS:
    if p.get("slot", "").startswith("form:"):
        for prop in ("hide_render", "hide_viewport"): drive(objs[p["id"]][0], prop, None, f"s != {FORMSLOT[p['slot'].split(':')[1]]}", "form_slot")

cam_data = bpy.data.cameras.new("KaiSouth_Cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = max(r.CANVAS) * PX
cam = bpy.data.objects.new("KaiSouth_Cam", cam_data); sc.collection.objects.link(cam)
cam.location = (r.CANVAS[0] / 2 * PX, -5, -r.CANVAS[1] / 2 * PX); cam.rotation_euler = (math.radians(90), 0, 0); sc.camera = cam
sc.render.engine = "BLENDER_EEVEE"; sc.eevee.taa_render_samples = 1; sc.render.filter_size = 0.0; sc.render.film_transparent = True
sc.render.dither_intensity = 0.0; sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
sc.render.resolution_x, sc.render.resolution_y = r.CANVAS
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"; sc.render.image_settings.color_depth = "8"

arm.animation_data_create(); rest3 = {b.name: b.matrix_local.to_3x3().inverted() for b in arm_data.bones}
acts = {}
for clip in data["clips"]:
    act = bpy.data.actions.new(clip["name"]); act.use_fake_user = True; arm.animation_data.action = act
    for i, fr in enumerate(clip["frames"]):
        f = i + 1
        for pb in arm.pose.bones:
            c = fr["bones"].get(pb.name, {"rot": 0, "loc": [0, 0], "sy": 1})
            pb.rotation_euler = (0, 0, math.radians(c["rot"])); lx, ly = c["loc"]; pb.location = rest3[pb.name] @ Vector((lx * PX, 0, -ly * PX)); pb.scale = (1, c["sy"], 1)
            pb.keyframe_insert("rotation_euler", index=2, frame=f, group=pb.name); pb.keyframe_insert("location", frame=f, group=pb.name)
            pb.keyframe_insert("scale", index=1, frame=f, group=pb.name)
        SLOT = {"front": 1, "angle": 2, "side": 3}
        if "form" in fr["slots"]: root["form_slot"] = FORMSLOT[fr["slots"]["form"]]; root.keyframe_insert('["form_slot"]', frame=f, group="root")
        root["far_leg_front"] = fr["far_leg_front"]; root["hand_n_slot"] = SLOT.get(fr["slots"].get("hand_n"), 0)
        root["hand_f_slot"] = SLOT.get(fr["slots"].get("hand_f"), 0)
        root["lining_f_hide"] = 1 if "lining_f" in fr["slots"].get("_hide", []) else 0
        root["lining_n_hide"] = 1 if "lining_n" in fr["slots"].get("_hide", []) else 0
        if r.FORM == "f1": root["lining_w_hide"] = 1 if "lining_w" in fr["slots"].get("_hide", []) else 0
        for k in ("far_leg_front", "hand_n_slot", "hand_f_slot", "lining_f_hide", "lining_n_hide") + (("lining_w_hide",) if r.FORM == "f1" else ()): root.keyframe_insert(f'["{k}"]', frame=f, group="root")
    try:
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
    except AttributeError:
        for fc in act.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
    act.use_frame_range = True; act.frame_start = 1; act.frame_end = len(clip["frames"])
    act["fps"] = clip["fps"]; act["loop"] = clip["loop"]; act["frames"] = len(clip["frames"])
    for ev, idx in clip["events"].items(): act.pose_markers.new(ev).frame = idx + 1
    acts[clip["name"]] = act
arm.animation_data.action = acts["Idle"]; sc.frame_start = 1; sc.frame_end = len(data["clips"][0]["frames"]); sc.render.fps = data["clips"][0]["fps"]
arm["note"] = "Kai SOUTH production candidate: neutral = approved 3/4 stance. Actions Idle/Run/BasicPunch (fake user, CONSTANT keys). root props far_leg_front/hand_n_slot/hand_f_slot drive leg depth and fist swaps (0 base, 1 front-on, 2 angled)."
out = os.path.join(r.RIG_DIR, "kai-south.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("BUILD_V5", json.dumps({"saved": out, "actions": list(acts), "images": len(images), "parts": len(objs), "bones": len(arm_data.bones)}))
