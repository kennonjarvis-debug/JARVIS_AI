'use client';

/**
 * BackupCodes Component
 *
 * Simple component to display and download backup codes
 * Used after initial 2FA setup or when regenerating codes
 */

interface BackupCodesProps {
  codes: string[];
  onDismiss?: () => void;
}

export default function BackupCodes({ codes, onDismiss }: BackupCodesProps) {
  const downloadCodes = () => {
    const content = `Jarvis AI - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Save these codes in a secure location.
Each code can only be used once.

${codes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

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

  const printCodes = () => {
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
            .codes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
            .code { padding: 8px; background: #f8f9fa; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Jarvis AI - Two-Factor Authentication Backup Codes</h1>
          <div class="date">Generated: ${new Date().toLocaleString()}</div>
          <div class="warning">
            <strong>IMPORTANT:</strong> Save these codes in a secure location.
            Each code can only be used once.
          </div>
          <div class="codes">
            ${codes.map((code, i) => `<div class="code">${i + 1}. ${code}</div>`).join('')}
          </div>
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

  const copyCodes = async () => {
    const text = codes.map((code, i) => `${i + 1}. ${code}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Backup codes copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Your Backup Codes</h3>
        {onDismiss && (
          <button onClick={onDismiss} style={styles.closeButton}>
            ×
          </button>
        )}
      </div>

      <div style={styles.warning}>
        <strong>IMPORTANT:</strong> Save these backup codes in a secure
        location. Each code can only be used once. If you lose access to your
        authenticator app, you'll need these codes to sign in.
      </div>

      <div style={styles.codesGrid}>
        {codes.map((code, index) => (
          <div key={index} style={styles.codeItem}>
            <span style={styles.codeNumber}>{index + 1}.</span>
            <code style={styles.codeText}>{code}</code>
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button
          onClick={downloadCodes}
          style={{ ...styles.button, ...styles.primaryButton }}
        >
          Download
        </button>
        <button
          onClick={printCodes}
          style={{ ...styles.button, ...styles.secondaryButton }}
        >
          Print
        </button>
        <button
          onClick={copyCodes}
          style={{ ...styles.button, ...styles.secondaryButton }}
        >
          Copy
        </button>
      </div>

      <div style={styles.footer}>
        <p style={styles.footerText}>
          Store these codes securely - in a password manager, encrypted file, or
          printed in a safe location. Each code works only once.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '32px',
    color: '#999',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    lineHeight: '32px',
    textAlign: 'center' as const,
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
  codesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '20px',
  },
  codeItem: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: '12px',
    borderRadius: '4px',
  },
  codeNumber: {
    fontSize: '14px',
    color: '#666',
    marginRight: '10px',
    minWidth: '24px',
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#333',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  button: {
    flex: 1,
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: '#fff',
  },
  footer: {
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.5',
    margin: 0,
  },
};
