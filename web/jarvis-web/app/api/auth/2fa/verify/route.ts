/**
 * 2FA Verify API Route
 *
 * POST /api/auth/2fa/verify
 * Verifies the TOTP code and enables 2FA, generates backup codes
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
        { error: 'Verification code is required' },
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

    // Get user and their temporary secret
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

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'No 2FA setup in progress. Call /enable first.' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(code, user.twoFactorSecret.secret);

    if (!isValid) {
      // Log failed verification
      await prisma.twoFactorLog.create({
        data: {
          userId: user.id,
          eventType: 'setup_verification_failed',
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

    // Generate backup codes
    const backupCodesData = await generateBackupCodes();

    // Store backup codes in database
    await prisma.backupCode.createMany({
      data: backupCodesData.map((bc) => ({
        userId: user.id,
        code_hash: bc.hash,
      })),
    });

    // Enable 2FA for the user
    await prisma.user.update({
      where: { id: user.id },
      data: { two_factor_enabled: true },
    });

    // Log successful setup
    await prisma.twoFactorLog.create({
      data: {
        userId: user.id,
        eventType: 'enabled',
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
      message: '2FA enabled successfully. Save these backup codes in a secure location.',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA code' },
      { status: 500 }
    );
  }
}
