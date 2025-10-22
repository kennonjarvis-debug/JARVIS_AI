'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, CheckCircle, AlertCircle, TrendingUp, Zap } from 'lucide-react';

export interface CoachingFeedback {
  id: string;
  type: 'tip' | 'correction' | 'encouragement' | 'metric';
  message: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
  metric?: {
    name: string;
    value: number;
    target: number;
    unit: string;
  };
}

interface LiveCoachWidgetProps {
  isActive: boolean;
  onFeedbackReceived?: (feedback: CoachingFeedback) => void;
  maxFeedbackItems?: number;
}

export function LiveCoachWidget({
  isActive,
  onFeedbackReceived,
  maxFeedbackItems = 5
}: LiveCoachWidgetProps) {
  const [feedbackItems, setFeedbackItems] = useState<CoachingFeedback[]>([]);
  const [metrics, setMetrics] = useState({
    accuracy: 0,
    latency: 0,
    eventsPerSecond: 0,
    activeTime: 0
  });
  const startTimeRef = useRef<number | null>(null);
  const eventCountRef = useRef(0);
  const eventWindowRef = useRef<number[]>([]);

  useEffect(() => {
    if (isActive && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    } else if (!isActive) {
      startTimeRef.current = null;
      eventCountRef.current = 0;
      eventWindowRef.current = [];
    }
  }, [isActive]);

  // Metric tracking
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      if (startTimeRef.current) {
        const activeTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Calculate events per second (rolling 5-second window)
        const now = Date.now();
        eventWindowRef.current = eventWindowRef.current.filter(t => now - t < 5000);
        const eventsPerSecond = eventWindowRef.current.length / 5;

        setMetrics(prev => ({
          ...prev,
          activeTime,
          eventsPerSecond: Math.round(eventsPerSecond * 10) / 10
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const addFeedback = (feedback: Omit<CoachingFeedback, 'id' | 'timestamp'>) => {
    const newFeedback: CoachingFeedback = {
      ...feedback,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    setFeedbackItems(prev => {
      const updated = [newFeedback, ...prev].slice(0, maxFeedbackItems);
      return updated;
    });

    // Track event for metrics
    eventCountRef.current++;
    eventWindowRef.current.push(Date.now());

    onFeedbackReceived?.(newFeedback);
  };

  const updateMetric = (name: string, value: number) => {
    setMetrics(prev => ({ ...prev, [name]: value }));
  };

  // Expose methods to parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__liveCoachWidget = {
        addFeedback,
        updateMetric
      };
    }
  }, [addFeedback]);

  const getFeedbackIcon = (type: CoachingFeedback['type']) => {
    switch (type) {
      case 'tip':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'correction':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'encouragement':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'metric':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: CoachingFeedback['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-500 bg-red-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="font-semibold text-gray-800">Live Coaching</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
          <span className="text-xs text-gray-500">{isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </div>

      {/* Metrics Dashboard */}
      {isActive && (
        <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-gray-500">Accuracy</div>
            <div className="text-lg font-bold text-gray-800">{metrics.accuracy}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Latency</div>
            <div className="text-lg font-bold text-gray-800">{metrics.latency}ms</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Events/sec</div>
            <div className="text-lg font-bold text-gray-800">{metrics.eventsPerSecond}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Active Time</div>
            <div className="text-lg font-bold text-gray-800">{formatTime(metrics.activeTime)}</div>
          </div>
        </div>
      )}

      {/* Feedback Stream */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {feedbackItems.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isActive ? 'Listening for coaching opportunities...' : 'Start a session to receive live coaching'}
            </p>
          </div>
        ) : (
          feedbackItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border-l-4 ${getPriorityColor(item.priority)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-2">
                {getFeedbackIcon(item.type)}
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{item.message}</p>
                  {item.metric && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min((item.metric.value / item.metric.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {item.metric.value}/{item.metric.target} {item.metric.unit}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Footer */}
      {isActive && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{feedbackItems.length} feedback items</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Real-time coaching active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
