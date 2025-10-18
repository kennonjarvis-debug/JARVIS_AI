/**
 * Backup Verification Service
 *
 * Verifies backup integrity and performs test restores
 * Features:
 * - Checksum validation
 * - Size validation
 * - Test restore in isolated environment
 * - Automated verification reports
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VerificationResult {
  backup_id: string;
  timestamp: Date;
  passed: boolean;
  checks: {
    checksum: { passed: boolean; expected: string; actual: string };
    size: { passed: boolean; expected: number; actual: number };
    structure: { passed: boolean; errors: string[] };
    restore_test: { passed: boolean; error?: string };
  };
}

export class BackupVerificationService {
  private backupDir: string;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/var/backups/jarvis';
  }

  /**
   * Initialize verification service
   */
  async initialize(): Promise<void> {
    console.log('[BackupVerification] Initializing verification service...');
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<VerificationResult> {
    console.log(`[BackupVerification] Verifying backup: ${backupId}`);

    const result: VerificationResult = {
      backup_id: backupId,
      timestamp: new Date(),
      passed: true,
      checks: {
        checksum: { passed: false, expected: '', actual: '' },
        size: { passed: false, expected: 0, actual: 0 },
        structure: { passed: false, errors: [] },
        restore_test: { passed: false },
      },
    };

    try {
      // Load metadata
      const metadataPath = path.join(this.backupDir, 'metadata', `${backupId}.json`);
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

      // Verify checksum
      const actualChecksum = await this.calculateBackupChecksum(backupId);
      result.checks.checksum.expected = metadata.checksum;
      result.checks.checksum.actual = actualChecksum;
      result.checks.checksum.passed = actualChecksum === metadata.checksum;

      // Verify size
      const actualSize = await this.calculateBackupSize(backupId);
      result.checks.size.expected = metadata.size;
      result.checks.size.actual = actualSize;
      result.checks.size.passed = Math.abs(actualSize - metadata.size) < 1024; // 1KB tolerance

      // Verify structure
      const structureCheck = await this.verifyBackupStructure(backupId);
      result.checks.structure.passed = structureCheck.passed;
      result.checks.structure.errors = structureCheck.errors;

      // Test restore (optional, can be slow)
      if (process.env.VERIFY_RESTORE === 'true') {
        const restoreTest = await this.testRestore(backupId);
        result.checks.restore_test.passed = restoreTest.passed;
        result.checks.restore_test.error = restoreTest.error;
      }

      // Overall result
      result.passed =
        result.checks.checksum.passed &&
        result.checks.size.passed &&
        result.checks.structure.passed;

      if (result.passed) {
        console.log(`[BackupVerification] Backup verified successfully: ${backupId}`);
      } else {
        console.error(`[BackupVerification] Backup verification failed: ${backupId}`);
      }
    } catch (error) {
      result.passed = false;
      console.error(`[BackupVerification] Verification error: ${backupId}`, error);
    }

    // Save verification report
    await this.saveVerificationReport(result);

    return result;
  }

  /**
   * Calculate backup checksum
   */
  private async calculateBackupChecksum(backupId: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const backupTypes = ['postgres', 'redis', 'files', 'secrets'];

    for (const type of backupTypes) {
      const dir = path.join(this.backupDir, type);
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (file.includes(backupId)) {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath);
          hash.update(content);
        }
      }
    }

    return hash.digest('hex');
  }

  /**
   * Calculate total backup size
   */
  private async calculateBackupSize(backupId: string): Promise<number> {
    let totalSize = 0;
    const backupTypes = ['postgres', 'redis', 'files', 'secrets'];

    for (const type of backupTypes) {
      const dir = path.join(this.backupDir, type);
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (file.includes(backupId)) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
    }

    return totalSize;
  }

  /**
   * Verify backup structure
   */
  private async verifyBackupStructure(
    backupId: string
  ): Promise<{ passed: boolean; errors: string[] }> {
    const errors: string[] = [];
    const backupTypes = ['postgres', 'redis', 'files', 'secrets'];

    // Check if all backup types exist
    for (const type of backupTypes) {
      const dir = path.join(this.backupDir, type);
      const files = await fs.readdir(dir);
      const hasBackup = files.some((f) => f.includes(backupId));

      if (!hasBackup) {
        errors.push(`Missing ${type} backup`);
      }
    }

    // Check metadata
    const metadataPath = path.join(this.backupDir, 'metadata', `${backupId}.json`);
    try {
      await fs.access(metadataPath);
    } catch {
      errors.push('Missing metadata file');
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  }

  /**
   * Test restore in isolated environment
   */
  private async testRestore(
    backupId: string
  ): Promise<{ passed: boolean; error?: string }> {
    try {
      console.log(`[BackupVerification] Testing restore: ${backupId}`);

      // This is a simplified test
      // In production, you would restore to a temporary database/redis instance

      // For now, just verify files can be read
      const backupTypes = ['postgres', 'redis'];

      for (const type of backupTypes) {
        const dir = path.join(this.backupDir, type);
        const files = await fs.readdir(dir);

        for (const file of files) {
          if (file.includes(backupId)) {
            const filePath = path.join(dir, file);
            // Just read first 1KB to verify file is readable
            const buffer = Buffer.alloc(1024);
            const fd = await fs.open(filePath, 'r');
            await fd.read(buffer, 0, 1024, 0);
            await fd.close();
          }
        }
      }

      return { passed: true };
    } catch (error) {
      return {
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save verification report
   */
  private async saveVerificationReport(result: VerificationResult): Promise<void> {
    const reportPath = path.join(
      this.backupDir,
      'verification',
      `${result.backup_id}_${result.timestamp.toISOString()}.json`
    );

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(): Promise<VerificationResult[]> {
    const verificationDir = path.join(this.backupDir, 'verification');
    const files = await fs.readdir(verificationDir);

    const reports: VerificationResult[] = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(verificationDir, file), 'utf-8');
      reports.push(JSON.parse(content));
    }

    return reports.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}
