import { startServer } from './index';
const port = Number(process.env.PORT) || 2567, origins = (process.env.KYNT_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);
startServer({ port, dataFile: process.env.KYNT_DATA ?? null, origins, maxRooms: Number(process.env.KYNT_MAX_ROOMS) || 100 }).then(s => console.log(`kyntraze server listening on :${s.port} (ws; terminate TLS in a reverse proxy for wss)`));
