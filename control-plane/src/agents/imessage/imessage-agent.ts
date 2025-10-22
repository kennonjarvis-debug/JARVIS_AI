/**
 * iMessage Agent
 * Main orchestrator for iMessage auto-responses
 */

import { EventEmitter } from 'events';
import { IMessageDatabaseMonitor } from './database-monitor.js';
import { ContactManager } from './contact-manager.js';
import { AIResponder } from './ai-responder.js';
import { MessageSender } from './message-sender.js';
import { LoopPrevention } from './loop-prevention.js';
import { IMessage, Contact, ConversationContext, ResponseLog } from './types.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface IMessageAgentConfig {
  enabled: boolean;
  dataDirectory?: string;
  pollIntervalMs?: number;
  rateLimits?: {
    maxPerHour?: number;
    maxPerDay?: number;
    minIntervalMinutes?: number;
  };
}

export class IMessageAgent extends EventEmitter {
  private monitor: IMessageDatabaseMonitor;
  private contactManager: ContactManager;
  private aiResponder: AIResponder;
  private messageSender: MessageSender;
  private loopPrevention: LoopPrevention;

  private config: IMessageAgentConfig;
  private isRunning: boolean = false;

  constructor(config: IMessageAgentConfig = { enabled: true }) {
    super();

    this.config = {
      enabled: true,
      dataDirectory: '/tmp/jarvis-imessage',
      pollIntervalMs: 2000,
      rateLimits: {
        maxPerHour: 3,
        maxPerDay: 10,
        minIntervalMinutes: 60,
      },
      ...config,
    };

    // Initialize components
    this.monitor = new IMessageDatabaseMonitor();
    this.contactManager = new ContactManager(this.config.dataDirectory);
    this.aiResponder = new AIResponder();
    this.messageSender = new MessageSender();
    this.loopPrevention = new LoopPrevention(this.config.dataDirectory);

    // Configure loop prevention
    if (this.config.rateLimits) {
      this.loopPrevention.configure(
        this.config.rateLimits.maxPerHour || 3,
        this.config.rateLimits.maxPerDay || 10,
        this.config.rateLimits.minIntervalMinutes || 60
      );
    }

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Start the iMessage agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('iMessage agent already running');
      return;
    }

    if (!this.config.enabled) {
      logger.warn('iMessage agent is disabled');
      return;
    }

    try {
      // Ensure Messages.app is running
      const isRunning = await this.messageSender.isMessagesAppRunning();
      if (!isRunning) {
        logger.info('Launching Messages.app...');
        await this.messageSender.launchMessagesApp();
      }

      // Start monitoring
      this.monitor.start(this.config.pollIntervalMs);
      this.isRunning = true;

      logger.info('iMessage agent started', {
        pollInterval: this.config.pollIntervalMs,
        whitelistedContacts: this.contactManager.getWhitelist().length,
      });

      this.emit('started');
    } catch (error) {
      logger.error('Failed to start iMessage agent', { error });
      throw error;
    }
  }

  /**
   * Stop the iMessage agent
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.monitor.stop();
    this.isRunning = false;

    logger.info('iMessage agent stopped');
    this.emit('stopped');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for new messages
    this.monitor.on('message', async (message: IMessage) => {
      await this.handleIncomingMessage(message);
    });

    // Listen for errors
    this.monitor.on('error', (error: Error) => {
      logger.error('iMessage monitor error', { error });
      this.emit('error', error);
    });
  }

  /**
   * Handle an incoming message
   */
  private async handleIncomingMessage(message: IMessage): Promise<void> {
    try {
      logger.info('Processing incoming message', {
        handle: message.handle,
        preview: message.text.substring(0, 50),
      });

      // Check if contact is whitelisted
      if (!this.contactManager.isWhitelisted(message.handle)) {
        logger.debug('Contact not whitelisted, skipping', { handle: message.handle });
        this.emit('message_skipped', { message, reason: 'not_whitelisted' });
        return;
      }

      // Check for loop detection
      if (this.loopPrevention.detectLoop(message.text)) {
        logger.warn('Potential loop detected, skipping response', { handle: message.handle });
        this.emit('message_skipped', { message, reason: 'loop_detected' });
        return;
      }

      // Check rate limits
      const rateLimitCheck = this.loopPrevention.canRespond(message.handle);
      if (!rateLimitCheck.allowed) {
        logger.info('Rate limit hit, skipping response', {
          handle: message.handle,
          reason: rateLimitCheck.reason,
        });
        this.emit('message_skipped', { message, reason: 'rate_limit', details: rateLimitCheck.reason });
        return;
      }

      // Get contact info
      const contact = this.contactManager.getContact(message.handle);
      if (!contact) {
        logger.warn('Contact not found in manager, creating default', { handle: message.handle });
        this.contactManager.addToWhitelist(message.handle, 'unknown');
        return;
      }

      // Get conversation context
      const context = this.getConversationContext(message.handle);

      // Generate AI response
      const { response, confidence } = await this.aiResponder.generateResponse(message, context, contact);

      logger.info('AI response generated', {
        handle: message.handle,
        confidence,
        responsePreview: response.substring(0, 50),
      });

      // Send response
      const sendResult = await this.messageSender.sendWithRetry(message.handle, response);

      if (!sendResult.success) {
        logger.error('Failed to send response', {
          handle: message.handle,
          error: sendResult.error,
        });
        this.emit('send_failed', { message, response, error: sendResult.error });
        return;
      }

      // Record response
      const responseLog: ResponseLog = {
        id: uuidv4(),
        handle: message.handle,
        messageReceived: message.text,
        messageReplied: response,
        timestamp: new Date(),
        aiModel: 'claude-3-5-sonnet-20241022',
        confidence,
      };

      this.loopPrevention.recordResponse(responseLog);
      this.contactManager.incrementResponseCount(message.handle);

      logger.info('Response sent successfully', {
        handle: message.handle,
        responseCount: contact.responseCount + 1,
      });

      this.emit('response_sent', { message, response, confidence });
    } catch (error: any) {
      logger.error('Error handling incoming message', {
        error: error.message,
        handle: message.handle,
      });
      this.emit('error', error);
    }
  }

  /**
   * Get conversation context for a contact
   */
  private getConversationContext(handle: string): ConversationContext {
    const recentMessages = this.monitor.getRecentMessages(handle, 10);

    return {
      handle,
      messages: recentMessages.map(msg => ({
        text: msg.text,
        isFromMe: msg.isFromMe,
        timestamp: msg.dateCreated,
      })),
      lastUpdated: new Date(),
    };
  }

  /**
   * Get agent status
   */
  getStatus(): {
    isRunning: boolean;
    enabled: boolean;
    whitelistedContacts: number;
    totalContacts: number;
  } {
    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled,
      whitelistedContacts: this.contactManager.getWhitelist().length,
      totalContacts: this.contactManager.getAllContacts().length,
    };
  }

  /**
   * Get contact manager instance
   */
  getContactManager(): ContactManager {
    return this.contactManager;
  }

  /**
   * Get loop prevention instance
   */
  getLoopPrevention(): LoopPrevention {
    return this.loopPrevention;
  }

  /**
   * Test AI response generation
   */
  async testResponse(message: string): Promise<string> {
    return await this.aiResponder.test(message);
  }
}
