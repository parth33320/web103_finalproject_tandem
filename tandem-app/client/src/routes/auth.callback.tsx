import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { LoadingBlock } from "@/components/Spinner";
import { api, setToken, type Me } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { safeRedirect } from "@/lib/guard";

// GitHub -> server -> here, with the sign-in token in the URL fragment (never sent to any server).
export const Route = createFileRoute("/auth/callback")({ ssr: false, component: Callback });

function Callback() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");
    const to = safeRedirect(params.get("redirect"));
    history.replaceState(null, "", window.location.pathname); // keep the token out of history
    if (!token) { void nav({ to: "/login", search: { error: "github" } }); return; }
    setToken(token);
    (async () => {
      try {
        const me = await api<Me>("/me");
        await refresh();
        toast.success(`Welcome, ${me.username}! Your progress will be saved from now on.`);
        await nav({ href: to, replace: true });
      } catch {
        setToken(null);
        await nav({ to: "/login", search: { error: "github" }, replace: true });
      }
    })();
  }, []);
  return <PageShell><LoadingBlock label="Signing you in…" /></PageShell>;
}
