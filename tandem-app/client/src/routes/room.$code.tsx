import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { HandPointer } from "@/components/HandPointer";
import { Cinematic, RevealFlare } from "@/components/Cinematic";
import { PageCard } from "@/components/PageCard";
import { Deck } from "@/components/Deck";
import { LINES, speak } from "@/lib/host";
import { useSettings } from "@/lib/settings";
import { useRoom, wordOf, TOTAL_ROUNDS, type RoomState } from "@/lib/room";
import { playCorrect, playSwoosh, playTick, playWrong, setSfxMuted } from "@/utils/soundEffects.js";
import { RELATION_LABEL, personalFact } from "@/lib/words";
import { similarity } from "@/lib/content";
import { HINT_COST, HINT_ORDER, eliminated, pointsFor, type HintKind } from "@/lib/hints";
import table from "@/assets/table-felt.jpg";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — Tandem` },
      { name: "description", content: "A live Tandem table: answer together, hear your personal host, and see who wins." },
      { property: "og:title", content: `Room ${params.code} — Tandem` },
      { property: "og:description", content: "Join this live Chinese × Japanese word duel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

const LETTERS = ["A", "B", "C", "D"];

function RoomPage() {
  const { code } = Route.useParams();
  const { s, set } = useSettings();
  const name = s.name || "Guest";
  const [uid] = useState(() => Math.random().toString(36).slice(2, 10));
  const me = useMemo(() => ({ id: `u-${uid}`, name, dir: s.dir, role: "player" as const, score: 0, choice: null }), [name, uid, s.dir]);
  const { state, start, choose, sendChat, takeHint } = useRoom(code, me);
  const meP = state.players.find((p) => p.id === me.id);
  const isSpectator = meP?.role === "spectator";
  useHostVoice(state, me.id, name);
  useSoundEffects(state, me.id);

  return (
    <main className="no-cursor relative min-h-screen overflow-hidden">
      <HandPointer />
      <CineLayer state={state} meId={me.id} />
      <img src={table} alt="" className="camera-push absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/80" />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link to="/" className="font-display text-2xl font-bold gold-text">Tandem</Link>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          <span className="rounded-full bg-success px-3 py-1.5 text-background">● Live room</span>
          <span className="glass rounded-full px-3 py-1.5 tracking-widest sm:px-4">ROOM {code}</span>
          {isSpectator && <span className="rounded-full bg-accent px-3 py-1.5 text-accent-foreground">Watching</span>}
          <button onClick={() => set({ muted: !s.muted })} className="glass rounded-full px-3 py-1.5">{s.muted ? "🔇 Sound off" : "🔊 Sound on"}</button>
        </div>
      </header>

      <div className="relative z-10">
        {state.phase === "connecting" && <Notice title="Connecting to the table…" body="Free servers can take up to a minute to wake up." />}
        {state.phase === "missing" && <Notice title="Room not found" body="Check the code with your friend, or create a new room." link />}
        {state.phase === "waiting" && <Waiting state={state} onStart={start} isCreator={state.creatorId === me.id} />}
        {(state.phase === "question" || state.phase === "reveal") &&
          (isSpectator
            ? <SpectatorView state={state} meName={name} onChat={sendChat} />
            : <PlayerView state={state} meId={me.id} meName={name} onChoose={choose} onHint={takeHint} />)}
        {state.phase !== "final" && !isSpectator && <PlayerChat chat={state.chat} onSend={sendChat} />}
        {state.phase === "final" && <Final state={state} meId={me.id} />}
      </div>
    </main>
  );
}

function useHostVoice(state: RoomState, meId: string, name: string) {
  const { s } = useSettings();
  const L = LINES[s.lang];
  const say = (t: string) => speak(t, s.lang, s.voice, s.muted);
  const meP = state.players.find((p) => p.id === meId);
  const prevRole = useRef<string | undefined>(undefined);
  const warned = useRef<string>("");

  useEffect(() => {
    if (!meP) return;
    if (prevRole.current === "spectator" && meP.role === "player") say(L.promoted);
    if (prevRole.current === undefined && meP.role === "spectator") say(L.spectate);
    prevRole.current = meP.role;
  }, [meP?.role]);

  useEffect(() => {
    if (state.phase === "question" && meP?.role === "player" && state.options.length === 4) {
      const w = wordOf(state);
      say(`${L.round(state.round)} ${L.question(s.dir === "ja2zh" ? w.zhForm : w.form, state.options)}`);
    }
    if (state.phase === "reveal" && meP?.role === "player") {
      const verdict = meP.choice === null ? L.timeUp : meP.choice === state.correct ? L.correct : L.wrong;
      say(`${verdict} ${L.answer(state.options[state.correct] ?? "")}`);
    }
    if (state.phase === "final") {
      const top = Math.max(...state.players.map((p) => p.score));
      say(meP && meP.score === top && top > 0 ? L.won(name) : L.lost(name));
    }
  }, [state.phase, state.round]);

  const usedKey = (meP?.hints ?? []).join(",");
  const spokenHints = useRef<string>("");
  useEffect(() => {
    if (state.phase !== "question") return;
    const list = meP?.hints ?? [];
    const last = list[list.length - 1];
    const key = `${state.round}-${list.length}`;
    if (!last || spokenHints.current === key) return;
    spokenHints.current = key;
    const w = wordOf(state);
    if (last === "eliminate") say(L.hintEliminate);
    if (last === "example") say(`${L.hintExample} ${w.example}`);
    if (last === "category") say(L.hintCategory(w.category));
  }, [usedKey, state.round]);

  useEffect(() => {
    if (state.phase !== "question" || meP?.role !== "player") return;
    const id = setInterval(() => {
      const left = Math.ceil((state.deadline - Date.now()) / 1000);
      const key = `${state.round}-${left}`;
      if ((left === 10 || left === 3) && warned.current !== key && meP.choice === null) {
        warned.current = key;
        say(left === 10 ? L.tenLeft : L.threeLeft);
      }
    }, 200);
    return () => clearInterval(id);
  }, [state.phase, state.round, state.deadline, meP?.choice, meP?.role]);
}

function CineLayer({ state, meId }: { state: RoomState; meId: string }) {
  const left = useSecondsLeft(state.deadline);
  const meP = state.players.find((p) => p.id === meId);
  const tension = state.phase === "question" && left > 0 && left <= 5;
  const reveal = state.phase === "reveal";
  const good = reveal && meP?.role === "player" ? meP.choice === (meP.dir === "ja2zh" ? (state.zh?.correct ?? -1) : state.correct) : null;
  return (
    <>
      <Cinematic tension={tension} />
      <RevealFlare show={reveal} good={good} />
    </>
  );
}

function useSecondsLeft(deadline: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(id); }, []);
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

function PlayerChat({ chat, onSend }: { chat: RoomState["chat"]; onSend: (t: string) => void }) {
  const [open, setOpen] = useState(true);
  const [msg, setMsg] = useState("");
  const list = chat.filter((c) => c.channel !== "spectators");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [list.length, open]);
  return (
    <aside className="glass fixed bottom-4 left-4 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="font-bold">Table chat</span>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : `Show (${list.length})`}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <div className="h-40 space-y-1.5 overflow-y-auto text-sm">
            {list.length === 0 && <p className="text-muted-foreground">Say hi to the other players.</p>}
            {list.map((c) => <p key={c.id}><b className="text-primary">{c.name}:</b> {c.text}</p>)}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) { onSend(msg.trim()); setMsg(""); } }} className="mt-2 flex gap-2">
            <input value={msg} maxLength={300} onChange={(e) => setMsg(e.target.value)} placeholder="Message players…" className="min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Send</button>
          </form>
        </div>
      )}
    </aside>
  );
}

function Waiting({ state, onStart, isCreator }: { state: RoomState; onStart: () => void; isCreator: boolean }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto mt-16 max-w-xl text-center">
      <h2 className="text-5xl font-bold">The table is set</h2>
      <p className="mt-3 text-muted-foreground">Share code <b className="tracking-widest text-primary">{state.code}</b> so friends can join.</p>
      <div className="glass mx-auto mt-8 grid grid-cols-2 gap-3 rounded-2xl p-6">
        {state.players.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
            className="rounded-xl bg-secondary/60 px-4 py-3 text-left">🎴 {p.name}</motion.div>
        ))}
      </div>
      {isCreator ? (
        <button onClick={onStart} className="mt-8 rounded-xl bg-primary px-10 py-4 text-lg font-bold text-primary-foreground hover:brightness-110">
          Deal the cards for everyone
        </button>
      ) : (
        <p className="mt-8 animate-pulse text-lg text-muted-foreground">Waiting for the room creator to deal the cards…</p>
      )}
    </motion.div>
  );
}

function Timer({ deadline, reveal }: { deadline: number; reveal: boolean }) {
  const left = useSecondsLeft(deadline);
  return (
    <div className={`glass flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-2xl font-bold md:h-20 md:w-20 md:text-4xl ${!reveal && left <= 5 ? "text-destructive" : "text-primary"}`}>
      {reveal ? "—" : left}
    </div>
  );
}

function WordFace({ state, meName }: { state: RoomState; meName: string }) {
  const w = wordOf(state);
  const { s } = useSettings();
  const reveal = state.phase === "reveal";
  const showZh = s.dir === "ja2zh";
  return (
    <div className="flex h-full flex-col p-6 text-center">
      <span className="text-xs uppercase tracking-[0.3em] opacity-60">Card {state.round} / {TOTAL_ROUNDS}</span>
      {reveal ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">{RELATION_LABEL[w.relation]}</span>
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-start gap-2">
            <div>
              <span className="block text-[10px] uppercase tracking-widest opacity-60">Japanese</span>
              <span className="block font-['Noto_Serif_JP'] text-3xl font-semibold md:text-4xl">{w.form}</span>
              <span className="block text-xs opacity-70">{w.reading}</span>
              <span className="mt-1 block text-sm font-semibold">{w.ja}</span>
            </div>
            <span className="pt-6 text-xl opacity-50">↔</span>
            <div>
              <span className="block text-[10px] uppercase tracking-widest opacity-60">Chinese</span>
              <span className="block font-['Noto_Serif_JP'] text-3xl font-semibold md:text-4xl">{w.zhForm}</span>
              <span className="block text-xs opacity-70">{w.pinyin}</span>
              <span className="mt-1 block text-sm font-semibold">{w.zh}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <span className="font-['Noto_Serif_JP'] text-5xl font-semibold md:text-7xl">{showZh ? w.zhForm : w.form}</span>
          <span className="mt-2 text-sm opacity-70">{showZh ? w.pinyin : w.reading}</span>
          <span className="mt-4 font-display text-xl italic">What does it mean in {showZh ? "Chinese" : "Japanese"}?</span>
        </div>
      )}
      {reveal && (
        <div className="rounded-lg border border-paper-ink/20 p-3 text-xs italic">
          ✦ For {meName}: {personalFact(w, meName, state.round)}
        </div>
      )}
    </div>
  );
}

function Stage({ state, meName, children, side }: { state: RoomState; meName: string; children: React.ReactNode; side?: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { setFlipped(false); const t = setTimeout(() => setFlipped(true), 500); return () => clearTimeout(t); }, [state.round]);
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="camera-drift flex items-start justify-center gap-4 pt-4 md:gap-10" style={{ transformOrigin: "50% 100%" }}>
          <div className="hidden md:block"><Deck round={state.round} /></div>
          <motion.div key={state.round} initial={{ x: -260, y: -40, rotate: -12, opacity: 0 }} animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}>
            <PageCard flipped={flipped} className="h-[360px] w-[270px] md:h-[420px] md:w-[320px]" front={null} back={<WordFace state={state} meName={meName} />} />
          </motion.div>
          <Timer deadline={state.deadline} reveal={state.phase === "reveal"} />
        </div>
        {children}
      </div>
      {side}
    </div>
  );
}

function PlayerView({ state, meId, meName, onChoose, onHint }: { state: RoomState; meId: string; meName: string; onChoose: (i: number) => void; onHint: (k: HintKind) => void }) {
  const meP = state.players.find((p) => p.id === meId);
  const mine = meP?.choice ?? null;
  const used = meP?.hints ?? [];
  const reveal = state.phase === "reveal";
  const gone = used.includes("eliminate") && !reveal ? (state.drop ?? eliminated(state.code, state.round, state.correct)) : [];
  return (
    <Stage state={state} meName={meName}>
      <div className="mx-auto mt-10 grid max-w-sm grid-cols-2 justify-items-center gap-3 pb-10 [perspective:1200px] md:flex md:max-w-none md:justify-center md:gap-4">
        {state.options.map((opt, i) => {
          const rot = (i - 1.5) * 6;
          const isRight = reveal && i === state.correct;
          const isWrongPick = reveal && mine === i && i !== state.correct;
          return (
            <motion.button key={`${state.round}-${i}`} onClick={() => onChoose(i)} disabled={mine !== null || reveal || gone.includes(i)}
              initial={{ y: 200, opacity: 0, rotate: 0 }}
              animate={{ y: mine === i ? -30 : Math.abs(i - 1.5) * 10, opacity: gone.includes(i) ? 0.15 : 1, filter: gone.includes(i) ? "grayscale(1) blur(1px)" : "none", rotate: rot, scale: isRight ? 1.08 : 1 }}
              whileHover={mine === null && !reveal && !gone.includes(i) ? { y: -24, rotate: rot / 2, scale: 1.05 } : {}}
              transition={{ delay: 0.9 + i * 0.1, type: "spring", stiffness: 200, damping: 18 }}
              className={`paper-card relative flex h-36 w-full max-w-40 flex-col items-center justify-center rounded-xl p-3 text-center md:h-48 md:w-40 md:p-4
                ${isRight ? "ring-4 ring-success" : ""} ${isWrongPick ? "ring-4 ring-destructive" : ""} ${mine === i && !reveal ? "ring-4 ring-primary" : ""}`}>
              <span className="absolute left-3 top-2 font-display text-2xl font-bold opacity-60">{LETTERS[i]}</span>
              <span className="font-display text-xl font-semibold leading-tight">{opt}</span>
            </motion.button>
          );
        })}
      </div>
      {!reveal && <CluesTray state={state} used={used} locked={mine !== null} onHint={onHint} />}
    </Stage>
  );
}

const HINT_LABEL: Record<HintKind, { icon: string; title: string }> = {
  eliminate: { icon: "✂", title: "Eliminate" },
  example: { icon: "文", title: "Reading" },
  category: { icon: "◈", title: "Category" },
};

function CluesTray({ state, used, locked, onHint }: { state: RoomState; used: HintKind[]; locked: boolean; onHint: (k: HintKind) => void }) {
  const w = wordOf(state);
  return (
    <div className="glass mx-auto mb-10 max-w-2xl rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Clues</h3>
        <span className="text-sm">Worth <b className="text-primary">{pointsFor(used)}</b> if correct</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {HINT_ORDER.map((k) => {
          const on = used.includes(k);
          return (
            <button key={k} type="button" disabled={on || locked} onClick={() => onHint(k)}
              className={`rounded-xl border px-2 py-3 text-center text-sm transition disabled:cursor-not-allowed ${on ? "border-primary bg-primary/15" : "border-input hover:bg-secondary disabled:opacity-40"}`}>
              <span className="block text-lg">{HINT_LABEL[k].icon}</span>
              <span className="block font-semibold">{HINT_LABEL[k].title}</span>
              <span className="block text-xs text-muted-foreground">−{HINT_COST[k]}</span>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {used.includes("example") && (
          <motion.p key="ex" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg bg-secondary/50 p-3 text-center">
            <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground">Reading</span>
            <span className="font-['Noto_Serif_JP'] text-xl">{w.example}</span>
          </motion.p>
        )}
        {used.includes("category") && (
          <motion.p key="cat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg bg-secondary/50 p-3 text-center">
            <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground">Category</span>
            <span className="font-display text-xl italic">“{w.category}”</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SpectatorView({ state, meName, onChat }: { state: RoomState; meName: string; onChat: (t: string) => void }) {
  const [msg, setMsg] = useState("");
  const active = state.players.filter((p) => p.role === "player");
  return (
    <Stage state={state} meName={meName}
      side={
        <aside className="glass flex h-80 w-full flex-col rounded-2xl p-4 lg:h-[calc(100vh-110px)] lg:w-80">
          <h3 className="text-2xl font-bold">Spectator lounge</h3>
          <p className="text-xs text-muted-foreground">Only watchers see this chat. You'll join as a player next round.</p>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto text-sm">
            {state.chat.filter((c) => c.channel !== "players").map((c) => <p key={c.id}><b className="text-primary">{c.name}:</b> {c.text}</p>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) { onChat(msg.trim()); setMsg(""); } }} className="mt-2 flex gap-2">
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Say something…" className="flex-1 rounded-lg border border-input bg-background/60 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Send</button>
          </form>
        </aside>
      }>
      <div className="glass mx-auto mt-8 max-w-2xl rounded-2xl p-5">
        <h3 className="mb-3 text-xl font-bold">Live picks</h3>
        <ul className="grid grid-cols-2 gap-2">
          {active.map((p) => (
            <motion.li key={p.id} layout className="flex justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm">
              <span>{p.name}</span>
              <AnimatePresence mode="wait">
                <motion.span key={String(p.choice)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-semibold text-primary">
                  {p.choice === null ? "thinking…" : `chose ${LETTERS[p.choice]}: ${state.options[p.choice]}`}
                </motion.span>
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

function Final({ state, meId }: { state: RoomState; meId: string }) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const me = state.players.find((p) => p.id === meId);
  const won = !!me && me.score === top && top > 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}
      className="mx-auto mt-10 max-w-xl text-center">
      <h2 className={`text-7xl font-bold ${won ? "gold-text" : "text-foreground"}`}>{won ? "Victory" : "Defeat"}</h2>
      <SimilarityMeter seen={state.seen ?? []} />
      <ol className="glass mt-8 space-y-2 rounded-2xl p-6 text-left">
        {ranked.map((p, i) => (
          <motion.li key={p.id} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.15 }}
            className={`flex justify-between rounded-lg px-4 py-3 ${p.id === meId ? "bg-primary text-primary-foreground" : "bg-secondary/60"}`}>
            <span>{i + 1}. {p.name}</span>
            <span className="flex items-center gap-3"><span className="text-xs opacity-70">{p.hintsTotal ?? 0} clue{(p.hintsTotal ?? 0) === 1 ? "" : "s"}</span><b>{p.score}</b></span>
          </motion.li>
        ))}
      </ol>
      <Link to="/" className="mt-8 inline-block rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground">Play again</Link>
    </motion.div>
  );
}

function SimilarityMeter({ seen }: { seen: { kind?: string; relation: string }[] }) {
  const m = similarity(seen);
  if (!m.total) return null;
  return (
    <div className="glass mx-auto mt-6 rounded-2xl p-5 text-left">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Similarity meter</span>
        <b className="font-display text-3xl">{m.pct}%</b>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${m.pct}%` }} transition={{ duration: 1.2, delay: 0.4 }} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Of the {m.total} words you saw, {m.same} meant the same in Chinese and Japanese, {m.partial} were half friends and {m.different} were false friends.
      </p>
    </div>
  );
}

