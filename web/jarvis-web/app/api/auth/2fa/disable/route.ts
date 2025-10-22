/**
 * 2FA Disable API Route
 *
 * POST /api/auth/2fa/disable
 * Disables 2FA for the user (requires password confirmation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyTOTPCode, isValidTOTPFormat } from '@/lib/auth/two-factor';
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
        { error: 'Verification code is required to disable 2FA' },
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
      include: {
        twoFactorSecret: true,
        backupCodes: true,
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
          eventType: 'disable_failed',
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

    // Delete 2FA secret
    await prisma.twoFactorSecret.delete({
      where: { userId: user.id },
    });

    // Delete backup codes
    await prisma.backupCode.deleteMany({
      where: { userId: user.id },
    });

    // Disable 2FA for the user
    await prisma.user.update({
      where: { id: user.id },
      data: { two_factor_enabled: false },
    });

    // Log successful disable
    await prisma.twoFactorLog.create({
      data: {
        userId: user.id,
        eventType: 'disabled',
        success: true,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
