/**
 * 2FA Validate API Route
 *
 * POST /api/auth/2fa/validate
 * Validates TOTP code or backup code during login
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  verifyTOTPCode,
  verifyBackupCode,
  isValidTOTPFormat,
  isValidBackupCodeFormat,
  rateLimiter,
} from '@/lib/auth/two-factor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated (but not 2FA verified yet)
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { code, isBackupCode = false } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    // Get user and their 2FA settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        twoFactorSecret: true,
        backupCodes: {
          where: { used_at: null }, // Only get unused backup codes
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.two_factor_enabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled for this user' },
        { status: 400 }
      );
    }

    // Check rate limiting
    if (rateLimiter.isLockedOut(user.id)) {
      const timeRemaining = rateLimiter.getLockoutTimeRemaining(user.id);
      const minutesRemaining = Math.ceil(timeRemaining / 60000);

      return NextResponse.json(
        {
          error: `Too many failed attempts. Account locked for ${minutesRemaining} more minute(s).`,
          lockedOut: true,
          timeRemaining,
        },
        { status: 429 }
      );
    }

    let isValid = false;

    // Validate backup code
    if (isBackupCode) {
      if (!isValidBackupCodeFormat(code)) {
        return NextResponse.json(
          { error: 'Invalid backup code format' },
          { status: 400 }
        );
      }

      // Check each unused backup code
      for (const backupCode of user.backupCodes) {
        const matches = await verifyBackupCode(code, backupCode.code_hash);
        if (matches) {
          isValid = true;

          // Mark backup code as used
          await prisma.backupCode.update({
            where: { id: backupCode.id },
            data: { used_at: new Date() },
          });

          // Log backup code usage
          await prisma.twoFactorLog.create({
            data: {
              userId: user.id,
              eventType: 'backup_used',
              success: true,
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
              metadata: { backupCodeId: backupCode.id },
            },
          });

          break;
        }
      }
    }
    // Validate TOTP code
    else {
      if (!isValidTOTPFormat(code)) {
        return NextResponse.json(
          { error: 'Invalid code format. Must be 6 digits.' },
          { status: 400 }
        );
      }

      isValid = verifyTOTPCode(code, user.twoFactorSecret.secret);
    }

    // Handle validation result
    if (!isValid) {
      // Record failed attempt
      const result = rateLimiter.recordFailedAttempt(user.id);

      // Log failed login
      await prisma.twoFactorLog.create({
        data: {
          userId: user.id,
          eventType: 'login_failure',
          success: false,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            isBackupCode,
            remainingAttempts: result.remainingAttempts,
          },
        },
      });

      if (result.isLockedOut) {
        return NextResponse.json(
          {
            error: 'Too many failed attempts. Account locked for 15 minutes.',
            lockedOut: true,
            lockedUntil: result.lockedUntil,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: 'Invalid verification code',
          remainingAttempts: result.remainingAttempts,
        },
        { status: 400 }
      );
    }

    // Clear rate limit attempts on success
    rateLimiter.clearAttempts(user.id);

    // Log successful login
    await prisma.twoFactorLog.create({
      data: {
        userId: user.id,
        eventType: 'login_success',
        success: true,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: { isBackupCode },
      },
    });

    // Count remaining unused backup codes
    const unusedBackupCodes = await prisma.backupCode.count({
      where: {
        userId: user.id,
        used_at: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA verification successful',
      unusedBackupCodes,
      warningLowBackupCodes: unusedBackupCodes <= 2,
    });
  } catch (error) {
    console.error('2FA validate error:', error);
    return NextResponse.json(
      { error: 'Failed to validate 2FA code' },
      { status: 500 }
    );
  }
}
