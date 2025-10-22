'use client';

import { useState } from 'react';
import { VoiceInput } from '../components/VoiceInput';
import { VoiceOutput } from '../components/VoiceOutput';
import { Brain, Mic, Volume2 } from 'lucide-react';

export default function VoiceDemoPage() {
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  const handleTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setFinalTranscript((prev) => prev + ' ' + transcript);
      setInterimTranscript('');
      setMessages((prev) => [...prev, transcript]);
    } else {
      setInterimTranscript(transcript);
    }
  };

  const handleError = (error: string) => {
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(null), 5000);
  };

  const clearTranscripts = () => {
    setFinalTranscript('');
    setInterimTranscript('');
    setMessages([]);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-10 h-10 text-jarvis-primary" />
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-jarvis-primary to-jarvis-secondary bg-clip-text text-transparent">
              Jarvis Voice I/O Demo
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Test voice input (Speech-to-Text) and output (Text-to-Speech)
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Instructions Card */}
        <div className="glass rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5 text-jarvis-primary" />
            How to Use
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-jarvis-primary mb-2">Voice Input (STT)</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Click microphone to start listening</li>
                <li>• Speak clearly into your mic</li>
                <li>• Real-time transcription shown</li>
                <li>• Click again to stop</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-jarvis-secondary mb-2">Voice Output (TTS)</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Click speaker icon to play</li>
                <li>• Click pause to pause playback</li>
                <li>• Click X to stop playback</li>
                <li>• Works with any message</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Voice Input Control */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Voice Input</h2>
            <div className="flex gap-3">
              <button
                onClick={clearTranscripts}
                className="px-4 py-2 rounded-lg glass-hover text-sm"
              >
                Clear
              </button>
              <VoiceInput
                onTranscript={handleTranscript}
                onError={handleError}
                continuous={true}
                language="en-US"
                autoStop={30000}
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-4 rounded-lg bg-jarvis-danger/20 border border-jarvis-danger/40">
              <p className="text-jarvis-danger text-sm">{errorMessage}</p>
            </div>
          )}

          {/* Interim Transcript (Real-time) */}
          {interimTranscript && (
            <div className="mb-4 p-4 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20">
              <p className="text-sm text-gray-400 mb-2">Speaking...</p>
              <p className="text-gray-300 italic">{interimTranscript}</p>
            </div>
          )}

          {/* Final Transcript Display */}
          <div className="min-h-[200px] p-4 rounded-lg bg-black/30 border border-gray-700">
            <p className="text-sm text-gray-400 mb-2">Transcript:</p>
            {finalTranscript ? (
              <p className="text-white leading-relaxed">{finalTranscript}</p>
            ) : (
              <p className="text-gray-500 italic">
                Click the microphone and start speaking...
              </p>
            )}
          </div>
        </div>

        {/* Text-to-Speech Demo */}
        <div className="glass rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-jarvis-secondary" />
              Voice Output (Text-to-Speech)
            </h2>
          </div>
          <p className="text-gray-300 mb-4">
            Click the speaker icon next to any message below to hear it read aloud.
          </p>
          <div className="p-4 rounded-lg bg-black/30 border border-gray-700">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-white leading-relaxed">
                  Hello! I'm Jarvis, your AI assistant. I can listen to your voice and respond with speech.
                  Try clicking the speaker button to hear me speak!
                </p>
              </div>
              <VoiceOutput
                text="Hello! I'm Jarvis, your AI assistant. I can listen to your voice and respond with speech. Try clicking the speaker button to hear me speak!"
                rate={1}
                pitch={1}
                volume={1}
              />
            </div>
          </div>
        </div>

        {/* Message History */}
        <div className="glass rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Message History</h2>
          <div className="space-y-3">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20"
                >
                  <div className="flex items-start gap-3">
                    <Mic className="w-4 h-4 text-jarvis-primary mt-1 flex-shrink-0" />
                    <p className="text-gray-200 flex-1">{message}</p>
                    <VoiceOutput text={message} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic text-center py-8">
                No messages yet. Start speaking to see them appear here.
              </p>
            )}
          </div>
        </div>

        {/* Browser Compatibility Note */}
        <div className="mt-6 p-4 rounded-lg bg-jarvis-warning/10 border border-jarvis-warning/20">
          <p className="text-sm text-gray-300">
            <strong className="text-jarvis-warning">Note:</strong> Voice recognition
            works best in Chrome and Safari. Firefox and Edge may have limited support.
          </p>
        </div>
      </div>
    </div>
  );
}
