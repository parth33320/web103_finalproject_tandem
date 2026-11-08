import { test, expect } from '@playwright/test';

test.describe('Features 7–10: Red-Green-Refactor E2E & Component Test Suite', () => {

  test.describe('Feature 7 — Error Handling (Frontend)', () => {
    test('navigate to route while server is unreachable — assert .error-text element appears', async ({ page }) => {
      // Simulate unreachable server by aborting /api/leaderboard requests
      await page.route('**/api/leaderboard*', (route) => route.abort());

      await page.goto('/leaderboard');
      const errorEl = page.locator('.error-text');
      await expect(errorEl).toBeVisible();
      await expect(errorEl).not.toBeEmpty();
    });
  });

  test.describe('Feature 8 — Auth/Protected Routes', () => {
    test('direct navigation to /profile without localStorage player redirects to /', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('tandem_player'));

      await page.goto('/profile');
      await page.waitForURL('**/');
      expect(new URL(page.url()).pathname).toBe('/');
      await expect(page.locator('.redirect-notice')).toBeVisible();
    });

    test('direct navigation to /decks without localStorage player redirects to /', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => localStorage.removeItem('tandem_player'));

      await page.goto('/decks');
      await page.waitForURL('**/');
      expect(new URL(page.url()).pathname).toBe('/');
      await expect(page.locator('.redirect-notice')).toBeVisible();
    });

    test('after logging in (entering username), /profile and /decks are accessible', async ({ page }) => {
      // Intercept players creation to ensure reliable login state
      await page.route('**/api/players', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 88, username: 'AuthTestUser', created_at: new Date() }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route('**/api/players/88', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 88, username: 'AuthTestUser', scores: [], missed_words: [] }),
        });
      });

      await page.route('**/api/decks*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/');
      const input = page.locator('#username-input');
      await input.fill('AuthTestUser');

      // Click start button to register user
      const startBtn = page.locator('.start-btn.ja-btn');
      await startBtn.click();

      // Ensure user saved in context/localStorage
      await page.waitForTimeout(500);

      // Navigate to /profile
      await page.goto('/profile');
      await expect(page.locator('.profile-container')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/profile');

      // Navigate to /decks
      await page.goto('/decks');
      await expect(page.locator('.decks-container')).toBeVisible();
      expect(new URL(page.url()).pathname).toBe('/decks');
    });
  });

  test.describe('Feature 9 — Loading States', () => {
    test('on /leaderboard, assert .spinner is visible before data loads and gone after', async ({ page }) => {
      let fulfillResponse;
      const delayedPromise = new Promise((resolve) => {
        fulfillResponse = resolve;
      });

      await page.route('**/api/leaderboard*', async (route) => {
        await delayedPromise;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ entries: [] }),
        });
      });

      await page.goto('/leaderboard');

      // Spinner should be visible while request is pending
      const spinner = page.locator('.spinner');
      await expect(spinner).toBeVisible();

      // Resolve delayed response
      fulfillResponse();

      // Spinner should disappear once data loads
      await expect(spinner).toHaveCount(0);
      await expect(page.locator('.empty-msg')).toBeVisible();
    });

    test('on deck save, assert save button has disabled attribute while request is in flight', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('tandem_player', JSON.stringify({ id: 1, username: 'DeckTester' }));
      });

      let finishSave;
      const savePromise = new Promise((resolve) => {
        finishSave = resolve;
      });

      await page.route('**/api/decks', async (route) => {
        if (route.request().method() === 'POST') {
          await savePromise;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 99, player_id: 1, deck_title: 'FlightDeck', words: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto('/decks');
      const input = page.locator('.deck-input').first();
      await input.fill('FlightDeck');

      const saveBtn = page.locator('.create-deck-form button[type="submit"]');
      await expect(saveBtn).toBeEnabled();

      await saveBtn.click();

      // Save button must have disabled attribute while request is in flight
      await expect(saveBtn).toBeDisabled();

      finishSave();

      // Once resolved, button is re-enabled and toast is visible
      await expect(page.locator('.app-toast-notification')).toBeVisible();
      await expect(saveBtn).toBeEnabled();
    });
  });

  test.describe('Feature 10 — Toast Notifications', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('tandem_player', JSON.stringify({ id: 1, username: 'ToastTester' }));
      });
    });

    test('Create a deck → assert .toast-notification appears with text containing "saved"', async ({ page }) => {
      await page.route('**/api/decks', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ id: 101, player_id: 1, deck_title: 'SavedDeck', words: [] }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
        }
      });

      await page.goto('/decks');
      const input = page.locator('.deck-input').first();
      await input.fill('SavedDeck');

      const saveBtn = page.locator('.create-deck-form button[type="submit"]');
      await saveBtn.click();

      const toast = page.locator('.app-toast-notification');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/saved/i);
    });

    test('Delete a word from a deck → assert toast appears', async ({ page }) => {
      const mockDeck = {
        id: 102,
        player_id: 1,
        deck_title: 'DeckWithWords',
        words: [{ id: 55, jp_form: '海軍', meaning_ja: 'navy' }],
      };

      await page.route(/\/api\/decks/, async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Word removed from deck.' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([mockDeck]),
          });
        }
      });

      await page.goto('/decks');
      await expect(page.locator('.deck-word-item')).toBeVisible();

      const removeBtn = page.locator('.remove-word-btn').first();
      await removeBtn.click();

      const toast = page.locator('.app-toast-notification');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText(/removed/i);
    });

    test('Score saved after round → assert toast appears with "Score saved!"', async ({ page }) => {
      await page.route('**/api/words/round*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            questions: [
              {
                wordId: 1,
                display: '海軍',
                choices: ['navy', 'army', 'police', 'fire'],
                correctIndex: 0,
                relation: 'true',
                reveal: { meaning_ja: 'navy', meaning_zh: 'navy' },
              },
            ],
          }),
        });
      });

      await page.route('**/api/scores', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, score: 10, direction: 'zh-ja' }),
        });
      });

      await page.goto('/game', { state: { direction: 'zh-ja' } });
      await page.waitForSelector('.choice-btn');

      // Answer question
      await page.locator('.choice-btn').first().click();

      // Click finish
      const nextBtn = page.locator('.next-btn');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();

      const toast = page.locator('.app-toast-notification');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Score saved!');
    });

    test('Simulate score save failure (intercept network) → assert toast appears with failure message', async ({ page }) => {
      await page.route('**/api/words/round*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            questions: [
              {
                wordId: 1,
                display: '海軍',
                choices: ['navy', 'army', 'police', 'fire'],
                correctIndex: 0,
                relation: 'true',
                reveal: { meaning_ja: 'navy', meaning_zh: 'navy' },
              },
            ],
          }),
        });
      });

      // Fail score submission
      await page.route('**/api/scores', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database down' }),
        });
      });

      await page.goto('/game', { state: { direction: 'zh-ja' } });
      await page.waitForSelector('.choice-btn');

      // Answer question
      await page.locator('.choice-btn').first().click();

      // Click finish
      const nextBtn = page.locator('.next-btn');
      await expect(nextBtn).toBeVisible();
      await nextBtn.click();

      const toast = page.locator('.app-toast-notification');
      await expect(toast).toBeVisible();
      await expect(toast).toContainText('Score failed to save.');
    });
  });
});
