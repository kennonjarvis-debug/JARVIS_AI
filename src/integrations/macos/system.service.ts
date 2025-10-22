/**
 * macOS System Integration Service
 *
 * Provides system information and status monitoring.
 * Monitors battery, network, disk, CPU, memory, and system preferences.
 *
 * Features:
 * - Battery status and health
 * - Network connectivity
 * - Disk space monitoring
 * - CPU and memory usage
 * - Dark mode detection
 * - System events
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface BatteryStatus {
  isCharging: boolean;
  percentage: number;
  timeRemaining?: number; // minutes
  health: string;
  cycleCount?: number;
  temperature?: number;
}

export interface NetworkStatus {
  isOnline: boolean;
  interface: string;
  ipAddress?: string;
  ssid?: string; // WiFi network name
  signalStrength?: number;
}

export interface DiskSpace {
  total: number; // bytes
  used: number;
  available: number;
  percentage: number;
}

export interface SystemInfo {
  platform: string;
  version: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number; // bytes
  hostname: string;
  isAppleSilicon: boolean;
}

export interface SystemLoad {
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  loadAverage: number[];
}

export class SystemService extends EventEmitter {
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Get battery status
   */
  async getBatteryStatus(): Promise<BatteryStatus> {
    try {
      const { stdout } = await execAsync('pmset -g batt');

      const percentageMatch = stdout.match(/(\d+)%/);
      const chargingMatch = stdout.match(/AC Power|charging/i);
      const timeMatch = stdout.match(/(\d+):(\d+)/);

      const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : 0;
      const isCharging = !!chargingMatch;
      const timeRemaining = timeMatch
        ? parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10)
        : undefined;

      // Get detailed battery info
      const { stdout: healthInfo } = await execAsync('system_profiler SPPowerDataType');

      const cycleMatch = healthInfo.match(/Cycle Count:\s*(\d+)/);
      const healthMatch = healthInfo.match(/Condition:\s*(\w+)/);

      return {
        isCharging,
        percentage,
        timeRemaining,
        health: healthMatch ? healthMatch[1] : 'Unknown',
        cycleCount: cycleMatch ? parseInt(cycleMatch[1], 10) : undefined,
      };
    } catch (error) {
      console.error('[System] Failed to get battery status:', error);
      return {
        isCharging: false,
        percentage: 0,
        health: 'Unknown',
      };
    }
  }

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      // Check online status
      const isOnline = await this.checkInternetConnection();

      // Get active network interface
      const { stdout: routeInfo } = await execAsync('route -n get default');
      const interfaceMatch = routeInfo.match(/interface:\s*(\w+)/);
      const networkInterface = interfaceMatch ? interfaceMatch[1] : 'en0';

      // Get IP address
      const { stdout: ipInfo } = await execAsync(`ipconfig getifaddr ${networkInterface}`);
      const ipAddress = ipInfo.trim();

      // Get WiFi info if applicable
      let ssid: string | undefined;
      let signalStrength: number | undefined;

      if (networkInterface.startsWith('en')) {
        try {
          const { stdout: wifiInfo } = await execAsync(
            '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I'
          );

          const ssidMatch = wifiInfo.match(/\sSSID:\s*(.+)/);
          const signalMatch = wifiInfo.match(/agrCtlRSSI:\s*(-?\d+)/);

          ssid = ssidMatch ? ssidMatch[1].trim() : undefined;
          signalStrength = signalMatch ? parseInt(signalMatch[1], 10) : undefined;
        } catch {
          // WiFi info not available
        }
      }

      return {
        isOnline,
        interface: networkInterface,
        ipAddress,
        ssid,
        signalStrength,
      };
    } catch (error) {
      console.error('[System] Failed to get network status:', error);
      return {
        isOnline: false,
        interface: 'unknown',
      };
    }
  }

  /**
   * Check internet connection
   */
  async checkInternetConnection(): Promise<boolean> {
    try {
      await execAsync('ping -c 1 -t 1 8.8.8.8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get disk space information
   */
  async getDiskSpace(path: string = '/'): Promise<DiskSpace> {
    try {
      const { stdout } = await execAsync(`df -k "${path}"`);
      const lines = stdout.trim().split('\n');
      const data = lines[1].split(/\s+/);

      const total = parseInt(data[1], 10) * 1024; // Convert from KB to bytes
      const used = parseInt(data[2], 10) * 1024;
      const available = parseInt(data[3], 10) * 1024;
      const percentage = parseInt(data[4].replace('%', ''), 10);

      return {
        total,
        used,
        available,
        percentage,
      };
    } catch (error) {
      console.error('[System] Failed to get disk space:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const cpus = os.cpus();
    const arch = os.arch();
    const isAppleSilicon = arch === 'arm64';

    let version = os.release();
    try {
      const { stdout } = await execAsync('sw_vers -productVersion');
      version = stdout.trim();
    } catch {
      // Use default from os.release()
    }

    return {
      platform: os.platform(),
      version,
      arch,
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
      isAppleSilicon,
    };
  }

  /**
   * Get current system load
   */
  async getSystemLoad(): Promise<SystemLoad> {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - Math.floor((idle / total) * 100);

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = Math.floor(((totalMem - freeMem) / totalMem) * 100);

    return {
      cpuUsage,
      memoryUsage,
      loadAverage: os.loadavg(),
    };
  }

  /**
   * Check if dark mode is enabled
   */
  async isDarkMode(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(
        'defaults read -g AppleInterfaceStyle 2>/dev/null || echo "Light"'
      );
      return stdout.trim() === 'Dark';
    } catch {
      return false;
    }
  }

  /**
   * Set dark mode
   */
  async setDarkMode(enabled: boolean): Promise<void> {
    try {
      const script = `
        tell application "System Events"
          tell appearance preferences
            set dark mode to ${enabled}
          end tell
        end tell
      `;
      await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
      this.emit('dark_mode_changed', enabled);
    } catch (error) {
      console.error('[System] Failed to set dark mode:', error);
      throw error;
    }
  }

  /**
   * Get macOS version info
   */
  async getMacOSVersion(): Promise<{
    version: string;
    build: string;
    name: string;
  }> {
    try {
      const { stdout: version } = await execAsync('sw_vers -productVersion');
      const { stdout: build } = await execAsync('sw_vers -buildVersion');

      // Map version to name
      const versionNum = parseFloat(version);
      let name = 'macOS';

      if (versionNum >= 15) name = 'macOS Sequoia';
      else if (versionNum >= 14) name = 'macOS Sonoma';
      else if (versionNum >= 13) name = 'macOS Ventura';
      else if (versionNum >= 12) name = 'macOS Monterey';
      else if (versionNum >= 11) name = 'macOS Big Sur';

      return {
        version: version.trim(),
        build: build.trim(),
        name,
      };
    } catch (error) {
      console.error('[System] Failed to get macOS version:', error);
      return {
        version: 'Unknown',
        build: 'Unknown',
        name: 'macOS',
      };
    }
  }

  /**
   * Get uptime in seconds
   */
  getUptime(): number {
    return os.uptime();
  }

  /**
   * Format uptime to human-readable string
   */
  formatUptime(seconds: number = this.getUptime()): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.join(' ') || '< 1m';
  }

  /**
   * Start monitoring system status
   */
  startMonitoring(interval: number = 60000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      const [battery, network, disk, load, darkMode] = await Promise.all([
        this.getBatteryStatus(),
        this.getNetworkStatus(),
        this.getDiskSpace(),
        this.getSystemLoad(),
        this.isDarkMode(),
      ]);

      this.emit('status_update', {
        battery,
        network,
        disk,
        load,
        darkMode,
        timestamp: new Date(),
      });

      // Emit warnings
      if (battery.percentage < 20 && !battery.isCharging) {
        this.emit('battery_low', battery);
      }

      if (disk.percentage > 90) {
        this.emit('disk_space_low', disk);
      }

      if (load.cpuUsage > 90) {
        this.emit('high_cpu_usage', load);
      }

      if (load.memoryUsage > 90) {
        this.emit('high_memory_usage', load);
      }
    }, interval);

    console.log('[System] Monitoring started');
    this.emit('monitoring_started');
  }

  /**
   * Stop monitoring system status
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[System] Monitoring stopped');
      this.emit('monitoring_stopped');
    }
  }

  /**
   * Get comprehensive system status
   */
  async getStatus(): Promise<{
    info: SystemInfo;
    load: SystemLoad;
    battery: BatteryStatus;
    network: NetworkStatus;
    disk: DiskSpace;
    uptime: string;
    darkMode: boolean;
  }> {
    const [info, load, battery, network, disk, darkMode] = await Promise.all([
      this.getSystemInfo(),
      this.getSystemLoad(),
      this.getBatteryStatus(),
      this.getNetworkStatus(),
      this.getDiskSpace(),
      this.isDarkMode(),
    ]);

    return {
      info,
      load,
      battery,
      network,
      disk,
      uptime: this.formatUptime(),
      darkMode,
    };
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Sleep the system
   */
  async sleep(): Promise<void> {
    try {
      await execAsync('pmset sleepnow');
    } catch (error) {
      console.error('[System] Failed to sleep:', error);
      throw error;
    }
  }

  /**
   * Restart the system
   */
  async restart(): Promise<void> {
    try {
      await execAsync('sudo shutdown -r now');
    } catch (error) {
      console.error('[System] Failed to restart:', error);
      throw error;
    }
  }

  /**
   * Shutdown the system
   */
  async shutdown(): Promise<void> {
    try {
      await execAsync('sudo shutdown -h now');
    } catch (error) {
      console.error('[System] Failed to shutdown:', error);
      throw error;
    }
  }
}

/**
 * Create a singleton instance
 */
export const systemService = new SystemService();
