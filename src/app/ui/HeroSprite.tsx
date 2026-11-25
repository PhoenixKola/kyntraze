import type { CSSProperties } from 'react';
import type { HeroId } from '../../content/heroes';
import { ASSET_BASE } from '../assetBase';
import { formsFor } from '../heroKitView';

/** Looping idle of one appearance from the real transparent game sheets. `k` = pixel scale in --u units; `flip` mirrors it to face the other way; `silhouette` makes a teaser. */
export function HeroSprite({ hero, form = 0, k = 1.2, flip, silhouette, className = '' }: { hero: HeroId; form?: number; k?: number; flip?: boolean; silhouette?: boolean; className?: string }) {
  const f = formsFor(hero)[Math.min(form, formsFor(hero).length - 1)], [w, h] = f.frame;
  return <span className={`hspr ${silhouette ? 'sil' : ''} ${className}`} style={{ '--fw': w, '--fh': h, '--k': `calc(var(--u) * ${k})`, transform: flip ? 'scaleX(-1)' : undefined, backgroundImage: `url(${ASSET_BASE}${f.sheet})` } as CSSProperties} role="img" aria-label={silhouette ? 'Hero silhouette' : `${f.full}, idle`}/>;
}
