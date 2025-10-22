# Parallel Development Master Plan
## JARVIS AI + DAWG AI Complete Build Strategy

**Date**: October 15, 2025
**Status**: Gap Analysis Complete
**Development Mode**: Parallel Claude Code Instances

---

## Executive Summary

This document provides a comprehensive audit of both JARVIS and DAWG AI codebases, identifies gaps against specifications, and defines parallel development prompts for multiple Claude Code instances working simultaneously.

### Current State

**JARVIS (~/Jarvis-v0)**: ✅ 75% Complete
- ✅ Foundation (Stage 0): Complete
- ✅ Approval Queue (Stage 1): Complete
- ✅ Marketing Agent (Stage 2): Complete
- ⚠️ Multi-Agent LangGraph (Stage 3): Partial
- ⚠️ Advanced Marketing (Stage 4): Missing
- ⚠️ Sales Automation (Stage 5): Basic only
- ⚠️ Operations Automation (Stage 6): Basic only
- ⚠️ Support Automation (Stage 7): Basic only
- ❌ Full Integration (Stage 8): Not started

**DAWG AI (~/Development/DAWG_AI)**: ✅ 30% Complete
- ✅ Audio Analysis Backend: Complete
- ✅ MIDI Generation: Complete
- ✅ Mixing AI: Basic complete
- ⚠️ Jarvis Integration: Partial
- ❌ Web Audio Frontend: Not started
- ❌ Voice Interface: Not started
- ❌ Piano Roll Editor: Not started
- ❌ Track Manager: Not started
- ❌ Effects Processor: Not started

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                    JARVIS AI SYSTEM                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Marketing   │  │    Sales     │  │  Operations  │   │
│  │    Agent     │  │    Agent     │  │    Agent     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │            │
│  ┌──────▼──────────────────▼──────────────────▼────────┐ │
│  │         LangGraph Orchestrator (Stage 3)             │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↕                                │
│  ┌────────────────────────────────────────────────────── │
│  │     Observatory Dashboard (Svelte - Port 5174)        │
│  └────────────────────────────────────────────────────── │
└────────────────────────┬───────────────────────────────────┘
                         │
                         │ DAWG Monitor Agent
                         ↓
┌────────────────────────────────────────────────────────────┐
│                    DAWG AI SYSTEM                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │        Browser DAW Interface (Svelte)                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐      │ │
│  │  │   Track    │ │    MIDI    │ │  Effects   │      │ │
│  │  │  Manager   │ │   Editor   │ │  Processor │      │ │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘      │ │
│  │        │              │              │              │ │
│  │  ┌─────▼──────────────▼──────────────▼──────────┐  │ │
│  │  │       Web Audio Engine (Tone.js)             │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↕                                │
│  ┌────────────────────────────────────────────────────── │
│  │    Voice Interface (Deepgram + Claude)               │
│  └────────────────────────────────────────────────────── │
│                           ↕                                │
│  ┌────────────────────────────────────────────────────── │
│  │    AI Backend (FastAPI - Port 9000) ✅               │
│  │  - Audio Analysis (librosa)                          │
│  │  - MIDI Generation (pretty-midi)                     │
│  │  - Mixing AI                                         │
│  └────────────────────────────────────────────────────── │
└────────────────────────────────────────────────────────────┘
```

---

## Gap Analysis

### JARVIS Gaps (Against Complete Build Guide)

#### ❌ Stage 3: Multi-Agent System (HIGH PRIORITY)
**Current**: Basic orchestrator exists, but no LangGraph implementation
**Missing**:
- LangGraph state machine
- Supervisor node for task routing
- Agent collaboration workflows
- Inter-agent communication
- Task delegation system

#### ❌ Stage 4: Advanced Marketing (MEDIUM PRIORITY)
**Current**: Basic social posting works
**Missing**:
- Advanced content calendar
- Social media monitoring
- Competitor analysis
- A/B testing framework
- Campaign analytics

#### ⚠️ Stage 5: Sales Automation (MEDIUM PRIORITY)
**Current**: Basic sales agent exists
**Missing**:
- Lead scoring refinement
- Email sequence automation
- Conversion funnel tracking
- Churn prediction
- Revenue forecasting

#### ⚠️ Stage 6: Operations Automation (MEDIUM PRIORITY)
**Current**: Basic operations agent exists
**Missing**:
- Advanced analytics dashboards
- Workflow automation
- System health monitoring
- Cost optimization
- Performance benchmarking

#### ⚠️ Stage 7: Customer Support (MEDIUM PRIORITY)
**Current**: Basic support agent exists
**Missing**:
- Ticket routing intelligence
- Sentiment analysis
- Knowledge base integration
- Escalation workflows
- CSAT tracking

#### ❌ Stage 8: Full Integration (HIGH PRIORITY)
**Current**: Not started
**Missing**:
- Advanced memory with embeddings
- Predictive analytics
- Multi-modal processing
- Advanced collaboration
- Enterprise features

### DAWG AI Gaps (Against Technical Design Document)

#### ❌ Frontend DAW Interface (CRITICAL)
**Status**: Not started
**Missing**:
- Svelte 5 application structure
- Design system components
- Track manager UI
- Timeline/arrangement view
- Mixer interface
- Effects rack UI

#### ❌ Web Audio Engine (CRITICAL)
**Status**: Not started
**Missing**:
- Tone.js integration
- Multi-track audio engine
- AudioWorklet processors
- Effects chain routing
- Master bus processing
- Recording system

#### ❌ MIDI Piano Roll Editor (HIGH PRIORITY)
**Status**: Not started
**Missing**:
- Piano roll canvas
- Note editing
- Velocity controls
- Quantization
- Scale snapping
- Ghost notes

#### ❌ Voice Control Interface (HIGH PRIORITY)
**Status**: Basic Jarvis integration exists
**Missing**:
- Deepgram STT integration
- Claude NLU for DAW commands
- ElevenLabs TTS responses
- Visual feedback components
- Command history
- Multimodal UI

#### ❌ Effects Processor (HIGH PRIORITY)
**Status**: Not started
**Missing**:
- EQ (parametric, graphic)
- Compressor/limiter
- Reverb/delay
- Distortion/saturation
- Modulation effects
- Effects routing system

#### ❌ AI Features Integration (MEDIUM PRIORITY)
**Status**: Backend complete, frontend not started
**Missing**:
- Beat generator UI
- AI vocal coach UI
- Mixing assistant UI
- Chord/melody generator UI
- Lyric generator integration

---

## Parallel Development Strategy

### Team Structure (6 Claude Code Instances)

```
Instance 1 → JARVIS Backend & Observatory ✅ (Already Complete)
Instance 2 → DAWG Frontend Foundation
Instance 3 → DAWG Audio Engine & Effects
Instance 4 → DAWG MIDI Editor & Voice Interface
Instance 5 → JARVIS Multi-Agent LangGraph
Instance 6 → Integration & Testing
```

### Git Worktree Setup

```bash
# JARVIS worktrees
cd ~/Jarvis-v0
git worktree add ../jarvis-langgraph langgraph-feature
git worktree add ../jarvis-advanced-agents advanced-agents
git worktree add ../jarvis-integration integration

# DAWG AI worktrees
cd ~/Development/DAWG_AI
git init  # If not already a repo
git worktree add ../dawg-frontend frontend
git worktree add ../dawg-audio-engine audio-engine
git worktree add ../dawg-midi-voice midi-voice
```

---

## Instance-Specific Prompts

### 🔷 Instance 1: JARVIS Backend & Observatory ✅

**Status**: COMPLETE
**Location**: `~/Jarvis-v0/`
**No action required** - This was completed in previous session

**Deliverables**:
- ✅ Database schema for agent activities
- ✅ REST API (9 endpoints)
- ✅ Agent orchestrator with 4 mock agents
- ✅ Decision framework (THREE-tier)
- ✅ Observatory dashboard with real-time updates

---

### 🔶 Instance 2: DAWG Frontend Foundation

**Working Directory**: `~/Development/dawg-frontend/`
**Duration**: 2-3 weeks
**Priority**: CRITICAL

#### Prompt for Instance 2

```markdown
# DAWG AI - Frontend Foundation & Design System

