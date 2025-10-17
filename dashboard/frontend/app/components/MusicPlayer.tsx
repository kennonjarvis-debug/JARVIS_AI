'use client';

/**
 * Music Player Component
 *
 * Full-featured audio player with waveform visualization, playback controls,
 * and lyrics display.
 */

import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  MoreVertical,
  Maximize2,
  Download,
} from 'lucide-react';

export interface Song {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  audioPath: string;
  coverArtPath?: string;
  lyrics?: string;
  duration?: number;
  tags?: {
    primaryGenre?: string;
    primaryMood?: string;
    energy?: number;
  };
}

interface MusicPlayerProps {
  song: Song | null;
  playlist?: Song[];
  onNext?: () => void;
  onPrevious?: () => void;
  onSongEnd?: () => void;
  className?: string;
}

export default function MusicPlayer({
  song,
  playlist = [],
  onNext,
  onPrevious,
  onSongEnd,
  className = '',
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);

  // Update audio source when song changes
  useEffect(() => {
    if (audioRef.current && song) {
      audioRef.current.src = song.audioPath;
      audioRef.current.load();
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [song]);

  // Play/Pause toggle
  const togglePlay = async () => {
    if (!audioRef.current || !song) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  // Time update handler
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Metadata loaded handler
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Song ended handler
  const handleEnded = () => {
    if (isRepeat) {
      audioRef.current?.play();
    } else {
      setIsPlaying(false);
      if (onSongEnd) {
        onSongEnd();
      } else if (onNext) {
        onNext();
      }
    }
  };

  // Seek handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Volume handler
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  // Format time
  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!song) {
    return (
      <div className={`glass rounded-lg p-6 border border-jarvis-primary/20 ${className}`}>
        <div className="text-center text-gray-400">
          <Volume2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No song selected</p>
          <p className="text-sm mt-1">Select a song from your library to start playing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass rounded-lg border border-jarvis-primary/20 ${className}`}>
      {/* Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Song Info & Album Art */}
      <div className="p-6 border-b border-jarvis-primary/10">
        <div className="flex items-start gap-4">
          {/* Album Art */}
          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-jarvis-primary/20 to-jarvis-secondary/20 flex-shrink-0">
            {song.coverArtPath ? (
              <img
                src={song.coverArtPath}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Volume2 className="w-10 h-10 text-jarvis-primary/50" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Song Details */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold truncate mb-1">{song.title}</h3>
            {song.artist && (
              <p className="text-gray-400 text-sm truncate mb-2">{song.artist}</p>
            )}
            {song.tags && (
              <div className="flex flex-wrap gap-2 text-xs">
                {song.tags.primaryGenre && (
                  <span className="px-2 py-1 rounded-full bg-jarvis-primary/20 text-jarvis-primary">
                    {song.tags.primaryGenre}
                  </span>
                )}
                {song.tags.primaryMood && (
                  <span className="px-2 py-1 rounded-full bg-jarvis-secondary/20 text-jarvis-secondary">
                    {song.tags.primaryMood}
                  </span>
                )}
                {song.tags.energy !== undefined && (
                  <span className="px-2 py-1 rounded-full bg-jarvis-warning/20 text-jarvis-warning">
                    Energy: {song.tags.energy}/10
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-lg transition-colors ${
                isLiked
                  ? 'bg-jarvis-danger/20 text-jarvis-danger'
                  : 'hover:bg-jarvis-primary/10 text-gray-400'
              }`}
              title="Like"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400"
              title="Show Lyrics"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400" title="More">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Waveform / Progress Bar */}
      <div className="px-6 pt-4">
        <div className="relative h-2 bg-jarvis-primary/10 rounded-full overflow-hidden cursor-pointer">
          {/* Progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Seek Input */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Time Display */}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 rounded-lg transition-colors ${
              isShuffle
                ? 'bg-jarvis-primary/20 text-jarvis-primary'
                : 'hover:bg-jarvis-primary/10 text-gray-400'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`p-2 rounded-lg transition-colors ${
              isRepeat
                ? 'bg-jarvis-primary/20 text-jarvis-primary'
                : 'hover:bg-jarvis-primary/10 text-gray-400'
            }`}
            title="Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevious}
            disabled={!onPrevious}
            className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            className="p-4 rounded-full bg-gradient-to-r from-jarvis-primary to-jarvis-secondary hover:opacity-90 transition-opacity"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!onNext}
            className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right Controls - Volume */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg hover:bg-jarvis-primary/10 text-gray-400"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-jarvis-primary/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-jarvis-primary"
          />
        </div>
      </div>

      {/* Lyrics Panel */}
      {showLyrics && song.lyrics && (
        <div className="border-t border-jarvis-primary/10 p-6 bg-black/20">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-lg">Lyrics</h4>
            <button
              onClick={() => setShowLyrics(false)}
              className="text-sm text-jarvis-primary hover:underline"
            >
              Hide
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto prose prose-invert prose-sm">
            <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
              {song.lyrics}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
