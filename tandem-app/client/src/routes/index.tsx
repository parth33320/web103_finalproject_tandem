import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cinematic } from "@/components/Cinematic";
import { Footer, SiteNav } from "@/components/PageShell";
import { Chip } from "@/components/SettingsSheet";
import { Spinner } from "@/components/Spinner";
import { LINES, speak } from "@/lib/host";
import { DIRECTIONS, useSettings } from "@/lib/settings";
import { createRoom, findRoom, hasServer } from "@/lib/room";
import { useAuth } from "@/lib/auth";
import table from "@/assets/table-felt.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tandem — Take a Seat at the Word Table" },
      { name: "description", content: "A live party game about Chinese and Japanese words that look the same but don't mean the same." },
      { property: "og:title", content: "Tandem — Take a Seat at the Word Table" },
      { property: "og:description", content: "A cinematic multiplayer card game about Chinese and Japanese false friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const WAKING = "Couldn't reach the game server. It may be waking up — try again in a minute.";

function Index() {
  const { s, set } = useSettings();
  const { me, signIn } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"" | "create" | "join">("");
  const [error, setError] = useState("");
  // Signed-in players start with their GitHub name (they can still change it).
  useEffect(() => { if (me && !name) setName(me.username.slice(0, 24)); }, [me?.id]);

  const ready = name.trim().length >= 2;
  const enter = (roomCode: string) => {
    set({ name: name.trim() });
    speak(LINES[s.lang].welcome(name.trim()), s.lang, s.voice, s.muted);
    void nav({ to: "/room/$code", params: { code: roomCode.toUpperCase() } });
  };
  const create = async () => {
    setBusy("create"); setError("");
    try { const c = await createRoom(); toast.success(`Room ${c} is ready. Share the code with your friends!`); enter(c); }
    catch { setError(WAKING); setBusy(""); }
  };
  const join = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = code.trim().toUpperCase();
    if (!ready || c.length < 3) return;
    setBusy("join"); setError("");
    try {
      const r = await findRoom(c);
      if (r.exists) enter(c);
      else { setError(`There's no room called ${c}. Check the code with your friend.`); setBusy(""); }
    } catch { setError(WAKING); setBusy(""); }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Cinematic />
      <img src={table} alt="" className="camera-push absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <SiteNav />
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-6 pb-14 pt-4">
        <motion.header initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground">Chinese × Japanese</p>
          <h1 className="gold-text mt-3 text-5xl font-bold sm:text-7xl md:text-8xl">Tandem</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Same characters, different meanings. Take a seat, and see if you can spot the trap.
          </p>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1 }}
          className="glass mx-auto mt-10 w-full max-w-xl space-y-6 overflow-hidden rounded-3xl p-5 sm:p-8">
          <fieldset disabled={!!busy} className="space-y-6">
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. 王小明 (Wang Xiaoming)" autoComplete="nickname"
                className="w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="I already know…">
              <div className="grid gap-2">
                {DIRECTIONS.map((d) => <Chip key={d.id} active={s.dir === d.id} onClick={() => set({ dir: d.id })}>{d.label}</Chip>)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{DIRECTIONS.find((d) => d.id === s.dir)?.hint}</p>
            </Field>
          </fieldset>

          <div className="space-y-3">
            <button disabled={!ready || !!busy || !hasServer} onClick={create}
              className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-40">
              {busy === "create" ? <Spinner label="Setting the table…" /> : "Create a room"}
            </button>
            <form onSubmit={join} className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} placeholder="Friend's room code" maxLength={8} disabled={!!busy} aria-label="Room code"
                className="w-0 min-w-0 flex-1 rounded-xl border border-input bg-background/60 px-4 py-3 uppercase tracking-widest outline-none" />
              <button type="submit" disabled={!ready || !!busy || !hasServer || code.trim().length < 3}
                className="shrink-0 rounded-xl border border-primary px-6 font-semibold text-primary disabled:opacity-40">{busy === "join" ? "Joining…" : "Join"}</button>
            </form>
            {!ready && <p className="text-xs text-muted-foreground">Type a name (at least 2 letters) to sit down.</p>}
            {error && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{error}</p>}
            {!hasServer && <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">The game server isn't connected yet. Set <b>VITE_API_URL</b> to your Render server address to open the tables.</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4 text-sm text-muted-foreground">
            <Link to="/how-to-play" className="text-primary underline">New here? How to play</Link>
            {me ? <span>Signed in: your scores and trap words are saved.</span>
              : <button onClick={() => signIn("/")} className="underline">Sign in to save your progress</button>}
          </div>
        </motion.section>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
