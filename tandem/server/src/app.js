import express from 'express';
import { fileURLToPath } from 'node:url';
import players from './routes/players.js';
import scores from './routes/scores.js';
import leaderboard from './routes/leaderboard.js';
import words from './routes/words.js';
import decks from './routes/decks.js';
import { resetLeaderboard } from './controllers/leaderboard.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
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
  if (error.code === '23503') return res.status(404).json({ error: 'Player or word not found.' });  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (error.status && error.status < 500) return res.status(error.status).json({ error: error.message });
  console.error(error);
  res.status(error.status || 500).json({ error: error.status === 503 ? error.message : 'Server error. Please try again.' });
});
