/**
 * DAWG AI OAuth Callback Handler
 *
 * Handles OAuth callback from DAWG AI authorization.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.redirect(
        new URL("/auth/signin?error=unauthorized", request.url)
      );
    }

    // Get OAuth parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/observatory/connect/dawg-ai?error=${encodeURIComponent(error)}`,
          request.url
        )
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL(
          "/observatory/connect/dawg-ai?error=invalid_callback",
          request.url
        )
      );
    }

    // Exchange code for tokens via backend API
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:4000";
    const response = await fetch(`${backendUrl}/api/dawg-ai/oauth/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.user.id}`, // Use session token
      },
      body: JSON.stringify({
        code,
        state,
        userId: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Backend OAuth callback failed:", errorData);
      return NextResponse.redirect(
        new URL(
          "/observatory/connect/dawg-ai?error=callback_failed",
          request.url
        )
      );
    }

    // Success - redirect to DAWG AI dashboard
    return NextResponse.redirect(
      new URL("/observatory/dawg-ai?connected=true", request.url)
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/observatory/connect/dawg-ai?error=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }
}
