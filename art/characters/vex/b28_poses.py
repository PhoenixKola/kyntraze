"""B28 Vex combat poses as plain data, shared by rig/anim_b28.py (SOUTH) and rig_dirs/danim_b28.py (NORTH / EAST / WEST).
Two authored sets selected by VEX_STYLE: 'f1' Riftbound (aggressive, blade and claw cuts, low planted stance) and 'f2' Voidheart Exile (composed, upright, long economical gestures, hovering feet).
A pose is a dict: body numbers + fist targets. s = SOUTH targets ((near x, y), (far x, y), near slot, far slot, pref), x relative to the body centre, y up-negative sprite px.
e = EAST targets ((lead x, y), (rear x, y), lead slot, rear slot, pref) (WEST flips by the facing sign, NORTH derives from east). fl = free legs {'rear': (dx, dy), 'lead': (dx, dy)} (rear = near leg in SOUTH).
lift / rot = airborne body (pelvis hangs `lift` px high and pitches `rot` degrees); none = rest stance. Clip dict: name, fps, loop, events, n frames, keys [(frame, pose or None)] tweened, or frames [pose...] used as is."""
import math

def pose(pel=(0, 0), che=(0, 0), hea=(0, 0), sash=0.0, spine=0.0, hrot=0.0, lean=0, lg=(0, 0), fl=None, lift=0.0, rot=0.0, s=None, e=None):
    return dict(pel=pel, che=che, hea=hea, sash=sash, spine=spine, hrot=hrot, lean=lean, lg=lg, fl=fl, lift=lift, rot=rot, s=s, e=e)

def clip(name, fps, loop, events, n, keys=None, frames=None): return dict(name=name, fps=fps, loop=loop, events=events, n=n, keys=keys, frames=frames)

