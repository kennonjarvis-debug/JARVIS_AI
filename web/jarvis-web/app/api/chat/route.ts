/**
 * Jarvis Chat API Route
 * Proxies chat requests to Control Plane → AI Brain
 */

import { NextRequest, NextResponse } from 'next/server';

const CONTROL_PLANE_URL = process.env.NEXT_PUBLIC_JARVIS_API || 'http://localhost:4000';
const AUTH_TOKEN = process.env.JARVIS_AUTH_TOKEN || 'test-token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      );
    }

    // Call Control Plane's execute endpoint with ai-brain module
    const response = await fetch(`${CONTROL_PLANE_URL}/api/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        module: 'ai-brain',
        action: 'chat',
        params: {
          message: text,
          conversationId: 'web-chat',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Control Plane error:', errorText);
      return NextResponse.json(
        { error: `Control Plane returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract response from Control Plane → AI Brain format
    // Control Plane returns: { success: true, data: { response: "..." }, timestamp: "..." }
    if (data.success && data.data && data.data.response) {
      return NextResponse.json({
        response: data.data.response,
      });
    }

    // Fallback if format is unexpected
    return NextResponse.json({
      response: data.data?.response || data.response || 'No response from AI',
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
