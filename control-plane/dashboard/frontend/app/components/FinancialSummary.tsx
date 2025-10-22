'use client';

import { DollarSign, TrendingUp, Users, CreditCard } from 'lucide-react';

interface FinancialSummaryProps {
  data: any;
}

export default function FinancialSummary({ data }: FinancialSummaryProps) {
  if (!data) return null;

  const metrics = [
    { label: 'MRR', value: `$${(data.mrr || 0).toLocaleString()}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-jarvis-success' },
    { label: 'ARR', value: `$${(data.arr || 0).toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-jarvis-primary' },
    { label: 'Customers', value: data.customers || 0, icon: <Users className="w-4 h-4" />, color: 'text-jarvis-secondary' },
    { label: 'Revenue Today', value: `$${(data.revenue_today || 0).toLocaleString()}`, icon: <CreditCard className="w-4 h-4" />, color: 'text-jarvis-success' },
  ];

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-jarvis-success" />
        Financial Summary
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-black/30 rounded-lg p-4">
            <div className={`mb-2 ${metric.color}`}>{metric.icon}</div>
            <div className="text-2xl font-bold mb-1">{metric.value}</div>
            <div className="text-xs text-gray-400">{metric.label}</div>
          </div>
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
        <MetricRow label="CAC" value={`$${data.cac || 0}`} />
        <MetricRow label="LTV" value={`$${data.ltv || 0}`} />
        <MetricRow label="Burn Rate" value={`$${(data.burn_rate || 0).toLocaleString()}/mo`} />
        <MetricRow label="Runway" value={`${data.runway_months || 0} months`} />
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