# ====================================================================== RIFTBOUND (f1)
def riftbound():
    out = []
    W = (-3, 3); SW = (4, -2)
    # ---- Phantom Edge beat 1: near cut. Blade drawn back high on the near side, then it cuts across low and wide.
    out.append(clip("Strike1", 24, False, {"coil": 1, "release": 3, "recover_start": 6, "interruptible_from": 8}, 12, keys=[
        (0, None),
        (1, pose((-1, 5), (-1, 3), (0, 1), sash=8, spine=4, lg=W, s=((-26, -104), (14, -78), "angle", "guard", "outdown"), e=((14, -78), (-30, -98), "guard", "angle", "outdown"))),
        (3, pose((3, 5), (3, 3), (2, 2), sash=-26, spine=-7, lg=SW, s=((-52, -62), (16, -80), "side", "guard", "out"), e=((18, -80), (56, -64), "guard", "side", "out"))),
        (5, pose((3, 5), (3, 3), (2, 2), sash=-30, spine=-8, lg=SW, s=((-54, -58), (16, -80), "side", "guard", "out"), e=((18, -80), (58, -60), "guard", "side", "out"))),
        (8, pose((1, 4), (1, 3), sash=-8, lg=W, s=((-30, -76), (14, -76), "angle", "guard"), e=((14, -76), (-4, -70), "guard", "angle"))),
        (11, None)]))
    # ---- beat 2: claw. The far hand rakes out and down in a hooked swipe while the blade guards.
    out.append(clip("Strike2", 24, False, {"coil": 1, "release": 4, "recover_start": 7, "interruptible_from": 9}, 14, keys=[
        (0, None),
        (2, pose((-2, 6), (-2, 4), (-1, 2), sash=-8, spine=-5, lg=W, s=((-22, -84), (26, -112), "angle", "angle", "outdown"), e=((26, -112), (-16, -78), "angle", "guard", "outdown"))),
        (4, pose((3, 7), (3, 5), (2, 3), sash=22, spine=8, lg=SW, s=((-20, -80), (50, -60), "angle", "side", "out"), e=((62, -62), (-12, -76), "side", "guard", "out"))),
        (6, pose((3, 7), (3, 5), (2, 3), sash=26, spine=9, lg=SW, s=((-20, -80), (52, -56), "angle", "side", "out"), e=((64, -58), (-12, -76), "side", "guard", "out"))),
        (9, pose((1, 5), (1, 3), sash=6, lg=W, s=((-26, -74), (18, -78), "angle", "angle"), e=((16, -78), (-8, -72), "angle", "guard"))),
        (13, None)]))
    # ---- beat 3: paired cross. Both arms sweep out in a scissor; the body lunges through it.
    out.append(clip("Strike3", 24, False, {"coil": 1, "release": 4, "recover_start": 7, "interruptible_from": 10}, 14, keys=[
        (0, None),
        (2, pose((0, 7), (0, 5), (0, 2), sash=-6, lg=(-4, 4), s=((6, -72), (-2, -74), "angle", "angle", "outdown"), e=((6, -74), (10, -70), "angle", "angle", "outdown"))),
        (4, pose((2, 8), (2, 6), (1, 3), sash=-28, spine=-6, lg=(5, -5), s=((-58, -94), (60, -96), "side", "side", "out"), e=((66, -96), (50, -84), "side", "side", "out"))),
        (6, pose((2, 8), (2, 6), (1, 3), sash=-32, spine=-7, lg=(5, -5), s=((-60, -96), (62, -98), "side", "side", "out"), e=((68, -98), (52, -86), "side", "side", "out"))),
        (10, pose((0, 5), (0, 3), sash=-8, lg=W, s=((-24, -72), (24, -74), "angle", "angle"), e=((18, -76), (0, -70), "angle", "angle"))),
        (13, None)]))
    # ---- beat 4: the curved finisher. Blade high overhead, then a deep downward arc to the ground in front; the far fist counterweights.
    out.append(clip("Strike4", 24, False, {"coil": 2, "release": 5, "recover_start": 9, "interruptible_from": 12}, 16, keys=[
        (0, None),
        (2, pose((0, 8), (0, 5), (0, 2), sash=10, spine=5, lg=(-4, 4), s=((-16, -146), (22, -92), "angle", "angle", "outdown"), e=((22, -92), (-6, -148), "angle", "angle", "outdown"))),
        (3, pose((-1, 9), (-1, 6), (0, 3), sash=14, spine=7, lg=(-5, 5), s=((-12, -156), (24, -96), "angle", "angle", "outdown"), e=((24, -96), (-10, -156), "angle", "angle", "outdown"))),
        (5, pose((3, 16), (3, 12), (3, 8), sash=-34, spine=-9, lg=(5, -4), s=((-16, -36), (30, -82), "front", "angle", "out"), e=((30, -84), (50, -34), "angle", "front", "out"))),
        (7, pose((3, 17), (3, 13), (3, 9), sash=-38, spine=-9, lg=(5, -4), s=((-16, -34), (30, -82), "front", "angle", "out"), e=((30, -84), (52, -32), "angle", "front", "out"))),
        (11, pose((1, 8), (1, 5), sash=-10, lg=W, s=((-22, -66), (20, -78), "angle", "angle"), e=((18, -78), (14, -62), "angle", "angle"))),
        (15, None)]))
    # ---- Q Mirror Guard: crossed-blade brace, planted wide and low; the held frames 6-11 tremble.
    brace = lambda d: pose((0, 10 + d), (0, 7 + d), (0, 3 + d), sash=6 + 2 * d, spine=-2, lg=(-6, 6), s=((-24, -102 + d), (22, -98 + d), "angle", "angle", "outdown"), e=((24, -98 + d), (-18, -96 + d), "angle", "angle", "outdown"))
    fr = []
    out.append(clip("CastQ", 16, False, {"coil": 2, "hold": 6, "hold_end": 11, "release": 6, "recover_start": 12, "interruptible_from": 12}, 14, keys=[
        (0, None), (2, pose((0, 6), (0, 4), (0, 1), sash=4, lg=(-4, 4), s=((-20, -84), (18, -80), "angle", "angle", "outdown"), e=((18, -80), (-14, -80), "angle", "angle", "outdown"))), (5, brace(0)), (6, brace(0)),
        (7, brace(1)), (8, brace(0)), (9, brace(-1)), (10, brace(0)), (11, brace(1)), (13, pose((0, 4), (0, 2), sash=2, lg=(-3, 3), s=((-24, -78), (16, -78), "angle", "angle"), e=((16, -78), (-12, -76), "angle", "angle")))]))
    # ---- E Rift Execution: coil low with the blade drawn back, then the strike through the target (body extended), blade hanging out long.
    out.append(clip("CastE", 22, False, {"coil": 2, "release": 5, "recover_start": 9, "interruptible_from": 12}, 16, keys=[
        (0, None),
        (3, pose((-3, 12), (-3, 8), (-2, 4), sash=12, spine=7, lg=(-5, 5), s=((-34, -112), (14, -66), "angle", "angle", "outdown"), e=((14, -66), (-30, -114), "angle", "angle", "outdown"))),
        (5, pose((6, 5), (7, 4), (5, 2), sash=-34, spine=-11, lg=(7, -6), s=((-62, -70), (10, -88), "side", "guard", "out"), e=((12, -90), (70, -70), "guard", "side", "out"))),
        (7, pose((7, 5), (8, 4), (5, 2), sash=-38, spine=-12, lg=(7, -6), s=((-64, -66), (10, -88), "side", "guard", "out"), e=((12, -90), (72, -66), "guard", "side", "out"))),
        (11, pose((3, 6), (3, 4), sash=-14, lg=(3, -2), s=((-40, -78), (16, -78), "angle", "angle"), e=((20, -78), (30, -70), "angle", "angle"))),
        (15, None)]))
    # ---- R Oath of Ruin: blade raised overhead, then driven point-down into the ground; hold the plant, rise.
    out.append(clip("CastR", 20, False, {"coil": 3, "release": 7, "hold": 8, "recover_start": 12, "interruptible_from": 15}, 18, keys=[
        (0, None),
        (3, pose((0, 6), (0, 4), (0, 2), sash=-6, lg=(-4, 4), s=((-18, -118), (20, -92), "angle", "angle", "outdown"), e=((20, -92), (-8, -118), "angle", "angle", "outdown"))),
        (5, pose((0, 3), (0, 0), (0, -1), sash=-10, spine=3, lg=(-4, 4), s=((-12, -158), (22, -96), "angle", "angle", "out"), e=((22, -96), (-4, -158), "angle", "angle", "out"))),
        (7, pose((0, 20), (0, 15), (0, 9), sash=-34, spine=-3, lg=(-8, 8), s=((-10, -30), (24, -80), "front", "angle", "out"), e=((24, -82), (36, -30), "angle", "front", "out"))),
        (10, pose((0, 20), (0, 15), (0, 9), sash=-38, spine=-3, lg=(-8, 8), s=((-10, -28), (24, -80), "front", "angle", "out"), e=((24, -82), (36, -28), "angle", "front", "out"))),
        (14, pose((0, 8), (0, 5), sash=-8, lg=(-4, 4), s=((-20, -66), (18, -78), "angle", "angle"), e=((18, -78), (6, -62), "angle", "angle"))),
        (17, None)]))
    # ---- V Abyssal Fang charge: blade hauled back high behind the shoulder, the body coiled low; the hold frames 5-11 loop.
    hold = lambda d: pose((-2, 13 + d), (-3, 9 + d), (-2, 5 + d), sash=14 + 2 * d, spine=8, lg=(-6, 6), s=((-30, -124 + d), (16, -70), "angle", "angle", "outdown"), e=((16, -70), (-34, -122 + d), "angle", "angle", "outdown"))
    out.append(clip("VCharge", 14, False, {"coil": 1, "hold": 5, "hold_end": 11, "recover_start": 11, "interruptible_from": 11}, 12, frames=[
        None, pose((-1, 6), (-1, 4), (0, 2), sash=6, spine=3, lg=(-4, 4), s=((-22, -96), (16, -74), "angle", "angle", "outdown"), e=((16, -74), (-22, -96), "angle", "angle", "outdown")),
        hold(0), hold(1), hold(0), hold(0), hold(1), hold(0), hold(-1), hold(0), hold(1), hold(0)]))
    # ---- V release: the lunge and long thrust, then recover.
    out.append(clip("VRelease", 24, False, {"release": 2, "recover_start": 7, "interruptible_from": 9}, 12, keys=[
        (0, hold(0)),
        (2, pose((6, 6), (7, 4), (5, 2), sash=-38, spine=-13, lg=(8, -7), s=((-66, -78), (10, -86), "side", "guard", "out"), e=((10, -88), (74, -78), "guard", "side", "out"))),
        (4, pose((7, 6), (8, 4), (6, 2), sash=-42, spine=-14, lg=(8, -7), s=((-68, -76), (10, -86), "side", "guard", "out"), e=((10, -88), (76, -76), "guard", "side", "out"))),
        (8, pose((3, 6), (3, 4), sash=-14, lg=(3, -2), s=((-40, -78), (16, -78), "angle", "angle"), e=((20, -78), (30, -70), "angle", "angle"))),
        (11, None)]))
    out += flight("f1")
    return out

