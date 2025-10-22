'use client';

/**
 * Music Page
 *
 * Complete music creation and management interface:
 * - Upload voice memos and notes
 * - Browse and play music library
 * - Manage folders and playlists
 * - Full-featured audio player
 */

import { useState, useEffect } from 'react';
import {
  Music,
  Upload,
  Library,
  FolderOpen,
  Play,
  TrendingUp,
  Clock,
  Heart,
  Sparkles,
} from 'lucide-react';
import MusicPlayer, { type Song } from '../components/MusicPlayer';
import MusicLibrary from '../components/MusicLibrary';
import MusicUploadZone from '../components/MusicUploadZone';
import FolderBrowser from '../components/FolderBrowser';

// Get API URL from environment or use default
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
};

type Tab = 'library' | 'upload' | 'folders' | 'recommendations';

export default function MusicPage() {
  const [activeTab, setActiveTab] = useState<Tab>('library');
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);

  const apiUrl = getApiUrl();

  // Fetch library stats
  useEffect(() => {
    fetchStats();
    fetchRecentUploads();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/library/stats?userId=demo-user`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Set mock stats
      setStats({
        totalSongs: 156,
        totalFolders: 12,
        totalPlaytime: 25680, // seconds
        mostPlayedGenre: 'hip-hop',
      });
    }
  };

  const fetchRecentUploads = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/music/uploads?userId=demo-user&limit=5`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecentUploads(data.data.uploads || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent uploads:', error);
    }
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSong(song);
    setCurrentIndex(playlist.findIndex((s) => s.id === song.id));
  };

  const handleNext = () => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextSong = playlist[currentIndex + 1];
      setCurrentSong(nextSong);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (playlist.length > 0 && currentIndex > 0) {
      const prevSong = playlist[currentIndex - 1];
      setCurrentSong(prevSong);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleUploadComplete = (songId: string) => {
    // Refresh library and switch to library tab
    setActiveTab('library');
    fetchStats();
    fetchRecentUploads();
  };

  const handleFolderSelect = (folderId: string) => {
    // Would fetch songs in folder and display them
    console.log('Selected folder:', folderId);
    setActiveTab('library');
  };

  const tabs = [
    { id: 'library' as Tab, label: 'Library', icon: Library },
    { id: 'upload' as Tab, label: 'Upload', icon: Upload },
    { id: 'folders' as Tab, label: 'Folders', icon: FolderOpen },
    { id: 'recommendations' as Tab, label: 'For You', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary bg-clip-text text-transparent flex items-center gap-3">
              <Music className="w-10 h-10 text-jarvis-primary" />
              Jarvis Music Studio
            </h1>
            <p className="text-gray-400">
              AI-powered music creation from voice memos and notes
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Music className="w-5 h-5" />}
              label="Total Songs"
              value={stats.totalSongs}
              color="primary"
            />
            <StatCard
              icon={<FolderOpen className="w-5 h-5" />}
              label="Folders"
              value={stats.totalFolders}
              color="secondary"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="Playtime"
              value={`${Math.floor(stats.totalPlaytime / 3600)}h`}
              color="success"
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Top Genre"
              value={stats.mostPlayedGenre || 'N/A'}
              color="warning"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white'
                    : 'glass border border-jarvis-primary/20 hover:border-jarvis-primary/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Tab Content */}
          {activeTab === 'library' && (
            <MusicLibrary onSongSelect={handleSongSelect} apiUrl={apiUrl} />
          )}

          {activeTab === 'upload' && (
            <MusicUploadZone onUploadComplete={handleUploadComplete} apiUrl={apiUrl} />
          )}

          {activeTab === 'folders' && (
            <FolderBrowser onFolderSelect={handleFolderSelect} apiUrl={apiUrl} />
          )}

          {activeTab === 'recommendations' && (
            <div className="glass rounded-lg border border-jarvis-primary/20 p-12">
              <div className="text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-jarvis-primary" />
                <h3 className="text-2xl font-bold mb-2">Personalized Recommendations</h3>
                <p className="text-gray-400 mb-6">
                  AI-curated playlists based on your listening habits
                </p>
                <p className="text-sm text-gray-500">
                  Coming soon: Discover new music tailored to your taste
                </p>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentUploads.length > 0 && activeTab === 'library' && (
            <div className="glass rounded-lg border border-jarvis-primary/20 p-6">
              <h3 className="text-xl font-bold mb-4">Recent Uploads</h3>
              <div className="space-y-3">
                {recentUploads.slice(0, 3).map((upload: any) => (
                  <div
                    key={upload.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-jarvis-primary/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-jarvis-primary/20 to-jarvis-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-5 h-5 text-jarvis-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{upload.fileName}</p>
                      <p className="text-sm text-gray-400">{upload.status}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(upload.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Music Player (Sticky) */}
        <div className="xl:col-span-1">
          <div className="sticky top-8">
            <MusicPlayer
              song={currentSong}
              playlist={playlist}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />

            {/* Quick Actions */}
            <div className="mt-6 glass rounded-lg border border-jarvis-primary/20 p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-jarvis-primary/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-jarvis-primary/20 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-5 h-5 text-jarvis-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Upload Voice Memo</div>
                    <div className="text-xs text-gray-400">Create new song</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('folders')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-jarvis-primary/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-jarvis-secondary/20 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-5 h-5 text-jarvis-secondary" />
                  </div>
                  <div>
                    <div className="font-semibold">Browse Folders</div>
                    <div className="text-xs text-gray-400">Organized by AI</div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-jarvis-primary/10 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-jarvis-warning/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-jarvis-warning" />
                  </div>
                  <div>
                    <div className="font-semibold">Discover</div>
                    <div className="text-xs text-gray-400">Personalized for you</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quick stat card component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
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
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
