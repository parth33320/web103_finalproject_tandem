import { Link } from "@tanstack/react-router";
import { BASE_POINTS, HINT_COST, HINT_LABEL, HINT_ORDER } from "@/lib/hints";
import { ROUND_SECONDS, TOTAL_ROUNDS } from "@/lib/room";
import { RELATION_STYLE } from "@/lib/api";

/** The rules, used on the /how-to-play page and in the in-game "How to play" pop-up. */
export function HowToPlay({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`space-y-6 ${compact ? "text-sm" : ""}`}>
      <Step n={1} title="Take a seat">
        Type your name and choose what you already know: <b>Chinese</b>, <b>Japanese</b>, or <b>neither</b>.
        Press <b>Create a room</b> and send the room code to friends, or type a friend's code and press <b>Join</b>.
        The person who created the room starts the game when everyone is seated.
      </Step>

      <Step n={2} title="Read the card">
        You'll get {TOTAL_ROUNDS} cards. Your host reads each one aloud, then you have <b>{ROUND_SECONDS} seconds</b> to pick
        what it means in the other language. Chinese speakers see Japanese words, and Japanese speakers see Chinese words, but
        everyone gets the same card at the same moment.
      </Step>

      <Step n={3} title="Watch for the trap">
        Both languages write words with the same characters, but they don't always mean the same thing:
        <ul className="mt-3 space-y-2">
          <li><Tag rel="true">True friend</Tag> same characters, same meaning: 電話 is a telephone in both languages.</li>
          <li><Tag rel="false">False friend</Tag> same characters, different meaning: 手紙 is a <i>letter</i> in Japanese but <i>toilet paper</i> in Chinese.</li>
          <li><Tag rel="partial">Half friend</Tag> related, but the meaning has shifted between the two languages.</li>
        </ul>
        <p className="mt-2">On false friends, one of the four choices is always the other language's meaning. That's the trap.</p>
      </Step>

      <Step n={4} title="Use clues if you're stuck">
        A right answer is worth <b>{BASE_POINTS} points</b>. Each clue lowers what it's worth:
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {HINT_ORDER.map((k) => (
            <li key={k} className="rounded-xl border border-border bg-secondary/40 p-3">
              <span className="text-lg">{HINT_LABEL[k].icon}</span> <b>{HINT_LABEL[k].title}</b> <span className="text-muted-foreground">−{HINT_COST[k]}</span>
              <span className="block text-xs text-muted-foreground">It {HINT_LABEL[k].what}.</span>
            </li>
          ))}
        </ul>
      </Step>

      <Step n={5} title="The reveal">
        When everyone has answered or time runs out, the card flips over. You'll see the word in both languages side by side,
        with its reading, its meaning, and a fun fact. The room creator deals the next card.
      </Step>

      <Step n={6} title="Who wins">
        The highest score after {TOTAL_ROUNDS} cards wins. The <b>similarity meter</b> shows how many of the words you saw
        mean the same thing in both languages. If you join late, you watch the current card and play from the next one.
      </Step>

      <Step n={7} title="Sign in for more (optional)">
        Guests can play everything. If you <b>sign in with GitHub</b>:
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Words you get wrong go on your <b>trap list</b>, and you can play a practice game made only of your trap words.</li>
          <li>Your best games go on the <Link to="/leaderboard" className="text-primary underline">leaderboard</Link>, with a separate board for each direction.</li>
          <li>You can add your own false friends to the <Link to="/words" className="text-primary underline">community word pool</Link>. Once a word gets enough upvotes, it starts showing up in real games.</li>
        </ul>
      </Step>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0">
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <div className="mt-1 leading-relaxed text-foreground/90">{children}</div>
      </div>
    </section>
  );
}
export function Tag({ rel, children }: { rel: "true" | "false" | "partial"; children: React.ReactNode }) {
  return <span className={`mr-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${RELATION_STYLE[rel]}`}>{children}</span>;
}
