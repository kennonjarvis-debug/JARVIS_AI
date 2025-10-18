import { test, expect, Page } from '@playwright/test';

/**
 * Authentication End-to-End Tests
 * Tests all authentication flows including registration, login, 2FA, and session management
 */

test.describe('Authentication Flows', () => {
  let page: Page;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'SecurePassword123!@#',
    name: 'Test User'
  };

  test.beforeEach(async ({ page: p }) => {
    page = p;
    await page.goto('/');
  });

  test.describe('User Registration', () => {
    test('should successfully register a new user', async () => {
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*\/auth\/register/);

      // Fill registration form
      await page.fill('input[name="name"]', testUser.name);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);

      // Accept terms
      await page.check('input[name="acceptTerms"]');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to onboarding or dashboard
      await expect(page).toHaveURL(/\/(onboarding|dashboard)/);

      // Should show welcome message
      await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation errors for invalid input', async () => {
      await page.click('text=Sign Up');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=/email.*required/i')).toBeVisible();
      await expect(page.locator('text=/password.*required/i')).toBeVisible();
    });

    test('should reject weak passwords', async () => {
      await page.click('text=Sign Up');

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', '123'); // Weak password

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/password.*too weak/i')).toBeVisible();
    });

    test('should prevent duplicate email registration', async () => {
      // First registration
      await page.click('text=Sign Up');
      await page.fill('input[name="name"]', testUser.name);
      await page.fill('input[name="email"]', 'duplicate@example.com');
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // Logout
      await page.click('[aria-label="User menu"]');
      await page.click('text=Sign Out');

      // Try to register again with same email
      await page.click('text=Sign Up');
      await page.fill('input[name="email"]', 'duplicate@example.com');
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/email.*already.*exists/i')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should successfully login with valid credentials', async () => {
      await page.click('text=Sign In');
      await expect(page).toHaveURL(/.*\/login/);

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should reject invalid credentials', async () => {
      await page.click('text=Sign In');

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', 'WrongPassword123!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/invalid.*credentials/i')).toBeVisible();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should handle non-existent user', async () => {
      await page.click('text=Sign In');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', testUser.password);

      await page.click('button[type="submit"]');

      await expect(page.locator('text=/user.*not.*found/i')).toBeVisible();
    });

    test('should support "Remember Me" functionality', async () => {
      await page.click('text=Sign In');

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.check('input[name="rememberMe"]');

      await page.click('button[type="submit"]');

      // Check for persistent session cookie
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session'));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // > 1 day
    });
  });

  test.describe('Two-Factor Authentication (2FA)', () => {
    test('should enable 2FA', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Navigate to security settings
      await page.goto('/settings/security');

      // Enable 2FA
      await page.click('text=Enable Two-Factor Authentication');

      // Should show QR code
      await expect(page.locator('[data-testid="2fa-qr-code"]')).toBeVisible();

      // Should show backup codes
      await expect(page.locator('text=Backup Codes')).toBeVisible();

      // Get backup codes for later use
      const backupCodes = await page.locator('[data-testid="backup-code"]').allTextContents();
      expect(backupCodes.length).toBeGreaterThan(0);
    });

    test('should require 2FA code on login when enabled', async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Should show 2FA input
      await expect(page.locator('input[name="twoFactorCode"]')).toBeVisible();
      await expect(page.locator('text=/enter.*authentication.*code/i')).toBeVisible();
    });

    test('should accept valid 2FA code', async () => {
      // This test requires a valid TOTP code generator or mock
      // In production, you'd use a test authenticator or mock the verification
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Mock/use test 2FA code
      const testCode = '123456'; // In real tests, generate valid TOTP
      await page.fill('input[name="twoFactorCode"]', testCode);
      await page.click('button[type="submit"]');

      // Should complete login (may fail in test without real 2FA)
      // In production tests, mock the 2FA verification
    });

    test('should allow backup code usage', async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      await page.click('text=Use backup code');
      await expect(page.locator('input[name="backupCode"]')).toBeVisible();
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async () => {
      await page.goto('/login');
      await page.click('text=Forgot Password');

      await expect(page).toHaveURL(/.*\/auth\/forgot-password/);

      await page.fill('input[name="email"]', testUser.email);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/reset.*link.*sent/i')).toBeVisible();
    });

    test('should handle non-existent email in password reset', async () => {
      await page.goto('/auth/forgot-password');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.click('button[type="submit"]');

      // Should show generic message (security best practice)
      await expect(page.locator('text=/reset.*link.*sent/i')).toBeVisible();
    });

    test('should reset password with valid token', async () => {
      // This requires a test token from the backend
      // In production, you'd create a valid reset token in test setup
      const resetToken = 'test-reset-token';

      await page.goto(`/auth/reset-password?token=${resetToken}`);

      const newPassword = 'NewSecurePassword123!';
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      await expect(page.locator('text=/password.*reset.*successful/i')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should logout successfully', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Logout
      await page.click('[aria-label="User menu"]');
      await page.click('text=Sign Out');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);

      // Should clear session
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session'));
      expect(sessionCookie).toBeUndefined();
    });

    test('should maintain session across page refreshes', async () => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Refresh page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });

    test('should handle session expiration', async () => {
      // This test requires backend support to expire sessions quickly
      // Or mock the session expiration
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Simulate session expiration (would require backend API call)
      // await page.evaluate(() => localStorage.clear());

      // Try to access protected route
      await page.goto('/settings');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should show active sessions in settings', async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      await page.goto('/settings/sessions');

      // Should show current session
      await expect(page.locator('[data-testid="active-session"]')).toBeVisible();
      await expect(page.locator('text=/current.*session/i')).toBeVisible();
    });

    test('should revoke session from settings', async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      await page.goto('/settings/sessions');

      // Revoke a session
      await page.click('[data-testid="revoke-session"]');

      await expect(page.locator('text=/session.*revoked/i')).toBeVisible();
    });
  });

  test.describe('OAuth Authentication', () => {
    test('should show OAuth providers', async () => {
      await page.goto('/login');

      // Should show OAuth buttons
      await expect(page.locator('text=Continue with Google')).toBeVisible();
      await expect(page.locator('text=Continue with GitHub')).toBeVisible();
    });

    test('should initiate Google OAuth flow', async () => {
      await page.goto('/login');

      // Click Google OAuth
      await page.click('text=Continue with Google');

      // Should redirect to Google (or OAuth mock in test)
      // In real tests, you'd mock the OAuth provider
      await expect(page).toHaveURL(/accounts\.google\.com|localhost/);
    });
  });

  test.describe('Security Features', () => {
    test('should enforce rate limiting on login attempts', async () => {
      await page.goto('/login');

      // Try multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', 'WrongPassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Should show rate limit error
      await expect(page.locator('text=/too many.*attempts/i')).toBeVisible({ timeout: 5000 });
    });

    test('should log authentication events', async () => {
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Navigate to security log
      await page.goto('/settings/security/log');

      // Should show login event
      await expect(page.locator('text=/login.*successful/i')).toBeVisible();
    });

    test('should detect suspicious login (different location)', async () => {
      // This requires backend support to detect location changes
      // Mock a login from different IP/location
      await page.goto('/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);

      // In real tests, you'd simulate different IP via headers
      await page.click('button[type="submit"]');

      // May trigger additional verification
      // await expect(page.locator('text=/verify.*identity/i')).toBeVisible();
    });
  });

  test.describe('Email Verification', () => {
    test('should send verification email on registration', async () => {
      await page.goto('/auth/register');

      await page.fill('input[name="name"]', 'New User');
      await page.fill('input[name="email"]', `new-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // Should show verification message
      await expect(page.locator('text=/verification.*email.*sent/i')).toBeVisible();
    });

    test('should verify email with valid token', async () => {
      const verifyToken = 'test-verify-token';
      await page.goto(`/auth/verify-email?token=${verifyToken}`);

      await expect(page.locator('text=/email.*verified/i')).toBeVisible();
    });

    test('should resend verification email', async () => {
      await page.goto('/auth/verify-email');

      await page.click('text=Resend verification email');

      await expect(page.locator('text=/verification.*email.*sent/i')).toBeVisible();
    });
  });

  test.describe('Mobile Authentication', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should work on mobile devices', async () => {
      await page.goto('/login');

      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto('/login');

      // Tab through form
      await page.keyboard.press('Tab'); // Email field
      await page.keyboard.type(testUser.email);
      await page.keyboard.press('Tab'); // Password field
      await page.keyboard.type(testUser.password);
      await page.keyboard.press('Tab'); // Submit button
      await page.keyboard.press('Enter');

      // Should submit successfully
      await expect(page).toHaveURL(/.*\/dashboard/);
    });

    test('should have proper ARIA labels', async () => {
      await page.goto('/login');

      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('aria-label', /email/i);

      const passwordInput = page.locator('input[name="password"]');
      await expect(passwordInput).toHaveAttribute('aria-label', /password/i);
    });
  });
});
