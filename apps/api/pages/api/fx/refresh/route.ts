import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Mock FX rate fetching function
async function fetchFxRateFromProvider(base: string, quote: string, date: Date): Promise<number> {
  // In a real app, this would call an external FX API
  console.log(`Fetching FX rate for ${base}/${quote} on ${date.toISOString().split('T')[0]} from mock provider.`);
  if (base === quote) return 1;
  if (base === 'KRW' && quote === 'JPY') return 0.1;
  if (base === 'JPY' && quote === 'KRW') return 10;
  if (base === 'USD' && quote === 'KRW') return 1300;
  if (base === 'KRW' && quote === 'USD') return 1 / 1300;
  return 1; // Fallback
}

function serializeDates<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeDates(item)) as T;
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = serializeDates(obj[key]);
    }
  }
  return newObj as T;
}

// POST /api/fx/refresh?date=YYYY-MM-DD (cron-safe, auth-protected)
export async function POST(req: NextRequest) {
  try {
    // In a real app, this would be protected by an API key or cron job authentication
    // For MVP, we'll allow it for now.

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const date = dateParam ? new Date(dateParam) : new Date();
    date.setHours(0, 0, 0, 0); // Normalize to start of day

    // Fetch all currency pairs (simplified for MVP)
    const currencies = await prisma.currency.findMany();
    const currencyCodes = currencies.map(c => c.code);

    for (const baseCode of currencyCodes) {
      for (const quoteCode of currencyCodes) {
        if (baseCode === quoteCode) {
          await prisma.fxRate.upsert({
            where: {
              date_baseCode_quoteCode: {
                date,
                baseCode,
                quoteCode,
              },
            },
            update: { rate: 1, source: 'internal' },
            create: { date, baseCode, quoteCode, rate: 1, source: 'internal' },
          });
          continue;
        }

        const rate = await fetchFxRateFromProvider(baseCode, quoteCode, date);
        await prisma.fxRate.upsert({
          where: {
            date_baseCode_quoteCode: {
              date,
              baseCode,
              quoteCode,
            },
          },
          update: { rate, source: 'mock' },
          create: { date, baseCode, quoteCode, rate, source: 'mock' },
        });
      }
    }

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

// POST /api/fx/refresh?date=YYYY-MM-DD (cron-safe, auth-protected)
export async function POST(req: NextRequest) {
  try {
    // In a real app, this would be protected by an API key or cron job authentication
    // For MVP, we'll allow it for now.

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const date = dateParam ? new Date(dateParam) : new Date();
    date.setHours(0, 0, 0, 0); // Normalize to start of day

    // Fetch all currency pairs (simplified for MVP)
    const currencies = await prisma.currency.findMany();
    const currencyCodes = currencies.map(c => c.code);

    for (const baseCode of currencyCodes) {
      for (const quoteCode of currencyCodes) {
        if (baseCode === quoteCode) {
          await prisma.fxRate.upsert({
            where: {
              date_baseCode_quoteCode: {
                date,
                baseCode,
                quoteCode,
              },
            },
            update: { rate: 1, source: 'internal' },
            create: { date, baseCode, quoteCode, rate: 1, source: 'internal' },
          });
          continue;
        }

        const rate = await fetchFxRateFromProvider(baseCode, quoteCode, date);
        await prisma.fxRate.upsert({
          where: {
            date_baseCode_quoteCode: {
              date,
              baseCode,
              quoteCode,
            },
          },
          update: { rate, source: 'mock' },
          create: { date, baseCode, quoteCode, rate, source: 'mock' },
        });
      }
    }

    return NextResponse.json(serializeData({ message: `FX rates refreshed for ${date.toISOString().split('T')[0]}` }));
  } catch (error) {
    console.error('Error refreshing FX rates:', error);
    return NextResponse.json({ error: 'Failed to refresh FX rates' }, { status: 500 });
  }
}

  } catch (error) {
    console.error('Error refreshing FX rates:', error);
    return NextResponse.json({ error: 'Failed to refresh FX rates' }, { status: 500 });
  }
}
