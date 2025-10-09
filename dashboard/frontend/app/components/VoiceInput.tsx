'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  continuous?: boolean;
  language?: string;
  autoStop?: number;
}

export function VoiceInput({
  onTranscript,
  onError,
  continuous = false,
  language = 'en-US',
  autoStop = 30000
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');

      const isFinal = event.results[event.results.length - 1].isFinal;
      onTranscript(transcript, isFinal);

      if (isFinal && !continuous) {
        setIsListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      onError(event.error);
      setIsListening(false);

      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    };
  }, [continuous, language, onTranscript, onError]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      onError('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      if (autoStopTimerRef.current) {
        clearTimeout(autoStopTimerRef.current);
      }
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);

        // Auto-stop after specified time
        if (autoStop) {
          autoStopTimerRef.current = setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            setIsListening(false);
          }, autoStop);
        }
      } catch (error: any) {
        console.error('Failed to start recognition:', error);
        onError(error.message);
      }
    }
  };

  // Don't render if speech recognition is not available
  if (typeof window !== 'undefined' &&
      !(window as any).SpeechRecognition &&
      !(window as any).webkitSpeechRecognition) {
    return null;
  }

  return (
    <button
      onClick={toggleListening}
      className={`p-3 rounded-lg transition-all ${
        isListening
          ? 'bg-jarvis-danger text-white animate-pulse'
          : 'bg-jarvis-dark/50 border border-jarvis-primary/20 hover:border-jarvis-primary/40'
      }`}
      title={isListening ? 'Stop recording' : 'Start voice input'}
      type="button"
    >
      {isListening ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
