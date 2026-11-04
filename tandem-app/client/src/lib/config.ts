/** Where the Render game server lives (set VITE_API_URL before building). */
export const API_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) || "").replace(/\/+$/, "");
/** True when the website has been told where the Render game server is. */
export const hasServer = !!API_URL;
