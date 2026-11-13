"""Run on the SAVED file: blender.exe -b kai-south-rig-pilot.blend --python scripts/blender_verify.py
Checks structure against rig-spec.json, re-renders 3 keyed frames, applies a new edit pose and renders it.
Never saves the .blend."""
import bpy, json, math, os, sys
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(os.path.join(KIT, "rig-spec.json")))
frames = json.load(open(os.path.join(KIT, "scripts", "poses.json")))
OUT = os.path.join(KIT, "qa", "blender-verify"); os.makedirs(OUT, exist_ok=True)
v = {"opened_file": bpy.data.filepath, "checks": {}}
c = v["checks"]
arm = bpy.data.objects.get("KaiSouth_Rig")
c["armature_present"] = arm is not None and arm.type == "ARMATURE"
spec_b = {b["name"]: b["parent"] for b in spec["bones"]}
got_b = {b.name: (b.parent.name if b.parent else None) for b in arm.data.bones}
c["bone_names_and_parents_match_spec"] = spec_b == got_b
parts = {p["id"]: p for p in spec["parts"]}
objs = {o.name: o for o in bpy.data.objects if o.get("rig_part_id")}
c["part_objects_match_spec"] = set(objs) == set(parts)
c["part_parent_bones_match_spec"] = all(objs[k].parent == arm and objs[k].parent_bone == parts[k]["bone"] for k in objs)
c["all_images_packed"] = all(im.packed_file is not None for im in bpy.data.images if im.source == "FILE")
c["image_paths_relative"] = all(im.filepath.startswith("//") for im in bpy.data.images if im.source == "FILE")
c["image_sizes_match_spec"] = all(tuple(bpy.data.images[k].size) == tuple(parts[k]["size_px"]) for k in parts)
act = arm.animation_data.action if arm.animation_data else None
c["action_present"] = act is not None and act.name == "KaiSouth_QA_and_Debug"
c["markers_match_frames"] = [m.name for m in sorted(bpy.context.scene.timeline_markers, key=lambda m: m.frame)] == [f["name"] for f in frames]
scene = bpy.context.scene
names = [f["name"] for f in frames]
for n in ("neutral", "crouch_knees_out", "jab_02"):
    scene.frame_set(names.index(n) + 1)
    scene.render.filepath = os.path.join(OUT, f"reopen-{n}.png"); bpy.ops.render.render(write_still=True)
# edit: a new pose not in the action (drop animation so manual pose is used), render it
arm.animation_data.action = None
for pb in arm.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
arm.pose.bones["upper_arm_n"].rotation_euler[2] = math.radians(-120)
arm.pose.bones["forearm_n"].rotation_euler[2] = math.radians(45)
arm.pose.bones["thigh_f"].rotation_euler[2] = math.radians(30)
for o in objs.values(): o.animation_data_clear() if o.animation_data else None
for k in objs: objs[k].hide_render = not parts[k]["default_visible"]
bpy.context.view_layer.update()
hw = arm.matrix_world @ arm.pose.bones["hand_n"].head
PX = spec["scale"]["blender_units_per_px"]
v["edit_pose_hand_n_pivot_char_px"] = [round(hw.x / PX, 4), round(-hw.z / PX, 4)]
scene.render.filepath = os.path.join(OUT, "edit-pose.png"); bpy.ops.render.render(write_still=True)
v["edit_pose"] = {"upper_arm_n": -120, "forearm_n": 45, "thigh_f": 30}
v["pass"] = all(c.values())
with open(os.path.join(KIT, "qa", "blender-verify.json"), "w") as fh: json.dump(v, fh, indent=1)
print("VERIFY", json.dumps(v))
