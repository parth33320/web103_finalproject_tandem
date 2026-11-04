import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { HowToPlay } from "@/components/HowToPlay";

export const Route = createFileRoute("/how-to-play")({
  head: () => ({
    meta: [
      { title: "How to play — Tandem" },
      { name: "description", content: "How a game of Tandem works: rooms, cards, clues, false friends and scoring." },
    ],
  }),
  component: () => (
    <PageShell title="How to play" subtitle="A game takes about five minutes. Play with friends in the same room, or online from anywhere.">
      <div className="glass rounded-3xl p-6 sm:p-10"><HowToPlay /></div>
      <div className="mt-8 text-center">
        <Link to="/" className="inline-block rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">Take a seat</Link>
      </div>
    </PageShell>
  ),
});
