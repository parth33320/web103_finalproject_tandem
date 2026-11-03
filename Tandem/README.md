# Tandem server (upload these files into the `Tandem` folder)

Render → New → Web Service → repo `web103_finalproject_tandem`
- Root Directory: `Tandem`
- Build command: `npm install`
- Start command: `npm start`
- Environment: `DATABASE_URL` (Internal Database URL), `CLIENT_ORIGIN` (optional: your website address(es), comma separated, no trailing slash; leave unset to allow any site)

Check it works: open `<your-server>/health` → `{"ok":true}`.
