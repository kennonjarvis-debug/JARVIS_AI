'use client';

/**
 * TwoFactorSettings Component
 *
 * Manages 2FA settings in the user's security settings page
 * Shows enable/disable options and backup code regeneration
 */

import { useState, useEffect } from 'react';
import TwoFactorSetup from './TwoFactorSetup';

interface TwoFactorSettingsProps {
  initialEnabled?: boolean;
}

export default function TwoFactorSettings({
  initialEnabled = false,
}: TwoFactorSettingsProps) {
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [showDisable, setShowDisable] = useState<boolean>(false);
  const [showBackupCodes, setShowBackupCodes] = useState<boolean>(false);
  const [disableCode, setDisableCode] = useState<string>('');
  const [backupCodeRequestCode, setBackupCodeRequestCode] =
    useState<string>('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleEnableComplete = () => {
    setEnabled(true);
    setShowSetup(false);
    setSuccess('Two-factor authentication has been enabled successfully!');
    setTimeout(() => setSuccess(''), 5000);
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      setEnabled(false);
      setShowDisable(false);
      setDisableCode('');
      setSuccess('Two-factor authentication has been disabled.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: backupCodeRequestCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate backup codes');
      }

      setNewBackupCodes(data.backupCodes);
      setBackupCodeRequestCode('');
      setSuccess('New backup codes generated successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const content = `Jarvis AI - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${newBackupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}`;

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

  if (showSetup) {
    return (
      <TwoFactorSetup
        onComplete={handleEnableComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Two-Factor Authentication</h3>
          <p style={styles.description}>
            Add an extra layer of security to your account by requiring both
            your password and an authentication code to sign in.
          </p>
        </div>
        <div style={styles.statusBadge(enabled)}>
          {enabled ? 'Enabled' : 'Disabled'}
        </div>
      </div>

      {success && <div style={styles.success}>{success}</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!enabled ? (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Enable 2FA</h4>
          <p style={styles.sectionDescription}>
            Set up two-factor authentication using an authenticator app like
            Google Authenticator, Microsoft Authenticator, or Authy.
          </p>
          <button
            onClick={() => setShowSetup(true)}
            style={{ ...styles.button, ...styles.primaryButton }}
          >
            Enable Two-Factor Authentication
          </button>
        </div>
      ) : (
        <>
          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Backup Codes</h4>
            <p style={styles.sectionDescription}>
              Regenerate backup codes if you've lost them or used all of them.
              This will invalidate your old codes.
            </p>

            {!showBackupCodes ? (
              <button
                onClick={() => setShowBackupCodes(true)}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Regenerate Backup Codes
              </button>
            ) : (
              <form onSubmit={handleRegenerateBackupCodes} style={styles.form}>
                <label style={styles.label}>
                  Enter your 6-digit authentication code:
                </label>
                <input
                  type="text"
                  value={backupCodeRequestCode}
                  onChange={(e) =>
                    setBackupCodeRequestCode(
                      e.target.value.replace(/\D/g, '')
                    )
                  }
                  maxLength={6}
                  required
                  style={styles.input}
                  placeholder="000000"
                />
                <div style={styles.buttonGroup}>
                  <button
                    type="submit"
                    disabled={
                      loading || backupCodeRequestCode.length !== 6
                    }
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    {loading ? 'Generating...' : 'Generate New Codes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBackupCodes(false);
                      setBackupCodeRequestCode('');
                      setError('');
                    }}
                    style={styles.button}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {newBackupCodes.length > 0 && (
              <div style={styles.backupCodesSection}>
                <div style={styles.warning}>
                  <strong>IMPORTANT:</strong> Save these codes in a secure
                  location. Each code can only be used once. Your old backup
                  codes are now invalid.
                </div>
                <div style={styles.backupCodesGrid}>
                  {newBackupCodes.map((code, index) => (
                    <div key={index} style={styles.backupCode}>
                      <span style={styles.backupCodeNumber}>{index + 1}.</span>
                      <code style={styles.backupCodeText}>{code}</code>
                    </div>
                  ))}
                </div>
                <button
                  onClick={downloadBackupCodes}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Download as Text File
                </button>
              </div>
            )}
          </div>

          <div style={styles.section}>
            <h4 style={styles.sectionTitle}>Disable 2FA</h4>
            <p style={styles.sectionDescription}>
              Remove two-factor authentication from your account. This will make
              your account less secure.
            </p>

            {!showDisable ? (
              <button
                onClick={() => setShowDisable(true)}
                style={{ ...styles.button, ...styles.dangerButton }}
              >
                Disable Two-Factor Authentication
              </button>
            ) : (
              <form onSubmit={handleDisable} style={styles.form}>
                <label style={styles.label}>
                  Enter your 6-digit authentication code to confirm:
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) =>
                    setDisableCode(e.target.value.replace(/\D/g, ''))
                  }
                  maxLength={6}
                  required
                  style={styles.input}
                  placeholder="000000"
                />
                <div style={styles.buttonGroup}>
                  <button
                    type="submit"
                    disabled={loading || disableCode.length !== 6}
                    style={{ ...styles.button, ...styles.dangerButton }}
                  >
                    {loading ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDisable(false);
                      setDisableCode('');
                      setError('');
                    }}
                    style={styles.button}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#333',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5',
  },
  statusBadge: (enabled: boolean) => ({
    padding: '6px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
    backgroundColor: enabled ? '#d4edda' : '#f8d7da',
    color: enabled ? '#155724' : '#721c24',
  }),
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: '#333',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  form: {
    marginTop: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#333',
  },
  input: {
    width: '200px',
    padding: '10px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '4px',
    marginBottom: '16px',
    fontFamily: 'monospace',
    letterSpacing: '3px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
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
  dangerButton: {
    backgroundColor: '#dc3545',
    color: '#fff',
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  warning: {
    backgroundColor: '#fff3cd',
    color: '#856404',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  backupCodesSection: {
    marginTop: '20px',
  },
  backupCodesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '16px',
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
};
