import { redirect, type ParsedLocation } from "@tanstack/react-router";
import { isSignedIn } from "./auth";

/** beforeLoad for pages that need a GitHub sign-in: guests are redirected to /login and come back afterwards.
 *  Use with `ssr: false`, because the sign-in token lives in the browser. */
export function requireSignIn({ location }: { location: ParsedLocation }) {
  if (!isSignedIn()) throw redirect({ to: "/login", search: { redirect: location.href } });
}

/** Only same-site paths (never "//other-site.com"). */
export const safeRedirect = (p: unknown) => (typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/");
