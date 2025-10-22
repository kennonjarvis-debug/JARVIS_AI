'use client';

/**
 * Freestyle Beat Player Component
 *
 * Allows users to upload and play a beat file for freestyle recording
 */

import { useRef, useState, useEffect } from 'react';

interface FreestyleBeatPlayerProps {
  beatFile: File | null;
  onFileChange: (file: File) => void;
  isPlaying: boolean;
}

export function FreestyleBeatPlayer({ beatFile, onFileChange, isPlaying }: FreestyleBeatPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac)$/i)) {
        alert('Please select a valid audio file (MP3, WAV, OGG, FLAC)');
        return;
      }

      // Create object URL for playback
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      onFileChange(file);
    }
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (localIsPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setLocalIsPlaying(!localIsPlaying);
  };

  /**
   * Handle time update
   */
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  /**
   * Handle seek
   */
  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(event.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  /**
   * Handle volume change
   */
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  /**
   * Format time (seconds to MM:SS)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Auto-play when recording starts
   */
  useEffect(() => {
    if (isPlaying && audioRef.current && audioUrl) {
      audioRef.current.play();
      setLocalIsPlaying(true);
    } else if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    }
  }, [isPlaying, audioUrl]);

  /**
   * Cleanup object URL on unmount
   */
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="beat-player bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        🎵 Beat Player
      </h2>

      {/* File Upload */}
      <div className="mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
          disabled={isPlaying}
        >
          {beatFile ? `✓ ${beatFile.name}` : '📁 Choose Beat File'}
        </button>
      </div>

      {/* Audio Player */}
      {audioUrl && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setLocalIsPlaying(false)}
            loop // Loop the beat during freestyle
          />

          {/* Play/Pause Button */}
          <div className="mb-4">
            <button
              onClick={togglePlayPause}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-lg transition flex items-center justify-center gap-2"
              disabled={isPlaying} // Disabled during recording (auto-controlled)
            >
              {localIsPlaying ? (
                <>
                  <span>⏸️</span> Pause
                </>
              ) : (
                <>
                  <span>▶️</span> Play
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume Control */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              🔊 Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </>
      )}

      {/* Instructions */}
      {!audioUrl && (
        <div className="text-center text-gray-400 py-8">
          <p>Upload a beat to get started</p>
          <p className="text-sm mt-2">Supports MP3, WAV, OGG, FLAC</p>
        </div>
      )}
    </div>
  );
}