# ====================================================================== VOIDHEART EXILE (f2)
def voidheart():
    out = []
    U = (-2, 2)   # a still, narrow stance: Voidheart does not plant and lunge, it stands and judges
    # ---- Invisible Judgment beat 1: the far hand lifts and flicks across, a single clean "cut" made from a distance.
    out.append(clip("Strike1", 22, False, {"coil": 1, "release": 3, "recover_start": 6, "interruptible_from": 8}, 12, keys=[
        (0, None),
        (1, pose((0, 1), (0, 1), (0, 0), sash=4, spine=-2, lg=U, s=((-16, -58), (18, -92), "angle", "angle", "outdown"), e=((18, -92), (-10, -60), "angle", "guard", "outdown"))),
        (3, pose((1, 2), (1, 1), (1, 0), sash=-14, spine=-4, lg=U, s=((-16, -58), (50, -96), "angle", "side", "out"), e=((62, -96), (-10, -60), "side", "guard", "out"))),
        (5, pose((1, 2), (1, 1), (1, 0), sash=-16, spine=-4, lg=U, s=((-16, -58), (52, -92), "angle", "side", "out"), e=((64, -92), (-10, -60), "side", "guard", "out"))),
        (8, pose((0, 1), (0, 1), sash=-4, lg=U, s=((-16, -60), (24, -84), "angle", "angle"), e=((24, -84), (-8, -62), "angle", "angle"))),
        (11, None)]))
    out.append(clip("Strike2", 22, False, {"coil": 1, "release": 4, "recover_start": 7, "interruptible_from": 9}, 14, keys=[
        (0, None),
        (2, pose((0, 1), (0, 1), (0, 0), sash=-4, spine=2, lg=U, s=((-28, -108), (16, -64), "angle", "angle", "outdown"), e=((16, -64), (-24, -108), "angle", "angle", "outdown"))),
        (4, pose((-1, 2), (-1, 1), (-1, 0), sash=14, spine=4, lg=U, s=((-56, -90), (16, -64), "side", "angle", "out"), e=((16, -64), (50, -86), "angle", "side", "out"))),
        (6, pose((-1, 2), (-1, 1), (-1, 0), sash=16, spine=4, lg=U, s=((-58, -86), (16, -64), "side", "angle", "out"), e=((16, -64), (52, -82), "angle", "side", "out"))),
        (9, pose((0, 1), (0, 1), sash=4, lg=U, s=((-24, -66), (18, -70), "angle", "angle"), e=((20, -70), (4, -66), "angle", "angle"))),
        (13, None)]))
    # ---- beat 3: both hands draw a cross, low outward to high apart.
    out.append(clip("Strike3", 22, False, {"coil": 1, "release": 4, "recover_start": 7, "interruptible_from": 10}, 14, keys=[
        (0, None),
        (2, pose((0, 2), (0, 1), (0, 0), sash=-4, lg=U, s=((-30, -42), (30, -42), "angle", "angle", "outdown"), e=((34, -42), (10, -40), "angle", "angle", "outdown"))),
        (4, pose((0, 1), (0, 0), (0, -1), sash=-18, lg=U, s=((-46, -112), (48, -112), "side", "side", "out"), e=((58, -112), (40, -98), "side", "side", "out"))),
        (6, pose((0, 1), (0, 0), (0, -1), sash=-20, lg=U, s=((-48, -114), (50, -114), "side", "side", "out"), e=((60, -114), (42, -100), "side", "side", "out"))),
        (10, pose((0, 1), (0, 1), sash=-4, lg=U, s=((-22, -70), (22, -70), "angle", "angle"), e=((20, -72), (2, -66), "angle", "angle"))),
        (13, None)]))
    # ---- beat 4: the decree. Both hands raised over the head, pressed straight down through the air; a slight rise and settle.
    out.append(clip("Strike4", 22, False, {"coil": 2, "release": 5, "recover_start": 9, "interruptible_from": 12}, 16, keys=[
        (0, None),
        (2, pose((0, -1), (0, -1), (0, -1), sash=6, lg=U, s=((-12, -150), (14, -150), "angle", "angle", "out"), e=((22, -150), (4, -152), "angle", "angle", "out"))),
        (3, pose((0, -2), (0, -2), (0, -2), sash=10, spine=3, lg=U, s=((-12, -164), (14, -164), "angle", "angle", "out"), e=((22, -164), (4, -166), "angle", "angle", "out"))),
        (5, pose((0, 5), (0, 3), (0, 2), sash=-24, spine=-4, lg=(-3, 3), s=((-14, -46), (16, -48), "front", "front", "out"), e=((40, -46), (24, -44), "front", "front", "out"))),
        (7, pose((0, 5), (0, 3), (0, 2), sash=-26, spine=-4, lg=(-3, 3), s=((-14, -44), (16, -46), "front", "front", "out"), e=((42, -44), (26, -42), "front", "front", "out"))),
        (11, pose((0, 2), (0, 1), sash=-6, lg=U, s=((-20, -64), (20, -68), "angle", "angle"), e=((20, -70), (4, -64), "angle", "angle"))),
        (15, None)]))
    # ---- Q Phantom Legion: arms low and open, then both sweep up and out as the copies step from the air; hold open, settle.
    out.append(clip("CastQ", 18, False, {"coil": 2, "hold": 7, "hold_end": 11, "release": 6, "recover_start": 12, "interruptible_from": 12}, 14, keys=[
        (0, None),
        (2, pose((0, 3), (0, 2), (0, 0), sash=4, lg=U, s=((-24, -40), (26, -40), "angle", "angle", "outdown"), e=((30, -40), (8, -40), "angle", "angle", "outdown"))),
        (4, pose((0, 1), (0, 0), (0, -1), sash=-10, lg=U, s=((-40, -82), (42, -82), "side", "side", "out"), e=((50, -82), (30, -78), "side", "side", "out"))),
        (6, pose((0, -1), (0, -2), (0, -2), sash=-16, spine=-2, lg=U, s=((-58, -116), (60, -116), "side", "side", "out"), e=((64, -116), (44, -108), "side", "side", "out"))),
        (10, pose((0, -1), (0, -2), (0, -2), sash=-18, lg=U, s=((-60, -118), (62, -118), "side", "side", "out"), e=((66, -118), (46, -110), "side", "side", "out"))),
        (13, None)]))
    # ---- E Dimensional Severance: one arm up, a long straight stroke down through the lane, the other hand at the hip.
    out.append(clip("CastE", 20, False, {"coil": 2, "release": 5, "recover_start": 9, "interruptible_from": 12}, 16, keys=[
        (0, None),
        (3, pose((0, 1), (0, 0), (0, 0), sash=6, spine=2, lg=U, s=((-14, -56), (24, -134), "angle", "angle", "outdown"), e=((24, -150), (-6, -60), "angle", "angle", "outdown"))),
        (5, pose((2, 3), (2, 2), (1, 1), sash=-26, spine=-6, lg=(-3, 3), s=((-14, -58), (54, -58), "angle", "side", "out"), e=((66, -58), (-4, -62), "side", "angle", "out"))),
        (8, pose((2, 3), (2, 2), (1, 1), sash=-28, spine=-6, lg=(-3, 3), s=((-14, -58), (56, -54), "angle", "side", "out"), e=((68, -54), (-4, -62), "side", "angle", "out"))),
        (11, pose((1, 2), (1, 1), sash=-8, lg=U, s=((-18, -64), (24, -74), "angle", "angle"), e=((24, -76), (2, -62), "angle", "angle"))),
        (15, None)]))
    # ---- R Domain of the Exile: arms spread wide, a slow rise, head tilted up; held while the domain stands.
    out.append(clip("CastR", 18, False, {"coil": 3, "release": 6, "hold": 7, "recover_start": 13, "interruptible_from": 15}, 18, keys=[
        (0, None),
        (3, pose((0, 3), (0, 2), (0, 1), sash=4, lg=U, s=((-20, -44), (22, -44), "angle", "angle", "outdown"), e=((26, -44), (4, -42), "angle", "angle", "outdown"))),
        (6, pose((0, -2), (0, -3), (0, -3), sash=-18, spine=-3, hrot=-6, lg=U, s=((-62, -104), (64, -104), "side", "side", "out"), e=((68, -104), (48, -92), "side", "side", "out"))),
        (9, pose((0, -3), (0, -4), (0, -4), sash=-22, spine=-4, hrot=-7, lg=U, s=((-66, -112), (68, -112), "side", "side", "out"), e=((72, -112), (52, -98), "side", "side", "out"))),
        (13, pose((0, -2), (0, -3), (0, -3), sash=-18, spine=-3, hrot=-6, lg=U, s=((-64, -108), (66, -108), "side", "side", "out"), e=((70, -108), (50, -96), "side", "side", "out"))),
        (17, None)]))
    # ---- V Event Horizon charge: both hands cupped around a small core before the chest; hold frames loop with a slow tremble.
    cup = lambda d: pose((0, 2 + d), (0, 1 + d), (0, 0), sash=6 + d, spine=2, lg=U, s=((-8, -78 + d), (12, -80 + d), "front", "front", "out"), e=((22, -80 + d), (14, -76 + d), "front", "front", "out"))
    out.append(clip("VCharge", 14, False, {"coil": 1, "hold": 5, "hold_end": 11, "recover_start": 11, "interruptible_from": 11}, 12, frames=[
        None, pose((0, 1), (0, 1), (0, 0), sash=3, lg=U, s=((-18, -62), (20, -64), "angle", "angle", "outdown"), e=((24, -62), (8, -60), "angle", "angle", "outdown")),
        cup(0), cup(1), cup(0), cup(-1), cup(0), cup(1), cup(0), cup(-1), cup(0), cup(1)]))
    # ---- V release: one arm drives out to throw the core, the other stays at the chest.
    out.append(clip("VRelease", 22, False, {"release": 2, "recover_start": 7, "interruptible_from": 9}, 12, keys=[
        (0, cup(0)),
        (2, pose((2, 3), (2, 2), (1, 1), sash=-28, spine=-6, lg=(-3, 3), s=((-10, -70), (62, -84), "front", "side", "out"), e=((74, -84), (4, -70), "side", "front", "out"))),
        (4, pose((2, 3), (2, 2), (1, 1), sash=-30, spine=-6, lg=(-3, 3), s=((-10, -70), (64, -82), "front", "side", "out"), e=((76, -82), (4, -70), "side", "front", "out"))),
        (8, pose((1, 2), (1, 1), sash=-8, lg=U, s=((-18, -66), (24, -76), "angle", "angle"), e=((24, -76), (2, -64), "angle", "angle"))),
        (11, None)]))
    # ---- Hover idle (loop): feet hang off the ground a few px, slow breath, composed hands.
    fr = []
    for i in range(12):
        t = 2 * math.pi * i / 12; b = math.sin(t)
        fr.append(pose((0, 0), (0, 0), (0, 0), sash=5 * math.sin(t - 1.4), hrot=1.0 * math.sin(t - 0.8), lift=7 + 1.6 * b, fl={"rear": (-2 + math.sin(t - 0.5), -9), "lead": (3 - math.sin(t), -12)},
                       s=((-18, -62 + round(b)), (20, -64 + round(b)), "angle", "angle", "outdown"), e=((22, -64 + round(b)), (4, -62 + round(b)), "angle", "angle", "outdown")))
    out.append(clip("Hover", 10, True, {}, 12, frames=fr))
    # ---- Blink: the teleport-like step, a narrow stretched lean with both arms trailing; played over the dash path.
    out.append(clip("Blink", 24, False, {"coil": 0, "release": 2, "recover_start": 4, "interruptible_from": 6}, 8, keys=[
        (0, None),
        (1, pose((-2, 2), (-2, 1), (-1, 0), sash=14, spine=8, lg=(-3, 3), s=((-28, -50), (26, -52), "angle", "angle", "outdown"), e=((-6, -60), (-24, -56), "angle", "angle", "outdown"))),
        (2, pose((5, 1), (6, 0), (4, -1), sash=-30, spine=-10, lg=(8, -8), s=((-12, -86), (16, -88), "front", "front", "out"), e=((70, -92), (56, -88), "side", "side", "out"))),
        (4, pose((5, 1), (6, 0), (4, -1), sash=-30, spine=-10, lg=(8, -8), s=((-12, -86), (16, -88), "front", "front", "out"), e=((72, -92), (58, -88), "side", "side", "out"))),
        (6, pose((1, 2), (1, 1), sash=-6, lg=U, s=((-20, -66), (22, -68), "angle", "angle"), e=((20, -70), (2, -64), "angle", "angle"))),
        (7, None)]))
    out += flight("f2")
    return out

