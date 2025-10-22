'use client';

import React, { useState } from 'react';

export default function DocumentAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const analyzeDocument = async () => {
    if (!file) return;

    setAnalyzing(true);

    try {
      // In production, upload file and get URL
      const mockDocumentUrl = 'https://example.com/document.pdf';

      const response = await fetch('/api/ai/analyze/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentUrl: mockDocumentUrl,
          prompt: 'Extract key information from this document',
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error analyzing document:', error);
      alert('Failed to analyze document');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Document Analyzer
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Upload Document
        </label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,image/*"
          onChange={handleFileChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
        />
      </div>

      {file && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>File:</strong> {file.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      <button
        onClick={analyzeDocument}
        disabled={!file || analyzing}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {analyzing ? 'Analyzing...' : 'Analyze Document'}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
            Analysis Results
          </h3>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Extracted Text:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {result.text}
              </p>
            </div>
            {result.metadata && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Metadata:
                </p>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {JSON.stringify(result.metadata, null, 2)}
                </pre>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cost: ${result.cost?.toFixed(4) || '0.0000'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
