import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { ErrorBlock, LoadingBlock, Spinner } from "@/components/Spinner";
import { Meanings, RelationTag } from "@/components/words";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, DIRECTION_LABEL, type CommunityWord, type MissedWord, type ScoreRow } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { requireSignIn } from "@/lib/guard";
import { createRoom } from "@/lib/room";

export const Route = createFileRoute("/me")({
  ssr: false,
  beforeLoad: requireSignIn, // guests are redirected to /login
  head: () => ({ meta: [{ title: "My table — Tandem" }] }),
  component: MyPage,
});

type Data = { missed: MissedWord[]; words: CommunityWord[]; scores: ScoreRow[] };

/** Container: loads everything about the signed-in player. */
function MyPage() {
  const { me, signOut, refresh } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<MissedWord | null>(null);
  const [starting, setStarting] = useState(false);

  const load = () => {
    setError("");
    Promise.all([api<MissedWord[]>("/me/missed"), api<CommunityWord[]>("/me/words"), api<ScoreRow[]>("/me/scores")])
      .then(([missed, words, scores]) => setData({ missed, words, scores }), (e: Error) => setError(e.message));
  };
  useEffect(load, []);

  const practice = async () => {
    setStarting(true);
    try { const code = await createRoom({ practice: true }); toast.success("Practice table ready. Your trap words come first."); await nav({ to: "/room/$code", params: { code } }); }
    catch (e) { toast.error((e as Error).message); setStarting(false); }
  };
  const gotIt = async (w: MissedWord) => {
    try {
      await api(`/me/missed/${w.id}`, { method: "DELETE" });
      setData((d) => d && { ...d, missed: d.missed.filter((x) => x.id !== w.id) });
      setOpen(null); void refresh();
      toast.success(`${w.form} is off your trap list. Nice work!`);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <PageShell wide>
      <section className="glass mb-8 flex flex-col items-center gap-5 rounded-3xl p-6 sm:flex-row">
        {me?.avatar_url && <img src={me.avatar_url} alt="" className="h-20 w-20 rounded-full ring-2 ring-primary" />}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="font-display text-4xl font-bold">{me?.username ?? "…"}</h1>
          <p className="text-sm text-muted-foreground">Signed in with GitHub{me && ` · playing since ${new Date(me.created_at).toLocaleDateString()}`}</p>
        </div>
        {me && (
          <dl className="grid grid-cols-4 gap-4 text-center">
            {([["Games", me.stats.games], ["Best", me.stats.best], ["Traps", me.stats.traps], ["Words", me.stats.words]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</dt><dd className="font-display text-3xl font-bold text-primary">{v}</dd></div>
            ))}
          </dl>
        )}
        <button onClick={() => { signOut(); void nav({ to: "/" }); }} className="rounded-full border border-input px-4 py-2 text-sm hover:bg-secondary">Sign out</button>
      </section>

      {error ? <ErrorBlock message={error} onRetry={load} /> : !data ? <LoadingBlock label="Gathering your cards…" /> : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-3xl font-bold">Words you keep missing</h2>
                <p className="text-sm text-muted-foreground">Every wrong answer lands here on its own. Tap a word to study it.</p>
              </div>
              <button onClick={practice} disabled={starting || data.missed.length === 0}
                className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-40">
                {starting ? <Spinner label="Dealing…" /> : "🎴 Practice my traps"}
              </button>
            </div>
            <TrapList words={data.missed} onOpen={setOpen} />
          </section>
          <aside className="space-y-8">
            <MyWords words={data.words} />
            <RecentGames scores={data.scores} />
          </aside>
        </div>
      )}

      {/* Modal: a closer look at one trap word, without leaving the page. */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 font-display text-3xl">{open.form} <RelationTag rel={open.relation} /></DialogTitle>
                <DialogDescription>You've fallen for this {open.miss_count} time{open.miss_count === 1 ? "" : "s"}. Last time was {new Date(open.last_missed_at).toLocaleDateString()}.</DialogDescription>
              </DialogHeader>
              <Meanings w={open} big />
              {open.note && <p className="rounded-xl border border-border bg-secondary/30 p-3 text-sm italic">✦ {open.note}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {open.source === "community" && <Link to="/words/$id" params={{ id: String(open.id) }} className="rounded-lg border border-input px-4 py-2 text-sm">View in word pool</Link>}
                <button onClick={() => gotIt(open)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">✓ I've got it now</button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function TrapList({ words, onOpen }: { words: MissedWord[]; onOpen: (w: MissedWord) => void }) {
  if (!words.length) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No traps yet. Play a game, and any word that tricks you will show up here. <Link to="/" className="text-primary underline">Take a seat</Link></div>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {words.map((w) => (
        <li key={w.id}>
          <button onClick={() => onOpen(w)} className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:ring-2 hover:ring-primary">
            <span className="font-['Noto_Serif_JP'] text-3xl font-semibold">{w.form}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">JP: {w.meaning_ja}</span>
              <span className="block truncate text-sm text-muted-foreground">ZH: {w.meaning_zh}</span>
            </span>
            <span className="rounded-full bg-destructive/20 px-2.5 py-1 text-xs font-bold text-destructive" title="Times missed">×{w.miss_count}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function MyWords({ words }: { words: CommunityWord[] }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Words you added</h2>
        <Link to="/words/new" className="text-sm text-primary underline">+ Add a word</Link>
      </div>
      {!words.length ? <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">Nothing yet. Add a false friend that once tricked you!</p> : (
        <ul className="glass divide-y divide-border/40 rounded-2xl">
          {words.map((w) => (
            <li key={w.id}>
              <Link to="/words/$id" params={{ id: String(w.id) }} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/30">
                <span className="font-['Noto_Serif_JP'] text-xl">{w.form}</span>
                <span className="text-xs text-muted-foreground">{w.in_deck ? "✓ in the deck" : "needs votes"} · {w.votes} ▲</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentGames({ scores }: { scores: ScoreRow[] }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-bold">Recent games</h2>
      {!scores.length ? <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">Games you finish while signed in show up here and on the leaderboard.</p> : (
        <ul className="glass divide-y divide-border/40 rounded-2xl text-sm">
          {scores.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span><b className="text-primary">{s.score}</b> · {s.correct}/{s.total} right</span>
              <span className="text-xs text-muted-foreground">{DIRECTION_LABEL[s.direction]} · {new Date(s.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
