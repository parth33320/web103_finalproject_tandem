import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { ErrorBlock, LoadingBlock } from "@/components/Spinner";
import { Meanings, RelationTag, VoteButtons, WordForm } from "@/components/words";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, type CommunityWord } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/words/$id")({
  head: () => ({ meta: [{ title: "Word — Tandem" }] }),
  component: WordPage,
});

/** One word: everyone can read and vote; its author can edit or delete it. */
function WordPage() {
  const { id } = Route.useParams();
  const { me } = useAuth();
  const nav = useNavigate();
  const [w, setW] = useState<CommunityWord | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = () => { setW(null); setError(""); api<CommunityWord>(`/words/${encodeURIComponent(id)}`).then(setW, (e: Error) => setError(e.message)); };
  useEffect(load, [id, me?.id]);

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/words/${w!.id}`, { method: "DELETE" });
      toast.success(`${w!.form} was removed from the pool.`);
      await nav({ to: "/words" });
    } catch (e) { toast.error((e as Error).message); setDeleting(false); }
  };

  if (error) return <PageShell><div className="pt-10"><ErrorBlock message={error} onRetry={load} /></div><p className="mt-6 text-center"><Link to="/words" className="underline">Back to the word pool</Link></p></PageShell>;
  if (!w) return <PageShell><LoadingBlock label="Turning the card over…" /></PageShell>;
  const mine = !!me && w.author?.id === me.id;

  return (
    <PageShell>
      <Link to="/words" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">← Word pool</Link>
      {editing ? (
        <>
          <h1 className="mb-6 font-display text-4xl font-bold">Edit {w.form}</h1>
          <WordForm initial={{ ...w, note: w.note ?? "" }} submitLabel="Save changes" onCancel={() => setEditing(false)} onSubmit={async (input) => {
            const updated = await api<CommunityWord>(`/words/${w.id}`, { method: "PATCH", body: input });
            setW(updated); setEditing(false);
            toast.success("Changes saved.");
          }} />
        </>
      ) : (
        <article className="glass rounded-3xl p-6 sm:p-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <RelationTag rel={w.relation} />
            {w.source === "community" ? (
              <span className={`text-sm ${w.in_deck ? "text-success" : "text-muted-foreground"}`}>{w.in_deck ? "✓ Dealt in real games" : "Waiting for votes before it joins the deck"}</span>
            ) : <span className="text-sm text-muted-foreground">Built-in word</span>}
          </div>
          <Meanings w={w} big />
          {w.note && <p className="mt-6 rounded-xl border border-border bg-secondary/30 p-4 italic">✦ {w.note}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              {w.author ? <>{w.author.avatar_url && <img src={w.author.avatar_url} alt="" className="h-6 w-6 rounded-full" />}Added by @{w.author.username}</> : "Part of the original 340-word deck"}
              {w.misses > 0 && <span>· players fell for it {w.misses} time{w.misses === 1 ? "" : "s"}</span>}
            </span>
            {w.source === "community" && <VoteButtons w={w} onChange={setW} />}
          </div>
          {mine && (
            <div className="mt-6 flex gap-3">
              <button onClick={() => setEditing(true)} className="rounded-xl border border-primary px-5 py-2 font-semibold text-primary">Edit</button>
              <AlertDialog>
                <AlertDialogTrigger disabled={deleting} className="rounded-xl border border-destructive px-5 py-2 font-semibold text-destructive disabled:opacity-50">Delete</AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {w.form}?</AlertDialogTitle>
                    <AlertDialogDescription>It leaves the word pool, along with its {w.votes} vote{w.votes === 1 ? "" : "s"}. You can't undo this.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? "Deleting…" : "Delete"}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </article>
      )}
    </PageShell>
  );
}
