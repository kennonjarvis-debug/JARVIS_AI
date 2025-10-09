'use client';

import { AlertCircle, Info, Lightbulb, AlertTriangle, Clock, X, Check } from 'lucide-react';

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

interface ProactiveSuggestionCardProps {
  suggestion: ProactiveSuggestion;
  onDismiss: (id: string) => void;
  onAct: (id: string) => void;
}

export default function ProactiveSuggestionCard({ 
  suggestion, 
  onDismiss, 
  onAct 
}: ProactiveSuggestionCardProps) {
  const getIcon = () => {
    switch (suggestion.type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'information':
        return <Info className="w-5 h-5" />;
      case 'assistance':
        return <Lightbulb className="w-5 h-5" />;
      case 'opportunity':
        return <Lightbulb className="w-5 h-5" />;
      case 'reminder':
        return <Clock className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColorClasses = () => {
    switch (suggestion.priority) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'high':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'medium':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      case 'low':
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getColorClasses()} relative`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white">{suggestion.title}</h3>
            <button
              onClick={() => onDismiss(suggestion.id)}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Dismiss suggestion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-300 mt-1">{suggestion.message}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
            <span>•</span>
            <span>{suggestion.reasoning}</span>
          </div>
          {suggestion.action && (
            <div className="mt-3">
              <button
                onClick={() => onAct(suggestion.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                {suggestion.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
