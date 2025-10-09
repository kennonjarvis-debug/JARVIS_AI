'use client';

import { Activity, Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SystemHealthProps {
  data: any;
}

export default function SystemHealth({ data }: SystemHealthProps) {
  if (!data) return null;

  const services = Object.entries(data.services || {}).map(([name, serviceData]: [string, any]) => ({
    name,
    status: typeof serviceData === 'string' ? serviceData : (serviceData?.status || 'unknown'),
    error: typeof serviceData === 'object' ? serviceData?.error : undefined,
  }));

  const overallStatus = typeof data.overall === 'string'
    ? data.overall
    : (data.overall?.status || 'unknown');

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-jarvis-success" />
        System Health
      </h2>

      {/* Overall Status */}
      <div className={`mb-6 p-4 rounded-lg border ${getStatusColors(overallStatus)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(overallStatus)}
            <div>
              <div className="font-bold">Overall Status</div>
              <div className="text-sm opacity-70 capitalize">{overallStatus}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{services.length}</div>
            <div className="text-xs opacity-70">Services</div>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between p-3 rounded border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Server className="w-4 h-4 text-gray-400" />
              <span className="font-medium capitalize text-sm">
                {service.name.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(service.status)}
              <span className="text-xs capitalize">{service.status}</span>
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No services detected</p>
        </div>
      )}
    </div>
  );
}

function getStatusIcon(status: string) {
  if (status === 'healthy') {
    return <CheckCircle className="w-5 h-5 text-jarvis-success" />;
  } else if (status === 'degraded') {
    return <AlertCircle className="w-5 h-5 text-jarvis-warning" />;
  } else if (status === 'unhealthy') {
    return <XCircle className="w-5 h-5 text-jarvis-danger" />;
  }
  return <AlertCircle className="w-5 h-5 text-gray-500" />;
}

function getStatusColors(status: string) {
  if (status === 'healthy') {
    return 'bg-jarvis-success/10 border-jarvis-success/30 text-jarvis-success';
  } else if (status === 'degraded') {
    return 'bg-jarvis-warning/10 border-jarvis-warning/30 text-jarvis-warning';
  } else if (status === 'unhealthy') {
    return 'bg-jarvis-danger/10 border-jarvis-danger/30 text-jarvis-danger';
  }
  return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
}
