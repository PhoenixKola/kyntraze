# Architecture and tick ownership

```
React App / real UI overlays
          ↕ (100ms snapshots, immediate on phase transitions)
       GameBridge
          ↕
Phaser 4 scene → InputController → Simulation(60Hz fixed step)
       ↕                                  ↕
Camera + EntityRenderer + EffectsRenderer  deterministic RNG + systems
                                            ↕
                                     content/data + SaveSystem
```

- Simulation is authoritative, in `src/sim`. Phaser image/text shapes are projections only and cannot generate damage on their own.
- `FixedStep` bounds tab-return delta to 0.1s and caps 6 steps/frame. React receives no per-enemy state.
- One `SeededRng` instance seeds all sim enemy spawns and level offers. Window `Date.now` is only used to choose a new default seed; never inside seeded simulation.
- Images are created once and reused by entity ID until death. Effects are transient draw commands, bounded to 50. B04 will require fuller pooling and spatial hash integration.
- Focus loss can pause via a user setting. Simulation phase gates damage, XP and AI.
- Browser `localStorage` settings and best results use V1 schema, defensive input validation and try/catch around storage.
- `?qa=1` exposes a dev-only level forcing hook for E2E. No shipping cheats.
