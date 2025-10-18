'use client';

import { useState, useEffect } from 'react';

interface DashboardData {
  timestamp: string;
  timeWindow: number;
  data: {
    health: {
      status: string;
      uptime: number;
      system: {
        memory: {
          total: number;
          free: number;
          used: number;
          usagePercent: number;
        };
        cpu: {
          cores: number;
          loadAverage: number[];
          usagePercent: number;
        };
      };
      checks: Record<string, any>;
    };
    errors: {
      totalErrors: number;
      errorRate: number;
      topErrors: any[];
    };
    performance: {
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      slowestQueries: any[];
      slowestEndpoints: any[];
      memory: {
        current: number;
        average: number;
        peak: number;
      };
      cpu: {
        current: number;
        average: number;
        peak: number;
      };
    };
    alerts: {
      total: number;
      critical: number;
      warning: number;
      recent: any[];
    };
  };
}

export default function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState(3600000); // 1 hour default
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/monitoring/dashboard?timeWindow=${timeWindow}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [timeWindow, autoRefresh]);

  // Helper functions
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'bg-green-500';
      case 'degraded':
      case 'warn':
        return 'bg-yellow-500';
      case 'unhealthy':
      case 'fail':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'warning':
        return 'bg-yellow-600 text-white';
      case 'info':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-xl">Loading monitoring dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
            <p className="text-gray-600">Real-time system health and performance</p>
          </div>
          <div className="flex gap-4">
            <select
              value={timeWindow}
              onChange={(e) => setTimeWindow(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg"
            >
              <option value={300000}>Last 5 minutes</option>
              <option value={900000}>Last 15 minutes</option>
              <option value={3600000}>Last hour</option>
              <option value={86400000}>Last 24 hours</option>
            </select>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-300'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">System Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(dashboardData.data.health.status)}`}></div>
                <div className="font-semibold capitalize">{dashboardData.data.health.status}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Uptime</div>
              <div className="font-semibold mt-1">{formatUptime(dashboardData.data.health.uptime)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Memory Usage</div>
              <div className="font-semibold mt-1">
                {dashboardData.data.health.system.memory.usagePercent.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">CPU Usage</div>
              <div className="font-semibold mt-1">
                {dashboardData.data.health.system.cpu.usagePercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Health Checks */}
          <div className="mt-6">
            <h3 className="font-semibold mb-3">Health Checks</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(dashboardData.data.health.checks).map(([name, check]: [string, any]) => (
                <div key={name} className="border rounded p-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(check.status)}`}></div>
                    <div className="font-medium capitalize">{name}</div>
                  </div>
                  {check.responseTime && (
                    <div className="text-sm text-gray-600 mt-1">
                      Response time: {check.responseTime}ms
                    </div>
                  )}
                  {check.message && (
                    <div className="text-sm text-gray-600 mt-1">{check.message}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {dashboardData.data.alerts.total > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Active Alerts ({dashboardData.data.alerts.total})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-red-100 p-4 rounded">
                <div className="text-sm text-red-600">Critical</div>
                <div className="text-2xl font-bold text-red-700">{dashboardData.data.alerts.critical}</div>
              </div>
              <div className="bg-yellow-100 p-4 rounded">
                <div className="text-sm text-yellow-600">Warning</div>
                <div className="text-2xl font-bold text-yellow-700">{dashboardData.data.alerts.warning}</div>
              </div>
              <div className="bg-blue-100 p-4 rounded">
                <div className="text-sm text-blue-600">Info</div>
                <div className="text-2xl font-bold text-blue-700">
                  {dashboardData.data.alerts.total - dashboardData.data.alerts.critical - dashboardData.data.alerts.warning}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {dashboardData.data.alerts.recent.map((alert: any) => (
                <div key={alert.id} className="border rounded p-3 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="font-medium">{alert.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Response Times</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Average</div>
                <div className="text-2xl font-bold">
                  {dashboardData.data.performance.averageResponseTime.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">95th Percentile</div>
                <div className="text-2xl font-bold">
                  {dashboardData.data.performance.p95ResponseTime.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">99th Percentile</div>
                <div className="text-2xl font-bold">
                  {dashboardData.data.performance.p99ResponseTime.toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Error Rate</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Total Errors</div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.data.errors.totalErrors}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Errors per Minute</div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.data.errors.errorRate.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slow Endpoints */}
        {dashboardData.data.performance.slowestEndpoints.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Slowest Endpoints</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Method</th>
                    <th className="px-4 py-2 text-left">Endpoint</th>
                    <th className="px-4 py-2 text-left">Duration</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.data.performance.slowestEndpoints.slice(0, 10).map((endpoint: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 font-mono text-sm">{endpoint.method}</td>
                      <td className="px-4 py-2 font-mono text-sm">{endpoint.endpoint}</td>
                      <td className="px-4 py-2 font-bold text-orange-600">{endpoint.duration}ms</td>
                      <td className="px-4 py-2">{endpoint.statusCode || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {new Date(endpoint.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Errors */}
        {dashboardData.data.errors.topErrors.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Top Errors</h2>
            <div className="space-y-3">
              {dashboardData.data.errors.topErrors.slice(0, 10).map((error: any) => (
                <div key={error.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-red-600">{error.type}</div>
                      <div className="text-sm text-gray-700 mt-1">{error.message}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Count: {error.count} | Last seen: {new Date(error.lastSeen).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold">
                      {error.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
