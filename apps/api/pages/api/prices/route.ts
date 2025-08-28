import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Mock price fetching function
async function fetchPriceFromProvider(symbol: string, exchange: string): Promise<{ price: number; currencyCode: string }> {
  // In a real app, this would call Finnhub/Alpha Vantage etc.
  // Use environment variables for API keys (process.env.FINNHUB_API_KEY)
  console.log(`Fetching price for ${symbol} on ${exchange} from mock provider.`);
  // Dummy data for now
  if (symbol === 'AAPL' && exchange === 'NASDAQ') {
    return { price: 190.00, currencyCode: 'USD' };
  }
  if (symbol === 'GOOG' && exchange === 'NASDAQ') {
    return { price: 170.00, currencyCode: 'USD' };
  }
  return { price: 100.00, currencyCode: 'USD' }; // Default
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

// GET /api/prices?symbols=AAPL,GOOG&exchange=NASDAQ
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get('symbols');
    const exchange = searchParams.get('exchange');

    if (!symbolsParam || !exchange) {
      return NextResponse.json({ error: 'Symbols and exchange are required' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',');
    const prices: { symbol: string; exchange: string; price: number; currencyCode: string; asOf: string }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for caching

    for (const symbol of symbols) {
      // Try to fetch from cache (Prisma)
      let priceRecord = await prisma.price.findFirst({
        where: {
          symbol,
          exchange,
          asOf: today,
        },
      });

      if (!priceRecord) {
        // If not in cache, fetch from provider and store
        const fetched = await fetchPriceFromProvider(symbol, exchange);
        priceRecord = await prisma.price.upsert({
          where: {
            symbol_exchange_asOf: {
              symbol,
              exchange,
              asOf: today,
            },
          },
          update: {
            price: fetched.price,
            currencyCode: fetched.currencyCode,
          },
          create: {
            symbol,
            exchange,
            price: fetched.price,
            currencyCode: fetched.currencyCode,
            asOf: today,
          },
        });
      }

      prices.push({
        symbol: priceRecord.symbol,
        exchange: priceRecord.exchange,
        price: priceRecord.price.toNumber(), // Convert Decimal to number
        currencyCode: priceRecord.currencyCode,
        asOf: priceRecord.asOf.toISOString().split('T')[0], // Format date
      });
    }

    return NextResponse.json(serializeData(prices));
  } catch (error) {
    console.error('Error fetching prices:', error);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
