'use client';

import { Music, TrendingUp, Users, Zap, Brain } from 'lucide-react';

interface BusinessMetricsProps {
  data: any;
}

export default function BusinessMetrics({ data }: BusinessMetricsProps) {
  if (!data) return null;

  const metrics = [
    {
      id: 'music',
      icon: <Music className="w-6 h-6" />,
      name: 'Music Generation',
      priority: 1,
      color: 'jarvis-primary',
      stats: [
        { label: 'Generations Today', value: data.music?.metrics?.generations_today || 0 },
        { label: 'Success Rate', value: `${data.music?.metrics?.success_rate || 0}%` },
        { label: 'Avg Time', value: `${data.music?.metrics?.avg_generation_time || 0}s` },
      ],
      status: data.music?.health || 'unknown',
    },
    {
      id: 'marketing',
      icon: <TrendingUp className="w-6 h-6" />,
      name: 'Marketing & Strategy',
      priority: 2,
      color: 'jarvis-success',
      stats: [
        { label: 'Users Today', value: data.marketing?.metrics?.users_today || 0 },
        { label: 'Conversion Rate', value: `${data.marketing?.metrics?.conversion_rate || 0}%` },
        { label: 'Revenue', value: `$${data.marketing?.metrics?.revenue_today || 0}` },
      ],
      status: data.marketing?.health || 'unknown',
    },
    {
      id: 'engagement',
      icon: <Users className="w-6 h-6" />,
      name: 'User Engagement',
      priority: 3,
      color: 'jarvis-secondary',
      stats: [
        { label: 'Active Users', value: data.engagement?.metrics?.active_users || 0 },
        { label: 'Churn Risk', value: `${data.engagement?.metrics?.churn_risk || 0}%` },
        { label: 'Satisfaction', value: `${data.engagement?.metrics?.satisfaction_score || 0}%` },
      ],
      status: data.engagement?.health || 'unknown',
    },
    {
      id: 'automation',
      icon: <Zap className="w-6 h-6" />,
      name: 'Workflow Automation',
      priority: 4,
      color: 'jarvis-warning',
      stats: [
        { label: 'Workflows', value: data.automation?.metrics?.workflows_executed || 0 },
        { label: 'Test Coverage', value: `${data.automation?.metrics?.test_coverage || 0}%` },
        { label: 'Error Rate', value: `${data.automation?.metrics?.error_rate || 0}%` },
      ],
      status: data.automation?.health || 'unknown',
    },
    {
      id: 'intelligence',
      icon: <Brain className="w-6 h-6" />,
      name: 'Business Intelligence',
      priority: 5,
      color: 'jarvis-primary',
      stats: [
        { label: 'Dashboards', value: data.intelligence?.metrics?.dashboards || 0 },
        { label: 'Reports', value: data.intelligence?.metrics?.reports_generated || 0 },
        { label: 'Insights', value: data.intelligence?.metrics?.insights_delivered || 0 },
      ],
      status: data.intelligence?.health || 'unknown',
    },
  ];

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-jarvis-primary" />
        Business Performance
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="glass-hover rounded-lg p-4 border border-gray-700"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`text-${metric.color}`}>{metric.icon}</div>
              <StatusDot status={metric.status} />
            </div>

            {/* Name */}
            <h3 className="font-semibold text-sm mb-3 leading-tight">
              {metric.name}
            </h3>

            {/* Stats */}
            <div className="space-y-2">
              {metric.stats.map((stat, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{stat.label}</span>
                  <span className="text-sm font-bold">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Priority Badge */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <span className="text-xs text-gray-500">
                Priority {metric.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const statusClass = status === 'healthy' ? 'status-healthy' :
                      status === 'degraded' ? 'status-degraded' :
                      status === 'unhealthy' ? 'status-unhealthy' :
                      'status-unknown';

  return <div className={`status-dot ${statusClass}`} title={status} />;
}
