'use client';

/**
 * TwoFactorSetup Component
 *
 * Multi-step wizard for setting up 2FA:
 * 1. Display QR code for authenticator app
 * 2. Verify TOTP code
 * 3. Show backup codes
 */

import { useState } from 'react';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function TwoFactorSetup({
  onComplete,
  onCancel,
}: TwoFactorSetupProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qrCode, setQrCode] = useState<string>('');
  const [manualEntryKey, setManualEntryKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Step 1: Generate QR code
  const handleStartSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrCode(data.qrCode);
      setManualEntryKey(data.manualEntryKey);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify TOTP code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setBackupCodes(data.backupCodes);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Confirm backup codes saved
  const handleComplete = () => {
    onComplete();
  };

  // Download backup codes as text file
  const downloadBackupCodes = () => {
    const content = `Jarvis AI - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator app, you can use
one of these codes to sign in and disable 2FA.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-ai-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Print backup codes
  const printBackupCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Jarvis AI - Backup Codes</title>
          <style>
            body { font-family: monospace; padding: 40px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            .date { color: #666; margin-bottom: 20px; }
            .warning { background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 4px; }
            ul { list-style: none; padding: 0; }
            li { padding: 5px 0; font-size: 16px; }
          </style>
        </head>
        <body>
          <h1>Jarvis AI - Two-Factor Authentication Backup Codes</h1>
          <div class="date">Generated: ${new Date().toLocaleString()}</div>
          <div class="warning">
            <strong>IMPORTANT:</strong> Save these codes in a secure location.
            Each code can only be used once.
          </div>
          <ul>
            ${backupCodes.map((code, i) => `<li>${i + 1}. ${code}</li>`).join('')}
          </ul>
          <p style="margin-top: 30px; color: #666;">
            If you lose access to your authenticator app, you can use one of these codes
            to sign in and disable 2FA.
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Step 1: Introduction */}
        {step === 1 && (
          <div style={styles.content}>
            <h2 style={styles.title}>Enable Two-Factor Authentication</h2>
            <p style={styles.description}>
              Add an extra layer of security to your account. You'll need an
              authenticator app like:
            </p>
            <ul style={styles.appList}>
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
              <li>1Password</li>
            </ul>
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.buttonGroup}>
              <button
                onClick={handleStartSetup}
                disabled={loading}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                {loading ? 'Generating...' : 'Get Started'}
              </button>
              <button onClick={onCancel} style={styles.button}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Scan QR Code */}
        {step === 2 && (
          <div style={styles.content}>
            <h2 style={styles.title}>Scan QR Code</h2>
            <p style={styles.description}>
              Scan this QR code with your authenticator app:
            </p>
            <div style={styles.qrContainer}>
              {qrCode && (
                <img src={qrCode} alt="QR Code" style={styles.qrCode} />
              )}
            </div>
            <div style={styles.manualEntry}>
              <p style={styles.manualLabel}>Can't scan? Enter manually:</p>
              <code style={styles.code}>{manualEntryKey}</code>
            </div>
            <form onSubmit={handleVerifyCode}>
              <label style={styles.label}>
                Enter the 6-digit code from your app:
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(e.target.value.replace(/\D/g, ''))
                }
                maxLength={6}
                pattern="\d{6}"
                required
                autoFocus
                style={styles.input}
                placeholder="000000"
              />
              {error && <div style={styles.error}>{error}</div>}
              <div style={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  style={{ ...styles.button, ...styles.primaryButton }}
                >
                  {loading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  style={styles.button}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Backup Codes */}
        {step === 3 && (
          <div style={styles.content}>
            <h2 style={styles.title}>Save Your Backup Codes</h2>
            <div style={styles.warning}>
              <strong>IMPORTANT:</strong> Save these backup codes in a secure
              location. Each code can only be used once. If you lose access to
              your authenticator app, you'll need these codes to sign in.
            </div>
            <div style={styles.backupCodesContainer}>
              {backupCodes.map((code, index) => (
                <div key={index} style={styles.backupCode}>
                  <span style={styles.backupCodeNumber}>{index + 1}.</span>
                  <code style={styles.backupCodeText}>{code}</code>
                </div>
              ))}
            </div>
            <div style={styles.backupActions}>
              <button
                onClick={downloadBackupCodes}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Download as Text File
              </button>
              <button
                onClick={printBackupCodes}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Print
              </button>
            </div>
            <div style={styles.buttonGroup}>
              <button
                onClick={handleComplete}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                I've Saved My Backup Codes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  description: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  appList: {
    listStyleType: 'disc',
    marginLeft: '20px',
    marginBottom: '20px',
    color: '#666',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    margin: '20px 0',
  },
  qrCode: {
    width: '250px',
    height: '250px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  manualEntry: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  manualLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  code: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: '14px',
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    wordBreak: 'break-all' as const,
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '18px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    marginBottom: '16px',
    fontFamily: 'monospace',
    letterSpacing: '4px',
    textAlign: 'center' as const,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    flex: 1,
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#e0e0e0',
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: '#fff',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  warning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  backupCodesContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  backupCode: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
  },
  backupCodeNumber: {
    fontSize: '14px',
    color: '#666',
    marginRight: '8px',
    minWidth: '20px',
  },
  backupCodeText: {
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  backupActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '10px',
  },
};
