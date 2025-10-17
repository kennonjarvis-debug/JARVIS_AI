'use client';

/**
 * AI Rhyme Suggestions Component
 *
 * Displays AI-powered rhyme suggestions based on current lyrics
 */

interface RhymeSuggestion {
  word: string;
  type: 'perfect' | 'near' | 'slant' | 'assonance';
  syllables: number;
  score: number;
}

interface Lyric {
  text: string;
  timestamp: number;
  confidence?: number;
}

interface AIRhymeSuggestionsProps {
  suggestions: RhymeSuggestion[];
  targetWord: string;
  currentLyrics: Lyric[];
  sessionId: string | null;
}

export function AIRhymeSuggestions({ suggestions, targetWord, currentLyrics, sessionId }: AIRhymeSuggestionsProps) {
  /**
   * Get suggestions by type
   */
  const getPerfectRhymes = () => suggestions.filter((s) => s.type === 'perfect');
  const getNearRhymes = () => suggestions.filter((s) => s.type === 'near');
  const getSlantRhymes = () => suggestions.filter((s) => s.type === 'slant' || s.type === 'assonance');

  /**
   * Get rhyme type badge color
   */
  const getRhymeTypeColor = (type: RhymeSuggestion['type']): string => {
    switch (type) {
      case 'perfect':
        return 'bg-green-600';
      case 'near':
        return 'bg-blue-600';
      case 'slant':
      case 'assonance':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  /**
   * Analyze current flow
   */
  const analyzeFlow = () => {
    if (currentLyrics.length < 2) {
      return {
        syllables: 0,
        avgLength: 0,
        tempo: 'N/A',
      };
    }

    const recentLyrics = currentLyrics.slice(-5);
    const words = recentLyrics.map((l) => l.text.split(/\s+/).length);
    const avgLength = Math.round(words.reduce((sum, w) => sum + w, 0) / words.length);

    // Simple syllable estimate: average 1.5 syllables per word
    const avgSyllables = Math.round(avgLength * 1.5);

    // Estimate tempo based on word density
    let tempo = 'Moderate';
    if (avgLength > 8) tempo = 'Fast';
    else if (avgLength < 4) tempo = 'Slow';

    return {
      syllables: avgSyllables,
      avgLength,
      tempo,
    };
  };

  const flowAnalysis = analyzeFlow();
  const perfectRhymes = getPerfectRhymes();
  const nearRhymes = getNearRhymes();
  const slantRhymes = getSlantRhymes();

  return (
    <div className="ai-rhyme-suggestions bg-gray-800 rounded-lg p-6 border border-gray-700 flex flex-col">
      <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        🤖 AI Suggestions
      </h2>

      {!sessionId && (
        <div className="text-center text-gray-500 py-12">
          <p className="text-lg">Start a session</p>
          <p className="text-sm mt-2">AI suggestions will appear as you rap</p>
        </div>
      )}

      {sessionId && !targetWord && (
        <div className="text-center text-gray-500 py-12">
          <div className="animate-pulse">
            <p className="text-lg">Listening...</p>
            <p className="text-sm mt-2">Rhyme suggestions will appear here</p>
          </div>
        </div>
      )}

      {sessionId && targetWord && (
        <>
          {/* Target Word */}
          <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-blue-500">
            <p className="text-sm text-gray-400 mb-1">Based on:</p>
            <p className="text-2xl font-bold text-blue-400">"{targetWord}"</p>
          </div>

          {/* Perfect Rhymes */}
          {perfectRhymes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <span>🎯</span> Perfect Rhymes
              </h3>
              <div className="flex flex-wrap gap-2">
                {perfectRhymes.map((rhyme, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-green-600/20 border border-green-600 rounded-lg hover:bg-green-600/30 transition cursor-pointer"
                    title={`${rhyme.syllables} syllables • Score: ${rhyme.score.toFixed(2)}`}
                  >
                    <span className="text-white font-medium">{rhyme.word}</span>
                    <span className="text-xs text-green-300 ml-2">({rhyme.syllables})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Near Rhymes */}
          {nearRhymes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <span>🎵</span> Near Rhymes
              </h3>
              <div className="flex flex-wrap gap-2">
                {nearRhymes.map((rhyme, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-blue-600/20 border border-blue-600 rounded-lg hover:bg-blue-600/30 transition cursor-pointer"
                    title={`${rhyme.syllables} syllables • Score: ${rhyme.score.toFixed(2)}`}
                  >
                    <span className="text-white font-medium">{rhyme.word}</span>
                    <span className="text-xs text-blue-300 ml-2">({rhyme.syllables})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slant Rhymes */}
          {slantRhymes.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                <span>💡</span> Slant Rhymes
              </h3>
              <div className="flex flex-wrap gap-2">
                {slantRhymes.map((rhyme, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 bg-purple-600/20 border border-purple-600 rounded-lg hover:bg-purple-600/30 transition cursor-pointer"
                    title={`${rhyme.syllables} syllables • Score: ${rhyme.score.toFixed(2)}`}
                  >
                    <span className="text-white font-medium">{rhyme.word}</span>
                    <span className="text-xs text-purple-300 ml-2">({rhyme.syllables})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {suggestions.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No rhymes found for "{targetWord}"</p>
              <p className="text-sm mt-2">Keep rapping to get more suggestions!</p>
            </div>
          )}

          {/* Flow Analysis */}
          {currentLyrics.length >= 2 && (
            <div className="mt-auto pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">📊 Flow Analysis</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-900 rounded">
                  <span className="text-xs text-gray-400">Avg Words/Line:</span>
                  <span className="text-sm font-medium text-white">{flowAnalysis.avgLength}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-900 rounded">
                  <span className="text-xs text-gray-400">Est. Syllables:</span>
                  <span className="text-sm font-medium text-white">{flowAnalysis.syllables}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-900 rounded">
                  <span className="text-xs text-gray-400">Flow Tempo:</span>
                  <span className={`text-sm font-medium ${
                    flowAnalysis.tempo === 'Fast' ? 'text-red-400' :
                    flowAnalysis.tempo === 'Slow' ? 'text-blue-400' :
                    'text-green-400'
                  }`}>
                    {flowAnalysis.tempo}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Legend */}
      {sessionId && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-2">Legend:</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span className="text-gray-400">Perfect</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-gray-400">Near</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-600 rounded"></div>
              <span className="text-gray-400">Slant</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">(#)</span>
              <span className="text-gray-400">Syllables</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
