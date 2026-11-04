// Talks to the Tandem server's REST API. Errors carry the server's friendly message (and per-field messages for forms).
import { API_URL, hasServer } from "./config";
import type { Relation, WordRow } from "./words";
import type { Direction } from "./content";

const TOKEN_KEY = "tandem-token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked (private mode): stay signed out */ } };

export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string> = {}, public existingId?: number) { super(message); }
}

/** fetch() for the API: adds the sign-in token and turns every failure into an ApiError with a readable message. */
export async function api<T>(path: string, { method = "GET", body }: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!hasServer) throw new ApiError("The game server isn't connected yet.", 0);
  const token = getToken();
  let r: Response;
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    r = await fetch(`${API_URL}/api${path}`, { method, headers, ...(body !== undefined && { body: JSON.stringify(body) }) });
  } catch {
    throw new ApiError("Couldn't reach the game server. It may be waking up — try again in a minute.", 0);
  }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && token) { setToken(null); window.dispatchEvent(new Event("tandem:signed-out")); }
    throw new ApiError(data.error || `Something went wrong (${r.status}).`, r.status, data.fields, data.existingId);
  }
  return data as T;
}

export type Author = { id: number; username: string; avatar_url: string | null };
export type CommunityWord = WordRow & {
  source: "builtin" | "community"; author: Author | null; votes: number; misses: number; my_vote: -1 | 0 | 1;
  in_deck: boolean; created_at: string; updated_at: string;
};
export type WordList = { words: CommunityWord[]; page: number; hasMore: boolean; approveAt: number };
export type WordInput = { form: string; zh_form?: string; reading: string; pinyin: string; meaning_ja: string; meaning_zh: string; relation: Relation; note?: string };
export type MissedWord = WordRow & { source: string; miss_count: number; last_missed_at: string };
export type ScoreRow = { id: number; direction: Direction; score: number; correct: number; total: number; created_at: string };
export type LeaderRow = { player_id: number; username: string; avatar_url: string | null; score: number; correct: number; total: number; games: number; created_at: string };
export type ServerSettings = { dir: Direction; lang: string; voice: string; theme: string; muted: boolean };
export type Me = Author & { created_at: string; settings: ServerSettings | null; stats: { games: number; best: number; words: number; traps: number } };

export const RELATION_STYLE: Record<Relation, string> = {
  false: "bg-destructive text-destructive-foreground",
  partial: "bg-primary text-primary-foreground",
  true: "bg-success text-background",
};
export const DIRECTION_LABEL: Record<Direction, string> = { zh2ja: "Chinese → Japanese", ja2zh: "Japanese → Chinese", en: "Neither (English)" };
