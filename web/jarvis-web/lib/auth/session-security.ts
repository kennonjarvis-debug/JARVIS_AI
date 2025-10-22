import Redis from "ioredis";
import { createHash, randomBytes } from "crypto";
import { UAParser } from "ua-parser-js";

export interface SessionFingerprint {
  hash: string;
  components: {
    userAgent: string;
    ip: string;
    acceptLanguage?: string;
    screenResolution?: string;
  };
}

export interface SessionMetadata {
  ip: string;
  userAgent: string;
  device: string;
  browser: string;
  os: string;
  location?: string;
  fingerprint: string;
  createdAt: Date;
  lastActivity: Date;
  lastIp?: string;
}

export interface SecurityEvent {
  type: "login" | "logout" | "session_created" | "session_revoked" | "suspicious_activity" | "session_expired";
  userId: string;
  sessionToken?: string;
  metadata: SessionMetadata;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Session security service for detecting suspicious activity,
 * implementing fingerprinting, rate limiting, and audit logging
 */
export class SessionSecurityService {
  private redis: Redis;
  private maxLoginAttempts: number;
  private loginAttemptWindow: number; // in seconds
  private suspiciousActivityThreshold: number;

  constructor(
    redis: Redis,
    options?: {
      maxLoginAttempts?: number;
      loginAttemptWindow?: number;
      suspiciousActivityThreshold?: number;
    }
  ) {
    this.redis = redis;
    this.maxLoginAttempts = options?.maxLoginAttempts || 5;
    this.loginAttemptWindow = options?.loginAttemptWindow || 15 * 60; // 15 minutes
    this.suspiciousActivityThreshold = options?.suspiciousActivityThreshold || 3;
  }

  /**
   * Generate session fingerprint from request metadata
   */
  generateFingerprint(
    userAgent: string,
    ip: string,
    acceptLanguage?: string,
    screenResolution?: string
  ): SessionFingerprint {
    const components = {
      userAgent,
      ip,
      acceptLanguage,
      screenResolution,
    };

    const fingerprintString = JSON.stringify(components);
    const hash = createHash("sha256").update(fingerprintString).digest("hex");

    return { hash, components };
  }

  /**
   * Parse user agent and extract device information
   */
  parseUserAgent(userAgent: string): {
    device: string;
    browser: string;
    os: string;
  } {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const device = result.device.type
      ? `${result.device.vendor || ""} ${result.device.model || ""}`.trim() || "Unknown Device"
      : "Desktop";

    const browser = result.browser.name
      ? `${result.browser.name} ${result.browser.version || ""}`.trim()
      : "Unknown Browser";

    const os = result.os.name
      ? `${result.os.name} ${result.os.version || ""}`.trim()
      : "Unknown OS";

    return { device, browser, os };
  }

