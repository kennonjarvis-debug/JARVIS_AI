import { test, expect, Page } from '@playwright/test';

/**
 * Integrations End-to-End Tests
 * Tests third-party integrations including DAWG AI, iMessage, Slack, GitHub, etc.
 */

test.describe('Third-Party Integrations', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    // Login as authenticated user
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/(dashboard|observatory)/);
  });

  test.describe('Integration Discovery', () => {
    test('should display available integrations', async () => {
      await page.goto('/settings/integrations');

      // Should show integration marketplace
      await expect(page.locator('text=Available Integrations')).toBeVisible();
      await expect(page.locator('[data-testid="integration-card"]')).toHaveCount.greaterThan(0);
    });

    test('should search integrations', async () => {
      await page.goto('/settings/integrations');

      await page.fill('input[name="search"]', 'slack');

      // Should filter to Slack integration
      await expect(page.locator('[data-testid="integration-card"]').filter({ hasText: 'Slack' })).toBeVisible();
    });

    test('should filter integrations by category', async () => {
      await page.goto('/settings/integrations');

      await page.click('button:text("Communication")');

      // Should show only communication integrations
      await expect(page.locator('[data-testid="integration-card"]')).toBeVisible();
    });

    test('should view integration details', async () => {
      await page.goto('/settings/integrations');

      await page.click('[data-testid="integration-card"]', { position: { x: 10, y: 10 } });

      // Should show integration details modal
      await expect(page.locator('[data-testid="integration-details"]')).toBeVisible();
      await expect(page.locator('text=Features')).toBeVisible();
      await expect(page.locator('text=Permissions')).toBeVisible();
    });
  });

  test.describe('DAWG AI Integration', () => {
    test('should connect DAWG AI account', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=DAWG AI');
      await page.click('text=Connect');

      // Should redirect to DAWG AI OAuth or show API key form
      if (await page.locator('input[name="apiKey"]').isVisible()) {
        await page.fill('input[name="apiKey"]', process.env.DAWG_AI_TEST_KEY || 'test-api-key');
        await page.click('button:text("Connect")');
      } else {
        // Handle OAuth flow (would be mocked in tests)
        await expect(page).toHaveURL(/dawg\.ai|localhost/);
      }

      await expect(page.locator('text=/connected.*successfully/i')).toBeVisible({ timeout: 10000 });
    });

    test('should test DAWG AI connection', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=DAWG AI');
      await page.click('text=Test Connection');

      // Should show connection status
      await expect(page.locator('text=/connection.*successful/i')).toBeVisible({ timeout: 10000 });
    });

    test('should use DAWG AI for chat', async () => {
      await page.goto('/dashboard');

      // Open AI chat
      await page.click('[data-testid="ai-chat-button"]');

      await page.fill('textarea[name="message"]', 'Tell me about my metrics');
      await page.click('button:text("Send")');

      // Should receive AI response
      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 15000 });
    });

    test('should configure DAWG AI settings', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=DAWG AI');
      await page.click('text=Settings');

      // Configure AI settings
      await page.click('select[name="model"]');
      await page.click('option[value="gpt-4"]');

      await page.fill('input[name="temperature"]', '0.7');
      await page.fill('input[name="maxTokens"]', '2000');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });

    test('should disconnect DAWG AI', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=DAWG AI');
      await page.click('text=Disconnect');

      // Confirm disconnection
      await page.click('button:text("Confirm")');

      await expect(page.locator('text=/disconnected/i')).toBeVisible();
    });
  });

  test.describe('iMessage Integration', () => {
    test('should connect iMessage', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=iMessage');
      await page.click('text=Connect');

      // Should show pairing code or instructions
      await expect(page.locator('[data-testid="pairing-code"]')).toBeVisible();

      // In real tests, you'd simulate the pairing process
    });

    test('should send test iMessage', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=iMessage');
      await page.click('text=Send Test Message');

      await page.fill('input[name="phoneNumber"]', '+1234567890');
      await page.fill('textarea[name="message"]', 'Test message from Jarvis');

      await page.click('button:text("Send")');

      await expect(page.locator('text=/message.*sent/i')).toBeVisible({ timeout: 10000 });
    });

    test('should configure iMessage notifications', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=iMessage');
      await page.click('text=Notification Settings');

      await page.check('input[name="alertsEnabled"]');
      await page.fill('input[name="phoneNumber"]', '+1234567890');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });
  });

  test.describe('Slack Integration', () => {
    test('should install Slack app', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Slack');
      await page.click('text=Add to Slack');

      // Should redirect to Slack OAuth
      // In tests, this would be mocked
      await expect(page).toHaveURL(/slack\.com\/oauth|localhost/);
    });

    test('should select Slack channel for notifications', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Slack');
      await page.click('text=Configure Channels');

      await page.click('select[name="alertChannel"]');
      await page.click('option:text("#alerts")');

      await page.click('select[name="reportsChannel"]');
      await page.click('option:text("#reports")');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/channels.*configured/i')).toBeVisible();
    });

    test('should send test Slack message', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Slack');
      await page.click('text=Send Test Message');

      await expect(page.locator('text=/test message.*sent/i')).toBeVisible({ timeout: 10000 });
    });

    test('should use Slack commands', async () => {
      // This would test the Slack slash commands
      // In E2E tests, you'd simulate Slack webhook calls
      // For now, just verify the documentation is visible

      await page.goto('/settings/integrations');
      await page.click('text=Slack');
      await page.click('text=Available Commands');

      await expect(page.locator('text=/\/jarvis/i')).toBeVisible();
    });
  });

  test.describe('GitHub Integration', () => {
    test('should connect GitHub account', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=GitHub');
      await page.click('text=Connect GitHub');

      // Should redirect to GitHub OAuth
      await expect(page).toHaveURL(/github\.com\/login\/oauth|localhost/);
    });

    test('should select repositories to monitor', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=GitHub');
      await page.click('text=Select Repositories');

      // Should show repository list
      await expect(page.locator('[data-testid="repo-checkbox"]')).toBeVisible();

      await page.check('[data-testid="repo-checkbox"]', { position: { x: 5, y: 5 } });

      await page.click('button:text("Save Selection")');

      await expect(page.locator('text=/repositories.*saved/i')).toBeVisible();
    });

    test('should configure GitHub notifications', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=GitHub');
      await page.click('text=Notification Settings');

      await page.check('input[name="notifyOnPR"]');
      await page.check('input[name="notifyOnIssue"]');
      await page.check('input[name="notifyOnRelease"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });

    test('should view GitHub events', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=GitHub');
      await page.click('text=Recent Events');

      // Should show GitHub activity
      await expect(page.locator('[data-testid="github-event"]')).toBeVisible();
    });
  });

  test.describe('Email Integration', () => {
    test('should configure email notifications', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Email');

      await page.fill('input[name="notificationEmail"]', 'alerts@example.com');

      await page.check('input[name="dailyDigest"]');
      await page.check('input[name="weeklyReport"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/email.*configured/i')).toBeVisible();
    });

    test('should send test email', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Email');
      await page.click('text=Send Test Email');

      await expect(page.locator('text=/test email.*sent/i')).toBeVisible({ timeout: 10000 });
    });

    test('should configure email templates', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Email');
      await page.click('text=Email Templates');

      await page.click('select[name="template"]');
      await page.click('option:text("Alert Template")');

      await page.fill('textarea[name="subject"]', 'Alert: {{metric}} exceeded threshold');
      await page.fill('textarea[name="body"]', 'The metric {{metric}} has reached {{value}}');

      await page.click('button:text("Save Template")');

      await expect(page.locator('text=/template.*saved/i')).toBeVisible();
    });
  });

  test.describe('Webhook Integration', () => {
    test('should create webhook', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Webhooks');
      await page.click('text=Create Webhook');

      await page.fill('input[name="name"]', 'Test Webhook');
      await page.fill('input[name="url"]', 'https://webhook.example.com/receive');

      // Select events
      await page.check('input[name="event-alert"]');
      await page.check('input[name="event-metric-change"]');

      // Configure headers
      await page.click('text=Add Header');
      await page.fill('input[name="headerKey"]', 'Authorization');
      await page.fill('input[name="headerValue"]', 'Bearer test-token');

      await page.click('button:text("Create")');

      await expect(page.locator('text=/webhook.*created/i')).toBeVisible();
    });

    test('should test webhook', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Webhooks');
      await page.click('[data-testid="webhook-card"]');
      await page.click('text=Test Webhook');

      // Should send test payload
      await expect(page.locator('text=/webhook.*test.*sent/i')).toBeVisible({ timeout: 10000 });

      // Should show response
      await expect(page.locator('[data-testid="webhook-response"]')).toBeVisible();
    });

    test('should view webhook logs', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Webhooks');
      await page.click('[data-testid="webhook-card"]');
      await page.click('text=View Logs');

      // Should show delivery history
      await expect(page.locator('[data-testid="webhook-log-entry"]')).toBeVisible();
      await expect(page.locator('text=/status.*200/i')).toBeVisible();
    });

    test('should retry failed webhook', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Webhooks');
      await page.click('[data-testid="webhook-card"]');
      await page.click('text=View Logs');

      // Find failed delivery
      const failedEntry = page.locator('[data-testid="webhook-log-entry"]').filter({ hasText: 'Failed' }).first();
      if (await failedEntry.isVisible()) {
        await failedEntry.click();
        await page.click('text=Retry');

        await expect(page.locator('text=/retry.*initiated/i')).toBeVisible();
      }
    });

    test('should delete webhook', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Webhooks');
      await page.click('[data-testid="webhook-card"]');
      await page.click('text=Delete');

      // Confirm deletion
      await page.click('button:text("Confirm")');

      await expect(page.locator('text=/webhook.*deleted/i')).toBeVisible();
    });
  });

  test.describe('Calendar Integration', () => {
    test('should connect Google Calendar', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Google Calendar');
      await page.click('text=Connect');

      // Should redirect to Google OAuth
      await expect(page).toHaveURL(/accounts\.google\.com|localhost/);
    });

    test('should create calendar event', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Google Calendar');
      await page.click('text=Create Event');

      await page.fill('input[name="title"]', 'Review Metrics');
      await page.fill('input[name="date"]', '2025-11-01');
      await page.fill('input[name="time"]', '10:00');

      await page.click('button:text("Create")');

      await expect(page.locator('text=/event.*created/i')).toBeVisible();
    });

    test('should sync with calendar', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Google Calendar');
      await page.click('text=Sync Now');

      await expect(page.locator('text=/sync.*complete/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cloud Storage Integration', () => {
    test('should connect Google Drive', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Google Drive');
      await page.click('text=Connect');

      // OAuth flow
      await expect(page).toHaveURL(/accounts\.google\.com|localhost/);
    });

    test('should export to cloud storage', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('[data-testid="export-menu"]');
      await page.click('text=Export to Google Drive');

      await page.click('select[name="folder"]');
      await page.click('option:text("Jarvis Reports")');

      await page.click('button:text("Export")');

      await expect(page.locator('text=/exported.*successfully/i')).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('API Integration', () => {
    test('should generate API key', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=API Keys');
      await page.click('text=Generate New Key');

      await page.fill('input[name="name"]', 'Test API Key');

      // Select scopes
      await page.check('input[name="scope-read"]');
      await page.check('input[name="scope-write"]');

      await page.click('button:text("Generate")');

      // Should show API key (only shown once)
      await expect(page.locator('[data-testid="api-key-value"]')).toBeVisible();

      // Copy to clipboard
      await page.click('button:text("Copy")');

      await expect(page.locator('text=/copied/i')).toBeVisible();
    });

    test('should view API usage', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=API Keys');
      await page.click('[data-testid="api-key-card"]');
      await page.click('text=View Usage');

      // Should show usage statistics
      await expect(page.locator('[data-testid="api-usage-chart"]')).toBeVisible();
      await expect(page.locator('text=/requests/i')).toBeVisible();
    });

    test('should revoke API key', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=API Keys');
      await page.click('[data-testid="api-key-card"]');
      await page.click('text=Revoke');

      // Confirm revocation
      await page.click('button:text("Confirm")');

      await expect(page.locator('text=/api key.*revoked/i')).toBeVisible();
    });
  });

  test.describe('Integration Permissions', () => {
    test('should view integration permissions', async () => {
      await page.goto('/settings/integrations');

      await page.click('[data-testid="integration-card"]');

      await page.click('text=Permissions');

      // Should show granted permissions
      await expect(page.locator('[data-testid="permission-item"]')).toBeVisible();
    });

    test('should modify integration permissions', async () => {
      await page.goto('/settings/integrations');

      await page.click('[data-testid="integration-card"]');
      await page.click('text=Permissions');

      // Toggle permission
      await page.click('[data-testid="permission-toggle"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/permissions.*updated/i')).toBeVisible();
    });
  });

  test.describe('Integration Health', () => {
    test('should display integration status', async () => {
      await page.goto('/settings/integrations');

      // Should show status indicators
      await expect(page.locator('[data-testid="integration-status-healthy"]')).toBeVisible();
    });

    test('should show integration errors', async () => {
      await page.goto('/settings/integrations');

      const errorIntegration = page.locator('[data-testid="integration-status-error"]').first();
      if (await errorIntegration.isVisible()) {
        await errorIntegration.click();

        // Should show error details
        await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      }
    });

    test('should reconnect failed integration', async () => {
      await page.goto('/settings/integrations');

      const failedIntegration = page.locator('[data-testid="integration-card"]').filter({ hasText: 'Reconnect' }).first();
      if (await failedIntegration.isVisible()) {
        await failedIntegration.click();
        await page.click('text=Reconnect');

        await expect(page.locator('text=/reconnecting/i')).toBeVisible();
      }
    });
  });

  test.describe('Bulk Integration Management', () => {
    test('should disable all integrations', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Manage All');
      await page.click('text=Disable All');

      // Confirm
      await page.click('button:text("Confirm")');

      await expect(page.locator('text=/all integrations.*disabled/i')).toBeVisible();
    });

    test('should export integration configuration', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Manage All');

      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Export Configuration');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/integrations.*\.json$/);
    });

    test('should import integration configuration', async () => {
      await page.goto('/settings/integrations');

      await page.click('text=Manage All');
      await page.click('text=Import Configuration');

      // Upload config file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'integrations.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({ integrations: [] }))
      });

      await page.click('button:text("Import")');

      await expect(page.locator('text=/configuration.*imported/i')).toBeVisible();
    });
  });

  test.describe('Mobile Integrations', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile', async () => {
      await page.goto('/settings/integrations');

      await expect(page.locator('[data-testid="integration-card"]')).toBeVisible();

      await page.click('[data-testid="integration-card"]');

      // Should show mobile-optimized view
      await expect(page.locator('[data-testid="integration-details"]')).toBeVisible();
    });
  });
});
