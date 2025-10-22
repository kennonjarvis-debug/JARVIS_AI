/**
 * Two-Factor Authentication Service
 *
 * This module provides TOTP-based 2FA functionality using industry standards:
 * - RFC 6238 (TOTP: Time-Based One-Time Password Algorithm)
 * - 30-second time window
 * - 6-digit codes
 * - SHA-256 algorithm
 * - Compatible with Google Authenticator, Authy, 1Password
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const APP_NAME = 'Jarvis AI';
const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 12;

export interface TwoFactorSecret {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

export interface BackupCode {
  code: string;
  hash: string;
}

/**
 * Generate a new TOTP secret for a user
 * @param userEmail - User's email address for QR code label
 * @returns Object containing secret, QR code data URL, and manual entry key
 */
export async function generateTOTPSecret(userEmail: string): Promise<TwoFactorSecret> {
  // Generate secret using speakeasy
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    issuer: APP_NAME,
    length: 32,
  });

  if (!secret.otpauth_url) {
    throw new Error('Failed to generate OTP auth URL');
  }

  // Generate QR code as data URL
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode,
    manualEntryKey: secret.base32,
  };
}

/**
 * Verify a TOTP code against a secret
 * @param token - 6-digit code from user's authenticator app
 * @param secret - User's TOTP secret (base32 encoded)
 * @returns True if code is valid
 */
export function verifyTOTPCode(token: string, secret: string): boolean {
  // Remove any whitespace from the token
  const cleanToken = token.replace(/\s/g, '');

  // Verify the token with a window of ±1 (allows for slight time drift)
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: cleanToken,
    window: 1, // Allow 30 seconds before/after
    algorithm: 'sha256',
  });

  return verified;
}

/**
 * Generate backup codes for account recovery
 * @returns Array of backup code objects with plaintext codes and hashes
 */
export async function generateBackupCodes(): Promise<BackupCode[]> {
  const codes: BackupCode[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate a random backup code (8 characters, alphanumeric)
    const code = randomBytes(BACKUP_CODE_LENGTH)
      .toString('hex')
      .slice(0, BACKUP_CODE_LENGTH)
      .toUpperCase();

    // Hash the code for secure storage
    const hash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    codes.push({ code, hash });
  }

  return codes;
}

/**
 * Verify a backup code against its hash
 * @param code - Backup code entered by user
 * @param hash - Stored bcrypt hash of the backup code
 * @returns True if code matches the hash
 */
export async function verifyBackupCode(code: string, hash: string): Promise<boolean> {
  const cleanCode = code.replace(/\s/g, '').toUpperCase();
  return bcrypt.compare(cleanCode, hash);
}

/**
 * Format backup codes for display (adds hyphen in middle)
 * @param code - Raw backup code
 * @returns Formatted code (e.g., "ABCD-EFGH")
 */
export function formatBackupCode(code: string): string {
  const mid = Math.floor(code.length / 2);
  return `${code.slice(0, mid)}-${code.slice(mid)}`;
}

/**
 * Rate limiting for 2FA attempts
 * Track failed attempts per user to prevent brute force attacks
 */
export class TwoFactorRateLimiter {
  private attempts: Map<string, { count: number; lockedUntil?: Date }> = new Map();
  private readonly maxAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes in milliseconds

  /**
   * Check if a user is currently locked out
   * @param userId - User's unique identifier
   * @returns True if user is locked out
   */
  isLockedOut(userId: string): boolean {
    const record = this.attempts.get(userId);

    if (!record || !record.lockedUntil) {
      return false;
    }

    // Check if lockout has expired
    if (new Date() >= record.lockedUntil) {
      this.attempts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Record a failed 2FA attempt
   * @param userId - User's unique identifier
   * @returns Object with lockout status and remaining attempts
   */
  recordFailedAttempt(userId: string): {
    isLockedOut: boolean;
    remainingAttempts: number;
    lockedUntil?: Date;
  } {
    const record = this.attempts.get(userId) || { count: 0 };
    record.count += 1;

    // Lock out after max attempts
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = new Date(Date.now() + this.lockoutDuration);
      this.attempts.set(userId, record);

      return {
        isLockedOut: true,
        remainingAttempts: 0,
        lockedUntil: record.lockedUntil,
      };
    }

    this.attempts.set(userId, record);

    return {
      isLockedOut: false,
      remainingAttempts: this.maxAttempts - record.count,
    };
  }

  /**
   * Clear failed attempts for a user (after successful login)
   * @param userId - User's unique identifier
   */
  clearAttempts(userId: string): void {
    this.attempts.delete(userId);
  }

  /**
   * Get time remaining in lockout
   * @param userId - User's unique identifier
   * @returns Milliseconds until lockout expires, or 0 if not locked
   */
  getLockoutTimeRemaining(userId: string): number {
    const record = this.attempts.get(userId);

    if (!record || !record.lockedUntil) {
      return 0;
    }

    const remaining = record.lockedUntil.getTime() - Date.now();
    return Math.max(0, remaining);
  }
}

// Export singleton instance for rate limiting
export const rateLimiter = new TwoFactorRateLimiter();

/**
 * Validate TOTP token format
 * @param token - Token to validate
 * @returns True if token is in valid format
 */
export function isValidTOTPFormat(token: string): boolean {
  const cleanToken = token.replace(/\s/g, '');
  return /^\d{6}$/.test(cleanToken);
}

/**
 * Validate backup code format
 * @param code - Code to validate
 * @returns True if code is in valid format
 */
export function isValidBackupCodeFormat(code: string): boolean {
  const cleanCode = code.replace(/[\s-]/g, '');
  return /^[A-Za-z0-9]{8}$/.test(cleanCode);
}
