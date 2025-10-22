'use client';

/**
 * Live Lyrics Widget Component
 *
 * Displays real-time lyrics as they are transcribed during freestyle recording
 */

import { useEffect, useRef } from 'react';

interface Lyric {
  text: string;
  timestamp: number;
  confidence?: number;
}

interface LiveLyricsWidgetProps {
  lyrics: Lyric[];
  currentLine: string;
  isRecording: boolean;
}

export function LiveLyricsWidget({ lyrics, currentLine, isRecording }: LiveLyricsWidgetProps) {
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Auto-scroll to bottom when new lyrics appear
   */
  useEffect(() => {
    if (lyricsContainerRef.current) {
      lyricsContainerRef.current.scrollTop = lyricsContainerRef.current.scrollHeight;
    }
  }, [lyrics]);

  /**
   * Clear all lyrics
   */
  const handleClear = () => {
    if (confirm('Clear all lyrics? This cannot be undone.')) {
      window.location.reload(); // Simple way to reset state
    }
  };

  /**
   * Save lyrics to file
   */
  const handleSave = () => {
    if (lyrics.length === 0) {
      alert('No lyrics to save');
      return;
    }

    const lyricsText = lyrics.map((l) => l.text).join('\n');
    const blob = new Blob([lyricsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `freestyle-lyrics-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Copy lyrics to clipboard
   */
  const handleCopy = async () => {
    if (lyrics.length === 0) {
      alert('No lyrics to copy');
      return;
    }

    const lyricsText = lyrics.map((l) => l.text).join('\n');
    try {
      await navigator.clipboard.writeText(lyricsText);
      alert('Lyrics copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy lyrics:', error);
      alert('Failed to copy lyrics');
    }
  };

  return (
    <div className="live-lyrics-widget bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          📝 Live Lyrics
        </h2>
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-sm font-medium">Recording...</span>
          </div>
        )}
      </div>

      {/* Lyrics Display */}
      <div
        ref={lyricsContainerRef}
        className="flex-1 bg-gray-900 rounded-lg p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[400px]"
        style={{
          scrollBehavior: 'smooth',
        }}
      >
        {lyrics.length === 0 && !isRecording && (
          <div className="text-center text-gray-500 py-12">
            <p className="text-lg">No lyrics yet</p>
            <p className="text-sm mt-2">Start recording to see your lyrics appear here</p>
          </div>
        )}

        {isRecording && lyrics.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="animate-pulse">
              <p className="text-lg">Listening...</p>
              <p className="text-sm mt-2">Start rapping to see lyrics appear</p>
            </div>
          </div>
        )}

        {lyrics.map((lyric, index) => (
          <div
            key={index}
            className="mb-3 p-3 bg-gray-800 rounded-lg border-l-4 border-blue-500 hover:bg-gray-750 transition"
          >
            <p className="text-white text-lg leading-relaxed">{lyric.text}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">
                {new Date(lyric.timestamp).toLocaleTimeString()}
              </span>
              {lyric.confidence !== undefined && (
                <span className="text-xs text-gray-500">
                  {Math.round(lyric.confidence * 100)}% confidence
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Current Line (if recording) */}
        {isRecording && currentLine && (
          <div className="mb-3 p-3 bg-blue-900/30 rounded-lg border-l-4 border-blue-400 animate-pulse">
            <p className="text-blue-200 text-lg leading-relaxed">{currentLine}</p>
            <span className="text-xs text-blue-400">Current line...</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition flex items-center justify-center gap-2"
          disabled={lyrics.length === 0}
        >
          📋 Copy
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
          disabled={lyrics.length === 0}
        >
          💾 Save
        </button>
        <button
          onClick={handleClear}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
          disabled={lyrics.length === 0 || isRecording}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Stats */}
      {lyrics.length > 0 && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-400">{lyrics.length}</p>
              <p className="text-xs text-gray-400">Lines</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {lyrics.reduce((sum, l) => sum + l.text.split(/\s+/).length, 0)}
              </p>
              <p className="text-xs text-gray-400">Words</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {lyrics.length > 0
                  ? Math.round(
                      (lyrics.reduce((sum, l) => sum + (l.confidence || 0), 0) / lyrics.length) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-400">Avg Confidence</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
