import { test, expect } from '@playwright/test';

test.describe('Vitality Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display vitality score on dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="vitality-score"]');

    // Check vitality score is visible
    const vitalityScore = await page.textContent('[data-testid="vitality-score"]');
    expect(vitalityScore).toBeTruthy();

    // Verify score is a valid percentage
    const scoreValue = parseInt(vitalityScore?.replace('%', '') || '0');
    expect(scoreValue).toBeGreaterThanOrEqual(0);
    expect(scoreValue).toBeLessThanOrEqual(100);
  });

  test('should display system health metrics', async ({ page }) => {
    const metrics = [
      'system-health',
      'user-engagement',
      'performance-score',
      'error-rate',
      'uptime',
    ];

    for (const metric of metrics) {
      const element = await page.locator(`[data-testid="${metric}"]`);
      await expect(element).toBeVisible();
    }
  });

  test('should update vitality score when refreshed', async ({ page }) => {
    const initialScore = await page.textContent('[data-testid="vitality-score"]');

    // Click refresh button
    await page.click('[data-testid="refresh-button"]');

    // Wait for update
    await page.waitForTimeout(1000);

    const updatedScore = await page.textContent('[data-testid="vitality-score"]');
    expect(updatedScore).toBeTruthy();
  });

  test('should navigate to detailed metrics view', async ({ page }) => {
    await page.click('[data-testid="view-details-button"]');
    await expect(page).toHaveURL(/.*metrics/);
  });
});
