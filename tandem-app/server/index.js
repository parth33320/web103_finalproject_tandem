import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import pg from 'pg';
import { attachRooms } from './rooms.js';
import { attachSpeech } from './speech.js';

const origins = (process.env.CLIENT_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined }) : null;
const db = { query: (...a) => (pool ? pool.query(...a) : Promise.resolve({ rows: [] })) };

await db.query(`CREATE TABLE IF NOT EXISTS rooms (code VARCHAR(8) PRIMARY KEY, phase TEXT NOT NULL DEFAULT 'waiting', round INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS room_messages (id SERIAL PRIMARY KEY, room_code VARCHAR(8), channel TEXT NOT NULL, name TEXT NOT NULL, text VARCHAR(300) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());`).catch((e) => console.error('DB setup failed:', e.message));

const app = express();
app.set('trust proxy', 1); // Render puts exactly one proxy in front of the service.
app.use(cors({ origin: origins.length ? origins : '*' }));
app.use(express.json({ limit: '8kb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
attachSpeech(app, { allowedOrigins: origins });

const server = createServer(app);
attachRooms(app, server, origins.length ? origins : '*', db);
server.listen(process.env.PORT || 3001, () => console.log('Tandem server ready'));
