'use client';

import React from 'react';

interface BpmKeyConfirmDialogProps {
  detectedBpm?: number;
  detectedKey?: string;
  currentBpm?: number;
  currentKey?: string;
  onConfirm: (updateSettings: boolean) => void;
  onCancel: () => void;
}

export default function BpmKeyConfirmDialog({
  detectedBpm,
  detectedKey,
  currentBpm,
  currentKey,
  onConfirm,
  onCancel,
}: BpmKeyConfirmDialogProps) {
  const hasChanges = detectedBpm !== currentBpm || detectedKey !== currentKey;

  if (!hasChanges) {
    // No changes needed, close immediately
    React.useEffect(() => {
      onCancel();
    }, []);
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Audio Analysis Complete
        </h3>

        <div className="space-y-3 mb-6">
          {detectedBpm && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">BPM:</span>
              <div className="flex items-center space-x-2">
                {currentBpm && (
                  <>
                    <span className="text-sm text-gray-500 line-through">{currentBpm}</span>
                    <span className="text-sm text-gray-400">→</span>
                  </>
                )}
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {detectedBpm}
                </span>
              </div>
            </div>
          )}

          {detectedKey && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Key:</span>
              <div className="flex items-center space-x-2">
                {currentKey && (
                  <>
                    <span className="text-sm text-gray-500 line-through">{currentKey}</span>
                    <span className="text-sm text-gray-400">→</span>
                  </>
                )}
                <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {detectedKey}
                </span>
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Update project transport settings to match this audio?
        </p>

        <div className="flex space-x-3">
          <button
            onClick={() => onConfirm(false)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Keep Current
          </button>
          <button
            onClick={() => onConfirm(true)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Update Settings
          </button>
        </div>
      </div>
    </div>
  );
}
