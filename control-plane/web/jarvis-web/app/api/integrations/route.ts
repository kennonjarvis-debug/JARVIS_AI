/**
 * Integrations List API Route
 * GET /api/integrations
 *
 * Lists all integrations for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { ListIntegrationsResponse } from '@/lib/types/integrations';
import { MockIntegrationStore } from '@/lib/integrations/mock-store';

export async function GET(request: NextRequest) {
  try {
    // In production, get userId from authenticated session
    const userId = 'mock-user';

    // Get query parameters for filtering/pagination
    const searchParams = request.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const typeFilter = searchParams.get('type');

    // Get all user integrations
    let integrations = MockIntegrationStore.getUserIntegrations(userId);

    // Apply filters if provided
    if (statusFilter) {
      integrations = integrations.filter((i) => i.status === statusFilter);
    }

    if (typeFilter) {
      integrations = integrations.filter((i) => i.type === typeFilter);
    }

    // Sort by connection date (most recent first)
    integrations.sort((a, b) => {
      const dateA = a.connectedAt ? new Date(a.connectedAt).getTime() : 0;
      const dateB = b.connectedAt ? new Date(b.connectedAt).getTime() : 0;
      return dateB - dateA;
    });

    const response: ListIntegrationsResponse = {
      integrations,
      total: integrations.length,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: unknown) {
    console.error('List integrations error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to fetch integrations', message },
      { status: 500 }
    );
  }
}
