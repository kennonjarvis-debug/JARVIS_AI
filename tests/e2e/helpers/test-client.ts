/**
 * E2E Test Client Helper
 *
 * Provides utilities for simulating different JARVIS clients in E2E tests
 */

import WebSocket from 'ws';
import { randomUUID } from 'crypto';

// Node 18+ has global fetch built-in
const fetchImpl = globalThis.fetch;

export interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  conversationId: string;
}

export class TestClient {
  private ws: WebSocket | null = null;
  private messages: any[] = [];
  private connected: boolean = false;
  public clientId: string | null = null;

  constructor(
    private baseUrl: string = 'http://localhost:4000',
    private source: 'desktop' | 'web' | 'chatgpt' | 'iphone' = 'web'
  ) {}

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.baseUrl.replace('http', 'ws') + `/ws?source=${this.source}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        this.connected = true;
        resolve();
      });

      this.ws.on('message', (data: any) => {
        const message = JSON.parse(data.toString());

        // Capture client ID from welcome message
        if (message.type === 'presence' && message.clientId) {
          this.clientId = message.clientId;
        }

        this.messages.push(message);
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.connected = false;
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }

  /**
   * Join a conversation
   */
  async joinConversation(conversationId: string): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to WebSocket');
    }

    this.ws.send(JSON.stringify({
      type: 'join',
      conversationId
    }));

    // Wait for sync message
    await this.waitForMessage((msg) => msg.type === 'sync' && msg.conversationId === conversationId);
  }

  /**
   * Send a message
   */
  async sendMessage(message: TestMessage): Promise<void> {
    if (!this.ws || !this.connected) {
      throw new Error('Not connected to WebSocket');
    }

    this.ws.send(JSON.stringify({
      type: 'message',
      conversationId: message.conversationId,
      message: {
        id: randomUUID(),
        role: message.role,
        content: message.content,
        conversationId: message.conversationId,
        source: this.source,
        timestamp: new Date().toISOString()
      }
    }));
  }

  /**
   * Wait for a specific message
   */
  async waitForMessage(
    predicate: (msg: any) => boolean,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check existing messages first
      const existing = this.messages.find(predicate);
      if (existing) {
        return resolve(existing);
      }

      // Set up listener for new messages
      const checkInterval = setInterval(() => {
        const message = this.messages.find(predicate);
        if (message) {
          clearInterval(checkInterval);
          clearTimeout(timeoutHandle);
          resolve(message);
        }
      }, 100);

      // Timeout
      const timeoutHandle = setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Message wait timeout'));
      }, timeout);
    });
  }

  /**
   * Get all received messages
   */
  getMessages(): any[] {
    return [...this.messages];
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this.messages = [];
  }

  /**
   * Send chat message via HTTP API
   */
  async sendChatHTTP(conversationId: string, message: string): Promise<any> {
    const response = await fetchImpl(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message,
        source: this.source
      })
    });

    if (!response.ok) {
      throw new Error(`Chat API failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Disconnect from WebSocket
   */
  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Test API Client for HTTP endpoints
 */
export class TestAPIClient {
  constructor(private baseUrl: string = 'http://localhost:4000') {}

  /**
   * Get conversation
   */
  async getConversation(conversationId: string): Promise<any> {
    const response = await fetchImpl(`${this.baseUrl}/api/conversations/${conversationId}`);
    if (!response.ok) {
      throw new Error(`Failed to get conversation: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create conversation
   */
  async createConversation(source: string = 'web'): Promise<any> {
    const response = await fetchImpl(`${this.baseUrl}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source })
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<any> {
    const response = await fetchImpl(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Trigger autonomous analysis
   */
  async triggerAutonomousAnalysis(domain?: string): Promise<any> {
    const url = domain
      ? `${this.baseUrl}/api/autonomous/analyze?domain=${domain}`
      : `${this.baseUrl}/api/autonomous/analyze`;

    const response = await fetchImpl(url, { method: 'POST' });

    if (!response.ok) {
      throw new Error(`Autonomous analysis failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get vector search results
   */
  async vectorSearch(query: string, options?: any): Promise<any> {
    const response = await fetchImpl(`${this.baseUrl}/api/search/vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, ...options })
    });

    if (!response.ok) {
      throw new Error(`Vector search failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Wait condition timeout');
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
