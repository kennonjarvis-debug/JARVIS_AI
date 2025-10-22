import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, redis, sessionSecurity } from "@/lib/auth";
import { getUserSessions, revokeSession, revokeAllOtherSessions } from "@/lib/auth/redis-adapter";
import { getClientIp } from "@/lib/auth/session-security";

/**
 * GET /api/sessions
 * List all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all active sessions
    const sessions = await getUserSessions(redis, session.user.id);

    // Format sessions for response
    const formattedSessions = sessions.map((sess) => ({
      sessionToken: sess.sessionToken,
      expires: sess.expires,
      metadata: sess.metadata,
      isCurrent: false, // Will be determined by comparing with current session token
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      totalSessions: formattedSessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sessions
 * Revoke a specific session or all other sessions
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionToken, revokeAll } = body;

    if (revokeAll) {
      // Revoke all other sessions except current one
      const currentToken = request.cookies.get("__Secure-next-auth.session-token")?.value ||
                          request.cookies.get("next-auth.session-token")?.value;

      if (!currentToken) {
        return NextResponse.json(
          { error: "Current session not found" },
          { status: 400 }
        );
      }

      const revokedCount = await revokeAllOtherSessions(
        redis,
        session.user.id,
        currentToken
      );

      // Log security event
      await sessionSecurity.logSecurityEvent({
        type: "session_revoked",
        userId: session.user.id,
        metadata: sessionSecurity.createSessionMetadata(
          getClientIp(request.headers),
          request.headers.get("user-agent") || "unknown"
        ),
        details: { revokedCount, revokeAll: true },
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        revokedCount,
        message: `Revoked ${revokedCount} session(s)`,
      });
    } else if (sessionToken) {
      // Revoke specific session
      const success = await revokeSession(redis, sessionToken);

      if (!success) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }

      // Log security event
      await sessionSecurity.logSecurityEvent({
        type: "session_revoked",
        userId: session.user.id,
        sessionToken,
        metadata: sessionSecurity.createSessionMetadata(
          getClientIp(request.headers),
          request.headers.get("user-agent") || "unknown"
        ),
        details: { sessionToken },
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Session revoked successfully",
      });
    } else {
      return NextResponse.json(
        { error: "Missing sessionToken or revokeAll parameter" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
