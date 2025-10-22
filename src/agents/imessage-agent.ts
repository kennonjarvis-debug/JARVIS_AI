import { BaseAgent, type AgentConfig } from './base-agent';
import { IMessageReader, IMessage } from '../integrations/imessage/reader';
import { IMessageSender } from '../integrations/imessage/sender';
import { MessageRedactor } from '../integrations/imessage/redact';
import { MessageRouter, ResponseAction } from '../integrations/imessage/router';
import { TaskRequest, TaskResult, TaskType } from '../types/tasks';
import { CalendarIntegration } from '../integrations/calendar/index';
import { RemindersIntegration } from '../integrations/reminders/index';
import { GmailIntegration } from '../integrations/gmail/index';
import { GoogleCalendarIntegration } from '../integrations/google-calendar/index';

const createIMessageAgentConfig = (
  decisionEngine?: any,
  memory?: any,
  approvalQueue?: any
): AgentConfig => ({
  id: 'imessage-agent',
  name: 'IMessageAgent',
  capabilities: [],
  integrations: {},
  decisionEngine,
  memory,
  approvalQueue,
});

export class IMessageAgent extends BaseAgent {
  private reader: IMessageReader;
  private sender: IMessageSender;
  private redactor: MessageRedactor;
  private router: MessageRouter;
  private calendar?: CalendarIntegration;
  private googleCalendar?: GoogleCalendarIntegration;
  private reminders?: RemindersIntegration;
  private gmail?: GmailIntegration;
  private isRunning: boolean = false;

  constructor(decisionEngine?: any, memory?: any, approvalQueue?: any) {
    super(createIMessageAgentConfig(decisionEngine, memory, approvalQueue));
    this.reader = new IMessageReader();
    this.sender = new IMessageSender();
    this.redactor = new MessageRedactor();
    this.router = new MessageRouter();

    // Initialize calendar if user phone number is configured
    const userPhone = process.env.USER_PHONE_NUMBER;
    if (userPhone) {
      this.calendar = new CalendarIntegration(userPhone);
      this.logger.info('Calendar integration enabled', { userPhone: `***${userPhone.slice(-4)}` });
    } else {
      this.logger.warn('Calendar integration disabled - USER_PHONE_NUMBER not set');
    }

    // Initialize Reminders integration
    this.reminders = new RemindersIntegration('Jarvis');
    this.logger.info('Reminders integration enabled');

    // Initialize Gmail integration (if configured)
    try {
      this.gmail = new GmailIntegration();
      this.logger.info('Gmail integration ready (requires authorization)');
    } catch (error) {
      this.logger.warn('Gmail integration not configured');
    }

    // Initialize Google Calendar integration (for Gmail calendar sync)
    try {
      this.googleCalendar = new GoogleCalendarIntegration();
      this.logger.info('Google Calendar integration ready (shares Gmail OAuth)');
    } catch (error) {
      this.logger.warn('Google Calendar integration not configured');
    }

    this.setupEventHandlers();
  }

  // Implement abstract methods from BaseAgent
  getSupportedTaskTypes(): TaskType[] {
    return []; // IMessage agent doesn't handle standard task types
  }

  canHandle(_task: TaskRequest): boolean {
    // IMessage agent operates via events, not tasks
    return false;
  }

  async executeTask(_task: TaskRequest): Promise<TaskResult> {
    // IMessage agent operates via events, not tasks
    throw new Error('IMessageAgent does not support executeTask - it operates via message events');
  }

  /**
   * Start monitoring iMessages
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('IMessage agent already running');
      return;
    }

    this.logger.info('Starting iMessage agent');

    try {
      // Initialize components
      await this.sender.initialize();

      // Initialize Reminders integration
      if (this.reminders) {
        await this.reminders.initialize();
        this.logger.info('Reminders integration initialized');
      }

      // Initialize Gmail integration (if available)
      if (this.gmail) {
        try {
          await this.gmail.initialize();
          this.logger.info('Gmail integration initialized');
        } catch (error) {
          this.logger.warn('Gmail not authorized - run `npm run gmail:auth` to set up');
        }
      }

      // Initialize Google Calendar integration (if available)
      if (this.googleCalendar) {
        try {
          await this.googleCalendar.initialize();
          this.logger.info('Google Calendar integration initialized');
        } catch (error) {
          this.logger.warn('Google Calendar not authorized - shares Gmail OAuth token');
        }
      }

      // Verify Messages.app is accessible
      const isMessagesRunning = await this.sender.verifyMessagesApp();
      if (!isMessagesRunning) {
        this.logger.warn('Messages.app not running, attempting to launch');
        await this.sender.launchMessagesApp();
      }

      // Start reading messages
      await this.reader.start();

      this.isRunning = true;
      this.logger.info('iMessage agent is now operational');
    } catch (error) {
      this.logger.error('Failed to start iMessage agent', error as Error);
      throw error;
    }
  }

  /**
   * Stop monitoring iMessages
   */
  public stop(): void {
    this.logger.info('Stopping iMessage agent');

    this.reader.stop();
    this.isRunning = false;

    this.logger.info('iMessage agent stopped');
  }

