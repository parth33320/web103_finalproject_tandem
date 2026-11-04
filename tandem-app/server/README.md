# Tandem game server (folder `server`)

Render → New + → Web Service → your repo
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: Free
- Environment Variables:
  - `DATABASE_URL` = your Internal Database URL
  - `CLIENT_ORIGIN` (add after the website is live) = `https://tandem-table.localhost.cc` (no `/` at the end)

Wait for green "Live". Check: open `https://<server-address>/health` → `{"ok":true}`.
Copy that address — the website needs it as `VITE_API_URL`.
