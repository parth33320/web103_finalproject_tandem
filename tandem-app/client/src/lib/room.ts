import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { WORDS, type Word } from "./words";
import type { HintKind } from "./hints";
import { setFor, type Direction, type OptionSet } from "./content";
import { API_URL, hasServer } from "./config";
import { getToken } from "./api";
import { toast } from "sonner";

export const ROUND_SECONDS = 20;
export const REVEAL_SECONDS = 4;
/** Cards dealt per game. Must match TOTAL in render-server/rooms.js. */
export const TOTAL_ROUNDS = 10;

export type Role = "player" | "spectator";
export type Player = { id: string; name: string; dir?: Direction; role: Role; score: number; choice: number | null; hints?: HintKind[]; hintsTotal?: number; online?: boolean; signedIn?: boolean };
export type Chat = { id: string; name: string; text: string; channel?: "players" | "spectators" };
export type Phase = "connecting" | "missing" | "waiting" | "question" | "reveal" | "final";
export type RoomState = {
  code: string;
  phase: Phase;
  round: number;
  options: string[];
  correct: number;
  deadline: number;
  /** True while the hosts are still reading the question; the clock hasn't started. */
  reading?: boolean;
  players: Player[];
  chat: Chat[];
  creatorId?: string | undefined;
  /** Current card. */
  word?: Word | undefined;
  /** Option indexes the Eliminate clue removes this round. */
  drop?: number[] | undefined;
  /** Chinese-meaning option set (Japanese speakers guessing Chinese). */
  zh?: OptionSet | undefined;
  /** Words dealt this game, for the similarity meter. */
  seen?: Word[] | undefined;
  /** Words this player got wrong (or ran out of time on) this game. */
  missed?: Word[] | undefined;
  /** A practice room deals the creator's trap words. */
  practice?: boolean | undefined;
  /** Trap words this player mastered during this practice game (off their list now). */
  mastered?: string[] | undefined;
};

export { API_URL, hasServer };

export const wordOf = (s: RoomState): Word => s.word ?? WORDS[0]!;

/** Creates a room on the server (saved in Postgres) and returns its code.
 *  `practice` (signed in) deals the words you keep missing. */
export async function createRoom({ practice = false } = {}): Promise<string> {
  const token = getToken();
  const r = await fetch(`${API_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ practice }),
  });
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error || `Server error ${r.status}`);
  return ((await r.json()) as { code: string }).code;
}
/** Looks a room up before joining. */
export async function findRoom(code: string): Promise<{ exists: boolean; phase?: string }> {
  const r = await fetch(`${API_URL}/api/rooms/${encodeURIComponent(code.toUpperCase())}`);
  if (r.status === 404) return { exists: false };
  if (!r.ok) throw new Error(`Server error ${r.status}`);
  return (await r.json()) as { exists: boolean; phase?: string };
}

type ServerState = Omit<RoomState, "chat" | "word" | "options" | "drop" | "zh" | "seen"> & {
  content?: { word: Word; options: string[]; drop: number[]; zh: { options: string[]; drop: number[] } };
  correctZh?: number;
  missing?: boolean;
};

/** Live room on the Render server (Socket.io). Everyone gets the same card at the same moment. */
export function useRoom(code: string, me: Player) {
  const [state, setState] = useState<RoomState>({
    code, phase: hasServer ? "connecting" : "missing", round: 0, options: [], correct: -1, deadline: 0, players: [], chat: [],
  });
  const sock = useRef<Socket | null>(null);
  useEffect(() => {
    if (!hasServer) return;
    const s = io(API_URL, { transports: ["websocket", "polling"] });
    sock.current = s;
    const join = () => s.emit("room:join", { code, playerId: me.id, name: me.name, dir: me.dir, token: getToken() });
    s.on("score:saved", ({ score }: { score: number }) => toast.success(`Score saved to the leaderboard: ${score} points`));
    // Practice games: each right answer on a trap word counts toward mastering it.
    s.on("trap:progress", ({ form, streak, mastered, needed }: { form: string; streak: number; mastered: boolean; needed: number }) => {
      if (mastered) {
        toast.success(`${form} mastered! It's off your trap list. 🎉`);
        setState((prev) => ({ ...prev, mastered: [...new Set([...(prev.mastered ?? []), form])] }));
      } else toast(`${form}: ${needed - streak} more right answer${needed - streak === 1 ? "" : "s"} to master it.`);
    });
    s.on("connect", join);
    let tries = 0;
    s.on("room:missing", () => {
      // A sleeping free server may still be starting up: retry a few times before giving up.
      if (tries++ < 3) { setTimeout(join, 2500 * tries); return; }
      setState((p) => ({ ...p, phase: "missing" }));
    });
    s.on("room:state", (st: ServerState) => {
      // The server deals each card once and hides the right answers (-1) until the reveal.
      const { content, correctZh, missing: _m, ...rest } = st;
      setState((prev) => {
        const seen = content && !(prev.seen ?? []).some((w) => w.id === content.word.id) ? [...(prev.seen ?? []), content.word] : prev.seen;
        // At the reveal, remember the card if this player got it wrong (judged in their own direction).
        let missed = prev.missed;
        const mine = st.players.find((p) => p.id === me.id);
        if (st.phase === "reveal" && content && mine?.role === "player" && !(missed ?? []).some((w) => w.id === content.word.id)) {
          const right = (mine.dir ?? me.dir) === "ja2zh" ? correctZh : st.correct;
          if (mine.choice !== right) missed = [...(missed ?? []), content.word];
        }
        return { ...prev, ...rest, seen, missed, word: content?.word, options: content?.options ?? [], drop: content?.drop, zh: content ? { ...content.zh, correct: correctZh ?? -1 } : undefined };
      });
    });
    s.on("chat:history", (list: Chat[]) => setState((prev) => ({ ...prev, chat: list })));
    s.on("chat:message", (m: Chat) => setState((prev) => ({ ...prev, chat: [...prev.chat, m].slice(-100) })));
    // Tell the server right away when the tab closes or navigates away, so the host role moves instantly.
    const leave = () => { s.emit("room:leave", { code }); s.disconnect(); };
    // Coming back via the browser's Back button can restore a frozen page: reconnect (which rejoins the same seat).
    const back = (e: PageTransitionEvent) => { if (e.persisted && !s.connected) s.connect(); };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", back);
    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", back);
      s.disconnect();
    };
  }, [code, me.id]);

  // Show this player the choices for their own direction.
  const set = state.zh ? setFor({ options: state.options, correct: state.correct, drop: state.drop ?? [], zh: state.zh }, me.dir ?? "zh2ja") : null;
  return {
    state: set ? { ...state, options: set.options, correct: set.correct, drop: set.drop } : state,
    start: () => sock.current?.emit("round:start", { code }),
    next: () => sock.current?.emit("round:next", { code }),
    hostDone: (round: number) => sock.current?.emit("host:done", { code, round }),
    choose: (i: number) => sock.current?.emit("answer:select", { code, choice: i }),
    sendChat: (text: string) => sock.current?.emit("chat:send", { code, text }),
    takeHint: (kind: HintKind) => sock.current?.emit("hint:use", { code, kind }),
  };
}
