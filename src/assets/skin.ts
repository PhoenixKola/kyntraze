/** Equipped outfit for the current run: sprite roots redirect to the pre-recoloured sets in public/art/outfits/<id>/ (scripts/b22-outfit-recolor.py). Set once before assets load.
 *  An outfit id is `<hero>_<name>` and only re-skins that hero's roots, so a co-op partner of another hero keeps their default art. */
let outfit: string | null = null;
/** The equipped outfit id for this run (null = default look). */
export const equippedOutfit = () => outfit;
export const setOutfitSkin = (id: string | null) => { outfit = id && /^[a-z_]+$/.test(id) ? id : null; };
export const skinRoot = (root: string) => { const hero = root.slice(5).split('-')[0]; return outfit && outfit.startsWith(`${hero}_`) ? `/art/outfits/${outfit}${root.slice(4)}` : root; };
