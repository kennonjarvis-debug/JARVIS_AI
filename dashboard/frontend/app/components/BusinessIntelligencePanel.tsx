'use client';

import { useState, useEffect } from 'react';
import { Brain, DollarSign, Users, Activity, TrendingUp, AlertCircle, Clock, Zap } from 'lucide-react';

interface BusinessIntelligenceProps {
  apiUrl?: string;
}

interface BusinessMetrics {
  uptime: {
    overall: number;
    byService: Record<string, number>;
  };
  performance: {
    responseTime: Record<string, number>;
    requestsPerMinute: number;
    errorRate: number;
  };
  costs: {
    total: number;
    aiApiCalls: {
      openai: number;
      anthropic: number;
      gemini: number;
    };
  };
  users: {
    active: number;
    sessions: number;
    newUsers: number;
  };
  timestamp: string;
}

interface ServiceAlert {
  service: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
  timestamp: string;
}

export default function BusinessIntelligencePanel({ apiUrl = 'http://localhost:5001' }: BusinessIntelligenceProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    const baseInterval = 120000; // 2 minutes base interval (reduced from 30s)

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch metrics, insights, and alerts in parallel
        const [metricsRes, insightsRes, alertsRes] = await Promise.all([
          fetch(`${apiUrl}/api/dashboard/intelligence/metrics`).catch(() => null),
          fetch(`${apiUrl}/api/dashboard/intelligence/insights`).catch(() => null),
          fetch(`${apiUrl}/api/dashboard/intelligence/alerts`).catch(() => null)
        ]);

        // Check for rate limiting (429) or server errors (500)
        const hasRateLimitError = [metricsRes, insightsRes, alertsRes].some(
          res => res && (res.status === 429 || res.status === 500)
        );

        if (hasRateLimitError) {
          retryCount++;
          if (retryCount < maxRetries) {
            // Exponential backoff: wait longer before next attempt
            const backoffDelay = baseInterval * Math.pow(2, retryCount);
            console.warn(`[BI] Rate limited, backing off for ${backoffDelay / 1000}s`);
          } else {
            setError('Service temporarily unavailable due to rate limiting');
          }
        } else {
          retryCount = 0; // Reset on success
        }

        if (metricsRes?.ok) {
          const data = await metricsRes.json();
          setMetrics(data.data);
        }

        if (insightsRes?.ok) {
          const data = await insightsRes.json();
          setInsights(data.data.insights);
        }

        if (alertsRes?.ok) {
          const data = await alertsRes.json();
          setAlerts(data.data.slice(0, 5)); // Show only last 5 alerts
        }

        setLoading(false);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, baseInterval); // Refresh every 2 minutes

    return () => clearInterval(interval);
  }, [apiUrl]);

  if (loading && !metrics) {
    return (
      <div className="glass rounded-lg p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-pulse text-jarvis-primary" />
          <span className="text-gray-400">Loading Business Intelligence...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="flex items-center gap-2 text-jarvis-danger">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load business intelligence: {error}</span>
        </div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Insights */}
      <div className="glass rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-jarvis-primary" />
            JARVIS Business Intelligence
          </h2>
          <span className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="glass-hover rounded-lg p-4 border border-jarvis-primary/20">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-jarvis-success mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Real-time Insights</h3>
                <ul className="space-y-1">
                  {insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-gray-300">" {insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Uptime */}
          <div className="glass rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-jarvis-success" />
              <span className="text-xs text-gray-500">Uptime</span>
            </div>
            <div className="text-2xl font-bold">
              {metrics.uptime ? formatUptime(metrics.uptime.overall) : '0h 0m'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              All services operational
            </div>
          </div>

          {/* Active Users */}
          <div className="glass rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-jarvis-primary" />
              <span className="text-xs text-gray-500">Users</span>
            </div>
            <div className="text-2xl font-bold">
              {metrics.users.active}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {metrics.users.sessions} active sessions
            </div>
          </div>

          {/* AI Costs */}
          <div className="glass rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-jarvis-warning" />
              <span className="text-xs text-gray-500">AI Costs</span>
            </div>
            <div className="text-2xl font-bold">
              ${metrics.costs.total.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Last hour usage
            </div>
          </div>

          {/* Performance */}
          <div className="glass rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-jarvis-secondary" />
              <span className="text-xs text-gray-500">Performance</span>
            </div>
            <div className="text-2xl font-bold">
              {metrics.performance.requestsPerMinute.toFixed(1)}/min
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {(metrics.performance.errorRate * 100).toFixed(1)}% error rate
            </div>
          </div>
        </div>
      )}

      {/* AI Model Costs Breakdown */}
      {metrics && metrics.costs.total > 0 && (
        <div className="glass rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Model Usage
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-hover rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">OpenAI</span>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">GPT-4</span>
              </div>
              <div className="text-lg font-bold">${metrics.costs.aiApiCalls.openai.toFixed(2)}</div>
            </div>
            <div className="glass-hover rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">Anthropic</span>
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Claude</span>
              </div>
              <div className="text-lg font-bold">${metrics.costs.aiApiCalls.anthropic.toFixed(2)}</div>
            </div>
            <div className="glass-hover rounded-lg p-3 border border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-400">Google</span>
                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Gemini</span>
              </div>
              <div className="text-lg font-bold">${metrics.costs.aiApiCalls.gemini.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Service Alerts */}
      {alerts.length > 0 && (
        <div className="glass rounded-lg p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-jarvis-warning" />
            Recent Alerts
          </h3>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`glass-hover rounded-lg p-3 border ${
                  alert.severity === 'critical' ? 'border-red-500/50 bg-red-500/10' :
                  alert.severity === 'warning' ? 'border-yellow-500/50 bg-yellow-500/10' :
                  'border-blue-500/50 bg-blue-500/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'warning' ? 'text-yellow-400' :
                        'text-blue-400'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-500">{alert.service}</span>
                    </div>
                    <div className="text-sm">{alert.message}</div>
                    <div className="text-xs text-gray-400 mt-1">{alert.action}</div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
