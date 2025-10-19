import { useState, useEffect } from 'react';
import { supabase, type User } from '../lib/supabase';
import { api, type Integration } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Twitter,
  Mail,
  Calendar,
  Plus,
  Activity,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
  Settings,
  LogOut,
  ArrowRight,
  Zap,
  Mic,
  FileText,
} from 'lucide-react';
import TwitterWidget from '../components/TwitterWidget';

interface ObservatoryData {
  observatory_id: string;
  observatory_name: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  action: string;
  title: string;
  status: string;
  created_at: string;
  metadata?: any;
}

interface Stats {
  totalPosts: number;
  totalMessages: number;
  connectedAccounts: number;
  lastActivity: string | null;
}

export default function DashboardPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [observatoryData, setObservatoryData] = useState<ObservatoryData | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalPosts: 0,
    totalMessages: 0,
    connectedAccounts: 0,
    lastActivity: null,
  });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const twitterConnected = params.get('twitter_connected');
    const twitterError = params.get('twitter_error');

    if (twitterConnected) {
      setNotification({ type: 'success', message: 'Twitter account connected successfully!' });
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard');
    } else if (twitterError) {
      setNotification({ type: 'error', message: `Failed to connect Twitter: ${twitterError}` });
      window.history.replaceState({}, '', '/dashboard');
    }

    loadDashboardData();
  }, [user.id]);

  const loadDashboardData = async () => {
    try {
      // Load observatory data
      const { data: observatories } = await supabase
        .from('observatories')
        .select('id, name')
        .limit(1)
        .single();

      if (observatories) {
        setObservatoryData({
          observatory_id: observatories.id,
          observatory_name: observatories.name,
        });

        // Load connected integrations
        const connectedIntegrations = await api.getConnectedIntegrations(observatories.id);
        setIntegrations(connectedIntegrations);

        // Load activity logs
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('observatory_id', observatories.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (logs) {
          setActivityLogs(logs);
        }

        // Load stats
        const { data: posts } = await supabase
          .from('social_posts')
          .select('id')
          .eq('observatory_id', observatories.id);

        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('observatory_id', observatories.id);

        setStats({
          totalPosts: posts?.length || 0,
          totalMessages: messages?.length || 0,
          connectedAccounts: connectedIntegrations.length,
          lastActivity: logs?.[0]?.created_at || null,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const hasNoIntegrations = integrations.length === 0;
  const hasNoActivity = activityLogs.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Jarvis AI</h1>
              <p className="text-sm text-gray-500">{observatoryData?.observatory_name || 'Your Observatory'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/settings')}
              className="text-gray-600 hover:text-gray-900"
              title="Settings"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900" title="Logout">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <Activity className="w-5 h-5" />
            )}
            <p className="font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600">
            {hasNoIntegrations
              ? 'Connect your accounts to start automating your workflow'
              : `Managing ${stats.connectedAccounts} connected account${stats.connectedAccounts !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Get Started / Connect More */}
        {hasNoIntegrations ? (
          <div className="mb-8 bg-gradient-to-br from-primary-600 to-gold-600 rounded-2xl p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Get Started with Jarvis</h3>
                <p className="text-white/90 mb-6 max-w-2xl">
                  Connect your accounts to let Jarvis handle your social media, emails, and more.
                  It takes less than 2 minutes to set up your first integration.
                </p>
                <button
                  onClick={() => navigate('/connect')}
                  className="inline-flex items-center space-x-2 bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Connect Your First Account</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <Zap className="w-24 h-24 text-white/20" />
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <button
              onClick={() => navigate('/connect')}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-primary-400 hover:bg-primary-50 transition group"
            >
              <div className="flex items-center justify-center space-x-3">
                <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary-600" />
                <span className="text-lg font-medium text-gray-600 group-hover:text-primary-600">
                  Connect More Accounts
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Zap className="w-6 h-6 text-purple-600" />}
            label="Connected Accounts"
            value={stats.connectedAccounts.toString()}
            color="purple"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
            label="Total Posts"
            value={stats.totalPosts.toString()}
            color="blue"
          />
          <StatCard
            icon={<MessageSquare className="w-6 h-6 text-green-600" />}
            label="Messages"
            value={stats.totalMessages.toString()}
            color="green"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-orange-600" />}
            label="Last Activity"
            value={stats.lastActivity ? formatTimeAgo(new Date(stats.lastActivity)) : 'No activity'}
            color="orange"
          />
        </div>

        {/* Twitter Widget - Show if Twitter is connected */}
        {integrations.find(i => i.platform.toLowerCase() === 'twitter') && (
          <div className="mb-8">
            <TwitterWidget
              integrationId={integrations.find(i => i.platform.toLowerCase() === 'twitter')!.id}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connected Accounts */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Connected Accounts</h3>
              <button
                onClick={() => navigate('/connect')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Account</span>
              </button>
            </div>

            {integrations.length > 0 ? (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <AccountCard key={integration.platform} integration={integration} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Zap className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">No accounts connected yet</p>
                <button
                  onClick={() => navigate('/connect')}
                  className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  <span>Connect your first account</span>
                </button>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>

            {activityLogs.length > 0 ? (
              <div className="space-y-4">
                {activityLogs.slice(0, 5).map((log) => (
                  <ActivityItem key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500">No activity yet</p>
                <p className="text-xs text-gray-400 mt-1">Activity will appear here once you start using Jarvis</p>
              </div>
            )}
          </div>
        </div>

        {/* Available Integrations */}
        {hasNoIntegrations && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AvailableIntegration
                icon={<Twitter className="w-6 h-6" />}
                name="Twitter / X"
                description="Post tweets, monitor mentions"
                available
                onClick={() => navigate('/connect')}
              />
              <AvailableIntegration
                icon={<MessageSquare className="w-6 h-6" />}
                name="iMessage"
                description="Auto-respond to messages intelligently"
                available
                onClick={() => navigate('/connect')}
              />
              <AvailableIntegration
                icon={<FileText className="w-6 h-6" />}
                name="Notes"
                description="Create notes from emails & reminders"
                available
                onClick={() => navigate('/connect')}
              />
              <AvailableIntegration
                icon={<Mic className="w-6 h-6" />}
                name="Voice Memos"
                description="Transcribe & organize voice memos"
                available
                onClick={() => navigate('/connect')}
              />
              <AvailableIntegration
                icon={<Mail className="w-6 h-6" />}
                name="Gmail"
                description="Send and manage emails"
                available={false}
              />
              <AvailableIntegration
                icon={<Calendar className="w-6 h-6" />}
                name="Calendar"
                description="Manage events and meetings"
                available={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }[color];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function AccountCard({ integration }: { integration: Integration }) {
  const isHealthy = integration.status === 'healthy' || integration.status === 'connected';

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
        return <Twitter className="w-5 h-5" />;
      case 'gmail':
        return <Mail className="w-5 h-5" />;
      case 'calendar':
        return <Calendar className="w-5 h-5" />;
      case 'imessage':
        return <MessageSquare className="w-5 h-5" />;
      case 'notes':
        return <FileText className="w-5 h-5" />;
      case 'voice-memos':
        return <Mic className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          isHealthy ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {getIcon(integration.platform)}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {integration.displayName || integration.name || integration.platform}
          </p>
          <p className="text-sm text-gray-500">
            {isHealthy ? 'Active' : 'Disconnected'}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isHealthy ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
        }`} />
        <span className={`text-sm ${isHealthy ? 'text-green-600' : 'text-gray-500'}`}>
          {isHealthy ? 'Connected' : 'Inactive'}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ log }: { log: ActivityLog }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-orange-600" />;
      case 'note':
        return <FileText className="w-4 h-4 text-yellow-600" />;
      case 'voice':
        return <Mic className="w-4 h-4 text-green-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 mt-0.5">
        {getIcon(log.activity_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{log.title}</p>
        <p className="text-xs text-gray-500">{formatTimeAgo(new Date(log.created_at))}</p>
      </div>
      {log.status === 'success' && (
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
      )}
    </div>
  );
}

function AvailableIntegration({
  icon,
  name,
  description,
  available,
  onClick,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  available: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      className={`p-4 border rounded-lg text-left transition ${
        available
          ? 'border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
          : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          available ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
        }`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900">{name}</p>
          {!available && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
