/**
 * Twitter/X Integration Service
 * Uses Twitter API v2
 */

import axios from 'axios';

interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  bearerToken: string;
  redirectUri: string;
}

interface TwitterTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class TwitterService {
  private config: TwitterConfig;
  private baseAuthUrl = 'https://twitter.com/i/oauth2';
  private apiUrl = 'https://api.twitter.com/2';

  constructor() {
    this.config = {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
      redirectUri: process.env.TWITTER_REDIRECT_URI || '',
    };
  }

  /**
   * Generate OAuth 2.0 authorization URL with PKCE
   */
  getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'tweet.read tweet.write users.read follows.read follows.write offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.baseAuthUrl}/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code: string, codeVerifier: string): Promise<TwitterTokens> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await axios.post(
      `${this.baseAuthUrl}/token`,
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TwitterTokens> {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');

    const response = await axios.post(
      `${this.baseAuthUrl}/token`,
      new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data;
  }

  /**
   * Get authenticated user
   */
  async getMe(accessToken: string): Promise<any> {
    const response = await axios.get(`${this.apiUrl}/users/me`, {
      params: {
        'user.fields': 'created_at,description,id,name,profile_image_url,public_metrics,username,verified',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data.data;
  }

  /**
   * Post a tweet
   */
  async postTweet(accessToken: string, text: string): Promise<any> {
    const response = await axios.post(
      `${this.apiUrl}/tweets`,
      { text },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.data;
  }

  /**
   * Get user tweets
   */
  async getUserTweets(accessToken: string, userId: string, maxResults = 10): Promise<any[]> {
    const response = await axios.get(`${this.apiUrl}/users/${userId}/tweets`, {
      params: {
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics,text',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data.data || [];
  }

  /**
   * Get tweet by ID
   */
  async getTweet(accessToken: string, tweetId: string): Promise<any> {
    const response = await axios.get(`${this.apiUrl}/tweets/${tweetId}`, {
      params: {
        'tweet.fields': 'created_at,public_metrics,text,author_id',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data.data;
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(accessToken: string, tweetId: string): Promise<any> {
    const response = await axios.delete(`${this.apiUrl}/tweets/${tweetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data;
  }

  /**
   * Search tweets
   */
  async searchTweets(query: string, maxResults = 10): Promise<any[]> {
    const response = await axios.get(`${this.apiUrl}/tweets/search/recent`, {
      params: {
        query,
        max_results: maxResults,
        'tweet.fields': 'created_at,public_metrics,text,author_id',
      },
      headers: { Authorization: `Bearer ${this.config.bearerToken}` },
    });

    return response.data.data || [];
  }

  /**
   * Get user followers
   */
  async getFollowers(accessToken: string, userId: string, maxResults = 10): Promise<any[]> {
    const response = await axios.get(`${this.apiUrl}/users/${userId}/followers`, {
      params: {
        max_results: maxResults,
        'user.fields': 'created_at,description,name,public_metrics,username',
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return response.data.data || [];
  }

  /**
   * Follow a user
   */
  async followUser(accessToken: string, sourceUserId: string, targetUserId: string): Promise<any> {
    const response = await axios.post(
      `${this.apiUrl}/users/${sourceUserId}/following`,
      { target_user_id: targetUserId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }
}

export const twitterService = new TwitterService();
