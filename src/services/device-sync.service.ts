/**
 * Device Sync Service
 *
 * Synchronizes activity monitoring data between Mac and iPhone.
 * Uses WebSocket for real-time sync and CloudKit for persistent storage.
 *
 * Features:
 * - Real-time activity sync via WebSocket
 * - Persistent sync via CloudKit
 * - Offline queue for when devices aren't connected
 * - Conflict resolution
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { ActivitySession, ActivityEvent } from './activity-monitor.service.js';
import { websocketHub } from '../core/websocket-hub.js';

export interface DeviceSyncConfig {
  enabled: boolean;
  syncInterval: number;        // milliseconds
  offlineQueueSize: number;
  conflictResolution: 'latest' | 'merge' | 'manual';
}

export interface SyncMessage {
  type: 'activity_session' | 'activity_event' | 'context_change' | 'action_opportunity';
  deviceId: string;
  timestamp: Date;
  data: any;
}

export class DeviceSyncService extends EventEmitter {
  private static instance: DeviceSyncService;

  private config: DeviceSyncConfig;
  private connectedDevices: Set<string> = new Set();
  private offlineQueue: SyncMessage[] = [];
  private lastSyncTime: Date = new Date();

  private constructor(config?: Partial<DeviceSyncConfig>) {
    super();

    this.config = {
      enabled: true,
      syncInterval: 30000, // 30 seconds
      offlineQueueSize: 1000,
      conflictResolution: 'latest',
      ...config
    };

    // Note: WebSocket listeners removed - WebSocketHub doesn't support event listeners
    // Device sync uses broadcast methods directly instead
  }

  static getInstance(config?: Partial<DeviceSyncConfig>): DeviceSyncService {
    if (!DeviceSyncService.instance) {
      DeviceSyncService.instance = new DeviceSyncService(config);
    }
    return DeviceSyncService.instance;
  }

  /**
   * Handle device connection
   */
  private handleDeviceConnected(deviceId: string): void {
    this.connectedDevices.add(deviceId);

    logger.info('📱 Device connected for activity sync', { deviceId });

    // Send any queued offline messages
    this.flushOfflineQueue(deviceId);

    this.emit('device:connected', deviceId);
  }

  /**
   * Handle device disconnection
   */
  private handleDeviceDisconnected(deviceId: string): void {
    this.connectedDevices.delete(deviceId);

    logger.info('📱 Device disconnected', { deviceId });

    this.emit('device:disconnected', deviceId);
  }

  /**
   * Handle incoming sync message from device
   */
  private handleSyncMessage(deviceId: string, message: any): void {
    logger.debug('Sync message received from device', {
      deviceId,
      type: message.type
    });

    // Emit the synced data
    this.emit('sync:received', {
      deviceId,
      type: message.type,
      data: message.data,
      timestamp: message.timestamp
    });
  }

  /**
   * Sync activity session to all connected devices
   */
  syncActivitySession(session: ActivitySession): void {
    if (!this.config.enabled) return;

    const syncMessage: SyncMessage = {
      type: 'activity_session',
      deviceId: 'mac',
      timestamp: new Date(),
      data: session
    };

    this.broadcast(syncMessage);

    logger.debug('Activity session synced to devices', {
      sessionId: session.id,
      context: session.context,
      devices: this.connectedDevices.size
    });
  }

  /**
   * Sync activity event to all connected devices
   */
  syncActivityEvent(event: ActivityEvent): void {
    if (!this.config.enabled) return;

    const syncMessage: SyncMessage = {
      type: 'activity_event',
      deviceId: 'mac',
      timestamp: new Date(),
      data: event
    };

    this.broadcast(syncMessage);
  }

  /**
   * Sync context change to all connected devices
   */
  syncContextChange(context: string, confidence: number): void {
    if (!this.config.enabled) return;

    const syncMessage: SyncMessage = {
      type: 'context_change',
      deviceId: 'mac',
      timestamp: new Date(),
      data: { context, confidence }
    };

    this.broadcast(syncMessage);

    logger.info('📍 Context synced to devices', {
      context,
      devices: this.connectedDevices.size
    });
  }

  /**
   * Sync action opportunity to all connected devices (for notifications)
   */
  syncActionOpportunity(opportunity: any): void {
    if (!this.config.enabled) return;

    const syncMessage: SyncMessage = {
      type: 'action_opportunity',
      deviceId: 'mac',
      timestamp: new Date(),
      data: opportunity
    };

    this.broadcast(syncMessage);

    logger.info('💡 Action opportunity synced to devices', {
      type: opportunity.type,
      title: opportunity.title,
      devices: this.connectedDevices.size
    });
  }

  /**
   * Broadcast sync message to all connected devices
   */
  private broadcast(message: SyncMessage): void {
    try {
      // Convert SyncMessage to WSMessage format
      const wsMessage = {
        type: 'sync' as const,
        timestamp: message.timestamp.toISOString(),
        data: {
          syncType: message.type,
          deviceId: message.deviceId,
          payload: message.data
        }
      };

      // Use WebSocketHub's public broadcast method
      websocketHub.broadcastToAll(wsMessage);

      this.lastSyncTime = new Date();

      logger.debug('Sync message broadcasted', {
        type: message.type,
        timestamp: message.timestamp
      });
    } catch (error) {
      logger.error('Failed to broadcast sync message', { error });
      this.queueOfflineMessage(message);
    }
  }

  /**
   * Queue message for offline sync
   */
  private queueOfflineMessage(message: SyncMessage): void {
    this.offlineQueue.push(message);

    // Trim queue if too large
    if (this.offlineQueue.length > this.config.offlineQueueSize) {
      this.offlineQueue = this.offlineQueue.slice(-this.config.offlineQueueSize);
    }

    logger.debug('Message queued for offline sync', {
      type: message.type,
      queueSize: this.offlineQueue.length
    });
  }

  /**
   * Flush offline queue when device reconnects
   */
  private flushOfflineQueue(deviceId: string): void {
    if (this.offlineQueue.length === 0) return;

    logger.info('📤 Flushing offline queue', {
      deviceId,
      messages: this.offlineQueue.length
    });

    // Broadcast all queued messages using the broadcast method
    for (const message of this.offlineQueue) {
      try {
        this.broadcast(message);
      } catch (error) {
        logger.error('Failed to flush message', { error });
      }
    }

    // Clear queue after flushing
    this.offlineQueue = [];

    this.emit('offline_queue:flushed', { deviceId });
  }

  /**
   * Get sync status
   */
  getStatus(): {
    enabled: boolean;
    connectedDevices: number;
    offlineQueueSize: number;
    lastSyncTime: Date;
  } {
    return {
      enabled: this.config.enabled,
      connectedDevices: this.connectedDevices.size,
      offlineQueueSize: this.offlineQueue.length,
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): string[] {
    return Array.from(this.connectedDevices);
  }

  /**
   * Enable/disable sync
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info(`Device sync ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Export singleton instance
export const deviceSync = DeviceSyncService.getInstance();