  /**
   * Setup event handlers for incoming messages
   */
  private setupEventHandlers(): void {
    this.reader.on('message', async (message: IMessage) => {
      await this.handleIncomingMessage(message);
    });

    this.reader.on('ready', () => {
      this.logger.info('iMessage reader is ready');
    });
  }

  /**
   * Handle an incoming iMessage
   */
  private async handleIncomingMessage(message: IMessage): Promise<void> {
    // Ignore messages from yourself (prevents infinite loops)
    if (message.isFromMe) {
      this.logger.debug('Ignoring message from self');
      return;
    }

    this.logger.info('Incoming iMessage', {
      from: message.handleName,
      textLength: message.text.length,
      date: message.date
    });

    try {
      // Step 1: Check if message is safe (redaction check)
      if (!this.redactor.isSafeForAI(message.text)) {
        this.logger.warn('Message contains sensitive information, requesting approval');
        await this.requestIMessageApproval(message, 'Contains sensitive information');
        return;
      }

      // Step 2: Route the message
      const routing = this.router.route(message);

      this.logger.info('Message routed', {
        intent: routing.intent,
        action: routing.action,
        agent: routing.suggestedAgent,
        confidence: routing.confidence
      });

      // Step 2.5: Check for scheduling and create calendar events
      if (this.calendar) {
        const schedulingInfo = this.calendar.detectScheduling(message.text, message.handleName);
        if (schedulingInfo.hasScheduling) {
          this.logger.info('Scheduling detected', {
            eventType: schedulingInfo.eventType,
            confidence: schedulingInfo.confidence,
          });

          // Handle scheduling in the background (don't block message response)
          // Create in both macOS Calendar and Google Calendar for Gmail sync
          this.handleCalendarEvent(schedulingInfo, message.handleName, message.text).catch(error => {
            this.logger.error('Failed to handle scheduling', error as Error);
          });
        }
      }

      // Step 2.6: Check for reminder/to-do requests
      if (this.reminders) {
        const reminderInfo = this.detectReminderRequest(message.text);
        if (reminderInfo.isReminder) {
          this.logger.info('Reminder request detected', {
            task: reminderInfo.task,
            hasDueDate: !!reminderInfo.dueDate,
          });

          // Create reminder in the background
          this.handleReminderRequest(reminderInfo, message.handleName).catch(error => {
            this.logger.error('Failed to create reminder', error as Error);
          });
        }
      }

      // Step 3: Take action based on routing decision
      switch (routing.action) {
        case ResponseAction.AUTO_RESPOND:
          // Add human-like delay (30-60 seconds) before responding
          const delay = 30000 + Math.random() * 30000; // Random 30-60 seconds
          this.logger.info('Scheduling response with human-like delay', {
            delaySeconds: Math.round(delay / 1000)
          });

          setTimeout(async () => {
            await this.autoRespond(message, routing.suggestedAgent || 'support');
          }, delay);
          break;

        case ResponseAction.REQUEST_APPROVAL:
          await this.requestIMessageApproval(message, routing.reason);
          break;

        case ResponseAction.ESCALATE:
          await this.escalateMessage(message, 'Marked as urgent');
          break;

        case ResponseAction.IGNORE:
          this.logger.info('Message ignored per routing rules');
          break;
      }

      // Step 4: Store in memory (if available)
      if (this.memory) {
        await this.memory.store({
          type: 'task_execution' as any,
          content: {
            message: message.text,
            from: message.handleName,
            routing: routing
          },
          timestamp: new Date(),
          importance: 0.5,
          agentId: this.id,
          tags: ['imessage', routing.intent],
        });
      }

    } catch (error) {
      this.logger.error('Error handling incoming message', error as Error);

      // Send error notification to user
      await this.sender.sendMessage({
        to: message.handleName,
        message: "I'm having trouble processing your message right now. I'll have a human follow up with you shortly."
      });
    }
  }

