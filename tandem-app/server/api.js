// REST API: community words, the signed-in player's data, the leaderboard and the admin reset.
import crypto from 'node:crypto';
import { Router } from 'express';
import { validateWord } from './content.js';
import { db, pool, resetDatabase } from './db.js';
import { optionalAuth, requireAuth } from './auth.js';

/** Net votes a community word needs before it is dealt in real games. The author's own upvote counts. */
export const APPROVE_AT = Number(process.env.APPROVE_AT) || 2;
const DIRS = ['zh2ja', 'ja2zh', 'en'];
const THEMES = ['felt', 'library', 'neon', 'ink', 'lacquer'];
const WORD_FIELDS = ['form', 'zh_form', 'reading', 'pinyin', 'meaning_ja', 'meaning_zh', 'relation', 'note'];

/** Express 4 doesn't catch rejected promises; pass them to the error handler. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const httpError = (status, message, extra) => Object.assign(new Error(message), { status, ...extra });
const needDb = (_req, _res, next) => next(pool ? undefined : httpError(503, 'The database is not connected yet. Try again in a minute.'));
function parseId(v, what = 'Word') {
  if (!/^[1-9]\d{0,9}$/.test(String(v)) || Number(v) > 2147483647) throw httpError(400, `${what} id must be a positive whole number.`);
  return Number(v);
}

// One query for listing and reading words, so both return the same shape.
const WORD_SELECT = `
  SELECT w.id, w.form, w.zh_form, w.reading, w.pinyin, w.meaning_ja, w.meaning_zh, w.relation, w.note, w.source,
         w.created_at, w.updated_at,
         CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url) END AS author,
         COALESCE(v.votes, 0)::int AS votes, COALESCE(m.misses, 0)::int AS misses,
         COALESCE(mine.value, 0)::int AS my_vote,
         (w.source = 'builtin' OR COALESCE(v.votes, 0) >= ${APPROVE_AT}) AS in_deck
  FROM words w
  LEFT JOIN players p ON p.id = w.author_id
  LEFT JOIN (SELECT word_id, SUM(value) AS votes FROM word_votes GROUP BY word_id) v ON v.word_id = w.id
  LEFT JOIN (SELECT word_id, SUM(miss_count) AS misses FROM player_missed_words GROUP BY word_id) m ON m.word_id = w.id
  LEFT JOIN word_votes mine ON mine.word_id = w.id AND mine.player_id = $1`;

async function getWord(id, viewerId = null) {
  const { rows } = await db.query(`${WORD_SELECT} WHERE w.id = $2`, [viewerId, id]);
  if (!rows[0]) throw httpError(404, 'That word is not on the table (it may have been deleted).');
  return rows[0];
}
const clean = (body) => Object.fromEntries(WORD_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, typeof body[k] === 'string' ? body[k].trim() : body[k]]));
function assertValid(fields) {
  const errors = validateWord(fields);
  if (Object.keys(errors).length) throw httpError(400, 'Some fields need fixing.', { fields: errors });
}
async function assertNewForm(form, exceptId = 0) {
  const { rows } = await db.query('SELECT id, source FROM words WHERE form = $1 AND id <> $2 LIMIT 1', [form, exceptId]);
  if (rows[0]) throw httpError(409, `${form} is already on the table.`, { fields: { form: `${form} is already on the table.` }, existingId: rows[0].id });
}
async function ownWord(req) {
  const id = parseId(req.params.id);
  const { rows } = await db.query('SELECT * FROM words WHERE id = $1', [id]);
  const w = rows[0];
  if (!w) throw httpError(404, 'That word is not on the table (it may have been deleted).');
  if (w.source === 'builtin') throw httpError(403, 'Built-in words can’t be changed.');
  if (w.author_id !== req.player.id) throw httpError(403, 'Only the player who added this word can change it.');
  return w;
}

export function createApi() {
  const api = Router();
  api.use(needDb);

  // ---- Community words ---------------------------------------------------
  // GET /api/words?source=community|builtin|all&relation=true|false|partial&sort=top|new|missed&q=&page=1
  api.get('/words', optionalAuth, ah(async (req, res) => {
    const source = ['community', 'builtin', 'all'].includes(req.query.source) ? req.query.source : 'community';
    const relation = ['true', 'false', 'partial'].includes(req.query.relation) ? req.query.relation : null;
    const sort = ['top', 'new', 'missed'].includes(req.query.sort) ? req.query.sort : 'top';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 40) : '';
    const page = Math.max(1, Math.min(100, Number.parseInt(req.query.page, 10) || 1));
    const PER = 24;
    const where = [], args = [req.player?.id ?? null];
    if (source !== 'all') { args.push(source); where.push(`w.source = $${args.length}`); }
    if (relation) { args.push(relation); where.push(`w.relation = $${args.length}`); }
    if (q) { args.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`); where.push(`(w.form ILIKE $${args.length} OR w.meaning_ja ILIKE $${args.length} OR w.meaning_zh ILIKE $${args.length} OR w.reading ILIKE $${args.length} OR w.pinyin ILIKE $${args.length})`); }
    const order = { top: 'votes DESC, w.created_at DESC', new: 'w.created_at DESC, w.id DESC', missed: 'misses DESC, votes DESC, w.id' }[sort];
    args.push(PER + 1, (page - 1) * PER);
    const { rows } = await db.query(
      `${WORD_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${order} LIMIT $${args.length - 1} OFFSET $${args.length}`, args);
    res.json({ words: rows.slice(0, PER), page, hasMore: rows.length > PER, approveAt: APPROVE_AT });
  }));

  api.get('/words/:id', optionalAuth, ah(async (req, res) => {
    res.json(await getWord(parseId(req.params.id), req.player?.id));
  }));

  api.post('/words', requireAuth, ah(async (req, res) => {
    const f = clean(req.body ?? {});
    assertValid(f);
    f.zh_form ||= f.form; // same characters in both languages unless a simplified form is given
    await assertNewForm(f.form);
    const { rows } = await db.query(
      `INSERT INTO words (form, zh_form, reading, pinyin, meaning_ja, meaning_zh, relation, note, source, author_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'community', $9) RETURNING id`,
      [f.form, f.zh_form, f.reading, f.pinyin, f.meaning_ja, f.meaning_zh, f.relation, f.note || null, req.player.id]);
    // The author's upvote is added automatically, so a word needs only one more vote to join the deck.
    await db.query('INSERT INTO word_votes (player_id, word_id, value) VALUES ($1, $2, 1)', [req.player.id, rows[0].id]);
    res.status(201).json(await getWord(rows[0].id, req.player.id));
  }));

  api.patch('/words/:id', requireAuth, ah(async (req, res) => {
    const current = await ownWord(req);
    const changes = clean(req.body ?? {});
    if (!Object.keys(changes).length) throw httpError(400, 'Nothing to update.');
    const merged = { ...Object.fromEntries(WORD_FIELDS.map((k) => [k, current[k] ?? ''])), ...changes };
    merged.zh_form ||= merged.form;
    assertValid(merged);
    if (merged.form !== current.form) await assertNewForm(merged.form, current.id);
    await db.query(
      `UPDATE words SET form = $2, zh_form = $3, reading = $4, pinyin = $5, meaning_ja = $6, meaning_zh = $7, relation = $8, note = $9, updated_at = NOW()
       WHERE id = $1`,
      [current.id, merged.form, merged.zh_form, merged.reading, merged.pinyin, merged.meaning_ja, merged.meaning_zh, merged.relation, merged.note || null]);
    res.json(await getWord(current.id, req.player.id));
  }));

  api.delete('/words/:id', requireAuth, ah(async (req, res) => {
    const w = await ownWord(req);
    await db.query('DELETE FROM words WHERE id = $1', [w.id]);
    res.status(204).end();
  }));

  // PUT /api/words/:id/vote { value: 1 | -1 | 0 }   (0 removes your vote)
  api.put('/words/:id/vote', requireAuth, ah(async (req, res) => {
    const id = parseId(req.params.id);
    const value = Number(req.body?.value);
    if (![1, -1, 0].includes(value)) throw httpError(400, 'Vote must be 1, -1 or 0.');
    const w = await getWord(id, req.player.id);
    if (w.source === 'builtin') throw httpError(400, 'Built-in words are already in the deck; only community words get votes.');
    if (value === 0) await db.query('DELETE FROM word_votes WHERE player_id = $1 AND word_id = $2', [req.player.id, id]);
    else await db.query(
      `INSERT INTO word_votes (player_id, word_id, value) VALUES ($1, $2, $3)
       ON CONFLICT (player_id, word_id) DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`, [req.player.id, id, value]);
    res.json(await getWord(id, req.player.id));
  }));

  // ---- The signed-in player -----------------------------------------------
  api.get('/me', requireAuth, ah(async (req, res) => {
    const { rows } = await db.query('SELECT dir, lang, voice, theme, muted FROM player_settings WHERE player_id = $1', [req.player.id]);
    const stats = await db.query(
      `SELECT (SELECT COUNT(*) FROM scores WHERE player_id = $1)::int AS games,
              (SELECT COALESCE(MAX(score), 0) FROM scores WHERE player_id = $1)::int AS best,
              (SELECT COUNT(*) FROM words WHERE author_id = $1)::int AS words,
              (SELECT COUNT(*) FROM player_missed_words WHERE player_id = $1)::int AS traps`, [req.player.id]);
    res.json({ ...req.player, settings: rows[0] ?? null, stats: stats.rows[0] });
  }));

  api.patch('/me/settings', requireAuth, ah(async (req, res) => {
    const b = req.body ?? {}, errors = {};
    if (b.dir !== undefined && !DIRS.includes(b.dir)) errors.dir = 'Unknown direction.';
    if (b.theme !== undefined && !THEMES.includes(b.theme)) errors.theme = 'Unknown theme.';
    if (b.lang !== undefined && !/^[a-z]{2,3}$/.test(b.lang)) errors.lang = 'Unknown language.';
    if (b.voice !== undefined && (typeof b.voice !== 'string' || b.voice.length > 120)) errors.voice = 'Voice name is too long.';
    if (b.muted !== undefined && typeof b.muted !== 'boolean') errors.muted = 'Must be true or false.';
    if (Object.keys(errors).length) throw httpError(400, 'Some settings need fixing.', { fields: errors });
    const keys = ['dir', 'lang', 'voice', 'theme', 'muted'].filter((k) => b[k] !== undefined);
    if (!keys.length) throw httpError(400, 'Nothing to update.');
    const { rows } = await db.query(
      `INSERT INTO player_settings (player_id, ${keys.join(', ')}) VALUES ($1, ${keys.map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (player_id) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}, updated_at = NOW()
       RETURNING dir, lang, voice, theme, muted`, [req.player.id, ...keys.map((k) => b[k])]);
    res.json(rows[0]);
  }));

  // Words this player keeps falling for, most-missed first.
  api.get('/me/missed', requireAuth, ah(async (req, res) => {
    const limit = Math.max(1, Math.min(100, Number.parseInt(req.query.limit, 10) || 50));
    const { rows } = await db.query(
      `SELECT w.id, w.form, w.zh_form, w.reading, w.pinyin, w.meaning_ja, w.meaning_zh, w.relation, w.note, w.source,
              m.miss_count, m.correct_streak, m.last_missed_at
       FROM player_missed_words m JOIN words w ON w.id = m.word_id
       WHERE m.player_id = $1 ORDER BY m.miss_count DESC, m.last_missed_at DESC LIMIT $2`, [req.player.id, limit]);
    res.json(rows);
  }));
  // "I've got this one now": take a word off your trap list.
  api.delete('/me/missed/:wordId', requireAuth, ah(async (req, res) => {
    const { rowCount } = await db.query('DELETE FROM player_missed_words WHERE player_id = $1 AND word_id = $2', [req.player.id, parseId(req.params.wordId)]);
    if (!rowCount) throw httpError(404, 'That word is not on your trap list.');
    res.status(204).end();
  }));

  api.get('/me/words', requireAuth, ah(async (req, res) => {
    const { rows } = await db.query(`${WORD_SELECT} WHERE w.author_id = $2 ORDER BY w.created_at DESC`, [req.player.id, req.player.id]);
    res.json(rows);
  }));

  api.get('/me/scores', requireAuth, ah(async (req, res) => {
    const { rows } = await db.query('SELECT id, direction, score, correct, total, created_at FROM scores WHERE player_id = $1 ORDER BY created_at DESC LIMIT 10', [req.player.id]);
    res.json(rows);
  }));

  // ---- Leaderboard ---------------------------------------------------------
  // GET /api/leaderboard?direction=zh2ja|ja2zh|en&sort=score|accuracy|recent  — each player's best game.
  api.get('/leaderboard', ah(async (req, res) => {
    const direction = req.query.direction ?? 'zh2ja';
    if (!DIRS.includes(direction)) throw httpError(400, 'Direction must be zh2ja, ja2zh or en.');
    const sort = ['score', 'accuracy', 'recent'].includes(req.query.sort) ? req.query.sort : 'score';
    const order = { score: 'score DESC, created_at ASC', accuracy: 'correct::float / total DESC, score DESC', recent: 'created_at DESC' }[sort];
    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (s.player_id) s.player_id, p.username, p.avatar_url, s.score, s.correct, s.total, s.created_at,
                COUNT(*) OVER (PARTITION BY s.player_id)::int AS games
         FROM scores s JOIN players p ON p.id = s.player_id
         WHERE s.direction = $1
         ORDER BY s.player_id, s.score DESC, s.created_at ASC
       ) best ORDER BY ${order} LIMIT 10`, [direction]);
    res.json({ direction, sort, entries: rows });
  }));

  // ---- Admin ---------------------------------------------------------------
  // POST /api/admin/reset with header "X-Admin-Key: <ADMIN_KEY>". Restores the default state.
  api.post('/admin/reset', ah(async (req, res) => {
    const key = process.env.ADMIN_KEY;
    if (!key) throw httpError(503, 'Reset is turned off: set ADMIN_KEY on the server.');
    const given = String(req.get('x-admin-key') ?? '');
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(key).digest();
    if (!crypto.timingSafeEqual(a, b)) throw httpError(403, 'Wrong admin key.');
    const removed = await resetDatabase();
    res.json({ message: 'Database reset to its default state.', removed });
  }));

  return api;
}

/** JSON errors for every route: a clear message, never a stack trace. */
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  if (err.code === '23505') return res.status(409).json({ error: 'That already exists.' });
  if (err.code === '23503') return res.status(404).json({ error: 'Something this refers to no longer exists.' });
  if (err.code === '23514' || err.code === '22001') return res.status(400).json({ error: 'Some fields are not allowed.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message, ...(err.fields && { fields: err.fields }), ...(err.existingId && { existingId: err.existingId }) });
  if (err.status === 503) return res.status(503).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
}
