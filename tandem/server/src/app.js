import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import passport from 'passport';
import { fileURLToPath } from 'node:url';
import { pool } from './db/pool.js';
import './config/passport.js';
import authRouter from './routes/auth.js';
import players from './routes/players.js';
import scores from './routes/scores.js';
import leaderboard from './routes/leaderboard.js';
import words from './routes/words.js';
import decks from './routes/decks.js';
import { resetLeaderboard } from './controllers/leaderboard.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  })
);
app.use(compression());
app.use(express.json({ limit: '16kb' }));

if (process.env.DATABASE_URL) {
  pool.query(`CREATE TABLE IF NOT EXISTS player_stats (
    player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    total_rounds INTEGER NOT NULL DEFAULT 0,
    best_score NUMERIC(8,2) NOT NULL DEFAULT 0,
    avg_speed_ms NUMERIC(10,2) NOT NULL DEFAULT 0,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`).catch((err) => {
    console.error('Failed to initialize player_stats table on startup:', err.message);
  });
}

const PgSession = connectPg(session);
const sessionStore = process.env.DATABASE_URL
  ? new PgSession({ pool, tableName: 'sessions', createTableIfMissing: true })
  : undefined;

app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'changeme-tandem-secret-key-32chars',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use('/', authRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/reset', resetLeaderboard);
app.use('/api/players', players);
app.use('/api/scores', scores);
app.use('/api/leaderboard', leaderboard);
app.use('/api/words', words);
app.use('/api/decks', decks);
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

if (process.env.NODE_ENV === 'production') {
  const clientDist = fileURLToPath(new URL('../../client/dist/', import.meta.url));
  app.use(express.static(clientDist));
  // Express 5 requires a named wildcard; braces also match the root route.
  app.get('/{*path}', (req, res, next) => {
    if (req.path.includes('.')) return next();
    res.sendFile(`${clientDist}/index.html`);
  });
}
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === '23505') return res.status(409).json({ error: 'That username is taken. Try another.' });
  if (error.code === '23503') return res.status(404).json({ error: 'Player or word not found.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message });
  console.error(error);
  res.status(error.status || 500).json({ error: error.status === 503 ? error.message : 'Server error. Please try again.' });
});
