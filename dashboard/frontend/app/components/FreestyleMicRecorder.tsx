'use client';

/**
 * Freestyle Mic Recorder Component
 *
 * Records microphone audio and streams to WebSocket for transcription
 */

import { useRef, useState, useEffect, RefObject } from 'react';

interface FreestyleMicRecorderProps {
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  wsRef: RefObject<WebSocket | null>;
}

export function FreestyleMicRecorder({ isRecording, onStart, onStop, wsRef }: FreestyleMicRecorderProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [detectedWord, setDetectedWord] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Request microphone permission
   */
  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      console.log('Microphone permission granted');

      // Setup audio analysis for waveform visualization
      setupAudioAnalyzer(stream);
    } catch (error) {
      console.error('Microphone permission denied:', error);
      alert('Microphone access is required for recording');
    }
  };

  /**
   * Setup audio analyzer for visualizat ion
   */
  const setupAudioAnalyzer = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    // Start visualization
    visualizeAudio();
  };

  /**
   * Visualize audio levels
   */
  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
    setAudioLevel(Math.min(100, average / 2.55)); // Normalize to 0-100

    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  /**
   * Start recording
   */
  const handleStart = async () => {
    if (!hasPermission) {
      await requestPermission();
      return;
    }

    if (!streamRef.current) {
      alert('Microphone stream not available');
      return;
    }

    // Start recording
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          // Send audio chunk to WebSocket
          wsRef.current.send(event.data);
        }
      };

      mediaRecorder.start(1000); // Send chunks every 1 second
      mediaRecorderRef.current = mediaRecorder;

      console.log('Recording started');
      onStart(); // Call parent handler to start session
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording');
    }
  };

  /**
   * Stop recording
   */
  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    console.log('Recording stopped');
    onStop(); // Call parent handler to end session
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /**
   * Update detected word from WebSocket messages
   */
  useEffect(() => {
    if (!wsRef.current) return;

    const ws = wsRef.current;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
          const words = data.data.text.split(/\s+/);
          const lastWord = words[words.length - 1];
          setDetectedWord(lastWord);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [wsRef]);

  return (
    <div className="mic-recorder bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        🎙️ Mic Recorder
      </h2>

      {/* Permission Request */}
      {!hasPermission && (
        <div className="text-center mb-4">
          <button
            onClick={requestPermission}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition"
          >
            🎤 Allow Microphone Access
          </button>
          <p className="text-sm text-gray-400 mt-2">
            Required for recording your freestyle
          </p>
        </div>
      )}

      {/* Recording Controls */}
      {hasPermission && (
        <>
          <div className="flex gap-4 mb-6">
            {!isRecording ? (
              <button
                onClick={handleStart}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-lg transition flex items-center justify-center gap-2"
              >
                <span className="text-2xl">🔴</span> Record
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium text-lg transition flex items-center justify-center gap-2"
              >
                <span className="text-2xl">⏹️</span> Stop
              </button>
            )}
          </div>

          {/* Waveform Visualization */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-1 h-24 bg-gray-900 rounded-lg p-4">
              {Array.from({ length: 20 }).map((_, i) => {
                const height = isRecording
                  ? Math.random() * audioLevel + 20
                  : 20;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 rounded-full transition-all duration-100"
                    style={{
                      height: `${height}%`,
                      opacity: isRecording ? 0.8 : 0.3,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${isRecording ? 'text-red-400' : 'text-gray-400'}`}>
                {isRecording ? '● Recording...' : 'Ready'}
              </span>
            </div>

            {detectedWord && (
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <span className="text-gray-400">Last Word:</span>
                <span className="font-medium text-blue-400">{detectedWord}</span>
              </div>
            )}

            {isRecording && (
              <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                <span className="text-gray-400">Audio Level:</span>
                <div className="flex-1 mx-4">
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-100"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
                <span className="text-gray-400 text-sm">{Math.round(audioLevel)}%</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Instructions */}
      {!isRecording && hasPermission && (
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            💡 <strong>Tip:</strong> Make sure you've uploaded a beat first, then click Record to start your freestyle session.
          </p>
        </div>
      )}
    </div>
  );
}
