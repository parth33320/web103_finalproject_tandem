// Sign in with GitHub (Passport). The website and this server live on different domains, so instead of a
// cross-site session cookie the server hands the website a signed token, sent back as "Authorization: Bearer <token>".
import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { db, pool } from './db.js';

const TOKEN_DAYS = 30;
const SECRET = process.env.SESSION_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') console.warn('SESSION_SECRET is not set: sign-ins will reset whenever the server restarts.');
  return crypto.randomBytes(32).toString('hex');
})();

const b64 = (s) => Buffer.from(s).toString('base64url');
const mac = (s) => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function signToken(playerId) {
  const body = b64(JSON.stringify({ p: playerId, e: Date.now() + TOKEN_DAYS * 86400_000 }));
  return `${body}.${mac(body)}`;
}
/** Player id from a token, or null if it is missing, forged or expired. */
export function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !same(sig, mac(body))) return null;
  try {
    const { p, e } = JSON.parse(Buffer.from(body, 'base64url').toString());
    return Number.isInteger(p) && e > Date.now() ? p : null;
  } catch { return null; }
}

const bearer = (req) => /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1];
export async function playerById(id) {
  if (!id) return null;
  const { rows } = await db.query('SELECT id, username, avatar_url, created_at FROM players WHERE id = $1', [id]);
  return rows[0] ?? null;
}
/** Adds req.player when a valid token is sent (or null). */
export const optionalAuth = (req, _res, next) => {
  playerById(verifyToken(bearer(req))).then((p) => { req.player = p; next(); }, next);
};
/** 401 unless signed in. */
export const requireAuth = (req, res, next) => optionalAuth(req, res, (err) => {
  if (err) return next(err);
  if (!req.player) return res.status(401).json({ error: 'Please sign in with GitHub first.' });
  next();
});

/** Only same-site paths like "/words/new" — never "//evil.com" or a full URL. */
const safePath = (p) => (typeof p === 'string' && /^\/(?!\/)[\w\-/.?=&%$]*$/.test(p) ? p : '/');
const COOKIE = 'tandem_oauth';

export function attachAuth(app, { clientUrl, serverUrl }) {
  const id = process.env.GITHUB_CLIENT_ID, secret = process.env.GITHUB_CLIENT_SECRET;
  const enabled = !!(id && secret && pool);
  app.get('/auth/status', (_req, res) => res.json({ github: enabled }));
  if (!enabled) {
    console.warn('GitHub sign-in is off: set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and DATABASE_URL.');
    app.get('/auth/github', (_req, res) => res.redirect(`${clientUrl}/login?error=unavailable`));
    return;
  }

  passport.use(new GitHubStrategy(
    { clientID: id, clientSecret: secret, callbackURL: `${serverUrl}/auth/github/callback`, scope: [] },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const { rows } = await db.query(
          `INSERT INTO players (github_id, username, avatar_url) VALUES ($1, $2, $3)
           ON CONFLICT (github_id) DO UPDATE SET username = EXCLUDED.username, avatar_url = EXCLUDED.avatar_url
           RETURNING id, username, avatar_url`,
          [profile.id, String(profile.username).slice(0, 39), profile.photos?.[0]?.value ?? null],
        );
        // Every new player automatically gets a settings row (one-to-one).
        await db.query('INSERT INTO player_settings (player_id) VALUES ($1) ON CONFLICT DO NOTHING', [rows[0].id]);
        done(null, rows[0]);
      } catch (e) { done(e); }
    },
  ));
  app.use(passport.initialize());

  // Step 1: remember a random state (against login CSRF) and where to return, then send the player to GitHub.
  app.get('/auth/github', (req, res, next) => {
    const state = crypto.randomBytes(16).toString('base64url');
    const value = `${state}.${b64(safePath(req.query.redirect))}`;
    res.cookie(COOKIE, `${value}.${mac(value)}`, { httpOnly: true, sameSite: 'lax', secure: req.secure, maxAge: 10 * 60_000, path: '/auth' });
    passport.authenticate('github', { session: false, state })(req, res, next);
  });

  // Step 2: GitHub sends the player back here. Check the state, then hand the website a token.
  app.get('/auth/github/callback', (req, res, next) => {
    const fail = (why) => res.redirect(`${clientUrl}/login?error=${why}`);
    const raw = (req.get('cookie') || '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? '';
    res.clearCookie(COOKIE, { path: '/auth' });
    const [state, redirect, sig] = decodeURIComponent(raw).split('.');
    if (!state || !sig || !same(sig, mac(`${state}.${redirect}`)) || req.query.state !== state) return fail('expired');
    if (req.query.error) return fail('denied');
    passport.authenticate('github', { session: false }, (err, player) => {
      if (err || !player) { if (err) console.error('GitHub sign-in failed:', err.message); return fail('github'); }
      const back = safePath(Buffer.from(redirect, 'base64url').toString());
      res.redirect(`${clientUrl}/auth/callback#token=${signToken(player.id)}&redirect=${encodeURIComponent(back)}`);
    })(req, res, next);
  });
}
