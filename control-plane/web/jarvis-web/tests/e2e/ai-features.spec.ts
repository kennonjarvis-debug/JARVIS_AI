import { test, expect, Page } from '@playwright/test';

/**
 * AI Features End-to-End Tests
 * Tests AI chat, automation, insights, and intelligent features
 */

test.describe('AI Features', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/(dashboard|observatory)/);
  });

  test.describe('AI Chat', () => {
    test('should open AI chat interface', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="ai-chat-button"]');

      await expect(page.locator('[data-testid="ai-chat-panel"]')).toBeVisible();
      await expect(page.locator('text=Jarvis AI')).toBeVisible();
    });

    test('should send message and receive response', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      const userMessage = 'What are my top metrics today?';
      await page.fill('textarea[name="message"]', userMessage);
      await page.click('button:text("Send")');

      // Should show user message
      await expect(page.locator(`text=${userMessage}`)).toBeVisible();

      // Should show AI response
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 20000 });

      // Response should contain relevant content
      const responseText = await page.locator('[data-testid="ai-response"]').last().textContent();
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(10);
    });

    test('should handle follow-up questions', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // First question
      await page.fill('textarea[name="message"]', 'Show me CPU usage');
      await page.click('button:text("Send")');
      await page.waitForSelector('[data-testid="ai-response"]');

      // Follow-up question
      await page.fill('textarea[name="message"]', 'What about memory?');
      await page.click('button:text("Send")');

      // Should maintain context
      await expect(page.locator('[data-testid="ai-response"]')).toHaveCount(2);
    });

    test('should support voice input', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // Click voice input button
      await page.click('[data-testid="voice-input-button"]');

      // Should show recording indicator
      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();

      // Stop recording
      await page.click('[data-testid="stop-recording"]');

      // Should process voice (in real tests, you'd mock the speech-to-text)
      await expect(page.locator('textarea[name="message"]')).not.toBeEmpty();
    });

    test('should clear chat history', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // Send a message
      await page.fill('textarea[name="message"]', 'Test message');
      await page.click('button:text("Send")');
      await page.waitForSelector('[data-testid="ai-response"]');

      // Clear history
      await page.click('[data-testid="chat-menu"]');
      await page.click('text=Clear History');
      await page.click('button:text("Confirm")');

      // Chat should be empty
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(0);
    });

    test('should export chat history', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      await page.fill('textarea[name="message"]', 'Test message');
      await page.click('button:text("Send")');
      await page.waitForSelector('[data-testid="ai-response"]');

      // Export
      await page.click('[data-testid="chat-menu"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Export Chat');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/chat.*\.txt$/);
    });

    test('should suggest prompts', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // Should show suggested prompts
      await expect(page.locator('[data-testid="suggested-prompt"]')).toHaveCount.greaterThan(0);

      // Click suggested prompt
      await page.click('[data-testid="suggested-prompt"]');

      // Should populate message box
      const messageBox = page.locator('textarea[name="message"]');
      await expect(messageBox).not.toBeEmpty();
    });
  });

  test.describe('AI Insights', () => {
    test('should generate insights for observatory', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=AI Insights');

      // Should show AI-generated insights
      await expect(page.locator('[data-testid="insight-card"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="insight-card"]')).toHaveCount.greaterThan(0);
    });

    test('should show trend analysis', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=AI Insights');

      // Should show trends
      await expect(page.locator('[data-testid="trend-analysis"]')).toBeVisible();
      await expect(page.locator('text=/increasing|decreasing|stable/i')).toBeVisible();
    });

    test('should detect anomalies', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=AI Insights');

      // Should show anomaly detection
      await expect(page.locator('[data-testid="anomaly-detection"]')).toBeVisible();
    });

    test('should provide recommendations', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=AI Insights');

      // Should show recommendations
      await expect(page.locator('[data-testid="recommendation"]')).toBeVisible();
      await expect(page.locator('text=/recommend|suggest/i')).toBeVisible();
    });

    test('should forecast metrics', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=AI Insights');

      await page.click('text=Forecast');

      // Should show forecast chart
      await expect(page.locator('[data-testid="forecast-chart"]')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('AI Automation', () => {
    test('should create AI-powered automation', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Automation');
      await page.click('text=Create with AI');

      // Describe automation in natural language
      await page.fill('textarea[name="description"]', 'Send alert when CPU is high for 5 minutes');
      await page.click('button:text("Generate Automation")');

      // AI should generate workflow
      await expect(page.locator('[data-testid="generated-workflow"]')).toBeVisible({ timeout: 15000 });

      // Save automation
      await page.click('button:text("Save Automation")');

      await expect(page.locator('text=/automation.*created/i')).toBeVisible();
    });

    test('should suggest automation improvements', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Automation');

      await page.click('[data-testid="automation-card"]');
      await page.click('text=AI Suggestions');

      // Should show improvement suggestions
      await expect(page.locator('[data-testid="ai-suggestion"]')).toBeVisible();
    });

    test('should optimize automation with AI', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Automation');

      await page.click('[data-testid="automation-card"]');
      await page.click('text=Optimize with AI');

      // Should show optimization results
      await expect(page.locator('text=/optimization.*complete/i')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Natural Language Queries', () => {
    test('should query metrics with natural language', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="search-bar"]');
      await page.fill('input[name="search"]', 'show me average response time last week');
      await page.press('input[name="search"]', 'Enter');

      // Should show query results
      await expect(page.locator('[data-testid="query-results"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/response time/i')).toBeVisible();
    });

    test('should handle complex queries', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="search-bar"]');
      await page.fill('input[name="search"]', 'compare CPU usage between production and staging last month');
      await page.press('input[name="search"]', 'Enter');

      // Should show comparison
      await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible({ timeout: 10000 });
    });

    test('should save favorite queries', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="search-bar"]');
      await page.fill('input[name="search"]', 'daily active users');
      await page.press('input[name="search"]', 'Enter');

      // Save query
      await page.click('[data-testid="save-query"]');
      await page.fill('input[name="queryName"]', 'DAU Query');
      await page.click('button:text("Save")');

      await expect(page.locator('text=/query.*saved/i')).toBeVisible();
    });
  });

  test.describe('AI Report Generation', () => {
    test('should generate AI summary', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Reports');
      await page.click('text=Generate AI Summary');

      // Should generate summary
      await expect(page.locator('[data-testid="ai-summary"]')).toBeVisible({ timeout: 20000 });

      // Summary should be coherent
      const summaryText = await page.locator('[data-testid="ai-summary"]').textContent();
      expect(summaryText!.length).toBeGreaterThan(100);
    });

    test('should create executive summary', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Reports');
      await page.click('text=Executive Summary');

      // Should generate executive summary
      await expect(page.locator('[data-testid="executive-summary"]')).toBeVisible({ timeout: 20000 });

      // Should include key metrics
      await expect(page.locator('text=/key.*metrics/i')).toBeVisible();
      await expect(page.locator('text=/highlights/i')).toBeVisible();
    });

    test('should customize report with AI', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Reports');
      await page.click('text=Custom AI Report');

      // Describe what to include
      await page.fill('textarea[name="reportRequest"]', 'Include CPU, memory, and user activity trends');
      await page.click('button:text("Generate")');

      await expect(page.locator('[data-testid="custom-report"]')).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('AI-Powered Search', () => {
    test('should search with semantic understanding', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="global-search"]');
      await page.fill('input[name="search"]', 'slow requests');

      // Should understand "slow" means high response time
      await expect(page.locator('[data-testid="search-result"]')).toBeVisible();
      await expect(page.locator('text=/response time|latency/i')).toBeVisible();
    });

    test('should provide search suggestions', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="global-search"]');
      await page.fill('input[name="search"]', 'erro');

      // Should show suggestions
      await expect(page.locator('[data-testid="search-suggestion"]')).toBeVisible();
    });

    test('should search across multiple sources', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="global-search"]');
      await page.fill('input[name="search"]', 'database performance');
      await page.press('input[name="search"]', 'Enter');

      // Should show results from multiple sources
      await expect(page.locator('[data-testid="search-category"]')).toHaveCount.greaterThan(1);
    });
  });

  test.describe('Intelligent Alerts', () => {
    test('should create smart alert with AI', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Alerts');
      await page.click('text=Smart Alert');

      // Describe alert in natural language
      await page.fill('textarea[name="alertDescription"]', 'Alert me when traffic increases suddenly');
      await page.click('button:text("Create Smart Alert")');

      // AI should configure alert
      await expect(page.locator('[data-testid="smart-alert-config"]')).toBeVisible({ timeout: 15000 });

      // Review and save
      await page.click('button:text("Save Alert")');

      await expect(page.locator('text=/alert.*created/i')).toBeVisible();
    });

    test('should reduce alert noise with AI', async () => {
      await page.goto('/settings');

      await page.click('text=Alert Intelligence');

      // Enable AI-powered deduplication
      await page.check('input[name="enableAlertDeduplication"]');
      await page.check('input[name="enableAlertGrouping"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });
  });

  test.describe('AI Model Configuration', () => {
    test('should select AI model', async () => {
      await page.goto('/settings/ai');

      await page.click('select[name="aiModel"]');
      await page.click('option[value="gpt-4"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/model.*updated/i')).toBeVisible();
    });

    test('should configure AI parameters', async () => {
      await page.goto('/settings/ai');

      await page.fill('input[name="temperature"]', '0.7');
      await page.fill('input[name="maxTokens"]', '2000');
      await page.fill('input[name="topP"]', '0.9');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });

    test('should view AI usage and costs', async () => {
      await page.goto('/settings/ai');

      await page.click('text=Usage & Costs');

      // Should show usage metrics
      await expect(page.locator('[data-testid="ai-usage-chart"]')).toBeVisible();
      await expect(page.locator('text=/tokens|requests/i')).toBeVisible();
      await expect(page.locator('text=/cost/i')).toBeVisible();
    });

    test('should set usage limits', async () => {
      await page.goto('/settings/ai');

      await page.click('text=Usage Limits');

      await page.fill('input[name="monthlyBudget"]', '100');
      await page.fill('input[name="dailyRequestLimit"]', '1000');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/limits.*saved/i')).toBeVisible();
    });
  });

  test.describe('AI Personalization', () => {
    test('should learn from user behavior', async () => {
      await page.goto('/dashboard');

      // AI should show personalized suggestions based on usage
      await expect(page.locator('[data-testid="personalized-suggestion"]')).toBeVisible();
    });

    test('should customize AI responses', async () => {
      await page.goto('/settings/ai');

      await page.click('text=Personalization');

      // Set preferences
      await page.click('select[name="responseStyle"]');
      await page.click('option[value="concise"]');

      await page.check('input[name="includeTechnicalDetails"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/preferences.*saved/i')).toBeVisible();
    });
  });

  test.describe('AI Accessibility', () => {
    test('should work with screen readers', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // AI chat should have proper ARIA labels
      const chatPanel = page.locator('[data-testid="ai-chat-panel"]');
      await expect(chatPanel).toHaveAttribute('role', 'dialog');

      const messageInput = page.locator('textarea[name="message"]');
      await expect(messageInput).toHaveAttribute('aria-label', /.+/);
    });

    test('should support keyboard navigation', async () => {
      await page.goto('/dashboard');

      // Open chat with keyboard
      await page.keyboard.press('Alt+K');

      await expect(page.locator('[data-testid="ai-chat-panel"]')).toBeVisible();

      // Navigate with keyboard
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 20000 });
    });
  });

  test.describe('AI Performance', () => {
    test('should respond quickly', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      const startTime = Date.now();

      await page.fill('textarea[name="message"]', 'What is my CPU usage?');
      await page.click('button:text("Send")');

      await page.waitForSelector('[data-testid="ai-response"]');

      const responseTime = Date.now() - startTime;

      // Should respond within 10 seconds
      expect(responseTime).toBeLessThan(10000);
    });

    test('should handle concurrent requests', async () => {
      await page.goto('/dashboard');
      await page.click('[data-testid="ai-chat-button"]');

      // Send multiple messages quickly
      await page.fill('textarea[name="message"]', 'First question');
      await page.click('button:text("Send")');

      await page.fill('textarea[name="message"]', 'Second question');
      await page.click('button:text("Send")');

      // Both should receive responses
      await expect(page.locator('[data-testid="ai-response"]')).toHaveCount(2, { timeout: 20000 });
    });
  });

  test.describe('Mobile AI Features', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile', async () => {
      await page.goto('/dashboard');

      await page.click('[data-testid="ai-chat-button"]');

      await expect(page.locator('[data-testid="ai-chat-panel"]')).toBeVisible();

      await page.fill('textarea[name="message"]', 'Mobile test');
      await page.click('button:text("Send")');

      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 20000 });
    });
  });
});
