# Content contract (prototype V1)

- Hero: unique id, name, title, role, accent, playable flag, `forms[]` exactly four IDs.
- Enemy: id, hp, speed, damage, radius, xp, and portrait fallback; initial pursuer/flanker only.
- Upgrade: unique id, title/description, rarity, weight, maxStacks; fixed effect operation in UpgradeSystem. Level offers draw 3 weighted choices without replacement.
- Form: heroId, tier, description, charge, drain, cooldown, active implementation flag. Only Kai Flarebound is active.
- Animation: `KAI_PLACEHOLDER_MANIFEST` references four stills. It is not production atlas metadata.

`validateContent()` checks uniqueness and minimal positivity. Expand to versioned runtime schema validation before user-editable content or remote content import. Stable IDs must not be silently renamed.
