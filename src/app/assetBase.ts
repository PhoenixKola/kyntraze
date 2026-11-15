/** Absolute asset root. vite uses base './', and a relative url() placed in a CSS custom property (inline style) resolves against the stylesheet (/assets/..), not the page, so it 404s in production builds. */
export const ASSET_BASE: string = typeof document !== 'undefined' ? new URL(import.meta.env.BASE_URL, document.baseURI).href : import.meta.env.BASE_URL;
