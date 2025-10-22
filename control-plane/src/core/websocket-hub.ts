/**
 * WebSocket Hub
 *
 * Real-time message broadcasting for unified conversation sync
 * across JarvisDesktop, Dashboard, ChatGPT, and future clients.
 *
 * Features:
 * - Room-based routing (per conversation ID)
 * - Client presence tracking
 * - Auto-reconnection support
 * - Message broadcasting
 */

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage, Server as HTTPServer } from 'http';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import { conversationStore, Message, MessageSource } from './conversation-store.js';
import { config } from '../utils/config.js';
import { randomUUID } from 'crypto';

export interface WSClient {
  id: string;
  ws: WebSocket;
  source: MessageSource;
  conversationIds: Set<string>;
  lastSeen: Date;
  metadata?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface WSMessage {
  type: 'message' | 'sync' | 'presence' | 'typing' | 'join' | 'leave' | 'ping' | 'pong';
  conversationId?: string;
  message?: Message;
  source?: MessageSource;
  clientId?: string;
  timestamp?: string;
  data?: any;
}

export class WebSocketHub {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map(); // conversationId -> Set<clientId>
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Redis pub/sub for multi-instance support
  private redis: Redis | null = null;
  private redisSub: Redis | null = null;
  private instanceId: string = randomUUID();

  /**
   * Initialize WebSocket server
   */
  async initialize(server: HTTPServer): Promise<void> {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Initialize Redis pub/sub
    await this.initializeRedis();

    // Start heartbeat
    this.startHeartbeat();

    logger.info(`🔌 WebSocket Hub initialized (instance: ${this.instanceId})`);
  }

  /**
   * Initialize Redis pub/sub for multi-instance support
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Create Redis clients for pub/sub
      this.redis = new Redis(config.redisUrl);
      this.redisSub = new Redis(config.redisUrl);

      // Subscribe to broadcast channel
      await this.redisSub.subscribe('jarvis:broadcasts');

      // Handle incoming Redis messages
      this.redisSub.on('message', (channel, message) => {
        if (channel === 'jarvis:broadcasts') {
          try {
            const data = JSON.parse(message);

            // Ignore messages from this instance
            if (data.instanceId === this.instanceId) {
              return;
            }

            // Broadcast to local clients only
            this.broadcastToLocalClients(data.message, data.conversationId);
          } catch (error) {
            logger.error('Failed to process Redis message:', error);
          }
        }
      });

      logger.info('✅ Redis pub/sub initialized for multi-instance WebSocket support');
    } catch (error) {
      logger.error('⚠️  Failed to initialize Redis pub/sub:', error);
      logger.warn('WebSocket hub will run in single-instance mode');
    }
  }

  /**
   * Broadcast message to local clients only (called from Redis)
   */
  private broadcastToLocalClients(message: WSMessage, conversationId?: string): void {
    if (conversationId) {
      this.broadcastToRoom(conversationId, message);
    } else {
      this.broadcastToAll(message);
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = randomUUID();

    // Extract source from query or path
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const source = (url.searchParams.get('source') as MessageSource) || 'web';

    const client: WSClient = {
      id: clientId,
      ws,
      source,
      conversationIds: new Set(),
      lastSeen: new Date(),
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.socket.remoteAddress
      }
    };

    this.clients.set(clientId, client);
    logger.info(`✅ Client connected: ${clientId} (${source})`);

    // Send welcome message
    this.sendToClient(client, {
      type: 'presence',
      clientId,
      source,
      timestamp: new Date().toISOString(),
      data: { connected: true }
    });

    // Handle messages
    ws.on('message', (data: RawData) => {
      this.handleMessage(client, data);
    });

    // Handle close
    ws.on('close', () => {
      this.handleDisconnect(client);
    });

    // Handle error
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });

