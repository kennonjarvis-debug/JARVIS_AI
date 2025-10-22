import { test, expect, Page } from '@playwright/test';

/**
 * Observatory End-to-End Tests
 * Tests all observatory features including creation, monitoring, automation, and alerts
 */

test.describe('Observatory Features', () => {
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

  test.describe('Observatory Creation', () => {
    test('should create new observatory', async () => {
      await page.goto('/observatory');
      await page.click('text=Create Observatory');

      // Fill observatory details
      const observatoryName = `Test Observatory ${Date.now()}`;
      await page.fill('input[name="name"]', observatoryName);
      await page.fill('textarea[name="description"]', 'Test observatory for automated testing');

      // Select observatory type
      await page.click('select[name="type"]');
      await page.click('option[value="personal"]');

      // Set monitoring preferences
      await page.check('input[name="enableAlerts"]');
      await page.check('input[name="enableAutomation"]');

      // Submit
      await page.click('button[type="submit"]');

      // Should redirect to observatory dashboard
      await expect(page).toHaveURL(/.*\/observatory\/[a-z0-9-]+/);
      await expect(page.locator(`text=${observatoryName}`)).toBeVisible();
    });

    test('should validate required fields', async () => {
      await page.goto('/observatory/new');

      // Try to submit without filling required fields
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/name.*required/i')).toBeVisible();
    });

    test('should create observatory with custom settings', async () => {
      await page.goto('/observatory/new');

      await page.fill('input[name="name"]', 'Advanced Observatory');

      // Advanced settings
      await page.click('text=Advanced Settings');
      await page.fill('input[name="refreshInterval"]', '300'); // 5 minutes
      await page.fill('input[name="retentionDays"]', '90');
      await page.check('input[name="enableMLInsights"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/observatory.*created/i')).toBeVisible();
    });
  });

  test.describe('Observatory Dashboard', () => {
    test('should display observatory overview', async () => {
      await page.goto('/observatory');

      // Should show list of observatories
      await expect(page.locator('[data-testid="observatory-card"]')).toHaveCount.greaterThan(0);

      // Click on first observatory
      await page.click('[data-testid="observatory-card"]', { position: { x: 10, y: 10 } });

      // Should show observatory dashboard
      await expect(page.locator('text=Overview')).toBeVisible();
      await expect(page.locator('[data-testid="metric-card"]')).toBeVisible();
    });

    test('should display real-time metrics', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Should show real-time data
      await expect(page.locator('[data-testid="real-time-indicator"]')).toBeVisible();

      // Metrics should update
      const initialValue = await page.locator('[data-testid="metric-value"]').first().textContent();

      // Wait for potential update
      await page.waitForTimeout(5000);

      const newValue = await page.locator('[data-testid="metric-value"]').first().textContent();
      // In production, values may change
    });

    test('should filter metrics by time range', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Change time range
      await page.click('[data-testid="time-range-selector"]');
      await page.click('text=Last 7 days');

      // Chart should update
      await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();

      // Should show date range in UI
      await expect(page.locator('text=/7 days/i')).toBeVisible();
    });

    test('should show activity timeline', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Activity');

      // Should show activity items
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0);

      // Should show timestamps
      await expect(page.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    });
  });

  test.describe('Data Sources', () => {
    test('should add data source', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Data Sources');
      await page.click('text=Add Data Source');

      // Select data source type
      await page.click('[data-testid="datasource-type-api"]');

      // Configure data source
      await page.fill('input[name="name"]', 'Test API Source');
      await page.fill('input[name="url"]', 'https://api.example.com/data');
      await page.fill('input[name="apiKey"]', 'test-api-key');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/data source.*added/i')).toBeVisible();
    });

    test('should test data source connection', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Data Sources');

      await page.click('[data-testid="test-connection"]');

      // Should show connection status
      await expect(page.locator('text=/connection.*successful/i')).toBeVisible({ timeout: 10000 });
    });

    test('should configure data source polling', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Data Sources');

      await page.click('[data-testid="datasource-settings"]');

      // Configure polling
      await page.fill('input[name="pollingInterval"]', '60'); // 1 minute
      await page.check('input[name="enableAutoRetry"]');
      await page.fill('input[name="maxRetries"]', '3');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });

    test('should remove data source', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Data Sources');

      // Click remove on a data source
      await page.click('[data-testid="remove-datasource"]');

      // Confirm removal
      await page.click('text=Confirm');

      await expect(page.locator('text=/data source.*removed/i')).toBeVisible();
    });
  });

  test.describe('Alerts and Notifications', () => {
    test('should create alert rule', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Alerts');
      await page.click('text=Create Alert');

      // Configure alert
      await page.fill('input[name="name"]', 'High CPU Alert');
      await page.click('select[name="metric"]');
      await page.click('option[value="cpu_usage"]');

      await page.click('select[name="condition"]');
      await page.click('option[value="greater_than"]');

      await page.fill('input[name="threshold"]', '80');

      // Notification settings
      await page.check('input[name="notifyEmail"]');
      await page.check('input[name="notifySlack"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/alert.*created/i')).toBeVisible();
    });

    test('should show active alerts', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Alerts');

      // Should show alert list
      await expect(page.locator('[data-testid="alert-rule"]')).toBeVisible();

      // Should show alert status
      await expect(page.locator('[data-testid="alert-status"]')).toBeVisible();
    });

    test('should acknowledge alert', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Alerts');

      // Find active alert
      const activeAlert = page.locator('[data-testid="alert-active"]').first();
      if (await activeAlert.isVisible()) {
        await activeAlert.click();
        await page.click('text=Acknowledge');

        await expect(page.locator('text=/alert.*acknowledged/i')).toBeVisible();
      }
    });

    test('should configure alert channels', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Settings');
      await page.click('text=Notifications');

      // Add Slack channel
      await page.click('text=Add Channel');
      await page.click('[data-testid="channel-type-slack"]');
      await page.fill('input[name="webhookUrl"]', 'https://hooks.slack.com/test');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/channel.*added/i')).toBeVisible();
    });
  });

  test.describe('Automation and Workflows', () => {
    test('should create automation workflow', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Automation');
      await page.click('text=Create Workflow');

      // Name workflow
      await page.fill('input[name="name"]', 'Auto-scale on high load');

      // Configure trigger
      await page.click('text=Add Trigger');
      await page.click('[data-testid="trigger-metric-threshold"]');
      await page.fill('input[name="triggerThreshold"]', '90');

      // Configure action
      await page.click('text=Add Action');
      await page.click('[data-testid="action-webhook"]');
      await page.fill('input[name="webhookUrl"]', 'https://api.example.com/scale');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/workflow.*created/i')).toBeVisible();
    });

    test('should test automation workflow', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Automation');

      // Find a workflow
      await page.click('[data-testid="workflow-card"]');

      // Test workflow
      await page.click('text=Test Workflow');

      await expect(page.locator('text=/workflow.*test.*completed/i')).toBeVisible({ timeout: 10000 });
    });

    test('should view workflow execution history', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Automation');

      await page.click('[data-testid="workflow-card"]');
      await page.click('text=Execution History');

      // Should show execution logs
      await expect(page.locator('[data-testid="execution-log"]')).toBeVisible();
    });

    test('should disable/enable workflow', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');
      await page.click('text=Automation');

      // Toggle workflow
      await page.click('[data-testid="workflow-toggle"]');

      await expect(page.locator('text=/workflow.*(disabled|enabled)/i')).toBeVisible();
    });
  });

  test.describe('Visualizations and Charts', () => {
    test('should display charts', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Should show various chart types
      await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="bar-chart"]')).toBeVisible();
    });

    test('should customize chart view', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('[data-testid="chart-settings"]');

      // Change chart type
      await page.click('select[name="chartType"]');
      await page.click('option[value="area"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('[data-testid="area-chart"]')).toBeVisible();
    });

    test('should export chart data', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Start download
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-data"]');
      await page.click('text=Export as CSV');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });

    test('should create custom dashboard', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Dashboards');
      await page.click('text=Create Dashboard');

      await page.fill('input[name="name"]', 'Custom Dashboard');

      // Add widgets
      await page.click('text=Add Widget');
      await page.click('[data-testid="widget-type-metric"]');
      await page.click('select[name="metric"]');
      await page.click('option[value="response_time"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/dashboard.*created/i')).toBeVisible();
    });
  });

  test.describe('Data Analysis', () => {
    test('should show analytics insights', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Insights');

      // Should show AI-generated insights
      await expect(page.locator('[data-testid="insight-card"]')).toBeVisible();
      await expect(page.locator('text=/trend/i')).toBeVisible();
    });

    test('should detect anomalies', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Anomalies');

      // Should show detected anomalies
      await expect(page.locator('[data-testid="anomaly-list"]')).toBeVisible();
    });

    test('should generate reports', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Reports');
      await page.click('text=Generate Report');

      // Configure report
      await page.click('select[name="reportType"]');
      await page.click('option[value="weekly"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/report.*generated/i')).toBeVisible({ timeout: 15000 });
    });

    test('should schedule reports', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Reports');
      await page.click('text=Schedule Report');

      await page.click('select[name="frequency"]');
      await page.click('option[value="weekly"]');

      await page.fill('input[name="recipients"]', 'test@example.com');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/report.*scheduled/i')).toBeVisible();
    });
  });

  test.describe('Collaboration', () => {
    test('should share observatory', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Share');

      await page.fill('input[name="email"]', 'colleague@example.com');
      await page.click('select[name="role"]');
      await page.click('option[value="viewer"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invitation.*sent/i')).toBeVisible();
    });

    test('should manage team members', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Team');

      // Should show team members
      await expect(page.locator('[data-testid="team-member"]')).toBeVisible();

      // Change role
      await page.click('[data-testid="change-role"]');
      await page.click('option[value="editor"]');

      await expect(page.locator('text=/role.*updated/i')).toBeVisible();
    });

    test('should add comments', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Add comment on a metric
      await page.click('[data-testid="add-comment"]');
      await page.fill('textarea[name="comment"]', 'This spike needs investigation');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=This spike needs investigation')).toBeVisible();
    });
  });

  test.describe('Settings and Configuration', () => {
    test('should update observatory settings', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Settings');

      await page.fill('input[name="name"]', 'Updated Observatory Name');
      await page.fill('textarea[name="description"]', 'Updated description');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/settings.*saved/i')).toBeVisible();
    });

    test('should configure retention policy', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      await page.click('text=Settings');
      await page.click('text=Data Retention');

      await page.fill('input[name="retentionDays"]', '180');
      await page.check('input[name="autoArchive"]');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/retention.*updated/i')).toBeVisible();
    });

    test('should delete observatory', async () => {
      // Create test observatory first
      await page.goto('/observatory/new');
      await page.fill('input[name="name"]', 'To Delete Observatory');
      await page.click('button[type="submit"]');

      await page.click('text=Settings');
      await page.click('text=Delete Observatory');

      // Confirm deletion
      await page.fill('input[name="confirmName"]', 'To Delete Observatory');
      await page.click('button:text("Delete Permanently")');

      await expect(page).toHaveURL(/.*\/observatory$/);
      await expect(page.locator('text=/observatory.*deleted/i')).toBeVisible();
    });
  });

  test.describe('Mobile Observatory', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile', async () => {
      await page.goto('/observatory');

      await expect(page.locator('[data-testid="observatory-card"]')).toBeVisible();

      await page.click('[data-testid="observatory-card"]');

      // Should show mobile-optimized dashboard
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    });

    test('should show mobile-friendly charts', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Charts should be responsive
      await expect(page.locator('[data-testid="chart-container"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load observatory quickly', async () => {
      const startTime = Date.now();

      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets', async () => {
      await page.goto('/observatory');
      await page.click('[data-testid="observatory-card"]');

      // Change to large time range
      await page.click('[data-testid="time-range-selector"]');
      await page.click('text=Last 90 days');

      // Should still render
      await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible({ timeout: 10000 });
    });
  });
});
