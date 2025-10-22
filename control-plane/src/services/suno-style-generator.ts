/**
 * Suno-Style Music Generator
 *
 * Single-entry API for generating complete songs from text prompts.
 * Enhances existing services (AudioGenerator, VoiceCloner, AudioMixer)
 * with intelligent prompt analysis and lyric generation.
 *
 * Usage:
 *   const song = await sunoStyleGenerator.generate("trap beat about hustling in the city");
 *
 * @module SunoStyleGenerator
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import { AudioGenerator } from './audio-generator.js';
import { VoiceCloner } from './voice-cloner.js';
import { AudioMixer } from './audio-mixer.js';

/**
 * Musical intent extracted from prompt
 */
export interface MusicalIntent {
  genre: string;
  subgenre?: string;
  bpm: number;
  key: string;
  mood: string;
  theme: string;
  vocals: 'rap' | 'singing' | 'melodic' | 'aggressive' | 'soft';
  energy: 'low' | 'medium' | 'high';
  structure: 'verse-chorus' | 'verse-only' | 'freestyle';
}

/**
 * Generated lyrics with structure
 */
export interface GeneratedLyrics {
  verses: string[][];
  chorus?: string[];
  bridge?: string[];
  hook?: string[];
  fullText: string;
}

/**
 * Complete song result
 */
export interface SunoStyleSong {
  audioPath: string;
  lyrics: GeneratedLyrics;
  intent: MusicalIntent;
  metadata: {
    duration: number;
    generatedAt: Date;
    prompt: string;
  };
}

/**
 * Generation options
 */
export interface GenerationOptions {
  duration?: number; // seconds (default: 120)
  voiceId?: string; // Use specific voice (optional)
  style?: 'auto' | 'rap' | 'singing' | 'melodic';
  quality?: 'draft' | 'standard' | 'high';
}

export class SunoStyleGenerator {
  private openai: OpenAI;
  private audioGenerator: AudioGenerator;
  private voiceCloner: VoiceCloner;
  private audioMixer: AudioMixer;

  // Pre-trained singing voices for different styles
  private singingVoices = {
    male_rap: process.env.ELEVENLABS_MALE_RAP_VOICE,
    female_rap: process.env.ELEVENLABS_FEMALE_RAP_VOICE,
    male_singing: process.env.ELEVENLABS_MALE_SINGING_VOICE,
    female_singing: process.env.ELEVENLABS_FEMALE_SINGING_VOICE,
    melodic: process.env.ELEVENLABS_MELODIC_VOICE,
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.audioGenerator = new AudioGenerator();
    this.voiceCloner = new VoiceCloner();
    this.audioMixer = new AudioMixer();
  }

