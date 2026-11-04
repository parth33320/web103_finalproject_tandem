import './env.js'; // must stay first: loads .env before db.js and auth.js read process.env
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { db, migrate } from './db.js';
import { attachAuth } from './auth.js';
import { createApi, errorHandler } from './api.js';
import { attachRooms } from './rooms.js';
import { attachSpeech } from './speech.js';

const PORT = process.env.PORT || 3001;
const origins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean);
// Where GitHub sends players back to: the website (first CLIENT_ORIGIN) and this server (Render sets RENDER_EXTERNAL_URL).
const clientUrl = origins[0] || 'http://localhost:5173';
const serverUrl = (process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');

await migrate().catch((e) => console.error('DB setup failed:', e.message));

const app = express();
app.set('trust proxy', 1); // Render puts exactly one proxy in front of the service.
app.disable('x-powered-by');
app.use(cors({ origin: origins.length ? origins : '*' }));
app.use(express.json({ limit: '8kb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
attachAuth(app, { clientUrl, serverUrl });
attachSpeech(app, { allowedOrigins: origins });

const server = createServer(app);
attachRooms(app, server, origins.length ? origins : '*', db);
app.use('/api', createApi());
app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use(errorHandler);
server.listen(PORT, () => console.log(`Tandem server ready on ${serverUrl}`));
