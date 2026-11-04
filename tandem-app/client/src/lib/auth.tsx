// Who is signed in (GitHub), shared by every page.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { api, getToken, setToken, type Me } from "./api";
import { API_URL, hasServer } from "./config";
import { useSettings, type Theme } from "./settings";
import type { Lang } from "./host";

type Auth = {
  me: Me | null;
  /** False until we know whether this browser is signed in. */
  ready: boolean;
  signIn: (redirect?: string) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
};
const Ctx = createContext<Auth>({ me: null, ready: false, signIn: () => {}, signOut: () => {}, refresh: async () => {} });

/** Sends the browser to GitHub; it comes back to /auth/callback and then to `redirect`. */
export function githubUrl(redirect = "/") {
  return `${API_URL}/auth/github?redirect=${encodeURIComponent(redirect)}`;
}
export const isSignedIn = () => !!getToken();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const { s, set } = useSettings();
  const loaded = useRef(false);

  const refresh = useCallback(async () => {
    if (!getToken() || !hasServer) { setMe(null); setReady(true); return; }
    try {
      const m = await api<Me>("/me");
      setMe(m);
      // Bring this player's saved settings to any device they sign in on (one settings row per player).
      if (m.settings && !loaded.current) {
        loaded.current = true;
        const { dir, lang, voice, theme, muted } = m.settings;
        set({ dir, lang: lang as Lang, voice, theme: theme as Theme, muted });
      }
    } catch { setMe(null); }
    setReady(true);
  }, [set]);

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    const out = () => { setMe(null); toast("You were signed out. Sign in again to keep saving your progress."); };
    window.addEventListener("tandem:signed-out", out);
    return () => window.removeEventListener("tandem:signed-out", out);
  }, []);

  // Save setting changes to the account (after the first load, debounced).
  const first = useRef(true);
  useEffect(() => {
    if (!me || !loaded.current) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      api("/me/settings", { method: "PATCH", body: { dir: s.dir, lang: s.lang, voice: s.voice, theme: s.theme, muted: s.muted } }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [me?.id, s.dir, s.lang, s.voice, s.theme, s.muted]);

  const signIn = (redirect = window.location.pathname + window.location.search) => { window.location.href = githubUrl(redirect); };
  const signOut = () => {
    setToken(null); setMe(null); loaded.current = false; first.current = true;
    toast.success("Signed out. You can still play as a guest.");
  };
  return <Ctx.Provider value={{ me, ready, signIn, signOut, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
