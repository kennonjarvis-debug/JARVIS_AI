'use client';

/**
 * Folder Browser Component
 *
 * Browse smart folders and playlists with auto-organization.
 */

import { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  Music,
  TrendingUp,
  Heart,
  Clock,
  Sparkles,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  description?: string;
  type: 'genre' | 'mood' | 'activity' | 'theme' | 'era' | 'energy' | 'manual' | 'smart';
  songCount: number;
  coverImage?: string;
  autoUpdate: boolean;
  filter: any;
}

interface FolderBrowserProps {
  onFolderSelect: (folderId: string) => void;
  apiUrl?: string;
  className?: string;
}

export default function FolderBrowser({
  onFolderSelect,
  apiUrl = 'http://localhost:4000',
  className = '',
}: FolderBrowserProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  // Folder types with icons
  const folderTypes = [
    { id: 'all', label: 'All Folders', icon: Folder },
    { id: 'genre', label: 'Genres', icon: Music },
    { id: 'mood', label: 'Moods', icon: Heart },
    { id: 'activity', label: 'Activities', icon: TrendingUp },
    { id: 'smart', label: 'Smart Playlists', icon: Sparkles },
    { id: 'manual', label: 'My Playlists', icon: FolderOpen },
  ];

  useEffect(() => {
    fetchFolders();
  }, [selectedType]);

  const fetchFolders = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }

      const response = await fetch(`${apiUrl}/api/v1/library/folders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();

      if (data.success) {
        setFolders(data.data.folders || []);
      }
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      // Load mock data for demo
      setFolders(getMockFolders());
    } finally {
      setLoading(false);
    }
  };

  const getMockFolders = (): Folder[] => [
    {
      id: 'folder-1',
      name: 'Hip-Hop',
      type: 'genre',
      songCount: 42,
      autoUpdate: true,
      filter: { genres: ['hip-hop'] },
      description: 'All your hip-hop tracks',
    },
    {
      id: 'folder-2',
      name: 'Chill Vibes',
      type: 'mood',
      songCount: 28,
      autoUpdate: true,
      filter: { moods: ['chill', 'relaxed'] },
      description: 'Relaxing and laid-back songs',
    },
    {
      id: 'folder-3',
      name: 'Workout',
      type: 'activity',
      songCount: 35,
      autoUpdate: true,
      filter: { activities: ['workout', 'gym'], minEnergy: 7 },
      description: 'High-energy tracks for working out',
    },
    {
      id: 'folder-4',
      name: 'Late Night Sessions',
      type: 'smart',
      songCount: 18,
      autoUpdate: true,
      filter: { moods: ['melancholic', 'introspective'], maxEnergy: 5 },
      description: 'Thoughtful music for late nights',
    },
    {
      id: 'folder-5',
      name: 'My Favorites',
      type: 'manual',
      songCount: 67,
      autoUpdate: false,
      filter: {},
      description: 'Manually curated favorites',
    },
  ];

  const handleFolderClick = (folderId: string) => {
    setSelectedFolder(folderId);
    onFolderSelect(folderId);
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = folderTypes.find((t) => t.id === type);
    if (typeInfo) {
      const Icon = typeInfo.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <Folder className="w-4 h-4" />;
  };

  const filteredFolders =
    selectedType === 'all' ? folders : folders.filter((f) => f.type === selectedType);

  return (
    <div className={`glass rounded-lg border border-jarvis-primary/20 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-jarvis-primary/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Folders & Playlists</h2>
            <p className="text-sm text-gray-400">
              {filteredFolders.length} folder{filteredFolders.length !== 1 ? 's' : ''}
            </p>
          </div>

          <button
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-jarvis-primary to-jarvis-secondary text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            title="Create New Playlist"
          >
            <Plus className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap gap-2">
          {folderTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === type.id
                    ? 'bg-jarvis-primary text-white'
                    : 'bg-jarvis-primary/10 hover:bg-jarvis-primary/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Folder List */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 mx-auto mb-3 text-jarvis-primary animate-pulse" />
            <p className="text-gray-400">Loading folders...</p>
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="text-center py-12">
            <Folder className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400 mb-2">No folders found</p>
            <p className="text-sm text-gray-500">
              Create a playlist or upload songs to auto-generate folders
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleFolderClick(folder.id)}
                className={`group flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all ${
                  selectedFolder === folder.id
                    ? 'bg-jarvis-primary/20 border-2 border-jarvis-primary'
                    : 'hover:bg-jarvis-primary/5 border-2 border-transparent'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    folder.coverImage
                      ? 'bg-cover bg-center'
                      : 'bg-gradient-to-br from-jarvis-primary/20 to-jarvis-secondary/20'
                  }`}
                  style={
                    folder.coverImage
                      ? { backgroundImage: `url(${folder.coverImage})` }
                      : undefined
                  }
                >
                  {!folder.coverImage && getTypeIcon(folder.type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{folder.name}</h3>
                    {folder.autoUpdate && (
                      <span
                        className="flex-shrink-0 px-2 py-0.5 text-xs rounded-full bg-jarvis-secondary/20 text-jarvis-secondary"
                        title="Auto-updating"
                      >
                        <Sparkles className="w-3 h-3 inline" />
                      </span>
                    )}
                  </div>
                  {folder.description && (
                    <p className="text-sm text-gray-400 truncate mb-1">{folder.description}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Music className="w-3 h-3" />
                      {folder.songCount} song{folder.songCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {getTypeIcon(folder.type)}
                      {folder.type}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {folder.type === 'manual' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle edit
                        }}
                        className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                        className="p-2 rounded-lg hover:bg-jarvis-danger/10 text-jarvis-danger"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-5 h-5 text-jarvis-primary" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      {filteredFolders.length > 0 && (
        <div className="px-6 py-4 border-t border-jarvis-primary/10 bg-jarvis-primary/5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-jarvis-primary">
                {filteredFolders.length}
              </div>
              <div className="text-xs text-gray-400">Total Folders</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-jarvis-secondary">
                {filteredFolders.reduce((acc, f) => acc + f.songCount, 0)}
              </div>
              <div className="text-xs text-gray-400">Total Songs</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-jarvis-warning">
                {filteredFolders.filter((f) => f.autoUpdate).length}
              </div>
              <div className="text-xs text-gray-400">Auto-Updating</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
