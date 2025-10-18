import { FullConfig } from '@playwright/test';

/**
 * Global teardown for Playwright tests
 * Runs once after all tests complete
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Cleanup test data if needed
  if (process.env.CLEANUP_TEST_DATA === 'true') {
    console.log('🗑️  Cleaning up test data...');

    try {
      const response = await fetch(`${config.projects[0].use.baseURL}/api/test/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cleanupType: 'e2e-tests'
        })
      });

      if (response.ok) {
        console.log('✅ Test data cleaned up successfully');
      } else {
        console.log('⚠️  Test data cleanup failed:', await response.text());
      }
    } catch (error) {
      console.log('⚠️  Could not cleanup test data:', error);
    }
  }

  // Generate test summary
  console.log('\n📊 Test Execution Summary:');
  console.log(`   Base URL: ${config.projects[0].use.baseURL}`);
  console.log(`   Projects: ${config.projects.length}`);
  console.log(`   Workers: ${config.workers || 'auto'}`);

  console.log('✨ Global teardown complete\n');
}

export default globalTeardown;
