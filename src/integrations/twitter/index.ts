/**
 * Twitter API Integration
 *
 * Handles automated posting to Twitter using Twitter API v2
 * Supports text posts, images, and video
 */

import { Logger } from '../../utils/logger.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import FormData from 'form-data';

export interface TwitterPost {
  text: string;
  mediaPath?: string;
  mediaType?: 'image' | 'video';
}

export interface TwitterPostResult {
  tweetId: string;
  url: string;
}

export class TwitterIntegration {
  private logger: Logger;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;
  private bearerToken: string;
  private baseUrl = 'https://api.twitter.com/2';
  private uploadUrl = 'https://upload.twitter.com/1.1';

  constructor() {
    this.logger = new Logger('TwitterIntegration');

    // OAuth 1.0a credentials for posting
    this.apiKey = process.env.TWITTER_API_KEY || '';
    this.apiSecret = process.env.TWITTER_API_SECRET || '';
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN || '';
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';

    // Bearer token for API v2
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';

    if (!this.apiKey || !this.apiSecret || !this.accessToken || !this.accessTokenSecret) {
      this.logger.warn('Twitter credentials not configured');
    }
  }

  /**
   * Post a tweet with optional media
   */
  async postTweet(post: TwitterPost): Promise<TwitterPostResult> {
    this.logger.info('Posting tweet', {
      textLength: post.text.length,
      hasMedia: !!post.mediaPath,
    });

    try {
      let mediaId: string | undefined;

      // Upload media if provided
      if (post.mediaPath) {
        mediaId = await this.uploadMedia(post.mediaPath, post.mediaType || 'image');
      }

      // Create tweet
      const tweetData: any = {
        text: post.text,
      };

      if (mediaId) {
        tweetData.media = {
          media_ids: [mediaId],
        };
      }

      const response = await this.makeOAuthRequest(
        'POST',
        `${this.baseUrl}/tweets`,
        tweetData
      );

      const tweetId = response.data.id;
      const tweetUrl = `https://twitter.com/user/status/${tweetId}`;

      this.logger.info('Tweet posted successfully', {
        tweetId,
        url: tweetUrl,
      });

      return {
        tweetId,
        url: tweetUrl,
      };
    } catch (error: any) {
      this.logger.error('Failed to post tweet', error);
      throw new Error(`Twitter posting failed: ${error.message}`);
    }
  }

  /**
   * Upload media (image or video) to Twitter
   */
  private async uploadMedia(mediaPath: string, mediaType: 'image' | 'video'): Promise<string> {
    this.logger.info('Uploading media to Twitter', { mediaPath, mediaType });

    try {
      const fileBuffer = await fs.readFile(mediaPath);
      const fileSize = fileBuffer.length;

      if (mediaType === 'image') {
        // Simple upload for images
        return await this.uploadImageSimple(mediaPath, fileBuffer);
      } else {
        // Chunked upload for videos
        return await this.uploadVideoChunked(mediaPath, fileBuffer, fileSize);
      }
    } catch (error: any) {
      this.logger.error('Failed to upload media', error);
      throw new Error(`Media upload failed: ${error.message}`);
    }
  }

  /**
   * Simple upload for images
   */
  private async uploadImageSimple(mediaPath: string, fileBuffer: Buffer): Promise<string> {
    const form = new FormData();
    form.append('media', fileBuffer, {
      filename: path.basename(mediaPath),
      contentType: 'image/png',
    });

    const response = await this.makeOAuthRequest(
      'POST',
      `${this.uploadUrl}/media/upload.json`,
      form
    );

    return response.media_id_string;
  }

  /**
   * Chunked upload for videos
   */
  private async uploadVideoChunked(
    mediaPath: string,
    fileBuffer: Buffer,
    fileSize: number
  ): Promise<string> {
    // Step 1: INIT
    const initResponse = await this.makeOAuthRequest(
      'POST',
      `${this.uploadUrl}/media/upload.json`,
      {
        command: 'INIT',
        total_bytes: fileSize,
        media_type: 'video/mp4',
      }
    );

    const mediaId = initResponse.media_id_string;

    // Step 2: APPEND chunks
    const chunkSize = 5 * 1024 * 1024; // 5MB chunks
    let segmentIndex = 0;

    for (let offset = 0; offset < fileSize; offset += chunkSize) {
      const chunk = fileBuffer.slice(offset, Math.min(offset + chunkSize, fileSize));

      const form = new FormData();
      form.append('command', 'APPEND');
      form.append('media_id', mediaId);
      form.append('segment_index', segmentIndex.toString());
      form.append('media', chunk);

      await this.makeOAuthRequest('POST', `${this.uploadUrl}/media/upload.json`, form);

      segmentIndex++;
    }

    // Step 3: FINALIZE
    await this.makeOAuthRequest('POST', `${this.uploadUrl}/media/upload.json`, {
      command: 'FINALIZE',
      media_id: mediaId,
    });

    return mediaId;
  }

  /**
   * Make OAuth 1.0a authenticated request to Twitter API
   * Note: This is a simplified version. For production, use a proper OAuth library like 'twitter-api-v2'
   */
  private async makeOAuthRequest(method: string, url: string, data?: any): Promise<any> {
    // For now, we'll use axios with bearer token
    // In production, implement proper OAuth 1.0a signing
    const headers: any = {
      Authorization: `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };

    if (data instanceof FormData) {
      headers['Content-Type'] = `multipart/form-data; boundary=${data.getBoundary()}`;
    }

    const response = await axios({
      method,
      url,
      data,
      headers,
    });

    return response.data;
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/users/me`, {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get account info', error);
      throw new Error(`Failed to get Twitter account info: ${error.message}`);
    }
  }
}
