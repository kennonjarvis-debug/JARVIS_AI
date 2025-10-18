'use client';

/**
 * TwoFactorPrompt Component
 *
 * Prompts user for 2FA code during login
 * Supports both TOTP codes and backup codes
 */

import { useState } from 'react';

interface TwoFactorPromptProps {
  onVerify: (code: string, isBackupCode: boolean) => Promise<void>;
  onCancel: () => void;
  userEmail?: string;
}

export default function TwoFactorPrompt({
  onVerify,
  onCancel,
  userEmail,
}: TwoFactorPromptProps) {
  const [code, setCode] = useState<string>('');
  const [useBackupCode, setUseBackupCode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onVerify(code, useBackupCode);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');

      if (err.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
      }

      if (err.lockedOut) {
        setError(
          `Too many failed attempts. Your account has been locked for 15 minutes.`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleBackupCode = () => {
    setUseBackupCode(!useBackupCode);
    setCode('');
    setError('');
    setRemainingAttempts(null);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Two-Factor Authentication</h2>

        {userEmail && (
          <p style={styles.subtitle}>
            Signing in as <strong>{userEmail}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              {useBackupCode
                ? 'Enter a backup code:'
                : 'Enter the 6-digit code from your authenticator app:'}
            </label>

            <input
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value;
                if (useBackupCode) {
                  // Allow alphanumeric and hyphens for backup codes
                  setCode(value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase());
                } else {
                  // Only allow digits for TOTP
                  setCode(value.replace(/\D/g, ''));
                }
              }}
              maxLength={useBackupCode ? 9 : 6} // "ABCD-EFGH" or "000000"
              pattern={useBackupCode ? '[A-Z0-9-]{8,9}' : '\\d{6}'}
              required
              autoFocus
              style={styles.input}
              placeholder={useBackupCode ? 'ABCD-EFGH' : '000000'}
              disabled={loading}
            />

            {remainingAttempts !== null && remainingAttempts > 0 && (
              <div style={styles.warning}>
                Warning: {remainingAttempts} attempt
                {remainingAttempts !== 1 ? 's' : ''} remaining before account
                lockout
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}
          </div>

          <div style={styles.buttonGroup}>
            <button
              type="submit"
              disabled={
                loading ||
                (useBackupCode ? code.length < 8 : code.length !== 6)
              }
              style={{ ...styles.button, ...styles.primaryButton }}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={styles.button}
            >
              Cancel
            </button>
          </div>
        </form>

        <div style={styles.divider} />

        <button onClick={toggleBackupCode} style={styles.linkButton}>
          {useBackupCode
            ? 'Use authenticator app instead'
            : 'Use a backup code instead'}
        </button>

        {!useBackupCode && (
          <p style={styles.helpText}>
            Lost access to your authenticator app? Use a backup code or contact
            support.
          </p>
        )}

        {useBackupCode && (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              <strong>About backup codes:</strong>
            </p>
            <ul style={styles.infoList}>
              <li>Each backup code can only be used once</li>
              <li>You received 10 codes when you enabled 2FA</li>
              <li>Format: XXXX-XXXX (8 characters with hyphen)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '480px',
    width: '90%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  formGroup: {
    marginBottom: '20px',
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
    padding: '14px',
    fontSize: '20px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'monospace',
    letterSpacing: '4px',
    textAlign: 'center' as const,
    transition: 'border-color 0.2s',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
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
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '20px 0',
  },
  linkButton: {
    display: 'block',
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    color: '#007bff',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center' as const,
    textDecoration: 'underline',
  },
  helpText: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'center' as const,
    marginTop: '10px',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: '14px',
  },
  warning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '12px',
    borderRadius: '4px',
    marginTop: '12px',
    fontSize: '14px',
    fontWeight: '500',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    padding: '15px',
    borderRadius: '4px',
    marginTop: '15px',
  },
  infoText: {
    fontSize: '14px',
    color: '#004085',
    marginBottom: '8px',
  },
  infoList: {
    fontSize: '13px',
    color: '#004085',
    marginLeft: '20px',
    lineHeight: '1.6',
  },
};
