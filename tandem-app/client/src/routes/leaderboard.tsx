import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { ErrorBlock, LoadingBlock } from "@/components/Spinner";
import { api, DIRECTION_LABEL, type LeaderRow } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Direction } from "@/lib/content";

const DIRS: Direction[] = ["zh2ja", "ja2zh", "en"];
const SORTS = { score: "Best score", accuracy: "Accuracy", recent: "Most recent" } as const;
type Sort = keyof typeof SORTS;

export const Route = createFileRoute("/leaderboard")({
  // The chosen board and sort live in the URL, so a link shows the same view.
  validateSearch: (s: Record<string, unknown>): { direction?: Direction | undefined; sort?: Sort | undefined } => ({
    direction: DIRS.includes(String(s["direction"]) as Direction) ? (String(s["direction"]) as Direction) : undefined,
    sort: Object.hasOwn(SORTS, String(s["sort"])) ? (String(s["sort"]) as Sort) : undefined,
  }),
  head: () => ({ meta: [{ title: "Leaderboard — Tandem" }] }),
  component: Leaderboard,
});

/** Container: reads the URL, loads the board, hands rows to the table. */
function Leaderboard() {
  const { direction = "zh2ja", sort = "score" } = Route.useSearch();
  const nav = useNavigate({ from: "/leaderboard" });
  const { me } = useAuth();
  const [rows, setRows] = useState<LeaderRow[] | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    setRows(null); setError("");
    api<{ entries: LeaderRow[] }>(`/leaderboard?direction=${direction}&sort=${sort}`).then((r) => setRows(r.entries), (e: Error) => setError(e.message));
  };
  useEffect(load, [direction, sort]);

  return (
    <PageShell title="High Rollers" subtitle="Each player's best game. Chinese speakers and Japanese speakers each get their own board, so you can see who reads the other language better.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Direction" className="glass flex flex-wrap gap-1 rounded-2xl p-1">
          {DIRS.map((d) => (
            <button key={d} role="tab" aria-selected={d === direction} onClick={() => nav({ search: (p) => ({ ...p, direction: d }) })}
              className={`rounded-xl px-3 py-2 text-sm transition ${d === direction ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-secondary"}`}>
              {DIRECTION_LABEL[d]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          <select value={sort} onChange={(e) => nav({ search: (p) => ({ ...p, sort: e.target.value as Sort }) })}
            className="rounded-lg border border-input bg-background/60 px-3 py-2">
            {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
      </div>
      {error ? <ErrorBlock message={error} onRetry={load} /> : !rows ? <LoadingBlock label="Counting the chips…" /> : <Board rows={rows} meId={me?.id} />}
      {!me && <p className="mt-6 text-center text-sm text-muted-foreground"><Link to="/login" search={{ redirect: "/leaderboard" }} className="text-primary underline">Sign in with GitHub</Link> and your games will show up here.</p>}
    </PageShell>
  );
}

/** Presenter: the ranked table. */
function Board({ rows, meId }: { rows: LeaderRow[]; meId: number | undefined }) {
  if (!rows.length) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No games on this board yet. <Link to="/" className="text-primary underline">Be the first high roller.</Link></div>;
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <ol className="glass divide-y divide-border/40 overflow-hidden rounded-2xl">
      {rows.map((r, i) => (
        <motion.li key={r.player_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[3rem_minmax(0,1fr)_6rem_6rem_7rem] ${r.player_id === meId ? "bg-primary/15" : ""}`}>
          <span className="font-display text-2xl font-bold">{medal[i] ?? i + 1}</span>
          <span className="flex min-w-0 items-center gap-2 truncate">
            {r.avatar_url && <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full" />}
            <span className="truncate font-semibold">{r.username}</span>
            {r.player_id === meId && <span className="text-xs text-primary">(you)</span>}
          </span>
          <span className="hidden text-right text-sm text-muted-foreground sm:block">{r.correct}/{r.total} right</span>
          <span className="hidden text-right text-sm text-muted-foreground sm:block">{r.games} game{r.games === 1 ? "" : "s"}</span>
          <span className="text-right font-display text-2xl font-bold text-primary">{r.score}</span>
        </motion.li>
      ))}
    </ol>
  );
}
