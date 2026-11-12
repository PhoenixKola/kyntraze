# Animation manifest v1 · DEBUG PLACEHOLDERS ONLY

`src/assets/animationManifest.ts` declares four direction-specific static image paths and `approved: false`. The manifest **does not** assert animation, Blender Action names, frame counts, real pivots or rig compatibility.

B03 production schema proposal: `version`, `characterId`, `formId`, `direction`, `animationId`, `sheet`, `frameWidth`, `frameHeight`, `frames`, `fps`, `loop`, `origin`, `events`, `collisionProfile`, `sourceRig`, `authoringMode`. Commit golden screenshots and normal-speed video before calling animation production-ready. Do not conflate existing side-view Blender cutout rigs with an overhead four-view sheet.
