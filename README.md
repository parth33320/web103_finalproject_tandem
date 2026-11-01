# Tandem

CodePath WEB103 Final Project

Designed and developed by: Parth Patel, Robert Cunningham, Tasneem Shabana, Hunter Smith, George Liu

🔗 Link to deployed app:

---

## About

### Description and Purpose

Tandem is a timed web-based quiz game about how much Chinese and Japanese words overlap. Both languages use Chinese characters, so a speaker of one language can often guess the meaning of words in the other language. However, some words look identical but mean completely different things. The purpose of Tandem is to test language learners on words categorized into three relationships: true friends (same characters, same meaning), false friends (same characters, different meaning), and half friends (related but shifted meaning). The game helps users see how much the two languages match through a final similarity meter.

### Inspiration

Our project is inspired by the funny mistakes language learners make when they guess words across Chinese and Japanese. For example, the word 手紙 means a written letter in Japanese, but it means toilet paper in Chinese. We wanted to build a game that turns these common character traps into a fun quiz game that helps users learn words using real data.

---

## Tech Stack

Frontend: React, React Router, CSS

Backend: Express, Node.js, PostgreSQL

---

## Installation Instructions

[instructions go here]

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

### Feature 1 — Timed Game Loop Mode
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

[gif goes here]

---

### Feature 2 — Dynamic Word Reveal Cards
**Owner: Hunter Smith** | Related stories: 5, 6, 7

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes a slide-out pane or modal | `[CUSTOM ★]` | **3 pts** |
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

[gif goes here]

---

### Feature 3 — Final Similarity Meter Dashboard
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

[gif goes here]

---

### Feature 4 — Personal Missed Words History
**Owner: Tasneem Shabana** | Related stories: 11, 12, 13

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes at least one of each DB relationship — many-to-many with join table | `[BASELINE]` | part of **8 pts** |
| Data is automatically generated in response to a certain event or user action | `[CUSTOM ★]` | **3 pts** |
| The project includes a unique field within the join table | `[CUSTOM ★]` | **3 pts** |
| The project includes a well-designed RESTful API (GET for missed words) | `[BASELINE]` | part of **15 pts** |

**Description:** A feature that tracks user answers in a join table (`user_missed_words`) to show a list of specific words that the user keeps missing, ranked by miss count.

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

[gif goes here]

---

### Feature 5 — Custom Deck Creator (CRUD)
**Owner: Robert Cunningham** | Related stories: 14, 15, 16, 17, 18

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project includes at least one of each DB relationship — one-to-many | `[BASELINE]` | part of **8 pts** |
| The project includes a well-designed RESTful API — GET, POST, PATCH, DELETE | `[BASELINE]` | **15 pts** (this feature satisfies all four verbs) |
| The app includes hierarchically designed React components | `[BASELINE]` | part of **6 pts** |
| Data submitted via POST or PATCH is validated before the DB is updated | `[CUSTOM ★]` | **3 pts** |

**Description:** A tool that lets logged-in users create new custom word decks, view existing word decks, update word definitions, and delete incorrect words from the database.

- **Sequential Example:**
  - *Step 1 (Input):* Logged-in user navigates to the deck dashboard and clicks "Create New Deck".
  - *Step 2 (Input):* User types "My Difficult Kanji" into the title field and clicks "Save Deck".
  - *Step 3 (Output):* The system validates the title is not empty, then sends a `POST` request inserting a new row into the `decks` table.
  - *Step 4 (Output):* The screen redirects back to the dashboard, rendering a new card for "My Difficult Kanji".
  - *Explanation:* The system processing a validated database `POST` request and outputting a persistent card shows a successful creation workflow.
- **Sequential Counterexample:**
  - *Step 1 (Input):* Logged-in user navigates to the deck dashboard and clicks "Create New Deck".
  - *Step 2 (Input):* User types "My Difficult Kanji" into the title field and clicks "Save Deck".
  - *Step 3 (Output):* The system updates the text on the screen temporarily but fails to send a `POST` request.
  - *Step 4 (Output):* The user refreshes the browser and the new card disappears because the row was never saved.
  - *Explanation:* The system failing to send the database request, causing the card to disappear on refresh, demonstrates a lack of persistence.

[gif goes here]

---

### Feature 6 — Split Direction Leaderboards
**Owner: Parth Patel** | Related stories: 19, 20, 21

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The app includes the ability to reset the database to its default state | `[BASELINE]` | **4 pts** |
| The project includes a well-designed RESTful API (GET with query params) | `[BASELINE]` | part of **15 pts** |
| The project allows filtering and/or sorting | `[CUSTOM ★]` | **3 pts** |

**Description:** A data table that ranks user high scores separately based on the chosen game direction, showing if Chinese speakers guess Japanese words better than Japanese speakers guess Chinese words.

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

[gif goes here]

---

### Feature 7 — Graceful Error Handling ★
**Owner: All team members (Parth Patel coordinates)** | Related stories: 22, 23

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| The project gracefully handles errors | `[CUSTOM ★]` | **3 pts** |

