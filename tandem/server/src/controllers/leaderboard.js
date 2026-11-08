import { pool } from '../db/pool.js';
import { httpError, parseDirection } from '../utils/validation.js';

export async function getLeaderboard(req, res, next) {
  try {
    if (!req.query.direction) {
      throw httpError(400, 'Direction query parameter is required.');
    }
    const direction = parseDirection(req.query.direction);
    const sort = req.query.sort === 'date' ? 'date' : 'score';

    let queryText = '';
    if (sort === 'score') {
      queryText = `
        SELECT
          p.id AS player_id,
          p.username,
          p.avatar_url,
          MAX(s.score) AS best_score,
          MAX(s.created_at) AS last_played_at
        FROM scores s
        JOIN players p ON s.player_id = p.id
        WHERE s.direction = $1
        GROUP BY p.id, p.username, p.avatar_url
        ORDER BY best_score DESC, last_played_at DESC
        LIMIT 20
      `;
    } else {
      queryText = `
        SELECT
          p.id AS player_id,
          p.username,
          p.avatar_url,
          MAX(s.score) AS best_score,
          MAX(s.created_at) AS last_played_at
        FROM scores s
        JOIN players p ON s.player_id = p.id
        WHERE s.direction = $1
        GROUP BY p.id, p.username, p.avatar_url
        ORDER BY last_played_at DESC, best_score DESC
        LIMIT 20
      `;
    }

    const result = await pool.query(queryText, [direction]);
    res.json({
      direction,
      sort,
      entries: result.rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetLeaderboard(req, res, next) {
  try {
    await pool.query('TRUNCATE scores RESTART IDENTITY CASCADE');
    res.json({ message: 'Database reset.' });
  } catch (error) {
    next(error);
  }
}
