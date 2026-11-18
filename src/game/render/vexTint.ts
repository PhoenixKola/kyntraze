/** Vex's effect colour follows his contour: violet for Riftbound, dark gray for Voidheart Exile (so dashes, hits and blinks read as the same form). */
export const vexTint = (form: number) => (form === 2 ? { main: 0x9aa2ad, hot: 0xd5dae2, ghost: 0x6b727d } : { main: 0xa070ff, hot: 0xc58bff, ghost: 0x9a6bff });
