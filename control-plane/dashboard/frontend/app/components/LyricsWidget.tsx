'use client';

import { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, RotateCcw, Download } from 'lucide-react';

export interface LyricLine {
  id: string;
  text: string;
  timestamp: number;
  confidence?: number;
  isFinal: boolean;
}

interface LyricsWidgetProps {
  isRecording: boolean;
  onLyricsUpdated?: (lyrics: LyricLine[]) => void;
  maxLines?: number;
  autoScroll?: boolean;
}

export function LyricsWidget({
  isRecording,
  onLyricsUpdated,
  maxLines = 50,
  autoScroll = true
}: LyricsWidgetProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [currentLine, setCurrentLine] = useState<LyricLine | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const lyricsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest lyrics
  useEffect(() => {
    if (autoScroll && !isPaused && lyricsEndRef.current) {
      lyricsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [lyrics, autoScroll, isPaused]);

  // Add new lyric line
  const addLyricLine = (text: string, isFinal: boolean, confidence?: number) => {
    if (!text.trim()) return;

    const newLine: LyricLine = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      timestamp: Date.now(),
      confidence,
      isFinal
    };

    if (isFinal) {
      setLyrics(prev => {
        const updated = [...prev, newLine].slice(-maxLines);
        onLyricsUpdated?.(updated);
        return updated;
      });
      setCurrentLine(null);
    } else {
      setCurrentLine(newLine);
    }
  };

  // Update current (interim) line
  const updateCurrentLine = (text: string, confidence?: number) => {
    if (!text.trim()) {
      setCurrentLine(null);
      return;
    }

    setCurrentLine(prev => ({
      id: prev?.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      timestamp: prev?.timestamp || Date.now(),
      confidence,
      isFinal: false
    }));
  };

  // Expose methods to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__lyricsWidget = {
        addLyricLine,
        updateCurrentLine,
        clearLyrics: () => {
          setLyrics([]);
          setCurrentLine(null);
        }
      };
    }
  }, [addLyricLine]);

  const handleClear = () => {
    if (confirm('Clear all lyrics?')) {
      setLyrics([]);
      setCurrentLine(null);
    }
  };

  const handleExport = () => {
    const text = lyrics.map((line) =>
      `[${new Date(line.timestamp).toLocaleTimeString()}] ${line.text}`
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-600';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800">Live Lyrics</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-gray-600" />
            ) : (
              <Pause className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={lyrics.length === 0}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Export lyrics"
          >
            <Download className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleClear}
            disabled={lyrics.length === 0}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Clear lyrics"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Lyrics Display */}
      <div
        ref={containerRef}
        className="bg-gray-50 rounded-lg p-4 min-h-[300px] max-h-[500px] overflow-y-auto font-mono text-sm"
      >
        {lyrics.length === 0 && !currentLine ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <Music className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-center">
              {isRecording
                ? 'Listening for lyrics...'
                : 'Start recording to see live transcription'}
            </p>
          </div>
        ) : (
          <>
            {lyrics.map((line) => (
              <div
                key={line.id}
                className="mb-3 pb-2 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className={`${getConfidenceColor(line.confidence)} leading-relaxed`}>
                      {line.text}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs text-gray-400 space-y-1">
                    <span>{formatTime(line.timestamp)}</span>
                    {line.confidence !== undefined && (
                      <span className={getConfidenceColor(line.confidence)}>
                        {Math.round(line.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Current interim line */}
            {currentLine && (
              <div className="mb-3 pb-2 border-b border-gray-200 border-dashed">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-gray-400 italic leading-relaxed animate-pulse">
                      {currentLine.text}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs text-gray-300 space-y-1">
                    <span>{formatTime(currentLine.timestamp)}</span>
                    {currentLine.confidence !== undefined && (
                      <span>{Math.round(currentLine.confidence * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={lyricsEndRef} />
          </>
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>{lyrics.length} line{lyrics.length !== 1 ? 's' : ''} captured</span>
        {isRecording && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Recording
          </span>
        )}
      </div>
    </div>
  );
}
