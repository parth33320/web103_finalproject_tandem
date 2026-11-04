<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Backend lives on the user's Render Express+Postgres server (no Lovable Cloud); the client talks to it via Socket.io + REST (/api/rooms) at VITE_API_URL. There is no demo/bot mode: without VITE_API_URL the lobby shows a 'server not connected' notice.
- Round content comes from src/data/wordPool.js (the team's 340 tagged words) via src/lib/content.ts dealRound; the server deals each card from render-server/content.js (bun-built from content.ts, regenerate after edits) and broadcasts it, hiding answers until reveal. False/half friends always include the other language's meaning as a trap.
- Edge speech synthesis runs only on Render via POST /api/tts; React plays returned audio and falls back to same-language device voices, keeping Node-only speech dependencies out of the app bundle.
- Keep server-reference/speech-policy.js voice names aligned with src/lib/edge-voices.ts so the server only accepts supported per-language voices.

- render-server/ is the complete standalone Render server the user uploads as the repo's new `tandem-server` folder; keep server-reference/ docs and render-server/ in sync (render-server is the source of truth).
- The website ships to Render as a `tandem-web` folder whose package.json builds with NITRO_PRESET=node-server and starts `node .output/server/index.mjs`; the Lovable sandbox ignores NITRO_PRESET, so the project's own scripts stay unchanged.
- The game pointer is a 3D GLB hand (src/components/Hand3D.tsx, lazy + ClientOnly via HandPointer) with the flat HandCursor as fallback; per-theme 3D light colors live in Hand3D because three.js cannot read oklch tokens.
