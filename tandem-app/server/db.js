// Postgres connection, schema and seed data for Tandem.
import pg from 'pg';
import { WORD_ROWS } from './content.js';

const url = process.env.DATABASE_URL;
export const pool = url ? new pg.Pool({ connectionString: url, ssl: url.includes('render.com') ? { rejectUnauthorized: false } : undefined }) : null;
/** Query helper. Without DATABASE_URL, live rooms still work but saved features return 503. */
export const db = { query: (...a) => (pool ? pool.query(...a) : Promise.resolve({ rows: [], rowCount: 0 })) };

export const SCHEMA = `
-- Live rooms (one room -> many chat messages, many answers).
CREATE TABLE IF NOT EXISTS rooms (
  code VARCHAR(8) PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'waiting',
  round INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS room_messages (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(8) REFERENCES rooms(code) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  name TEXT NOT NULL,
  text VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players sign in with GitHub.
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  github_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(39) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One-to-one: each player has exactly one settings row (created automatically on first sign-in).
CREATE TABLE IF NOT EXISTS player_settings (
  player_id INTEGER PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  dir TEXT NOT NULL DEFAULT 'zh2ja' CHECK (dir IN ('zh2ja', 'ja2zh', 'en')),
  lang TEXT NOT NULL DEFAULT 'en',
  voice TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'felt',
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Words: the 340 built-in cards plus words the community adds.
-- One-to-many: one player (author) -> many community words.
CREATE TABLE IF NOT EXISTS words (
  id SERIAL PRIMARY KEY,
  form VARCHAR(8) NOT NULL,
  zh_form VARCHAR(8) NOT NULL,
  reading VARCHAR(40) NOT NULL,
  pinyin VARCHAR(40) NOT NULL,
  meaning_ja VARCHAR(60) NOT NULL,
  meaning_zh VARCHAR(60) NOT NULL,
  relation TEXT NOT NULL CHECK (relation IN ('true', 'false', 'partial')),
  note VARCHAR(400),
  source TEXT NOT NULL DEFAULT 'community' CHECK (source IN ('builtin', 'community')),
  author_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((source = 'builtin') = (author_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS words_community_form ON words (form) WHERE source = 'community';
CREATE INDEX IF NOT EXISTS words_author ON words (author_id);

-- Many-to-many: players <-> words they fell for. miss_count and last_missed_at live on the join table.
CREATE TABLE IF NOT EXISTS player_missed_words (
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  miss_count INTEGER NOT NULL DEFAULT 1 CHECK (miss_count > 0),
  last_missed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, word_id)
);
-- Many-to-many: players <-> community words they voted on (+1 / -1).
CREATE TABLE IF NOT EXISTS word_votes (
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, word_id)
);

-- Finished games of signed-in players, for the leaderboard.
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  room_code VARCHAR(8),
  direction TEXT NOT NULL CHECK (direction IN ('zh2ja', 'ja2zh', 'en')),
  score INTEGER NOT NULL CHECK (score >= 0),
  correct INTEGER NOT NULL CHECK (correct >= 0),
  total INTEGER NOT NULL CHECK (total > 0 AND correct <= total),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS scores_direction ON scores (direction, player_id, score DESC);

CREATE TABLE IF NOT EXISTS round_answers (
  room_code VARCHAR(8) REFERENCES rooms(code) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player_key TEXT NOT NULL,
  choice INTEGER NOT NULL,
  correct BOOLEAN NOT NULL,
  hints_used TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (room_code, round, player_key)
);
`;

// Older deployments created room_messages without the foreign key; add it once (dropping orphaned messages first).
const UPGRADE = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'room_messages_room_code_fkey') THEN
    DELETE FROM room_messages m WHERE room_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.code = m.room_code);
    ALTER TABLE room_messages ADD CONSTRAINT room_messages_room_code_fkey FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE;
  END IF;
END $$;`;

/** Puts the 340 built-in words in the table (keeping their ids) and moves the id counter past them. */
export async function seedWords(client = pool) {
  const cols = ['id', 'form', 'zh_form', 'reading', 'pinyin', 'meaning_ja', 'meaning_zh', 'relation', 'note'];
  const arrays = cols.map((c) => WORD_ROWS.map((w) => w[c]));
  await client.query(
    `INSERT INTO words (${cols.join(', ')}, source)
     SELECT *, 'builtin' FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
     ON CONFLICT (id) DO UPDATE SET form = EXCLUDED.form, zh_form = EXCLUDED.zh_form, reading = EXCLUDED.reading, pinyin = EXCLUDED.pinyin,
       meaning_ja = EXCLUDED.meaning_ja, meaning_zh = EXCLUDED.meaning_zh, relation = EXCLUDED.relation, note = EXCLUDED.note
     WHERE words.source = 'builtin'`,
    arrays,
  );
  await client.query(`SELECT setval(pg_get_serial_sequence('words', 'id'), GREATEST((SELECT MAX(id) FROM words), 1000))`);
}

export async function migrate() {
  if (!pool) { console.warn('DATABASE_URL is not set: live rooms work, but sign-in, words, scores and the leaderboard are off.'); return; }
  await pool.query(SCHEMA);
  await pool.query(UPGRADE);
  await seedWords();
  console.log(`Database ready (${WORD_ROWS.length} built-in words).`);
}

/** Resets the database to its default state: built-in words only, no scores, votes, missed words, community words or old rooms.
 *  Player accounts are kept so nobody is signed out. */
export async function resetDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const counts = {};
    for (const [key, sql] of [
      ['scores', 'DELETE FROM scores'],
      ['missedWords', 'DELETE FROM player_missed_words'],
      ['votes', 'DELETE FROM word_votes'],
      ['communityWords', "DELETE FROM words WHERE source = 'community'"],
      ['rooms', 'DELETE FROM rooms'],
    ]) counts[key] = (await client.query(sql)).rowCount;
    await client.query("UPDATE player_settings SET dir = 'zh2ja', lang = 'en', voice = '', theme = 'felt', muted = FALSE, updated_at = NOW()");
    await seedWords(client);
    await client.query('COMMIT');
    return counts;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
