# Tandem live rooms — add to your Render server

1. In `tandem/server`: `npm install socket.io cors`
2. Run `rooms.sql` against your Render Postgres database.
3. Copy `rooms.js` to `server/src/realtime/rooms.js`.
4. In `server/src/index.js`, replace `app.listen(...)` with:

```js
import { createServer } from 'node:http';
import cors from 'cors';
import { attachRooms } from './realtime/rooms.js';
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*' }));
const server = createServer(app);
attachRooms(server, process.env.CLIENT_ORIGIN?.split(',') ?? '*');
server.listen(process.env.PORT || 3001);
```

5. On Render set `CLIENT_ORIGIN` to the Lovable preview/published URL.
6. Send me the Render URL. I'll set `VITE_API_URL`, and the app switches from demo mode to live rooms.

Server events: `room:join`, `round:start`, `answer:select`, `hint:use`, `spectator:chat`. Clients receive `room:state` and `spectator:chat`.
Spectator chat is emitted only to the `<code>:spectators` socket room, so active players never receive it.

## No-key Edge host speech (Render only)

1. In your Render server install `msedge-tts@2.1.1`.
2. Copy `speech.js` and `speech-policy.js` into `server/src/realtime/` together.
3. After CORS and JSON middleware, mount the speech endpoint:

```js
import express from 'express';
import { attachSpeech } from './realtime/speech.js';
const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(express.json({ limit: '8kb' }));
attachSpeech(app, { allowedOrigins });
```

Use exact site origins (no trailing slash) in `CLIENT_ORIGIN`. Configure Express's `trust proxy` to match your Render proxy, not an unrestricted `true`. The endpoint accepts POST JSON `{text, lang, voice}` and returns MP3. It validates supported language/voice pairs, escapes XML, limits text to 500 characters, and limits requests, concurrency and duration. Origin checks are not account authentication; the game is public and these controls reduce abuse, not prevent every non-browser caller.

4. Deploy the Render server, then configure `VITE_API_URL` with that server's HTTPS URL. The frontend automatically adds Edge voices for all six host languages and plays them before trying a browser backup. Without this address the app continues using device voices; installing frontend packages alone will not enable Edge speech.

Edge Read Aloud is an unofficial remote service, requires internet, and can change or block requests. No API key is required by this library, but free availability is not guaranteed. Text is sent through Render to Microsoft; do not use sensitive personal information in host text. Review Microsoft's applicable service terms before production use. VoiceRSS is not enabled and no private key belongs in the browser.
