/**
 * Instagram Integration Service
 * Uses Instagram Graph API (Meta Platform)
 */

import axios from 'axios';

interface InstagramConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

interface InstagramTokens {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export class InstagramService {
  private config: InstagramConfig;
  private baseAuthUrl = 'https://api.instagram.com';
  private graphApiUrl = 'https://graph.instagram.com';

  constructor() {
    this.config = {
      appId: process.env.INSTAGRAM_APP_ID || '',
      appSecret: process.env.INSTAGRAM_APP_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
    };
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state,
    });

    return `${this.baseAuthUrl}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string): Promise<InstagramTokens> {
    const response = await axios.post(
      `${this.baseAuthUrl}/oauth/access_token`,
      new URLSearchParams({
        client_id: this.config.appId,
        client_secret: this.config.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    return response.data;
  }

  /**
   * Get long-lived token (60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<InstagramTokens> {
    const response = await axios.get(`${this.graphApiUrl}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: this.config.appSecret,
        access_token: shortLivedToken,
      },
    });

    return response.data;
  }

  /**
   * Refresh long-lived token
   */
  async refreshToken(accessToken: string): Promise<InstagramTokens> {
    const response = await axios.get(`${this.graphApiUrl}/refresh_access_token`, {
      params: {
        grant_type: 'ig_refresh_token',
        access_token: accessToken,
      },
    });

    return response.data;
  }

  /**
   * Get user profile
   */
  async getUserProfile(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.graphApiUrl}/me`, {
      params: {
        fields: 'id,username,account_type,media_count',
        access_token: accessToken,
      },
    });

    return response.data;
  }

  /**
   * Get user media
   */
  async getUserMedia(accessToken: string, limit = 10): Promise<any[]> {
    const response = await axios.get(`${this.graphApiUrl}/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
        limit,
        access_token: accessToken,
      },
    });

    return response.data.data;
  }

  /**
   * Get media insights
   */
  async getMediaInsights(accessToken: string, mediaId: string): Promise<any> {
    const response = await axios.get(`${this.graphApiUrl}/${mediaId}/insights`, {
      params: {
        metric: 'engagement,impressions,reach,saved',
        access_token: accessToken,
      },
    });

    return response.data.data;
  }

  /**
   * Publish photo
   */
  async publishPhoto(
    accessToken: string,
    imageUrl: string,
    caption?: string
  ): Promise<any> {
    // Step 1: Create media container
    const containerResponse = await axios.post(
      `${this.graphApiUrl}/me/media`,
      null,
      {
        params: {
          image_url: imageUrl,
          caption,
          access_token: accessToken,
        },
      }
    );

    const creationId = containerResponse.data.id;

    // Step 2: Publish the container
    const publishResponse = await axios.post(
      `${this.graphApiUrl}/me/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: accessToken,
        },
      }
    );

    return publishResponse.data;
  }

  /**
   * Get account insights
   */
  async getAccountInsights(
    accessToken: string,
    metrics = ['impressions', 'reach', 'follower_count']
  ): Promise<any> {
    const response = await axios.get(`${this.graphApiUrl}/me/insights`, {
      params: {
        metric: metrics.join(','),
        period: 'day',
        access_token: accessToken,
      },
    });

    return response.data.data;
  }
}

export const instagramService = new InstagramService();
