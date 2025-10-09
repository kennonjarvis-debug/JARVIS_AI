'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Users, Zap, Brain, DollarSign, MessageSquare, LayoutDashboard } from 'lucide-react';
import BusinessMetrics from './components/BusinessMetrics';
import BusinessIntelligencePanel from './components/BusinessIntelligencePanel';
import InstanceMonitor from './components/InstanceMonitor';
import SystemHealth from './components/SystemHealth';
import WaveProgress from './components/WaveProgress';
import FinancialSummary from './components/FinancialSummary';
import ChatInterface from './components/ChatInterface';
import NotificationBell from './components/NotificationBell';
import ProactivePanel from './components/ProactivePanel';
import ToastContainer from './components/ToastNotification';

// Dynamically construct API URL based on the current hostname
const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5001';
  const hostname = window.location.hostname;
  return `http://${hostname}:5001`;
};

type Tab = 'dashboard' | 'chat';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'polling' | 'disconnected'>('disconnected');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [proactivePanelOpen, setProactivePanelOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const API_URL = getApiUrl();
    let pollInterval: NodeJS.Timeout | null = null;

    async function fetchData() {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/overview`);
        const json = await response.json();
        if (json.success) {
          setData(json.data);
          setLastUpdate(new Date().toLocaleTimeString());
          setConnectionStatus('polling');
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setConnectionStatus('disconnected');
        setLoading(false);
      }
    }

    // Fetch initial data
    fetchData();

    // Try SSE first, fall back to polling if it fails
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`${API_URL}/api/dashboard/stream`);

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        setData(newData);
        setLastUpdate(new Date().toLocaleTimeString());
        setConnectionStatus('connected');
        setLoading(false);
      };

      eventSource.onerror = (error) => {
        console.log('SSE not available, using polling fallback');
        setConnectionStatus('polling');
        if (eventSource) {
          eventSource.close();
        }
        // Fall back to polling
        if (!pollInterval) {
          pollInterval = setInterval(fetchData, 5000);
        }
      };
    } catch (error) {
      console.log('SSE initialization failed, using polling');
      setConnectionStatus('polling');
      pollInterval = setInterval(fetchData, 5000);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-jarvis-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold">Initializing Command Center...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary bg-clip-text text-transparent">
              Jarvis Command Center
            </h1>
            <p className="text-gray-400">
              Real-time Business Intelligence & Instance Monitoring
            </p>
          </div>
          <div className="text-right flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus === 'connected' && (
                  <>
                    <Activity className="w-4 h-4 text-jarvis-success animate-pulse" />
                    <span className="text-jarvis-success">Live (SSE)</span>
                  </>
                )}
                {connectionStatus === 'polling' && (
                  <>
                    <Activity className="w-4 h-4 text-jarvis-warning" />
                    <span className="text-jarvis-warning">Polling</span>
                  </>
                )}
                {connectionStatus === 'disconnected' && (
                  <>
                    <Activity className="w-4 h-4 text-jarvis-danger" />
                    <span className="text-jarvis-danger">Disconnected</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {lastUpdate}
              </p>
              {data?.instances?.updated && (
                <p className="text-xs text-gray-600 mt-0.5">
                  Data timestamp: {new Date(data.instances.updated).toLocaleTimeString()}
                </p>
              )}
            </div>
            <NotificationBell onOpenSuggestions={() => setProactivePanelOpen(true)} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white'
                : 'glass border border-jarvis-primary/20 hover:border-jarvis-primary/40'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white'
                : 'glass border border-jarvis-primary/20 hover:border-jarvis-primary/40'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Chat
          </button>
        </div>

        {/* Quick Stats - Only show on dashboard tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickStat
              icon={<Brain className="w-5 h-5" />}
              label="Instances"
              value={data?.instances?.metrics?.tasks_in_progress || 0}
              subtext="active"
              color="primary"
            />
            <QuickStat
              icon={<Activity className="w-5 h-5" />}
              label="System Health"
              value={typeof data?.health?.overall === 'string' ? data.health.overall : (data?.health?.overall?.status || 'unknown')}
              subtext={Object.keys(data?.health?.services || {}).length + ' services'}
              color="success"
            />
            <QuickStat
              icon={<TrendingUp className="w-5 h-5" />}
              label="Progress"
              value={`${data?.instances?.metrics?.overall_completion_percent || 0}%`}
              subtext="complete"
              color="secondary"
            />
            <QuickStat
              icon={<Zap className="w-5 h-5" />}
              label="Efficiency"
              value={`${data?.instances?.metrics?.efficiency_ratio || 0}x`}
              subtext="vs estimate"
              color="warning"
            />
          </div>
        )}
      </header>

      {/* Content - Switch between dashboard and chat */}
      {activeTab === 'dashboard' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Business Metrics */}
          <div className="lg:col-span-2">
            <BusinessMetrics data={data?.business} />
          </div>

          {/* Business Intelligence Panel */}
          <div className="lg:col-span-2">
            <BusinessIntelligencePanel apiUrl={getApiUrl()} />
          </div>

          {/* Instance Monitor */}
          <InstanceMonitor data={data?.instances} />

          {/* System Health */}
          <SystemHealth data={data?.health} />

          {/* Financial Summary */}
          <FinancialSummary data={data?.financial} />

          {/* Wave Progress */}
          <WaveProgress data={data?.waves} />
        </div>
      ) : (
        <ChatInterface />
      )}

      {/* Proactive System UI */}
      <ProactivePanel
        isOpen={proactivePanelOpen}
        onClose={() => setProactivePanelOpen(false)}
      />
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(toasts.filter(t => t.id !== id))}
      />
    </div>
  );
}

function QuickStat({ icon, label, value, subtext, color }: any) {
  const colorClasses = {
    primary: 'text-jarvis-primary border-jarvis-primary/20',
    secondary: 'text-jarvis-secondary border-jarvis-secondary/20',
    success: 'text-jarvis-success border-jarvis-success/20',
    warning: 'text-jarvis-warning border-jarvis-warning/20',
  };

  return (
    <div className={`glass rounded-lg p-4 border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-70">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-400">{subtext}</div>
    </div>
  );
}
