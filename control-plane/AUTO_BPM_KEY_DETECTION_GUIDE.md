# 🎵 Automatic BPM/Key Detection - Implementation Guide

## ✅ Feature: Auto-Detect BPM & Key from Uploaded Clips

When a user uploads or generates audio, the system automatically:
1. ✅ Analyzes the audio file
2. ✅ Detects BPM (tempo) and musical key
3. ✅ Prompts user: "Update DAW transport settings?"
4. ✅ Updates project BPM/key if user confirms

---

## 🏗️ Architecture Overview

```
User uploads/generates audio
  ↓
Audio Analysis Service
  → Detects BPM from metadata
  → Detects key from metadata
  → (Future: Advanced ML analysis)
  ↓
Returns: { bpm: 140, key: "C Minor" }
  ↓
Chat/API Response includes analysis
  ↓
UI shows confirmation dialog:
  "Detected: 140 BPM, C Minor
   Update project settings?"
  ↓
User clicks "Yes" or "No"
  ↓
If Yes: PATCH /api/dawg-ai/projects/:id
  → Updates project.metadata.bpm
  → Updates project.metadata.key
  ↓
✅ DAW transport bar updates
```

---

## 📁 Files Created/Modified

### 1. **`src/services/audio-analysis.service.ts`** ✅ CREATED
**Purpose**: Detects BPM and key from audio files

**Key Methods**:
- `analyzeAudioFile(filePath)` - Full analysis from local file
- `analyzeAudioFromUrl(audioUrl)` - Download and analyze from URL
- `quickAnalyze(filePath)` - Fast metadata-only analysis
- `isValidBpm(bpm)` - Validate BPM is reasonable (40-220)
- `isValidKey(key)` - Validate key format

**How It Works**:
```typescript
// Extracts metadata from audio files
const metadata = await parseFile(filePath);

// Gets BPM from embedded metadata
if (metadata.common.bpm) {
  result.bpm = Math.round(metadata.common.bpm);
}

// Gets key from embedded metadata
if (metadata.common.key) {
  result.key = metadata.common.key;
}

// Returns analysis
return {
  bpm: 140,
  key: "C Minor",
  duration: 183,
  confidence: { bpm: 0.9, key: 0.9 }
};
```

**Dependencies**:
```json
{
  "music-metadata": "^8.1.0" // Already in your package.json
}
```

---

### 2. **`src/services/dawg-ai-projects.service.ts`** ✅ MODIFIED
**Changes**:
- Imported `audioAnalysisService`
- Updated `ProjectTrack` interface to include `analysis` field
- **TODO**: Update `addTrackToProject()` to run analysis

**Updated Interface**:
```typescript
export interface ProjectTrack {
  id: string;
  name: string;
  audioPath: string;
  audioUrl?: string;
  duration?: number;
  startTime?: number;
  metadata?: {
    genre?: string;
    bpm?: number;
    key?: string;
    chordProgressions?: any;
    instruments?: string[];
  };
  analysis?: AudioAnalysisResult; // ← NEW: Auto-detected BPM/key
  createdAt: Date;
}
```

---

## 🔧 Integration Steps (TODO)

### Step 1: Update `addTrackToProject()` Method

Location: `src/services/dawg-ai-projects.service.ts:389`

```typescript
async addTrackToProject(
  userId: string,
  projectId: string,
  track: Omit<ProjectTrack, 'id' | 'createdAt'>
): Promise<ProjectTrack> {
  try {
    const project = await this.getProject(userId, projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // ✅ NEW: Analyze audio file
    let analysis: AudioAnalysisResult | undefined;
    try {
      if (track.audioPath) {
        logger.info('🔍 Analyzing audio for BPM/key detection', { audioPath: track.audioPath });
        analysis = await audioAnalysisService.analyzeAudioFile(track.audioPath);
        logger.info('✅ Audio analysis complete', analysis);
      } else if (track.audioUrl) {
        logger.info('🔍 Analyzing audio from URL', { audioUrl: track.audioUrl });
        analysis = await audioAnalysisService.analyzeAudioFromUrl(track.audioUrl);
        logger.info('✅ Audio analysis complete', analysis);
      }
    } catch (analysisError: any) {
      logger.warn('Audio analysis failed, continuing without analysis', {
        error: analysisError.message
      });
      // Continue without analysis if it fails
    }

    // Create new track with analysis
    const newTrack: ProjectTrack = {
      ...track,
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      analysis, // ← Include analysis results
      createdAt: new Date(),
    };

    // Add to tracks array
    const tracks: ProjectTrack[] = project.metadata?.tracks || [];
    tracks.push(newTrack);

    // Update project metadata
    await this.updateProject(userId, projectId, {
      metadata: {
        ...project.metadata,
        tracks,
      },
    });

    logger.info(`✅ Track added to project with analysis`, {
      trackId: newTrack.id,
      projectId,
      detectedBpm: analysis?.bpm,
      detectedKey: analysis?.key,
    });

    return newTrack;
  } catch (error: any) {
    logger.error('Failed to add track to project:', error);
    throw new Error(`Failed to add track: ${error.message}`);
  }
}
```

---

### Step 2: Update Chat API Response

Location: `src/api/ai/chat.ts:180-195`

```typescript
// After track is created, response already includes track data
// Analysis results are automatically included in track.analysis

return res.json({
  content: `✅ Generated your ${musicIntent.genre || 'instrumental'} beat!${project ? `\n📁 Project: ${project.name}` : ''}`,
  audioUrl: musicResult.audioUrl,
  localPath: musicResult.localPath,
  metadata: musicResult.metadata,
  type: 'track_creation_with_music',
  project: project || undefined,
  track: track || undefined, // ← track.analysis contains detected BPM/key
  cost: 0.07,
  tokens: 0
});
```

