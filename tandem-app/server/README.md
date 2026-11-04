# Tandem game server (folder `server`)

Render → New + → Web Service → your repo
- Root Directory: `tandem-app/server`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: Free
- Environment Variables (see `.env.example`):
  - `DATABASE_URL` = your Internal Database URL
  - `CLIENT_ORIGIN` (add after the website is live) = `https://tandem-table.localhost.cc` (no `/` at the end)
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` = from your GitHub OAuth app. Its callback URL must be `https://<server-address>/auth/github/callback`
  - `SESSION_SECRET` = a long random string. Keep it the same between deploys, or everyone gets signed out.
  - `ADMIN_KEY` = the password for the website's Admin → Reset database button
  - `APPROVE_AT` (optional, default 2) = net votes a community word needs before it's dealt in games

Render sets `RENDER_EXTERNAL_URL` itself, so the server knows its own address for the GitHub callback.

On start, the server creates every table and seeds the 340 built-in words. That's safe to run on every deploy.

Wait for green "Live". Check: open `https://<server-address>/health` → `{"ok":true}` and `/auth/status` → `{"github":true}`.
Copy that address — the website needs it as `VITE_API_URL`.

## Database
- `players` 1—1 `player_settings` (one-to-one)
- `players` 1—many `words` (community words they added), `scores`
- `players` many—many `words` through `player_missed_words` (with `miss_count`, `last_missed_at`) and `word_votes` (with `value`)
- `rooms` 1—many `room_messages`, `round_answers`
