import { test, expect } from '@playwright/test';

test.describe('Feature 5 — Custom Deck Creator CRUD (Stories 14–18)', () => {
  test('Security: Unauthenticated request to /decks route in UI redirects to / (ProtectedRoute)', async ({ page }) => {
    // Navigate directly to /decks without any player session in localStorage
    await page.goto('/decks');

    // Assert redirection to home route /
    await page.waitForURL((url) => url.pathname === '/', { timeout: 10000 });
    expect(page.url()).toMatch(/\/$/);

    // Assert redirect notice from ProtectedRoute is displayed
    const redirectNotice = page.locator('.redirect-notice');
    await expect(redirectNotice).toBeVisible();
    await expect(redirectNotice).toContainText('Login required.');
  });

  test('E2E: Log in, navigate to /decks, create deck, rename it, delete it — with toasts visible', async ({ page }) => {
    // 1. Log in on Home page
    await page.goto('/');
    const uname = `P${Date.now() % 99999}`;

    const usernameInput = page.locator('#username-input');
    await expect(usernameInput).toBeVisible();
    await usernameInput.fill(uname);

    // Click start to log in and set player
    const startBtn = page.locator('.start-btn.ja-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // After clicking start, user is redirected to /game with player set in context/localStorage
    await page.waitForURL('**/game', { timeout: 15000 });

    // 2. Navigate to /decks
    const decksNav = page.locator('nav a[href="/decks"]');
    await expect(decksNav).toBeVisible();
    await decksNav.click();
    await page.waitForURL('**/decks', { timeout: 10000 });

    const decksContainer = page.locator('.decks-container');
    await expect(decksContainer).toBeVisible();

    // 3. Create deck titled "Test Deck ${Date.now()}"
    const testDeckTitle = `Test Deck ${Date.now()}`;
    const createInput = page.locator('.create-deck-form .deck-input');
    await expect(createInput).toBeVisible();
    await createInput.fill(testDeckTitle);

    const saveBtn = page.locator('.create-deck-form button[type="submit"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Assert card appears with title
    const deckCard = page.locator('.deck-card', { hasText: testDeckTitle });
    await expect(deckCard).toBeVisible({ timeout: 10000 });

    // Assert toast notification visible for deck creation
    const createToast = page.locator('.app-toast-notification');
    await expect(createToast).toBeVisible();
    await expect(createToast).toContainText(`Deck "${testDeckTitle}" saved successfully!`);

    // 4. Rename deck
    const renamedDeckTitle = `Renamed Deck ${Date.now()}`;
    const editBtn = deckCard.locator('.edit-deck-btn');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Once edit is clicked, the deck card form shows the edit-input textbox
    const editInput = page.locator('.edit-title-form .edit-input');
    await expect(editInput).toBeVisible();
    await editInput.fill(renamedDeckTitle);

    const saveEditBtn = page.locator('.edit-title-form .btn-save');
    await expect(saveEditBtn).toBeVisible();
    await saveEditBtn.click();

    // Assert new title shows on card
    const renamedCard = page.locator('.deck-card', { hasText: renamedDeckTitle });
    await expect(renamedCard).toBeVisible({ timeout: 10000 });

    // Assert toast notification visible for rename
    const renameToast = page.locator('.app-toast-notification');
    await expect(renameToast).toBeVisible();
    await expect(renameToast).toContainText(`Deck renamed to "${renamedDeckTitle}"!`);

    // 5. Delete deck (auto-accept confirm dialog)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    const deleteBtn = renamedCard.locator('.delete-deck-btn');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Assert deck card is gone
    await expect(page.locator('.deck-card', { hasText: renamedDeckTitle })).toHaveCount(0, { timeout: 10000 });

    // Assert toast notification visible for delete
    const deleteToast = page.locator('.app-toast-notification');
    await expect(deleteToast).toBeVisible();
    await expect(deleteToast).toContainText('Deck deleted successfully!');
  });
});
