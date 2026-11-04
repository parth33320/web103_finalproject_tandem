# Milestone 4 Progress Report

## Milestone 4 Completion
Replace the blank before the percent sign with a number from 0 to 100.
Completion percentage for Milestone 4 - Unit 8: 100%

List each issue you completed this unit and the main file or folder where that work lives, one per line:

Issue: Implement Timed Game Loop Mode (Feature 1)
    - Live rooms, 10 cards, 20-second clock, answers over Socket.IO - tandem-app/server/rooms.js, tandem-app/server/room-logic.js
    - Game screen and answer cards - tandem-app/client/src/routes/room.$code.tsx, tandem-app/client/src/lib/room.ts

Issue: Construct Final Similarity Meter Dashboard (Feature 3)
    - Similarity calculation - tandem-app/client/src/lib/content.ts
    - End-of-game results screen with similarity meter - tandem-app/client/src/routes/room.$code.tsx

Issue: Set up Personal Missed Words History Join Table (Feature 4)
    - player_missed_words join table (miss_count, last_missed_at, correct_streak) - tandem-app/server/db.js
    - Wrong answers saved automatically; practice mastery - tandem-app/server/rooms.js
    - GET/DELETE /api/me/missed - tandem-app/server/api.js
    - "Words you keep missing" page with word modal and Practice my traps - tandem-app/client/src/routes/me.tsx

Issue: Build Community Word Pool CRUD (Feature 5)
    - GET/POST/PATCH/DELETE /api/words and PUT /api/words/:id/vote - tandem-app/server/api.js
    - Shared validation rules - tandem-app/client/src/lib/words.ts (validateWord)
    - Word pool, add word and word detail pages - tandem-app/client/src/routes/words.index.tsx, words.new.tsx, words.$id.tsx
    - Word card, vote buttons and form - tandem-app/client/src/components/words.tsx

Issue: Build Split Direction Leaderboards and Database Reset (Feature 6)
    - GET /api/leaderboard with direction filter and sort; POST /api/admin/reset - tandem-app/server/api.js, tandem-app/server/db.js
    - High Rollers leaderboard and Admin reset pages - tandem-app/client/src/routes/leaderboard.tsx, tandem-app/client/src/routes/admin.tsx

Issue: Add Graceful Error Handling Across API and UI (Feature 7)
    - JSON error handler with clear status codes - tandem-app/server/api.js (errorHandler)
    - Friendly error messages and retry boxes - tandem-app/client/src/lib/api.ts, tandem-app/client/src/components/Spinner.tsx

Issue: Add GitHub OAuth Sign-in and Protected Routes (Feature 8)
    - Passport.js GitHub strategy, signed tokens, login CSRF check - tandem-app/server/auth.js
    - Login, OAuth callback and route guard - tandem-app/client/src/routes/login.tsx, auth.callback.tsx, tandem-app/client/src/lib/auth.tsx, tandem-app/client/src/lib/guard.ts

Issue: Add Loading Spinners and Button Safeguards (Feature 9)
    - Spinner, loading and error blocks - tandem-app/client/src/components/Spinner.tsx
    - Disabled buttons while saving or after clicking - word form, lobby, room "Deal" and "Next card" buttons

Issue: Add Toast Notifications (Feature 10)
    - Toaster in the app shell - tandem-app/client/src/routes/__root.tsx
    - Toasts for saves, deletes, votes, scores, sign-in and errors - across tandem-app/client/src

Issue: Add How to Play Page and Settings Panel (Feature 11)
    - How to play page and in-game pop-up - tandem-app/client/src/components/HowToPlay.tsx, tandem-app/client/src/routes/how-to-play.tsx
    - Settings slide-out panel - tandem-app/client/src/components/SettingsSheet.tsx

## Features Completed This Unit
List each feature you completed and checked off in readme.md this unit, one per line:
Feature 1 — Timed Game Loop Mode
Feature 3 — Final Similarity Meter Dashboard
Feature 4 — Personal Missed Words History
Feature 5 — Community Word Pool (CRUD)
Feature 6 — Split Direction Leaderboards
Feature 7 — Graceful Error Handling
Feature 8 — Authentication / Protected Routes
Feature 9 — Loading States & Button Safeguards
Feature 10 — Toast Notifications
Feature 11 — How to Play
