/**
 * Suno API Client Service
 *
 * Real Suno API integration for professional-quality music generation.
 * Provides Suno-level quality with proper song structure (verse/chorus/bridge),
 * expert audio engineer-level prompting, and professional production.
 */

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

// Music theory and production expert prompting system
const AUDIO_ENGINEER_SYSTEM_PROMPT = `You are an expert audio engineer and music producer with 20+ years of experience in professional music production.

Your expertise includes:
- Music theory: chord progressions, key signatures, harmonic analysis
- Song structure: verse/chorus/bridge arrangements, transitions
- Production techniques: mixing, mastering, sound design
- Genre-specific conventions: tempo ranges, instrument choices, production styles
- Lyrical composition: rhyme schemes, syllable counts, narrative flow

When analyzing a music request, you MUST provide:
1. **Musical Analysis**: Key, BPM, time signature, chord progression for each section
2. **Song Structure**: Detailed verse/chorus/bridge layout with different chord progressions
3. **Production Notes**: Instrument selection, mix balance, effects chain
4. **Suno-Optimized Prompt**: A professionally crafted prompt that leverages Suno's capabilities

Your prompts should be detailed, technical, and optimized for maximum quality output.`;

interface MusicTheory {
  key: string;
  bpm: number;
  timeSignature: string;
  chordProgressions: {
    verse: string[];
    chorus: string[];
    bridge?: string[];
  };
  scales: string[];
}

interface SongStructure {
  sections: Array<{
    type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';
    duration: number;
    chords: string[];
    notes: string;
  }>;
  totalDuration: number;
}

interface ProductionSpec {
  instruments: string[];
  mixBalance: string;
  effects: string[];
  masteringStyle: string;
  referenceArtists: string[];
}

interface ExpertMusicIntent {
  musicTheory: MusicTheory;
  songStructure: SongStructure;
  production: ProductionSpec;
  sunoPrompt: string;
  styleDescription: string;
}

export class SunoApiClient {
  private sunoCookie: string;
  private openai: OpenAI;
  private outputDir: string;
  private baseUrl: string = 'https://studio-api.suno.ai';

