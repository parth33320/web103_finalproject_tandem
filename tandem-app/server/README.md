# Tandem game server (folder `tandem-server`)

Upload this whole `tandem-server` folder into the repo `web103_finalproject_tandem`
(GitHub → Add file → Upload files → drag the folder itself → Commit changes).
It is a new folder, so it never overwrites teammates' code.

Render → New + → Web Service → repo `web103_finalproject_tandem`
- Name: `tandem-server`
- Root Directory: `tandem-server`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: Free
- Environment Variables:
  - `DATABASE_URL` = your Internal Database URL (with the new password)
  - `CLIENT_ORIGIN` (optional, add later) = your website address, e.g. `https://tandem-web.onrender.com` (no `/` at the end)

Click Deploy Web Service, wait for green "Live".
Check it works: open `https://<your-server-address>/health` → `{"ok":true}`.
Copy that address — the website needs it as `VITE_API_URL` (see tandem-web/HOSTING.md).
