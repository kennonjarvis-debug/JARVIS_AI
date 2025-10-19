'use client';

import React, { useState, useRef, useEffect } from 'react';
import BpmKeyConfirmDialog from '../BpmKeyConfirmDialog';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  cost?: number;
  type?: string;
  audioUrl?: string;
  localPath?: string;
  metadata?: {
    genre?: string;
    tempo?: number;
    key?: string;
    instruments?: string[];
    chordProgressions?: any;
    songStructure?: any;
  };
  project?: {
    id: string;
    name: string;
    bpm?: number;
    key?: string;
  };
  track?: {
    id: string;
    name: string;
    audioPath?: string;
    audioUrl?: string;
    duration?: number;
    analysis?: {
      bpm?: number;
      key?: string;
      duration?: number;
      confidence?: {
        bpm?: number;
        key?: number;
      };
    };
  };
}

interface AIChatProps {
  conversationId?: string;
  userId?: string;
  systemPrompt?: string;
  onCostUpdate?: (cost: number) => void;
}

export default function AIChat({
  conversationId,
  userId,
  systemPrompt,
  onCostUpdate,
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // BPM/Key confirmation dialog state
  const [showBpmKeyDialog, setShowBpmKeyDialog] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<{
    detectedBpm?: number;
    detectedKey?: string;
    currentBpm?: number;
    currentKey?: string;
    projectId?: string;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const messagesToSend = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages, userMessage]
        : [...messages, userMessage];

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          conversationId,
          userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.content,
          timestamp: new Date(),
          cost: data.cost,
          type: data.type,
          audioUrl: data.audioUrl,
          localPath: data.localPath,
          metadata: data.metadata,
          project: data.project,
          track: data.track,
        };

        setMessages(prev => [...prev, assistantMessage]);

        if (data.cost) {
          setTotalCost(prev => {
            const newTotal = prev + data.cost;
            if (onCostUpdate) onCostUpdate(newTotal);
            return newTotal;
          });
        }

        // Check if we have audio analysis results
        if (data.track?.analysis) {
          const analysis = data.track.analysis;
          const currentBpm = data.project?.metadata?.bpm || data.project?.bpm;
          const currentKey = data.project?.metadata?.key || data.project?.key;

          // Show dialog if BPM or key detected
          if (analysis.bpm || analysis.key) {
            setPendingAnalysis({
              detectedBpm: analysis.bpm,
              detectedKey: analysis.key,
              currentBpm,
              currentKey,
              projectId: data.project?.id,
            });
            setShowBpmKeyDialog(true);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessageStreaming = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    // Add placeholder for streaming response
    const streamingMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const messagesToSend = systemPrompt
        ? [{ role: 'system', content: systemPrompt }, ...messages, userMessage]
        : [...messages, userMessage];

      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          userId,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.content) {
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[streamingMessageIndex] = {
                  ...newMessages[streamingMessageIndex],
                  content: newMessages[streamingMessageIndex].content + data.content,
                };
                return newMessages;
              });
            }

            if (data.done && data.cost) {
              setTotalCost(prev => {
                const newTotal = prev + data.cost;
                if (onCostUpdate) onCostUpdate(newTotal);
                return newTotal;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming message:', error);
      alert('Failed to stream message. Please try again.');
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const clearHistory = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/ai/chat/history/${conversationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages([]);
        setTotalCost(0);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const handleBpmKeyConfirm = async (updateSettings: boolean) => {
    setShowBpmKeyDialog(false);

    if (updateSettings && pendingAnalysis) {
      try {
        // Update project settings via API
        const response = await fetch(`/api/dawg-ai/projects/${pendingAnalysis.projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              bpm: pendingAnalysis.detectedBpm,
              key: pendingAnalysis.detectedKey,
            },
          }),
        });

        if (response.ok) {
          console.log('✅ Project settings updated with detected BPM/key');
          // TODO: Show success notification to user
        } else {
          console.error('Failed to update project settings');
          // TODO: Show error notification to user
        }
      } catch (error) {
        console.error('Failed to update project settings', error);
        // TODO: Show error notification to user
      }
    }

    setPendingAnalysis(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            AI Assistant
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total cost: ${totalCost.toFixed(4)}
          </p>
        </div>
        <button
          onClick={clearHistory}
          className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Clear History
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>

              {/* Music Generation: Track Widget */}
              {message.type === 'track_creation_with_music' && message.audioUrl && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* Project Info */}
                  {message.project && (
                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Project: {message.project.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {message.project.bpm && `${message.project.bpm} BPM`}
                        {message.project.key && ` • ${message.project.key}`}
                      </div>
                    </div>
                  )}

                  {/* Track Info */}
                  {message.track && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {message.track.name}
                      </div>
                      {message.track.duration && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Duration: {Math.floor(message.track.duration / 60)}:{String(message.track.duration % 60).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Player */}
                  <audio
                    controls
                    className="w-full mb-3"
                    src={message.audioUrl}
                  >
                    Your browser does not support the audio element.
                  </audio>

                  {/* Metadata */}
                  {message.metadata && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {message.metadata.genre && (
                        <div>Genre: {message.metadata.genre}</div>
                      )}
                      {message.metadata.tempo && (
                        <div>Tempo: {message.metadata.tempo} BPM</div>
                      )}
                      {message.metadata.key && (
                        <div>Key: {message.metadata.key}</div>
                      )}
                      {message.metadata.instruments && message.metadata.instruments.length > 0 && (
                        <div>Instruments: {message.metadata.instruments.join(', ')}</div>
                      )}
                      {message.metadata.chordProgressions && (
                        <div className="mt-2">
                          <div className="font-semibold">Chord Progressions:</div>
                          {message.metadata.chordProgressions.verse && (
                            <div>Verse: {message.metadata.chordProgressions.verse.join(' - ')}</div>
                          )}
                          {message.metadata.chordProgressions.chorus && (
                            <div>Chorus: {message.metadata.chordProgressions.chorus.join(' - ')}</div>
                          )}
                          {message.metadata.chordProgressions.bridge && (
                            <div>Bridge: {message.metadata.chordProgressions.bridge.join(' - ')}</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-1 text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
                {message.cost && ` • $${message.cost.toFixed(4)}`}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
          <button
            onClick={sendMessageStreaming}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send with streaming"
          >
            Stream
          </button>
        </div>
      </div>

      {/* BPM/Key confirmation dialog */}
      {showBpmKeyDialog && pendingAnalysis && (
        <BpmKeyConfirmDialog
          detectedBpm={pendingAnalysis.detectedBpm}
          detectedKey={pendingAnalysis.detectedKey}
          currentBpm={pendingAnalysis.currentBpm}
          currentKey={pendingAnalysis.currentKey}
          onConfirm={handleBpmKeyConfirm}
          onCancel={() => {
            setShowBpmKeyDialog(false);
            setPendingAnalysis(null);
          }}
        />
      )}
    </div>
  );
}
