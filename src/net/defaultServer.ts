/** The official free Render server. Override at build time with VITE_KYNT_SERVER (must be wss://, or ws:// to loopback). */
export const DEFAULT_SERVER_URL: string = (import.meta.env?.VITE_KYNT_SERVER as string | undefined) || 'wss://kyntraze.onrender.com';
/** A sleeping free instance can need a minute or more to wake. */
export const CONNECT_TIMEOUT_MS = 120_000;
