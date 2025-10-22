'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

// Get API URL from environment or use default
const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
};

interface ProactiveSuggestion {
  id: string;
  type: 'information' | 'assistance' | 'warning' | 'opportunity' | 'reminder';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  confidence: number;
  createdAt: Date;
}

interface NotificationBellProps {
  onOpenSuggestions: () => void;
}

export default function NotificationBell({ onOpenSuggestions }: NotificationBellProps) {
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [hasHighPriority, setHasHighPriority] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/api/proactive/suggestions`);
        const data = await response.json();

        if (data.success) {
          const suggestions = data.data.suggestions;
          setSuggestionCount(suggestions.length);
          setHasHighPriority(
            suggestions.some((s: ProactiveSuggestion) => 
              s.priority === 'high' || s.priority === 'critical'
            )
          );
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      }
    };

    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 30000); // Poll every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onOpenSuggestions}
      className={`relative p-2 rounded-lg transition-colors ${
        hasHighPriority 
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
      }`}
      aria-label={`Notifications (${suggestionCount} active)`}
    >
      <Bell className={`w-5 h-5 ${hasHighPriority ? 'animate-pulse' : ''}`} />
      {suggestionCount > 0 && (
        <span className={`absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full ${
          hasHighPriority 
            ? 'bg-red-500 text-white' 
            : 'bg-blue-500 text-white'
        }`}>
          {suggestionCount}
        </span>
      )}
    </button>
  );
}
