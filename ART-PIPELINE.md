# Art Pipeline · Source truth and approvals

No user-approved final character art was attached to this B00 request. **All included PNGs are synthetic engineering stand-ins drawn with Pillow.** The generator script is under `art-source/create-placeholders.py`. `public/art/placeholders/provenance.json` marks them unapproved.

Next gates: (1) user supplies/approves exact original Kai master; (2) Codex generates original four-direction source views and separate joint-complete parts through an authorized real image tool, not fake SVG/ImageGen claims; (3) Claude Code validates directional rigs in Blender; (4) render frame sheets with pixel-perfect transparency and consistent feet anchors; (5) inspect normal-speed motion *inside* the Phaser arena. The previously discussed side-profile Blender cutout toolkit cannot be assumed to support north/south/east/west without new engineering.

The `src/assets/animationManifest.ts` contract is B00's **v1 debug adapter only**. A production frame manifest requires per-animation sheet URI, dimensions, frame count, FPS, origin, collider profile, source and event markers. B03 should version and migrate this schema rather than silently overloading debug texture paths.
