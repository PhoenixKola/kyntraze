# Self-hosting the KYNTRAZE co-op server

The owner runs the official server on a free Render Web Service: `wss://kyntraze.onrender.com` (root WebSocket endpoint, `/health` for the health check; the HTTP root returns 404 on purpose). It is the default in the Online lobby and in the desktop app (`src/net/defaultServer.ts`, override with `VITE_KYNT_SERVER`).
Render settings: build `npm ci --include=dev && npx esbuild src/server/main.ts --bundle --platform=node --format=esm --outfile=dist-server/server.mjs`, start `node dist-server/server.mjs`, health check `/health`, `NODE_VERSION=22`, `KYNT_MAX_ROOMS=5`, `ELECTRON_SKIP_BINARY_DOWNLOAD=1`.
Free-tier caveats: the instance sleeps when idle and can take a minute or more to wake (the lobby says so and waits up to 2 minutes); without `KYNT_DATA` and a persistent disk the leaderboard is lost on every restart. Neither affects co-op itself. Set `KYNT_ORIGINS` to the exact Vercel origin (and the desktop origin if you restrict it) rather than a wildcard.

## Run locally (development)
```
npx vite-node src/server/main.ts          # ws://127.0.0.1:2567
curl http://127.0.0.1:2567/health
```
In the game: Mode Select -> ONLINE CO-OP -> server `ws://127.0.0.1:2567` (plain ws is accepted for loopback only).

## Build for deployment
```
npx esbuild src/server/main.ts --bundle --platform=node --format=esm --outfile=dist-server/server.mjs
node dist-server/server.mjs
```
Env: `PORT` (2567), `KYNT_DATA` (path of the results JSON, e.g. `/data/results.json`), `KYNT_ORIGINS` (comma list of allowed browser origins), `KYNT_MAX_ROOMS` (100). Node >= 20.19 (22 tested). Health: `GET /health`. Boards: `GET /leaderboard?mode=classic&party=2&limit=20&offset=0`.

## TLS / wss (required in production)
The server speaks plain WebSocket. Put it behind a TLS-terminating reverse proxy and publish `wss://`. Caddy example:
```
play.example.com {
  reverse_proxy 127.0.0.1:2567
}
```
nginx: `proxy_pass http://127.0.0.1:2567; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade"; proxy_read_timeout 3600s;`

## Security model
Clients send input and choices only (`src/net/protocol.ts`: strict parser, 2 KB cap, numeric ranges, enums). Damage, health, XP, offers, results and RNG are server-side. Per-socket rate limit (140 msg/s, burst 200). Reconnect tokens are random 24-byte values bound to a slot. Wrong protocol version is refused with "Update required". No secrets ship in the client. Logs contain no IPs or emails; the leaderboard stores only the display names players typed.

## Storage / backup
`KYNT_DATA` is one JSON file written atomically (tmp + rename). Back it up by copying it. Retention: capped at 5000 entries (lowest scores evicted). Results are recorded once per run id (reconnects and restarts cannot double-record).

## Desktop (Electron)
The packaged app allows exactly one configured server: set it in the Online lobby (stored in `userData/b22-net.json`) or via `KYNT_SERVER_URL`. Only `wss://host` (or `ws://` to loopback) is accepted; CSP `connect-src` and the request filter are widened for that single origin and nothing else. Offline solo play requests no network.