**Description:** Every API route returns a meaningful HTTP status code and error message. The frontend catches fetch errors and displays user-friendly messages instead of blank screens or crashes. Applies to all six features.

[gif goes here]

---

### Feature 8 — Authentication / Protected Routes ✨
**Owner: Parth Patel** | Related stories: 24, 25

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| A subset of pages require the user to log in before accessing the content | `[STRETCH ✨]` | **3 pts** |

**Description:** GitHub OAuth or username/password login. The Personal Missed Words History, Custom Deck Creator, and profile pages are protected routes that redirect unauthenticated users to the login screen.

[gif goes here]

---

### Feature 9 — Loading States & Button Safeguards ✨
**Owner: Hunter Smith** | Related stories: 26, 27

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| Show a spinner while a page or page element is loading | `[STRETCH ✨]` | **2 pts** |
| Disable buttons and inputs during the form submission process | `[STRETCH ✨]` | **2 pts** |

**Description:** A spinner is shown while data is being fetched from the server. Buttons are disabled and grayed out during active form submissions to prevent double-submits.

![Feature 9 Loading States](./assets/feature9.gif)


---

### Feature 10 — Toast Notifications ✨
**Owner: Robert Cunningham** | Related stories: 28, 29

**Rubric contributions:**
| Rubric Item | Category | Points |
|---|---|---|
| Toast messages deliver simple feedback in response to user events | `[STRETCH ✨]` | **3 pts** |

**Description:** Brief non-blocking toast notifications confirm successful actions (deck saved, word deleted, score submitted) and surface soft errors (score failed to save) without interrupting the user's flow.

[gif goes here]

---

## Complete Rubric Coverage Checklist

Use this as your final checklist before submitting. Every item maps to a feature and owner above.

### Baseline Features — 59 pts total (MUST complete ALL)

- [ ] The project includes an Express backend app and a React frontend app — **5 pts** — *All features*
- [ ] The project includes dynamic routes for both frontend and backend apps — **3 pts** — *Features 1, 3, 5, 6*
- [ ] The project includes at least one of each DB relationship:
  - [ ] one-to-many — **part of 8 pts** — *Feature 5 (deck → words) · Owner: Robert Cunningham*
  - [ ] many-to-many with a join table — **part of 8 pts** — *Feature 4 (users ↔ words) · Owner: Tasneem Shabana*
- [ ] The project includes a well-designed RESTful API — **15 pts** — *Feature 5 satisfies all four verbs*
  - [ ] GET (view items)
  - [ ] POST (create item)
  - [ ] PATCH (update item)
  - [ ] DELETE (delete item)
  - [ ] Routes follow proper naming conventions
- [ ] The app includes the ability to reset the database to its default state — **4 pts** — *Feature 6 · Owner: Parth Patel*
- [ ] The project includes at least one redirection — **3 pts** — *Feature 3 · Owner: Tasneem Shabana*
- [ ] The project includes at least one same-page interaction — **3 pts** — *Features 1 & 2 · George Liu / Hunter Smith*
- [ ] The project includes dynamic frontend routes created with React Router — **4 pts** — *Features 1, 3, 5, 6*
- [ ] The app includes hierarchically designed React components — **6 pts** — *Feature 5 · Owner: Robert Cunningham*
  - [ ] Components broken into page and component types
  - [ ] Corresponding container and presenter components
- [ ] The project is deployed on Render with all pages and features working — **8 pts** — *All features*

### Custom Required Features — must complete at least 2 (3 pts each, all-or-nothing)

- [ ] The project gracefully handles errors — **3 pts** — *Feature 7 · Owner: All / Parth coordinates*
- [ ] The project includes a slide-out pane or modal — **3 pts** — *Feature 2 · Owner: Hunter Smith*
- [ ] The project includes a unique field within the join table — **3 pts** — *Feature 4 · Owner: Tasneem Shabana*
- [ ] The project allows filtering and/or sorting — **3 pts** — *Feature 6 · Owner: Parth Patel*
- [ ] Data is automatically generated in response to a certain event or user action — **3 pts** — *Feature 4 · Owner: Tasneem Shabana*
- [ ] Data submitted via POST or PATCH is validated before the database is updated — **3 pts** — *Feature 5 · Owner: Robert Cunningham*
- [ ] *(optional)* The project includes a one-to-one database relationship — **3 pts**
- [ ] *(optional)* The project includes a custom non-RESTful route — **3 pts**

### Stretch Features — optional bonus points

- [ ] A subset of pages require the user to log in before accessing the content — **3 pts** — *Feature 8 · Owner: Parth Patel*
- [ ] Show a spinner while a page or page element is loading — **2 pts** — *Feature 9 · Owner: Hunter Smith*
- [ ] Disable buttons and inputs during the form submission process — **2 pts** — *Feature 9 · Owner: Hunter Smith*
- [ ] Toast messages deliver simple feedback in response to user events — **3 pts** — *Feature 10 · Owner: Robert Cunningham*
- [ ] *(optional)* Restrict available user options dynamically — **3 pts**
- [ ] *(optional)* Disable buttons after they have been clicked — **2 pts**
- [ ] *(optional)* Users can upload images stored on a cloud service — **4 pts**
