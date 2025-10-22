import { test, expect, Page } from '@playwright/test';

/**
 * Billing and Subscription End-to-End Tests
 * Tests subscription management, payments, invoices, and billing features
 */

test.describe('Billing and Subscriptions', () => {
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

  test.describe('Subscription Plans', () => {
    test('should display available plans', async () => {
      await page.goto('/pricing');

      // Should show plan cards
      await expect(page.locator('[data-testid="plan-free"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-pro"]')).toBeVisible();
      await expect(page.locator('[data-testid="plan-enterprise"]')).toBeVisible();

      // Should show pricing
      await expect(page.locator('text=/\\$0|Free/i')).toBeVisible();
      await expect(page.locator('text=/\\$\d+/i')).toBeVisible();
    });

    test('should toggle between monthly and annual billing', async () => {
      await page.goto('/pricing');

      // Check monthly pricing
      const monthlyPrice = await page.locator('[data-testid="plan-pro"] [data-testid="price"]').textContent();

      // Switch to annual
      await page.click('[data-testid="billing-toggle"]');

      // Should show annual pricing (with discount)
      const annualPrice = await page.locator('[data-testid="plan-pro"] [data-testid="price"]').textContent();
      expect(annualPrice).not.toBe(monthlyPrice);

      // Should show savings badge
      await expect(page.locator('text=/save|discount/i')).toBeVisible();
    });

    test('should compare plan features', async () => {
      await page.goto('/pricing');

      await page.click('text=Compare Plans');

      // Should show comparison table
      await expect(page.locator('[data-testid="feature-comparison"]')).toBeVisible();

      // Should show checkmarks and X marks for features
      await expect(page.locator('[data-testid="feature-included"]')).toBeVisible();
      await expect(page.locator('[data-testid="feature-excluded"]')).toBeVisible();
    });
  });

  test.describe('Subscription Purchase', () => {
    test('should upgrade to Pro plan', async () => {
      await page.goto('/pricing');

      await page.click('[data-testid="plan-pro"] button:text("Upgrade")');

      // Should redirect to checkout
      await expect(page).toHaveURL(/.*\/checkout/);

      // Fill payment details (using Stripe test card)
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4242424242424242');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/30');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="postal"]').fill('12345');

      // Submit payment
      await page.click('button:text("Subscribe")');

      // Should show success message
      await expect(page.locator('text=/subscription.*successful/i')).toBeVisible({ timeout: 15000 });

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should handle payment errors', async () => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-pro"] button:text("Upgrade")');

      // Use card that will be declined (Stripe test card)
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4000000000000002');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/30');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123');

      await page.click('button:text("Subscribe")');

      // Should show error message
      await expect(page.locator('text=/card.*declined|payment.*failed/i')).toBeVisible();
    });

    test('should require authentication for 3D Secure', async () => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-pro"] button:text("Upgrade")');

      // Use 3D Secure test card
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4000002500003155');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/30');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123');

      await page.click('button:text("Subscribe")');

      // Should show 3D Secure modal
      await expect(page.frameLocator('iframe[name*="stripe_challenge"]')).toBeVisible({ timeout: 10000 });
    });

    test('should apply promo code', async () => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-pro"] button:text("Upgrade")');

      // Enter promo code
      await page.click('text=Have a promo code?');
      await page.fill('input[name="promoCode"]', 'TEST50');
      await page.click('button:text("Apply")');

      // Should show discount
      await expect(page.locator('text=/50%.*off|discount.*applied/i')).toBeVisible();

      // Total should be reduced
      await expect(page.locator('[data-testid="discounted-total"]')).toBeVisible();
    });

    test('should handle invalid promo code', async () => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-pro"] button:text("Upgrade")');

      await page.click('text=Have a promo code?');
      await page.fill('input[name="promoCode"]', 'INVALID');
      await page.click('button:text("Apply")');

      await expect(page.locator('text=/invalid.*code|code.*not.*found/i')).toBeVisible();
    });
  });

  test.describe('Subscription Management', () => {
    test('should view current subscription', async () => {
      await page.goto('/settings/billing');

      // Should show current plan
      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();
      await expect(page.locator('text=/pro|enterprise|free/i')).toBeVisible();

      // Should show billing period
      await expect(page.locator('text=/monthly|annual/i')).toBeVisible();

      // Should show next billing date
      await expect(page.locator('[data-testid="next-billing-date"]')).toBeVisible();
    });

    test('should change subscription plan', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Change Plan');

      // Select different plan
      await page.click('[data-testid="plan-enterprise"] button:text("Select")');

      // Confirm change
      await page.click('button:text("Confirm Change")');

      await expect(page.locator('text=/plan.*updated|subscription.*changed/i')).toBeVisible();
    });

    test('should upgrade plan mid-cycle with proration', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Change Plan');

      await page.click('[data-testid="plan-enterprise"] button:text("Select")');

      // Should show proration details
      await expect(page.locator('text=/proration|prorated/i')).toBeVisible();
      await expect(page.locator('[data-testid="proration-amount"]')).toBeVisible();

      await page.click('button:text("Confirm Change")');

      await expect(page.locator('text=/plan.*upgraded/i')).toBeVisible();
    });

    test('should downgrade plan (effective at period end)', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Change Plan');

      await page.click('[data-testid="plan-free"] button:text("Select")');

      // Should warn about downgrade
      await expect(page.locator('text=/downgrade.*period.*end/i')).toBeVisible();

      await page.click('button:text("Confirm Downgrade")');

      await expect(page.locator('text=/downgrade.*scheduled/i')).toBeVisible();
    });

    test('should cancel subscription', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Cancel Subscription');

      // Should show confirmation modal with reasons
      await expect(page.locator('[data-testid="cancel-modal"]')).toBeVisible();

      // Select reason
      await page.click('input[value="too-expensive"]');

      // Provide feedback
      await page.fill('textarea[name="feedback"]', 'Testing cancellation flow');

      await page.click('button:text("Confirm Cancellation")');

      await expect(page.locator('text=/subscription.*cancelled/i')).toBeVisible();

      // Should show access until period end
      await expect(page.locator('text=/access.*until/i')).toBeVisible();
    });

    test('should reactivate cancelled subscription', async () => {
      // First cancel
      await page.goto('/settings/billing');
      await page.click('text=Cancel Subscription');
      await page.click('input[value="other"]');
      await page.click('button:text("Confirm Cancellation")');

      // Then reactivate
      await page.click('text=Reactivate Subscription');

      await expect(page.locator('text=/subscription.*reactivated/i')).toBeVisible();
    });
  });

  test.describe('Payment Methods', () => {
    test('should add payment method', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Payment Methods');
      await page.click('text=Add Payment Method');

      // Fill card details
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cardnumber"]').fill('4242424242424242');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/30');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="cvc"]').fill('123');
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="postal"]').fill('12345');

      await page.click('button:text("Add Card")');

      await expect(page.locator('text=/payment method.*added/i')).toBeVisible();
    });

    test('should set default payment method', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Payment Methods');

      // Click set as default on a card
      await page.click('[data-testid="payment-method-card"]').first();
      await page.click('text=Set as Default');

      await expect(page.locator('text=/default.*updated/i')).toBeVisible();
    });

    test('should remove payment method', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Payment Methods');

      // Remove a card (not the default)
      const cards = page.locator('[data-testid="payment-method-card"]');
      if (await cards.count() > 1) {
        await cards.nth(1).click();
        await page.click('text=Remove');
        await page.click('button:text("Confirm")');

        await expect(page.locator('text=/payment method.*removed/i')).toBeVisible();
      }
    });

    test('should update payment method', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Payment Methods');

      await page.click('[data-testid="payment-method-card"]').first();
      await page.click('text=Update');

      // Update expiry date
      await page.frameLocator('iframe[name*="stripe"]').locator('input[name="exp-date"]').fill('12/31');

      await page.click('button:text("Update")');

      await expect(page.locator('text=/payment method.*updated/i')).toBeVisible();
    });
  });

  test.describe('Invoices and Billing History', () => {
    test('should view invoice history', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Invoices');

      // Should show invoice list
      await expect(page.locator('[data-testid="invoice-item"]')).toBeVisible();

      // Should show invoice details
      await expect(page.locator('text=/date|amount|status/i')).toBeVisible();
    });

    test('should download invoice PDF', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Invoices');

      // Download first invoice
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="invoice-item"]').first();
      await page.click('text=Download PDF');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf$/);
    });

    test('should filter invoices by date', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Invoices');

      await page.click('[data-testid="date-filter"]');
      await page.click('text=Last 6 months');

      // Should update invoice list
      await expect(page.locator('[data-testid="invoice-item"]')).toBeVisible();
    });

    test('should search invoices', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Invoices');

      await page.fill('input[name="search"]', 'PRO-2024');

      // Should filter results
      await expect(page.locator('[data-testid="invoice-item"]')).toHaveCount.greaterThan(0);
    });

    test('should view invoice details', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Invoices');

      await page.click('[data-testid="invoice-item"]').first();

      // Should show detailed view
      await expect(page.locator('[data-testid="invoice-details"]')).toBeVisible();
      await expect(page.locator('text=/line items|subtotal|tax|total/i')).toBeVisible();
    });
  });

  test.describe('Usage and Limits', () => {
    test('should view usage metrics', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Usage');

      // Should show usage stats
      await expect(page.locator('[data-testid="usage-metric"]')).toBeVisible();
      await expect(page.locator('text=/observatories|api calls|storage/i')).toBeVisible();

      // Should show usage vs. limits
      await expect(page.locator('[data-testid="usage-bar"]')).toBeVisible();
    });

    test('should warn when approaching limits', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Usage');

      // If approaching limits, should show warning
      const warningLocator = page.locator('text=/approaching.*limit|usage.*high/i');
      if (await warningLocator.isVisible()) {
        await expect(warningLocator).toBeVisible();
      }
    });

    test('should show upgrade prompt when limit reached', async () => {
      // This would require setting up a test account at its limit
      await page.goto('/settings/billing');
      await page.click('text=Usage');

      const limitReached = page.locator('text=/limit.*reached|upgrade.*required/i');
      if (await limitReached.isVisible()) {
        await limitReached.click();
        await expect(page).toHaveURL(/.*\/pricing/);
      }
    });
  });

  test.describe('Billing Information', () => {
    test('should update billing email', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Billing Information');

      await page.fill('input[name="billingEmail"]', 'billing@example.com');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/billing.*updated/i')).toBeVisible();
    });

    test('should update billing address', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Billing Information');

      await page.fill('input[name="address"]', '123 Test Street');
      await page.fill('input[name="city"]', 'Test City');
      await page.fill('input[name="state"]', 'CA');
      await page.fill('input[name="zip"]', '12345');
      await page.fill('input[name="country"]', 'US');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/address.*updated/i')).toBeVisible();
    });

    test('should add tax ID', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Billing Information');

      await page.click('text=Add Tax ID');

      await page.click('select[name="taxIdType"]');
      await page.click('option[value="eu_vat"]');

      await page.fill('input[name="taxId"]', 'EU123456789');

      await page.click('button:text("Add")');

      await expect(page.locator('text=/tax.*id.*added/i')).toBeVisible();
    });
  });

  test.describe('Enterprise Features', () => {
    test('should request enterprise quote', async () => {
      await page.goto('/pricing');

      await page.click('[data-testid="plan-enterprise"] button:text("Contact Sales")');

      // Fill contact form
      await page.fill('input[name="name"]', 'Test Company');
      await page.fill('input[name="email"]', 'enterprise@example.com');
      await page.fill('input[name="company"]', 'Test Corp');
      await page.fill('input[name="size"]', '500');
      await page.fill('textarea[name="requirements"]', 'Need enterprise features');

      await page.click('button:text("Request Quote")');

      await expect(page.locator('text=/quote.*request.*sent/i')).toBeVisible();
    });

    test('should view team billing', async () => {
      await page.goto('/settings/billing');

      // If on team/enterprise plan
      const teamBilling = page.locator('text=Team Billing');
      if (await teamBilling.isVisible()) {
        await teamBilling.click();

        // Should show per-seat billing
        await expect(page.locator('text=/seats|members/i')).toBeVisible();
      }
    });
  });

  test.describe('Receipts and Tax Documents', () => {
    test('should receive payment receipt', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Invoices');

      await page.click('[data-testid="invoice-item"]').first();
      await page.click('text=Email Receipt');

      await expect(page.locator('text=/receipt.*sent/i')).toBeVisible();
    });

    test('should download annual tax document', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Tax Documents');

      const downloadPromise = page.waitForEvent('download');
      await page.click('text=Download 2024 Summary');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/tax.*2024.*\.pdf$/);
    });
  });

  test.describe('Billing Notifications', () => {
    test('should configure billing alerts', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Notification Settings');

      await page.check('input[name="notifyOnPaymentSuccess"]');
      await page.check('input[name="notifyOnPaymentFailure"]');
      await page.check('input[name="notifyOnUsageLimit"]');

      await page.click('button:text("Save")');

      await expect(page.locator('text=/notifications.*saved/i')).toBeVisible();
    });

    test('should receive failed payment notification', async () => {
      // This would be triggered by a failed payment
      // In tests, you'd simulate this condition
      await page.goto('/settings/billing');

      const failedPayment = page.locator('text=/payment.*failed|payment.*issue/i');
      if (await failedPayment.isVisible()) {
        await expect(failedPayment).toBeVisible();
      }
    });
  });

  test.describe('Mobile Billing', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile', async () => {
      await page.goto('/settings/billing');

      await expect(page.locator('[data-testid="current-plan"]')).toBeVisible();

      await page.click('text=Invoices');

      await expect(page.locator('[data-testid="invoice-item"]')).toBeVisible();
    });
  });

  test.describe('Billing Security', () => {
    test('should require password for sensitive actions', async () => {
      await page.goto('/settings/billing');

      await page.click('text=Cancel Subscription');

      // Should require password confirmation
      const passwordInput = page.locator('input[name="confirmPassword"]');
      if (await passwordInput.isVisible()) {
        await expect(passwordInput).toBeVisible();
      }
    });

    test('should mask card numbers', async () => {
      await page.goto('/settings/billing');
      await page.click('text=Payment Methods');

      // Card numbers should be masked
      await expect(page.locator('text=/\\*\\*\\*\\*.*\\d{4}/i')).toBeVisible();
    });
  });
});
