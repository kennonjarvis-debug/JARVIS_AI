# Voice Integration Guide for ChatInterface

## Overview

Agent 3 has completed the voice/mic integration components. This guide helps Agent 2 integrate them into the ChatInterface.

## Components Created

### 1. VoiceInput Component
**Location**: `/app/components/VoiceInput.tsx`

**Features**:
- Web Speech API integration (works in Chrome & Safari)
- Real-time transcription with interim results
- Visual feedback (pulsing animation when listening)
- Comprehensive error handling
- Browser compatibility checks
- Auto-stop after 30 seconds of silence (configurable)

**Props**:
```typescript
interface VoiceInputProps {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  continuous?: boolean;      // Default: true
  language?: string;          // Default: 'en-US'
  autoStop?: number;          // Default: 30000ms
}
```

### 2. VoiceOutput Component
**Location**: `/app/components/VoiceOutput.tsx`

**Features**:
- Text-to-Speech using Web Speech Synthesis API
- Play/pause/stop controls
- Configurable voice, rate, pitch, volume
- Auto-play option
- Visual feedback for speaking state

**Props**:
```typescript
interface VoiceOutputProps {
  text: string;
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  voice?: string;    // Voice name
  rate?: number;     // 0.1 to 10 (default: 1)
  pitch?: number;    // 0 to 2 (default: 1)
  volume?: number;   // 0 to 1 (default: 1)
}
```

## Integration Steps

### Step 1: Add VoiceInput to ChatInterface Input Area

```tsx
import { VoiceInput } from './VoiceInput';

const ChatInterface = () => {
  const [inputValue, setInputValue] = useState('');

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // User finished speaking - append to input
      setInputValue((prev) => prev + ' ' + transcript.trim());
    } else {
      // Optional: Show interim transcript in real-time
      // You could display this separately or overlay on input
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('Voice error:', error);
    // Optional: Show toast/notification to user
  };

  return (
    <div className="chat-input-container">
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Type or speak your message..."
      />

      <VoiceInput
        onTranscript={handleVoiceTranscript}
        onError={handleVoiceError}
        continuous={true}
        language="en-US"
      />

      <button onClick={sendMessage}>Send</button>
    </div>
  );
};
```

### Step 2: Add VoiceOutput to Jarvis Messages

```tsx
import { VoiceOutput } from './VoiceOutput';

const ChatMessage = ({ message, isJarvis }) => {
  return (
    <div className={`message ${isJarvis ? 'jarvis' : 'user'}`}>
      <div className="message-content">
        {message.text}
      </div>

      {isJarvis && (
        <VoiceOutput
          text={message.text}
          autoPlay={false}  // Set to true if you want auto-play
          rate={1}
          pitch={1}
          volume={1}
        />
      )}
    </div>
  );
};
```

### Step 3: Optional - Auto-Play Jarvis Responses

If you want Jarvis responses to be automatically read aloud:

```tsx
const ChatInterface = () => {
  const [autoPlayVoice, setAutoPlayVoice] = useState(false);

  return (
    <div>
      {/* Settings toggle */}
      <label>
        <input
          type="checkbox"
          checked={autoPlayVoice}
          onChange={(e) => setAutoPlayVoice(e.target.checked)}
        />
        Auto-play Jarvis responses
      </label>

      {/* Pass to message component */}
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          autoPlayVoice={autoPlayVoice}
        />
      ))}
    </div>
  );
};
```

## Demo Page

**Location**: `/app/voice-demo/page.tsx`

Test the voice components before integration:
- Visit `http://localhost:3003/voice-demo`
- Test voice input with real-time transcription
- Test text-to-speech on sample messages
- Test browser compatibility

## Styling

Components use Jarvis design system:
- **Colors**: `jarvis-primary`, `jarvis-secondary`, etc.
- **Effects**: `glass`, `glass-hover`, `animate-pulse-glow`
- **Icons**: From `lucide-react` (Mic, Volume2, etc.)

The components already match your Jarvis theme, no additional styling needed!

## Browser Compatibility

### Voice Input (Speech Recognition)
- ✅ Chrome (full support)
- ✅ Safari (webkit prefix - handled automatically)
- ⚠️ Firefox (limited support)
- ⚠️ Edge (limited support)

### Voice Output (Speech Synthesis)
- ✅ Chrome (full support)
- ✅ Safari (full support)
- ✅ Firefox (full support)
- ✅ Edge (full support)

Components automatically check for support and disable gracefully if not available.

## Advanced Features (Optional)

### 1. Voice Commands

Extend VoiceInput to recognize commands:

```tsx
const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
  if (isFinal) {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Check for commands
    if (lowerTranscript === 'clear conversation') {
      clearMessages();
      return;
    }
    if (lowerTranscript === 'send message') {
      sendMessage();
      return;
    }

    // Normal transcription
    setInputValue((prev) => prev + ' ' + transcript.trim());
  }
};
```

### 2. Multi-Language Support

```tsx
<VoiceInput
  language="es-ES"  // Spanish
  // language="fr-FR"  // French
  // language="de-DE"  // German
  // language="ja-JP"  // Japanese
  onTranscript={handleTranscript}
/>
```

### 3. Custom Voice Selection

```tsx
import { useVoiceOutput } from './VoiceOutput';

const ChatInterface = () => {
  const { availableVoices, speak } = useVoiceOutput();

  const [selectedVoice, setSelectedVoice] = useState('');

  return (
    <div>
      <select
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
      >
        {availableVoices.map((voice) => (
          <option key={voice.name} value={voice.name}>
            {voice.name} ({voice.lang})
          </option>
        ))}
      </select>

      <VoiceOutput
        text={message}
        voice={selectedVoice}
      />
    </div>
  );
};
```

## Testing Checklist

Before deploying:

- [ ] Test voice input in Chrome
- [ ] Test voice input in Safari
- [ ] Test microphone permission flow
- [ ] Test error handling (deny permissions)
- [ ] Test interim transcription display
- [ ] Test final transcription accuracy
- [ ] Test auto-stop after silence
- [ ] Test text-to-speech playback
- [ ] Test pause/resume controls
- [ ] Test multiple voice options
- [ ] Test with long messages (>1 minute)
- [ ] Test with special characters in transcript
- [ ] Test input field behavior with voice + typing

## Hooks Available

Both components export React hooks for programmatic control:

```tsx
import { useVoiceInput, useVoiceOutput } from '@/app/components/VoiceInput';

const MyComponent = () => {
  const { status, startListening, stopListening } = useVoiceInput(
    (transcript, isFinal) => console.log(transcript)
  );

  const { speak, stop } = useVoiceOutput();

  return (
    <button onClick={() => speak('Hello world')}>
      Speak
    </button>
  );
};
```

## Need Help?

- Check the demo page for working examples
- Read component source code for detailed implementation
- Both components have comprehensive TypeScript types and JSDoc comments

---

**Agent 3 Status**: ✅ Complete

All voice integration components are ready for Agent 2 to integrate into ChatInterface!
