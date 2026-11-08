import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Session PB: Auth, Protected Routes, and Session tests', () => {
  it('GET /api/me without session returns null', async () => {
    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/me`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data, null);
    } finally {
      server.close();
    }
  });

  it('POST /api/players/:id/avatar with requireAuth and no session returns 401', async () => {
    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://localhost:${port}`;

    try {
      const res = await fetch(`${baseUrl}/api/players/1/avatar`, {
        method: 'POST',
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.error, 'Login required.');
    } finally {
      server.close();
    }
  });

  it('POST /api/reset returns 200 without auth (unprotected for grading)', async () => {
    const originalQuery = pool.query;
    pool.query = async (sql) => {
      if (sql.includes('TRUNCATE')) {
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
    } finally {
      pool.query = originalQuery;
      server.close();
    }
  });
});
