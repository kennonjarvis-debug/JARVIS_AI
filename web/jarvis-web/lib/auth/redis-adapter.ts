import Redis from "ioredis";
import { v4 as uuidv4 } from "uuid";
import type { Adapter, AdapterSession, AdapterUser, AdapterAccount } from "next-auth/adapters";

export interface RedisAdapterOptions {
  redis: Redis;
  sessionMaxAge?: number; // in seconds, default 7 days
  sessionUpdateAge?: number; // in seconds, default 24 hours
  maxConcurrentSessions?: number; // default 3
}

interface RedisSession extends AdapterSession {
  sessionToken: string;
  userId: string;
  expires: Date;
  metadata?: {
    ip?: string;
    userAgent?: string;
    device?: string;
    location?: string;
    fingerprint?: string;
    lastActivity?: Date;
  };
}

/**
 * Custom NextAuth adapter for Redis session storage
 * Implements session serialization, TTL management, and concurrent session limits
 */
export function RedisAdapter(options: RedisAdapterOptions): Adapter {
  const redis = options.redis;
  const sessionMaxAge = options.sessionMaxAge || 7 * 24 * 60 * 60; // 7 days
  const sessionUpdateAge = options.sessionUpdateAge || 24 * 60 * 60; // 24 hours
  const maxConcurrentSessions = options.maxConcurrentSessions || 3;

  // Key patterns for Redis
  const keys = {
    user: (id: string) => `user:${id}`,
    account: (provider: string, providerAccountId: string) =>
      `account:${provider}:${providerAccountId}`,
    session: (sessionToken: string) => `session:${sessionToken}`,
    userSessions: (userId: string) => `user:${userId}:sessions`,
    sessionByUser: (userId: string, sessionToken: string) =>
      `user:${userId}:session:${sessionToken}`,
  };

  return {
    // User methods
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const id = uuidv4();
      const newUser: AdapterUser = { ...user, id };
      await redis.set(keys.user(id), JSON.stringify(newUser));
      return newUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const data = await redis.get(keys.user(id));
      if (!data) return null;
      return JSON.parse(data);
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      // Scan for user by email (not optimal, but works for small user bases)
      // For production, maintain an email->id index
      const userKeys = await redis.keys("user:*");
      for (const key of userKeys) {
        const data = await redis.get(key);
        if (data) {
          const user = JSON.parse(data);
          if (user.email === email) {
            return user;
          }
        }
      }
      return null;
    },

    async getUserByAccount({
      providerAccountId,
      provider
    }: {
      providerAccountId: string;
      provider: string
    }): Promise<AdapterUser | null> {
      const accountData = await redis.get(keys.account(provider, providerAccountId));
      if (!accountData) return null;

      const account: AdapterAccount = JSON.parse(accountData);
      const userData = await redis.get(keys.user(account.userId));
      if (!userData) return null;

      return JSON.parse(userData);
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const existing = await redis.get(keys.user(user.id));
      if (!existing) throw new Error("User not found");

      const existingUser = JSON.parse(existing);
      const updatedUser = { ...existingUser, ...user };
      await redis.set(keys.user(user.id), JSON.stringify(updatedUser));
      return updatedUser;
    },

    async deleteUser(userId: string): Promise<void> {
      // Delete user
      await redis.del(keys.user(userId));

      // Delete all user sessions
      const sessionTokens = await redis.smembers(keys.userSessions(userId));
      const pipeline = redis.pipeline();
      for (const token of sessionTokens) {
        pipeline.del(keys.session(token));
        pipeline.del(keys.sessionByUser(userId, token));
      }
      pipeline.del(keys.userSessions(userId));
      await pipeline.exec();
    },

    // Account methods
    async linkAccount(account: AdapterAccount): Promise<void> {
      await redis.set(
        keys.account(account.provider, account.providerAccountId),
        JSON.stringify(account)
      );
    },

    async unlinkAccount({
      providerAccountId,
      provider
    }: {
      providerAccountId: string;
      provider: string
    }): Promise<void> {
      await redis.del(keys.account(provider, providerAccountId));
    },

    // Session methods with concurrent session limits
    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      const userId = session.userId;

      // Check concurrent session limit
      const existingSessions = await redis.smembers(keys.userSessions(userId));

      if (existingSessions.length >= maxConcurrentSessions) {
        // Remove oldest session
        let oldestSession: RedisSession | null = null;
        let oldestToken: string | null = null;

        for (const token of existingSessions) {
          const sessionData = await redis.get(keys.session(token));
          if (sessionData) {
            const sess: RedisSession = JSON.parse(sessionData);
            if (!oldestSession || (sess.metadata?.lastActivity &&
                new Date(sess.metadata.lastActivity) < new Date(oldestSession.metadata?.lastActivity || 0))) {
              oldestSession = sess;
              oldestToken = token;
            }
          }
        }

        // Revoke oldest session
        if (oldestToken) {
          await redis.del(keys.session(oldestToken));
          await redis.del(keys.sessionByUser(userId, oldestToken));
          await redis.srem(keys.userSessions(userId), oldestToken);
        }
      }

      // Create new session
      const newSession: RedisSession = {
        ...session,
        metadata: {
          lastActivity: new Date(),
        },
      };

      const ttl = Math.floor((session.expires.getTime() - Date.now()) / 1000);

      // Store session with TTL
      await redis.setex(
        keys.session(session.sessionToken),
        ttl,
        JSON.stringify(newSession)
      );

      // Add to user's session set
      await redis.sadd(keys.userSessions(userId), session.sessionToken);
      await redis.setex(
        keys.sessionByUser(userId, session.sessionToken),
        ttl,
        "1"
      );

      return session;
    },

    async getSessionAndUser(sessionToken: string): Promise<{
      session: AdapterSession;
      user: AdapterUser;
    } | null> {
      const sessionData = await redis.get(keys.session(sessionToken));
      if (!sessionData) return null;

      const session: RedisSession = JSON.parse(sessionData);

      // Check if session expired
      if (new Date(session.expires) < new Date()) {
        await this.deleteSession?.(sessionToken);
        return null;
      }

      const userData = await redis.get(keys.user(session.userId));
      if (!userData) return null;

      const user: AdapterUser = JSON.parse(userData);

      // Update last activity
      const lastActivity = session.metadata?.lastActivity
        ? new Date(session.metadata.lastActivity)
        : new Date(0);
      const timeSinceLastUpdate = Date.now() - lastActivity.getTime();

      // Only update if more than sessionUpdateAge has passed
      if (timeSinceLastUpdate > sessionUpdateAge * 1000) {
        session.metadata = {
          ...session.metadata,
          lastActivity: new Date(),
        };

        const ttl = Math.floor((new Date(session.expires).getTime() - Date.now()) / 1000);
        await redis.setex(
          keys.session(sessionToken),
          ttl,
          JSON.stringify(session)
        );
      }

      return { session, user };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null | undefined> {
      const sessionData = await redis.get(keys.session(session.sessionToken));
      if (!sessionData) return null;

      const existingSession: RedisSession = JSON.parse(sessionData);
      const updatedSession = { ...existingSession, ...session };

      const ttl = Math.floor((new Date(updatedSession.expires).getTime() - Date.now()) / 1000);

      await redis.setex(
        keys.session(session.sessionToken),
        ttl,
        JSON.stringify(updatedSession)
      );

      return updatedSession;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      const sessionData = await redis.get(keys.session(sessionToken));
      if (sessionData) {
        const session: RedisSession = JSON.parse(sessionData);
        await redis.srem(keys.userSessions(session.userId), sessionToken);
        await redis.del(keys.sessionByUser(session.userId, sessionToken));
      }
      await redis.del(keys.session(sessionToken));
    },

    // Verification token methods (for email verification)
    async createVerificationToken(verificationToken: {
      identifier: string;
      expires: Date;
      token: string;
    }): Promise<void> {
      const ttl = Math.floor((verificationToken.expires.getTime() - Date.now()) / 1000);
      await redis.setex(
        `verification:${verificationToken.token}`,
        ttl,
        JSON.stringify(verificationToken)
      );
    },

    async useVerificationToken({
      identifier,
      token
    }: {
      identifier: string;
      token: string
    }): Promise<{ identifier: string; expires: Date; token: string } | null> {
      const data = await redis.get(`verification:${token}`);
      if (!data) return null;

      const verificationToken = JSON.parse(data);
      if (verificationToken.identifier !== identifier) return null;

      await redis.del(`verification:${token}`);
      return verificationToken;
    },
  };
}

