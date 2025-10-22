/**
 * Test helper utilities
 */

import fs from 'fs';
import path from 'path';

/**
 * Create mock instance tracker data
 */
export function createMockInstanceTracker() {
  return {
    instances: [
      {
        id: 'instance-1',
        name: 'Test Instance 1',
        status: 'active',
        uptime: 3600,
        tasks_completed: 10,
        tasks_failed: 1
      },
      {
        id: 'instance-2',
        name: 'Test Instance 2',
        status: 'idle',
        uptime: 7200,
        tasks_completed: 5,
        tasks_failed: 0
      }
    ],
    metrics: {
      total_tasks: 15,
      success_rate: 93.75,
      avg_completion_time: 120,
      active_instances: 1
    },
    blockers: [],
    roadmap: null,
    projects: {
      'wave-1': {
        name: 'Wave 1',
        status: 'completed',
        completion_percent: 100,
        tasks: []
      }
    },
    metadata: {
      updated: new Date().toISOString()
    }
  };
}

/**
 * Write mock data to file system
 */
export function setupMockFiles(monitoringDir: string) {
  if (!fs.existsSync(monitoringDir)) {
    fs.mkdirSync(monitoringDir, { recursive: true });
  }

  const trackerPath = path.join(monitoringDir, 'instance-tracker.json');
  fs.writeFileSync(
    trackerPath,
    JSON.stringify(createMockInstanceTracker(), null, 2)
  );

  return {
    cleanup: () => {
      if (fs.existsSync(trackerPath)) {
        fs.unlinkSync(trackerPath);
      }
    }
  };
}

/**
 * Clean up test files
 */
export function cleanupMockFiles(monitoringDir: string) {
  const trackerPath = path.join(monitoringDir, 'instance-tracker.json');
  if (fs.existsSync(trackerPath)) {
    fs.unlinkSync(trackerPath);
  }
}