You are building the browser-based DAW frontend for DAWG AI, an AI-powered music production application.

## Context

DAWG AI is a revolutionary browser-based DAW that combines professional music production with conversational AI. The backend AI engine is already running on localhost:9000 with audio analysis, MIDI generation, and mixing AI complete.

Your task is to build the complete frontend foundation.

## Technology Stack

- **Framework**: Svelte 5.x with TypeScript (strict mode)
- **Build**: Vite 6.x
- **Styling**: Tailwind CSS + custom design system
- **State**: Zustand <1KB state management
- **Audio**: Integration points for Tone.js (will be added by Instance 3)

## Task 1: Project Setup

Create a production-ready Svelte application:

```bash
npm create vite@latest dawg-frontend -- --template svelte-ts
cd dawg-frontend
npm install
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npm install zustand
npx tailwindcss init -p
```

## Task 2: Design System Implementation

Create a comprehensive design system in `src/design-system/`:

### Color Palette
```css
:root {
  /* Dark mode primary */
  --bg-primary: #1a1a1a;
  --bg-secondary: #242424;
  --bg-tertiary: #2d2d2d;

  /* Accents */
  --accent-cyan: #00d9ff;
  --accent-magenta: #ff006e;
  --accent-yellow: #ffbe0b;

  /* UI Elements */
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-tertiary: #666666;

  /* Borders */
  --border-primary: #404040;
  --border-secondary: #2d2d2d;
}
```

### Components to Create

#### Atoms (Basic UI Elements)
1. **Button.svelte** - Primary, secondary, danger, ghost variants
2. **Knob.svelte** - Rotary control (0-127 range)
3. **Fader.svelte** - Vertical slider
4. **Toggle.svelte** - On/off switch
5. **Input.svelte** - Text input with validation
6. **Label.svelte** - Consistent labeling
7. **Icon.svelte** - SVG icon system

#### Molecules (Composite Components)
1. **FaderChannel.svelte** - Fader + meter + label
2. **TrackHeader.svelte** - Track name + controls
3. **TransportControls.svelte** - Play, stop, record buttons
4. **VUMeter.svelte** - Audio level visualization
5. **EffectSlot.svelte** - Effect with bypass/remove

#### Organisms (Complex Components)
1. **Mixer.svelte** - Multi-channel mixing desk
2. **Timeline.svelte** - Horizontal time ruler
3. **PianoRollGrid.svelte** - Piano roll foundation (notes added by Instance 4)
4. **EffectsRack.svelte** - Vertical effects chain

## Task 3: Application Layout

Create main layout structure in `src/routes/`:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TransportBar from '$lib/components/TransportBar.svelte';
</script>

<div class="app-layout">
  <Header />
  <div class="main-content">
    <Sidebar />
    <div class="workspace">
      <slot />
    </div>
  </div>
  <TransportBar />
</div>

<style>
  .app-layout {
    display: grid;
    grid-template-rows: 60px 1fr 80px;
    height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .main-content {
    display: grid;
    grid-template-columns: 250px 1fr;
    overflow: hidden;
  }
</style>
```

## Task 4: State Management

Create global state store in `src/stores/`:

```typescript
// src/stores/project.ts
import { create } from 'zustand';

interface Track {
  id: string;
  name: string;
  type: 'audio' | 'midi';
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  color: string;
}

interface ProjectState {
  projectName: string;
  bpm: number;
  timeSignature: [number, number];
  tracks: Track[];
  selectedTrackId: string | null;

  // Actions
  addTrack: (type: 'audio' | 'midi') => void;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  selectTrack: (id: string) => void;
  setBPM: (bpm: number) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectName: 'Untitled Project',
  bpm: 120,
  timeSignature: [4, 4],
  tracks: [],
  selectedTrackId: null,

  addTrack: (type) => set((state) => ({
    tracks: [...state.tracks, {
      id: crypto.randomUUID(),
      name: `${type} Track ${state.tracks.length + 1}`,
      type,
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      color: getRandomColor()
    }]
  })),

  removeTrack: (id) => set((state) => ({
    tracks: state.tracks.filter(t => t.id !== id)
  })),

  updateTrack: (id, updates) => set((state) => ({
    tracks: state.tracks.map(t =>
      t.id === id ? { ...t, ...updates } : t
    )
  })),

  selectTrack: (id) => set({ selectedTrackId: id }),

  setBPM: (bpm) => set({ bpm })
}));
```

## Task 5: API Client for Backend

Create API client in `src/lib/api/`:

```typescript
// src/lib/api/client.ts
const API_BASE = 'http://localhost:9000/api/v1';

export class DAWGClient {
  async generateMIDI(params: {
    style: 'drums' | 'melody' | 'bass';
    tempo: number;
    bars: number;
  }): Promise<string> {
    const response = await fetch(
      `${API_BASE}/generate/midi?` + new URLSearchParams(params as any)
    , { method: 'POST' });

    const data = await response.json();
    return data.midi_base64;
  }

  async generateBassline(params: {
    key: string;
    scale: string;
    bars: number;
    tempo: number;
  }): Promise<string> {
    const response = await fetch(
      `${API_BASE}/generate/bassline?` + new URLSearchParams(params as any),
      { method: 'POST' }
    );

    const data = await response.json();
    return data.midi_base64;
  }

  async getMixingSuggestions(): Promise<any> {
    const response = await fetch(`${API_BASE}/mixing/suggest`, {
      method: 'POST'
    });

    return response.json();
  }
}

export const dawgAPI = new DAWGClient();
```

## Task 6: Responsive Layout

Implement responsive design:
- Desktop-first (1920x1080 primary)
- Tablet support (1024x768)
- Minimum width: 1280px
- Vertical and horizontal layouts

## Task 7: Accessibility

Implement WCAG 2.1 AA:
- Keyboard navigation (Tab, Arrow keys, Spacebar)
- Focus indicators
- ARIA labels
- Screen reader support
- High contrast mode

## Task 8: Performance Optimization

- Code splitting (dynamic imports)
- Lazy load components
- Virtual scrolling for large lists
- Debounced user inputs
- RequestAnimationFrame for animations

## Success Criteria

✅ Design system with 20+ reusable components
✅ Application layout with Header, Sidebar, Workspace, Transport
✅ Zustand state management operational
✅ API client connects to localhost:9000
✅ Responsive design works on desktop and tablet
✅ WCAG 2.1 AA accessibility compliance
✅ <2s initial page load
✅ 60 FPS UI animations
✅ TypeScript strict mode with no errors

## Output Structure

```
dawg-frontend/
├── src/
│   ├── design-system/
│   │   ├── atoms/
│   │   │   ├── Button.svelte
│   │   │   ├── Knob.svelte
│   │   │   ├── Fader.svelte
│   │   │   └── ...
│   │   ├── molecules/
│   │   │   ├── FaderChannel.svelte
│   │   │   ├── TrackHeader.svelte
│   │   │   └── ...
│   │   └── organisms/
│   │       ├── Mixer.svelte
│   │       ├── Timeline.svelte
│   │       └── ...
│   ├── stores/
│   │   ├── project.ts
│   │   ├── transport.ts
│   │   └── ui.ts
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── utils/
│   │       ├── audio.ts
│   │       └── midi.ts
│   ├── routes/
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   └── app.css (Tailwind imports)
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Testing

Create Vitest tests for:
- All atoms, molecules, organisms
- State management actions
- API client methods
- Utility functions