/**
 * Helper function to get all active sessions for a user
 */
export async function getUserSessions(redis: Redis, userId: string): Promise<RedisSession[]> {
  const sessionTokens = await redis.smembers(`user:${userId}:sessions`);
  const sessions: RedisSession[] = [];

  for (const token of sessionTokens) {
    const sessionData = await redis.get(`session:${token}`);
    if (sessionData) {
      const session: RedisSession = JSON.parse(sessionData);
      // Check if session is still valid
      if (new Date(session.expires) > new Date()) {
        sessions.push(session);
      } else {
        // Clean up expired session
        await redis.del(`session:${token}`);
        await redis.del(`user:${userId}:session:${token}`);
        await redis.srem(`user:${userId}:sessions`, token);
      }
    }
  }

  return sessions;
}

/**
 * Helper function to revoke a specific session
 */
export async function revokeSession(redis: Redis, sessionToken: string): Promise<boolean> {
  const sessionData = await redis.get(`session:${sessionToken}`);
  if (!sessionData) return false;

  const session: RedisSession = JSON.parse(sessionData);
  await redis.del(`session:${sessionToken}`);
  await redis.del(`user:${session.userId}:session:${sessionToken}`);
  await redis.srem(`user:${session.userId}:sessions`, sessionToken);

  return true;
}

/**
 * Helper function to revoke all sessions for a user except the current one
 */
export async function revokeAllOtherSessions(
  redis: Redis,
  userId: string,
  currentSessionToken: string
): Promise<number> {
  const sessionTokens = await redis.smembers(`user:${userId}:sessions`);
  let revokedCount = 0;

  for (const token of sessionTokens) {
    if (token !== currentSessionToken) {
      await redis.del(`session:${token}`);
      await redis.del(`user:${userId}:session:${token}`);
      await redis.srem(`user:${userId}:sessions`, token);
      revokedCount++;
    }
  }

  return revokedCount;
}

/**
 * Update session metadata (IP, user agent, location, etc.)
 */
export async function updateSessionMetadata(
  redis: Redis,
  sessionToken: string,
  metadata: RedisSession["metadata"]
): Promise<void> {
  const sessionData = await redis.get(`session:${sessionToken}`);
  if (!sessionData) return;

  const session: RedisSession = JSON.parse(sessionData);
  session.metadata = { ...session.metadata, ...metadata };

  const ttl = Math.floor((new Date(session.expires).getTime() - Date.now()) / 1000);
  await redis.setex(`session:${sessionToken}`, ttl, JSON.stringify(session));
}
