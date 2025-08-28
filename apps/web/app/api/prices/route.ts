import { NextResponse } from 'next/server';
import { PrismaClient } from '@repo/db';

const prisma = new PrismaClient();

// Mock price provider
async function getPricesFromProvider(symbols: string[]): Promise<Record<string, number>> {
    console.log(`Fetching prices for ${symbols.join(', ')} from external API`);
    // In a real app, you would use an API key from environment variables
    // to fetch prices from a service like Finnhub or Alpha Vantage.
    const prices: Record<string, number> = {};
    for (const symbol of symbols) {
        if (symbol === 'AAPL') prices[symbol] = 175.50;
        else prices[symbol] = Math.random() * 1000;
    }
    return prices;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');

    if (!symbolsParam) {
        return NextResponse.json({ error: 'Symbols query parameter is required' }, { status: 400 });
    }

    const symbols = symbolsParam.split(',');

    // In a real app, you would implement caching here.
    // 1. Check if prices for the symbols exist in the `Price` table for the current day.
    // 2. For symbols without a recent price, fetch from the provider.
    // 3. Store the new prices in the `Price` table.
    // 4. Return the prices.

    const prices = await getPricesFromProvider(symbols);

    return NextResponse.json(prices);
}
