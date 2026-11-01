import { pool } from '../db/pool.js';
import { httpError, parseDirection } from '../utils/validation.js';

export async function getLeaderboard(req, res, next) {
  try {
    const direction = parseDirection(req.query.direction ?? 'zh-ja');
    const sort = req.query.sort === 'date' ? 'date' : 'score';

    let queryText = '';
    if (sort === 'score') {
      queryText = `
        SELECT
          p.id AS player_id,
          p.username,
          MAX(s.score) AS best_score,
          MAX(s.created_at) AS last_played_at
        FROM scores s
        JOIN players p ON s.player_id = p.id
        WHERE s.direction = $1
        GROUP BY p.id, p.username
        ORDER BY best_score DESC, last_played_at DESC
        LIMIT 20
      `;
    } else {
      queryText = `
        SELECT
          p.id AS player_id,
          p.username,
          MAX(s.score) AS best_score,
          MAX(s.created_at) AS last_played_at
        FROM scores s
        JOIN players p ON s.player_id = p.id
        WHERE s.direction = $1
        GROUP BY p.id, p.username
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
    await pool.query('TRUNCATE scores, decks, deck_words, user_missed_words RESTART IDENTITY CASCADE');
    res.json({ message: 'Database reset.' });
  } catch (error) {
    next(error);
  }
}
