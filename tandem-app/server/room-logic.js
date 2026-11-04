// Pure room rules (no network code) so they can be tested.
export const HINT_COST = { eliminate: 20, example: 30, category: 50 }; // must match src/lib/hints.ts
export const pointsFor = (used = []) => Math.max(0, 100 - [...new Set(used)].reduce((s, k) => s + (HINT_COST[k] ?? 0), 0));
// Must match hash() in src/lib/words.ts and buildRound() in src/lib/room.ts.
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return Math.abs(h); }
export const correctFor = (code, round, seed) => hash(`${seed}-${code}-${round}-c`) % 4;

/** Pure room logic, separated from sockets so it can be tested. */
export function createRoom(code) {
  // ownerId = whoever made the room; they get the host role back if they return after leaving.
  return { code, phase: 'waiting', round: 0, players: new Map(), creatorId: null, ownerId: null, seed: Math.floor(Math.random() * 1e9) + 1, deadline: 0, correct: -1 };
}
export function canStart(r, playerId) { return r.phase === 'waiting' && r.creatorId === playerId; }
export function chatChannel(p) { return p.role === 'spectator' ? 'spectators' : 'players'; }

/** Only the creator deals the next card, and only after the reveal. */
export function canAdvance(r, playerId) { return r.phase === 'reveal' && r.creatorId === playerId; }
/** When the creator leaves, the next connected player gets the "Next card" button. */
export function nextCreator(r) { return [...r.players.values()].find((p) => p.socketId && p.role === 'player')?.id ?? [...r.players.values()].find((p) => p.socketId)?.id ?? null; }
/** The clock starts once every connected player's host has finished reading. */
/** Players still at the table (connected, not watching). */
export function activePlayers(r) { return [...r.players.values()].filter((p) => p.socketId && p.role === 'player'); }
/** True when every connected player has answered (and at least one is still here); people who left aren't waited for. */
export function everyoneAnswered(r) { const a = activePlayers(r); return a.length > 0 && a.every((p) => p.choice !== null); }
/** Which rounds feature community words: up to 2, never round 1 (the first card is always a classic), all different. */
export function featuredRounds(count, total, rand = Math.random) {
  const rounds = Array.from({ length: total - 1 }, (_, i) => i + 2).sort(() => rand() - 0.5);
  return rounds.slice(0, Math.min(2, count)).sort((a, b) => a - b);
}
/** Right answers in practice games, in a row, before a word leaves your trap list. */
export const MASTER_AFTER = 2;

/** A practice deck: every trap word (marked `trap: true`), then "neighbors" to fill the game. A neighbor is the
 *  same kind of word (false / half / true friend) as a trap word, best of all one that shares a character with it
 *  (手紙 -> 切手). The cards are shuffled so traps and neighbors are mixed. */
export function practiceDeck(traps, pool, total, rand = Math.random) {
  const deck = traps.slice(0, total).map((w) => ({ ...w, trap: true }));
  const used = new Set(deck.map((w) => w.id));
  const chars = new Set(deck.flatMap((w) => [...w.form]));
  const relations = new Set(deck.map((w) => w.relation));
  const score = (w) => (relations.has(w.relation) ? 2 : 0) + ([...w.form].some((c) => chars.has(c)) ? 1 : 0);
  const fill = pool.filter((w) => !used.has(w.id)).map((w) => ({ w, s: score(w) + rand() })) // rand breaks ties
    .sort((a, b) => b.s - a.s).slice(0, total - deck.length).map((x) => x.w);
  const cards = [...deck, ...fill];
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards;
}
export function allRead(r) { return [...r.players.values()].filter((p) => p.socketId && p.role === 'player').every((p) => r.done?.has(p.id)); }
