// Pure room rules (no network code) so they can be tested.
export const HINT_COST = { eliminate: 20, example: 30, category: 50 }; // must match src/lib/hints.ts
export const pointsFor = (used = []) => Math.max(0, 100 - [...new Set(used)].reduce((s, k) => s + (HINT_COST[k] ?? 0), 0));
// Must match hash() in src/lib/words.ts and buildRound() in src/lib/room.ts.
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return Math.abs(h); }
export const correctFor = (code, round, seed) => hash(`${seed}-${code}-${round}-c`) % 4;

/** Pure room logic, separated from sockets so it can be tested. */
export function createRoom(code) {
  return { code, phase: 'waiting', round: 0, players: new Map(), creatorId: null, seed: Math.floor(Math.random() * 1e9) + 1, deadline: 0, correct: -1 };
}
export function canStart(r, playerId) { return r.phase === 'waiting' && r.creatorId === playerId; }
export function chatChannel(p) { return p.role === 'spectator' ? 'spectators' : 'players'; }

/** Only the creator deals the next card, and only after the reveal. */
export function canAdvance(r, playerId) { return r.phase === 'reveal' && r.creatorId === playerId; }
/** When the creator leaves, the next connected player gets the "Next card" button. */
export function nextCreator(r) { return [...r.players.values()].find((p) => p.socketId && p.role === 'player')?.id ?? [...r.players.values()].find((p) => p.socketId)?.id ?? null; }
/** The clock starts once every connected player's host has finished reading. */
export function allRead(r) { return [...r.players.values()].filter((p) => p.socketId && p.role === 'player').every((p) => r.done?.has(p.id)); }
