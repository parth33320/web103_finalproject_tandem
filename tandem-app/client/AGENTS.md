# Tandem - Technical Architecture

## Overview
- **Backend:** Lives on our Render Express + Postgres server. The client talks to it via Socket.io + REST (`/api/rooms`) at `VITE_API_URL`. There is no demo/bot mode: without `VITE_API_URL` the lobby shows a 'server not connected' notice.
- **Data:** Round content comes from `src/data/wordPool.js` (our curated 340 tagged words) via `src/lib/content.ts` dealRound. The server deals each card from `render-server/content.js` and broadcasts it, hiding answers until reveal. False/half friends always include the other language's meaning as a trap.
- **Audio:** Edge speech synthesis runs only on Render via `POST /api/tts`. React plays returned audio and falls back to same-language device voices, keeping Node-only speech dependencies out of the app bundle.
- **Voice Policy:** Keep `server-reference/speech-policy.js` voice names aligned with `src/lib/edge-voices.ts` so the server only accepts supported per-language voices.

## Deployment Structure
- `render-server/` is the complete standalone Render server we uploaded as the repo's `tandem-server` folder. Keep `server-reference/` docs and `render-server/` in sync (`render-server` is the source of truth).
- The website ships to Render as a `tandem-web` folder whose `package.json` builds with `NITRO_PRESET=node-server` and starts with `node .output/server/index.mjs`. 
- The game pointer is a 3D GLB hand (`src/components/Hand3D.tsx`, lazy + ClientOnly via HandPointer) with the flat HandCursor as a fallback. Per-theme 3D light colors live in Hand3D because three.js cannot read oklch tokens.