  /**
   * Auto-respond to a message using Claude and the appropriate agent
   */
  private async autoRespond(message: IMessage, agentName: string): Promise<void> {
    this.logger.info('Auto-responding to message', { agent: agentName });

    try {
      // Redact message for AI processing
      const prepared = this.redactor.prepareForAI(message.text);

      // Get conversation history for context
      const history = this.reader.getConversationHistory(message.handleName, 5);

      // Generate response using Claude
      const task = `You are responding as Ben Kennon via iMessage. NEVER reveal you are an AI assistant - you ARE Ben.

CRITICAL RULES:
- Respond as Ben, using first person ("I", "me", "my")
- NEVER say "I'm an AI" or "I'm an assistant" or anything revealing you're automated
- For requests you can't fulfill (screenshots, physical actions), deflect naturally: "Can't do that right now" or "I'll get to that later" or "Busy at the moment"
- Be natural, casual, and brief - like texting as a real person
- Match the sender's tone and energy

From: ${message.handleName}
Message: "${prepared.text}"

Recent Conversation:
${history.slice(0, 3).map(h => `${h.isFromMe ? 'You' : message.handleName}: ${h.text}`).join('\n')}

${prepared.warning || ''}

Respond as Ben in 1-3 sentences. Be natural and human. Just provide the response text, nothing else.`;

      const responseText = await this.generateContent(task);

      // Send via iMessage
      await this.sender.sendMessage({
        to: message.handleName,
        message: responseText
      });

      this.logger.info('Auto-response sent successfully');

    } catch (error) {
      this.logger.error('Failed to auto-respond', error as Error);
      throw error;
    }
  }

  /**
   * Request approval before responding (overload to handle iMessages)
   */
  private async requestIMessageApproval(message: IMessage, reason: string): Promise<void> {
    this.logger.info('Requesting approval for iMessage response', { reason });

    // If no approval queue is configured, just log and skip
    if (!this.approvalQueue) {
      this.logger.warn('No approval queue configured - skipping approval request');
      return;
    }

    try {
      const requestId = await this.approvalQueue.requestApproval({
        taskId: crypto.randomUUID(),
        taskType: 'support.ticket.respond' as any,
        requestedAction: JSON.stringify({
          from: message.handleName,
          message: message.text,
          messageId: message.guid,
        }),
        reasoning: `iMessage response approval: ${reason}`,
        riskLevel: 'high' as any,
        estimatedImpact: {
          description: 'Responding to external iMessage communication',
        },
        metadata: {
          agentId: this.id,
        },
      });

      this.logger.info('Approval request created', { requestId });

    } catch (error) {
      this.logger.error('Failed to request approval', error as Error);
    }
  }

  /**
   * Escalate urgent message
   */
  private async escalateMessage(message: IMessage, reason: string): Promise<void> {
    this.logger.warn('Escalating message', { reason });

    // Send immediate acknowledgment
    await this.sender.sendMessage({
      to: message.handleName,
      message: "Thanks for reaching out. I've flagged this as urgent and a team member will respond shortly."
    });

    // Create high-priority approval request
    await this.requestIMessageApproval(message, `URGENT: ${reason}`);
  }

  /**
   * Manually send a message (for approved responses)
   */
  public async sendMessage(to: string, text: string): Promise<void> {
    this.logger.info('Sending manual message', { to });

    await this.sender.sendMessage({ to, message: text });

    // Store in memory (if available)
    if (this.memory) {
      await this.memory.store({
        type: 'task_execution' as any,
        content: {
          action: 'send_message',
          to,
          messageLength: text.length
        },
        timestamp: new Date(),
        importance: 0.5,
        agentId: this.id,
        tags: ['imessage', 'manual_send'],
      });
    }
  }

  /**
   * Add an allowed contact (for auto-responses)
   */
  public addAllowedContact(handle: string): void {
    this.router.addAllowedContact(handle);
    this.logger.info('Added allowed contact for auto-responses', { handle });
  }

  /**
   * Remove an allowed contact
   */
  public removeAllowedContact(handle: string): void {
    this.router.removeAllowedContact(handle);
    this.logger.info('Removed allowed contact', { handle });
  }

  /**
   * Block a contact
   */
  public blockContact(handle: string): void {
    this.router.blockContact(handle);
    this.logger.info('Blocked contact', { handle });
  }

  /**
   * Get recent messages (for debugging/monitoring)
   */
  public getRecentMessages(limit: number = 20): IMessage[] {
    return this.reader.getRecentMessages(limit);
  }

