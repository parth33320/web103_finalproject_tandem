import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LANGS, LINES, EDGE_TTS_ENABLED, failedVoices, speak, voicesFor, type Lang } from "@/lib/host";
import { EDGE_VOICES } from "@/lib/edge-voices";
import { THEMES, useSettings } from "@/lib/settings";
import { useAuth } from "@/lib/auth";

/** Slide-out panel with the host, voice, theme and sound settings, so the lobby only asks what matters. */
export function SettingsSheet({ className = "" }: { className?: string }) {
  const { s, set } = useSettings();
  const { me } = useAuth();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hear, setHear] = useState<"idle" | "playing" | "failed">("idle");
  const [failed, setFailed] = useState<string[]>([]);

  useEffect(() => setFailed(failedVoices()), []);
  useEffect(() => {
    window.speechSynthesis?.getVoices(); // some browsers only fill the list after a first call
    const load = () => setVoices(voicesFor(s.lang));
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", load);
  }, [s.lang]);

  // Only offer device voices that haven't failed before; "The Host" default always works.
  const usable = voices.filter((v) => !failed.includes(v.name));
  const test = async () => {
    setHear("playing");
    const r = await speak(LINES[s.lang].welcome(s.name || me?.username || "friend"), s.lang, s.voice);
    setFailed(failedVoices());
    setHear(r.ok ? "idle" : "failed");
  };

  return (
    <Sheet>
      <SheetTrigger aria-label="Settings" className={`glass rounded-full px-3 py-1.5 text-sm ${className}`}>⚙️ Settings</SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-3xl">Settings</SheetTitle>
          <SheetDescription>{me ? "Saved to your account, so they follow you to any device." : "Saved in this browser. Sign in to keep them on every device."}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-7">
          <Group label="Your host speaks">
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((l) => <Chip key={l.code} active={s.lang === l.code} onClick={() => set({ lang: l.code as Lang, voice: "" })}>{l.label}</Chip>)}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{LINES[s.lang].privateHost}</p>
          </Group>
          <Group label="Host voice">
            <div className="flex gap-2">
              <select value={s.voice} onChange={(e) => set({ voice: e.target.value })}
                className="w-0 min-w-0 flex-1 truncate rounded-lg border border-input bg-background/60 px-3 py-2">
                <option value="">The Host (recommended)</option>
                {EDGE_TTS_ENABLED && EDGE_VOICES[s.lang].map((v) => <option key={v.name} value={v.name}>{v.label}</option>)}
                {usable.length > 0 && <optgroup label="Voices on this device">{usable.map((v, i) => <option key={v.name} value={v.name}>Device voice {i + 1}</option>)}</optgroup>}
              </select>
              <button type="button" onClick={test} disabled={hear === "playing"}
                className="shrink-0 rounded-lg border border-input px-4 text-sm hover:bg-secondary disabled:opacity-50">{hear === "playing" ? "Playing…" : "▶ Test"}</button>
            </div>
            {hear === "failed" && <p className="mt-2 text-xs text-muted-foreground">That voice couldn't play. Check your volume, or pick "The Host".</p>}
          </Group>
          <Group label="Table theme">
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => <Chip key={t.id} active={s.theme === t.id} onClick={() => set({ theme: t.id })}>{t.label}</Chip>)}
            </div>
          </Group>
          <Group label="Sound">
            <div className="grid grid-cols-2 gap-2">
              <Chip active={!s.muted} onClick={() => set({ muted: false })}>🔊 On</Chip>
              <Chip active={s.muted} onClick={() => set({ muted: true })}>🔇 Off</Chip>
            </div>
          </Group>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <section><h3 className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">{label}</h3>{children}</section>;
}
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-sm transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"}`}>
      {children}
    </button>
  );
}
