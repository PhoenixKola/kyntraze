"""Blender 5.2: build the editable SOUTH proof rig from rig-spec.json + templates, key every QA/debug pose,
render them, save kai-south-rig-pilot.blend (textures packed).
Usage: blender.exe -b --python scripts/blender_build.py
"""
import bpy, json, math, os, sys, time
from mathutils import Vector, Matrix

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(os.path.join(KIT, "rig-spec.json")))
frames = json.load(open(os.path.join(KIT, "scripts", "poses.json")))
PX = spec["scale"]["blender_units_per_px"]
CW, CH = spec["technical_canvas"]["size_px"]; RX, RY = spec["technical_canvas"]["root_canvas_px"]
OUT = os.path.join(KIT, "qa", "blender-renders"); os.makedirs(OUT, exist_ok=True)
log = {"blender_version": bpy.app.version_string, "started": time.strftime("%Y-%m-%d %H:%M:%S")}

def W(p, depth=0.0): return Vector((p[0] * PX, depth, -p[1] * PX))

# ---------------------------------------------------------------- clean scene (keeps user prefs untouched)
scene = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.cameras, bpy.data.lights, bpy.data.actions):
    for d in list(coll): coll.remove(d)
scene.timeline_markers.clear()

# ---------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new("KaiSouth_Armature")
arm = bpy.data.objects.new("KaiSouth_Rig", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
for b in spec["bones"]:
    eb = arm_data.edit_bones.new(b["name"])
    eb.head = W(b["pivot_char_px"]); eb.tail = W(b["tail_char_px"])
for b in spec["bones"]:
    eb = arm_data.edit_bones[b["name"]]
    if b["parent"]: eb.parent = arm_data.edit_bones[b["parent"]]
    eb.use_connect = False
    eb.align_roll(Vector((0, -1, 0)))   # local Z toward the camera -> local Z rotation = in-plane, +CCW on screen
bpy.ops.object.mode_set(mode="OBJECT")
arm_data.display_type = "STICK"; arm.show_in_front = True
for pb in arm.pose.bones: pb.rotation_mode = "XYZ"

# ---------------------------------------------------------------- textured planes
coll = bpy.data.collections.new("KaiSouth_Parts"); scene.collection.children.link(coll)
part_objs = {}
n_parts = len(spec["parts"])
for p in spec["parts"]:
    pid = p["id"]; w, h = p["size_px"]; ox, oy = p["rest_origin_char_px"]
    depth = -(p["draw_index"] + 1) * 0.002          # nearer to camera (-Y) = drawn later
    img = bpy.data.images.load(os.path.join(KIT, p["file"]), check_existing=False)
    img.name = pid; img.alpha_mode = "STRAIGHT"; img.pack()
    img.filepath = "//" + p["file"]                   # portable relative path; data stays packed
    mat = bpy.data.materials.new("M_" + pid)
    try: mat.use_nodes = True
    except Exception: pass
    nt = mat.node_tree; nt.nodes.clear()
    tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img; tex.interpolation = "Closest"; tex.extension = "CLIP"
    em = nt.nodes.new("ShaderNodeEmission"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"]); nt.links.new(tex.outputs["Alpha"], mx.inputs["Fac"])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs["Surface"])
    for attr, val in (("surface_render_method", "DITHERED"), ("blend_method", "CLIP")):
        try: setattr(mat, attr, val)
        except Exception: pass
    me = bpy.data.meshes.new("ME_" + pid)
    verts = [W((ox, oy + h), depth), W((ox + w, oy + h), depth), W((ox + w, oy), depth), W((ox, oy), depth)]
    me.from_pydata(verts, [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for li, (u, v) in enumerate([(0, 0), (1, 0), (1, 1), (0, 1)]): uv.data[li].uv = (u, v)
    me.materials.append(mat)
    ob = bpy.data.objects.new(pid, me); coll.objects.link(ob)
    bone = arm_data.bones[p["bone"]]
    ob.parent = arm; ob.parent_type = "BONE"; ob.parent_bone = p["bone"]
    ob.matrix_parent_inverse = (arm.matrix_world @ bone.matrix_local @ Matrix.Translation((0, bone.length, 0))).inverted()
    ob["rig_part_id"] = pid; ob["pivot_px"] = p["pivot_px"]; ob["draw_index"] = p["draw_index"]
    ob.hide_render = not p["default_visible"]; ob.hide_viewport = False
    part_objs[pid] = ob

# ---------------------------------------------------------------- camera / render
cam_data = bpy.data.cameras.new("KaiSouth_OrthoCam"); cam_data.type = "ORTHO"
cam_data.ortho_scale = max(CW, CH) * PX; cam_data.sensor_fit = "AUTO"; cam_data.clip_start = 0.01; cam_data.clip_end = 100
cam = bpy.data.objects.new("KaiSouth_OrthoCam", cam_data); scene.collection.objects.link(cam)
cx, cy = CW / 2 - RX, CH / 2 - RY
cam.location = (cx * PX, -5.0, -cy * PX); cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam
engine_ok = None
for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
    try: scene.render.engine = eng; engine_ok = eng; break
    except Exception: pass
log["engine"] = engine_ok
scene.eevee.taa_render_samples = 1
scene.render.filter_size = 0.0
scene.render.film_transparent = True
try: scene.render.dither_intensity = 0.0
except Exception: pass
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"
scene.view_settings.exposure = 0.0; scene.view_settings.gamma = 1.0
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = CW, CH, 100
scene.render.image_settings.file_format = "PNG"; scene.render.image_settings.color_mode = "RGBA"; scene.render.image_settings.color_depth = "8"

# ---------------------------------------------------------------- reference FK (same maths as rig_core.fk) for self-check
bones = {b["name"]: b for b in spec["bones"]}
def chain(b):
    out = []
    while b: out.append(b); b = bones[b]["parent"]
    return out[::-1]
def fk_point(angles, root, bname, p):
    # returns posed char point of rest point p carried by bone bname
    A = [[1, 0], [0, 1]]; t = [root[0], root[1]]
    for bb in chain(bname):
        if bb == "root": continue
        piv = bones[bb]["pivot_char_px"]; a = math.radians(angles.get(bb, 0.0)); c, s = math.cos(a), math.sin(a)
        R = [[c, s], [-s, c]]
        d = [piv[0] - (R[0][0] * piv[0] + R[0][1] * piv[1]), piv[1] - (R[1][0] * piv[0] + R[1][1] * piv[1])]
        t = [A[0][0] * d[0] + A[0][1] * d[1] + t[0], A[1][0] * d[0] + A[1][1] * d[1] + t[1]]
        A = [[A[0][0] * R[0][0] + A[0][1] * R[1][0], A[0][0] * R[0][1] + A[0][1] * R[1][1]],
             [A[1][0] * R[0][0] + A[1][1] * R[1][0], A[1][0] * R[0][1] + A[1][1] * R[1][1]]]
    return (A[0][0] * p[0] + A[0][1] * p[1] + t[0], A[1][0] * p[0] + A[1][1] * p[1] + t[1])

# ---------------------------------------------------------------- key poses
arm.animation_data_create()
root_rest3 = arm_data.bones["root"].matrix_local.to_3x3().inverted()
hand_parts = {pid: ob for pid, ob in part_objs.items() if spec["parts"][[q["id"] for q in spec["parts"]].index(pid)]["slot"] == "hand"}
scene.frame_start = 1; scene.frame_end = len(frames)
max_err = 0.0; worst = None
for i, fr in enumerate(frames):
    f = i + 1
    scene.frame_set(f)
    for pb in arm.pose.bones:
        pb.rotation_euler = (0, 0, math.radians(fr["angles"].get(pb.name, 0.0)))
        pb.keyframe_insert("rotation_euler", index=2, frame=f, group=pb.name)
    dx, dy = fr["root"]
    arm.pose.bones["root"].location = root_rest3 @ Vector((dx * PX, 0, -dy * PX))
    arm.pose.bones["root"].keyframe_insert("location", frame=f, group="root")
    for pid, ob in hand_parts.items():
        side = pid.split("_")[1]; want = fr["hands"].get(side, "fist")
        ob.hide_render = not pid.endswith(want); ob.keyframe_insert("hide_render", frame=f)
    scene.timeline_markers.new(fr["name"], frame=f)
    bpy.context.view_layer.update()
    for pb in arm.pose.bones:
        hw = arm.matrix_world @ pb.head
        got = (hw.x / PX, -hw.z / PX)
        exp = fk_point(fr["angles"], fr["root"], pb.name, bones[pb.name]["pivot_char_px"])
        e = math.hypot(got[0] - exp[0], got[1] - exp[1])
        if e > max_err: max_err, worst = e, (fr["name"], pb.name)
        # also check the tail direction (rotation sign) via a second point
        tw = arm.matrix_world @ pb.tail; gt = (tw.x / PX, -tw.z / PX)
        et = fk_point(fr["angles"], fr["root"], pb.name, bones[pb.name]["tail_char_px"])
        e2 = math.hypot(gt[0] - et[0], gt[1] - et[1])
        if e2 > max_err: max_err, worst = e2, (fr["name"], pb.name + ".tail")
act = arm.animation_data.action
if act:
    act.name = "KaiSouth_QA_and_Debug"; act.use_fake_user = True
    for fc in getattr(act, "fcurves", []):
        for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"
log.update(frames=len(frames), max_pivot_error_px=round(max_err, 6), worst=worst, action=act.name if act else None)

# ---------------------------------------------------------------- render every keyed frame
t0 = time.time()
for i, fr in enumerate(frames):
    scene.frame_set(i + 1)
    scene.render.filepath = os.path.join(OUT, fr["name"] + ".png")
    bpy.ops.render.render(write_still=True)
log["render_seconds"] = round(time.time() - t0, 2)

# ---------------------------------------------------------------- save
scene.frame_set(1)
arm["spec_schema"] = spec["schema"]; arm["status"] = spec["status"]
arm["sides"] = spec["coordinate_system"]["sides"]; arm["angles"] = spec["coordinate_system"]["angles"]
blend = os.path.join(KIT, "kai-south-rig-pilot.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, relative_remap=True, compress=True)
log["saved"] = blend; log["packed_images"] = sum(1 for im in bpy.data.images if im.packed_file)
log["objects"] = len(bpy.data.objects); log["bones"] = len(arm_data.bones)
with open(os.path.join(KIT, "qa", "blender-build-log.json"), "w") as fh: json.dump(log, fh, indent=1)
print("BUILD_LOG", json.dumps(log))
