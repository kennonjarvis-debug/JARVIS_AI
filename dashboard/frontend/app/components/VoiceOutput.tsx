'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface VoiceOutputProps {
  text: string;
  autoPlay?: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function VoiceOutput({
  text,
  autoPlay = false,
  rate = 1,
  pitch = 1,
  volume = 1
}: VoiceOutputProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    synthRef.current = window.speechSynthesis;

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (autoPlay && text && synthRef.current) {
      speak();
    }
  }, [text, autoPlay]);

  const speak = () => {
    if (!synthRef.current || !text) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const stop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak();
    }
  };

  // Don't render if speech synthesis is not available
  if (typeof window !== 'undefined' && !window.speechSynthesis) {
    return null;
  }

  return (
    <button
      onClick={toggleSpeak}
      className="p-1 hover:bg-white/10 rounded transition-colors"
      title={isSpeaking ? 'Stop speaking' : 'Read message aloud'}
      type="button"
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4 text-jarvis-warning" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  );
}
