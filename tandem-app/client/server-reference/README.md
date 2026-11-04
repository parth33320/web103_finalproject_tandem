# Tandem Live Rooms & Speech Server

This guide explains how to configure the Render backend for Tandem live rooms, database connections, and no-key Edge host speech.

---

## 1. Live Rooms Setup

1. In the server directory (`tandem/server`), install the required dependencies:

   ```sh
   npm install socket.io cors
   ```

2. Run `rooms.sql` against your Render PostgreSQL database.

3. Copy `rooms.js` to:

   ```text
   server/src/realtime/rooms.js
   ```

4. In `server/src/index.js`, replace the existing `app.listen(...)` with the following code to attach the Socket.IO server:

   ```js
   import { createServer } from 'node:http';
   import cors from 'cors';
   import { attachRooms } from './realtime/rooms.js';

   app.use(cors({
     origin: process.env.CLIENT_ORIGIN?.split(',') ?? '*'
   }));

   const server = createServer(app);

   attachRooms(
     server,
     process.env.CLIENT_ORIGIN?.split(',') ?? '*'
   );

   server.listen(process.env.PORT || 3001);
   ```

5. On Render, set the `CLIENT_ORIGIN` environment variable to your frontend URL.

   Example:

   ```env
   CLIENT_ORIGIN=https://tandem-table.localhost.cc
   ```

6. Configure your frontend environment by setting `VITE_API_URL` to your Render server URL.

   Example:

   ```env
   VITE_API_URL=https://tandem-server-xxxx.onrender.com
   ```

   The app will then switch from demo mode to live rooms.

### Server Events

**Client to Server:**

- `room:join`
- `round:start`
- `answer:select`
- `hint:use`
- `spectator:chat`

**Server to Client:**

- `room:state`
- `spectator:chat`

**Important:** Spectator chat is emitted only to the `:spectators` socket room, ensuring active players never receive it.

---

## 2. Edge Host Speech (Render Only)

1. In your Render server directory, install the TTS package:

   ```sh
   npm install msedge-tts@2.1.1
   ```

2. Copy both `speech.js` and `speech-policy.js` into:

   ```text
   server/src/realtime/
   ```

   Both files must be placed together in the same directory.

3. After your CORS and JSON middleware, mount the speech endpoint:

   ```js
   import express from 'express';
   import { attachSpeech } from './realtime/speech.js';

   const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
     .split(',')
     .map(s => s.trim())
     .filter(Boolean);

   app.use(express.json({ limit: '8kb' }));

   attachSpeech(app, { allowedOrigins });
   ```

4. Deploy the Render server, then ensure `VITE_API_URL` points to that server's HTTPS URL.

   The frontend will automatically add Edge voices for all six host languages and play them before trying a browser backup.

   Without this address, the app will continue using device voices.

---

## 3. Security & Requirements

- **Exact origins:** Use exact site origins (no trailing slash) in `CLIENT_ORIGIN`.
- **Proxy configuration:** Configure Express's `trust proxy` to match your Render proxy, not an unrestricted `true`.
- **Request format:** The endpoint accepts POST JSON:

  ```json
  {
    "text": "Hello and welcome to Tandem!",
    "lang": "en",
    "voice": "SUPPORTED_VOICE"
  }
  ```

- **Response:** Returns MP3 audio.
- **Validation:** Validates supported language/voice pairs.
- **XML protection:** Escapes XML input.
- **Text limits:** Limits text to 500 characters.
- **Abuse protection:** Limits requests, concurrency, and duration.
- **Authentication:** Origin checks are not account authentication. The game is public, and these controls reduce abuse.

---

## 4. Disclaimer

Edge Read Aloud is an unofficial remote service. It requires an internet connection and can change or block requests.

No API key is required by this library, but free availability is not guaranteed.

Text is sent through Render to Microsoft. Do not use sensitive personal information in host text.

Review Microsoft's applicable service terms before production use.

**Additional notes:**

- VoiceRSS is not enabled.
- No private key belongs in the browser.
- Edge TTS availability is not guaranteed.

---

## 5. Environment Variables Summary

| Variable | Location | Purpose |
|---|---|---|
| `CLIENT_ORIGIN` | Render | Allowed frontend origin(s) |
| `VITE_API_URL` | Frontend | Render backend HTTPS URL |
| `PORT` | Render | Backend listening port (defaults to `3001`) |

### Example Configuration

**Render backend:**

```env
CLIENT_ORIGIN=https://tandem-table.localhost.cc
```

**Frontend:**

```env
VITE_API_URL=https://tandem-server-xxxx.onrender.com
```

---

## 6. Final Deployment Checklist

- [ ] Install `socket.io` and `cors`.
- [ ] Run `rooms.sql` against the Render PostgreSQL database.
- [ ] Copy `rooms.js` into `server/src/realtime/`.
- [ ] Update `server/src/index.js` to use the HTTP server and Socket.IO.
- [ ] Configure `CLIENT_ORIGIN` in Render.
- [ ] Configure `VITE_API_URL` in the frontend.
- [ ] Install `msedge-tts@2.1.1` on Render.
- [ ] Copy both `speech.js` and `speech-policy.js` into `server/src/realtime/`.
- [ ] Mount the speech endpoint after the CORS and JSON middleware.
- [ ] Verify the Render backend deployment.
- [ ] Test live room creation and joining.
- [ ] Test player answers and spectator chat isolation.
- [ ] Test Edge host speech in all six supported languages.
- [ ] Verify browser voice fallback works when Edge speech is unavailable.

**Once all steps are complete, Tandem should support live multiplayer rooms, spectator chat isolation, and remote Edge host speech through the Render backend.**