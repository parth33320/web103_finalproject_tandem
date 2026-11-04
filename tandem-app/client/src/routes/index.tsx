import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Cinematic } from "@/components/Cinematic";
import { LANGS, LINES, EDGE_TTS_ENABLED, failedVoices, speak, voicesFor, type Lang } from "@/lib/host";
import { EDGE_VOICES } from "@/lib/edge-voices";
import { Button } from "@/components/ui/button";
import { DIRECTIONS, THEMES, useSettings } from "@/lib/settings";
import { createRoom, findRoom, hasServer } from "@/lib/room";
import table from "@/assets/table-felt.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tandem — Take a Seat at the Word Table" },
      { name: "description", content: "Pick your host's language and voice, choose a theme, and join a live room of Chinese and Japanese word duels." },
      { property: "og:title", content: "Tandem — Take a Seat at the Word Table" },
      { property: "og:description", content: "A cinematic multiplayer card game about Chinese and Japanese false friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { s, set } = useSettings();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hear, setHear] = useState<"idle" | "playing" | "fallback" | "failed">("idle");
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed(failedVoices()), []);
  const testVoice = async () => {
    setHear("playing");
    const r = await speak(lines.welcome(name || "friend"), s.lang, s.voice);
    setFailed(failedVoices());
    setHear(!r.ok ? "failed" : r.usedFallback ? "fallback" : "idle");
  };
  const local = voices.filter((v) => v.localService);
  const online = voices.filter((v) => !v.localService);
  const sortV = (a: SpeechSynthesisVoice[]) => [...a].sort((x, y) => Number(failed.includes(x.name)) - Number(failed.includes(y.name)));
  // Neutral labels: never show gendered voice names like "David" or "Samantha".
  const label = (v: SpeechSynthesisVoice) => `Device voice ${voices.indexOf(v) + 1}${v.localService ? "" : " (online)"}` + (failed.includes(v.name) ? " (may not work)" : "");

  useEffect(() => {
    // Warm up the voice list — some browsers only populate it after a first call.
    window.speechSynthesis?.getVoices();
    const load = () => setVoices(voicesFor(s.lang));
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, [s.lang]);

  const lines = LINES[s.lang];
  const ready = name.trim().length >= 2;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const enter = (roomCode: string) => {
    set({ name: name.trim() });
    speak(lines.welcome(name.trim()), s.lang, s.voice, s.muted);
    nav({ to: "/room/$code", params: { code: roomCode.toUpperCase() } });
  };
  const create = async () => {
    setBusy(true); setError("");
    try { enter(await createRoom()); }
    catch { setError("Couldn't reach the game server. It may be waking up — try again in a minute."); }
    finally { setBusy(false); }
  };
  const join = async () => {
    setBusy(true); setError("");
    try {
      const r = await findRoom(code.trim());
      if (r.exists) enter(code.trim()); else setError(`No room called ${code.trim().toUpperCase()}. Check the code with your friend.`);
    } catch { setError("Couldn't reach the game server. It may be waking up — try again in a minute."); }
    finally { setBusy(false); }
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Cinematic />
      <img src={table} alt="" className="camera-push absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <div className="relative mx-auto max-w-5xl px-6 py-14">
        <motion.header initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="text-center">
          <p className="text-xs uppercase tracking-[0.5em] text-muted-foreground">Chinese × Japanese</p>
          <h1 className="gold-text mt-3 text-5xl font-bold sm:text-7xl md:text-8xl">Tandem</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Same characters. Different meanings. Take a seat, and let your host deal you into the trap.
          </p>
        </motion.header>

        <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1 }}
          className="glass mx-auto mt-12 flex w-full max-w-xl flex-col gap-8 overflow-hidden rounded-3xl p-5 sm:p-8">
          <div className="min-w-0 space-y-6">
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. 王小明 (Wang Xiaoming)"
                className="w-full rounded-lg border border-input bg-background/60 px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-ring" />
            </Field>
            <Field label="Host language">
              <div className="grid grid-cols-3 gap-2">
                {LANGS.map((l) => (
                  <Chip key={l.code} active={s.lang === l.code} onClick={() => set({ lang: l.code as Lang, voice: "" })}>{l.label}</Chip>
                ))}
              </div>
            </Field>
            <Field label="Host voice">
              <div className="flex gap-2">
                <select value={s.voice} onChange={(e) => set({ voice: e.target.value })}
                  className="w-0 min-w-0 flex-1 truncate rounded-lg border border-input bg-background/60 px-3 py-2">
                  <option value="">The Host (default)</option>
                  {EDGE_TTS_ENABLED && <optgroup label="The Host · natural voices">{EDGE_VOICES[s.lang].map((v) => <option key={v.name} value={v.name}>{v.label}</option>)}</optgroup>}
                  {local.length > 0 && <optgroup label="On this device (reliable)">{sortV(local).map((v) => <option key={v.name} value={v.name}>{label(v)}</option>)}</optgroup>}
                  {online.length > 0 && <optgroup label="Online (natural, needs internet)">{sortV(online).map((v) => <option key={v.name} value={v.name}>{label(v)}</option>)}</optgroup>}
                </select>
                <Button variant="outline" type="button" onClick={testVoice} disabled={hear === "playing"}
                  className="shrink-0 rounded-lg border border-input px-4 text-sm hover:bg-secondary">{hear === "playing" ? "Playing…" : "▶ Hear"}</Button>
              </div>
              {hear === "fallback" && <p className="mt-2 text-xs text-muted-foreground">That voice didn't respond, so the host used a backup voice on your device. Try another voice from the list.</p>}
              {hear === "failed" && <p className="mt-2 text-xs text-muted-foreground">No voice could play. Check your volume and internet, or pick a voice under "On this device".</p>}
              {!EDGE_TTS_ENABLED && voices.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No voice is available for this language on your device.</p>}
            </Field>
            <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">🎙 {lines.privateHost}</p>
          </div>

          <div className="min-w-0 space-y-6">
            <Field label="Your direction">
              <div className="grid gap-2">
                {DIRECTIONS.map((d) => (
                  <Chip key={d.id} active={s.dir === d.id} onClick={() => set({ dir: d.id })}>{d.label}</Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{DIRECTIONS.find((d) => d.id === s.dir)?.hint}</p>
            </Field>
            <Field label="Theme">
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <Chip key={t.id} active={s.theme === t.id} onClick={() => set({ theme: t.id })}>{t.label}</Chip>
                ))}
              </div>
            </Field>
            <div className="space-y-3 pt-2">
              <button disabled={!ready || busy || !hasServer} onClick={create}
                className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg transition hover:brightness-110 disabled:opacity-40">
                {busy ? "Connecting…" : "Create a room"}
              </button>
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Friend's room code" maxLength={8}
                  className="w-0 min-w-0 flex-1 rounded-xl border border-input bg-background/60 px-4 py-3 uppercase tracking-widest outline-none" />
                <button disabled={!ready || busy || !hasServer || code.length < 3} onClick={join}
                  className="shrink-0 rounded-xl border border-primary px-6 font-semibold text-primary disabled:opacity-40">Join</button>
              </div>
              <p className="text-xs text-muted-foreground">
                <b>Create a room</b> starts a new table and gives you a code to share. To play at a friend's table instead, type the code shown at the top of their screen and press <b>Join</b>.
              </p>
              {error && <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{error}</p>}
            </div>
            {!hasServer && <p className="rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">The game server isn't connected yet. Set <b>VITE_API_URL</b> to your Render server address to open the tables.</p>}
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"}`}>
      {children}
    </button>
  );
}
