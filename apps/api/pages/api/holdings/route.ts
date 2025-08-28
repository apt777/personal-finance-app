import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { HoldingSchema } from '@repo/types';
import { z } from 'zod';

const prisma = new PrismaClient();

function serializeData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  // Check for Prisma Decimal type (common way to identify it)
  if (typeof obj === 'object' && obj !== null && 'd' in obj && 'e' in obj && 's' in obj) {
    return (obj as any).toNumber() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeData(item)) as T;
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = serializeData(obj[key]);
    }
  }
  return newObj as T;
}

// GET /api/holdings
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const holdings = await prisma.holding.findMany({
      where: { userId },
      include: { currency: true },
    });
    const serializedHoldings = holdings.map(holding => ({
      ...holding,
      quantity: holding.quantity.toNumber(),
      avgCost: holding.avgCost.toNumber(),
      // Assuming currency object doesn't have dates/decimals that need serialization
    }));
    return NextResponse.json(serializeData(serializedHoldings));
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}

// POST /api/holdings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const createHoldingSchema = HoldingSchema.omit({ id: true, userId: true });
    const validatedData = createHoldingSchema.parse(body);

    const newHolding = await prisma.holding.create({
      data: { ...validatedData, userId },
    });
    const serializedNewHolding = {
      ...newHolding,
      quantity: newHolding.quantity.toNumber(),
      avgCost: newHolding.avgCost.toNumber(),
    };
    return NextResponse.json(serializeData(serializedNewHolding), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating holding:', error);
    return NextResponse.json({ error: 'Failed to create holding' }, { status: 500 });
  }
}

// PUT /api/holdings/:id
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Holding ID is required' }, { status: 400 });

    const updateHoldingSchema = HoldingSchema.partial().omit({ id: true, userId: true });
    const validatedData = updateHoldingSchema.parse(body);

    const updatedHolding = await prisma.holding.update({
      where: { id, userId },
      data: validatedData,
    });
    const serializedUpdatedHolding = {
      ...updatedHolding,
      quantity: updatedHolding.quantity.toNumber(),
      avgCost: updatedHolding.avgCost.toNumber(),
    };
    return NextResponse.json(serializeData(serializedUpdatedHolding));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating holding:', error);
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 });
  }
}

// DELETE /api/holdings/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Holding ID is required' }, { status: 400 });

    await prisma.holding.delete({ where: { id, userId } });
    return NextResponse.json({ message: 'Holding deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting holding:', error);
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
  }
}

// DELETE /api/holdings/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Holding ID is required' }, { status: 400 });

    await prisma.holding.delete({ where: { id, userId } });
    return NextResponse.json({ message: 'Holding deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting holding:', error);
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 });
  }
}