# ---- flight (Takeoff / Glide / Dive), per style. Riftbound: blade-first, leaning hard into it. Voidheart: upright, arms low and calm, the mantle and legs trailing.
def flight(style):
    out = []
    f1 = style == "f1"
    crouch = pose((0, 12), (0, 8), (0, 4), sash=-8, lg=(-3, 3), s=((-18, -52), (18, -54), "angle", "angle", "outdown"), e=((18, -54), (-8, -52), "angle", "angle", "outdown"))
    arms_l = ((-30, -108), (50, -124), "angle", "side", "out") if f1 else ((-24, -64), (28, -66), "angle", "angle", "outdown")
    arms_e = ((60, -118), (-8, -84), "side", "guard", "out") if f1 else ((20, -60), (-6, -58), "angle", "angle", "outdown")
    rot0 = 18 if f1 else 8
    launch = pose(sash=-24, lift=26, rot=rot0 * 0.55, fl={"rear": (-4, -36), "lead": (-14, -42)}, s=arms_l, e=arms_e)
    airp = pose(sash=-34, lift=36, rot=rot0, fl={"rear": (-16, -50), "lead": (-28, -56)}, s=arms_l, e=arms_e)
    out.append(clip("Takeoff", 20, False, {"coil": 2, "release": 4, "recover_start": 7, "interruptible_from": 9}, 10, keys=[(0, None), (2, crouch), (4, launch), (7, airp), (9, airp)]))
    fr = []
    for i in range(4):
        t = 2 * math.pi * i / 4; sw, cw = math.sin(t), math.cos(t)
        fr.append(pose(sash=22 * cw, lift=36 + round(1.6 * sw), rot=20 if f1 else 10, fl={"rear": (-18 + round(cw * 2), -52), "lead": (-34 - round(cw * 2), -60 - round(2 * cw))},
                       s=((((-34, -104 + round(sw)), (56, -120 + round(2 * cw)), "angle", "side", "out")) if f1 else ((-22, -66 + round(sw)), (26, -66 + round(sw)), "angle", "angle", "outdown")),
                       e=(((62, -120 + round(2 * sw)), (-6, -82), "side", "guard", "out") if f1 else ((20, -62 + round(sw)), (-4, -60 + round(sw)), "angle", "angle", "outdown"))))
    out.append(clip("Glide", 10, True, {}, 4, frames=fr))
    aim = pose(lift=34, rot=24 if f1 else 12, sash=-26, fl={"rear": (-10, -44), "lead": (-24, -52)}, s=((-14, -82), (36, -70), "angle", "side", "out"), e=((40, -74), (6, -76), "side", "guard", "out"))
    fall = pose(lift=26, rot=30 if f1 else 16, sash=-34, fl={"rear": (-8, -40), "lead": (-22, -48)}, s=((-6, -62), (30, -50), "side", "side", "out"), e=((44, -54), (24, -52), "side", "side", "out"))
    land = lambda d: pose((0, 14 + d), (0, 11 + d), (0, 6 + d), sash=-30 - 3 * d, lg=(3, -3), s=((-6, -34), (22, -34), "front", "front", "out"), e=((46, -36), (8, -34), "side", "side", "out"))
    rec = pose((0, 8), (0, 5), (0, 3), sash=-10, lg=(3, -3), s=((-14, -62), (18, -60), "angle", "angle", "out"), e=((34, -60), (14, -58), "side", "side", "out"))
    out.append(clip("Dive", 22, False, {"gather_start": 0, "hold": 2, "release": 7, "recover_start": 10, "interruptible_from": 15}, 20, keys=[(0, None), (2, aim), (5, fall), (7, land(0)), (10, land(1)), (14, rec), (19, None)]))
    return out

NEUTRAL = pose(s=((-14, -66), (12, -78), "angle", "angle", "outdown"), e=((16, -76), (-2, -68), "angle", "angle", "outdown"))
def _tail(cs):
    """a non-looping clip ends on a solved guard pose (not the raw rest arms) so the arm lerp never swings through a different angle branch on the way home"""
    for c in cs:
        if c["keys"] and c["keys"][-1][1] is None and len(c["keys"]) > 1: c["keys"][-1] = (c["keys"][-1][0], NEUTRAL)
    return cs
SETS = {"f1": lambda: _tail(riftbound()), "f2": lambda: _tail(voidheart())}
NEW = {"f1": ("Strike1", "Strike2", "Strike3", "Strike4", "CastQ", "CastE", "CastR", "VCharge", "VRelease", "Takeoff", "Glide", "Dive"),
       "f2": ("Strike1", "Strike2", "Strike3", "Strike4", "CastQ", "CastE", "CastR", "VCharge", "VRelease", "Takeoff", "Glide", "Dive", "Hover", "Blink")}
