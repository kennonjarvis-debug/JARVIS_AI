import { useState, useEffect } from 'react';
import { supabase, type User } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  MessageSquare,
  TrendingUp,
  Calendar,
  Mail,
  Settings,
  LogOut,
  Activity,
  Users,
  CheckCircle,
  Clock,
  Zap,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface ObservatoryData {
  user_id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  observatory_id: string;
  observatory_name: string;
  observatory_status: string;
  is_main: boolean;
  messages_handled: number;
  posts_created: number;
  time_saved_hours: number;
}

export default function DashboardPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [observatoryData, setObservatoryData] = useState<ObservatoryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadObservatoryData();
  }, [user.id]);

  const loadObservatoryData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_dashboard')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setObservatoryData(data);
    } catch (error) {
      console.error('Error loading observatory data:', error);
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
          <p className="text-gray-600">Loading your observatory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Bot className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Jarvis AI</h1>
              <p className="text-sm text-gray-500">Your AI Chief of Staff</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-600 hover:text-gray-900">
              <Settings className="w-6 h-6" />
            </button>
            <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold text-gray-900">
                  Welcome back, {observatoryData?.full_name || user.email?.split('@')[0]}! 👋
                </h2>
                {observatoryData?.is_admin && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gold-100 text-gold-800 text-sm font-medium rounded-full">
                    <Shield className="w-4 h-4" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-gray-600">
                {observatoryData?.is_main
                  ? "Controlling the main Jarvis Observatory"
                  : `Managing ${observatoryData?.observatory_name}`}
              </p>
            </div>
            {observatoryData?.is_main && (
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                <ExternalLink className="w-4 h-4" />
                Open Observatory
              </a>
            )}
          </div>
        </div>

        {/* Status Card - Iron Man Style */}
        <div className="bg-gradient-to-br from-primary-600 via-gold-600 to-gold-700 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <p className="text-white/80 mb-1">{observatoryData?.observatory_name}</p>
              <h3 className="text-2xl font-bold capitalize">
                {observatoryData?.observatory_status || 'Active'}
              </h3>
            </div>
            <div className="flex items-center space-x-2 glass rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-arc-400 rounded-full animate-pulse shadow-lg shadow-arc-400/50"></div>
              <span className="font-medium">Online</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={<MessageSquare className="w-6 h-6" />}
              label="Messages Handled"
              value={observatoryData?.messages_handled?.toString() || '0'}
              change={observatoryData?.messages_handled ? '+' + Math.floor(observatoryData.messages_handled * 0.05) + ' today' : 'Get started'}
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Posts Created"
              value={observatoryData?.posts_created?.toString() || '0'}
              change={observatoryData?.posts_created ? '+' + Math.floor(observatoryData.posts_created * 0.2) + ' this week' : 'Coming soon'}
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              label="Time Saved"
              value={`${observatoryData?.time_saved_hours?.toFixed(1) || '0'} hrs`}
              change="Total time saved"
            />
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <ActivityItem
                icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
                title="Auto-responded to John Doe"
                time="5 minutes ago"
                status="completed"
              />
              <ActivityItem
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                title="Posted to Twitter"
                time="1 hour ago"
                status="completed"
              />
              <ActivityItem
                icon={<Calendar className="w-5 h-5 text-green-600" />}
                title="Created calendar event"
                time="2 hours ago"
                status="completed"
              />
              <ActivityItem
                icon={<Mail className="w-5 h-5 text-orange-600" />}
                title="Processed 12 emails"
                time="3 hours ago"
                status="completed"
              />
              <ActivityItem
                icon={<Users className="w-5 h-5 text-pink-600" />}
                title="Updated contact profiles"
                time="4 hours ago"
                status="completed"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <QuickAction
                  icon={<Settings className="w-5 h-5" />}
                  label="Configure Integrations"
                />
                <QuickAction
                  icon={<MessageSquare className="w-5 h-5" />}
                  label="View Conversations"
                />
                <QuickAction
                  icon={<Users className="w-5 h-5" />}
                  label="Contact Profiles"
                />
                <QuickAction
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Analytics"
                />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6">
              <Zap className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Upgrade to Pro</h3>
              <p className="text-sm text-gray-600 mb-4">
                Unlock unlimited automations, advanced analytics, and more
              </p>
              <button className="w-full bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 transition">
                Upgrade Now
              </button>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Integration Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <IntegrationCard
              name="iMessage"
              status="connected"
              icon={<MessageSquare className="w-6 h-6" />}
            />
            <IntegrationCard
              name="Twitter"
              status="connected"
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <IntegrationCard
              name="Gmail"
              status="connected"
              icon={<Mail className="w-6 h-6" />}
            />
            <IntegrationCard
              name="Calendar"
              status="connected"
              icon={<Calendar className="w-6 h-6" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, change }: { icon: React.ReactNode; label: string; value: string; change: string }) {
  return (
    <div className="glass rounded-lg p-4 hover:bg-white/20 transition-all relative z-10">
      <div className="flex items-center space-x-2 mb-2">
        {icon}
        <span className="text-sm text-white/90">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-white/70">{change}</div>
    </div>
  );
}

function ActivityItem({ icon, title, time, status }: { icon: React.ReactNode; title: string; time: string; status: string }) {
  return (
    <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition">
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
    </div>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition text-left">
      <div className="text-gray-600">{icon}</div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
}

function IntegrationCard({ name, status, icon }: { name: string; status: string; icon: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-700">{icon}</div>
        <span className="flex items-center space-x-1 text-xs text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
          <span>{status}</span>
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900">{name}</p>
    </div>
  );
}
