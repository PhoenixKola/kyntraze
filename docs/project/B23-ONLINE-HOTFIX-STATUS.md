# B23 online hotfix status

## Defects and fixes
- **Malformed message / disconnect:** the client sent `Date.now()` as the ping value, the server only accepts 0..1e9, so every heartbeat was rejected and about 20 strikes closed the connection. The client now sends a small wrapping integer nonce, measures RTT locally from it, keeps at most 4 pending pings, and stops the timer on close/leave/reconnect. Server validation is unchanged.
- **Connect lifecycle:** 120 s connect timeout (free-tier wake), close-before-welcome rejects, and the lobby shows connecting/waking text, an error with RETRY, and no longer shows create/join after a failed connect.
- **Default server:** `wss://kyntraze.onrender.com` (typed constant `src/net/defaultServer.ts`). Saved custom servers are kept. Electron's CSP/request filter default to it when no server is saved; a saved custom server replaces it (changing it needs an app restart for the CSP).
- **Snapshot bug:** in `applySnapshot` the `cast`, `sphere`, `mods`, `aim` and `heroFormUnlocked` assignments were swallowed by a `//` comment. They are now real statements (a missing cast/sphere becomes `null`).
- **Red placeholder partner:** removed from `realmWorld.ts`. The online partner is now drawn by a second `EntityRenderer` from a read-only presentation view (`partnerView` in `src/net/snapshot.ts`) built from the partner's server snapshot, with eased position. The revive ring stays. The local hero sheet is chosen from the room, so a room hero that differs from the saved solo hero loads correctly.

## Tests
`src/tests/b24-online.test.ts` (ping nonce, a real client heartbeat over one interval, snapshot clearing, partner view) and the existing suite.

## NOT verified
- Two real browser clients seeing each other's sprites and effects (no browser was available in this session).
- A 90 s connection soak, the Electron installer rebuild, and the hosted Render/Vercel check after deploy.
- Ability effect ownership: effect events carry no slot, so with two fighters each renderer reacts to the shared event stream, as local co-op already does.
