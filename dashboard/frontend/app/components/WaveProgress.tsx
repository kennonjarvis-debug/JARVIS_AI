'use client';

import { Waves, CheckCircle, Clock, Circle } from 'lucide-react';

interface WaveProgressProps {
  data: any[];
}

export default function WaveProgress({ data }: WaveProgressProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="glass rounded-lg p-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Waves className="w-5 h-5 text-jarvis-primary" />
        Development Progress
      </h2>

      <div className="space-y-4">
        {data.map((wave) => (
          <div key={wave.id} className="border border-gray-700 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getWaveIcon(wave.status)}
                <span className="font-semibold text-sm">{wave.name}</span>
              </div>
              <span className="text-sm font-bold text-jarvis-primary">
                {wave.completion}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-jarvis-primary to-jarvis-secondary transition-all duration-500"
                  style={{ width: `${wave.completion}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Tasks:</span>{' '}
                <span className="font-medium">
                  {wave.tasks_completed}/{wave.tasks_total}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Time:</span>{' '}
                <span className="font-medium">
                  {wave.actual_hours}h / {wave.estimated_hours}h
                </span>
              </div>
              <div>
                <span className="text-gray-400">Remaining:</span>{' '}
                <span className="font-medium">{wave.remaining_hours}h</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getWaveIcon(status: string) {
  if (status === 'completed') {
    return <CheckCircle className="w-4 h-4 text-jarvis-success" />;
  } else if (status === 'in_progress') {
    return <Clock className="w-4 h-4 text-jarvis-warning animate-pulse" />;
  }
  return <Circle className="w-4 h-4 text-gray-500" />;
}
