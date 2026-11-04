# Tandem

CodePath WEB103 Final Project

Designed and developed by: Parth Patel, Robert Cunningham, Tasneem Shabana, Hunter Smith, George Liu

🔗 Link to deployed app: **https://tandem-table.localhost.cc**

> **Note:** Tandem is hosted on Render's free tier, which sleeps when nobody is using it. If the first page takes a while to load, or says the server is waking up, please wait about 30–60 seconds and refresh.

---

## About

### Description and Purpose

Tandem is a timed web-based quiz game about how much Chinese and Japanese words overlap. Both languages use Chinese characters, so a speaker of one language can often guess the meaning of words in the other language. However, some words look identical but mean completely different things. The purpose of Tandem is to test language learners on words categorized into three relationships: true friends (same characters, same meaning), false friends (same characters, different meaning), and half friends (related but shifted meaning). The game helps users see how much the two languages match through a final similarity meter.

### Inspiration

Our project is inspired by the funny mistakes language learners make when they guess words across Chinese and Japanese. For example, the word 手紙 means a written letter in Japanese, but it means toilet paper in Chinese. We wanted to build a game that turns these common character traps into a fun quiz game that helps users learn words using real data.

---

## Tech Stack

Frontend: React 19, TanStack Start, TanStack Router, Tailwind CSS v4, React Three Fiber (3D), Socket.IO Client

Backend: Express, Node.js, PostgreSQL, Socket.IO (real-time rooms), Passport.js with GitHub OAuth (sign-in)

Deployment: Render (frontend and backend services)

> **Note on routing:** We use TanStack Router (built into TanStack Start) for dynamic frontend routing, e.g. `/room/$code`, where `$code` is the live room code. We use it in place of React Router to meet the dynamic frontend routing requirement.

---

## Installation Instructions

To run this project locally, you will need **Node.js 20.19+ (or 22.12+)**, **Bun**, and a **PostgreSQL** database.

### 1. Clone the repository

```sh
git clone https://github.com/parth33320/web103_finalproject_tandem.git
cd web103_finalproject_tandem
```

### 2. Set up the backend

Open a terminal and install the backend dependencies:

```sh
cd tandem-app/server
npm install
```

Copy `tandem-app/server/.env.example` to `tandem-app/server/.env` and fill it in:

```env
PORT=3001
DATABASE_URL=postgres://your_user:your_password@localhost:5432/tandem
CLIENT_ORIGIN=http://localhost:5173
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SERVER_URL=http://localhost:3001
SESSION_SECRET=a-long-random-string
ADMIN_KEY=a-password-for-the-reset-button
```

Create a PostgreSQL database and make sure `DATABASE_URL` points to it. When the backend starts, it creates every table and seeds the 340 built-in words, so there's no separate SQL step.

**GitHub sign-in:** create an OAuth app at [github.com/settings/developers](https://github.com/settings/developers) → *New OAuth App*. Set the *Homepage URL* to the website's address and the *Authorization callback URL* to `http://localhost:3001/auth/github/callback` (or `https://<your-backend>/auth/github/callback` in production). Then copy the Client ID and a new Client Secret into `.env`. Without them the game still works for guests, and the sign-in button explains that sign-in isn't set up yet.

Start the backend:

```sh
npm start
```

The backend runs on `http://localhost:3001`.

### 3. Set up the frontend

Open a second terminal from the repository root:

```sh
cd tandem-app/client
bun install
```

Create a `.env` file in the `tandem-app/client` folder:

```env
VITE_API_URL=http://localhost:3001
```

Start the frontend:

```sh
bun run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173`). If Vite picks a different port, update `CLIENT_ORIGIN` in the backend `.env` to match.

### 4. Deploy your own instance on Render

Create a PostgreSQL database on Render (or use an existing one), then deploy the backend and frontend as separate **Web Services**:

