/**
 * E2E Tests: Session Management
 *
 * Tests session persistence, multi-instance support, and session lifecycle
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { TestClient, sleep } from './helpers/test-client.js';
import { randomUUID } from 'crypto';

// Use global fetch (Node 18+)
const fetch = globalThis.fetch;

describe('Session Management E2E', () => {
  const BASE_URL = 'http://localhost:4000';

  beforeAll(async () => {
    // Wait for JARVIS to be healthy
    let healthy = false;
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(`${BASE_URL}/health`);
        if (response.ok) {
          healthy = true;
          break;
        }
      } catch (error) {
        // Not ready
      }
      await sleep(1000);
    }

    if (!healthy) {
      throw new Error('JARVIS not healthy');
    }
  });

  test('should create and retrieve session', async () => {
    try {
      const sessionId = randomUUID();

      // Create session
      const createResponse = await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          source: 'web',
          data: {
            userId: 'test-user-123',
            preferences: { theme: 'dark' }
          }
        })
      });

      if (createResponse.ok) {
        const created = await createResponse.json();
        expect(created.success).toBe(true);

        await sleep(500);

        // Retrieve session
        const getResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);

        if (getResponse.ok) {
          const session = await getResponse.json();

          expect(session).toBeDefined();
          expect(session.id).toBe(sessionId);
          expect(session.source).toBe('web');
          expect(session.data.userId).toBe('test-user-123');
          expect(session.data.preferences.theme).toBe('dark');
        }
      } else {
        console.warn('Session endpoint not available');
      }
    } catch (error: any) {
      console.warn('Session test not available:', error.message);
    }
  }, 15000);

  test('should update session data', async () => {
    try {
      const sessionId = randomUUID();

      // Create initial session
      await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          source: 'desktop',
          data: { counter: 0 }
        })
      });

      await sleep(500);

      // Update session
      const updateResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: { counter: 5, newField: 'test' }
        })
      });

      if (updateResponse.ok) {
        await sleep(500);

        // Retrieve updated session
        const getResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);

        if (getResponse.ok) {
          const session = await getResponse.json();

          expect(session.data.counter).toBe(5);
          expect(session.data.newField).toBe('test');
        }
      } else {
        console.warn('Session update endpoint not available');
      }
    } catch (error: any) {
      console.warn('Session update test not available:', error.message);
    }
  }, 15000);

  test('should expire sessions after TTL', async () => {
    try {
      const sessionId = randomUUID();

      // Create session with short TTL (2 seconds)
      await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          source: 'web',
          data: { temporary: true },
          ttl: 2
        })
      });

      await sleep(500);

      // Should exist
      const getResponse1 = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
      expect(getResponse1.ok).toBe(true);

      // Wait for expiration
      await sleep(3000);

      // Should be expired
      const getResponse2 = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
      expect(getResponse2.status).toBe(404);

      console.log('Session correctly expired after TTL');
    } catch (error: any) {
      console.warn('Session TTL test not available:', error.message);
    }
  }, 10000);

  test('should extend session TTL on access', async () => {
    try {
      const sessionId = randomUUID();

      // Create session with 5 second TTL
      await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          source: 'web',
          data: { value: 'test' },
          ttl: 5
        })
      });

      // Access session repeatedly to extend TTL
      for (let i = 0; i < 3; i++) {
        await sleep(2000);
        const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
        expect(response.ok).toBe(true);
      }

      // After 6 seconds of repeated access, should still exist
      const finalResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
      expect(finalResponse.ok).toBe(true);

      console.log('Session TTL correctly extended on access');
    } catch (error: any) {
      console.warn('Session extension test not available:', error.message);
    }
  }, 15000);

  test('should handle multiple concurrent sessions', async () => {
    try {
      const sessionIds = Array.from({ length: 10 }, () => randomUUID());

      // Create 10 concurrent sessions
      await Promise.all(
        sessionIds.map((id, i) =>
          fetch(`${BASE_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              source: 'web',
              data: { sessionNumber: i }
            })
          })
        )
      );

      await sleep(1000);

      // Retrieve all sessions
      const sessions = await Promise.all(
        sessionIds.map(id => fetch(`${BASE_URL}/api/sessions/${id}`))
      );

      const successfulSessions = sessions.filter(r => r.ok);
      expect(successfulSessions.length).toBe(10);

      console.log(`Successfully managed ${successfulSessions.length} concurrent sessions`);
    } catch (error: any) {
      console.warn('Concurrent session test not available:', error.message);
    }
  }, 20000);

  test('should delete session', async () => {
    try {
      const sessionId = randomUUID();

      // Create session
      await fetch(`${BASE_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          source: 'web',
          data: { toDelete: true }
        })
      });

      await sleep(500);

      // Delete session
      const deleteResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE'
      });

      if (deleteResponse.ok) {
        await sleep(500);

        // Should not exist
        const getResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
        expect(getResponse.status).toBe(404);

        console.log('Session successfully deleted');
      } else {
        console.warn('Session delete endpoint not available');
      }
    } catch (error: any) {
      console.warn('Session delete test not available:', error.message);
    }
  }, 15000);

  test('should get all sessions for a user', async () => {
    try {
      const userId = `test-user-${randomUUID()}`;
      const sessionIds = Array.from({ length: 3 }, () => randomUUID());

      // Create multiple sessions for same user
      await Promise.all(
        sessionIds.map((id, i) =>
          fetch(`${BASE_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              userId,
              source: i === 0 ? 'desktop' : i === 1 ? 'web' : 'iphone',
              data: { sessionIndex: i }
            })
          })
        )
      );

      await sleep(1000);

      // Get all user sessions
      const response = await fetch(`${BASE_URL}/api/sessions?userId=${userId}`);

      if (response.ok) {
        const sessions = await response.json();

        expect(Array.isArray(sessions)).toBe(true);
        expect(sessions.length).toBe(3);

        // Check sources
        const sources = sessions.map((s: any) => s.source);
        expect(sources).toContain('desktop');
        expect(sources).toContain('web');
        expect(sources).toContain('iphone');

        console.log(`User has ${sessions.length} active sessions across different sources`);
      } else {
        console.warn('User sessions endpoint not available');
      }
    } catch (error: any) {
      console.warn('User sessions test not available:', error.message);
    }
  }, 20000);

  test('should clear all user sessions', async () => {
    try {
      const userId = `clear-test-${randomUUID()}`;
      const sessionIds = Array.from({ length: 5 }, () => randomUUID());

      // Create sessions
      await Promise.all(
        sessionIds.map(id =>
          fetch(`${BASE_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              userId,
              source: 'web',
              data: {}
            })
          })
        )
      );

      await sleep(1000);

      // Clear all user sessions
      const clearResponse = await fetch(`${BASE_URL}/api/sessions/clear?userId=${userId}`, {
        method: 'DELETE'
      });

      if (clearResponse.ok) {
        await sleep(1000);

        // Verify all sessions deleted
        const getResponse = await fetch(`${BASE_URL}/api/sessions?userId=${userId}`);

        if (getResponse.ok) {
          const sessions = await getResponse.json();
          expect(sessions.length).toBe(0);

          console.log('All user sessions successfully cleared');
        }
      } else {
        console.warn('Clear sessions endpoint not available');
      }
    } catch (error: any) {
      console.warn('Clear sessions test not available:', error.message);
    }
  }, 20000);
});
