'use client';

/**
 * Backup Management Admin UI
 *
 * Admin interface for backup and disaster recovery management
 * Features:
 * - View backup history
 * - Trigger manual backups
 * - Download backups
 * - Restore from backups
 * - View backup statistics
 * - Monitor backup health
 */

import { useState, useEffect } from 'react';

interface Backup {
  id: string;
  type: 'postgres' | 'redis' | 'files' | 'secrets' | 'full';
  timestamp: string;
  size: number;
  encrypted: boolean;
  compressed: boolean;
  checksum: string;
  destination: string[];
  status: 'in_progress' | 'completed' | 'failed';
}

interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  average_duration_ms: number;
  last_backup: string | null;
  last_success: string | null;
  last_failure: string | null;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadBackups();
    loadStatistics();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/backups');
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Failed to load backups', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/backups/stats/overview');
      const data = await response.json();
      setStats(data.statistics);
    } catch (error) {
      console.error('Failed to load statistics', error);
    }
  };

  const triggerBackup = async (type: 'full' | 'incremental') => {
    setTriggering(true);
    try {
      const response = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        alert(`${type} backup triggered successfully`);
        setTimeout(() => {
          loadBackups();
          loadStatistics();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to trigger backup', error);
      alert('Failed to trigger backup');
    } finally {
      setTriggering(false);
    }
  };

  const verifyBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/backups/${backupId}/verify`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.verification.passed) {
        alert('Backup verification passed!');
      } else {
        alert('Backup verification failed. Check logs for details.');
      }
    } catch (error) {
      console.error('Failed to verify backup', error);
      alert('Failed to verify backup');
    }
  };

  const downloadBackup = async (backupId: string) => {
    window.open(`/api/backups/${backupId}/download`, '_blank');
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
          <p className="text-gray-600 mt-2">
            Manage backups and disaster recovery for Jarvis AI platform
          </p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Backups</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_backups}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Successful</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.successful_backups}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Failed</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed_backups}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Last Backup</h3>
              <p className="text-sm font-medium text-gray-900 mt-2">
                {stats.last_backup ? formatDate(stats.last_backup) : 'Never'}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={() => triggerBackup('full')}
              disabled={triggering}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {triggering ? 'Triggering...' : 'Trigger Full Backup'}
            </button>
            <button
              onClick={() => triggerBackup('incremental')}
              disabled={triggering}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {triggering ? 'Triggering...' : 'Trigger Incremental Backup'}
            </button>
            <button
              onClick={loadBackups}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Backup List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Backup History</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No backups found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backups.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {backup.id.substring(0, 16)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {backup.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(backup.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatBytes(backup.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 py-1 rounded ${
                            backup.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : backup.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {backup.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {backup.destination.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => verifyBackup(backup.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => downloadBackup(backup.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Disaster Recovery Info */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-2">
            Disaster Recovery Information
          </h3>
          <ul className="list-disc list-inside text-yellow-800 space-y-1">
            <li>RTO (Recovery Time Objective): 1 hour</li>
            <li>RPO (Recovery Point Objective): 24 hours</li>
            <li>Daily backups run at 2:00 AM</li>
            <li>Weekly full backups on Sundays at 3:00 AM</li>
            <li>Monthly archival backups on the 1st at 4:00 AM</li>
            <li>All backups are encrypted with AES-256</li>
            <li>Backups are stored locally and in S3 (if enabled)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
