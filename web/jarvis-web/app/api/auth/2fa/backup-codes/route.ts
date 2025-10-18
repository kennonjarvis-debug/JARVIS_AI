/**
 * 2FA Backup Codes API Route
 *
 * POST /api/auth/2fa/backup-codes
 * Regenerates backup codes (requires current 2FA verification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  verifyTOTPCode,
  generateBackupCodes,
  formatBackupCode,
  isValidTOTPFormat,
} from '@/lib/auth/two-factor';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required to regenerate backup codes' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!isValidTOTPFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Get user and their 2FA settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { twoFactorSecret: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.two_factor_enabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(code, user.twoFactorSecret.secret);

    if (!isValid) {
      // Log failed attempt
      await prisma.twoFactorLog.create({
        data: {
          userId: user.id,
          eventType: 'backup_codes_regenerate_failed',
          success: false,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Delete old backup codes
    await prisma.backupCode.deleteMany({
      where: { userId: user.id },
    });

    // Generate new backup codes
    const backupCodesData = await generateBackupCodes();

    // Store new backup codes in database
    await prisma.backupCode.createMany({
      data: backupCodesData.map((bc) => ({
        userId: user.id,
        code_hash: bc.hash,
      })),
    });

    // Log successful regeneration
    await prisma.twoFactorLog.create({
      data: {
        userId: user.id,
        eventType: 'backup_codes_regenerated',
        success: true,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Return backup codes (formatted for display)
    const formattedBackupCodes = backupCodesData.map((bc) =>
      formatBackupCode(bc.code)
    );

    return NextResponse.json({
      success: true,
      backupCodes: formattedBackupCodes,
      message: 'New backup codes generated. Save these in a secure location. Old codes are now invalid.',
    });
  } catch (error) {
    console.error('2FA backup codes regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
