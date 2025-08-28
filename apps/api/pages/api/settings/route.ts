import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SettingSchema } from '@repo/types';
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

// GET /api/settings
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const settings = await prisma.setting.findUnique({ where: { userId } });
    return NextResponse.json(serializeData(settings));
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/settings (or PUT, as it's a single setting per user)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    const createUpdateSettingSchema = SettingSchema.omit({ userId: true });
    const validatedData = createUpdateSettingSchema.parse(body);

    const newSetting = await prisma.setting.upsert({
      where: { userId },
      update: validatedData,
      create: { ...validatedData, userId },
    });
    return NextResponse.json(serializeData(newSetting), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating/updating setting:', error);
    return NextResponse.json({ error: 'Failed to create/update setting' }, { status: 500 });
  }
}
