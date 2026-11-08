import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://my-new-unrelated-project.onrender.com';

test.describe('Feature 4 — Personal Missed Words History (Stories 11–13)', () => {
  test('Play a round, answer at least one question wrong, finish round, navigate to /profile, assert .missed-words-list is visible and contains at least one entry', async ({ page }) => {
    test.setTimeout(60000);
    const uname = `P${Date.now() % 99999}`;

    // Navigate to home page
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

    // Register unique player
    const usernameInput = page.locator('#username-input');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    await usernameInput.fill(uname);

    // Start game in Chinese -> Japanese direction
    const startButton = page.locator('.start-btn.zh-btn').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Play through the round: intentionally answer questions wrong
    for (let q = 1; q <= 10; q++) {
      await page.waitForSelector('.question-card', { timeout: 15000 });

      const choiceBtns = page.locator('.choice-btn');
      await expect(choiceBtns.first()).toBeVisible({ timeout: 10000 });

      // For Q1 through Q3, click choiceBtns.nth(3) (last button) instead of first
      // to avoid accidentally clicking correct answer when index is 0
      if (q <= 3) {
        await choiceBtns.nth(3).click();
      } else {
        await choiceBtns.first().click();
      }

      // Explicitly verify .reveal-modal-card appears and correct answer is highlighted
      const modal = page.locator('.reveal-modal-card');
      await expect(modal).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.choice-btn.correct')).toBeVisible({ timeout: 10000 });

      // Click Next / View Results
      const nextBtn = page.locator('.next-btn');
      await expect(nextBtn).toBeVisible({ timeout: 10000 });
      await nextBtn.click();
    }

    // Wait for redirect to /results
    await page.waitForURL('**/results', { timeout: 20000 });
    await expect(page.locator('.results-container')).toBeVisible({ timeout: 10000 });

    // Navigate to /profile via navbar link or directly
    const profileLink = page.locator('nav a[href="/profile"]').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
    } else {
      await page.goto(`${BASE_URL}/profile`);
    }

    await page.waitForURL('**/profile', { timeout: 15000 });

    // Assert .missed-words-list is visible
    const missedWordsList = page.locator('.missed-words-list');
    await expect(missedWordsList).toBeVisible({ timeout: 15000 });

    // Assert .missed-words-list contains at least one entry
    const missedWordItems = page.locator('.missed-word-item');
    const count = await missedWordItems.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify first missed word displays kanji and miss count tag
    const firstMissed = missedWordItems.first();
    await expect(firstMissed.locator('.missed-kanji')).toBeVisible();
    await expect(firstMissed.locator('.miss-count-tag')).toBeVisible();
    const missTagText = await firstMissed.locator('.miss-count-tag').innerText();
    expect(missTagText).toMatch(/Missed \d+×/);
  });
});
