import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { API_URL, hasServer } from "@/lib/config";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Tandem" }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Removed = { scores: number; missedWords: number; votes: number; communityWords: number; rooms: number };

/** Resets the database to its default state. Protected by the server's ADMIN_KEY so visitors can't wipe it. */
function Admin() {
  const [key, setKey] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Removed | null>(null);
  const [error, setError] = useState("");

  const reset = async () => {
    setBusy(true); setError(""); setDone(null);
    try {
      const r = await fetch(`${API_URL}/api/admin/reset`, { method: "POST", headers: { "X-Admin-Key": key } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || `Reset failed (${r.status}).`);
      setDone(body.removed); toast.success("Database reset to its default state.");
    } catch (e) {
      const msg = e instanceof TypeError ? "Couldn't reach the game server. It may be waking up — try again in a minute." : (e as Error).message;
      setError(msg); toast.error(msg);
    } finally { setBusy(false); setConfirm(false); }
  };

  return (
    <PageShell title="Admin" subtitle="Restore the database to its default state, as on launch day.">
      <div className="glass mx-auto max-w-lg rounded-3xl p-6 sm:p-8">
        <p className="text-sm text-muted-foreground">This keeps the 340 built-in words and player accounts. It removes every score, trap word, vote, community word and old room, and resets everyone's settings.</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); if (key) setConfirm(true); }}>
          <label className="block">
            <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin key</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} disabled={busy} autoComplete="off"
              className="w-full rounded-lg border border-input bg-background/60 px-3 py-2 outline-none focus:ring-2 focus:ring-ring" />
          </label>
          <button type="submit" disabled={!key || busy || !hasServer} className="w-full rounded-xl bg-destructive py-3 font-bold text-destructive-foreground disabled:opacity-40">
            {busy ? <Spinner label="Resetting…" /> : "Reset database"}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{error}</p>}
        {done && (
          <div className="mt-4 rounded-lg border border-success/50 bg-success/10 p-4 text-sm">
            <b>Back to default.</b> Removed {done.scores} scores, {done.missedWords} trap words, {done.votes} votes, {done.communityWords} community words and {done.rooms} rooms.
          </div>
        )}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everything?</AlertDialogTitle>
            <AlertDialogDescription>Every score, trap list, vote and community word is deleted for every player. You can't undo this.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
