import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { ErrorBlock, LoadingBlock, Spinner } from "@/components/Spinner";
import { WordCard } from "@/components/words";
import { api, type CommunityWord, type WordList } from "@/lib/api";
import { RELATION_LABEL, type Relation } from "@/lib/words";

const SOURCES = { community: "Community words", all: "Every word", builtin: "Built-in words" } as const;
const SORTS = { top: "Top voted", new: "Newest", missed: "Most missed" } as const;
type Search = { source?: keyof typeof SOURCES | undefined; relation?: Relation | undefined; sort?: keyof typeof SORTS | undefined; q?: string | undefined };

export const Route = createFileRoute("/words/")({
  // The router reads "?relation=true" as the boolean true (and "?q=123" as a number), so compare as strings.
  validateSearch: (s: Record<string, unknown>): Search => {
    const str = (k: string) => (s[k] === undefined || s[k] === null ? "" : String(s[k]));
    return {
      source: Object.hasOwn(SOURCES, str("source")) ? (str("source") as Search["source"]) : undefined,
      relation: ["true", "false", "partial"].includes(str("relation")) ? (str("relation") as Relation) : undefined,
      sort: Object.hasOwn(SORTS, str("sort")) ? (str("sort") as Search["sort"]) : undefined,
      q: str("q").trim() || undefined,
    };
  },
  head: () => ({ meta: [{ title: "Word pool — Tandem" }, { name: "description", content: "False friends added by Tandem players. Vote the best ones into the game." }] }),
  component: WordsPage,
});

/** Container: filters live in the URL; this loads matching words page by page. */
function WordsPage() {
  const raw = Route.useSearch();
  const search = { ...raw, source: raw.source ?? "community", sort: raw.sort ?? "top" } as const;
  const nav = useNavigate({ from: "/words/" });
  const [data, setData] = useState<WordList | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [q, setQ] = useState(search.q ?? "");
  const query = (page: number) => {
    const p = new URLSearchParams({ source: search.source, sort: search.sort, page: String(page) });
    if (search.relation) p.set("relation", search.relation);
    if (search.q) p.set("q", search.q);
    return api<WordList>(`/words?${p}`);
  };
  const load = () => { setData(null); setError(""); query(1).then(setData, (e: Error) => setError(e.message)); };
  useEffect(load, [search.source, search.relation, search.sort, search.q]);
  // Search as you type, a moment after you stop.
  useEffect(() => { const t = setTimeout(() => { if ((search.q ?? "") !== q.trim()) void nav({ search: (p) => ({ ...p, q: q.trim() || undefined }) }); }, 350); return () => clearTimeout(t); }, [q]);

  const loadMore = async () => {
    if (!data) return;
    setMore(true);
    try { const next = await query(data.page + 1); setData({ ...next, words: [...data.words, ...next.words] }); }
    catch (e) { setError((e as Error).message); }
    finally { setMore(false); }
  };
  const replace = (w: CommunityWord) => setData((d) => d && { ...d, words: d.words.map((x) => (x.id === w.id ? w : x)) });

  return (
    <PageShell wide title="Word pool" subtitle={<>Add a false friend that tricked you. When a word reaches <b>{data?.approveAt ?? 2} votes</b>, it starts showing up in real games.</>}>
      <Filters search={search} q={q} setQ={setQ} set={(p) => nav({ search: (s) => ({ ...s, ...p }) })} />
      {error ? <ErrorBlock message={error} onRetry={load} /> : !data ? <LoadingBlock label="Shuffling the word pool…" /> : (
        data.words.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">{search.q || search.relation ? "No words match these filters." : "No community words yet."}</p>
            <Link to="/words/new" className="mt-4 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Add the first one</Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.words.map((w) => <WordCard key={w.id} w={w} onChange={replace} />)}</div>
            {data.hasMore && (
              <div className="mt-8 text-center">
                <button onClick={loadMore} disabled={more} className="rounded-xl border border-primary px-6 py-3 font-semibold text-primary disabled:opacity-50">
                  {more ? <Spinner label="Loading more…" /> : "Show more"}
                </button>
              </div>
            )}
          </>
        )
      )}
    </PageShell>
  );
}

/** Presenter: the filter and sort bar. */
function Filters({ search, q, setQ, set }: { search: Search; q: string; setQ: (v: string) => void; set: (p: Partial<Search>) => void }) {
  const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"}`;
  return (
    <div className="glass mb-6 space-y-3 rounded-2xl p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 手紙, letter, tegami…" aria-label="Search words"
          className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-4 py-2 outline-none focus:ring-2 focus:ring-ring" />
        <div className="flex gap-2">
          <select aria-label="Which words" value={search.source} onChange={(e) => set({ source: e.target.value as Search["source"] })} className="rounded-lg border border-input bg-background/60 px-3 py-2 text-sm">
            {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="Sort by" value={search.sort} onChange={(e) => set({ sort: e.target.value as Search["sort"] })} className="rounded-lg border border-input bg-background/60 px-3 py-2 text-sm">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <Link to="/words/new" className="hidden shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:block">+ Add a word</Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className={chip(!search.relation)} onClick={() => set({ relation: undefined })}>All</button>
        {(["false", "partial", "true"] as Relation[]).map((r) => <button key={r} className={chip(search.relation === r)} onClick={() => set({ relation: r })}>{RELATION_LABEL[r]}s</button>)}
        <Link to="/words/new" className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:hidden">+ Add</Link>
      </div>
    </div>
  );
}
