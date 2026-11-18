/** Equipped outfit for the current run: sprite roots redirect to the pre-recoloured sets in public/art/outfits/<id>/ (scripts/b22-outfit-recolor.py). Set once before assets load. */
let outfit: string | null = null;
export const setOutfitSkin = (id: string | null) => { outfit = id && /^[a-z_]+$/.test(id) ? id : null; };
export const skinRoot = (root: string) => (outfit ? `/art/outfits/${outfit}${root.slice(4)}` : root);