  /**
   * Generate complete song from text prompt (Suno-style)
   *
   * @example
   * const song = await generator.generate("trap beat about hustling in the city");
   * const song = await generator.generate("sad love song in the style of Drake");
   * const song = await generator.generate("aggressive drill track with heavy 808s");
   */
  async generate(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<SunoStyleSong> {
    const startTime = Date.now();

    logger.info('🎵 Starting Suno-style generation...', {
      prompt: prompt.slice(0, 100),
      options
    });

    try {
      // Step 1: Analyze prompt to extract musical intent
      logger.info('🧠 Analyzing prompt...');
      const intent = await this.analyzePrompt(prompt);

      logger.info('✅ Intent extracted:', {
        genre: intent.genre,
        mood: intent.mood,
        bpm: intent.bpm,
        vocals: intent.vocals
      });

      // Step 2: Generate lyrics from theme
      logger.info('📝 Generating lyrics...');
      const lyrics = await this.generateLyrics(intent, options.duration || 120);

      logger.info('✅ Lyrics generated:', {
        verses: lyrics.verses.length,
        hasChorus: !!lyrics.chorus,
        lines: lyrics.fullText.split('\n').length
      });

      // Step 3: Generate instrumental beat
      logger.info('🎹 Generating instrumental beat...');
      const beatPath = await this.generateBeat(intent, options.duration || 120);

      logger.info('✅ Beat generated:', { path: beatPath });

      // Step 4: Generate vocals
      logger.info('🎤 Generating vocals...');
      const vocalsPath = await this.generateVocals(
        lyrics,
        intent,
        options.voiceId || this.selectVoice(intent)
      );

      logger.info('✅ Vocals generated:', { path: vocalsPath });

      // Step 5: Mix and master
      logger.info('🎚️ Mixing and mastering...');
      const finalPath = await this.mixAndMaster(beatPath, vocalsPath, intent);

      logger.info('✅ Song complete!', {
        path: finalPath,
        duration: ((Date.now() - startTime) / 1000).toFixed(1) + 's'
      });

      return {
        audioPath: finalPath,
        lyrics,
        intent,
        metadata: {
          duration: options.duration || 120,
          generatedAt: new Date(),
          prompt
        }
      };

    } catch (error) {
      logger.error('❌ Suno-style generation failed:', error);
      throw error;
    }
  }

  /**
   * Analyze text prompt to extract musical intent
   */
  private async analyzePrompt(prompt: string): Promise<MusicalIntent> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a music production AI that analyzes text prompts to extract musical intent.
Analyze the user's prompt and determine:
- Genre and subgenre
- BPM (tempo)
- Musical key
- Mood/vibe
- Theme/subject matter
- Vocal style (rap, singing, melodic, aggressive, soft)
- Energy level
- Song structure

Return JSON only, no other text.`
        },
        {
          role: 'user',
          content: `Analyze this music prompt: "${prompt}"

Return JSON with this exact structure:
{
  "genre": "trap|drill|boom-bap|rnb|pop|rock|etc",
  "subgenre": "specific subgenre",
  "bpm": 140,
  "key": "C minor",
  "mood": "dark|happy|sad|aggressive|chill|etc",
  "theme": "brief description of theme",
  "vocals": "rap|singing|melodic|aggressive|soft",
  "energy": "low|medium|high",
  "structure": "verse-chorus|verse-only|freestyle"
}`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const content = response.choices[0].message.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      // Fallback defaults
      return {
        genre: 'hip-hop',
        bpm: 90,
        key: 'C minor',
        mood: 'neutral',
        theme: prompt,
        vocals: 'rap',
        energy: 'medium',
        structure: 'verse-chorus'
      };
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * Generate lyrics from musical intent
   */
  private async generateLyrics(
    intent: MusicalIntent,
    duration: number
  ): Promise<GeneratedLyrics> {
    // Calculate number of verses based on duration
    const versesNeeded = Math.floor(duration / 40); // ~40 seconds per verse
    const needsChorus = intent.structure === 'verse-chorus';

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional songwriter specializing in ${intent.genre} music.
Write lyrics that match the specified mood, theme, and style.
For rap: Focus on rhythm, flow, internal rhymes, wordplay.
For singing: Focus on melody, emotion, memorable hooks.

Return ONLY the lyrics, no explanations.`
        },
        {
          role: 'user',
          content: `Write ${intent.genre} lyrics with these specifications:

**Theme**: ${intent.theme}
**Mood**: ${intent.mood}
**Style**: ${intent.vocals}
**Energy**: ${intent.energy}
**BPM**: ${intent.bpm}

**Structure**:
${needsChorus ? `- ${versesNeeded} verses (8 lines each)
- 1 chorus (4 lines, catchy and repeatable)` : `- ${versesNeeded} verses (12 lines each)`}

Requirements:
- Match the ${intent.mood} mood
- Use ${intent.energy} energy delivery
- ${intent.vocals === 'rap' ? 'Strong internal rhymes and wordplay' : 'Melodic and singable lines'}
- Theme about: ${intent.theme}

Format:
[Verse 1]
line 1
line 2
...

${needsChorus ? '[Chorus]\nline 1\nline 2\n...\n' : ''}

[Verse 2]
...`
        }
      ],
      temperature: 0.9,
      max_tokens: 1500
    });

    const lyricsText = response.choices[0].message.content || '';

    // Parse lyrics into structure
    return this.parseLyrics(lyricsText);
  }

  /**
   * Parse lyrics text into structured format
   */
  private parseLyrics(text: string): GeneratedLyrics {
    const verses: string[][] = [];
    let chorus: string[] | undefined;
    let bridge: string[] | undefined;

    const sections = text.split(/\[(Verse|Chorus|Bridge|Hook).*?\]/i);
    const labels = text.match(/\[(Verse|Chorus|Bridge|Hook).*?\]/gi) || [];

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i].toLowerCase();
      const content = sections[i + 1]?.trim().split('\n').filter(l => l.trim());

      if (!content) continue;

      if (label.includes('verse')) {
        verses.push(content);
      } else if (label.includes('chorus') || label.includes('hook')) {
        chorus = content;
      } else if (label.includes('bridge')) {
        bridge = content;
      }
    }

    return {
      verses,
      chorus,
      bridge,
      fullText: text
    };
  }

  /**
   * Generate instrumental beat
   */
  private async generateBeat(intent: MusicalIntent, duration: number): Promise<string> {
    // Build enhanced prompt for Stable Audio
    const prompt = this.buildBeatPrompt(intent);

    return await this.audioGenerator.generateBeat({
      prompt,
      duration,
      genre: intent.genre,
      bpm: intent.bpm,
      key: intent.key,
      mood: intent.mood
    });
  }

  /**
   * Build enhanced prompt for beat generation
   */
  private buildBeatPrompt(intent: MusicalIntent): string {
    const parts: string[] = [];

    // Genre
    parts.push(intent.subgenre || intent.genre);

    // Energy
    if (intent.energy === 'high') {
      parts.push('energetic', 'powerful', 'intense');
    } else if (intent.energy === 'low') {
      parts.push('laid-back', 'chill', 'smooth');
    }

    // Mood descriptors
    if (intent.mood === 'dark') {
      parts.push('dark', 'menacing', 'atmospheric');
    } else if (intent.mood === 'happy') {
      parts.push('upbeat', 'bright', 'positive');
    } else if (intent.mood === 'sad') {
      parts.push('melancholic', 'emotional', 'minor key');
    } else if (intent.mood === 'aggressive') {
      parts.push('aggressive', 'hard-hitting', 'heavy');
    }

    // Genre-specific elements
    if (intent.genre === 'trap' || intent.genre === 'drill') {
      parts.push('heavy 808s', 'rolling hi-hats');
    } else if (intent.genre === 'boom-bap') {
      parts.push('punchy drums', 'vinyl samples');
    } else if (intent.genre === 'rnb') {
      parts.push('smooth bass', 'lush chords');
    }

    // Quality
    parts.push('professional production', 'high quality', 'instrumental');

    return parts.join(', ');
  }

  /**
   * Generate vocals with singing-optimized settings
   */
  private async generateVocals(
    lyrics: GeneratedLyrics,
    intent: MusicalIntent,
    voiceId: string
  ): Promise<string> {
    // Flatten lyrics into lines
    const allLines: { text: string; emotion: string }[] = [];

    // Add verses
    for (const verse of lyrics.verses) {
      for (const line of verse) {
        allLines.push({
          text: line,
          emotion: this.mapMoodToEmotion(intent.mood, intent.vocals)
        });
      }
    }

    // Add chorus (if exists)
    if (lyrics.chorus) {
      for (const line of lyrics.chorus) {
        allLines.push({
          text: line,
          emotion: 'melodic' // Chorus is always melodic
        });
      }
    }

    // Generate vocals with musical settings
    const result = await this.voiceCloner.generateSongVocals({
      voiceId,
      lines: allLines
    });

    // Return first vocal file (in production, would concatenate all)
    return result.audioPaths[0];
  }

  /**
   * Map mood to vocal emotion
   */
  private mapMoodToEmotion(mood: string, vocalStyle: string): string {
    if (vocalStyle === 'aggressive') return 'confident';
    if (vocalStyle === 'soft') return 'gentle';

    const moodMap: Record<string, string> = {
      'dark': 'confident',
      'happy': 'energetic',
      'sad': 'gentle',
      'aggressive': 'confident',
      'chill': 'calm'
    };

    return moodMap[mood] || 'neutral';
  }

  /**
   * Mix and master final track
   */
  private async mixAndMaster(
    beatPath: string,
    vocalsPath: string,
    intent: MusicalIntent
  ): Promise<string> {
    await this.audioMixer.initialize();

    // Select mixing preset based on genre
    const mixingPreset = this.selectMixingPreset(intent);

    const result = await this.audioMixer.mixTracks({
      tracks: [
        {
          path: beatPath,
          type: 'beat',
          volume: intent.energy === 'high' ? 0.9 : 0.75,
          pan: 0,
          effects: []
        },
        {
          path: vocalsPath,
          type: 'vocals',
          volume: 1.0,
          pan: 0,
          effects: [
            { type: 'compression', params: { threshold: -18, ratio: 4 } },
            { type: 'reverb', params: { delay: intent.vocals === 'singing' ? 150 : 80 } },
            { type: 'eq', params: { frequency: 3000, width: 200, gain: 3 } }
          ]
        }
      ],
      outputPath: `/tmp/suno-style-${Date.now()}.wav`,
      format: 'wav',
      sampleRate: 48000,
      applyMastering: true,
      masteringPreset: mixingPreset
    });

    return result.outputPath;
  }

  /**
   * Select mixing preset based on genre
   */
  private selectMixingPreset(intent: MusicalIntent): 'transparent' | 'punchy' | 'warm' | 'broadcast' {
    if (intent.genre === 'trap' || intent.genre === 'drill') {
      return 'punchy'; // Heavy, impactful
    } else if (intent.genre === 'rnb' || intent.genre === 'pop') {
      return 'warm'; // Smooth, polished
    } else if (intent.genre === 'boom-bap') {
      return 'transparent'; // Natural, clean
    } else {
      return 'broadcast'; // Universal
    }
  }

  /**
   * Select appropriate voice for intent
   */
  private selectVoice(intent: MusicalIntent): string {
    if (intent.vocals === 'rap' || intent.vocals === 'aggressive') {
      return this.singingVoices.male_rap || 'default';
    } else if (intent.vocals === 'singing') {
      return this.singingVoices.male_singing || 'default';
    } else if (intent.vocals === 'melodic' || intent.vocals === 'soft') {
      return this.singingVoices.melodic || 'default';
    }

    return 'default';
  }

  /**
   * Quick generation for testing (uses draft quality)
   */
  async quickGenerate(prompt: string): Promise<string> {
    const result = await this.generate(prompt, {
      duration: 60,
      quality: 'draft'
    });

    return result.audioPath;
  }
}

// Export singleton instance
export const sunoStyleGenerator = new SunoStyleGenerator();
