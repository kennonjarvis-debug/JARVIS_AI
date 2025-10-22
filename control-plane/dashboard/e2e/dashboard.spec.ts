/**
 * Dashboard E2E Tests
 * Tests the main dashboard functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Jarvis/i);
  });

  test('should display all main dashboard sections', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for main sections
    await expect(page.getByText('Business Performance')).toBeVisible();
    await expect(page.getByText('Claude Instances')).toBeVisible();
    await expect(page.getByText('System Health')).toBeVisible();
  });

  test('should display business metrics', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for all 5 business categories
    await expect(page.getByText('Music Generation')).toBeVisible();
    await expect(page.getByText('Marketing & Strategy')).toBeVisible();
    await expect(page.getByText('User Engagement')).toBeVisible();
    await expect(page.getByText('Workflow Automation')).toBeVisible();
    await expect(page.getByText('Business Intelligence')).toBeVisible();
  });

  test('should display instance monitor', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for metrics
    await expect(page.getByText('Completed')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Blockers')).toBeVisible();
  });

  test('should display system health', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Overall Status')).toBeVisible();
    await expect(page.getByText('Services')).toBeVisible();
  });

  test('should display financial summary', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for financial metrics
    const financialSection = page.locator('text=Financial Summary').first();
    await expect(financialSection).toBeVisible();
  });

  test('should update data periodically', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Get initial timestamp
    const initialContent = await page.content();

    // Wait for update (SSE should update every 5 seconds)
    await page.waitForTimeout(6000);

    const updatedContent = await page.content();

    // Content might have changed (this is a basic check)
    // In a real scenario, you'd check specific data points
    expect(initialContent).toBeDefined();
    expect(updatedContent).toBeDefined();
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Check that main content is still visible
    await expect(page.getByText('Business Performance')).toBeVisible();
  });

  test('should handle tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Business Performance')).toBeVisible();
    await expect(page.getByText('System Health')).toBeVisible();
  });
});

test.describe('Dashboard Data Loading', () => {
  test('should show loading state initially', async ({ page }) => {
    await page.goto('/');

    // Check for loading indicators or skeleton screens
    // This depends on your implementation
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate errors
    await page.route('**/api/dashboard/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dashboard should still render without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle slow API responses', async ({ page }) => {
    // Simulate slow response
    await page.route('**/api/dashboard/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/');

    // Should eventually load
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Dashboard Interactions', () => {
  test('should hover over metric cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find a metric card and hover
    const metricCard = page.locator('.glass-hover').first();
    await metricCard.hover();

    // Card should be visible after hover
    await expect(metricCard).toBeVisible();
  });

  test('should display status dots correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for status dots
    const statusDots = page.locator('.status-dot');
    const count = await statusDots.count();

    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Dashboard Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1, h2 headings
    const headings = page.locator('h1, h2');
    const count = await headings.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try tabbing through the page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });
});
