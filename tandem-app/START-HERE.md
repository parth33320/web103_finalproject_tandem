# Tandem: put it online at tandem-table.localhost.cc

This ZIP has two folders:
- `client`: the website (React)
- `server`: the game server (rooms, chat, clues, host voices)

## 1. GitHub
1. Open your repo on GitHub, then Add file, then Upload files.
2. Drag in BOTH folders, `client` and `server`, then click Commit changes.

## 2. Render: the game server
1. Go to render.com, then New +, then Web Service, and pick your repo.
2. Root Directory: `server`. Build Command: `npm install`. Start Command: `npm start`. Instance: Free.
3. Under Environment, add `DATABASE_URL` = your Internal Database URL.
4. Click Deploy and wait for green "Live".
5. Copy the address at the top, for example `https://tandem-server-xxxx.onrender.com`.
   Check it: open that address with `/health` at the end. It should show `{"ok":true}`.

## 3. Render: the website
1. New +, then Web Service, and pick the same repo.
2. Root Directory: `client`. Build Command: `npm install && npm run build`. Start Command: `npm start`. Instance: Free.
3. Under Environment, add `VITE_API_URL` = the server address from step 2 (no `/` at the end).
4. Click Deploy and wait for "Live".
   If you change `VITE_API_URL` later, click Manual Deploy, then "Clear build cache & deploy".

## 4. Your address: tandem-table.localhost.cc
1. On Render, open the WEBSITE service, then Settings, then Custom Domains, then Add, and type `tandem-table.localhost.cc`.
2. On localhost.cc, open your domain and click Add Record:
   - Type: CNAME
   - Name: `@` (or `tandem-table` if it asks for that)
   - Value: your website's Render address WITHOUT https://, for example `tandem-web-xxxx.onrender.com`
3. Go back to Render and click Verify. The https lock appears on its own. This can take a few minutes, and sometimes up to an hour.

## 5. Lock the server to your site
On the GAME SERVER service, go to Environment and add `CLIENT_ORIGIN` = `https://tandem-table.localhost.cc`. Then save. It redeploys on its own.

## 6. Play
Open https://tandem-table.localhost.cc and click Create a room.
Free Render servers fall asleep. The first visit after a break can take about a minute.
