'use client';

import { useState, useEffect } from 'react';
import ProactiveSuggestionCard from './ProactiveSuggestionCard';
import { X } from 'lucide-react';

interface ProactiveSuggestion {
  id: string;
  type: 'information' | 'assistance' | 'warning' | 'opportunity' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action?: {
    type: string;
    label: string;
    payload: any;
  };
  reasoning: string;
  confidence: number;
  createdAt: Date;
}

interface ProactivePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProactivePanel({ isOpen, onClose }: ProactivePanelProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/proactive/suggestions');
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuggestions();
    }
  }, [isOpen]);

  const handleDismiss = async (suggestionId: string) => {
    try {
      await fetch(`http://localhost:5001/api/proactive/feedback/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType: 'dismissed' })
      });

      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };

  const handleAct = async (suggestionId: string) => {
    try {
      await fetch(`http://localhost:5001/api/proactive/feedback/${suggestionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType: 'acted_upon' })
      });

      setSuggestions(suggestions.filter(s => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to act on suggestion:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-gray-900 z-50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-white">Proactive Suggestions</h2>
            <p className="text-sm text-gray-400">{suggestions.length} active suggestions</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No suggestions at the moment</p>
              <p className="text-sm mt-2">Jarvis is learning your patterns...</p>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <ProactiveSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onDismiss={handleDismiss}
                onAct={handleAct}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