- **Backend:** Root Directory `tandem-app/server`, Build Command `npm install`, Start Command `npm start`. Set `DATABASE_URL` (your PostgreSQL connection string), `CLIENT_ORIGIN` (your deployed frontend URL), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` and `ADMIN_KEY`. Render provides the backend's own URL automatically. Keep `SESSION_SECRET` the same between deploys, or everyone gets signed out.
- **Frontend:** Root Directory `tandem-app/client`, Build Command `npm install && npm run build`, Start Command `npm run start`. Set `VITE_API_URL` to your deployed backend URL.

The frontend builds a Node.js server (`.output/server/index.mjs`), so deploy it as a Web Service, not a Static Site. Set `VITE_API_URL` in the Render environment **before** building, because Vite bakes it into the build.

---

## Features

> **How to read this section**
>
> Each feature is labeled with its **rubric category** and **point value** from the Final Milestone grading rubric:
>
> - `[BASELINE]` — Required for everyone. Total baseline points: **59 pts**
> - `[CUSTOM ★]` — Must complete at least 2; each worth **3 pts** (all-or-nothing). Total available: 24 pts
> - `[STRETCH ✨]` — Optional bonus points. Total available: 19 pts
>
> Each feature also lists its **owner** — the team member responsible for all backend routes and frontend components for that feature, to minimize merge conflicts.
>
> As features are completed, add ✅ in front of the feature name and embed a GIF below it.

---

### ✅ Feature 1 — Timed Game Loop Mode
**Owner: George Liu** | Related stories: 1, 2, 3, 4

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes an Express backend app and a React frontend app | `[BASELINE]` | part of 5 pts |
| The project includes at least one interaction the user can initiate and complete on the same page | `[BASELINE]` | **3 pts** |
| The project includes dynamic frontend routes created with React Router | `[BASELINE]` | part of **4 pts** |
| The project includes dynamic routes for both frontend and backend apps | `[BASELINE]` | part of **3 pts** |
| The project includes a well-designed RESTful API (GET) | `[BASELINE]` | part of **15 pts** |

**Description:** A quiz game mode where players choose a game direction, view a word, and pick the correct English meaning within a strict 8–10 second timer. The timer stops as soon as the player clicks an answer.

- **Sequential Example:**
  - *Step 1 (Input):* Player clicks the button "I know Chinese → guess Japanese".
  - *Step 2 (Output):* The system loads the game screen, displays the word **手紙**, and starts a visual 10-second timer counting down.
  - *Step 3 (Input):* Player clicks the multiple-choice option "Letter" at second 4.
  - *Step 4 (Output):* The system stops the timer, records the choice, and highlights the answer.
  - *Explanation:* Stopping the visual 10-second timer at second 4 when the player clicks "Letter" confirms that the system successfully manages the quiz flow by stopping the timer right when the player inputs an answer.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Player clicks the button "I know Chinese → guess Japanese".
  - *Step 2 (Output):* The system loads the game screen, displays the word **手紙**, and starts a visual 10-second timer counting down.
  - *Step 3 (Input):* Player clicks the multiple-choice option "Letter" at second 4.
  - *Step 4 (Output):* The system does not stop the timer, does not record the choice, and the timer counts down to 0, causing a false game-over screen.
  - *Explanation:* The system failing to stop the timer at second 4 and forcing a false game-over screen despite the user clicking "Letter" demonstrates a broken game state where player input is completely ignored.

![Feature 1 Timed Game Loop](./assets/feature1-timed-game-loop.gif)

---

### ✅ Feature 2 — Dynamic Word Reveal Cards
**Owner: Hunter Smith** | Related stories: 5, 6, 7

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes a slide-out pane or modal | `[CUSTOM ★]` | **3 pts** (now met by the trap-word modal, the in-game How to play modal and the Settings slide-out; see Features 4 and 11) |
| The project includes at least one interaction the user can initiate and complete on the same page | `[BASELINE]` | **3 pts** (shared with Feature 1) |
| The project includes a well-designed RESTful API (GET for word detail) | `[BASELINE]` | part of **15 pts** |

**Description:** A card component that displays after each answer in a modal to show the word spelling, reading, meaning, and relationship tag side by side for both languages.

- **Sequential Example:**
  - *Step 1 (Input):* Player clicks a multiple-choice option for the word **手紙**.
  - *Step 2 (Output):* The system halts the game loop and opens a modal card component on top of the same page.
  - *Step 3 (Output):* The card component displays "Japanese: 手紙 (tegami) = Letter" side by side with "Chinese: 手紙 (shǒuzhǐ) = Toilet paper".
  - *Step 4 (Output):* The card component displays a prominent red "False Friend" relationship tag.
  - *Explanation:* The component displaying the side-by-side linguistic breakdown and accurately showing the red "False Friend" tag confirms the system successfully isolates word data on a modal.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Player clicks a multiple-choice option for the word **手紙**.
  - *Step 2 (Output):* The system halts the game loop and opens a modal card component on top of the same page.
  - *Step 3 (Output):* The card component displays "Japanese: 手紙 (tegami) = Letter" side by side with "Chinese: 手紙 (shǒuzhǐ) = Toilet paper".
  - *Step 4 (Output):* The card component leaves the relationship tag space blank because it failed to fetch the relationship metadata.
  - *Explanation:* The component failing to display the relationship tag demonstrates a database communication failure where crucial data is missing from the screen.

![Feature 2 Reveal Card](./assets/feature2-reveal-card.gif)

---

### ✅ Feature 3 — Final Similarity Meter Dashboard
**Owner: Tasneem Shabana** | Related stories: 8, 9, 10

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes at least one redirection | `[BASELINE]` | **3 pts** |
| The project includes dynamic frontend routes created with React Router | `[BASELINE]` | part of **4 pts** |
| The project includes dynamic routes for both frontend and backend apps | `[BASELINE]` | part of **3 pts** |
| The app includes hierarchically designed React components | `[BASELINE]` | part of **6 pts** |
| The project includes a well-designed RESTful API (GET for round summary) | `[BASELINE]` | part of **15 pts** |

**Description:** A screen at the end of a round that calculates and displays the exact percentage of words seen during the round that share the same meaning in both languages.

- **Sequential Example:**
  - *Step 1 (Input):* Player clicks the final multiple-choice option of a 10-word quiz round.
  - *Step 2 (Output):* The system finishes the quiz round and redirects the user to the round dashboard screen.
  - *Step 3 (Output):* The system counts that 4 out of the 10 words seen were tagged as true friends.
  - *Step 4 (Output):* The system renders a progress bar displaying a "40% Similarity Meter".
  - *Explanation:* The system counting 4 out of 10 true friends and displaying a "40% Similarity Meter" proves that the application successfully calculates the proportion of identical words from the completed round.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Player clicks the final multiple-choice option of a 10-word quiz round.
  - *Step 2 (Output):* The system finishes the quiz round and redirects the user to the round dashboard screen.
  - *Step 3 (Output):* The system fails to count how many words seen were tagged as true friends.
  - *Step 4 (Output):* The system renders an error message or "0% Similarity Meter" instead of the real calculation.
  - *Explanation:* The system failing to count the true friends illustrates a dashboard calculation failure that deprives the player of their round summary.

![Feature 3 Similarity Meter](./assets/feature3-similarity-meter.gif)

---

### ✅ Feature 4 — Personal Missed Words History
**Owner: Tasneem Shabana** | Related stories: 11, 12, 13

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes at least one of each DB relationship — many-to-many with join table | `[BASELINE]` | part of **8 pts** |
| Data is automatically generated in response to a certain event or user action | `[CUSTOM ★]` | **3 pts** |
| The project includes a unique field within the join table | `[CUSTOM ★]` | **3 pts** |
| The project includes a well-designed RESTful API (GET for missed words) | `[BASELINE]` | part of **15 pts** |

**Description:** A feature that tracks user answers in a join table (`player_missed_words`) to show a list of specific words that the user keeps missing, ranked by miss count.

**How it works in the app:** When a signed-in player answers a card wrong (or runs out of time), the server automatically adds the word to `player_missed_words` or adds 1 to its `miss_count`; `last_missed_at` is stored on the join table too. The **My table** page (`/me`) lists these words, most-missed first (`GET /api/me/missed`). Clicking one opens a modal with both meanings, and **I've got it now** removes it (`DELETE /api/me/missed/:wordId`). **Practice my traps** starts a game dealt from your own trap words, and the end-of-game screen lists the words that tricked you that game.

- **Sequential Example:**
  - *Step 1 (Input):* Logged-in user clicks an incorrect option for the word **勉強** during a quiz round.
  - *Step 2 (Output):* The system sends a `POST` request to update the user's miss count for **勉強** in the join table.
  - *Step 3 (Input):* Logged-in user navigates to their profile page after finishing the game.
  - *Step 4 (Output):* The system sends a `GET` request and displays **勉強** at the top of a "Words You Keep Missing" list.
  - *Explanation:* Updating the miss count via `POST` and displaying it on the profile page confirms that user mistakes are successfully registered and tracked.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Logged-in user clicks an incorrect option for the word **勉強** during a quiz round.
  - *Step 2 (Output):* The system sends a `POST` request to update the user's miss count for **勉強**.
  - *Step 3 (Input):* Logged-in user navigates to their profile page.
  - *Step 4 (Output):* The system displays a generic welcome message and an empty list because it failed to pull the personal history.
  - *Explanation:* The profile page showing an empty list highlights a tracking failure where the user's personal mistake history is lost.

![Feature 4 Missed Words](./assets/feature4-missed-words.gif)

---

### ✅ Feature 5 — Community Word Pool (CRUD)
**Owner: Robert Cunningham** | Related stories: 14, 15, 16, 17, 18

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes at least one of each DB relationship — one-to-many (player → words) | `[BASELINE]` | part of **8 pts** |
| The project includes a well-designed RESTful API — GET, POST, PATCH, DELETE | `[BASELINE]` | **15 pts** (this feature satisfies all four verbs) |
| The app includes hierarchically designed React components | `[BASELINE]` | part of **6 pts** |
| Data submitted via POST or PATCH is validated before the DB is updated | `[CUSTOM ★]` | **3 pts** |
| The project allows filtering and/or sorting | `[CUSTOM ★]` | **3 pts** (shared with Feature 6) |

**Description:** Instead of private decks, players build the game together. A signed-in player can add a false, half or true friend that once tricked them, fix typos in their own words, and delete them. Everyone can browse the pool and vote. Once a word has enough upvotes (2 by default, and the author's own vote counts), it starts being dealt in real games, marked "Community word by @username".

**Routes:** `GET /api/words` (filter by `relation` and `source`, sort by `top`, `new` or `missed`, search with `q`), `GET /api/words/:id`, `POST /api/words`, `PATCH /api/words/:id`, `DELETE /api/words/:id`, `PUT /api/words/:id/vote`. Pages: `/words`, `/words/new` (sign-in required), `/words/$id`.

**Validation:** the form and the server share one set of rules (`validateWord`). The word must be 1–8 Chinese characters or kana, romaji and pinyin must use Latin letters, and both meanings are required. True friends must mean the same thing in both languages and false friends must not. A word that's already on the table (including the 340 built-in words) is rejected with a 409. Only the author can edit or delete a word, and built-in words can't be changed.

- **Sequential Example:**
  - *Step 1 (Input):* A signed-in player opens **Word pool → + Add a word** and submits 便宜 (JP "convenience", ZH "cheap") as a false friend.
  - *Step 2 (Output):* The system validates the fields, sends a `POST /api/words` request, inserts a row into `words` with the player as `author_id`, and adds the author's upvote.
  - *Step 3 (Output):* The browser redirects to `/words/1001`, showing the card and "Waiting for votes", with a success toast.
  - *Step 4 (Input → Output):* Another player upvotes it; a toast says "便宜 has joined the game deck!", and it can now appear in games.
  - *Explanation:* The validated `POST`, the redirect to the new word's page, and the word appearing in later games show a complete, saved creation flow.
- **Sequential Counterexample:**
  - *Step 1 (Input):* The player submits 手紙 with JP "letter" and ZH "toilet paper".
  - *Step 2 (Output):* The server answers `409`: "手紙 is already on the table." The field is highlighted and nothing is saved.
  - *Step 3 (Input):* The player submits a blank form, or marks a "true friend" with two different meanings.
  - *Step 4 (Output):* Each invalid field shows a message and the database is not updated.
  - *Explanation:* Bad or duplicate input is rejected before it reaches the database.

![Feature 5 Word Pool CRUD](./assets/feature5-deck-crud.gif)

---

### ✅ Feature 6 — Split Direction Leaderboards
**Owner: Parth Patel** | Related stories: 19, 20, 21

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The app includes the ability to reset the database to its default state | `[BASELINE]` | **4 pts** |
| The project includes a well-designed RESTful API (GET with query params) | `[BASELINE]` | part of **15 pts** |
| The project allows filtering and/or sorting | `[CUSTOM ★]` | **3 pts** |

**Description:** A data table that ranks user high scores separately based on the chosen game direction, showing if Chinese speakers guess Japanese words better than Japanese speakers guess Chinese words.

**How it works in the app:** When a game ends, each signed-in player's score, correct answers and direction are saved to `scores`, and a toast confirms it. `/leaderboard` ("High Rollers") shows each player's best game, with tabs for Chinese → Japanese, Japanese → Chinese and Neither (English), sorted by best score, accuracy or most recent (`GET /api/leaderboard?direction=ja2zh&sort=accuracy`). The tab and sort are kept in the URL. **Reset:** the **Admin** link in the footer opens `/admin`, which calls `POST /api/admin/reset` with the server's `ADMIN_KEY`. That restores the default state: the 340 built-in words, with no scores, trap words, votes, community words or old rooms.

- **Sequential Example:**
  - *Step 1 (Input):* Player finishes a round in "Chinese → Japanese" and clicks "View Leaderboards".
  - *Step 2 (Output):* The system executes a GET request filtered by direction and loads the leaderboard page.
  - *Step 3 (Input):* Player clicks the toggle "Switch to Japanese → Guess Chinese".
  - *Step 4 (Output):* The component swaps the table to show the reverse direction rankings.
  - *Explanation:* The toggle successfully swapping tables proves the system separates and renders scores by direction.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Player finishes a round in "Chinese → Japanese" and clicks "View Leaderboards".
  - *Step 2 (Output):* The system loads the leaderboard page showing "Chinese → Japanese" scores.
  - *Step 3 (Input):* Player clicks the toggle "Switch to Japanese → Guess Chinese".
  - *Step 4 (Output):* The component does nothing and continues showing the old scores.
  - *Explanation:* The component freezing demonstrates a failure in separating or rendering the alternate direction rankings.

![Feature 6 Leaderboard](./assets/feature6-leaderboard.gif)

---

### ✅ Feature 7 — Graceful Error Handling ★
**Owner: All team members (Parth Patel coordinates)** | Related stories: 22, 23

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project gracefully handles errors | `[CUSTOM ★]` | **3 pts** |

**Description:** Every API route returns a meaningful HTTP status code and error message. The frontend catches fetch errors and displays user-friendly messages instead of blank screens or crashes. Applies to all six features.

![Feature 7 Graceful Error Handling](./assets/feature7-error-handling.gif)

---

### ✅ Feature 8 — Authentication / Protected Routes ✨
**Owner: Parth Patel** | Related stories: 24, 25

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| A subset of pages require the user to log in before accessing the content | `[STRETCH ✨]` | **3 pts** |

**Description:** GitHub OAuth or username/password login. The Personal Missed Words History, Custom Deck Creator, and profile pages are protected routes that redirect unauthenticated users to the login screen.

**How it works in the app:** **Sign in with GitHub** uses Passport.js (`passport-github2`). Guests can still play everything. `/me` and `/words/new` redirect guests to `/login?redirect=…`, and after signing in they return to the page they wanted. The OAuth `state` is checked against a signed cookie to stop login CSRF. Because the website and API are on different domains, the server issues a signed token, which the browser sends as `Authorization: Bearer …`. Signed-in players' settings are saved to their account (`player_settings`, a one-to-one table).

![Feature 8 Protected Routes](./assets/feature8-protected-routes.gif)

---

### ✅ Feature 9 — Loading States & Button Safeguards ✨
**Owner: Hunter Smith** | Related stories: 26, 27

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| Show a spinner while a page or page element is loading | `[STRETCH ✨]` | **2 pts** |
| Disable buttons and inputs during the form submission process | `[STRETCH ✨]` | **2 pts** |

**Description:** A spinner is shown while data is being fetched from the server. Buttons are disabled and grayed out during active form submissions to prevent double-submits.

**How it works in the app:** Spinners appear while the server wakes up, while rooms are created, and while the word pool, leaderboard and profile load. Forms (add or edit a word, join a room, admin reset) lock their inputs while saving. "Deal the cards", "Next card", answer cards, clues and vote buttons are disabled once clicked.

![Feature 9 Loading States](./assets/feature9.gif)

---

### ✅ Feature 10 — Toast Notifications ✨
**Owner: Robert Cunningham** | Related stories: 28, 29

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| Toast messages deliver simple feedback in response to user events | `[STRETCH ✨]` | **3 pts** |

**Description:** Brief non-blocking toast notifications confirm successful actions (deck saved, word deleted, score submitted) and surface soft errors (score failed to save) without interrupting the user's flow.

**How it works in the app:** Toasts are shown for: room created, invite link copied, signed in or out, word added, saved or deleted, a word joining the deck, score saved to the leaderboard, a trap word cleared, database reset, and any request that fails.

![Feature 10 Toast Notifications](./assets/feature10-toasts.gif)

---

### ✅ Feature 11 — How to Play
**Owner: All team members** | New

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes a slide-out pane or modal | `[CUSTOM ★]` | **3 pts** (shared with Feature 4) |

**Description:** The **How to play** link in the navigation opens `/how-to-play`, which explains seating, reading the card, true, false and half friends, clues and their costs, the reveal, scoring, and what signing in adds. The numbers come from the game code, so they can't drift. Inside a live room, the **❔ How to play** button opens the same rules in a modal, so nobody has to leave the table. The host-language, voice, theme and sound settings moved from the lobby into a **⚙️ Settings** slide-out panel, so the lobby only asks for your name and what you already know.

---

## Complete Rubric Coverage Checklist

Use this as your final checklist before submitting. Every item maps to a feature and owner above.

### Baseline Features — 59 pts total (MUST complete ALL)

- [x] The project includes an Express backend app and a React frontend app — **5 pts** — *All features*
- [x] The project includes dynamic routes for both frontend and backend apps — **3 pts** — *Features 1, 3, 5, 6*
- [x] The project includes at least one of each DB relationship:
  - [x] one-to-many — **part of 8 pts** — *Feature 5 (player → community words) · Owner: Robert Cunningham*
  - [x] many-to-many with a join table — **part of 8 pts** — *Feature 4 (`player_missed_words`: players ↔ words; also `word_votes`) · Owner: Tasneem Shabana*
- [x] The project includes a well-designed RESTful API — **15 pts** — *Feature 5 satisfies all four verbs*
  - [x] GET (view items)
  - [x] POST (create item)
  - [x] PATCH (update item)
  - [x] DELETE (delete item)
  - [x] Routes follow proper naming conventions
- [x] The app includes the ability to reset the database to its default state — **4 pts** — *Feature 6 · Owner: Parth Patel*
- [x] The project includes at least one redirection — **3 pts** — *Feature 3 · Owner: Tasneem Shabana*
- [x] The project includes at least one same-page interaction — **3 pts** — *Features 1 & 2 · George Liu / Hunter Smith*
- [x] The project includes dynamic frontend routes created with React Router — **4 pts** — *Features 1, 3, 5, 6* (via TanStack Router, `/room/$code`; see the routing note under Tech Stack)
- [x] The app includes hierarchically designed React components — **6 pts** — *Feature 5 · Owner: Robert Cunningham*
  - [x] Components broken into page and component types
  - [x] Corresponding container and presenter components
- [ ] The project is deployed on Render with all pages and features working — **8 pts** — *All features* (tick after redeploying with the new environment variables)

### Custom Required Features — must complete at least 2 (3 pts each, all-or-nothing)

- [x] The project gracefully handles errors — **3 pts** — *Feature 7 · Owner: All / Parth coordinates*
- [x] The project includes a slide-out pane or modal — **3 pts** — *Features 4 & 11 (trap-word modal, How to play modal, Settings slide-out)*
- [x] The project includes a unique field within the join table — **3 pts** — *Feature 4 (`miss_count`, `last_missed_at`) · Owner: Tasneem Shabana*
- [x] The project allows filtering and/or sorting — **3 pts** — *Features 5 & 6 (word pool and leaderboard filters and sorts)*
- [x] Data is automatically generated in response to a certain event or user action — **3 pts** — *Feature 4 (wrong answer → trap word), plus a settings row on first sign-in and the author's upvote on a new word*
- [x] Data submitted via POST or PATCH is validated before the database is updated — **3 pts** — *Feature 5 · Owner: Robert Cunningham*
- [x] *(optional)* The project includes a one-to-one database relationship — **3 pts** — *`players` ↔ `player_settings`*
- [x] *(optional)* The project includes a custom non-RESTful route — **3 pts** — *`POST /api/admin/reset`, `PUT /api/words/:id/vote`*

### Stretch Features — optional bonus points

- [x] A subset of pages require the user to log in before accessing the content — **3 pts** — *Feature 8 · Owner: Parth Patel*
- [x] Show a spinner while a page or page element is loading — **2 pts** — *Feature 9 · Owner: Hunter Smith*
- [x] Disable buttons and inputs during the form submission process — **2 pts** — *Feature 9 · Owner: Hunter Smith*
- [x] Toast messages deliver simple feedback in response to user events — **3 pts** — *Feature 10 · Owner: Robert Cunningham*
- [x] *(optional)* Restrict available user options dynamically — **3 pts** — *only the author can edit or delete a word; only the room creator can deal; used clues lock; Practice is off with no trap words*
- [x] *(optional)* Disable buttons after they have been clicked — **2 pts** — *Feature 9*
- [ ] *(optional)* Users can upload images stored on a cloud service — **4 pts**
