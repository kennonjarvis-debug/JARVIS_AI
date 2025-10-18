import OpenAI from 'openai';
import { logger } from '../logger.service.js';
import fs from 'fs';

export interface MultimodalConfig {
  openaiApiKey: string;
}

export interface VisionAnalysis {
  description: string;
  objects: string[];
  text?: string;
  sentiment?: string;
  cost: number;
}

export interface AudioTranscription {
  text: string;
  language?: string;
  duration?: number;
  cost: number;
}

export interface ImageGeneration {
  url: string;
  revisedPrompt?: string;
  cost: number;
}

export interface SpeechGeneration {
  audioBuffer: Buffer;
  duration: number;
  cost: number;
}

/**
 * Multimodal AI Service
 * Handles vision, audio, image generation, and text-to-speech
 */
export class MultimodalService {
  private client: OpenAI;
  private config: Required<MultimodalConfig>;

  constructor(config: MultimodalConfig) {
    this.config = {
      openaiApiKey: config.openaiApiKey,
    };

    this.client = new OpenAI({
      apiKey: this.config.openaiApiKey,
    });

    logger.info('Multimodal service initialized');
  }

  /**
   * Analyze an image with GPT-4 Vision
   */
  async analyzeImage(
    imageUrl: string,
    prompt: string = 'What is in this image?',
    detailLevel: 'low' | 'high' | 'auto' = 'auto'
  ): Promise<VisionAnalysis> {
    logger.info('Analyzing image with GPT-4V', { prompt });

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: detailLevel,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || '';
      const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

      // Estimate cost (GPT-4V pricing)
      const inputCost = (usage.prompt_tokens / 1000) * 0.01;
      const outputCost = (usage.completion_tokens / 1000) * 0.03;
      const cost = inputCost + outputCost;

      // Parse response to extract structured information
      const analysis: VisionAnalysis = {
        description: content,
        objects: this.extractObjects(content),
        sentiment: this.extractSentiment(content),
        cost,
      };

      logger.info('Image analysis completed', { cost });
      return analysis;
    } catch (error: any) {
      logger.error('Image analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze image from base64 data
   */
  async analyzeImageBase64(
    base64Image: string,
    prompt: string = 'What is in this image?'
  ): Promise<VisionAnalysis> {
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
    return this.analyzeImage(imageUrl, prompt);
  }

  /**
   * Analyze multiple images
   */
  async analyzeMultipleImages(
    imageUrls: string[],
    prompt: string = 'Describe these images'
  ): Promise<VisionAnalysis> {
    logger.info('Analyzing multiple images', { count: imageUrls.length });

    const imageContent = imageUrls.map(url => ({
      type: 'image_url' as const,
      image_url: { url },
    }));

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...imageContent,
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
    const cost = ((usage.prompt_tokens / 1000) * 0.01) + ((usage.completion_tokens / 1000) * 0.03);

    return {
      description: content,
      objects: this.extractObjects(content),
      cost,
    };
  }

  /**
   * Transcribe audio with Whisper
   */
  async transcribeAudio(
    audioFilePath: string,
    language?: string,
    prompt?: string
  ): Promise<AudioTranscription> {
    logger.info('Transcribing audio with Whisper', { file: audioFilePath });

    try {
      const audioFile = fs.createReadStream(audioFilePath);

      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language,
        prompt,
        response_format: 'verbose_json',
      });

      // Whisper pricing: $0.006 per minute
      const duration = (response as any).duration || 0;
      const cost = (duration / 60) * 0.006;

      logger.info('Audio transcription completed', { duration, cost });

      return {
        text: response.text,
        language: (response as any).language,
        duration,
        cost,
      };
    } catch (error: any) {
      logger.error('Audio transcription failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Transcribe audio from buffer
   */
  async transcribeAudioBuffer(
    audioBuffer: Buffer,
    filename: string = 'audio.mp3',
    language?: string
  ): Promise<AudioTranscription> {
    // Create a temporary file
    const tempPath = `/tmp/${filename}`;
    fs.writeFileSync(tempPath, audioBuffer);

    try {
      const result = await this.transcribeAudio(tempPath, language);
      fs.unlinkSync(tempPath);
      return result;
    } catch (error) {
      fs.unlinkSync(tempPath);
      throw error;
    }
  }

  /**
   * Translate audio to English
   */
  async translateAudio(audioFilePath: string): Promise<AudioTranscription> {
    logger.info('Translating audio to English', { file: audioFilePath });

    const audioFile = fs.createReadStream(audioFilePath);

    const response = await this.client.audio.translations.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    const duration = (response as any).duration || 0;
    const cost = (duration / 60) * 0.006;

    return {
      text: response.text,
      language: 'en',
      duration,
      cost,
    };
  }

  /**
   * Generate image with DALL-E
   */
  async generateImage(
    prompt: string,
    size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
    quality: 'standard' | 'hd' = 'standard',
    n: number = 1
  ): Promise<ImageGeneration[]> {
    logger.info('Generating image with DALL-E', { prompt, size, quality });

    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt,
        size,
        quality,
        n,
      });

      // DALL-E 3 pricing
      const costPerImage = quality === 'hd'
        ? size === '1024x1024' ? 0.080 : 0.120
        : size === '1024x1024' ? 0.040 : 0.080;

      const images = response.data.map(image => ({
        url: image.url || '',
        revisedPrompt: image.revised_prompt,
        cost: costPerImage,
      }));

      logger.info('Image generation completed', {
        count: images.length,
        totalCost: costPerImage * n,
      });

      return images;
    } catch (error: any) {
      logger.error('Image generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Edit an existing image
   */
  async editImage(
    imageFilePath: string,
    maskFilePath: string,
    prompt: string,
    size: '1024x1024' | '512x512' | '256x256' = '1024x1024'
  ): Promise<ImageGeneration> {
    logger.info('Editing image with DALL-E', { prompt });

    const image = fs.createReadStream(imageFilePath);
    const mask = fs.createReadStream(maskFilePath);

    const response = await this.client.images.edit({
      image,
      mask,
      prompt,
      size,
      n: 1,
    });

    return {
      url: response.data[0].url || '',
      cost: 0.020, // DALL-E 2 edit pricing
    };
  }

  /**
   * Create image variations
   */
  async createImageVariations(
    imageFilePath: string,
    n: number = 1,
    size: '1024x1024' | '512x512' | '256x256' = '1024x1024'
  ): Promise<ImageGeneration[]> {
    logger.info('Creating image variations', { count: n });

    const image = fs.createReadStream(imageFilePath);

    const response = await this.client.images.createVariation({
      image,
      n,
      size,
    });

    return response.data.map(image => ({
      url: image.url || '',
      cost: 0.020 / n, // DALL-E 2 variation pricing
    }));
  }

  /**
   * Text to speech
   */
  async textToSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy',
    model: 'tts-1' | 'tts-1-hd' = 'tts-1'
  ): Promise<SpeechGeneration> {
    logger.info('Generating speech', { textLength: text.length, voice, model });

    try {
      const response = await this.client.audio.speech.create({
        model,
        voice,
        input: text,
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // TTS pricing: $15 per 1M characters (tts-1) or $30 per 1M (tts-1-hd)
      const costPerChar = model === 'tts-1-hd' ? 0.000030 : 0.000015;
      const cost = text.length * costPerChar;

      // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
      const estimatedDuration = (text.length / 5 / 150) * 60;

      logger.info('Speech generation completed', { cost, duration: estimatedDuration });

      return {
        audioBuffer,
        duration: estimatedDuration,
        cost,
      };
    } catch (error: any) {
      logger.error('Speech generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse document (PDF, image with OCR)
   */
  async parseDocument(
    documentUrl: string,
    prompt: string = 'Extract all text and key information from this document'
  ): Promise<{
    text: string;
    metadata?: any;
    cost: number;
  }> {
    logger.info('Parsing document', { url: documentUrl });

    // Use GPT-4V to analyze document
    const analysis = await this.analyzeImage(documentUrl, prompt, 'high');

    return {
      text: analysis.description,
      metadata: {
        objects: analysis.objects,
        extractedText: analysis.text,
      },
      cost: analysis.cost,
    };
  }

  /**
   * Helper: Extract objects from vision response
   */
  private extractObjects(text: string): string[] {
    // Simple extraction - look for nouns
    // In production, use NLP library
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const commonObjects = [
      'person', 'people', 'car', 'building', 'tree', 'dog', 'cat',
      'table', 'chair', 'computer', 'phone', 'book', 'food', 'sky',
    ];

    return [...new Set(words.filter(w => commonObjects.includes(w)))];
  }

  /**
   * Helper: Extract sentiment from text
   */
  private extractSentiment(text: string): string {
    const lowerText = text.toLowerCase();

    const positiveWords = ['happy', 'joy', 'smile', 'beautiful', 'great', 'excellent'];
    const negativeWords = ['sad', 'angry', 'dark', 'scary', 'terrible', 'bad'];

    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
}

export default MultimodalService;
