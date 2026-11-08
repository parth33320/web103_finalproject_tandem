import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Session PA: player_stats 1:1, non-RESTful recalculate/reset, stats routes', () => {
  it('POST /api/players creates player AND player_stats row', async () => {
    const originalQuery = pool.query;
    let players = [];
    let stats = [];
    let nextId = 1;

    pool.query = async (sql, params) => {
      const trimmed = sql.trim();
      if (trimmed.startsWith('INSERT INTO players')) {
        const username = params[0];
        const newPlayer = { id: nextId++, username, created_at: new Date().toISOString() };
        players.push(newPlayer);
        return { rows: [newPlayer] };
      }
      if (trimmed.startsWith('INSERT INTO player_stats')) {
        const playerId = params[0];
        const newStat = {
          player_id: playerId,
          total_rounds: 0,
          best_score: '0.00',
          avg_speed_ms: '0.00',
          updated_at: new Date().toISOString(),
        };
        stats.push(newStat);
        return { rows: [newStat] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'StatsTester' }),
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.username, 'StatsTester');
      assert.equal(stats.length, 1);
      assert.equal(stats[0].player_id, data.id);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('GET /api/players/:id/stats returns { total_rounds: 0 } for new player', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      const trimmed = sql.trim();
      if (trimmed.includes('FROM player_stats WHERE player_id = $1')) {
        const id = params[0];
        return {
          rows: [
            {
              player_id: id,
              total_rounds: 0,
              best_score: '0.00',
              avg_speed_ms: '0.00',
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/players/42/stats`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.player_id, 42);
      assert.equal(data.total_rounds, 0);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('POST /api/scores increments total_rounds in player_stats', async () => {
    const originalQuery = pool.query;
    let stats = {
      player_id: 10,
      total_rounds: 0,
      best_score: 0,
      avg_speed_ms: 0,
      updated_at: new Date().toISOString(),
    };

    pool.query = async (sql, params) => {
      const trimmed = sql.trim();
      if (trimmed.startsWith('INSERT INTO scores')) {
        const [playerId, score, direction] = params;
        return {
          rows: [{ id: 100, player_id: playerId, score, direction, created_at: new Date().toISOString() }],
        };
      }
      if (trimmed.startsWith('INSERT INTO player_stats')) {
        stats.total_rounds += 1;
        stats.best_score = Math.max(stats.best_score, params[1]);
        stats.avg_speed_ms = params[2];
        return { rows: [stats] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: 10,
          score: 85,
          direction: 'zh-ja',
          speed_ms: 2500,
        }),
      });
      assert.equal(res.status, 201);
      assert.equal(stats.total_rounds, 1);
      assert.equal(stats.best_score, 85);
      assert.equal(stats.avg_speed_ms, 2500);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('POST /api/reset truncates only scores table', async () => {
    const originalQuery = pool.query;
    let truncatedScores = false;
    let truncatedOther = false;

    pool.query = async (sql) => {
      if (sql.includes('TRUNCATE')) {
        if (sql.includes('scores')) {
          truncatedScores = true;
        }
        if (sql.includes('player_stats') || sql.includes('players') || sql.includes('user_missed_words') || sql.includes('decks')) {
          truncatedOther = true;
        }
        return { rows: [] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/reset`, { method: 'POST' });
      assert.equal(res.status, 200);
      assert.ok(truncatedScores, 'resetLeaderboard must execute TRUNCATE scores');
      assert.equal(truncatedOther, false, 'resetLeaderboard must not truncate other tables');
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('POST /api/players/:id/recalculate-stats recomputes stats from scores table', async () => {
    const originalQuery = pool.query;
    let updatedStats = null;

    pool.query = async (sql, params) => {
      const trimmed = sql.trim();
      if (trimmed.startsWith('SELECT COUNT(*)::int AS total_rounds')) {
        return { rows: [{ total_rounds: 5, best_score: 95 }] };
      }
      if (trimmed.startsWith('INSERT INTO player_stats')) {
        updatedStats = {
          player_id: params[0],
          total_rounds: params[1],
          best_score: params[2],
        };
        return { rows: [updatedStats] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/players/10/recalculate-stats`, { method: 'POST' });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.recalculated, true);
      assert.equal(data.total_rounds, 5);
      assert.equal(data.best_score, 95);
      assert.equal(updatedStats.player_id, 10);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });
});
