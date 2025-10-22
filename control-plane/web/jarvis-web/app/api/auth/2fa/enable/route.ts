/**
 * 2FA Enable API Route
 *
 * POST /api/auth/2fa/enable
 * Generates a new TOTP secret and QR code for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateTOTPSecret } from '@/lib/auth/two-factor';
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

    // Get user from database
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

    // Check if 2FA is already enabled
    if (user.two_factor_enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to reset.' },
        { status: 400 }
      );
    }

    // Generate new TOTP secret
    const { secret, qrCode, manualEntryKey } = await generateTOTPSecret(
      session.user.email
    );

    // Store the secret temporarily (not enabling 2FA yet - waiting for verification)
    if (user.twoFactorSecret) {
      // Update existing secret
      await prisma.twoFactorSecret.update({
        where: { userId: user.id },
        data: { secret },
      });
    } else {
      // Create new secret
      await prisma.twoFactorSecret.create({
        data: {
          userId: user.id,
          secret,
        },
      });
    }

    // Log the event
    await prisma.twoFactorLog.create({
      data: {
        userId: user.id,
        eventType: 'setup_initiated',
        success: true,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      qrCode,
      manualEntryKey,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: 'Failed to generate 2FA secret' },
      { status: 500 }
    );
  }
}
