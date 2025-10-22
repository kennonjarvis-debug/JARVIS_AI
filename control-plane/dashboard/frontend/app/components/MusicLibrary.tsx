'use client';

/**
 * Music Library Component
 *
 * Browse and search music library with grid/list view toggle,
 * filtering by genre, mood, activity, and intelligent search.
 */

import { useState, useEffect } from 'react';
import {
  Grid3x3,
  List,
  Music,
  Play,
  Heart,
  MoreVertical,
  Search,
  Filter,
  Clock,
  TrendingUp,
  Star,
  FolderOpen,
} from 'lucide-react';
import type { Song } from './MusicPlayer';

interface MusicLibraryProps {
  onSongSelect: (song: Song) => void;
  onPlaylistCreate?: (songs: Song[]) => void;
  apiUrl?: string;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'recent' | 'title' | 'artist' | 'plays' | 'likes';
type FilterCategory = 'all' | 'genre' | 'mood' | 'activity';

export default function MusicLibrary({
  onSongSelect,
  onPlaylistCreate,
  apiUrl = 'http://localhost:4000',
  className = '',
}: MusicLibraryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Available filters (would come from API in real app)
  const genres = ['all', 'hip-hop', 'rnb', 'pop', 'rock', 'electronic', 'jazz', 'classical'];
  const moods = ['all', 'happy', 'sad', 'energetic', 'chill', 'angry', 'romantic', 'melancholic'];

  // Fetch songs from API
  useEffect(() => {
    fetchSongs();
  }, [selectedGenre, selectedMood, sortBy, searchQuery]);

  const fetchSongs = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (selectedGenre !== 'all') params.append('genres', selectedGenre);
      if (selectedMood !== 'all') params.append('moods', selectedMood);
      if (searchQuery) params.append('text', searchQuery);
      params.append('limit', '50');

      const response = await fetch(`${apiUrl}/api/v1/library/songs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }

      const data = await response.json();

      if (data.success) {
        let fetchedSongs = data.data.songs || [];

        // Apply client-side sorting
        fetchedSongs = sortSongs(fetchedSongs, sortBy);

        setSongs(fetchedSongs);
      }
    } catch (error) {
      console.error('Failed to fetch songs:', error);
      // Load mock data for demo
      setSongs(getMockSongs());
    } finally {
      setLoading(false);
    }
  };

  // Sort songs
  const sortSongs = (songsToSort: Song[], sortType: SortBy) => {
    const sorted = [...songsToSort];

    switch (sortType) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'artist':
        return sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      case 'plays':
        // Would sort by play count if available
        return sorted;
      case 'likes':
        // Would sort by like count if available
        return sorted;
      case 'recent':
      default:
        return sorted; // Already sorted by creation date from API
    }
  };

  // Toggle song selection
  const toggleSongSelection = (songId: string) => {
    const newSelected = new Set(selectedSongs);
    if (newSelected.has(songId)) {
      newSelected.delete(songId);
    } else {
      newSelected.add(songId);
    }
    setSelectedSongs(newSelected);
  };

  // Handle song play
  const handleSongPlay = (song: Song) => {
    onSongSelect(song);

    // Record play in API
    fetch(`${apiUrl}/api/v1/library/songs/${song.id}/play`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_JARVIS_TOKEN || 'test-token'}`,
      },
    }).catch(console.error);
  };

  // Get mock songs for demo
  const getMockSongs = (): Song[] => [
    {
      id: 'mock-1',
      title: 'Summer Vibes',
      artist: 'AI Composer',
      audioPath: '/mock-audio/summer-vibes.mp3',
      tags: { primaryGenre: 'pop', primaryMood: 'happy', energy: 8 },
      duration: 180,
    },
    {
      id: 'mock-2',
      title: 'Midnight Thoughts',
      artist: 'Jarvis AI',
      audioPath: '/mock-audio/midnight-thoughts.mp3',
      tags: { primaryGenre: 'rnb', primaryMood: 'melancholic', energy: 4 },
      duration: 240,
    },
    {
      id: 'mock-3',
      title: 'Urban Flow',
      artist: 'AI Dawg',
      audioPath: '/mock-audio/urban-flow.mp3',
      tags: { primaryGenre: 'hip-hop', primaryMood: 'energetic', energy: 9 },
      duration: 195,
    },
  ];

  return (
    <div className={`glass rounded-lg border border-jarvis-primary/20 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-jarvis-primary/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Music Library</h2>
            <p className="text-sm text-gray-400">
              {songs.length} song{songs.length !== 1 ? 's' : ''}
              {selectedSongs.size > 0 && ` • ${selectedSongs.size} selected`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20 text-sm focus:outline-none focus:border-jarvis-primary"
            >
              <option value="recent">Most Recent</option>
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="plays">Most Played</option>
              <option value="likes">Most Liked</option>
            </select>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-jarvis-primary/20 text-jarvis-primary'
                  : 'hover:bg-jarvis-primary/10 text-gray-400'
              }`}
              title="Filters"
            >
              <Filter className="w-5 h-5" />
            </button>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-jarvis-primary/10 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-jarvis-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-jarvis-primary text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, artist, lyrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20 focus:outline-none focus:border-jarvis-primary"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 rounded-lg bg-jarvis-primary/5 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Genre</label>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedGenre === genre
                        ? 'bg-jarvis-primary text-white'
                        : 'bg-jarvis-primary/10 hover:bg-jarvis-primary/20'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Mood</label>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedMood === mood
                        ? 'bg-jarvis-secondary text-white'
                        : 'bg-jarvis-secondary/10 hover:bg-jarvis-secondary/20'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto mb-3 text-jarvis-primary animate-pulse" />
            <p className="text-gray-400">Loading your music...</p>
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-12">
            <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-400 mb-2">No songs found</p>
            <p className="text-sm text-gray-500">
              {searchQuery || selectedGenre !== 'all' || selectedMood !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first voice memo to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {songs.map((song) => (
              <SongCardGrid
                key={song.id}
                song={song}
                isSelected={selectedSongs.has(song.id)}
                onPlay={handleSongPlay}
                onSelect={toggleSongSelection}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => (
              <SongCardList
                key={song.id}
                song={song}
                isSelected={selectedSongs.has(song.id)}
                onPlay={handleSongPlay}
                onSelect={toggleSongSelection}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Grid view song card
function SongCardGrid({
  song,
  isSelected,
  onPlay,
  onSelect,
}: {
  song: Song;
  isSelected: boolean;
  onPlay: (song: Song) => void;
  onSelect: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-jarvis-primary' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Cover Art */}
      <div className="aspect-square bg-gradient-to-br from-jarvis-primary/20 to-jarvis-secondary/20 flex items-center justify-center relative">
        {song.coverArtPath ? (
          <img src={song.coverArtPath} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="w-12 h-12 text-jarvis-primary/50" />
        )}

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <button
              onClick={() => onPlay(song)}
              className="p-3 rounded-full bg-jarvis-primary hover:bg-jarvis-primary/90 transition-colors"
            >
              <Play className="w-6 h-6 text-white ml-0.5" />
            </button>
          </div>
        )}

        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(song.id);
          }}
          className={`absolute top-2 right-2 w-5 h-5 rounded border-2 transition-all ${
            isSelected
              ? 'bg-jarvis-primary border-jarvis-primary'
              : 'border-white/50 bg-black/30 hover:border-white'
          }`}
        >
          {isSelected && <span className="text-white text-xs">✓</span>}
        </button>
      </div>

      {/* Info */}
      <div className="p-3 bg-jarvis-primary/5">
        <h4 className="font-semibold truncate text-sm mb-1">{song.title}</h4>
        {song.artist && <p className="text-xs text-gray-400 truncate">{song.artist}</p>}
        {song.tags?.primaryGenre && (
          <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-jarvis-primary/20 text-jarvis-primary">
            {song.tags.primaryGenre}
          </span>
        )}
      </div>
    </div>
  );
}

// List view song card
function SongCardList({
  song,
  isSelected,
  onPlay,
  onSelect,
}: {
  song: Song;
  isSelected: boolean;
  onPlay: (song: Song) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg hover:bg-jarvis-primary/5 transition-colors ${
        isSelected ? 'bg-jarvis-primary/10' : ''
      }`}
    >
      {/* Selection */}
      <button
        onClick={() => onSelect(song.id)}
        className={`w-5 h-5 rounded border-2 transition-all flex-shrink-0 ${
          isSelected
            ? 'bg-jarvis-primary border-jarvis-primary'
            : 'border-gray-400 hover:border-white'
        }`}
      >
        {isSelected && <span className="text-white text-xs">✓</span>}
      </button>

      {/* Play Button */}
      <button
        onClick={() => onPlay(song)}
        className="p-2 rounded-lg hover:bg-jarvis-primary/20 text-jarvis-primary flex-shrink-0"
      >
        <Play className="w-5 h-5" />
      </button>

      {/* Cover */}
      <div className="w-12 h-12 rounded bg-gradient-to-br from-jarvis-primary/20 to-jarvis-secondary/20 flex items-center justify-center flex-shrink-0">
        {song.coverArtPath ? (
          <img src={song.coverArtPath} alt={song.title} className="w-full h-full object-cover rounded" />
        ) : (
          <Music className="w-6 h-6 text-jarvis-primary/50" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold truncate">{song.title}</h4>
        {song.artist && <p className="text-sm text-gray-400 truncate">{song.artist}</p>}
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-shrink-0">
        {song.tags?.primaryGenre && (
          <span className="px-2 py-1 text-xs rounded-full bg-jarvis-primary/20 text-jarvis-primary">
            {song.tags.primaryGenre}
          </span>
        )}
        {song.tags?.primaryMood && (
          <span className="px-2 py-1 text-xs rounded-full bg-jarvis-secondary/20 text-jarvis-secondary">
            {song.tags.primaryMood}
          </span>
        )}
      </div>

      {/* Duration */}
      {song.duration && (
        <div className="text-sm text-gray-400 flex-shrink-0">
          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Actions */}
      <button className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400 flex-shrink-0">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}