function Notice({ title, body, link }: { title: string; body: string; link?: boolean }) {
  return (
    <div className="glass mx-auto mt-20 max-w-md rounded-3xl p-8 text-center">
      <h2 className="text-3xl font-bold">{title}</h2>
      <p className="mt-3 text-muted-foreground">{body}</p>
      {link && <Link to="/" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Back to the lobby</Link>}
    </div>
  );
}

/** Swoosh when a card is dealt, ticks in the last 5 seconds, chime or buzzer on the reveal. */
function useSoundEffects(state: RoomState, meId: string) {
  const { s } = useSettings();
  useEffect(() => { setSfxMuted(s.muted); }, [s.muted]);
  const meP = state.players.find((p) => p.id === meId);
  useEffect(() => {
    if (state.phase === "question") playSwoosh();
    if (state.phase === "reveal" && meP?.role === "player") {
      if (meP.choice !== null && meP.choice === state.correct) playCorrect(); else playWrong();
    }
  }, [state.phase, state.round]);
  useEffect(() => {
    if (state.phase !== "question") return;
    let last = -1;
    const id = setInterval(() => {
      const left = Math.ceil((state.deadline - Date.now()) / 1000);
      if (left <= 5 && left > 0 && left !== last) { last = left; playTick(); }
    }, 100);
    return () => clearInterval(id);
  }, [state.phase, state.round, state.deadline]);
}
