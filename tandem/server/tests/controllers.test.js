import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Controllers API Tests', () => {
  it('GET /api/words/round returns generated round', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql) => {
      // Mock words returned from DB
      const sampleWords = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        jp_form: `JP_${i}`,
        zh_simplified: `ZH_${i}`,
        relation: i < 7 ? 'true' : i < 11 ? 'false' : 'partial',
        meaning_ja: `M_JA_${i}`,
        meaning_zh: `M_ZH_${i}`,
        distractors: ['D1', 'D2', 'D3'],
        jp_reading: 'reading',
        pinyin: 'pinyin'
      }));
      return { rows: sampleWords };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/words/round?direction=zh-ja`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.direction, 'zh-ja');
      assert.ok(Array.isArray(data.questions));
      assert.equal(data.questions.length, 10);
      assert.ok(data.scoring);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('POST /api/players creates a player', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      if (sql.includes('INSERT INTO players')) {
        assert.equal(params[0], 'testuser');
        return {
          rows: [{ id: 1, username: 'testuser', created_at: '2025-01-01T00:00:00.000Z' }]
        };
      }
      if (sql.includes('INSERT INTO player_stats')) {
        assert.equal(params[0], 1);
        return { rows: [] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser' })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.id, 1);
      assert.equal(data.username, 'testuser');
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('GET /api/players/:id returns player profile and scores', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      if (sql.includes('FROM players')) {
        return { rows: [{ id: 1, username: 'testuser', created_at: '2025-01-01T00:00:00.000Z' }] };
      }
      if (sql.includes('FROM scores')) {
        return { rows: [{ id: 10, score: 80, direction: 'zh-ja', created_at: '2025-01-01T00:00:00.000Z' }] };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/players/1`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, 1);
      assert.equal(data.username, 'testuser');
      assert.equal(data.scores.length, 1);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('PATCH /api/players/:id renames a player', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      assert.equal(params[0], 'newname');
      assert.equal(params[1], 1);
      return { rows: [{ id: 1, username: 'newname', created_at: '2025-01-01T00:00:00.000Z' }] };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/players/1`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'newname' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.username, 'newname');
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('DELETE /api/players/:id deletes a player', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      assert.equal(params[0], 1);
      return { rows: [{ id: 1 }] };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/players/1`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 204);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('POST /api/scores creates a score and upserts missed words', async () => {
    const executedQueries = [];
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      executedQueries.push({ sql, params });
      if (sql.includes('INSERT INTO scores')) {
        return {
          rows: [{ id: 100, player_id: 1, score: 90, direction: 'zh-ja', created_at: '2025-01-01T00:00:00.000Z' }]
        };
      }
      return { rows: [] };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: 1, score: 90, direction: 'zh-ja', word_ids: [2, 3] })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.id, 100);
      assert.equal(executedQueries.length, 4); // 1 score insert + 1 player_stats upsert + 2 missed words upserts
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });

  it('GET /api/leaderboard returns leaderboard entries', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql, params) => {
      assert.equal(params[0], 'zh-ja');
      return {
        rows: [
          { player_id: 1, username: 'player1', best_score: 100, last_played_at: '2025-01-01T00:00:00.000Z' }
        ]
      };
    };

    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/leaderboard?direction=zh-ja`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.direction, 'zh-ja');
      assert.equal(data.sort, 'score');
      assert.equal(data.entries.length, 1);
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });
});
