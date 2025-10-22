/**
 * Two-Factor Authentication Settings Page
 *
 * Allows users to enable, disable, and manage their 2FA settings
 */

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const metadata = {
  title: 'Two-Factor Authentication - Jarvis AI',
  description: 'Manage your two-factor authentication settings',
};

export default async function TwoFactorPage() {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect('/login');
  }

  // Get user's 2FA status
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { two_factor_enabled: true },
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <header style={styles.header}>
          <h1 style={styles.heading}>Security Settings</h1>
          <p style={styles.subheading}>
            Manage your account security and two-factor authentication
          </p>
        </header>

        <div style={styles.card}>
          <TwoFactorSettings initialEnabled={user.two_factor_enabled} />
        </div>

        <div style={styles.infoSection}>
          <h2 style={styles.infoTitle}>About Two-Factor Authentication</h2>
          <div style={styles.infoContent}>
            <p style={styles.infoParagraph}>
              Two-factor authentication (2FA) adds an extra layer of security to
              your account. In addition to your password, you'll need to enter a
              6-digit code from your authenticator app when signing in.
            </p>

            <h3 style={styles.infoSubtitle}>Supported Authenticator Apps:</h3>
            <ul style={styles.infoList}>
              <li>Google Authenticator (iOS, Android)</li>
              <li>Microsoft Authenticator (iOS, Android)</li>
              <li>Authy (iOS, Android, Desktop)</li>
              <li>1Password (iOS, Android, Desktop)</li>
              <li>Any TOTP-compatible authenticator app</li>
            </ul>

            <h3 style={styles.infoSubtitle}>Important Security Notes:</h3>
            <ul style={styles.infoList}>
              <li>
                Save your backup codes in a secure location immediately after
                enabling 2FA
              </li>
              <li>
                Each backup code can only be used once - regenerate them if you
                run low
              </li>
              <li>
                If you lose access to both your authenticator app and backup
                codes, contact support
              </li>
              <li>
                Do not share your QR code or secret key with anyone
              </li>
              <li>
                Consider using a password manager to store your backup codes
              </li>
            </ul>

            <h3 style={styles.infoSubtitle}>What happens when 2FA is enabled:</h3>
            <ul style={styles.infoList}>
              <li>You'll need your authenticator app every time you sign in</li>
              <li>Your account will be protected even if your password is compromised</li>
              <li>You can use backup codes if you don't have access to your authenticator</li>
              <li>You can disable 2FA at any time using your authenticator code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '40px 20px',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '30px',
  },
  heading: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  subheading: {
    fontSize: '16px',
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  infoContent: {
    color: '#555',
  },
  infoParagraph: {
    fontSize: '15px',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  infoSubtitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginTop: '24px',
    marginBottom: '12px',
  },
  infoList: {
    fontSize: '15px',
    lineHeight: '1.8',
    marginLeft: '20px',
    marginBottom: '16px',
  },
};
