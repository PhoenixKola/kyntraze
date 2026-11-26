# B35: owner-review fixes after B33 / B34

Done solo, not committed or pushed (B33 `e8469bf` and B34 `d12de3e` are pushed).

- Loading screen: the objective moved into the footer stack, so it can no longer overlap the progress line; the destination card shrinks a little when an objective is shown (`LoadingScreen.tsx`, `b31.css`).
- Chronicles: the scrolling map no longer clips the lifted card or its glow (`b31.css`).
- `?unlock=all`: also marks every Chronicles chapter, the finale included, as completed (`SaveSystem.ts`, own QA store only).
- Ren north: the north upper-body layer floats 1-3 sheet rows above the hips in the moving-attack pose; the legs layer is nudged up two pixels for Ren facing north. Ashen Eclipse north: the generated rear-hair lobe stuck out to the right of the head, so it now uses the Ascendant north rear-hair silhouette recoloured to the Eclipse palette (`art/characters/ren/scripts/fix_f2_north_hair.py`, north sheets rebuilt and republished).
- Dash / flight silhouette trail uses the form's contour colour (Ashen Eclipse ash-orange, Eventide Seraph pearl-rose); Sora and Ren second forms also leave a ghost and a streak while flying or dashing.
- Second forms now have two dash charges (Ashen Eclipse, Eventide Seraph).
- Ren and Vex strike mark: the heavy third-beat slash now spawns on the foe that was hit, not on the fighter (`HeroSystem.ts`, `VexSystem.ts`, `vexFx.ts`).
- Beasts always stay behind the hero: the Eclipse Fox and Eventide Phoenix heads and reveal pops were moved below the hero sprite.
- HUD Overdrive mantle: two new ImageGen beasts (`beast_ashfox`, `beast_eventide`, `art/b35`) shown above the ability row like the other forms.
- Ashen Cataclysm build-up: the 0.8 s windup now has a growing eclipse core, ash and embers drawn inward, a spectral fox forming at the lane head, a tightening ground ring and a filling rupture crater.
- Eventide Seraph: its feather bolts were also drawn by the old blue Sovereign bolt layer, which is now skipped for them; the two flat wing panels were replaced by an articulated mantle of ten ImageGen feathers (five per side, each with its own length, fan angle and sway; `art/b35/feathers.py`).
- Sora Azure needles: aimed needles now chase their own target (capped turn rate) and every bolt is swept along its path, so a fast thin bolt cannot tunnel through or slip past a foe (`HeroSystem.ts`).
- Results (victory, defeat, Chronicles outcome): redesigned (`ResultsScreen.tsx`, `b35.css`) with new ImageGen defeat key art and crest (`art/b35/results.py`); all test hooks kept.

Evidence: typecheck clean, unit tests (including new needle / dash charge tests), `e2e/b35-results.spec.ts` (win and defeat at 1920x1080, 1280x720, 960x540, 640x360, 640x320: every action and hint visible, no overflow), b33 / b34 browser specs pass. Not verified by a human at normal speed; audio, controller, co-op untested.
