# Claude Code task: Audit, install and use the right game asset tools

Work inside the **currently opened game repository**. I want you to take ownership of evaluating and setting up the asset-creation/integration workflow, then continue making and integrating useful assets. Do not just give me instructions or a theoretical plan: perform the work that is feasible in this environment, and report blockers precisely.

## Repositories to evaluate (do not install them all)

- Jolt Physics — https://github.com/jrouwe/JoltPhysics
- Terrain3D — https://github.com/TokisanGames/Terrain3D
- Material Maker — https://github.com/RodZill4/material-maker
- Effekseer — https://github.com/effekseer/Effekseer
- Voxel Tools — https://github.com/Zylann/godot_voxel
- Recast Navigation — https://github.com/recastnavigation/recastnavigation
- ozz-animation — https://github.com/guillaumeblanc/ozz-animation
- The Forge — https://github.com/ConfettiFX/The-Forge
- meshoptimizer — https://github.com/zeux/meshoptimizer
- FastNoise2 — https://github.com/Auburn/FastNoise2

Also consider Tiled or LDtk for 2D maps only if they solve an actual need.

## Execute in this order

1. **Inspect first:** Read the project architecture, engine/framework, build scripts, asset directories, existing sprites, art conventions, tests, and any project instructions. Identify what the game actually needs and which of the above tools fit this stack. If it uses React/TypeScript/Phaser, stay with that architecture and do not introduce Godot or a native C++ rendering/physics stack.
2. **Choose a minimal toolchain:** Make a short decision table: useful now / maybe later / not appropriate, including reasons, installation method, licenses, and integration risks. Prefer existing engine functionality and simple scripts over unnecessary dependencies.
3. **Install only what is necessary:** Use project-local dependencies, version-pinned tooling, or portable applications where possible. Do not globally install programs, use administrator privileges, make persistent system-wide configuration changes, or invoke unverified installation scripts without obtaining my approval. Explain any permission or manual GUI steps you cannot complete. Only use official sources. Do not disable security checks.
4. **Build a repeatable asset workflow:** Make generators, scripts, export presets and documentation where appropriate, so assets can be rebuilt later. If Effekseer is useful, try producing a small representative effect and exporting it as an image/sprite sheet for the actual game engine. If the environment cannot drive the editor, do not pretend an export succeeded; produce the useful setup/scripts possible and tell me the exact manual step.
5. **Continue the actual game assets:** Prioritize the most visibly unfinished or placeholder areas of the current game's art pipeline. Preserve existing finished artwork, established visual style, scale, transparent backgrounds, and existing naming conventions. For character art, maintain separate source/output PNGs per character, pose, animation and world role as the game requires. Never replace distinctive character sprites with generic procedural graphics just to claim completion. Use real available image-generation/art tools when needed; if absent, state that limitation and focus on effects, integration, or asset preparation.
6. **Integrate and verify:** Integrate useful outputs into the game, update asset references safely, and run relevant build/tests and available visual checks. Make sure transparency, frame size, origin, animation pacing, hit timing, file size and existing game saves are preserved. Add a representative test where practical.
7. **Report concretely:** List exactly what you installed (global versus local), what files you created or changed, which finished assets are actually integrated, what was tested, licensing/attribution requirements, and what remains manual. Do not claim any unverified test or created asset exists.

## Guardrails

- No engine migration or broad refactor.
- No wholesale replacement of existing art or removal of working assets.
- Do not download unlicensed third-party game art or claim it was original.
- Do not commit, push, deploy, or delete substantial files without my explicit instruction.
- Keep the work scoped to this project and do not install tools that do not demonstrably help it.
- If the full artwork workflow is blocked by missing graphics-generation capabilities, continue with all safe executable setup and integration steps and give me an exact, concise blocker report.

**Success means:** a small, genuinely improved and working slice of the game art pipeline with files and tests to demonstrate it—not a list of impressive tools installed for no reason.
