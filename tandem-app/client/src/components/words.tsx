// Presenters for community words: a card, vote buttons and the add/edit form.
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, RELATION_STYLE, type CommunityWord, type WordInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { RELATION_LABEL, validateWord, type Relation } from "@/lib/words";
import { Spinner } from "./Spinner";

export function RelationTag({ rel }: { rel: Relation }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${RELATION_STYLE[rel]}`}>{RELATION_LABEL[rel]}</span>;
}

/** Both languages side by side, like the back of a game card. */
export function Meanings({ w, big = false }: { w: Pick<CommunityWord, "form" | "zh_form" | "reading" | "pinyin" | "meaning_ja" | "meaning_zh"> ; big?: boolean }) {
  const col = (lang: string, form: string, read: string, meaning: string) => (
    <div className="min-w-0">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">{lang}</span>
      <span className={`block font-['Noto_Serif_JP'] font-semibold ${big ? "text-5xl" : "text-3xl"}`}>{form}</span>
      <span className="block text-xs text-muted-foreground">{read}</span>
      <span className="mt-1 block font-semibold [overflow-wrap:anywhere]">{meaning}</span>
    </div>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3">
      {col("Japanese", w.form, w.reading, w.meaning_ja)}
      <span className="pt-7 text-xl text-muted-foreground">↔</span>
      {col("Chinese", w.zh_form || w.form, w.pinyin, w.meaning_zh)}
    </div>
  );
}

export function WordCard({ w, onChange }: { w: CommunityWord; onChange: (w: CommunityWord) => void }) {
  return (
    <article className="glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <RelationTag rel={w.relation} />
        {w.source === "community" && (
          <span className={`text-[11px] uppercase tracking-wider ${w.in_deck ? "text-success" : "text-muted-foreground"}`}>
            {w.in_deck ? "✓ In the deck" : "Needs votes"}
          </span>
        )}
      </div>
      <Link to="/words/$id" params={{ id: String(w.id) }} className="block rounded-lg transition hover:bg-secondary/30"><Meanings w={w} /></Link>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        <span className="flex min-w-0 items-center gap-2 truncate">
          {w.author ? <>{w.author.avatar_url && <img src={w.author.avatar_url} alt="" className="h-5 w-5 rounded-full" />}@{w.author.username}</> : "Built-in"}
          {w.misses > 0 && <span title="Times players fell for it">· 🪤 {w.misses}</span>}
        </span>
        {w.source === "community" && <VoteButtons w={w} onChange={onChange} />}
      </div>
    </article>
  );
}

export function VoteButtons({ w, onChange }: { w: CommunityWord; onChange: (w: CommunityWord) => void }) {
  const { me, signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const vote = async (v: 1 | -1) => {
    if (!me) { toast("Sign in with GitHub to vote on words.", { action: { label: "Sign in", onClick: () => signIn() } }); return; }
    setBusy(true);
    try {
      const next = w.my_vote === v ? 0 : v; // clicking your vote again takes it back
      const updated = await api<CommunityWord>(`/words/${w.id}/vote`, { method: "PUT", body: { value: next } });
      onChange(updated);
      if (updated.in_deck && !w.in_deck) toast.success(`${w.form} has joined the game deck! 🎴`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const cls = (on: boolean) => `rounded-md border px-2 py-1 transition disabled:opacity-40 ${on ? "border-primary bg-primary/20 text-primary" : "border-input hover:bg-secondary"}`;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button aria-label="Upvote" disabled={busy} onClick={() => vote(1)} className={cls(w.my_vote === 1)}>▲</button>
      <b className="w-6 text-center text-sm text-foreground">{w.votes}</b>
      <button aria-label="Downvote" disabled={busy} onClick={() => vote(-1)} className={cls(w.my_vote === -1)}>▼</button>
    </span>
  );
}

const EMPTY: WordInput = { form: "", zh_form: "", reading: "", pinyin: "", meaning_ja: "", meaning_zh: "", relation: "false", note: "" };

/** Add or edit a word. Checks the same rules as the server before sending; shows the server's answer per field too. */
export function WordForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial?: Partial<WordInput>; submitLabel: string; onSubmit: (w: WordInput) => Promise<void>; onCancel?: () => void;
}) {
  const [f, setF] = useState<WordInput>({ ...EMPTY, ...initial, zh_form: initial?.zh_form && initial.zh_form !== initial.form ? initial.zh_form : "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const same = f.relation === "true";
  const up = (p: Partial<WordInput>) => { setF((x) => ({ ...x, ...p })); setErrors((e) => { const n = { ...e }; for (const k of Object.keys(p)) delete n[k]; return n; }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: WordInput = { ...f, meaning_zh: same ? f.meaning_ja : f.meaning_zh };
    const found = validateWord(data as unknown as Record<string, unknown>);
    if (Object.keys(found).length) { setErrors(found); toast.error("Please fix the highlighted fields."); return; }
    setBusy(true);
    try { await onSubmit(data); }
    catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setErrors(err.fields);
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate className="glass space-y-5 rounded-3xl p-5 sm:p-8">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <Field label="Relationship" error={errors["relation"]}>
          <div className="grid grid-cols-3 gap-2">
            {(["false", "partial", "true"] as Relation[]).map((r) => (
              <button key={r} type="button" onClick={() => up({ relation: r })} aria-pressed={f.relation === r}
                className={`rounded-lg border px-2 py-2 text-sm ${f.relation === r ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-secondary"}`}>
                {RELATION_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {{ false: "Same characters, different meanings: the best traps.", partial: "Related meanings that have drifted apart.", true: "Same characters and the same meaning." }[f.relation]}
          </p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Characters" error={errors["form"]} hint="As written in Japanese, e.g. 手紙">
            <Input value={f.form} onChange={(v) => up({ form: v })} lang="ja" big maxLength={8} />
          </Field>
          <Field label="Chinese form (optional)" error={errors["zh_form"]} hint="Only if simplified Chinese differs, e.g. 汽车">
            <Input value={f.zh_form ?? ""} onChange={(v) => up({ zh_form: v })} lang="zh" big maxLength={8} />
          </Field>
          <Field label="Japanese reading" error={errors["reading"]} hint="Romaji, e.g. tegami">
            <Input value={f.reading} onChange={(v) => up({ reading: v })} maxLength={40} />
          </Field>
          <Field label="Pinyin" error={errors["pinyin"]} hint="With or without tones, e.g. shǒuzhǐ">
            <Input value={f.pinyin} onChange={(v) => up({ pinyin: v })} maxLength={40} />
          </Field>
          <Field label={same ? "Meaning (in both languages)" : "Meaning in Japanese"} error={errors["meaning_ja"]}>
            <Input value={f.meaning_ja} onChange={(v) => up({ meaning_ja: v })} maxLength={60} placeholder="letter" />
          </Field>
          {!same && (
            <Field label="Meaning in Chinese" error={errors["meaning_zh"]}>
              <Input value={f.meaning_zh} onChange={(v) => up({ meaning_zh: v })} maxLength={60} placeholder="toilet paper" />
            </Field>
          )}
        </div>
        <Field label="Fun fact (optional)" error={errors["note"]} hint="Shown on the card after the reveal.">
          <textarea value={f.note ?? ""} onChange={(e) => up({ note: e.target.value })} maxLength={280} rows={3}
            className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
        </Field>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-50">
          {busy ? <Spinner label="Saving…" /> : submitLabel}
        </button>
        {onCancel && <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-input px-5 py-3 disabled:opacity-50">Cancel</button>}
      </div>
    </form>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
      {error ? <span role="alert" className="mt-1 block text-sm text-destructive">{error}</span> : hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
function Input({ value, onChange, big, ...rest }: { value: string; onChange: (v: string) => void; big?: boolean; lang?: string; maxLength?: number; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} {...rest}
      className={`w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-ring ${big ? "font-['Noto_Serif_JP'] text-2xl" : ""}`} />
  );
}
