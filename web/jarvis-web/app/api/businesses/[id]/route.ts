import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/businesses/[id] - Get a specific business
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get business (check if user is owner or member)
    const business = await prisma.business.findFirst({
      where: {
        id,
        OR: [
          { ownerId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                status: 'ACTIVE',
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error: any) {
    console.error('Failed to get business:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get business',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// PATCH /api/businesses/[id] - Update a business
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, logo } = body;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const businessMember = await prisma.businessMember.findFirst({
      where: {
        businessId: id,
        userId: user.id,
        status: 'ACTIVE',
        role: {
          in: ['OWNER', 'ADMIN'],
        },
      },
    });

    if (!businessMember) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Update the business
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo !== undefined) updateData.logo = logo;

    const business = await prisma.business.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error: any) {
    console.error('Failed to update business:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update business',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/businesses/[id] - Delete a business
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    const business = await prisma.business.findFirst({
      where: {
        id,
        ownerId: user.id,
      },
    });

    if (!business) {
      return NextResponse.json(
        { success: false, error: 'Business not found or you are not the owner' },
        { status: 404 }
      );
    }

    // Delete the business (cascade will delete members)
    await prisma.business.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Business deleted successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete business:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete business',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
