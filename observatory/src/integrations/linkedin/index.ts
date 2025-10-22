/**
 * LinkedIn API Integration
 *
 * Handles automated posting to LinkedIn using LinkedIn API v2
 * Supports text posts, images, and articles
 */

import { Logger } from '../../utils/logger.js';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LinkedInPost {
  text: string;
  mediaPath?: string;
  url?: string;
  title?: string;
}

export interface LinkedInPostResult {
  postId: string;
  url: string;
}

export class LinkedInIntegration {
  private logger: Logger;
  private accessToken: string;
  private personId: string;
  private baseUrl = 'https://api.linkedin.com/v2';

  constructor() {
    this.logger = new Logger('LinkedInIntegration');

    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN || '';
    this.personId = process.env.LINKEDIN_PERSON_ID || '';

    if (!this.accessToken || !this.personId) {
      this.logger.warn('LinkedIn credentials not configured');
    }
  }

  /**
   * Post to LinkedIn with optional media
   */
  async postUpdate(post: LinkedInPost): Promise<LinkedInPostResult> {
    this.logger.info('Posting LinkedIn update', {
      textLength: post.text.length,
      hasMedia: !!post.mediaPath,
      hasUrl: !!post.url,
    });

    try {
      let assetId: string | undefined;

      // Upload media if provided
      if (post.mediaPath) {
        assetId = await this.uploadMedia(post.mediaPath);
      }

      // Create post payload
      const postData: any = {
        author: `urn:li:person:${this.personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: post.text,
            },
            shareMediaCategory: assetId ? 'IMAGE' : post.url ? 'ARTICLE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add media if uploaded
      if (assetId) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            description: {
              text: post.title || 'Shared image',
            },
            media: assetId,
            title: {
              text: post.title || 'Image',
            },
          },
        ];
      }

      // Add article link if provided
      if (post.url && !assetId) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            originalUrl: post.url,
            title: {
              text: post.title || 'Shared link',
            },
          },
        ];
      }

      const response = await axios.post(`${this.baseUrl}/ugcPosts`, postData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      const postId = response.data.id;
      const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

      this.logger.info('LinkedIn post published', {
        postId,
        url: postUrl,
      });

      return {
        postId,
        url: postUrl,
      };
    } catch (error: any) {
      this.logger.error('Failed to post LinkedIn update', error);
      throw new Error(`LinkedIn posting failed: ${error.message}`);
    }
  }

  /**
   * Upload image to LinkedIn
   */
  private async uploadMedia(mediaPath: string): Promise<string> {
    this.logger.info('Uploading media to LinkedIn', { mediaPath });

    try {
      // Step 1: Register upload
      const registerResponse = await axios.post(
        `${this.baseUrl}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${this.personId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const asset = registerResponse.data.value.asset;
      const uploadUrl = registerResponse.data.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;

      // Step 2: Upload image binary
      const imageBuffer = await fs.readFile(mediaPath);

      await axios.put(uploadUrl, imageBuffer, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/octet-stream',
        },
      });

      this.logger.info('Media uploaded to LinkedIn', { asset });

      return asset;
    } catch (error: any) {
      this.logger.error('Failed to upload media', error);
      throw new Error(`Media upload failed: ${error.message}`);
    }
  }

  /**
   * Get profile information
   */
  async getProfile(): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to get profile', error);
      throw new Error(`Failed to get LinkedIn profile: ${error.message}`);
    }
  }

  /**
   * Get person ID from profile (needed for posting)
   */
  async getPersonId(): Promise<string> {
    const profile = await this.getProfile();
    return profile.id;
  }
}
