import { useState, useEffect } from 'react';
import { Twitter, TrendingUp, Users, Heart, MessageCircle, Repeat2, Eye, Loader } from 'lucide-react';
import { api } from '../lib/api';

interface TwitterMetrics {
  account: {
    username: string;
    name: string;
    verified: boolean;
    profile_image: string;
  };
  metrics: {
    followers: number;
    following: number;
    tweets: number;
  };
  engagement: {
    rate: number;
    total: number;
  };
  recent_tweets: Array<{
    id: string;
    text: string;
    created_at: string;
    public_metrics: {
      like_count: number;
      retweet_count: number;
      reply_count: number;
      impression_count: number;
    };
  }>;
}

interface TwitterWidgetProps {
  integrationId: string;
}

export default function TwitterWidget({ integrationId }: TwitterWidgetProps) {
  const [metrics, setMetrics] = useState<TwitterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [integrationId]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/integrations/${integrationId}/metrics`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Twitter metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error loading Twitter metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Twitter className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Twitter Metrics</h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Twitter className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Twitter Metrics</h3>
        </div>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Failed to load metrics'}</p>
          <button
            onClick={loadMetrics}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <img
            src={metrics.account.profile_image}
            alt={metrics.account.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">{metrics.account.name}</h3>
              {metrics.account.verified && (
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">@{metrics.account.username}</p>
          </div>
        </div>
        <Twitter className="w-6 h-6 text-blue-600" />
      </div>

      {/* Account Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-blue-600 mr-1" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.metrics.followers)}
          </p>
          <p className="text-xs text-gray-600">Followers</p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600 mr-1" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(metrics.metrics.tweets)}
          </p>
          <p className="text-xs text-gray-600">Tweets</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Heart className="w-4 h-4 text-green-600 mr-1" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.engagement.rate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600">Engagement</p>
        </div>
      </div>

      {/* Recent Tweets */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
        <div className="space-y-3">
          {metrics.recent_tweets.slice(0, 3).map((tweet) => (
            <div key={tweet.id} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-900 mb-2 line-clamp-2">{tweet.text}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  {formatNumber(tweet.public_metrics.like_count)}
                </span>
                <span className="flex items-center">
                  <Repeat2 className="w-3 h-3 mr-1" />
                  {formatNumber(tweet.public_metrics.retweet_count)}
                </span>
                <span className="flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {formatNumber(tweet.public_metrics.reply_count)}
                </span>
                {tweet.public_metrics.impression_count > 0 && (
                  <span className="flex items-center">
                    <Eye className="w-3 h-3 mr-1" />
                    {formatNumber(tweet.public_metrics.impression_count)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadMetrics}
        className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition"
      >
        Refresh Metrics
      </button>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
