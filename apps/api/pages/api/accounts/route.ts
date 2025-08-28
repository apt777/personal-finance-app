import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { AccountSchema } from '@repo/types';
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
  // This is a heuristic, as Decimal is a class, but it doesn't have a common constructor name
  // A more robust way might involve checking for specific methods like .toNumber() or .toString()
  if (typeof obj === 'object' && obj !== null && 'd' in obj && 'e' in obj && 's' in obj) {
    // Assuming it's a Decimal. Convert to number.
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

// GET /api/accounts
export async function GET(req: NextRequest) {
  try {
    // In a real app, you'd get the userId from Supabase Auth
    const userId = 'clx0000000000000000000000'; // Dummy user ID for now

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: { currency: true },
    });
    return NextResponse.json(serializeData(accounts)); // Apply serialization
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/accounts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    // Validate input using Zod
    const createAccountSchema = AccountSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
    const validatedData = createAccountSchema.parse(body);

    const newAccount = await prisma.account.create({
      data: {
        ...validatedData,
        userId,
      },
    });
    return NextResponse.json(serializeData(newAccount), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

// PUT /api/accounts/:id (or PATCH)
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const updateAccountSchema = AccountSchema.partial().omit({ id: true, userId: true, createdAt: true, updatedAt: true });
    const validatedData = updateAccountSchema.parse(body);

    const updatedAccount = await prisma.account.update({
      where: { id, userId }, // Ensure user owns the account
      data: validatedData,
    });
    return NextResponse.json(serializeData(updatedAccount));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

// DELETE /api/accounts/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await prisma.account.delete({
      where: { id, userId }, // Ensure user owns the account
    });
    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
