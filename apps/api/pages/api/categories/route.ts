import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CategorySchema } from '@repo/types';
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

// GET /api/categories
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const categories = await prisma.category.findMany({ where: { userId } });
    return NextResponse.json(serializeData(categories));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST /api/categories
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const createCategorySchema = CategorySchema.omit({ id: true, userId: true });
    const validatedData = createCategorySchema.parse(body);

    const newCategory = await prisma.category.create({
      data: { ...validatedData, userId },
    });
    return NextResponse.json(serializeData(newCategory), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

// PUT /api/categories/:id
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    const updateCategorySchema = CategorySchema.partial().omit({ id: true, userId: true });
    const validatedData = updateCategorySchema.parse(body);

    const updatedCategory = await prisma.category.update({
      where: { id, userId },
      data: validatedData,
    });
    return NextResponse.json(serializeData(updatedCategory));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE /api/categories/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });

    await prisma.category.delete({ where: { id, userId } });
    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
