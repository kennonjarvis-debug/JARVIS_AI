import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, sessionSecurity } from "@/lib/auth";

/**
 * GET /api/sessions/activity
 * Get security events and session activity for the current user
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

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get security events
    const events = await sessionSecurity.getUserSecurityEvents(
      session.user.id,
      limit
    );

    return NextResponse.json({
      events,
      totalEvents: events.length,
    });
  } catch (error) {
    console.error("Error fetching session activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