## Documentation

Create README.md with:
- Setup instructions
- Component documentation
- State management guide
- API integration examples

Build a production-ready, accessible, performant foundation for DAWG AI.
```

---

### 🔸 Instance 3: DAWG Audio Engine & Effects

**Working Directory**: `~/Development/dawg-audio-engine/`
**Duration**: 2-3 weeks
**Priority**: CRITICAL

#### Prompt for Instance 3

```markdown
# DAWG AI - Web Audio Engine & Effects System

You are building the core audio processing engine for DAWG AI using Web Audio API and Tone.js.

## Context

DAWG AI frontend foundation is being built by Instance 2. Your job is to create the audio engine that powers multi-track recording, playback, effects processing, and mixing.

## Technology Stack

- **Core**: Web Audio API + Tone.js v15.1.22
- **Playback**: Howler.js v2.2.4
- **Visualization**: WaveSurfer.js v7.10.x
- **DSP**: AudioWorklet + WASM (Rust-compiled)
- **Workers**: Web Workers for heavy computation

## Task 1: Core Audio Engine

Create `src/audio/` directory with core engine:

```typescript
// src/audio/AudioEngine.ts
import * as Tone from 'tone';

export class AudioEngine {
  private context: AudioContext;
  private tracks: Map<string, AudioTrack>;
  private masterBus: MasterBus;
  private initialized: boolean = false;

  constructor() {
    this.context = Tone.getContext().rawContext as AudioContext;
    this.tracks = new Map();
    this.masterBus = new MasterBus(this.context);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await Tone.start();
    console.log('Audio Engine initialized');
    this.initialized = true;
  }

  createTrack(id: string, type: 'audio' | 'midi'): AudioTrack {
    const track = new AudioTrack(id, type, this.context);
    track.connect(this.masterBus.input);
    this.tracks.set(id, track);
    return track;
  }

  removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track) {
      track.dispose();
      this.tracks.delete(id);
    }
  }

  getTrack(id: string): AudioTrack | undefined {
    return this.tracks.get(id);
  }

  async startRecording(trackId: string): Promise<void> {
    const track = this.tracks.get(trackId);
    if (track) {
      await track.startRecording();
    }
  }

  async stopRecording(trackId: string): Promise<Blob> {
    const track = this.tracks.get(trackId);
    if (!track) throw new Error('Track not found');
    return await track.stopRecording();
  }

  play(): void {
    Tone.getTransport().start();
  }

  stop(): void {
    Tone.getTransport().stop();
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  setBPM(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  setPosition(bars: number, beats: number, sixteenths: number): void {
    Tone.getTransport().position = `${bars}:${beats}:${sixteenths}`;
  }

  async exportMix(): Promise<AudioBuffer> {
    // Render offline
    const duration = Tone.getTransport().seconds;
    const offline = new Tone.Offline((time) => {
      // Render all tracks
      this.tracks.forEach(track => track.play());
    }, duration);

    return await offline.render();
  }
}
```

## Task 2: Audio Track Implementation

```typescript
// src/audio/AudioTrack.ts
import * as Tone from 'tone';
import { EffectsChain } from './EffectsChain';

export class AudioTrack {
  id: string;
  type: 'audio' | 'midi';
  player: Tone.Player | Tone.Sampler | null = null;
  effectsChain: EffectsChain;
  volume: Tone.Volume;
  pan: Tone.Panner;
  solo: boolean = false;
  mute: boolean = false;
  recorder: Tone.Recorder | null = null;

  constructor(id: string, type: 'audio' | 'midi', context: AudioContext) {
    this.id = id;
    this.type = type;
    this.effectsChain = new EffectsChain();
    this.volume = new Tone.Volume(0);
    this.pan = new Tone.Panner(0);

    // Signal chain: Player → Effects → Volume → Pan → Output
    if (this.player) {
      this.player.chain(
        this.effectsChain.input,
        this.effectsChain.output,
        this.volume,
        this.pan
      );
    }
  }

  async loadAudio(url: string | AudioBuffer): Promise<void> {
    this.player = new Tone.Player(url).toDestination();
    await this.player.load(url);
  }

  async startRecording(): Promise<void> {
    this.recorder = new Tone.Recorder();
    const mic = new Tone.UserMedia();
    await mic.open();
    mic.connect(this.recorder);
    this.recorder.start();
  }

  async stopRecording(): Promise<Blob> {
    if (!this.recorder) throw new Error('Not recording');
    const recording = await this.recorder.stop();
    return recording;
  }

  setVolume(db: number): void {
    this.volume.volume.value = db;
  }

  setPan(value: number): void {
    this.pan.pan.value = value; // -1 to 1
  }

  setMute(muted: boolean): void {
    this.mute = muted;
    this.volume.mute = muted;
  }

  setSolo(soloed: boolean): void {
    this.solo = soloed;
    // Solo logic handled by engine
  }

  addEffect(effect: any): void {
    this.effectsChain.addEffect(effect);
  }

  play(): void {
    if (this.player instanceof Tone.Player) {
      this.player.start();
    }
  }

  stop(): void {
    if (this.player instanceof Tone.Player) {
      this.player.stop();
    }
  }

  connect(destination: AudioNode): void {
    this.pan.connect(destination);
  }

  dispose(): void {
    this.player?.dispose();
    this.effectsChain.dispose();
    this.volume.dispose();
    this.pan.dispose();
    this.recorder?.dispose();
  }
}
```

## Task 3: Effects Chain System

Create comprehensive effects library:

```typescript
// src/audio/effects/index.ts
export { EQ3 } from './EQ3';
export { Compressor } from './Compressor';
export { Reverb } from './Reverb';
export { Delay } from './Delay';
export { Distortion } from './Distortion';
export { Limiter } from './Limiter';
export { Gate } from './Gate';

// src/audio/EffectsChain.ts
import * as Tone from 'tone';

export class EffectsChain {
  private effects: Tone.Effect[] = [];
  input: Tone.Gain;
  output: Tone.Gain;

  constructor() {
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);
    this.reconnect();
  }

  addEffect(effect: Tone.Effect, index?: number): void {
    if (index !== undefined) {
      this.effects.splice(index, 0, effect);
    } else {
      this.effects.push(effect);
    }
    this.reconnect();
  }

  removeEffect(index: number): void {
    const effect = this.effects[index];
    if (effect) {
      effect.dispose();
      this.effects.splice(index, 1);
      this.reconnect();
    }
  }

  moveEffect(fromIndex: number, toIndex: number): void {
    const [effect] = this.effects.splice(fromIndex, 1);
    this.effects.splice(toIndex, 0, effect);
    this.reconnect();
  }

  private reconnect(): void {
    // Disconnect all
    this.input.disconnect();
    this.effects.forEach(e => e.disconnect());

    // Reconnect in chain
    let prev: Tone.ToneAudioNode = this.input;
    this.effects.forEach(effect => {
      prev.connect(effect);
      prev = effect;
    });
    prev.connect(this.output);
  }

  dispose(): void {
    this.effects.forEach(e => e.dispose());
    this.input.dispose();
    this.output.dispose();
  }
}
```

## Task 4: Built-in Effects

Implement these effects using Tone.js:

1. **EQ3** (3-band parametric)
2. **Compressor** (dynamic range control)
3. **Reverb** (room, hall, plate algorithms)
4. **Delay** (standard, ping-pong, tape)
5. **Distortion** (soft-clip, hard-clip, bit-crush)
6. **Limiter** (brick-wall limiting)
7. **Gate** (noise gate)
8. **Chorus** (modulation effect)
9. **Phaser** (phase shifting)
10. **Filter** (low-pass, high-pass, band-pass)

Each effect should have:
- Preset system
- Wet/dry mix control
- Bypass toggle
- Parameter automation support