  constructor() {
    // Initialize Suno credentials
    const sunoCookie = process.env.SUNO_COOKIE;

    if (!sunoCookie) {
      logger.warn('No SUNO_COOKIE found. Falling back to MusicGen.');
      throw new Error('SUNO_COOKIE required for Suno API');
    }

    this.sunoCookie = sunoCookie;

    // Initialize OpenAI for expert prompting
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });

    this.outputDir = process.env.MUSIC_OUTPUT_DIR || '/tmp/jarvis-generated-music';
  }

  /**
   * Make authenticated request to Suno API
   */
  private async sunoRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Cookie': `__session=${this.sunoCookie}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        data
      });

      return response.data;
    } catch (error: any) {
      logger.error(`Suno API request failed: ${error.message}`);
      throw new Error(`Suno API error: ${error.message}`);
    }
  }

  /**
   * Generate expert-level music intent using GPT-4o with audio engineer expertise
   */
  async analyzeWithExpertKnowledge(userPrompt: string): Promise<ExpertMusicIntent> {
    logger.info('🎼 Analyzing music request with expert knowledge...');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: AUDIO_ENGINEER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this music request and provide a detailed production plan:

"${userPrompt}"

Provide:
1. Music theory analysis (key, BPM, time signature, chord progressions for verse/chorus/bridge)
2. Song structure with different sections (each section should have different chords/notes)
3. Production specifications (instruments, mix, effects, mastering)
4. A Suno-optimized prompt that will produce professional-quality output

Format your response as JSON with this structure:
{
  "musicTheory": {
    "key": "C Major",
    "bpm": 140,
    "timeSignature": "4/4",
    "chordProgressions": {
      "verse": ["Cm7", "Ab", "Eb", "Bb"],
      "chorus": ["Ab", "Eb", "Bb", "Cm"],
      "bridge": ["Fm", "Cm", "Ab", "Bb"]
    },
    "scales": ["C Minor Pentatonic", "C Dorian"]
  },
  "songStructure": {
    "sections": [
      {
        "type": "intro",
        "duration": 8,
        "chords": ["Cm7", "Ab"],
        "notes": "808 bass hit, dark atmospheric synth pad"
      },
      {
        "type": "verse",
        "duration": 16,
        "chords": ["Cm7", "Ab", "Eb", "Bb"],
        "notes": "Trap hi-hats, rolling snares, deep 808s"
      },
      {
        "type": "chorus",
        "duration": 16,
        "chords": ["Ab", "Eb", "Bb", "Cm"],
        "notes": "Layered vocals, big reverb, melodic 808s"
      }
    ],
    "totalDuration": 120
  },
  "production": {
    "instruments": ["808 bass", "trap hi-hats", "layered synths", "atmospheric pads"],
    "mixBalance": "Bass-heavy with crisp high-end",
    "effects": ["heavy reverb", "sidechain compression", "stereo widening"],
    "masteringStyle": "Modern trap/hip-hop mastering",
    "referenceArtists": ["Metro Boomin", "Southside", "TM88"]
  },
  "sunoPrompt": "Dark trap beat in C minor, 140 BPM. Metro Boomin style production with heavy 808s, rolling hi-hats, and atmospheric synth pads. Song structure: Intro (808 bass hit + dark pads) → Verse (trap hi-hats, deep 808s on Cm7-Ab-Eb-Bb) → Chorus (layered melody on Ab-Eb-Bb-Cm with big reverb) → Bridge (minimal on Fm-Cm-Ab-Bb) → Final chorus. Modern trap mastering with bass-heavy mix.",
  "styleDescription": "Metro Boomin x Morgan Wallen trap-country fusion"
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');

    logger.info('✅ Expert analysis complete', {
      key: analysis.musicTheory.key,
      bpm: analysis.musicTheory.bpm,
      sections: analysis.songStructure.sections.length
    });

    return analysis as ExpertMusicIntent;
  }

  /**
   * Generate music using Suno API with expert prompting
   */
  async generateMusic(userPrompt: string, options?: {
    duration?: number;
    makeInstrumental?: boolean;
    customMode?: boolean;
  }): Promise<{
    id: string;
    audioUrl: string;
    localPath: string;
    duration: number;
    metadata: {
      genre: string;
      tempo: number;
      key: string;
      instruments: string[];
      chordProgressions: any;
      songStructure: any;
      generatedAt: Date;
    };
    expertAnalysis: ExpertMusicIntent;
  }> {
    try {
      // Step 1: Get expert analysis
      const expertIntent = await this.analyzeWithExpertKnowledge(userPrompt);

      logger.info('🎵 Generating with Suno API...', {
        prompt: expertIntent.sunoPrompt,
        bpm: expertIntent.musicTheory.bpm,
        key: expertIntent.musicTheory.key
      });

      // Step 2: Generate with Suno using expert-crafted prompt
      logger.info('🎵 Calling Suno API to generate music...');

      const generatePayload = {
        prompt: expertIntent.sunoPrompt,
        make_instrumental: options?.makeInstrumental ?? false,
        wait_audio: true
      };

      const generateResponse = await this.sunoRequest('/api/generate/v2/', 'POST', generatePayload);

      if (!generateResponse || !generateResponse.clips || generateResponse.clips.length === 0) {
        throw new Error('Suno API returned no clips');
      }

      const clip = generateResponse.clips[0];
      const clipId = clip.id;

      logger.info('⏳ Waiting for audio generation...', { clipId });

      // Poll for completion
      let audioUrl = null;
      const maxAttempts = 60; // 5 minutes max wait
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s between polls

        const status = await this.sunoRequest(`/api/feed/?ids=${clipId}`, 'GET');

        if (status && status.length > 0) {
          const currentClip = status[0];

          if (currentClip.audio_url) {
            audioUrl = currentClip.audio_url;
            logger.info('✅ Suno generation complete!', { audioUrl });
            break;
          }

          if (currentClip.status === 'error') {
            throw new Error('Suno generation failed with error status');
          }
        }
      }

      if (!audioUrl) {
        throw new Error('Suno generation timed out');
      }

      const song = { id: clipId, audio_url: audioUrl };
      logger.info('✅ Suno generation complete', { songId: song.id });

      // Step 3: Download audio file
      await fs.mkdir(this.outputDir, { recursive: true });

      const localPath = path.join(
        this.outputDir,
        `suno-${expertIntent.musicTheory.key.replace(' ', '-').toLowerCase()}-${expertIntent.musicTheory.bpm}bpm-${Date.now()}.mp3`
      );

      if (song.audio_url) {
        logger.info('📥 Downloading audio file...', { url: song.audio_url });
        const response = await axios.get(song.audio_url, { responseType: 'arraybuffer' });
        await fs.writeFile(localPath, response.data);
        logger.info('✅ Audio saved', { path: localPath });
      }

      return {
        id: song.id,
        audioUrl: song.audio_url || '',
        localPath,
        duration: expertIntent.songStructure.totalDuration,
        metadata: {
          genre: expertIntent.styleDescription,
          tempo: expertIntent.musicTheory.bpm,
          key: expertIntent.musicTheory.key,
          instruments: expertIntent.production.instruments,
          chordProgressions: expertIntent.musicTheory.chordProgressions,
          songStructure: expertIntent.songStructure,
          generatedAt: new Date()
        },
        expertAnalysis: expertIntent
      };

    } catch (error: any) {
      logger.error('Suno API generation failed:', error.message);
      throw new Error(`Suno generation failed: ${error.message}`);
    }
  }

  /**
   * Get Suno account credits/quota
   */
  async getQuota(): Promise<any> {
    try {
      const quota = await this.client.get_limit();
      logger.info('Suno API quota:', quota);
      return quota;
    } catch (error: any) {
      logger.error('Failed to get Suno quota:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const sunoApiClient = new SunoApiClient();
