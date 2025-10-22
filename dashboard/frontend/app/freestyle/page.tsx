'use client';

/**
 * Freestyle Studio Page
 *
 * Real-time freestyle recording studio with:
 * - Beat player
 * - Microphone recorder
 * - Live lyrics transcription
 * - AI rhyme suggestions
 */

import { useState, useRef, useEffect } from 'react';
import { FreestyleBeatPlayer } from '../components/FreestyleBeatPlayer';
import { FreestyleMicRecorder } from '../components/FreestyleMicRecorder';
import { LiveLyricsWidget } from '../components/LiveLyricsWidget';
import { AIRhymeSuggestions } from '../components/AIRhymeSuggestions';

interface Lyric {
  text: string;
  timestamp: number;
  confidence?: number;
}

interface RhymeSuggestion {
  word: string;
  type: 'perfect' | 'near' | 'slant' | 'assonance';
  syllables: number;
  score: number;
}

export default function FreestyleStudioPage() {
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [beatId, setBeatId] = useState<string | null>(null);
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Lyrics state
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [currentLine, setCurrentLine] = useState('');

  // Rhyme suggestions state
  const [rhymeSuggestions, setRhymeSuggestions] = useState<RhymeSuggestion[]>([]);
  const [targetWord, setTargetWord] = useState('');

  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);

  // API base URL
  const AI_DAWG_URL = process.env.NEXT_PUBLIC_AI_DAWG_URL || 'http://localhost:3001';
  const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3001';

  // Get auth token (placeholder - implement proper auth)
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  /**
   * Handle beat file selection
   */
  const handleBeatFileChange = (file: File) => {
    setBeatFile(file);
    console.log('Beat file selected:', file.name);
  };

  /**
   * Start freestyle session
   */
  const startFreestyle = async () => {
    if (!beatFile) {
      alert('Please upload a beat first!');
      return;
    }

    if (!token) {
      alert('Please login first!');
      return;
    }

    try {
      // Step 1: Upload beat to AI DAWG
      const formData = new FormData();
      formData.append('beat', beatFile);

      const beatRes = await fetch(`${AI_DAWG_URL}/api/v1/freestyle/beat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!beatRes.ok) {
        throw new Error('Failed to upload beat');
      }

      const beatData = await beatRes.json();
      const uploadedBeatId = beatData.data.beatId;
      setBeatId(uploadedBeatId);

      // Step 2: Start freestyle session
      const sessionRes = await fetch(`${AI_DAWG_URL}/api/v1/freestyle/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ beatId: uploadedBeatId }),
      });

      if (!sessionRes.ok) {
        throw new Error('Failed to start session');
      }

      const sessionData = await sessionRes.json();
      const newSessionId = sessionData.data.sessionId;
      setSessionId(newSessionId);
      setIsRecording(true);

      // Step 3: Connect to WebSocket for live transcription
      const wsUrl = `${WS_BASE_URL}/ws/freestyle/${newSessionId}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for freestyle session');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        switch (data.type) {
          case 'connected':
            console.log('Freestyle session connected:', data.sessionId);
            break;

          case 'transcription':
            // Add new lyric to list
            setLyrics((prev) => [...prev, data.data]);
            setCurrentLine(data.data.text);

            // Extract last word for rhyme suggestions
            const words = data.data.text.split(/\s+/);
            const lastWord = words[words.length - 1];
            if (lastWord && lastWord.length > 2) {
              setTargetWord(lastWord);
              // Request rhyme suggestions
              ws.send(JSON.stringify({
                type: 'get_rhyme_suggestions',
                targetWord: lastWord,
              }));
            }
            break;

          case 'rhyme_suggestions':
            setRhymeSuggestions(data.suggestions || []);
            break;

          case 'audio_received':
            console.log('Audio chunk received by server');
            break;

          case 'error':
            console.error('WebSocket error:', data.error);
            alert(`Error: ${data.error}`);
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('WebSocket connection error. Check console for details.');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
      };

      wsRef.current = ws;

      console.log('Freestyle session started:', newSessionId);
    } catch (error) {
      console.error('Error starting freestyle:', error);
      alert(`Failed to start freestyle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Stop freestyle session
   */
  const stopFreestyle = async () => {
    if (!sessionId) return;

    try {
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setIsRecording(false);

      // End session and get mixed audio
      const res = await fetch(`${AI_DAWG_URL}/api/v1/freestyle/session/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to end session');
      }

      const data = await res.json();
      console.log('Freestyle session ended:', data);

      // Show results
      alert(`Session ended!\nTotal lines: ${data.data.statistics.totalLines}\nTotal words: ${data.data.statistics.totalWords}`);

      // Download mixed audio if available
      if (data.data.audioUrl) {
        window.open(data.data.audioUrl, '_blank');
      }
    } catch (error) {
      console.error('Error stopping freestyle:', error);
      alert(`Failed to stop freestyle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="freestyle-studio-container min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          🎤 AI DAWG Freestyle Studio
        </h1>
        <a
          href="/"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          ← Back to Dashboard
        </a>
      </div>

      {/* Studio Grid */}
      <div className="studio-grid grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Beat Player */}
        <FreestyleBeatPlayer
          beatFile={beatFile}
          onFileChange={handleBeatFileChange}
          isPlaying={isRecording}
        />

        {/* Live Lyrics Widget */}
        <LiveLyricsWidget
          lyrics={lyrics}
          currentLine={currentLine}
          isRecording={isRecording}
        />

        {/* Mic Recorder */}
        <FreestyleMicRecorder
          isRecording={isRecording}
          onStart={startFreestyle}
          onStop={stopFreestyle}
          wsRef={wsRef}
        />

        {/* AI Rhyme Suggestions */}
        <AIRhymeSuggestions
          suggestions={rhymeSuggestions}
          targetWord={targetWord}
          currentLyrics={lyrics}
          sessionId={sessionId}
        />
      </div>

      {/* Instructions */}
      {!isRecording && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">📝 How to Use</h2>
          <ol className="space-y-2 text-gray-300">
            <li>1. Upload a beat file (MP3, WAV, etc.)</li>
            <li>2. Click "Record" to start your freestyle session</li>
            <li>3. Rap over the beat - your lyrics will appear in real-time</li>
            <li>4. AI will suggest rhymes based on your last words</li>
            <li>5. Click "Stop" when done to get your mixed audio</li>
          </ol>
        </div>
      )}
    </div>
  );
}
