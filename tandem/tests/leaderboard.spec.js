import { test, expect } from '@playwright/test';

test.describe('Feature 6: Split Direction Leaderboards + Reset E2E', () => {
  test('Navigate to /leaderboard, toggle directions, toggle sort, reset leaderboard', async ({ page }) => {
    // Mock API responses for leaderboard to verify full frontend rendering & state transitions
    let currentDirection = 'zh-ja';
    let currentSort = 'score';
    let entries = [
      { player_id: 1, username: 'PlayerZh1', best_score: 95, last_played_at: '2026-11-01T10:00:00Z' },
      { player_id: 2, username: 'PlayerZh2', best_score: 80, last_played_at: '2026-11-02T12:00:00Z' },
    ];

    await page.route('**/api/leaderboard*', async (route) => {
      const url = new URL(route.request().url());
      currentDirection = url.searchParams.get('direction') || 'zh-ja';
      currentSort = url.searchParams.get('sort') || 'score';

      if (entries.length === 0) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ direction: currentDirection, sort: currentSort, entries: [] }),
        });
      }

      if (currentDirection === 'ja-zh') {
        const jaEntries = [
          { player_id: 3, username: 'PlayerJa1', best_score: 99, last_played_at: '2026-11-01T08:00:00Z' },
          { player_id: 4, username: 'PlayerJa2', best_score: 75, last_played_at: '2026-11-02T15:00:00Z' },
        ];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ direction: currentDirection, sort: currentSort, entries: jaEntries }),
        });
      }

      let respEntries = [...entries];
      if (currentSort === 'date') {
        respEntries.reverse();
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ direction: currentDirection, sort: currentSort, entries: respEntries }),
      });
    });

    await page.route('**/api/reset', async (route) => {
      entries = [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Database reset.' }),
      });
    });

    // 1. Navigate to /leaderboard
    await page.goto('/leaderboard');
    await expect(page.locator('.leaderboard-container')).toBeVisible();

    // 2. Assert direction toggle buttons are visible
    const zhBtn = page.getByRole('button', { name: 'Chinese → Japanese' });
    const jaBtn = page.getByRole('button', { name: 'Japanese → Chinese' });
    await expect(zhBtn).toBeVisible();
    await expect(jaBtn).toBeVisible();
    await expect(zhBtn).toHaveClass(/active/);

    // Initial table rows
    await expect(page.locator('.leaderboard-table')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await expect(page.locator('tbody')).toContainText('PlayerZh1');

    // 3. Click direction toggle, assert table re-renders
    await jaBtn.click();
    await expect(jaBtn).toHaveClass(/active/);
    await expect(page.locator('tbody')).toContainText('PlayerJa1');
    await expect(page.locator('tbody')).toContainText('99 pts');

    // Toggle back to zh-ja
    await zhBtn.click();
    await expect(zhBtn).toHaveClass(/active/);
    await expect(page.locator('tbody')).toContainText('PlayerZh1');

    // 4. Click sort toggle, assert table updates
    const scoreSortBtn = page.getByRole('button', { name: 'Score' });
    const dateSortBtn = page.getByRole('button', { name: 'Date' });
    await expect(scoreSortBtn).toBeVisible();
    await expect(dateSortBtn).toBeVisible();
    await expect(scoreSortBtn).toHaveClass(/active/);

    await dateSortBtn.click();
    await expect(dateSortBtn).toHaveClass(/active/);
    const firstRowUser = page.locator('tbody tr').first().locator('.username-col');
    await expect(firstRowUser).toHaveText('PlayerZh2');

    // 5. Click Reset, assert table empties with confirmation
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to reset all leaderboard scores?');
      await dialog.accept();
    });

    const resetBtn = page.getByRole('button', { name: 'Reset Leaderboard' });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Assert table empties with empty message confirmation
    await expect(page.locator('.empty-msg')).toBeVisible();
    await expect(page.locator('.empty-msg')).toHaveText('No scores yet for this direction');
    await expect(page.locator('.leaderboard-table')).toHaveCount(0);
  });
});
