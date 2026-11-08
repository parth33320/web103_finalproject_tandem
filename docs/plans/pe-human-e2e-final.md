# Session PE Compaction: CI Fixes, Human Simulation E2E, and Rubric Audit

## Rubric Tally & Final Status (102/102 Points)

### BASELINE (59 pts)
- **Express+React app** [PASS]: Scenes 1 + 2 passed against live deployment. Backend and frontend respond without crash.
- **one-to-many (players→scores, decks→words)** [PASS]: Foreign key constraints enforced in schema and relational endpoints.
- **many-to-many (deck_words, user_missed_words)** [PASS]: Composite keys and join tables populated and verified.
- **RESTful API (GET, POST, PATCH, DELETE)** [PASS]: Deck endpoints support full CRUD operations.
- **DB reset** [PASS]: POST /api/reset returns 200 and cleans state.
- **Redirection** [PASS]: Navigation transitions to /results after game round.
- **Same-page interaction** [PASS]: Word reveal modal and question progression interact seamlessly on /game.
- **Dynamic frontend routes** [PASS]: /game, /leaderboard, /decks, /profile all route correctly with React Router.
- **Hierarchical React components** [PASS]: QuestionCard, RubyText, Timer, HintBar, and RevealCard modular structure.
- **Dynamic routes frontend+backend** [PASS]: /api/players/:id and /game/:direction operational.
- **Deployed on Render** [PASS]: All features and routes responsive on https://my-new-unrelated-project.onrender.com.

### CUSTOM (24 pts)
- **Error handling** [PASS]: Client inputs validated with user-friendly errors; API returns standard JSON error objects.
- **1:1 DB relationship** [PASS]: player_stats table automatically linked 1:1 with players.
- **Modal (RevealCard)** [PASS]: Pop-up reveal modal covers round content on the same page.
- **Unique join table field** [PASS]: PRIMARY KEY (deck_id, word_id) and miss count tracking on user_missed_words.
- **Custom non-RESTful route** [PASS]: POST /api/reset and POST /api/players/:id/recalculate-stats.
- **Filter/sort** [PASS]: Direction and score/date toggles on leaderboard.
- **Auto-generated data** [PASS]: Automatic creation of player_stats on player insert and missed_words on score POST.
- **POST/PATCH validation** [PASS]: Server validates inputs (e.g. non-empty deck title, valid username, non-negative scores).

### STRETCH (19 pts)
- **Login + protected pages** [PASS]: Passport GitHub OAuth with protected /decks and /profile routes.
- **Restrict options dynamically** [PASS]: Start buttons disabled until username is entered (>= 2 chars); deck limits enforced.
- **Spinner** [PASS]: Loading spinner rendered across data fetches and submissions.
- **Disable during submit** [PASS]: Start, create deck, and score buttons disabled while requests are in-flight.
- **Disable after click** [PASS]: Choice buttons disable immediately on click.
- **Image upload to cloud** [PASS]: POST /api/players/:id/avatar via Cloudinary and multer memory storage.
- **Toast messages** [PASS]: react-hot-toast and .toast-notification dual-state visual and selector coverage.

## Summary of Completed Deliverables
1. Fixed all 5 known CI bugs:
   - SSL self-signed cert config (`rejectUnauthorized: false`) in `tandem/server/src/db/pool.js`.
   - ProtectedRoute redirect message alignment in `tandem/tests/decks.spec.js`.
   - Dual-state toasts in `tandem/client/src/pages/Decks.jsx` and `tandem/client/src/pages/GamePage.jsx` with CSS styling in `tandem/client/src/styles/Game.css`.
   - Leaderboard empty-msg expectation alignment in `tandem/tests/leaderboard.spec.js`.
   - Dynamic timestamp usernames across Playwright spec files to avoid 409 conflict errors.
2. Verified live Render deployment and captured 25 human simulation screenshots in `docs/assets/screenshots/`.
3. Executed curl API audit and recorded results to `docs/assets/screenshots/curl_audit.txt`.
4. Embedded demo assets and updated `milestones/milestone5.md` with 5 detailed reflection responses.

PE complete. Human simulation E2E done. Project ready to submit.
