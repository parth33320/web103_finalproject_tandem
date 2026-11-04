import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { SettingsSheet } from "./SettingsSheet";
import table from "@/assets/table-felt.jpg";

const LINKS = [
  { to: "/", label: "Play" },
  { to: "/how-to-play", label: "How to play" },
  { to: "/words", label: "Word pool" },
  { to: "/leaderboard", label: "Leaderboard" },
] as const;

/** Top navigation shared by every page except a live room. */
export function SiteNav() {
  const { me, ready, signIn } = useAuth();
  const [open, setOpen] = useState(false);
  const linkCls = "rounded-full px-3 py-1.5 text-sm transition hover:bg-secondary/70";
  return (
    <header className="relative z-20 px-4 py-4 sm:px-6">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <Link to="/" className="font-display text-2xl font-bold gold-text">Tandem</Link>
        <button className="glass rounded-full px-3 py-1.5 text-sm md:hidden" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "✕ Close" : "☰ Menu"}</button>
        <div className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center md:gap-2`}>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={linkCls}
              activeOptions={{ exact: l.to === "/" }} activeProps={{ className: "bg-primary/15 text-primary" }}>{l.label}</Link>
          ))}
          <div className="flex items-center gap-2 pt-2 md:pt-0">
            {!ready ? null : me ? (
              <Link to="/me" onClick={() => setOpen(false)} className="glass flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm" activeProps={{ className: "ring-2 ring-primary" }}>
                {me.avatar_url ? <img src={me.avatar_url} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-primary" />}
                {me.username}
              </Link>
            ) : (
              <button onClick={() => signIn()} className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">Sign in with GitHub</button>
            )}
            <SettingsSheet />
          </div>
        </div>
      </nav>
    </header>
  );
}

/** Background, nav, a centered page column and the footer. */
export function PageShell({ title, subtitle, children, wide = false }: { title?: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <img src={table} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
      <SiteNav />
      <main className={`relative z-10 mx-auto w-full flex-1 px-4 pb-16 sm:px-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        {title && (
          <div className="mb-8 mt-4 text-center">
            <h1 className="gold-text font-display text-5xl font-bold sm:text-6xl">{title}</h1>
            {subtitle && <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/50 px-4 py-5 text-center text-xs text-muted-foreground">
      Tandem · a Chinese × Japanese word game · <Link to="/how-to-play" className="underline">How to play</Link> · <Link to="/admin" className="underline">Admin</Link>
    </footer>
  );
}