    // Update heartbeat
    ws.on('pong', () => {
      client.lastSeen = new Date();
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(client: WSClient, rawData: RawData): void {
    try {
      const data = rawData.toString();
      const message: WSMessage = JSON.parse(data);

      logger.debug(`📨 Message from ${client.id}: ${message.type}`);

      switch (message.type) {
        case 'join':
          this.handleJoin(client, message);
          break;

        case 'leave':
          this.handleLeave(client, message);
          break;

        case 'message':
          this.handleChatMessage(client, message);
          break;

        case 'sync':
          this.handleSync(client, message);
          break;

        case 'typing':
          this.handleTyping(client, message);
          break;

        case 'ping':
          this.sendToClient(client, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }

      client.lastSeen = new Date();
    } catch (error) {
      logger.error('Failed to handle WebSocket message:', error);
      this.sendToClient(client, {
        type: 'presence',
        data: { error: 'Invalid message format' }
      });
    }
  }

  /**
   * Handle join conversation
   */
  private handleJoin(client: WSClient, message: WSMessage): void {
    const conversationId = message.conversationId;
    if (!conversationId) return;

    // Add client to conversation room
    client.conversationIds.add(conversationId);

    if (!this.rooms.has(conversationId)) {
      this.rooms.set(conversationId, new Set());
    }
    this.rooms.get(conversationId)!.add(client.id);

    // Update participant status in store
    if (client.source !== 'chatgpt') {
      conversationStore.updateParticipantStatus(
        conversationId,
        client.source as 'desktop' | 'web' | 'iphone',
        true
      );
    }

    logger.info(`👋 Client ${client.id} joined conversation ${conversationId}`);

    // Notify others in room
    this.broadcastToRoom(conversationId, {
      type: 'presence',
      conversationId,
      source: client.source,
      clientId: client.id,
      timestamp: new Date().toISOString(),
      data: { action: 'joined' }
    }, client.id);

    // Send conversation history to client
    const messages = conversationStore.getRecentMessages(conversationId, 50);
    this.sendToClient(client, {
      type: 'sync',
      conversationId,
      timestamp: new Date().toISOString(),
      data: { messages }
    });
  }

  /**
   * Handle leave conversation
   */
  private handleLeave(client: WSClient, message: WSMessage): void {
    const conversationId = message.conversationId;
    if (!conversationId) return;

    client.conversationIds.delete(conversationId);

    const room = this.rooms.get(conversationId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) {
        this.rooms.delete(conversationId);
      }
    }

    // Update participant status
    if (client.source !== 'chatgpt') {
      conversationStore.updateParticipantStatus(
        conversationId,
        client.source as 'desktop' | 'web' | 'iphone',
        false
      );
    }

    logger.info(`👋 Client ${client.id} left conversation ${conversationId}`);

    // Notify others
    this.broadcastToRoom(conversationId, {
      type: 'presence',
      conversationId,
      source: client.source,
      clientId: client.id,
      timestamp: new Date().toISOString(),
      data: { action: 'left' }
    }, client.id);
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(client: WSClient, wsMessage: WSMessage): void {
    if (!wsMessage.message || !wsMessage.conversationId) {
      logger.warn('Invalid chat message - missing data');
      return;
    }

    // Ensure message has required fields
    const message: Message = {
      id: wsMessage.message.id || randomUUID(),
      conversationId: wsMessage.conversationId,
      role: wsMessage.message.role,
      content: wsMessage.message.content,
      source: client.source,
      context: wsMessage.message.context,
      timestamp: new Date()
    };

    // Store message
    conversationStore.addMessage(message);

    logger.info(`💬 Message in ${message.conversationId} from ${message.source}`);

    // Broadcast to all clients in conversation (except sender)
    this.broadcastToRoom(wsMessage.conversationId, {
      type: 'message',
      conversationId: wsMessage.conversationId,
      message,
      source: client.source,
      timestamp: new Date().toISOString()
    }, client.id);
  }

  /**
   * Handle sync request
   */
  private handleSync(client: WSClient, message: WSMessage): void {
    const conversationId = message.conversationId;
    if (!conversationId) return;

    const messages = conversationStore.getRecentMessages(conversationId, 100);

    this.sendToClient(client, {
      type: 'sync',
      conversationId,
      timestamp: new Date().toISOString(),
      data: { messages }
    });
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(client: WSClient, message: WSMessage): void {
    const conversationId = message.conversationId;
    if (!conversationId) return;

    // Broadcast typing to others in room
    this.broadcastToRoom(conversationId, {
      type: 'typing',
      conversationId,
      source: client.source,
      clientId: client.id,
      timestamp: new Date().toISOString(),
      data: message.data
    }, client.id);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(client: WSClient): void {
    logger.info(`❌ Client disconnected: ${client.id} (${client.source})`);

    // Update presence in all conversations
    for (const conversationId of client.conversationIds) {
      if (client.source !== 'chatgpt') {
        conversationStore.updateParticipantStatus(
          conversationId,
          client.source as 'desktop' | 'web' | 'iphone',
          false
        );
      }

      // Notify others
      this.broadcastToRoom(conversationId, {
        type: 'presence',
        conversationId,
        source: client.source,
        clientId: client.id,
        timestamp: new Date().toISOString(),
        data: { action: 'disconnected' }
      }, client.id);

      // Remove from room
      const room = this.rooms.get(conversationId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.rooms.delete(conversationId);
        }
      }
    }

    this.clients.delete(client.id);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(`Failed to send to client ${client.id}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all clients in a conversation room
   */
  private broadcastToRoom(conversationId: string, message: WSMessage, excludeClientId?: string): void {
    const room = this.rooms.get(conversationId);
    if (!room) return;

    for (const clientId of room) {
      if (clientId === excludeClientId) continue;

      const client = this.clients.get(clientId);
      if (client) {
        this.sendToClient(client, message);
      }
    }

    // Publish to Redis for other instances
    this.publishToRedis(message, conversationId);
  }

  /**
   * Publish message to Redis for other JARVIS instances
   */
  private async publishToRedis(message: WSMessage, conversationId?: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.publish('jarvis:broadcasts', JSON.stringify({
        instanceId: this.instanceId,
        conversationId,
        message,
        timestamp: Date.now(),
      }));
    } catch (error) {
      logger.error('Failed to publish to Redis:', error);
    }
  }

  /**
   * Broadcast to all clients (global)
   */
  public broadcastToAll(message: WSMessage, excludeClientId?: string): void {
    for (const [clientId, client] of this.clients) {
      if (clientId === excludeClientId) continue;
      this.sendToClient(client, message);
    }
  }

  /**
   * Broadcast message from external source (e.g., ChatGPT webhook)
   */
  public broadcastMessage(message: Message): void {
    const conversationId = message.conversationId;

    // Store message
    conversationStore.addMessage(message);

    // Broadcast to room
    this.broadcastToRoom(conversationId, {
      type: 'message',
      conversationId,
      message,
      source: message.source,
      timestamp: new Date().toISOString()
    });

    logger.info(`📢 Broadcasted message from ${message.source} to conversation ${conversationId}`);
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 30000; // 30 seconds

      for (const [clientId, client] of this.clients) {
        const timeSinceLastSeen = now - client.lastSeen.getTime();

        if (timeSinceLastSeen > timeout) {
          logger.warn(`⏱️  Client ${clientId} timed out`);
          client.ws.terminate();
          this.handleDisconnect(client);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          // Send ping
          client.ws.ping();
        }
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Get statistics
   */
  public getStats() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      clientsBySource: Array.from(this.clients.values()).reduce((acc, c) => {
        acc[c.source] = (acc[c.source] || 0) + 1;
        return acc;
      }, {} as Record<MessageSource, number>)
    };
  }

  /**
   * Shutdown WebSocket server
   */
  public async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close(1000, 'Server shutdown');
    }

    this.clients.clear();
    this.rooms.clear();

    // Close Redis connections
    if (this.redisSub) {
      await this.redisSub.quit();
    }
    if (this.redis) {
      await this.redis.quit();
    }

    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss!.close(() => {
          logger.info('🔌 WebSocket Hub shut down');
          resolve();
        });
      });
    }
  }
}

// Singleton instance
export const websocketHub = new WebSocketHub();
