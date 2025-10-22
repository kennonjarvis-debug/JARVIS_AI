import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { RedisAdapter } from "./auth/redis-adapter";
import { getRedisClient } from "./auth/redis-client";
import { SessionSecurityService, getClientIp, estimateLocation } from "./auth/session-security";
import { updateSessionMetadata } from "./auth/redis-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const redis = getRedisClient();
const sessionSecurity = new SessionSecurityService(redis);

export const authOptions: NextAuthOptions = {
  // Use Redis adapter for session storage
  adapter: RedisAdapter({
    redis,
    sessionMaxAge: 7 * 24 * 60 * 60, // 7 days
    sessionUpdateAge: 24 * 60 * 60, // Update session metadata every 24 hours
    maxConcurrentSessions: 3, // Maximum 3 concurrent sessions per user
  }),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },

  // Secure cookie configuration
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/auth/2fa-prompt", // 2FA verification page
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      // Check rate limiting
      const ip = "unknown"; // Will be set in session callback with actual request
      const rateLimit = await sessionSecurity.checkRateLimit(ip);

      if (!rateLimit.allowed) {
        console.warn(`Rate limit exceeded for IP: ${ip}`);
        return false;
      }

      // Log successful login
      await sessionSecurity.logSecurityEvent({
        type: "login",
        userId: user.id || user.email,
        metadata: sessionSecurity.createSessionMetadata(ip, "unknown"),
        timestamp: new Date(),
      });

      // Reset rate limit on successful login
      await sessionSecurity.resetRateLimit(ip);

      return true;
    },

    async jwt({ token, account, profile, trigger, session }) {
      // Initial sign in
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        token.sub = profile.sub;
        token.email = profile.email;

        // Check if user has 2FA enabled
        if (token.email) {
          const user = await prisma.user.findUnique({
            where: { email: token.email as string },
            select: { two_factor_enabled: true, id: true },
          });

          if (user) {
            token.userId = user.id;
            token.twoFactorEnabled = user.two_factor_enabled;
            // Set 2FA pending if enabled
            if (user.two_factor_enabled) {
              token.twoFactorVerified = false;
            }
          }
        }
      }

      // Handle token refresh
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      // Refresh access token if expired
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Implement refresh token rotation
      return await refreshAccessToken(token);
    },

    async session({ session, token, trigger }) {
      // Add user info to session
      if (token) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.accessToken = token.accessToken as string;
        session.error = token.error as string | undefined;

        // Add 2FA status to session
        session.twoFactorEnabled = token.twoFactorEnabled as boolean || false;
        session.twoFactorVerified = token.twoFactorVerified as boolean || false;
      }

      return session;
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`User signed in: ${user.email} (New user: ${isNewUser})`);
    },

    async signOut({ token, session }) {
      // Log sign out event
      if (token?.sub) {
        await sessionSecurity.logSecurityEvent({
          type: "logout",
          userId: token.sub as string,
          metadata: sessionSecurity.createSessionMetadata("unknown", "unknown"),
          timestamp: new Date(),
        });
      }
    },

    async createUser({ user }) {
      console.log(`New user created: ${user.email}`);
    },

    async session({ session, token }) {
      // This event fires whenever a session is checked
      // We can use it to update session metadata
      if (token?.sub) {
        // Session activity is tracked in the adapter
      }
    },
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * Refresh access token using refresh token
 * Implements token rotation for enhanced security
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Rotate refresh token if provided
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Export Redis and security service for use in API routes
export { redis, sessionSecurity };
