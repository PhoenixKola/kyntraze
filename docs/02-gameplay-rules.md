# B00 gameplay specification (implemented)

| Action | Input | Starter behavior |
|---|---|---|
| Move | WASD/arrows | Normalized 8-way 250 units/s; slide past solid columns and arena walls |
| Basic | Auto | 17 dmg, ~0.55 seconds, 242 range; hits closest valid foe |
| Dash | Shift/Space | 0.22 second 800 units/s collision-aware dash, 0.25s i-frames, 3.2s cooldown |
| Q | Q | Impact Line debug radial burst: 34 dmg /132 radius, 8.5s cooldown |
| Form I | F | Flarebound activates at 65 Drive, 6.5 Drive/s drain, 6s lockout after ending; faster attack, second target, higher damage and movement; expires at zero Drive |
| Pause | ESC/click | Freezes sim and clock; clicking resume or ESC continues |
| XP | Move over mint shards | +1 pursuer or +2 flanker, 3 random unique weighted choice cards on level |
| Damage | Enemy contact | Enemy-specific contact, 0.65s temporary hit invulnerability; 0 HP = results |

Enemy and upgrade tuning is prototype-only. No win/boss state yet: B00 loops until death/exit. In future, a complete 15–18-minute objective loop replaces this survival-only proof.
