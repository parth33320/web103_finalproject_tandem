import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Spinner } from "@/components/Spinner";
import { githubUrl, isSignedIn } from "@/lib/auth";
import { safeRedirect } from "@/lib/guard";
import { hasServer } from "@/lib/config";

const ERRORS: Record<string, string> = {
  denied: "GitHub sign-in was cancelled. You can try again whenever you like.",
  expired: "That sign-in link expired. Please try again.",
  github: "GitHub didn't let us sign you in. Please try again in a moment.",
  unavailable: "GitHub sign-in isn't set up on this server yet.",
};

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined; error?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
    error: typeof s["error"] === "string" ? s["error"] : undefined,
  }),
  // Already signed in: go straight to where you were headed.
  beforeLoad: ({ search }) => { if (isSignedIn()) throw redirect({ href: safeRedirect(search.redirect) }); },
  head: () => ({ meta: [{ title: "Sign in — Tandem" }] }),
  component: Login,
});

function Login() {
  const { redirect: to, error } = Route.useSearch();
  const [going, setGoing] = useState(false);
  const back = safeRedirect(to);
  return (
    <PageShell title="Sign in" subtitle="Playing as a guest is always free. Sign in to keep your progress.">
      <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center">
        {error && <p role="alert" className="mb-5 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">{ERRORS[error] ?? ERRORS["github"]}</p>}
        {back !== "/" && <p className="mb-5 text-sm text-muted-foreground">That page needs you to sign in first.</p>}
        <ul className="mb-6 space-y-2 text-left text-sm">
          <li>🪤 Save the words that trick you, and practice them later</li>
          <li>🏆 Put your best games on the leaderboard</li>
          <li>✍️ Add your own false friends to the word pool</li>
          <li>⚙️ Keep your settings on every device</li>
        </ul>
        <a href={hasServer ? githubUrl(back) : undefined} onClick={() => setGoing(true)} aria-disabled={going || !hasServer}
          className={`flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground ${going || !hasServer ? "pointer-events-none opacity-60" : ""}`}>
          {going ? <Spinner label="Opening GitHub…" /> : <><GitHubMark /> Sign in with GitHub</>}
        </a>
        <p className="mt-4 text-xs text-muted-foreground">We only read your GitHub username and picture. We never post anything or ask for your email.</p>
        <Link to="/" className="mt-6 inline-block text-sm underline">Keep playing as a guest</Link>
      </div>
    </PageShell>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="22" height="22" aria-hidden fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.5-1.07-1.77-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
