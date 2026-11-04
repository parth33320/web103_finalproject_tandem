import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { WordForm } from "@/components/words";
import { api, type CommunityWord } from "@/lib/api";
import { requireSignIn } from "@/lib/guard";

export const Route = createFileRoute("/words/new")({
  ssr: false,
  beforeLoad: requireSignIn, // guests are redirected to /login
  head: () => ({ meta: [{ title: "Add a word — Tandem" }] }),
  component: NewWord,
});

function NewWord() {
  const nav = useNavigate();
  return (
    <PageShell title="Add a word" subtitle="Know a word that means one thing in Japanese and something else in Chinese? Add it to the pool.">
      <WordForm submitLabel="Add to the pool" onSubmit={async (input) => {
        const w = await api<CommunityWord>("/words", { method: "POST", body: input });
        toast.success(`${w.form} was added. It needs one more upvote to join the game deck.`);
        await nav({ to: "/words/$id", params: { id: String(w.id) } });
      }} onCancel={() => nav({ to: "/words" })} />
      <p className="mt-4 text-center text-sm text-muted-foreground">Check the <Link to="/words" search={{ source: "all", sort: "top" }} className="underline">full word list</Link> first. Each word can only be added once.</p>
    </PageShell>
  );
}
