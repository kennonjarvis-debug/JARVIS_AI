"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  user?: {
    name: string;
    email: string;
    plan: string;
  };
  error?: string;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTracks: number;
  totalCollaborators: number;
}

export default function DawgAIDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [statusRes, statsRes] = await Promise.all([
        fetch("/api/dawg-ai/status"),
        fetch("/api/dawg-ai/projects/stats"),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      const res = await fetch("/api/dawg-ai/sync", {
        method: "POST",
      });

      if (res.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error("Failed to sync:", error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect DAWG AI?")) {
      return;
    }

    try {
      const res = await fetch("/api/dawg-ai/disconnect", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/observatory/connect/dawg-ai");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">DAWG AI Not Connected</h1>
          <p className="text-gray-600 mb-8">
            Connect your DAWG AI account to access music production workflows,
            project management, and analytics.
          </p>
          <button
            onClick={() => router.push("/observatory/connect/dawg-ai")}
            className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Connect DAWG AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">DAWG AI Dashboard</h1>
            {status.user && (
              <p className="text-gray-600">
                Connected as {status.user.name} ({status.user.plan} plan)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Sync Now
            </button>
            <button
              onClick={handleDisconnect}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
        {status.lastSync && (
          <p className="text-sm text-gray-500 mt-2">
            Last synced: {new Date(status.lastSync).toLocaleString()}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {stats.totalProjects}
            </div>
            <div className="text-gray-600">Total Projects</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats.activeProjects}
            </div>
            <div className="text-gray-600">Active Projects</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {stats.completedProjects}
            </div>
            <div className="text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-orange-600 mb-2">
              {stats.totalTracks}
            </div>
            <div className="text-gray-600">Total Tracks</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-pink-600 mb-2">
              {stats.totalCollaborators}
            </div>
            <div className="text-gray-600">Collaborators</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => router.push("/observatory/dawg-ai/projects")}
          className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow"
        >
          <div className="text-2xl mb-2">🎵</div>
          <h3 className="text-xl font-bold mb-2">Projects</h3>
          <p className="text-gray-600">
            Manage your music production projects
          </p>
        </button>

        <button
          onClick={() => router.push("/observatory/dawg-ai/workflows")}
          className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <h3 className="text-xl font-bold mb-2">Workflows</h3>
          <p className="text-gray-600">Automate your production workflow</p>
        </button>

        <button
          onClick={() => router.push("/observatory/dawg-ai/analytics")}
          className="bg-white rounded-lg shadow-md p-6 text-left hover:shadow-lg transition-shadow"
        >
          <div className="text-2xl mb-2">📊</div>
          <h3 className="text-xl font-bold mb-2">Analytics</h3>
          <p className="text-gray-600">View insights and usage statistics</p>
        </button>
      </div>

      {/* Error State */}
      {status.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800">
            <strong>Error:</strong> {status.error}
          </p>
        </div>
      )}
    </div>
  );
}
