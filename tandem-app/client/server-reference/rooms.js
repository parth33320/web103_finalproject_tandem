// Live rooms for Tandem. Rooms run in memory while a game is on; rooms, answers and chat are saved to Postgres.
import { Server } from 'socket.io';
import { HINT_COST, pointsFor, createRoom, canStart, chatChannel, canAdvance, nextCreator, allRead } from './room-logic.js';
import { dealRound } from './content.js';

const ROUND_MS = 20000, READ_CAP_MS = 12000, TOTAL = 10, LEAD_MS = 1500; // TOTAL must match TOTAL_ROUNDS in src/lib/room.ts
const DIRS = ['zh2ja', 'ja2zh', 'en'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Japanese speakers guessing Chinese are scored against the Chinese meaning.
const rightFor = (r, p) => (p.dir === 'ja2zh' ? r.content?.zh.correct : r.correct);

export function attachRooms(app, server, origin, db) {
  const io = new Server(server, { cors: { origin } });
  const rooms = new Map();

  const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

  // Create a room: saved in Postgres, returns a real code.
  app.post('/api/rooms', async (_req, res) => {
    let code = newCode();
    for (let i = 0; i < 10 && rooms.has(code); i++) code = newCode();
    rooms.set(code, createRoom(code));
    await db.query('INSERT INTO rooms(code) VALUES($1) ON CONFLICT DO NOTHING', [code]).catch(() => {});
    res.status(201).json({ code });
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
    code: r.code, phase: r.phase === 'dealing' ? 'waiting' : r.phase, round: r.round, deadline: r.deadline, reading: !!r.reading, creatorId: r.creatorId,
    // Same card for everyone; the right answers stay hidden until the reveal.
    content: r.content ? { word: r.content.word, options: r.content.options, drop: r.content.drop, zh: { options: r.content.zh.options, drop: r.content.zh.drop } } : undefined,
    correct: r.phase === 'question' ? -1 : r.correct,
    correctZh: r.phase === 'question' || !r.content ? -1 : r.content.zh.correct,
    players: [...r.players.values()].map(({ socketId, ...p }) => p),
  });
  const broadcast = (r) => io.to(r.code).emit('room:state', publicState(r));

  function startRound(r, round, lead = 0) {
    r.seenIds ??= [];
    const content = dealRound(Math.floor(Math.random() * 1e9), r.seenIds); // random shuffle, never repeats a card in a game
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
    for (const p of r.players.values()) if (p.role === 'player' && p.choice === rightFor(r, p)) p.score += pointsFor(p.hints);
    broadcast(r); // stays on the reveal until the creator presses "Next card"
  }
  function nextCard(r) {
    if (r.round >= TOTAL) {
      r.phase = 'final'; broadcast(r);
      db.query('UPDATE rooms SET phase=$2 WHERE code=$1', [r.code, 'final']).catch(() => {});
      setTimeout(() => rooms.delete(r.code), 30 * 60_000);
    } else startRound(r, r.round + 1, LEAD_MS);
  }

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ code, playerId, name, dir }) => {
      code = String(code).slice(0, 8).toUpperCase(); playerId = String(playerId).slice(0, 64);
      const r = rooms.get(code);
      if (!r) return socket.emit('room:missing');
      r.creatorId ??= playerId;
      const late = r.phase !== 'waiting';
      const p = r.players.get(playerId) ?? { id: playerId, name: String(name).slice(0, 24), role: late ? 'spectator' : 'player', score: 0, choice: null, hints: [], hintsTotal: 0 };
      p.dir = DIRS.includes(dir) ? dir : 'zh2ja';
      p.socketId = socket.id;
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
    socket.on('round:start', ({ code }) => {
      const r = rooms.get(code);
      if (r && canStart(r, socket.data.playerId)) { r.phase = 'dealing'; startRound(r, 1, LEAD_MS); }
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
    socket.on('disconnect', () => {
      const { code, playerId } = socket.data ?? {};
      const r = rooms.get(code); const p = r?.players.get(playerId);
      if (!r || !p || p.socketId !== socket.id) return;
      p.socketId = null;
      if (r.creatorId === playerId) r.creatorId = nextCreator(r) ?? playerId;
      if (r.phase === 'question' && r.reading && allRead(r)) beginClock(r);
      broadcast(r);
    });
    socket.on('answer:select', ({ code, choice }) => {
      const r = rooms.get(code); const p = r?.players.get(socket.data.playerId);
      if (!r || !p || r.phase !== 'question' || p.role !== 'player' || p.choice !== null) return;
      p.choice = Math.max(0, Math.min(3, Number(choice) | 0));
      db.query('INSERT INTO round_answers(room_code,round,player_key,choice,correct,hints_used) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [code, r.round, p.id, p.choice, p.choice === rightFor(r, p), p.hints]).catch(() => {});
      broadcast(r);
      if ([...r.players.values()].filter((x) => x.role === 'player').every((x) => x.choice !== null)) { clearTimeout(r.timer); endRound(r); }
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