  /**
   * Create session metadata from request
   */
  createSessionMetadata(
    ip: string,
    userAgent: string,
    acceptLanguage?: string,
    screenResolution?: string
  ): SessionMetadata {
    const fingerprint = this.generateFingerprint(
      userAgent,
      ip,
      acceptLanguage,
      screenResolution
    );
    const { device, browser, os } = this.parseUserAgent(userAgent);

    return {
      ip,
      userAgent,
      device,
      browser,
      os,
      fingerprint: fingerprint.hash,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
  }

  /**
   * Check if IP is rate limited for login attempts
   */
  async checkRateLimit(ip: string): Promise<{
    allowed: boolean;
    attempts: number;
    resetAt: Date;
  }> {
    const key = `rate_limit:login:${ip}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      // First attempt, set expiry
      await this.redis.expire(key, this.loginAttemptWindow);
    }

    const ttl = await this.redis.ttl(key);
    const resetAt = new Date(Date.now() + ttl * 1000);

    return {
      allowed: attempts <= this.maxLoginAttempts,
      attempts,
      resetAt,
    };
  }

  /**
   * Reset rate limit for an IP (e.g., after successful login)
   */
  async resetRateLimit(ip: string): Promise<void> {
    const key = `rate_limit:login:${ip}`;
    await this.redis.del(key);
  }

  /**
   * Detect suspicious activity by comparing session metadata
   */
  async detectSuspiciousActivity(
    userId: string,
    currentMetadata: SessionMetadata,
    previousMetadata?: SessionMetadata
  ): Promise<{
    suspicious: boolean;
    reasons: string[];
    score: number;
  }> {
    const reasons: string[] = [];
    let score = 0;

    if (previousMetadata) {
      // Check for IP change
      if (previousMetadata.ip !== currentMetadata.ip) {
        reasons.push("IP address changed");
        score += 1;

        // Check if IPs are from different countries (simplified check)
        // In production, use a GeoIP service
        const prevIpPrefix = previousMetadata.ip.split(".")[0];
        const currIpPrefix = currentMetadata.ip.split(".")[0];
        if (Math.abs(parseInt(prevIpPrefix) - parseInt(currIpPrefix)) > 50) {
          reasons.push("IP address changed significantly (possible location change)");
          score += 2;
        }
      }

      // Check for user agent change
      if (previousMetadata.userAgent !== currentMetadata.userAgent) {
        reasons.push("User agent changed");
        score += 1;
      }

      // Check for device change
      if (previousMetadata.device !== currentMetadata.device) {
        reasons.push("Device changed");
        score += 2;
      }

      // Check for OS change
      if (previousMetadata.os !== currentMetadata.os) {
        reasons.push("Operating system changed");
        score += 2;
      }

      // Check for rapid location changes (impossible travel)
      const timeDiff =
        new Date(currentMetadata.lastActivity).getTime() -
        new Date(previousMetadata.lastActivity).getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff < 60 && score >= 2) {
        reasons.push("Rapid changes detected (impossible travel)");
        score += 3;
      }
    }

    // Check against known suspicious patterns
    const suspiciousIp = await this.isSuspiciousIp(currentMetadata.ip);
    if (suspiciousIp) {
      reasons.push("IP address flagged as suspicious");
      score += 3;
    }

    const suspicious = score >= this.suspiciousActivityThreshold;

    if (suspicious) {
      await this.logSecurityEvent({
        type: "suspicious_activity",
        userId,
        metadata: currentMetadata,
        details: { reasons, score },
        timestamp: new Date(),
      });
    }

    return { suspicious, reasons, score };
  }

  /**
   * Check if an IP is flagged as suspicious
   */
  async isSuspiciousIp(ip: string): Promise<boolean> {
    // Check if IP is in suspicious IP set
    const suspicious = await this.redis.sismember("suspicious_ips", ip);
    return suspicious === 1;
  }

  /**
   * Flag an IP as suspicious
   */
  async flagSuspiciousIp(ip: string, reason: string, duration?: number): Promise<void> {
    await this.redis.sadd("suspicious_ips", ip);
    await this.redis.set(`suspicious_ip:${ip}:reason`, reason);

    if (duration) {
      await this.redis.expire("suspicious_ips", duration);
      await this.redis.expire(`suspicious_ip:${ip}:reason`, duration);
    }
  }

  /**
   * Log security event to Redis
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const eventId = randomBytes(16).toString("hex");
    const key = `security_event:${eventId}`;

    await this.redis.setex(
      key,
      30 * 24 * 60 * 60, // Keep logs for 30 days
      JSON.stringify(event)
    );

    // Add to user's security event timeline
    const userEventKey = `user:${event.userId}:security_events`;
    await this.redis.zadd(
      userEventKey,
      event.timestamp.getTime(),
      eventId
    );
    await this.redis.expire(userEventKey, 30 * 24 * 60 * 60);

    // Add to global security event stream (for monitoring)
    await this.redis.zadd(
      "security_events:global",
      event.timestamp.getTime(),
      eventId
    );
    await this.redis.expire("security_events:global", 7 * 24 * 60 * 60); // 7 days
  }

  /**
   * Get security events for a user
   */
  async getUserSecurityEvents(
    userId: string,
    limit: number = 50
  ): Promise<SecurityEvent[]> {
    const userEventKey = `user:${userId}:security_events`;
    const eventIds = await this.redis.zrevrange(userEventKey, 0, limit - 1);

    const events: SecurityEvent[] = [];
    for (const eventId of eventIds) {
      const eventData = await this.redis.get(`security_event:${eventId}`);
      if (eventData) {
        events.push(JSON.parse(eventData));
      }
    }

    return events;
  }

  /**
   * Verify session fingerprint
   */
  async verifyFingerprint(
    sessionToken: string,
    currentFingerprint: string
  ): Promise<boolean> {
    const storedFingerprint = await this.redis.get(
      `session:${sessionToken}:fingerprint`
    );

    if (!storedFingerprint) {
      return false;
    }

    return storedFingerprint === currentFingerprint;
  }

  /**
   * Store session fingerprint
   */
  async storeFingerprint(
    sessionToken: string,
    fingerprint: string,
    ttl: number
  ): Promise<void> {
    await this.redis.setex(
      `session:${sessionToken}:fingerprint`,
      ttl,
      fingerprint
    );
  }

  /**
   * Check for concurrent session anomalies
   */
  async checkConcurrentSessionAnomaly(
    userId: string,
    newSessionMetadata: SessionMetadata
  ): Promise<{
    anomaly: boolean;
    reason?: string;
  }> {
    // Get all active sessions for user
    const sessionTokens = await this.redis.smembers(`user:${userId}:sessions`);

    // Check if any active session has significantly different metadata
    for (const token of sessionTokens) {
      const sessionData = await this.redis.get(`session:${token}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.metadata) {
          const oldMetadata: SessionMetadata = session.metadata;

          // Check if sessions are from very different locations/devices
          if (
            oldMetadata.ip !== newSessionMetadata.ip &&
            oldMetadata.device !== newSessionMetadata.device
          ) {
            const timeDiff =
              new Date(newSessionMetadata.lastActivity).getTime() -
              new Date(oldMetadata.lastActivity).getTime();

            // If last activity was within 5 minutes and from different location
            if (timeDiff < 5 * 60 * 1000) {
              return {
                anomaly: true,
                reason: "Concurrent sessions from different locations detected",
              };
            }
          }
        }
      }
    }

    return { anomaly: false };
  }

  /**
   * Generate secure session token
   */
  generateSecureToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Hash sensitive data
   */
  hashData(data: string): string {
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Clean up expired security events
   */
  async cleanupExpiredEvents(): Promise<void> {
    const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    // Clean up global events
    await this.redis.zremrangebyscore(
      "security_events:global",
      "-inf",
      cutoffTime
    );

    // Note: Individual user event timelines are cleaned up via TTL
  }
}

/**
 * Helper to extract IP from request headers (handles proxies)
 */
export function getClientIp(headers: Headers): string {
  // Check common proxy headers
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip"); // Cloudflare
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback
  return "unknown";
}

/**
 * Estimate location from IP (simplified)
 * In production, use a proper GeoIP service like MaxMind
 */
export async function estimateLocation(ip: string): Promise<string> {
  // This is a placeholder. In production, integrate with GeoIP service
  // For now, return a generic location
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "Local Network";
  }

  return "Unknown Location";
}
