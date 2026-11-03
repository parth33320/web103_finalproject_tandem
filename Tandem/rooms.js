// Live rooms for Tandem. Rooms run in memory; results are saved to Postgres.
import { Server } from 'socket.io';

const ROUND_MS = 20000, REVEAL_MS = 4000, TOTAL = 6, LEAD_MS = 1500;
import { HINT_COST, pointsFor, correctFor, createRoom, canStart, chatChannel } from './room-logic.js';

export function attachRooms(server, origin, db) {
  const io = new Server(server, { cors: { origin } });
  const rooms = new Map();
  const publicState = (r) => ({
    code: r.code, phase: r.phase, round: r.round, seed: r.seed, deadline: r.deadline, creatorId: r.creatorId,
    correct: r.phase === 'question' ? -1 : r.correct,
    players: [...r.players.values()].map(({ socketId, ...p }) => p),
  });
  const broadcast = (r) => io.to(r.code).emit('room:state', publicState(r));

  function startRound(r, round, lead = 0) {
    Object.assign(r, { round, phase: 'question', correct: correctFor(r.code, round, r.seed), deadline: Date.now() + lead + ROUND_MS });
    for (const p of r.players.values()) {
      p.choice = null; p.hints = [];
      if (p.role === 'spectator') { p.role = 'player'; io.sockets.sockets.get(p.socketId)?.leave(`${r.code}:spectators`); io.sockets.sockets.get(p.socketId)?.join(`${r.code}:players`); }
    }
    broadcast(r);
    clearTimeout(r.timer);
    r.timer = setTimeout(() => endRound(r), lead + ROUND_MS);
    db.query('UPDATE rooms SET phase=$2, round=$3 WHERE code=$1', [r.code, 'question', round]).catch(() => {});
  }
  function endRound(r) {
    if (r.phase !== 'question') return;
    r.phase = 'reveal'; r.deadline = Date.now() + REVEAL_MS;
    for (const p of r.players.values()) if (p.role === 'player' && p.choice === r.correct) p.score += pointsFor(p.hints);
    broadcast(r);
    r.timer = setTimeout(() => {
      if (r.round >= TOTAL) { r.phase = 'final'; broadcast(r); setTimeout(() => rooms.delete(r.code), 30 * 60_000); }
      else startRound(r, r.round + 1);
    }, REVEAL_MS);
  }

  io.on('connection', (socket) => {
    socket.on('room:join', async ({ code, playerId, name }) => {
      code = String(code).slice(0, 8).toUpperCase(); playerId = String(playerId).slice(0, 64);
      let r = rooms.get(code);
      if (!r) { r = createRoom(code); rooms.set(code, r); db.query('INSERT INTO rooms(code) VALUES($1) ON CONFLICT DO NOTHING', [code]).catch(() => {}); }
      r.creatorId ??= playerId;
      const late = r.phase !== 'waiting';
      const p = r.players.get(playerId) ?? { id: playerId, name: String(name).slice(0, 24), role: late ? 'spectator' : 'player', score: 0, choice: null, hints: [], hintsTotal: 0 };
      p.socketId = socket.id;
      r.players.set(playerId, p);
      socket.data = { code, playerId };
      socket.join(code);
      socket.join(`${code}:${chatChannel(p)}`);
      broadcast(r);
    });
    socket.on('round:start', ({ code }) => {
      const r = rooms.get(code);
      if (r && canStart(r, socket.data.playerId)) startRound(r, 1, LEAD_MS);
    });
    socket.on('answer:select', ({ code, choice }) => {
      const r = rooms.get(code); const p = r?.players.get(socket.data.playerId);
      if (!r || !p || r.phase !== 'question' || p.role !== 'player' || p.choice !== null) return;
      p.choice = Math.max(0, Math.min(3, Number(choice) | 0));
      db.query('INSERT INTO round_answers(room_code,round,player_key,choice,correct,hints_used) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [code, r.round, p.id, p.choice, p.choice === r.correct, p.hints]).catch(() => {});
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
