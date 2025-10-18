import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Create test user if needed
  if (process.env.CREATE_TEST_USER === 'true') {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
      // Register test user
      await page.goto(`${config.projects[0].use.baseURL}/auth/register`);

      await page.fill('input[name="name"]', 'E2E Test User');
      await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
      await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', process.env.TEST_USER_PASSWORD || 'TestPassword123!');
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      console.log('✅ Test user created successfully');
    } catch (error) {
      console.log('ℹ️  Test user may already exist or creation failed:', error);
    } finally {
      await browser.close();
    }
  }

  // Seed test data if needed
  if (process.env.SEED_TEST_DATA === 'true') {
    console.log('🌱 Seeding test data...');

    // Call API to seed data or run database migrations
    try {
      const response = await fetch(`${config.projects[0].use.baseURL}/api/test/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedType: 'e2e-tests'
        })
      });

      if (response.ok) {
        console.log('✅ Test data seeded successfully');
      } else {
        console.log('⚠️  Test data seeding failed:', await response.text());
      }
    } catch (error) {
      console.log('⚠️  Could not seed test data:', error);
    }
  }

  console.log('✨ Global setup complete');
}

export default globalSetup;
