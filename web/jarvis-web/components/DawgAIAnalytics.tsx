"use client";

import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

interface AnalyticsData {
  timeRange: {
    start: string;
    end: string;
  };
  metrics: {
    projectsCreated: number;
    workflowsExecuted: number;
    apiCallsTotal: number;
    apiCallsSuccess: number;
    apiCallsFailed: number;
    averageResponseTime: number;
  };
  trends: {
    projectActivity: Array<{ date: string; count: number }>;
    workflowActivity: Array<{ date: string; count: number }>;
  };
}

interface UsageMetrics {
  userId: string;
  period: string;
  totalProjects: number;
  activeWorkflows: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  storageUsed: number;
  storageLimit: number;
}

export default function DawgAIAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [period, setPeriod] = useState<"day" | "week" | "month">("month");
  const [loading, setLoading] = useState(true);

  // Register Chart.js components on client-side only
  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      BarElement,
      Title,
      Tooltip,
      Legend,
      Filler
    );
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const end = new Date();
      const start = new Date();
      if (period === "day") {
        start.setDate(start.getDate() - 1);
      } else if (period === "week") {
        start.setDate(start.getDate() - 7);
      } else {
        start.setDate(start.getDate() - 30);
      }

      const [analyticsRes, usageRes] = await Promise.all([
        fetch(
          `/api/dawg-ai/analytics?start=${start.toISOString()}&end=${end.toISOString()}`
        ),
        fetch(`/api/dawg-ai/analytics/usage?period=${period}`),
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.data);
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data.data);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const projectChartData = {
    labels: analytics?.trends.projectActivity.map((d) => d.date) || [],
    datasets: [
      {
        label: "Projects Created",
        data: analytics?.trends.projectActivity.map((d) => d.count) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const workflowChartData = {
    labels: analytics?.trends.workflowActivity.map((d) => d.date) || [],
    datasets: [
      {
        label: "Workflows Executed",
        data: analytics?.trends.workflowActivity.map((d) => d.count) || [],
        backgroundColor: "rgba(34, 197, 94, 0.7)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const apiSuccessRate = analytics
    ? (
        (analytics.metrics.apiCallsSuccess / analytics.metrics.apiCallsTotal) *
        100
      ).toFixed(1)
    : "0";

  const usagePercent = usage
    ? ((usage.apiCallsUsed / usage.apiCallsLimit) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="day">Last 24 Hours</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {analytics.metrics.projectsCreated}
            </div>
            <div className="text-gray-600 text-sm">Projects Created</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-green-600">
              {analytics.metrics.workflowsExecuted}
            </div>
            <div className="text-gray-600 text-sm">Workflows Executed</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">
              {analytics.metrics.apiCallsTotal}
            </div>
            <div className="text-gray-600 text-sm">API Calls</div>
            <div className="text-xs text-gray-500 mt-1">
              {apiSuccessRate}% success rate
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-orange-600">
              {analytics.metrics.averageResponseTime}ms
            </div>
            <div className="text-gray-600 text-sm">Avg Response Time</div>
          </div>
        </div>
      )}

      {/* Usage Limits */}
      {usage && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Usage Limits</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>API Calls</span>
                <span>
                  {usage.apiCallsUsed} / {usage.apiCallsLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 rounded-full h-2 transition-all"
                  style={{ width: `${usagePercent}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Storage</span>
                <span>
                  {(usage.storageUsed / 1000000).toFixed(2)} MB /{" "}
                  {(usage.storageLimit / 1000000000).toFixed(0)} GB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 rounded-full h-2 transition-all"
                  style={{
                    width: `${((usage.storageUsed / usage.storageLimit) * 100).toFixed(1)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Project Activity</h3>
          <div style={{ height: "300px" }}>
            <Line data={projectChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Workflow Executions</h3>
          <div style={{ height: "300px" }}>
            <Bar data={workflowChartData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
