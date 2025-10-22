'use client';

/**
 * Two-Factor Authentication Prompt Page
 *
 * Displays during login when user has 2FA enabled
 */

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import TwoFactorPrompt from '@/components/TwoFactorPrompt';

export default function TwoFactorPromptPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  useEffect(() => {
    // Check if user is authenticated
    if (!session) {
      router.push('/login');
      return;
    }

    // Check if 2FA is already verified
    if (session.twoFactorVerified) {
      router.push(callbackUrl);
      return;
    }

    // Check if 2FA is not enabled (shouldn't be here)
    if (!session.twoFactorEnabled) {
      router.push(callbackUrl);
      return;
    }

    setLoading(false);
  }, [session, router, callbackUrl]);

  const handleVerify = async (code: string, isBackupCode: boolean) => {
    try {
      const response = await fetch('/api/auth/2fa/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, isBackupCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          message: data.error,
          remainingAttempts: data.remainingAttempts,
          lockedOut: data.lockedOut,
          timeRemaining: data.timeRemaining,
        };
      }

      // Update session to mark 2FA as verified
      await update({ twoFactorVerified: true });

      // Show warning if backup codes are low
      if (data.warningLowBackupCodes) {
        alert(
          `Warning: You have ${data.unusedBackupCodes} backup code(s) remaining. ` +
          'Consider regenerating backup codes in your security settings.'
        );
      }

      // Redirect to callback URL
      router.push(callbackUrl);
    } catch (error) {
      // Re-throw the error to let TwoFactorPrompt handle it
      throw error;
    }
  };

  const handleCancel = async () => {
    // Sign out and redirect to login
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <TwoFactorPrompt
      onVerify={handleVerify}
      onCancel={handleCancel}
      userEmail={session?.user?.email}
    />
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e0e0e0',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#666',
  },
};