## Task 5: Master Bus

```typescript
// src/audio/MasterBus.ts
import * as Tone from 'tone';

export class MasterBus {
  input: Tone.Gain;
  limiter: Tone.Limiter;
  meter: Tone.Meter;
  analyser: AnalyserNode;

  constructor(context: AudioContext) {
    this.input = new Tone.Gain(1);
    this.limiter = new Tone.Limiter(-0.5); // -0.5dB threshold
    this.meter = new Tone.Meter();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 2048;

    // Chain: Input → Limiter → Meter → Destination
    this.input.chain(this.limiter, this.meter, Tone.getDestination());

    // Also connect to analyser for visualization
    this.limiter.connect(this.analyser);
  }

  getLevel(): number {
    return this.meter.getValue() as number;
  }

  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }
}
```

## Task 6: Audio Worklet for Pitch Detection

Create WASM-powered pitch detection:

```javascript
// src/audio/worklets/pitch-detector.worklet.js
class PitchDetectorProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0][0];
    if (!input) return true;

    // Collect samples
    for (let i = 0; i < input.length; i++) {
      this.buffer[this.writeIndex] = input[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }

    // Detect pitch every buffer
    if (this.writeIndex === 0) {
      const pitch = this.detectPitch(this.buffer);
      this.port.postMessage({ pitch });
    }

    return true;
  }

  detectPitch(buffer) {
    // YIN algorithm for pitch detection
    // ... implementation
    return 440.0; // A4 placeholder
  }
}

registerProcessor('pitch-detector', PitchDetectorProcessor);
```

## Task 7: Performance Optimization

- **Latency**: Target <10ms round-trip
- **Buffer Size**: 128 samples (recording), 512 (mixing)
- **Memory**: Efficient buffer pooling
- **CPU**: Offload to Web Workers
- **Rendering**: Use OffscreenCanvas for waveforms

## Success Criteria

✅ Multi-track audio playback synchronized
✅ Recording with low latency (<10ms)
✅ 10+ built-in effects operational
✅ Effects chain routing works
✅ Master bus with limiter and metering
✅ Export/bounce functionality
✅ Pitch detection via AudioWorklet
✅ <10ms latency in recording mode
✅ <1GB memory for typical 10-minute project
✅ Comprehensive test coverage

## Integration with Frontend (Instance 2)

Expose audio engine to Svelte components via store:

```typescript
// src/stores/audio.ts
import { AudioEngine } from '../audio/AudioEngine';
import { writable } from 'svelte/store';

const engine = new AudioEngine();

export const audioEngine = {
  subscribe: writable(engine).subscribe,
  initialize: () => engine.initialize(),
  createTrack: (id: string, type: 'audio' | 'midi') => engine.createTrack(id, type),
  // ... expose all methods
};
```

Build a professional-grade audio engine that rivals desktop DAWs in quality and performance.
```

---

### 🔹 Instance 4: DAWG MIDI Editor & Voice Interface

**Working Directory**: `~/Development/dawg-midi-voice/`
**Duration**: 2-3 weeks
**Priority**: HIGH

#### Prompt for Instance 4

```markdown
# DAWG AI - MIDI Piano Roll & Voice Control Interface

You are building the MIDI editor and voice control system for DAWG AI.

## Context

Instances 2 and 3 are building the frontend foundation and audio engine. Your job is to create:
1. A professional piano roll MIDI editor
2. Voice control interface for hands-free DAW operation

## Technology Stack

- **MIDI**: Tone.js MIDI components
- **Canvas**: HTML5 Canvas for piano roll
- **STT**: Deepgram Nova-3 API
- **LLM**: Claude 3.5 Sonnet (via Anthropic API)
- **TTS**: ElevenLabs v3 API
- **Memory**: LangChain for conversation context

## Task 1: Piano Roll Editor

Create a fully-featured MIDI editor in `src/components/PianoRoll/`:

```svelte
<!-- PianoRoll.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { useProjectStore } from '$lib/stores/project';
  import { PianoRollEngine } from './PianoRollEngine';

  let canvas: HTMLCanvasElement;
  let engine: PianoRollEngine;

  const project = useProjectStore();

  onMount(() => {
    engine = new PianoRollEngine(canvas, {
      pixelsPerBeat: 100,
      noteHeight: 10,
      scrollX: 0,
      scrollY: 0,
      zoom: 1.0
    });

    engine.on('noteAdded', (note) => {
      // Handle note addition
    });

    engine.on('noteModified', (note) => {
      // Handle note modification
    });

    return () => engine.dispose();
  });
</script>

<div class="piano-roll-container">
  <div class="piano-keys">
    <!-- Piano key sidebar -->
  </div>
  <canvas
    bind:this={canvas}
    class="piano-roll-canvas"
    width={1600}
    height={800}
  />
  <div class="piano-roll-toolbar">
    <!-- Quantization, scale snap, velocity controls -->
  </div>
</div>

<style>
  .piano-roll-container {
    display: grid;
    grid-template-columns: 60px 1fr;
    grid-template-rows: 1fr 60px;
    height: 100%;
  }

  .piano-roll-canvas {
    background: var(--bg-secondary);
    cursor: crosshair;
  }
</style>
```

### Piano Roll Features

1. **Note Editing**:
   - Click to add notes
   - Drag to move/resize
   - Double-click to delete
   - Copy/paste selection
   - Velocity editing (vertical drag)

2. **Quantization**:
   - 1/4, 1/8, 1/16, 1/32, triplets
   - Humanize (random timing offsets)
   - Strength (50%, 75%, 100%)

3. **Scale Snapping**:
   - Major, minor, pentatonic, blues, etc.
   - Auto-snap to scale notes
   - Highlight scale degrees

4. **Ghost Notes**:
   - Show notes from other tracks (dimmed)
   - Reference harmony/rhythm

5. **Selection**:
   - Rectangle selection
   - Shift+click for multi-select
   - Ctrl+A for select all

## Task 2: Piano Roll Engine

