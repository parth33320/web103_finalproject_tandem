import { test, expect } from '@playwright/test';

test.describe('Feature 1 — Timed Game Loop (Stories 1–4)', () => {
  test('E2E: Start timed game, observe countdown, click choice, assert timer stops and reveal modal appears', async ({ page }) => {
    // Navigate to /
    await page.goto('/');

    // Enter username
    const usernameInput = page.locator('#username-input');
    await expect(usernameInput).toBeVisible();
    const uname1 = `P${Date.now() % 99999}`;
    await usernameInput.fill(uname1);

    // Click direction button
    const directionBtn = page.locator('.start-btn.ja-btn').first();
    await expect(directionBtn).toBeVisible();
    await directionBtn.click();

    // Assert .question-card visible with .kanji-display text and 4 .choice-btn elements
    const questionCard = page.locator('.question-card');
    await expect(questionCard).toBeVisible({ timeout: 15000 });

    const kanjiDisplay = page.locator('.kanji-display');
    await expect(kanjiDisplay).toBeVisible();
    const kanjiText = await kanjiDisplay.innerText();
    expect(kanjiText.trim().length).toBeGreaterThan(0);

    const choices = page.locator('.choice-btn');
    await expect(choices).toHaveCount(4);

    // Assert timer counts down (.timer-display value decreases over 2 seconds)
    const timerDisplay = page.locator('.timer-display');
    await expect(timerDisplay).toBeVisible();

    // Read initial timer value
    const initialText = await timerDisplay.innerText();
    const initialVal = parseInt(initialText.replace(/\D/g, ''), 10);

    // Wait 2.2 seconds for timer to count down
    await page.waitForTimeout(2200);

    const secondText = await timerDisplay.innerText();
    const secondVal = parseInt(secondText.replace(/\D/g, ''), 10);
    expect(secondVal).toBeLessThan(initialVal);

    // Click first choice
    const firstChoice = choices.first();
    await expect(firstChoice).toBeVisible();
    await firstChoice.click();

    // Assert timer stops (value no longer changes)
    const stoppedText = await timerDisplay.innerText();
    const stoppedVal = parseInt(stoppedText.replace(/\D/g, ''), 10);

    await page.waitForTimeout(1500);

    const postStopText = await timerDisplay.innerText();
    const postStopVal = parseInt(postStopText.replace(/\D/g, ''), 10);
    expect(postStopVal).toBe(stoppedVal);

    // Assert .reveal-modal-card visible
    const revealModal = page.locator('.reveal-modal-card');
    await expect(revealModal).toBeVisible();
  });
});

test.describe('Feature 3 / Stories 8–10 — Final Similarity Meter & Avg Answer Speed', () => {
  test('E2E: after completing a 10-question round, URL is /results and all stats are visible', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Ensure home page loaded
    const usernameInput = page.locator('#username-input');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    const uniqueUser = `P${Date.now() % 99999}`;
    await usernameInput.fill(uniqueUser);

    // Start game
    const startButton = page.locator('.start-btn.zh-btn').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Loop through all 10 questions
    for (let i = 1; i <= 10; i++) {
      // Wait for question card
      await page.waitForSelector('.question-card', { timeout: 20000 });
      await page.waitForTimeout(300);

      // Click first choice button
      const choiceBtn = page.locator('.choice-btn').first();
      await expect(choiceBtn).toBeVisible({ timeout: 10000 });
      await choiceBtn.click();

      // Modal appears
      const modal = page.locator('.reveal-modal-card');
      await expect(modal).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(200);

      // Click Next question / Finish round button
      const nextBtn = page.locator('.next-btn');
      await expect(nextBtn).toBeVisible({ timeout: 10000 });
      await nextBtn.click();
    }

    // After completing a 10-question round, URL is /results
    await page.waitForURL('**/results', { timeout: 20000 });
    expect(page.url()).toMatch(/\/results$/);

    // .results-container is visible
    const resultsContainer = page.locator('.results-container');
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });

    // .stat-label "True Friend Similarity" is visible with a value matching /\d+%/
    const similarityLabel = page.locator('.stat-label', { hasText: 'True Friend Similarity' });
    await expect(similarityLabel).toBeVisible();
    const similarityItem = page.locator('.stat-item', { has: similarityLabel });
    const similarityValue = similarityItem.locator('.stat-value');
    await expect(similarityValue).toBeVisible();
    const similarityText = await similarityValue.innerText();
    expect(similarityText).toMatch(/\d+%/);

    // .stat-label "Avg Answer Speed" is visible with a value matching /^\d+(\.\d+)?s$/
    const avgSpeedLabel = page.locator('.stat-label', { hasText: 'Avg Answer Speed' });
    await expect(avgSpeedLabel).toBeVisible();
    const avgSpeedItem = page.locator('.stat-item', { has: avgSpeedLabel });
    const avgSpeedValue = avgSpeedItem.locator('.stat-value');
    await expect(avgSpeedValue).toBeVisible();
    const avgSpeedText = await avgSpeedValue.innerText();
    expect(avgSpeedText).toMatch(/^\d+(\.\d+)?s$/);

    // .stat-label "Final Score" is visible
    const finalScoreLabel = page.locator('.stat-label', { hasText: 'Final Score' });
    await expect(finalScoreLabel).toBeVisible();
    const finalScoreItem = page.locator('.stat-item', { has: finalScoreLabel });
    const finalScoreValue = finalScoreItem.locator('.stat-value');
    await expect(finalScoreValue).toBeVisible();
  });

  test('Security: Direct GET to /results (no router state) renders gracefully: score shows 0 pts, avg speed shows N/A, no undefined text, no stack traces visible in body', async ({ page }) => {
    // Direct GET to /results
    await page.goto('/results');

    // Page must render gracefully without uncaught exceptions or crashes
    const resultsContainer = page.locator('.results-container');
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });

    // Score shows 0 pts
    const finalScoreLabel = page.locator('.stat-label', { hasText: 'Final Score' });
    await expect(finalScoreLabel).toBeVisible();
    const scoreVal = page.locator('.stat-item', { has: finalScoreLabel }).locator('.stat-value');
    await expect(scoreVal).toContainText('0 pts');

    // Avg speed shows N/A
    const avgSpeedLabel = page.locator('.stat-label', { hasText: 'Avg Answer Speed' });
    await expect(avgSpeedLabel).toBeVisible();
    const avgSpeedVal = page.locator('.stat-item', { has: avgSpeedLabel }).locator('.stat-value');
    await expect(avgSpeedVal).toHaveText('N/A');

    // No undefined text, no stack traces visible in body
    const bodyText = await page.innerText('body');
    expect(bodyText).not.toContain('undefined');
    expect(bodyText).not.toContain('Cannot read properties');
    expect(bodyText).not.toContain('stack trace');
    expect(bodyText).not.toContain('Error:');
  });
});

