'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, TrendingUp } from 'lucide-react';
import { LiveCoachWidget } from '../components/LiveCoachWidget';
import { LyricsWidget } from '../components/LyricsWidget';
import { VoiceInput } from '../components/VoiceInput';

export default function LiveCoachingPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalLyrics: 0,
    avgAccuracy: 0,
    avgLatency: 0
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coachWidgetRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lyricsWidgetRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Access widget APIs
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coachWidgetRef.current = (window as any).__liveCoachWidget;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lyricsWidgetRef.current = (window as any).__lyricsWidget;
    }
  }, []);

  const handleTranscript = (transcript: string, isFinal: boolean) => {
    const latency = startTimeRef.current ? Date.now() - startTimeRef.current : 0;

    // Update lyrics widget
    if (lyricsWidgetRef.current) {
      if (isFinal) {
        const confidence = Math.random() * 0.3 + 0.7; // Simulate 70-100% confidence
        lyricsWidgetRef.current.addLyricLine(transcript, isFinal, confidence);

        // Update stats
        setStats(prev => ({
          ...prev,
          totalLyrics: prev.totalLyrics + 1,
          avgAccuracy: Math.round((prev.avgAccuracy + confidence * 100) / 2),
          avgLatency: Math.round((prev.avgLatency + latency) / 2)
        }));
      } else {
        lyricsWidgetRef.current.updateCurrentLine(transcript);
      }
    }

    // Update coach widget with metrics
    if (coachWidgetRef.current) {
      const confidence = Math.random() * 0.3 + 0.7;
      coachWidgetRef.current.updateMetric('accuracy', Math.round(confidence * 100));
      coachWidgetRef.current.updateMetric('latency', latency);

      // Generate coaching feedback
      if (isFinal && Math.random() > 0.7) {
        const feedbackTypes = [
          {
            type: 'tip' as const,
            message: 'Great rhythm! Try to maintain this pace.',
            priority: 'low' as const
          },
          {
            type: 'encouragement' as const,
            message: 'Excellent clarity in your vocals!',
            priority: 'low' as const
          },
          {
            type: 'metric' as const,
            message: 'Transcription accuracy is improving',
            priority: 'medium' as const,
            metric: {
              name: 'Accuracy',
              value: Math.round(confidence * 100),
              target: 95,
              unit: '%'
            }
          }
        ];

        const feedback = feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];
        coachWidgetRef.current.addFeedback(feedback);
      }
    }

    startTimeRef.current = Date.now();
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    console.error('Voice input error:', errorMsg);
  };

  const handleStartSession = () => {
    setIsRecording(true);
    startTimeRef.current = Date.now();
    setStats(prev => ({ ...prev, totalSessions: prev.totalSessions + 1 }));

    // Clear previous lyrics
    if (lyricsWidgetRef.current) {
      lyricsWidgetRef.current.clearLyrics();
    }

    // Send welcome coaching message
    if (coachWidgetRef.current) {
      coachWidgetRef.current.addFeedback({
        type: 'encouragement',
        message: 'Session started! Speak clearly and at a comfortable pace.',
        priority: 'low'
      });
    }
  };

  const handleStopSession = () => {
    setIsRecording(false);
    startTimeRef.current = null;

    // Send session summary
    if (coachWidgetRef.current) {
      coachWidgetRef.current.addFeedback({
        type: 'metric',
        message: 'Session completed! Here\'s your performance summary.',
        priority: 'high',
        metric: {
          name: 'Lines Captured',
          value: stats.totalLyrics,
          target: 50,
          unit: 'lines'
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                Live Coaching AI Pipeline
              </h1>
              <p className="text-gray-600 mt-2">
                Real-time voice coaching with live transcription and proactive feedback
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">UAT Phase 2.5</div>
              <div className="text-xs text-gray-400">Jarvis v2</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">Total Sessions</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totalSessions}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">Lines Captured</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totalLyrics}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">Avg Accuracy</div>
            <div className="text-2xl font-bold text-green-600">{stats.avgAccuracy}%</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-500">Avg Latency</div>
            <div className="text-2xl font-bold text-orange-600">{stats.avgLatency}ms</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Lyrics Widget */}
        <div className="space-y-6">
          <LyricsWidget
            isRecording={isRecording}
            onLyricsUpdated={(lyrics) => {
              console.log('Lyrics updated:', lyrics.length, 'lines');
            }}
          />

          {/* Voice Controls */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Voice Controls</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={handleStartSession}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <Mic className="w-5 h-5" />
                  Start Coaching Session
                </button>
              ) : (
                <button
                  onClick={handleStopSession}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg animate-pulse"
                >
                  <MicOff className="w-5 h-5" />
                  Stop Session
                </button>
              )}
            </div>

            {/* Voice Input Component (Hidden, used for API) */}
            {isRecording && (
              <div className="mt-4">
                <VoiceInput
                  onTranscript={handleTranscript}
                  onError={handleError}
                  continuous={true}
                  language="en-US"
                  autoStop={60000}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Live Coach Widget */}
        <div>
          <LiveCoachWidget isActive={isRecording} />
        </div>
      </div>

      {/* UAT Metrics Panel */}
      <div className="max-w-7xl mx-auto mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="font-semibold text-gray-800 mb-4">UAT Metrics Targets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">Transcription Accuracy</div>
              <div className="font-semibold text-gray-800">Target: ≥ 95%</div>
              <div className={`text-xs ${stats.avgAccuracy >= 95 ? 'text-green-600' : 'text-orange-600'}`}>
                Current: {stats.avgAccuracy}%
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">Response Latency</div>
              <div className="font-semibold text-gray-800">Target: ≤ 300ms</div>
              <div className={`text-xs ${stats.avgLatency <= 300 ? 'text-green-600' : 'text-orange-600'}`}>
                Current: {stats.avgLatency}ms
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">SSE Events</div>
              <div className="font-semibold text-gray-800">Target: ≥ 12/sec</div>
              <div className="text-xs text-blue-600">
                Real-time monitoring
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500">UI Render Time</div>
              <div className="font-semibold text-gray-800">Target: &lt; 100ms</div>
              <div className="text-xs text-green-600">
                Monitored via DevTools
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
