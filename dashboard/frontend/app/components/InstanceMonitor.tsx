'use client';

import { Brain, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface InstanceMonitorProps {
  data: any;
}

export default function InstanceMonitor({ data }: InstanceMonitorProps) {
  if (!data) return null;

  const instances = Object.entries(data.instances || {}).map(([id, instance]: [string, any]) => ({
    id,
    ...instance,
  }));

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Brain className="w-5 h-5 text-jarvis-secondary" />
        Claude Instances
      </h2>

      {/* Metrics Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          label="Completed"
          value={data.metrics?.tasks_completed || 0}
          icon={<CheckCircle className="w-4 h-4 text-jarvis-success" />}
        />
        <MetricCard
          label="In Progress"
          value={data.metrics?.tasks_in_progress || 0}
          icon={<Clock className="w-4 h-4 text-jarvis-warning" />}
        />
        <MetricCard
          label="Blockers"
          value={data.metrics?.blockers_count || 0}
          icon={<AlertCircle className="w-4 h-4 text-jarvis-danger" />}
        />
      </div>

      {/* Instances */}
      <div className="space-y-3">
        {instances.map((instance) => (
          <div
            key={instance.id}
            className="glass-hover rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-sm">{instance.id}</h3>
                <p className="text-xs text-gray-400">{instance.role}</p>
              </div>
              <InstanceStatus status={instance.status} />
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Current:</span>
                <span className="font-medium truncate">{instance.current_task}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Branch:</span>
                <code className="font-mono text-xs bg-black/30 px-2 py-1 rounded">
                  {instance.branch}
                </code>
              </div>
              {instance.last_commit && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{instance.last_commit.hash}</span>
                    <span>•</span>
                    <span className="truncate">{instance.last_commit.message}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Blockers */}
      {data.blockers && data.blockers.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-sm mb-2 text-jarvis-danger">Active Blockers</h3>
          {data.blockers.map((blocker: any, idx: number) => (
            <div
              key={idx}
              className="bg-jarvis-danger/10 border border-jarvis-danger/30 rounded p-3 mb-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-jarvis-danger mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{blocker.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ETA: {blocker.resolution_eta}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InstanceStatus({ status }: { status: string }) {
  const statusConfig = {
    active: { label: 'Active', class: 'bg-jarvis-success/20 text-jarvis-success' },
    pending: { label: 'Pending', class: 'bg-jarvis-warning/20 text-jarvis-warning' },
    unknown: { label: 'Unknown', class: 'bg-gray-500/20 text-gray-400' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;

  return (
    <span className={`text-xs px-2 py-1 rounded ${config.class}`}>
      {config.label}
    </span>
  );
}

function MetricCard({ label, value, icon }: any) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}