test.describe('Feature 2 — Dynamic Word Reveal Cards (Stories 5–7)', () => {
  test('E2E: Answer question, reveal modal appears within 5s with JA/ZH blocks and relation tag, next button dismisses modal and navigates to results on 10th question', async ({ page }) => {
    // Navigate to /
    await page.goto('/');

    // Enter username
    const usernameInput = page.locator('#username-input');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    const uniqueUser = `P${Date.now() % 99999}`;
    await usernameInput.fill(uniqueUser);

    // Click direction button to start game
    const startButton = page.locator('.start-btn.zh-btn').first();
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify questions 1 through 10
    for (let qIndex = 1; qIndex <= 10; qIndex++) {
      // Question card appears
      const questionCard = page.locator('.question-card');
      await expect(questionCard).toBeVisible({ timeout: 15000 });

      // Click an answer choice
      const choices = page.locator('.choice-btn');
      await expect(choices.first()).toBeVisible({ timeout: 10000 });
      await choices.first().click();

      // After clicking an answer, .reveal-modal-card appears within 5s
      const revealModal = page.locator('.reveal-modal-card');
      await expect(revealModal).toBeVisible({ timeout: 5000 });

      // Modal contains .reveal-lang-block.ja and .reveal-lang-block.zh both visible
      const jaBlock = revealModal.locator('.reveal-lang-block.ja');
      const zhBlock = revealModal.locator('.reveal-lang-block.zh');
      await expect(jaBlock).toBeVisible();
      await expect(zhBlock).toBeVisible();

      // Modal shows a .relation-tag element with text matching /True Friend|False Friend|Partial Friend/i
      const relationTag = revealModal.locator('.relation-tag');
      await expect(relationTag).toBeVisible();
      const relationText = await relationTag.innerText();
      expect(relationText).toMatch(/True Friend|False Friend|Partial Friend/i);

      // Next button
      const nextBtn = revealModal.locator('.next-btn');
      await expect(nextBtn).toBeVisible();

      if (qIndex < 10) {
        // Clicking .next-btn dismisses modal and shows next .question-card
        await nextBtn.click();
        await expect(revealModal).toBeHidden({ timeout: 5000 });
        await expect(page.locator('.question-card')).toBeVisible({ timeout: 10000 });
      } else {
        // On last question (10th), clicking .next-btn navigates to /results
        await nextBtn.click();
        await page.waitForURL('**/results', { timeout: 15000 });
        expect(page.url()).toMatch(/\/results$/);
        const resultsContainer = page.locator('.results-container');
        await expect(resultsContainer).toBeVisible({ timeout: 10000 });
      }
    }
  });
});