  /**
   * Get conversation history with a specific contact
   */
  public getConversation(handle: string, limit: number = 50): IMessage[] {
    return this.reader.getConversationHistory(handle, limit);
  }

  /**
   * Get agent status - override to match AgentStatus interface
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      activeTasks: 0,
      capabilities: this.capabilities,
      isHealthy: this.status !== 'error',
      statusMessage: this.isRunning ? 'Running' : 'Stopped',
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Detect if message is a reminder/to-do request
   */
  private detectReminderRequest(text: string): {
    isReminder: boolean;
    task?: string;
    dueDate?: Date;
    priority?: 0 | 1 | 5 | 9;
  } {
    const lowerText = text.toLowerCase();

    // Reminder patterns
    const reminderPatterns = [
      /remind\s+me\s+to\s+(.+)/i,
      /add\s+(?:to\s+)?(?:my\s+)?(?:to-?do|task|reminder)(?:\s+list)?:?\s*(.+)/i,
      /create\s+(?:a\s+)?(?:task|reminder|to-?do)(?:\s+to)?:?\s*(.+)/i,
      /don'?t\s+forget\s+to\s+(.+)/i,
      /(?:i\s+)?need\s+to\s+remember\s+to\s+(.+)/i,
    ];

    for (const pattern of reminderPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let task = match[1].trim();

        // Try to extract priority
        let priority: 0 | 1 | 5 | 9 = 0;
        if (/urgent|important|asap|high\s+priority/i.test(text)) {
          priority = 9; // High
          task = task.replace(/urgent|important|asap|high\s+priority/gi, '').trim();
        } else if (/low\s+priority/i.test(text)) {
          priority = 1; // Low
          task = task.replace(/low\s+priority/gi, '').trim();
        }

        // Try to extract due date (simple patterns)
        let dueDate: Date | undefined;
        if (/tomorrow/i.test(text)) {
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 1);
          dueDate.setHours(9, 0, 0, 0); // 9 AM default
          task = task.replace(/tomorrow/gi, '').trim();
        } else if (/today/i.test(text)) {
          dueDate = new Date();
          dueDate.setHours(17, 0, 0, 0); // 5 PM default
          task = task.replace(/today/gi, '').trim();
        }

        return {
          isReminder: true,
          task,
          dueDate,
          priority,
        };
      }
    }

    return { isReminder: false };
  }

  /**
   * Handle reminder creation request
   */
  private async handleReminderRequest(
    reminderInfo: { task: string; dueDate?: Date; priority?: 0 | 1 | 5 | 9 },
    senderHandle: string
  ): Promise<void> {
    if (!this.reminders) {
      return;
    }

    try {
      const reminderId = await this.reminders.createReminder({
        name: reminderInfo.task,
        body: `Requested by ${senderHandle}`,
        dueDate: reminderInfo.dueDate,
        priority: reminderInfo.priority || 0,
      });

      this.logger.info('Reminder created', {
        id: reminderId,
        task: reminderInfo.task,
        sender: senderHandle,
      });

      // Optionally send confirmation (but don't interrupt conversation flow)
      // The auto-response will naturally acknowledge it
    } catch (error) {
      this.logger.error('Failed to create reminder', error as Error);
    }
  }

  /**
   * Handle calendar event creation in BOTH macOS Calendar and Google Calendar
   */
  private async handleCalendarEvent(
    schedulingInfo: any,
    senderHandle: string,
    messageText: string
  ): Promise<void> {
    try {
      // Create in macOS Calendar first (for local visibility)
      if (this.calendar) {
        await this.calendar.handleScheduling(schedulingInfo, senderHandle, messageText);
      }

      // Also create in Google Calendar (for Gmail sync)
      if (this.googleCalendar && schedulingInfo.suggestedEvent) {
        const googleEvent = this.googleCalendar.convertToGoogleEvent(schedulingInfo.suggestedEvent);
        const eventId = await this.googleCalendar.createEvent(googleEvent);

        this.logger.info('Event synced to Google Calendar', {
          eventId,
          summary: googleEvent.summary,
          email: 'kennonjarvis@gmail.com',
        });
      }
    } catch (error) {
      this.logger.error('Failed to create calendar event', error as Error);
      // Don't throw - we want to continue even if one calendar fails
    }
  }

  /**
   * Get iMessage-specific status
   */
  getIMessageStatus(): {
    isRunning: boolean;
    messagesProcessed: number;
    lastActivity: Date | null;
  } {
    return {
      isRunning: this.isRunning,
      messagesProcessed: 0, // TODO: Track this
      lastActivity: null // TODO: Track this
    };
  }
}