```typescript
// src/components/PianoRoll/PianoRollEngine.ts
import { EventEmitter } from 'events';

interface Note {
  id: string;
  pitch: number;       // 0-127 (C0 to G9)
  time: number;        // Start time in beats
  duration: number;    // Duration in beats
  velocity: number;    // 0-127
}

interface PianoRollConfig {
  pixelsPerBeat: number;
  noteHeight: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export class PianoRollEngine extends EventEmitter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: Note[] = [];
  private config: PianoRollConfig;
  private selectedNotes: Set<string> = new Set();
  private dragMode: 'move' | 'resize' | 'select' | null = null;

  constructor(canvas: HTMLCanvasElement, config: PianoRollConfig) {
    super();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;

    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));

    // Keyboard shortcuts
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoordinates(e);
    const clickedNote = this.getNoteAt(x, y);

    if (clickedNote) {
      if (this.isResizeHandle(clickedNote, x)) {
        this.dragMode = 'resize';
      } else {
        this.dragMode = 'move';
        if (!this.selectedNotes.has(clickedNote.id)) {
          this.selectedNotes.clear();
          this.selectedNotes.add(clickedNote.id);
        }
      }
    } else {
      // Add new note
      const pitch = this.yToPitch(y);
      const time = this.xToTime(x);

      this.addNote({
        id: crypto.randomUUID(),
        pitch,
        time,
        duration: 1, // 1 beat default
        velocity: 100
      });
    }

    this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragMode) return;

    const { x, y } = this.getCanvasCoordinates(e);

    if (this.dragMode === 'move') {
      // Move selected notes
      const dx = this.xToTime(x) - this.xToTime(e.movementX);
      const dy = this.yToPitch(y) - this.yToPitch(e.movementY);

      this.selectedNotes.forEach(id => {
        const note = this.notes.find(n => n.id === id);
        if (note) {
          note.time += dx;
          note.pitch = Math.max(0, Math.min(127, note.pitch + dy));
        }
      });
    } else if (this.dragMode === 'resize') {
      // Resize note duration
      this.selectedNotes.forEach(id => {
        const note = this.notes.find(n => n.id === id);
        if (note) {
          note.duration = Math.max(0.25, this.xToTime(x) - note.time);
        }
      });
    }

    this.render();
  }

  private onMouseUp(e: MouseEvent): void {
    this.dragMode = null;
    this.emit('notesModified', Array.from(this.selectedNotes));
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.config.zoom *= zoomDelta;
      this.config.pixelsPerBeat *= zoomDelta;
    } else if (e.shiftKey) {
      // Horizontal scroll
      this.config.scrollX += e.deltaY;
    } else {
      // Vertical scroll
      this.config.scrollY += e.deltaY;
    }

    this.render();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelectedNotes();
    } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.selectAllNotes();
    }
  }

  private render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // Draw grid
    this.drawGrid();

    // Draw notes
    this.notes.forEach(note => {
      this.drawNote(note, this.selectedNotes.has(note.id));
    });

    // Draw playhead
    this.drawPlayhead();
  }

  private drawNote(note: Note, selected: boolean): void {
    const x = this.timeToX(note.time);
    const y = this.pitchToY(note.pitch);
    const width = this.timeToX(note.duration);
    const height = this.config.noteHeight;

    this.ctx.fillStyle = selected
      ? 'rgba(0, 217, 255, 0.8)'  // Cyan for selected
      : 'rgba(255, 0, 110, 0.6)'; // Magenta for normal

    this.ctx.fillRect(x, y, width, height);

    // Border
    this.ctx.strokeStyle = selected ? '#00d9ff' : '#ff006e';
    this.ctx.strokeRect(x, y, width, height);

    // Velocity indicator (darker = lower velocity)
    const velocityAlpha = note.velocity / 127;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${velocityAlpha * 0.3})`;
    this.ctx.fillRect(x, y, width, height);
  }

  private drawGrid(): void {
    const { width, height } = this.canvas;

    // Horizontal lines (pitch)
    for (let pitch = 0; pitch <= 127; pitch++) {
      const y = this.pitchToY(pitch);
      this.ctx.strokeStyle = pitch % 12 === 0
        ? 'rgba(255, 255, 255, 0.3)'  // Octave lines
        : 'rgba(255, 255, 255, 0.1)'; // Note lines

      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    // Vertical lines (time)
    for (let beat = 0; beat < 100; beat++) {
      const x = this.timeToX(beat);
      this.ctx.strokeStyle = beat % 4 === 0
        ? 'rgba(255, 255, 255, 0.3)'  // Bar lines
        : 'rgba(255, 255, 255, 0.1)'; // Beat lines

      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
  }

  // Coordinate conversion helpers
  private timeToX(time: number): number {
    return (time * this.config.pixelsPerBeat - this.config.scrollX) * this.config.zoom;
  }

  private xToTime(x: number): number {
    return (x / this.config.zoom + this.config.scrollX) / this.config.pixelsPerBeat;
  }

  private pitchToY(pitch: number): number {
    return ((127 - pitch) * this.config.noteHeight - this.config.scrollY) * this.config.zoom;
  }

  private yToPitch(y: number): number {
    return Math.round(127 - (y / this.config.zoom + this.config.scrollY) / this.config.noteHeight);
  }

  addNote(note: Note): void {
    this.notes.push(note);
    this.emit('noteAdded', note);
  }

  deleteSelectedNotes(): void {
    this.notes = this.notes.filter(n => !this.selectedNotes.has(n.id));
    this.selectedNotes.clear();
    this.emit('notesDeleted');
    this.render();
  }

  selectAllNotes(): void {
    this.notes.forEach(n => this.selectedNotes.add(n.id));
    this.render();
  }

  dispose(): void {
    // Cleanup event listeners
  }
}
```

## Task 3: Voice Control Interface

Create voice control system in `src/lib/voice/`:

```typescript
// src/lib/voice/VoiceController.ts
import { Anthropic } from '@anthropic-ai/sdk';

interface VoiceCommand {
  transcript: string;
  intent: string;
  parameters: Record<string, any>;
}

export class VoiceController {
  private deepgramApiKey: string;
  private anthropic: Anthropic;
  private elevenlabs: any; // ElevenLabs client
  private isListening: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private conversationHistory: any[] = [];

  constructor() {
    this.deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
    this.anthropic = new Anthropic({
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
    });
  }

  async startListening(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Connect to Deepgram WebSocket
    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=false`,
      ['token', this.deepgramApiKey]
    );

    ws.onopen = () => {
      console.log('🎤 Listening...');
      this.isListening = true;
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;

      if (transcript) {
        console.log('Transcript:', transcript);
        await this.processCommand(transcript);
      }
    };

    // Send audio to Deepgram
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    this.mediaRecorder.start(250); // Send chunks every 250ms
  }

  stopListening(): void {
    this.isListening = false;
    this.mediaRecorder?.stop();
  }

  private async processCommand(transcript: string): Promise<void> {
    // Parse command with Claude
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: this.getSystemPrompt(),
      messages: [
        ...this.conversationHistory,
        { role: 'user', content: transcript }
      ],
      tools: this.getDAWTools()
    });

    // Execute tool calls
    if (response.stop_reason === 'tool_use') {
      for (const content of response.content) {
        if (content.type === 'tool_use') {
          await this.executeDAWAction(content.name, content.input);
        }
      }
    }

    // Speak response
    if (response.content[0].type === 'text') {
      await this.speak(response.content[0].text);
    }

    // Update conversation history
    this.conversationHistory.push(
      { role: 'user', content: transcript },
      { role: 'assistant', content: response.content }
    );
  }

  private getSystemPrompt(): string {
    return `You are an expert music production assistant integrated into DAWG AI DAW.

Your role is to help bedroom producers create music through natural conversation.

CAPABILITIES:
- Control playback (play, stop, record, pause)
- Manage tracks (add, remove, solo, mute)
- Adjust parameters (volume, pan, effects)
- Generate music (beats, chords, melodies, basslines)
- Mix and master tracks

GUIDELINES:
- Be concise (3 lines max)
- Confirm destructive actions
- Use music production terminology appropriately
- Maintain encouraging tone
- Execute simple commands immediately

CURRENT PROJECT:
- BPM: 120
- Key: A minor
- Tracks: 4 (drums, bass, synth, vocals)
- Playing: false

When executing DAW commands, use the provided tools.`;
  }

  private getDAWTools() {
    return [
      {
        name: 'play',
        description: 'Start playback',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'stop',
        description: 'Stop playback',
        input_schema: { type: 'object', properties: {} }
      },
      {
        name: 'add_track',
        description: 'Add a new track',
        input_schema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['audio', 'midi'] },
            name: { type: 'string' }
          },
          required: ['type']
        }
      },
      {
        name: 'set_volume',
        description: 'Adjust track volume',
        input_schema: {
          type: 'object',
          properties: {
            track_id: { type: 'string' },
            volume: { type: 'number', minimum: -60, maximum: 6 }
          },
          required: ['track_id', 'volume']
        }
      },
      {
        name: 'generate_beat',
        description: 'Generate a drum beat',
        input_schema: {
          type: 'object',
          properties: {
            style: { type: 'string', enum: ['trap', 'house', 'hip-hop', 'lo-fi'] },
            bpm: { type: 'number' },
            bars: { type: 'number' }
          },
          required: ['style']
        }
      }
      // ... more tools
    ];
  }

  private async executeDAWAction(action: string, params: any): Promise<void> {
    switch (action) {
      case 'play':
        // Call audio engine play()
        break;
      case 'stop':
        // Call audio engine stop()
        break;
      case 'add_track':
        // Create new track
        break;
      case 'set_volume':
        // Adjust volume
        break;
      case 'generate_beat':
        // Call DAWG AI backend
        const response = await fetch('http://localhost:9000/api/v1/generate/midi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            style: 'drums',
            tempo: params.bpm || 120,
            bars: params.bars || 4
          })
        });
        const data = await response.json();
        // Load MIDI into track
        break;
    }
  }

  private async speak(text: string): Promise<void> {
    // Use ElevenLabs for text-to-speech
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': import.meta.env.VITE_ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      }
    );

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
  }
}
```

## Task 4: Voice UI Components

```svelte
<!-- VoiceInterface.svelte -->
<script lang="ts">
  import { VoiceController } from '$lib/voice/VoiceController';
  import { onMount } from 'svelte';

  let controller: VoiceController;
  let isListening = false;
  let transcript = '';
  let response = '';

  onMount(() => {
    controller = new VoiceController();
  });

  async function toggleListening() {
    if (isListening) {
      controller.stopListening();
      isListening = false;
    } else {
      await controller.startListening();
      isListening = true;
    }
  }
</script>

<div class="voice-interface">
  <button
    class="mic-button {isListening ? 'listening' : ''}"
    on:click={toggleListening}
  >
    {#if isListening}
      🎤 Listening...
    {:else}
      🎤 Tap to speak
    {/if}
  </button>

  {#if transcript}
    <div class="transcript-display">
      <strong>You:</strong> {transcript}
    </div>
  {/if}

  {#if response}
    <div class="response-display">
      <strong>DAWG AI:</strong> {response}
    </div>
  {/if}
</div>

<style>
  .mic-button {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: var(--accent-cyan);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .mic-button.listening {
    background: var(--accent-magenta);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
</style>
```

## Success Criteria

✅ Piano roll with full note editing capabilities
✅ Quantization and scale snapping
✅ Ghost notes from other tracks
✅ Velocity editing
✅ Keyboard shortcuts (copy, paste, delete, select all)
✅ Voice recognition via Deepgram (<200ms latency)
✅ Claude NLU parses DAW commands accurately (>95%)
✅ ElevenLabs TTS responses (<500ms latency)
✅ Voice commands execute DAW actions
✅ Conversation memory maintains context

## Integration Points

- **Instance 2**: Use design system components
- **Instance 3**: Control audio engine via voice
- **DAWG AI Backend**: Generate MIDI via API

Build a professional MIDI editor and natural voice interface that makes music production accessible.
```

---

### 🔺 Instance 5: JARVIS Multi-Agent LangGraph

**Working Directory**: `~/jarvis-langgraph/`
**Duration**: 2-3 weeks
**Priority**: HIGH

#### Prompt for Instance 5

```markdown
# JARVIS - LangGraph Multi-Agent Orchestration

You are implementing the LangGraph-based multi-agent system for JARVIS autonomous business AI.

## Context

JARVIS Stage 0-2 is complete with:
- ✅ Foundation (orchestrator, decision engine, memory)
- ✅ Approval queue with Discord notifications
- ✅ Marketing Agent with Buffer/Notion integration
- ⚠️ Basic Sales, Operations, Support agents (need enhancement)

Your task is to implement **Stage 3: Multi-Agent System with LangGraph** to enable intelligent task routing and agent collaboration.

## Technology Stack

- **Orchestration**: @langchain/langgraph v0.2+
- **LLM**: Claude 3.5 Sonnet (via @anthropic-ai/sdk)
- **Memory**: Existing memory system
- **State**: LangGraph StateGraph

## Architecture

```
User Request
    ↓
Supervisor Node (Claude analyzes task)
    ↓
┌───────────────┬───────────────┬───────────────┐
│  Marketing    │    Sales      │  Operations   │
│   Agent       │   Agent       │   Agent       │
└───────┬───────┴───────┬───────┴───────┬───────┘
        │               │               │
        └───────────────┴───────────────┘
                        ↓
            Aggregate Results Node
                        ↓
                  Final Result
```

## Task 1: Install Dependencies

```bash
cd ~/jarvis-langgraph
npm install @langchain/core@^0.3.0 @langchain/langgraph@^0.2.0 uuid@^11.0.0
```

## Task 2: LangGraph Orchestrator Implementation

Create `src/core/langgraph-orchestrator.ts`:

```typescript
import { StateGraph, END, START } from '@langchain/langgraph';
import { BaseAgent } from '../agents/base-agent';
import { Logger } from '../utils/logger';
import { Memory } from './memory';
import { Anthropic } from '@anthropic-ai/sdk';

export interface GraphState {
  taskId: string;
  originalRequest: string;
  currentStep: string;
  agentResponses: Record<string, any>;
  finalResult?: any;
  error?: string;
  requiresApproval: boolean;
  metadata: Record<string, any>;
}

export class LangGraphOrchestrator {
  private graph: StateGraph;
  private agents: Map<string, BaseAgent>;
  private logger: Logger;
  private memory: Memory;
  private anthropic: Anthropic;

  constructor() {
    this.agents = new Map();
    this.logger = new Logger('LangGraphOrchestrator');
    this.memory = new Memory();
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.initializeGraph();
  }

  private initializeGraph(): void {
    const workflow = new StateGraph<GraphState>({
      channels: {
        taskId: { value: (x: string, y: string) => y },
        originalRequest: { value: (x: string, y: string) => y },
        currentStep: { value: (x: string, y: string) => y },
        agentResponses: {
          value: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y })
        },
        finalResult: { value: (x: any, y: any) => y },
        error: { value: (x: string, y: string) => y },
        requiresApproval: { value: (x: boolean, y: boolean) => x || y },
        metadata: {
          value: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y })
        }
      }
    });

    // Add nodes
    workflow.addNode('supervisor', this.supervisorNode.bind(this));
    workflow.addNode('route_to_agent', this.routeToAgent.bind(this));
    workflow.addNode('aggregate_results', this.aggregateResults.bind(this));

    // Add edges
    workflow.addEdge(START, 'supervisor');
    workflow.addEdge('supervisor', 'route_to_agent');
    workflow.addEdge('route_to_agent', 'aggregate_results');

    // Conditional edge
    workflow.addConditionalEdges(
      'aggregate_results',
      this.shouldContinue.bind(this),
      {
        continue: 'supervisor',
        end: END
      }
    );

    this.graph = workflow.compile();
    this.logger.info('LangGraph workflow initialized');
  }

  // Supervisor node - analyzes task and determines which agents to invoke
  private async supervisorNode(state: GraphState): Promise<Partial<GraphState>> {
    this.logger.info('Supervisor analyzing task', { taskId: state.taskId });

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: `You are a task supervisor for DAWG AI's autonomous business system.

Your job is to analyze incoming tasks and determine which specialized agents should handle them.

Available agents:
- **marketing**: Social media, content creation, SEO, brand messaging, campaigns
- **sales**: Lead generation, conversion, onboarding, upselling, CRM
- **operations**: Analytics, reporting, workflow automation, data management
- **support**: Customer service, ticket handling, knowledge base, community

Analyze the task and return JSON:
{
  "agents": ["list", "of", "agent", "names"],
  "priority": "low|medium|high",
  "estimated_complexity": "simple|moderate|complex",
  "requires_collaboration": true|false,
  "execution_order": ["agent1", "agent2"] // if sequential execution needed
}`,
      messages: [{
        role: 'user',
        content: `Analyze this task and determine which agents should handle it:

Task: ${state.originalRequest}

Context: ${JSON.stringify(state.metadata, null, 2)}

Return your analysis as JSON.`
      }]
    });

    const analysisText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    let analysis;
    try {
      const cleanText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanText);
    } catch (error) {
      this.logger.error('Failed to parse supervisor response', error);
      analysis = { agents: ['operations'], priority: 'medium' };
    }

    return {
      currentStep: 'routing',
      metadata: {
        ...state.metadata,
        supervisorAnalysis: analysis
      }
    };
  }

  // Route to appropriate agents
  private async routeToAgent(state: GraphState): Promise<Partial<GraphState>> {
    const analysis = state.metadata.supervisorAnalysis;
    const agentsToInvoke = analysis.agents || ['operations'];

    this.logger.info('Routing to agents', { agents: agentsToInvoke });

    const responses: Record<string, any> = {};

    // Sequential vs parallel execution
    if (analysis.execution_order && analysis.execution_order.length > 0) {
      // Sequential
      for (const agentName of analysis.execution_order) {
        const agent = this.agents.get(agentName);
        if (agent) {
          const context = {
            originalRequest: state.originalRequest,
            previousResponses: responses,
            metadata: state.metadata
          };

          responses[agentName] = await agent.process(
            state.originalRequest,
            context
          );
        }
      }
    } else {
      // Parallel
      const promises = agentsToInvoke.map(async (agentName: string) => {
        const agent = this.agents.get(agentName);
        if (agent) {
          const response = await agent.process(
            state.originalRequest,
            { metadata: state.metadata }
          );
          return { agentName, response };
        }
        return null;
      });

      const results = await Promise.all(promises);

      results.forEach(result => {
        if (result) {
          responses[result.agentName] = result.response;
        }
      });
    }

    return {
      currentStep: 'aggregating',
      agentResponses: responses
    };
  }

  // Aggregate results from multiple agents
  private async aggregateResults(state: GraphState): Promise<Partial<GraphState>> {
    this.logger.info('Aggregating results', { taskId: state.taskId });

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: `You are a result aggregator for DAWG AI's autonomous business system.

Synthesize responses from multiple specialized agents into a coherent final result.

Provide:
1. Clear summary of what was accomplished
2. Key actions taken by each agent
3. Any follow-up actions needed
4. Success metrics or outcomes

Return JSON:
{
  "summary": "What was accomplished",
  "agentActions": {
    "agent_name": "what they did"
  },
  "followUpActions": ["action1", "action2"],
  "success": true|false,
  "needsMoreWork": true|false
}`,
      messages: [{
        role: 'user',
        content: `Aggregate these agent responses:

Original Task: ${state.originalRequest}

Agent Responses:
${JSON.stringify(state.agentResponses, null, 2)}

Synthesize into a final result as JSON.`
      }]
    });

    const resultText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    let finalResult;
    try {
      const cleanText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      finalResult = JSON.parse(cleanText);
    } catch (error) {
      this.logger.error('Failed to parse aggregation response', error);
      finalResult = {
        summary: 'Task completed',
        agentActions: state.agentResponses,
        success: true
      };
    }

    return {
      currentStep: 'completed',
      finalResult
    };
  }

  // Determine if workflow should continue
  private shouldContinue(state: GraphState): string {
    if (state.finalResult?.needsMoreWork) {
      this.logger.info('Workflow continuing - more work needed');
      return 'continue';
    }
    return 'end';
  }

  // Public API
  public registerAgent(name: string, agent: BaseAgent): void {
    this.agents.set(name, agent);
    this.logger.info(`Agent registered: ${name}`);
  }

  public async executeTask(request: string, metadata: Record<string, any> = {}): Promise<any> {
    const taskId = `task_${Date.now()}`;

    this.logger.info('Executing task via LangGraph', { taskId, request });

    const initialState: GraphState = {
      taskId,
      originalRequest: request,
      currentStep: 'start',
      agentResponses: {},
      requiresApproval: false,
      metadata
    };

    try {
      const finalState = await this.graph.invoke(initialState);

      // Store in memory
      await this.memory.store({
        timestamp: new Date(),
        type: 'event',
        content: {
          taskId,
          request,
          result: finalState.finalResult,
          agentResponses: finalState.agentResponses
        }
      });

      return finalState.finalResult;
    } catch (error) {
      this.logger.error('Task execution failed', error);
      throw error;
    }
  }
}
```

## Task 3: Update Main Orchestrator

Replace simple orchestrator in `src/core/orchestrator.ts`:

```typescript
import { LangGraphOrchestrator } from './langgraph-orchestrator';
import { BaseAgent } from '../agents/base-agent';
import { Logger } from '../utils/logger';

export class Orchestrator {
  private langGraph: LangGraphOrchestrator;
  private logger: Logger;

  constructor() {
    this.langGraph = new LangGraphOrchestrator();
    this.logger = new Logger('Orchestrator');
  }

  public registerAgent(name: string, agent: BaseAgent): void {
    this.langGraph.registerAgent(name, agent);
  }

  public async processTask(task: string, context: Record<string, any>): Promise<any> {
    this.logger.info('Processing task via LangGraph', { task });
    return this.langGraph.executeTask(task, context);
  }
}
```

## Task 4: Complex Workflow Example

Create feature launch workflow in `src/workflows/feature-launch.ts`:

```typescript
import { Orchestrator } from '../core/orchestrator';
import { Logger } from '../utils/logger';

export class FeatureLaunchWorkflow {
  private orchestrator: Orchestrator;
  private logger: Logger;

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.logger = new Logger('FeatureLaunchWorkflow');
  }

  public async execute(featureName: string, description: string): Promise<void> {
    this.logger.info(`Launching feature: ${featureName}`);

    const request = `Launch a new feature for DAWG AI:

Feature Name: ${featureName}
Description: ${description}

Required actions:
1. Create announcement blog post
2. Schedule social media campaign (3-5 posts over 3 days)
3. Send email to existing users
4. Update knowledge base with new feature documentation
5. Prepare support team with FAQs
6. Track engagement metrics

Coordinate these actions across appropriate teams.`;

    try {
      const result = await this.orchestrator.processTask(request, {
        featureName,
        description,
        launchDate: new Date()
      });

      this.logger.info('Feature launch completed', result);
    } catch (error) {
      this.logger.error('Feature launch failed', error);
      throw error;
    }
  }
}
```

## Task 5: Testing & Validation

Create tests in `tests/langgraph.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { LangGraphOrchestrator } from '../src/core/langgraph-orchestrator';
import { MarketingAgent } from '../src/agents/marketing-agent';
import { SalesAgent } from '../src/agents/sales-agent';

describe('LangGraph Orchestrator', () => {
  let orchestrator: LangGraphOrchestrator;

  beforeAll(() => {
    orchestrator = new LangGraphOrchestrator();
    orchestrator.registerAgent('marketing', new MarketingAgent());
    orchestrator.registerAgent('sales', new SalesAgent());
  });

  it('should route simple task to single agent', async () => {
    const result = await orchestrator.executeTask(
      'Create a Twitter post about our new AI beat generator',
      {}
    );

    expect(result.success).toBe(true);
    expect(result.agentActions).toHaveProperty('marketing');
  });

  it('should route complex task to multiple agents', async () => {
    const result = await orchestrator.executeTask(
      'Launch our new Pro tier with a full marketing campaign and sales outreach',
      {}
    );

    expect(result.success).toBe(true);
    expect(Object.keys(result.agentActions).length).toBeGreaterThan(1);
  });

  it('should handle sequential execution when required', async () => {
    const result = await orchestrator.executeTask(
      'Generate a lead magnet ebook, then create a landing page, then run ads',
      { requiresSequential: true }
    );

    expect(result.success).toBe(true);
  });
});
```

## Success Criteria

✅ LangGraph state machine operational
✅ Supervisor node correctly analyzes tasks
✅ Task routing to appropriate agents
✅ Sequential and parallel execution modes
✅ Result aggregation with Claude
✅ Complex multi-agent workflows succeed
✅ Feature launch workflow demonstrates collaboration
✅ All tests passing
✅ Performance <5s for simple tasks, <30s for complex

## Integration

Update `src/index.ts` to use new orchestrator:

```typescript
import { Orchestrator } from './core/orchestrator';
import { MarketingAgent } from './agents/marketing-agent';
import { SalesAgent } from './agents/sales-agent';
import { OperationsAgent } from './agents/operations-agent';
import { SupportAgent } from './agents/support-agent';

const orchestrator = new Orchestrator();

orchestrator.registerAgent('marketing', new MarketingAgent());
orchestrator.registerAgent('sales', new SalesAgent());
orchestrator.registerAgent('operations', new OperationsAgent());
orchestrator.registerAgent('support', new SupportAgent());

// Now orchestrator uses LangGraph for intelligent task routing
```

Build an intelligent multi-agent system that can handle complex, multi-domain business tasks autonomously.
```

---

### 🔻 Instance 6: Integration & Testing

**Working Directory**: `~/jarvis-integration/`
**Duration**: 2 weeks
**Priority**: MEDIUM

#### Prompt for Instance 6

```markdown
# Integration & End-to-End Testing

You are responsible for integrating all JARVIS and DAWG AI components and conducting comprehensive testing.

## Your Tasks

### 1. Integration Testing

Test all inter-module communication:

- **JARVIS → DAWG AI**: Voice commands execute DAWG actions
- **DAWG AI → JARVIS**: Project status updates displayed in Observatory
- **Frontend → Backend**: All API endpoints functional
- **Audio Engine → Backend AI**: MIDI generation integrated

### 2. Performance Testing

Benchmark and optimize:

- **JARVIS**: Decision latency <1s, approval queue <5s
- **DAWG Audio**: Recording latency <10ms, playback stable
- **DAWG Frontend**: Initial load <2s, 60 FPS UI
- **Memory**: <1GB typical usage

### 3. End-to-End Scenarios

Test realistic user workflows:

**Scenario 1: Voice-Controlled Beat Creation**
1. User says "Create a trap beat at 140 BPM"
2. JARVIS captures voice → Deepgram STT
3. Claude parses command → DAWG AI backend generates MIDI
4. Frontend loads MIDI into piano roll
5. User edits in piano roll → Audio engine plays back

**Scenario 2: Automated Feature Launch**
1. JARVIS marketing agent creates blog post
2. Sales agent drafts email campaign
3. Operations agent updates analytics dashboard
4. Support agent prepares FAQs
5. Observatory displays all activity in real-time

### 4. Create Integration Tests

```typescript
// tests/e2e/voice-to-daw.test.ts
describe('Voice Control Integration', () => {
  it('should generate beat from voice command', async () => {
    const command = "Give me a trap beat at 140 BPM";

    // Simulate voice command
    const result = await voiceController.processCommand(command);

    // Verify DAWG AI backend called
    expect(dawgAPI.generateMIDI).toHaveBeenCalledWith({
      style: 'drums',
      tempo: 140,
      bars: 4
    });

    // Verify MIDI loaded
    const track = audioEngine.getTrack('drums');
    expect(track.hasMIDI()).toBe(true);
  });
});
```

### 5. Documentation

Create comprehensive docs:
- **API Documentation** (Swagger/OpenAPI)
- **Component Documentation** (Storybook)
- **User Guide** (how to use both systems)
- **Developer Guide** (how to extend)

### 6. Deployment Readiness

Prepare for production:
- Environment configuration
- Docker containers
- CI/CD pipelines
- Monitoring setup (Sentry, DataDog)

## Success Criteria

✅ All integration tests passing
✅ Performance benchmarks met
✅ End-to-end scenarios work flawlessly
✅ Documentation complete and accurate
✅ Production deployment ready
✅ Zero critical bugs
```

---

## Coordination & Timeline

### Week-by-Week Schedule

**Week 1-2: Foundation**
- Instance 2: Design system complete
- Instance 3: Audio engine core ready
- Instance 5: LangGraph supervisor operational

**Week 3-4: Core Features**
- Instance 2: Application layout and state management
- Instance 3: Effects processor and recording
- Instance 4: Piano roll editor functional
- Instance 5: Multi-agent routing working

**Week 5-6: Advanced Features**
- Instance 2: API integration complete
- Instance 3: Export/bounce functionality
- Instance 4: Voice control operational
- Instance 5: Complex workflows

**Week 7-8: Integration & Polish**
- Instance 6: Integration testing
- All instances: Bug fixes and optimization
- Documentation and deployment prep

---

## Communication Protocol

### Daily Sync (Async via Shared Docs)

Create `~/DEVELOPMENT_STATUS.md` updated by each instance:

```markdown
# Development Status - October 15, 2025

## Instance 2 (DAWG Frontend)
- ✅ Project setup complete
- ✅ Design system atoms (10/15 components)
- 🔄 Molecules in progress (3/8 complete)
- ⏳ Organisms not started

## Instance 3 (DAWG Audio)
- ✅ Audio engine initialized
- ✅ Track system operational
- 🔄 Effects chain partial (5/10 effects)
- ⏳ Master bus not started

## Instance 4 (DAWG MIDI/Voice)
- ✅ Piano roll canvas setup
- 🔄 Note editing in progress
- ⏳ Voice interface not started

## Instance 5 (JARVIS LangGraph)
- ✅ LangGraph installed
- 🔄 Supervisor node implementation
- ⏳ Agent routing not started

## Instance 6 (Integration)
- ⏸️ Waiting for Instances 2-5 to reach 50%
```

### API Contracts (Defined Upfront)

Create `~/API_CONTRACTS.md`:

```typescript
// DAWG AI Backend → Frontend
interface GenerateMIDIRequest {
  style: 'drums' | 'melody' | 'bass';
  tempo: number;
  bars: number;
  temperature?: number;
}

interface GenerateMIDIResponse {
  midi_base64: string;
  metadata: {
    notes_generated: number;
    duration_seconds: number;
  };
}

// JARVIS Orchestrator → Agents
interface TaskRequest {
  id: string;
  type: string;
  data: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
}

interface TaskResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  executedBy: string;
  timestamp: Date;
}
```

---

## Next Steps

1. **Review this plan** - Ensure all stakeholders understand the architecture
2. **Set up Git worktrees** - Create isolated workspaces for each instance
3. **Create shared CLAUDE.md** - Ensure all instances have project context
4. **Launch instances in parallel** - Use Claude Code CLI for each
5. **Daily status updates** - Each instance updates `DEVELOPMENT_STATUS.md`
6. **Weekly integration builds** - Merge and test combined system
7. **Final integration** - Instance 6 validates everything works together

---

## Measuring Success

### JARVIS Metrics
- ✅ 80%+ of tasks automated (no human intervention)
- ✅ <1s decision latency
- ✅ <5s approval queue response
- ✅ 99.9% uptime
- ✅ <$50/mo operational cost

### DAWG AI Metrics
- ✅ <10ms audio latency (recording)
- ✅ <2s page load
- ✅ 60 FPS UI
- ✅ <1GB memory typical project
- ✅ >95% voice command accuracy

---

## Risk Mitigation

### High-Risk Areas

1. **Audio Latency** (DAWG)
   - Risk: Browser limitations
   - Mitigation: AudioWorklet + WASM, extensive testing

2. **Multi-Agent Coordination** (JARVIS)
   - Risk: Complex state management
   - Mitigation: LangGraph simplifies orchestration

3. **Voice Recognition Accuracy** (DAWG)
   - Risk: Music terminology confusion
   - Mitigation: Deepgram Nova-3, domain-specific vocabulary

4. **Integration Complexity**
   - Risk: 6 instances, many moving parts
   - Mitigation: Strong API contracts, Instance 6 dedicated to integration

---

**Let's build both systems in parallel and create the future of autonomous business operations and AI-powered music production! 🚀**
