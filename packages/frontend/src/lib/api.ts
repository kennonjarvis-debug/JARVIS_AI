/**
 * Backend API Client
 * Communicates with the Jarvis backend API
 */

import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3100/api';

export interface Integration {
  platform: string;
  name?: string;
  displayName?: string;
  description?: string;
  category?: string;
  icon?: string;
  status: string;
  requiresOAuth?: boolean;
  lastChecked?: Date;
}

export interface IntegrationStats {
  totalLoaded: number;
  byPlatform: Record<string, number>;
  byObservatory: Record<string, number>;
}

export interface TweetResult {
  id: string;
  text: string;
  url: string;
}

export interface TwitterMention {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
  };
  createdAt: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Get the current Supabase session token
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const authHeaders = await this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Request failed',
        message: response.statusText,
      }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  // Integration endpoints

  async getAvailableIntegrations(): Promise<Integration[]> {
    const data = await this.fetch<{ integrations: Integration[] }>('/integrations');
    return data.integrations;
  }

  async getConnectedIntegrations(observatoryId: string): Promise<Integration[]> {
    const data = await this.fetch<{ integrations: Integration[] }>(
      `/integrations/connected?observatory_id=${observatoryId}`
    );
    return data.integrations;
  }

  async getIntegrationStats(): Promise<IntegrationStats> {
    return this.fetch<IntegrationStats>('/integrations/stats');
  }

  async disconnectIntegration(integrationId: string): Promise<void> {
    await this.fetch(`/integrations/${integrationId}`, {
      method: 'DELETE',
    });
  }

  // Twitter endpoints

  async connectTwitter(params: {
    observatory_id: string;
    api_key: string;
    api_secret: string;
    access_token: string;
    access_token_secret: string;
    account_name?: string;
  }): Promise<{ success: boolean; integration: any }> {
    return this.fetch('/integrations/twitter/connect', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async postTweet(params: {
    observatory_id: string;
    text: string;
    media_path?: string;
    media_type?: string;
  }): Promise<{ success: boolean; tweet: TweetResult }> {
    return this.fetch('/integrations/twitter/tweet', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getTwitterMentions(
    observatoryId: string,
    maxResults: number = 10
  ): Promise<TwitterMention[]> {
    const data = await this.fetch<{ mentions: TwitterMention[]; count: number }>(
      `/integrations/twitter/mentions?observatory_id=${observatoryId}&max_results=${maxResults}`
    );
    return data.mentions;
  }

  // Stripe/Billing endpoints

  async createCheckoutSession(params: {
    user_id: string;
    price_id: string;
    success_url?: string;
    cancel_url?: string;
  }): Promise<{ sessionId: string; url: string }> {
    return this.fetch('/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getSubscription(userId: string): Promise<{ subscription: Subscription | null; plan: string }> {
    return this.fetch(`/stripe/subscription?user_id=${userId}`);
  }

  async createPortalSession(params: {
    user_id: string;
    return_url?: string;
  }): Promise<{ url: string }> {
    return this.fetch('/stripe/portal', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; subscription: any }> {
    return this.fetch('/stripe/cancel', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

export const api = new ApiClient();
