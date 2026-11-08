import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const connectionString = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, '')
  : undefined;

export const pool = new pg.Pool(
  connectionString
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : undefined
);

let fallbackWords = null;
const originalQuery = pool.query.bind(pool);
pool.query = async function (sql, params) {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set.');
    }
    return await originalQuery(sql, params);
  } catch (err) {
    if (!process.env.DATABASE_URL || err.code === 'ECONNREFUSED') {
      const sqlLower = typeof sql === 'string' ? sql.toLowerCase() : '';
      if (sqlLower.includes('from words')) {
        if (!fallbackWords) {
          const raw = JSON.parse(await readFile(new URL('../../data/words.json', import.meta.url), 'utf8'));
          fallbackWords = raw.map((w, i) => ({ id: i + 1, ...w }));
        }
        if (sqlLower.includes('count(*)')) {
          return { rows: [{ count: fallbackWords.length }] };
        }
        return { rows: fallbackWords };
      }
    }
    throw err;
  }
};