---

### Step 3: Create UI Confirmation Dialog Component

Location: `web/jarvis-web/components/BpmKeyConfirmDialog.tsx` (NEW FILE)

```typescript
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
          🎵 Audio Analysis Complete
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
```

---

### Step 4: Integrate Dialog into AIChat Component

Location: `web/jarvis-web/components/ai/AIChat.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import BpmKeyConfirmDialog from '../BpmKeyConfirmDialog';

export default function AIChat({ /* ... */ }) {
  const [showBpmKeyDialog, setShowBpmKeyDialog] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<any>(null);

  const sendMessage = async () => {
    // ... existing code ...

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

      // ✅ NEW: Check if we have audio analysis
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

      // ... rest of existing code ...
    }
  };

  const handleBpmKeyConfirm = async (updateSettings: boolean) => {
    setShowBpmKeyDialog(false);

    if (updateSettings && pendingAnalysis) {
      try {
        // Update project settings
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
          console.log('✅ Project settings updated');
          // TODO: Notify user of success
        }
      } catch (error) {
        console.error('Failed to update project settings', error);
      }
    }

    setPendingAnalysis(null);
  };

  return (
    <>
      {/* Existing chat UI */}
      <div className="flex flex-col h-full">
        {/* ... existing code ... */}
      </div>

      {/* BPM/Key confirmation dialog */}
      {showBpmKeyDialog && pendingAnalysis && (
        <BpmKeyConfirmDialog
          detectedBpm={pendingAnalysis.detectedBpm}
          detectedKey={pendingAnalysis.detectedKey}
          currentBpm={pendingAnalysis.currentBpm}
          currentKey={pendingAnalysis.currentKey}
          onConfirm={handleBpmKeyConfirm}
          onCancel={() => setShowBpmKeyDialog(false)}
        />
      )}
    </>
  );
}
```

---

## 📊 Complete User Flow

### Scenario 1: Suno-Generated Beat
```
User: "Make a trap beat at 140 BPM in C minor"
  ↓
Suno generates beat (already has BPM/key in metadata)
  ↓
Track created with analysis: { bpm: 140, key: "C Minor" }
  ↓
UI shows dialog: "Detected: 140 BPM, C Minor. Update settings?"
  ↓
User clicks "Update Settings"
  ↓
✅ Project BPM → 140, Project Key → C Minor
✅ DAW transport bar updates
```

### Scenario 2: User Uploads Audio File
```
User uploads: "my-beat.mp3"
  ↓
Audio Analysis Service analyzes file
  ↓
Detects: 128 BPM, D Minor (from MP3 metadata)
  ↓
Track created with analysis
  ↓
UI shows dialog: "Detected: 128 BPM, D Minor. Update settings?"
  ↓
User clicks "Keep Current"
  ↓
✅ Project settings unchanged
✅ Track still has analysis data for reference
```

---

## 🚀 Advanced Features (Future)

### 1. ML-Based BPM Detection
For audio files without embedded metadata:
```typescript
// Using aubio library
import { Aubio } from 'aubio';

async performAdvancedAnalysis(filePath: string) {
  const aubio = new Aubio();
  const result = await aubio.getBPM(filePath);
  return { bpm: result.tempo };
}
```

### 2. Key Detection with Essentia.js
```typescript
// Using Essentia.js for key detection
import { Essentia, EssentiaWASM } from 'essentia.js';

async detectKey(audioBuffer: AudioBuffer) {
  const essentia = new Essentia(EssentiaWASM);
  const key = essentia.KeyExtractor(audioBuffer);
  return { key: `${key.key} ${key.scale}` };
}
```

### 3. Confidence Scoring
```typescript
if (analysis.confidence.bpm < 0.7) {
  // Low confidence, ask user to confirm
  ui.showWarning('BPM detection confidence is low. Please verify.');
}
```

---

## 🧪 Testing

### Test 1: Suno Generation
```bash
# Start backend
npm run dev

# In chat:
"Make a trap beat at 140 BPM"

# Expected:
# - Beat generates
# - Analysis detects 140 BPM
# - Dialog shows: "Detected: 140 BPM. Update?"
```

### Test 2: Upload with Metadata
```bash
# Create test file with BPM metadata
ffmpeg -i input.mp3 -metadata BPM=128 -metadata KEY="C Minor" output.mp3

# Upload via API:
POST /api/dawg-ai/projects/:id/tracks
{
  "name": "Test Track",
  "audioPath": "/path/to/output.mp3"
}

# Expected:
# - Analysis detects 128 BPM, C Minor
# - Returns track with analysis data
```

---

## 📝 Summary

### ✅ What's Done:
1. ✅ Audio Analysis Service created
2. ✅ ProjectTrack interface updated
3. ✅ Integration points identified

### ⚠️ What's TODO:
1. Update `addTrackToProject()` with analysis code
2. Create `BpmKeyConfirmDialog.tsx` component
3. Integrate dialog into `AIChat.tsx`
4. Test end-to-end workflow

### 🎯 Result:
When complete, **every uploaded audio clip will automatically**:
- ✅ Detect BPM and key
- ✅ Prompt user to update DAW settings
- ✅ Sync project transport bar with audio
- ✅ Store analysis for future reference

**Estimated completion time**: 1-2 hours of development + testing
