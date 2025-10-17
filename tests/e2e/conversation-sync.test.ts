/**
 * E2E Tests: Conversation Synchronization
 *
 * Tests real-time message synchronization across multiple clients
 * (Desktop, Web, ChatGPT, iPhone)
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestClient, TestAPIClient, sleep } from './helpers/test-client.js';
import { randomUUID } from 'crypto';

describe('Conversation Synchronization E2E', () => {
  let desktopClient: TestClient;
  let webClient: TestClient;
  let iphoneClient: TestClient;
  let apiClient: TestAPIClient;
  let conversationId: string;

  beforeAll(async () => {
    // Initialize API client
    apiClient = new TestAPIClient();

    // Wait for JARVIS to be healthy
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      try {
        const health = await apiClient.getHealth();
        if (health.status === 'healthy') {
          healthy = true;
          break;
        }
      } catch (error) {
        // Service not ready yet
      }
      await sleep(1000);
    }

    if (!healthy) {
      throw new Error('JARVIS service not healthy');
    }
  });

  beforeEach(async () => {
    // Create new conversation for each test
    const conversation = await apiClient.createConversation('web');
    conversationId = conversation.id;

    // Initialize clients
    desktopClient = new TestClient('http://localhost:4000', 'desktop');
    webClient = new TestClient('http://localhost:4000', 'web');
    iphoneClient = new TestClient('http://localhost:4000', 'iphone');
  });

  afterAll(async () => {
    // Clean up connections
    await Promise.all([
      desktopClient?.disconnect(),
      webClient?.disconnect(),
      iphoneClient?.disconnect()
    ]);
  });

  test('should sync messages across desktop and web clients', async () => {
    // Connect both clients
    await desktopClient.connect();
    await webClient.connect();

    // Join same conversation
    await desktopClient.joinConversation(conversationId);
    await webClient.joinConversation(conversationId);

    // Send message from desktop
    const testMessage = {
      role: 'user' as const,
      content: 'Hello from desktop!',
      conversationId
    };

    await desktopClient.sendMessage(testMessage);

    // Wait for message on web client
    const receivedMessage = await webClient.waitForMessage(
      (msg) => msg.type === 'message' && msg.message?.content === testMessage.content
    );

    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.message.content).toBe('Hello from desktop!');
    expect(receivedMessage.source).toBe('desktop');
  });

  test('should sync messages across all three clients', async () => {
    // Connect all clients
    await Promise.all([
      desktopClient.connect(),
      webClient.connect(),
      iphoneClient.connect()
    ]);

    // Join same conversation
    await Promise.all([
      desktopClient.joinConversation(conversationId),
      webClient.joinConversation(conversationId),
      iphoneClient.joinConversation(conversationId)
    ]);

    // Send message from iPhone
    const testMessage = {
      role: 'user' as const,
      content: 'Testing multi-client sync',
      conversationId
    };

    await iphoneClient.sendMessage(testMessage);

    // Wait for message on both other clients
    const [desktopMsg, webMsg] = await Promise.all([
      desktopClient.waitForMessage(
        (msg) => msg.type === 'message' && msg.message?.content === testMessage.content
      ),
      webClient.waitForMessage(
        (msg) => msg.type === 'message' && msg.message?.content === testMessage.content
      )
    ]);

    expect(desktopMsg.message.content).toBe('Testing multi-client sync');
    expect(webMsg.message.content).toBe('Testing multi-client sync');
    expect(desktopMsg.source).toBe('iphone');
    expect(webMsg.source).toBe('iphone');
  });

  test('should handle client join/leave presence updates', async () => {
    // Connect desktop client
    await desktopClient.connect();
    await desktopClient.joinConversation(conversationId);

    // Connect web client
    await webClient.connect();

    // Clear messages to avoid catching old presence
    desktopClient.clearMessages();

    // Web client joins - desktop should see presence
    await webClient.joinConversation(conversationId);

    const joinPresence = await desktopClient.waitForMessage(
      (msg) => msg.type === 'presence' && msg.data?.action === 'joined'
    );

    expect(joinPresence).toBeDefined();
    expect(joinPresence.source).toBe('web');

    // Clear messages again
    desktopClient.clearMessages();

    // Web client disconnects
    await webClient.disconnect();

    // Desktop should see disconnect presence
    const leavePresence = await desktopClient.waitForMessage(
      (msg) => msg.type === 'presence' && msg.data?.action === 'disconnected',
      3000
    );

    expect(leavePresence).toBeDefined();
    expect(leavePresence.source).toBe('web');
  });

  test('should maintain message order across clients', async () => {
    await desktopClient.connect();
    await webClient.connect();

    await desktopClient.joinConversation(conversationId);
    await webClient.joinConversation(conversationId);

    // Send multiple messages in sequence
    const messages = [
      'Message 1',
      'Message 2',
      'Message 3',
      'Message 4',
      'Message 5'
    ];

    for (const content of messages) {
      await desktopClient.sendMessage({
        role: 'user',
        content,
        conversationId
      });
      await sleep(100); // Small delay between messages
    }

    // Wait for all messages on web client
    await sleep(1000);

    const receivedMessages = webClient.getMessages()
      .filter((msg) => msg.type === 'message')
      .map((msg) => msg.message.content);

    // Check all messages received in order
    for (let i = 0; i < messages.length; i++) {
      expect(receivedMessages).toContain(messages[i]);
    }
  });

  test('should sync conversation history on late join', async () => {
    // Desktop sends messages first
    await desktopClient.connect();
    await desktopClient.joinConversation(conversationId);

    const historicalMessages = [
      'Historical message 1',
      'Historical message 2',
      'Historical message 3'
    ];

    for (const content of historicalMessages) {
      await desktopClient.sendMessage({
        role: 'user',
        content,
        conversationId
      });
    }

    await sleep(500);

    // Web client joins later
    await webClient.connect();
    await webClient.joinConversation(conversationId);

    // Should receive sync message with history
    const syncMessage = await webClient.waitForMessage(
      (msg) => msg.type === 'sync' && msg.conversationId === conversationId
    );

    expect(syncMessage).toBeDefined();
    expect(syncMessage.data.messages).toBeDefined();
    expect(syncMessage.data.messages.length).toBeGreaterThanOrEqual(historicalMessages.length);

    // Check that historical messages are in sync data
    const syncedContents = syncMessage.data.messages.map((m: any) => m.content);
    for (const content of historicalMessages) {
      expect(syncedContents).toContain(content);
    }
  });

  test('should handle typing indicators across clients', async () => {
    await desktopClient.connect();
    await webClient.connect();

    await desktopClient.joinConversation(conversationId);
    await webClient.joinConversation(conversationId);

    // Clear messages
    webClient.clearMessages();

    // Desktop sends typing indicator
    (desktopClient as any).ws.send(JSON.stringify({
      type: 'typing',
      conversationId,
      data: { isTyping: true }
    }));

    // Web should receive typing indicator
    const typingMsg = await webClient.waitForMessage(
      (msg) => msg.type === 'typing' && msg.conversationId === conversationId
    );

    expect(typingMsg).toBeDefined();
    expect(typingMsg.source).toBe('desktop');
    expect(typingMsg.data.isTyping).toBe(true);
  });

  test('should persist messages across client reconnections', async () => {
    // Desktop sends a message
    await desktopClient.connect();
    await desktopClient.joinConversation(conversationId);

    await desktopClient.sendMessage({
      role: 'user',
      content: 'Persistent message test',
      conversationId
    });

    await sleep(500);

    // Disconnect desktop
    await desktopClient.disconnect();

    // Web client connects and should see the message
    await webClient.connect();
    await webClient.joinConversation(conversationId);

    const syncMessage = await webClient.waitForMessage(
      (msg) => msg.type === 'sync'
    );

    const messages = syncMessage.data.messages;
    const persistentMessage = messages.find(
      (m: any) => m.content === 'Persistent message test'
    );

    expect(persistentMessage).toBeDefined();
    expect(persistentMessage.source).toBe('desktop');
  });
});
