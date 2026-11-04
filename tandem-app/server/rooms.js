// Live rooms for Tandem. Rooms run in memory while a game is on; rooms, answers, chat, scores and trap words are saved to Postgres.
import { Server } from 'socket.io';
import { HINT_COST, pointsFor, createRoom, canStart, chatChannel, canAdvance, nextCreator, allRead, everyoneAnswered, featuredRounds, practiceDeck, MASTER_AFTER } from './room-logic.js';
import { WORDS, dealRound, dealWord, fromRow } from './content.js';
import { optionalAuth, verifyToken } from './auth.js';
import { APPROVE_AT } from './api.js';

const ROUND_MS = 20000, READ_CAP_MS = 12000, TOTAL = 10, LEAD_MS = 1500; // TOTAL must match TOTAL_ROUNDS in src/lib/room.ts
const DIRS = ['zh2ja', 'ja2zh', 'en'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Japanese speakers guessing Chinese are scored against the Chinese meaning.
const rightFor = (r, p) => (p.dir === 'ja2zh' ? r.content?.zh.correct : r.correct);

export function attachRooms(app, server, origin, db) {
  // Faster heartbeat: a dropped connection (phone sleeps, Wi-Fi lost) is noticed in ~15s instead of ~45s.
  const io = new Server(server, { cors: { origin }, pingInterval: 10000, pingTimeout: 5000 });
  const rooms = new Map();

  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

  // Create a room: saved in Postgres, returns a real code.
  // { "practice": true } (signed in) deals the words you keep missing first.
  app.post('/api/rooms', optionalAuth, async (req, res) => {
    if (req.body?.practice && !req.player) return res.status(401).json({ error: 'Sign in with GitHub to practice your trap words.' });
    let code = newCode();
    for (let i = 0; i < 10 && rooms.has(code); i++) code = newCode();
    const room = createRoom(code);
    if (req.body?.practice) room.practiceFor = req.player.id;
    rooms.set(code, room);
    await db.query('INSERT INTO rooms(code) VALUES($1) ON CONFLICT DO NOTHING', [code]).catch(() => {});
    res.status(201).json({ code, practice: !!room.practiceFor });
  });
  // Look a room up before joining.
  app.get('/api/rooms/:code', async (req, res) => {
    const code = String(req.params.code).slice(0, 8).toUpperCase();
    const r = rooms.get(code);
    if (r) return res.json({ exists: true, phase: r.phase });
    const { rows } = await db.query('SELECT phase FROM rooms WHERE code=$1', [code]).catch(() => ({ rows: [] }));
    if (rows[0] && rows[0].phase === 'waiting') { rooms.set(code, createRoom(code)); return res.json({ exists: true, phase: 'waiting' }); }
    res.status(404).json({ exists: false });
  });

  const publicState = (r) => ({
    code: r.code, phase: r.phase === 'dealing' ? 'waiting' : r.phase, round: r.round, deadline: r.deadline, reading: !!r.reading, creatorId: r.creatorId, practice: !!r.practiceFor,
    // Same card for everyone; the right answers stay hidden until the reveal.
    content: r.content ? { word: r.content.word, options: r.content.options, drop: r.content.drop, zh: { options: r.content.zh.options, drop: r.content.zh.drop } } : undefined,
    correct: r.phase === 'question' ? -1 : r.correct,
    correctZh: r.phase === 'question' || !r.content ? -1 : r.content.zh.correct,
    players: [...r.players.values()].map(({ socketId, accountId, ...p }) => ({ ...p, signedIn: !!accountId, online: !!socketId })),
  });
  const broadcast = (r) => io.to(r.code).emit('room:state', publicState(r));

  /** The deck for one game: the built-in words plus community words with enough votes.
   *  Normal games feature up to 2 community words; practice games deal the creator's trap words first. */
  async function loadDeck(r) {
    const approved = await db.query(
      `SELECT w.*, p.username FROM words w JOIN players p ON p.id = w.author_id
       WHERE w.source = 'community' AND (SELECT COALESCE(SUM(value), 0) FROM word_votes v WHERE v.word_id = w.id) >= $1`, [APPROVE_AT]);
    const community = approved.rows.map((row) => ({ ...fromRow(row), by: row.username }));
    r.pool = [...WORDS, ...community];
    r.queue = new Map(); // round -> word to deal that round
    if (r.practiceFor) {
      const { rows } = await db.query(
        `SELECT w.* FROM player_missed_words m JOIN words w ON w.id = m.word_id
         WHERE m.player_id = $1 ORDER BY m.miss_count DESC, m.last_missed_at DESC LIMIT $2`, [r.practiceFor, TOTAL]);
      // Trap words plus "neighbors" (same kind of word, ideally sharing a character), shuffled together.
      practiceDeck(rows.map(fromRow), r.pool, TOTAL).forEach((w, i) => r.queue.set(i + 1, w));
    } else {
      const picks = [...community].sort(() => Math.random() - 0.5);
      featuredRounds(picks.length, TOTAL).forEach((round, i) => r.queue.set(round, picks[i]));
    }
  }

  function startRound(r, round, lead = 0) {
    r.seenIds ??= [];
    const pool = r.pool ?? WORDS, n = Math.floor(Math.random() * 1e9);
    const pick = r.queue?.get(round);
    // Random shuffle that never repeats a card in a game; community or trap words land on their chosen rounds.
    const content = pick && !r.seenIds.includes(pick.id) ? dealWord(pick, pool, n) : dealRound(n, r.seenIds, pool);
    r.seenIds.push(content.word.id);
    // The clock waits for the hosts to finish reading (at most READ_CAP_MS).
    Object.assign(r, { round, phase: 'question', content, correct: content.correct, deadline: 0, reading: true, done: new Set() });
    for (const p of r.players.values()) {
      p.choice = null; p.hints = [];
      if (p.role === 'spectator') {
        p.role = 'player';
        const s = io.sockets.sockets.get(p.socketId);
        s?.leave(`${r.code}:spectators`); s?.join(`${r.code}:players`);
      }
    }
    broadcast(r);
    clearTimeout(r.timer);
    r.timer = setTimeout(() => beginClock(r), lead + READ_CAP_MS);
    db.query('UPDATE rooms SET phase=$2, round=$3 WHERE code=$1', [r.code, 'question', round]).catch(() => {});
  }
  function beginClock(r) {
    if (r.phase !== 'question' || !r.reading) return;
    clearTimeout(r.timer);
    r.reading = false; r.deadline = Date.now() + ROUND_MS;
    broadcast(r);
    r.timer = setTimeout(() => endRound(r), ROUND_MS);
  }
  function endRound(r) {
    if (r.phase !== 'question') return;
    clearTimeout(r.timer);
    r.phase = 'reveal'; r.reading = false; r.deadline = 0;
    const wordId = r.content?.word.id;
    for (const p of r.players.values()) {
      if (p.role !== 'player') continue;
      p.played = (p.played ?? 0) + 1;
      if (p.choice === rightFor(r, p)) {
        p.score += pointsFor(p.hints); p.correct = (p.correct ?? 0) + 1;
        if (r.practiceFor && p.accountId && wordId) practiceRight(p, r.content.word);
      }
      // A wrong answer (or no answer) automatically goes on a signed-in player's trap list, and resets its streak.
      else if (p.accountId && wordId) {
        db.query(
          `INSERT INTO player_missed_words (player_id, word_id) VALUES ($1, $2)
           ON CONFLICT (player_id, word_id) DO UPDATE SET miss_count = player_missed_words.miss_count + 1, correct_streak = 0, last_missed_at = NOW()`,
          [p.accountId, wordId]).catch((e) => console.error('Saving a trap word failed:', e.message));
      }
    }
    broadcast(r); // stays on the reveal until the creator presses "Next card"
  }
  function nextCard(r) {
    if (r.round >= TOTAL) {
      r.phase = 'final'; broadcast(r);
      db.query('UPDATE rooms SET phase=$2 WHERE code=$1', [r.code, 'final']).catch(() => {});
      saveScores(r);
      setTimeout(() => rooms.delete(r.code), 30 * 60_000);
    } else startRound(r, r.round + 1, LEAD_MS);
  }

  /** In a practice game, a right answer on one of your trap words counts toward mastering it;
   *  after MASTER_AFTER in a row it leaves your trap list. */
  async function practiceRight(p, word) {
    try {
      const { rows } = await db.query(
        'UPDATE player_missed_words SET correct_streak = correct_streak + 1 WHERE player_id = $1 AND word_id = $2 RETURNING correct_streak',
        [p.accountId, word.id]);
      if (!rows[0]) return; // not on this player's trap list
      const mastered = rows[0].correct_streak >= MASTER_AFTER;
      if (mastered) await db.query('DELETE FROM player_missed_words WHERE player_id = $1 AND word_id = $2', [p.accountId, word.id]);
      if (p.socketId) io.to(p.socketId).emit('trap:progress', { wordId: word.id, form: word.form, streak: rows[0].correct_streak, mastered, needed: MASTER_AFTER });
    } catch (e) { console.error('Saving practice progress failed:', e.message); }
  }

  /** Signed-in players' games go on the leaderboard. Practice games don't: they're made of your hardest words. */
  function saveScores(r) {
    if (r.practiceFor) return;
    for (const p of r.players.values()) {
      if (!p.accountId || !p.played) continue;
      db.query('INSERT INTO scores (player_id, room_code, direction, score, correct, total) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.accountId, r.code, p.dir, p.score, p.correct ?? 0, p.played])
        .then(() => { if (p.socketId) io.to(p.socketId).emit('score:saved', { score: p.score }); })
        .catch((e) => console.error('Saving a score failed:', e.message));
    }
  }

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ code, playerId, name, dir, token }) => {
      code = String(code).slice(0, 8).toUpperCase(); playerId = String(playerId).slice(0, 64);
      const r = rooms.get(code);
      if (!r) return socket.emit('room:missing');
      r.creatorId ??= playerId;
      r.ownerId ??= playerId;
      // The room's original creator gets the host role back when they return.
      if (playerId === r.ownerId) r.creatorId = playerId;
      const late = r.phase !== 'waiting';
      const p = r.players.get(playerId) ?? { id: playerId, name: String(name).slice(0, 24), role: late ? 'spectator' : 'player', score: 0, choice: null, hints: [], hintsTotal: 0 };
      p.dir = DIRS.includes(dir) ? dir : 'zh2ja';
      p.socketId = socket.id;
      p.accountId = verifyToken(token); // signed-in seats save scores and trap words
      r.players.set(playerId, p);
      socket.data = { code, playerId };
      socket.join(code);
      const channel = chatChannel(p);
      socket.join(`${code}:${channel}`);
      broadcast(r);
      // Earlier messages from this player's own chat (spectators never see player chat, and vice versa).
      const { rows } = await db.query('SELECT id, name, text, channel FROM room_messages WHERE room_code=$1 AND channel=$2 ORDER BY id DESC LIMIT 50', [code, channel]).catch(() => ({ rows: [] }));
      socket.emit('chat:history', rows.reverse().map((m) => ({ ...m, id: String(m.id) })));
    });
    socket.on('round:start', async ({ code }) => {
      const r = rooms.get(code);
      if (!r || !canStart(r, socket.data.playerId)) return;
      r.phase = 'dealing'; // blocks a second start while the deck loads
      await loadDeck(r).catch((e) => { console.error('Loading the deck failed:', e.message); r.pool = WORDS; r.queue = new Map(); });
      startRound(r, 1, LEAD_MS);
    });
    socket.on('host:done', ({ code, round }) => {
      const r = rooms.get(code); const id = socket.data?.playerId;
      if (!r || !id || r.phase !== 'question' || !r.reading || Number(round) !== r.round) return;
      r.done.add(id);
      if (allRead(r)) beginClock(r);
    });
    socket.on('round:next', ({ code }) => {
      const r = rooms.get(code);
      if (r && canAdvance(r, socket.data?.playerId)) nextCard(r);
    });
    // A player left: closed the tab (room:leave, instant) or the connection dropped (disconnect).
    const leave = () => {
      const { code, playerId } = socket.data ?? {};
      const r = rooms.get(code); const p = r?.players.get(playerId);
      if (!r || !p || p.socketId !== socket.id) return; // already handled, or they reconnected in another tab
      p.socketId = null;
      if (r.creatorId === playerId) r.creatorId = nextCreator(r) ?? playerId;
      if (r.phase === 'question') {
        // Don't keep waiting for someone who left: end the round if everyone still here has answered.
        if (everyoneAnswered(r)) { endRound(r); return; } // endRound broadcasts
        if (r.reading && allRead(r)) beginClock(r);
      }
      broadcast(r);
    };
    socket.on('room:leave', leave);
    socket.on('disconnect', leave);
    socket.on('answer:select', ({ code, choice }) => {
      const r = rooms.get(code); const p = r?.players.get(socket.data.playerId);
      if (!r || !p || r.phase !== 'question' || p.role !== 'player' || p.choice !== null) return;
      p.choice = Math.max(0, Math.min(3, Number(choice) | 0));
      db.query('INSERT INTO round_answers(room_code,round,player_key,choice,correct,hints_used) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [code, r.round, p.id, p.choice, p.choice === rightFor(r, p), p.hints]).catch(() => {});
      broadcast(r);
      if (everyoneAnswered(r)) { clearTimeout(r.timer); endRound(r); }
    });
    socket.on('hint:use', ({ code, kind }) => {
      const r = rooms.get(code); const p = r?.players.get(socket.data.playerId);
      if (!r || !p || r.phase !== 'question' || p.role !== 'player' || p.choice !== null || !(kind in HINT_COST) || p.hints.includes(kind)) return;
      p.hints.push(kind); p.hintsTotal = (p.hintsTotal ?? 0) + 1;
      broadcast(r);
    });
    // Players and spectators each have their own chat; neither sees the other's.
    socket.on('chat:send', ({ code, text }) => {
      const r = rooms.get(code); const p = r?.players.get(socket.data.playerId);
      const clean = String(text ?? '').trim().slice(0, 300);
      if (!p || !clean) return;
      const channel = chatChannel(p);
      const msg = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: p.name, text: clean, channel };
      io.to(`${code}:${channel}`).emit('chat:message', msg);
      db.query('INSERT INTO room_messages(room_code,channel,name,text) VALUES($1,$2,$3,$4)', [code, channel, p.name, clean]).catch(() => {});
    });
  });
}
