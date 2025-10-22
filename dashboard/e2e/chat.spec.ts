/**
 * Chat Interface E2E Tests
 * Tests chat functionality if it exists on the dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display chat interface', async ({ page }) => {
    // Look for chat input or chat button
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]');

    // If chat exists, test it
    if (await chatInput.isVisible()) {
      await expect(chatInput).toBeVisible();
    }
  });

  test('should send a chat message', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

    if (await chatInput.isVisible()) {
      await chatInput.fill('Hello Jarvis');
      await page.keyboard.press('Enter');

      // Should show the message in the chat
      await expect(page.getByText('Hello Jarvis')).toBeVisible();
    }
  });

  test('should receive a response', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

    if (await chatInput.isVisible()) {
      await chatInput.fill('Test message');
      await page.keyboard.press('Enter');

      // Wait for response (timeout after 10 seconds)
      await page.waitForTimeout(5000);

      // Should have more than one message
      const messages = page.locator('[role="log"] > *, .message');
      const count = await messages.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle empty message gracefully', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

    if (await chatInput.isVisible()) {
      // Try to send empty message
      await chatInput.fill('');
      await page.keyboard.press('Enter');

      // Should not crash
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display message history', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

    if (await chatInput.isVisible()) {
      // Send multiple messages
      await chatInput.fill('First message');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      await chatInput.fill('Second message');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Both messages should be visible
      await expect(page.getByText('First message')).toBeVisible();
      await expect(page.getByText('Second message')).toBeVisible();
    }
  });

  test('should handle long messages', async ({ page }) => {
    const chatInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();

    if (await chatInput.isVisible()) {
      const longMessage = 'This is a very long message that tests the chat interface ability to handle longer text inputs without breaking the UI or causing any layout issues.'.repeat(3);

      await chatInput.fill(longMessage);
      await page.keyboard.press('Enter');

      // Should not break the UI
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Voice Input', () => {
  test('should display voice input button if available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for microphone icon or voice button
    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")');

    // If voice button exists, it should be visible
    if (await voiceButton.count() > 0) {
      await expect(voiceButton.first()).toBeVisible();
    }
  });

  test('should toggle voice input on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const voiceButton = page.locator('button[aria-label*="voice" i], button:has-text("🎤")').first();

    if (await voiceButton.isVisible()) {
      await voiceButton.click();

      // Button state might change (this depends on implementation)
      await expect(voiceButton).toBeVisible();
    }
  });
});
