import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper to get FX rate (simplified for now) - duplicated from transactions for now
async function getFxRate(base: string, quote: string, date: Date): Promise<number> {
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

// GET /api/dashboard/summary?asOf=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asOfParam = searchParams.get('asOf');
    const asOfDate = asOfParam ? new Date(asOfParam) : new Date();
    asOfDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const userId = 'clx0000000000000000000000'; // Dummy user ID

    // Fetch user settings for base currency and display currencies
    const userSetting = await prisma.setting.findUnique({ where: { userId } });
    const baseCurrencyCode = userSetting?.baseCurrency || 'KRW';
    const displayCurrencyCodes = userSetting?.displayCurrencies || [];

    // 1. Total Net Worth
    let totalNetWorthBase = 0;
    const byCurrency: { currency: string; total: number }[] = [];

    // Calculate account balances
    const accounts = await prisma.account.findMany({ where: { userId } });
    for (const account of accounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountId: account.id },
      });
      let accountBalance = 0;
      for (const tx of transactions) {
        if (tx.type === 'income') accountBalance += tx.amountOriginal.toNumber();
        else if (tx.type === 'expense') accountBalance -= tx.amountOriginal.toNumber();
        // Transfer logic would be more complex
      }

      // Convert account balance to base currency
      const fxRate = await getFxRate(account.currencyCode, baseCurrencyCode, asOfDate);
      totalNetWorthBase += accountBalance * fxRate;

      // Add to byCurrency totals
      let existingCurrencyTotal = byCurrency.find(c => c.currency === account.currencyCode);
      if (existingCurrencyTotal) {
        existingCurrencyTotal.total += accountBalance;
      } else {
        byCurrency.push({ currency: account.currencyCode, total: accountBalance });
      }
    }

    // Calculate holdings value
    const holdings = await prisma.holding.findMany({ where: { userId } });
    for (const holding of holdings) {
      const latestPrice = await prisma.price.findFirst({
        where: { symbol: holding.symbol, exchange: holding.exchange, asOf: { lte: asOfDate } },
        orderBy: { asOf: 'desc' },
      });

      if (latestPrice) {
        const holdingValue = holding.quantity.toNumber() * latestPrice.price.toNumber();
        const fxRate = await getFxRate(holding.currencyCode, baseCurrencyCode, asOfDate);
        totalNetWorthBase += holdingValue * fxRate;

        // Add to byCurrency totals (for holdings)
        let existingCurrencyTotal = byCurrency.find(c => c.currency === holding.currencyCode);
        if (existingCurrencyTotal) {
          existingCurrencyTotal.total += holdingValue;
        } else {
          byCurrency.push({ currency: holding.currencyCode, total: holdingValue });
        }
      }
    }

    // Convert byCurrency totals to display currencies
    const finalByCurrencyTotals: { currency: string; total: number }[] = [];
    for (const displayCode of displayCurrencyCodes) {
      let totalForDisplay = 0;
      for (const currencyTotal of byCurrency) {
        const fxRate = await getFxRate(currencyTotal.currency, displayCode, asOfDate);
        totalForDisplay += currencyTotal.total * fxRate;
      }
      finalByCurrencyTotals.push({ currency: displayCode, total: totalForDisplay });
    }

    // 2. 30-day trend chart (simplified)s
    const last30DaysSeries: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(asOfDate);
      date.setDate(asOfDate.getDate() - i);
      // In a real app, calculate net worth for each day
      last30DaysSeries.push({ date: date.toISOString().split('T')[0], value: totalNetWorthBase * (1 - i * 0.001) }); // Dummy trend
    }

    // 3. Category spend chart (simplified)
    const categoryBreakdown: { category: string; total: number }[] = [];
    const expenses = await prisma.transaction.findMany({
      where: { userId, type: 'expense', txDate: { gte: new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1) } }, // Current month expenses
      include: { category: true },
    });

    const categoryTotals: { [key: string]: number } = {};
    for (const expense of expenses) {
      if (expense.category) {
        const fxRate = await getFxRate(expense.currencyOriginal, baseCurrencyCode, expense.txDate);
        const amountInBase = expense.amountOriginal.toNumber() * fxRate;
        categoryTotals[expense.category.name] = (categoryTotals[expense.category.name] || 0) + amountInBase;
      }
    }

    for (const category in categoryTotals) {
      categoryBreakdown.push({ category, total: categoryTotals[category] });
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

// GET /api/dashboard/summary?asOf=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asOfParam = searchParams.get('asOf');
    const asOfDate = asOfParam ? new Date(asOfParam) : new Date();
    asOfDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const userId = 'clx0000000000000000000000'; // Dummy user ID

    // Fetch user settings for base currency and display currencies
    const userSetting = await prisma.setting.findUnique({ where: { userId } });
    const baseCurrencyCode = userSetting?.baseCurrency || 'KRW';
    const displayCurrencyCodes = userSetting?.displayCurrencies || [];

    // 1. Total Net Worth
    let totalNetWorthBase = 0;
    const byCurrency: { currency: string; total: number }[] = [];

    // Calculate account balances
    const accounts = await prisma.account.findMany({ where: { userId } });
    for (const account of accounts) {
      const transactions = await prisma.transaction.findMany({
        where: { accountId: account.id },
      });
      let accountBalance = 0;
      for (const tx of transactions) {
        if (tx.type === 'income') accountBalance += tx.amountOriginal.toNumber();
        else if (tx.type === 'expense') accountBalance -= tx.amountOriginal.toNumber();
        // Transfer logic would be more complex
      }

      // Convert account balance to base currency
      const fxRate = await getFxRate(account.currencyCode, baseCurrencyCode, asOfDate);
      totalNetWorthBase += accountBalance * fxRate;

      // Add to byCurrency totals
      let existingCurrencyTotal = byCurrency.find(c => c.currency === account.currencyCode);
      if (existingCurrencyTotal) {
        existingCurrencyTotal.total += accountBalance;
      } else {
        byCurrency.push({ currency: account.currencyCode, total: accountBalance });
      }
    }

    // Calculate holdings value
    const holdings = await prisma.holding.findMany({ where: { userId } });
    for (const holding of holdings) {
      const latestPrice = await prisma.price.findFirst({
        where: { symbol: holding.symbol, exchange: holding.exchange, asOf: { lte: asOfDate } },
        orderBy: { asOf: 'desc' },
      });

      if (latestPrice) {
        const holdingValue = holding.quantity.toNumber() * latestPrice.price.toNumber();
        const fxRate = await getFxRate(holding.currencyCode, baseCurrencyCode, asOfDate);
        totalNetWorthBase += holdingValue * fxRate;

        // Add to byCurrency totals (for holdings)
        let existingCurrencyTotal = byCurrency.find(c => c.currency === holding.currencyCode);
        if (existingCurrencyTotal) {
          existingCurrencyTotal.total += holdingValue;
        } else {
          byCurrency.push({ currency: holding.currencyCode, total: holdingValue });
        }
      }
    }

    // Convert byCurrency totals to display currencies
    const finalByCurrencyTotals: { currency: string; total: number }[] = [];
    for (const displayCode of displayCurrencyCodes) {
      let totalForDisplay = 0;
      for (const currencyTotal of byCurrency) {
        const fxRate = await getFxRate(currencyTotal.currency, displayCode, asOfDate);
        totalForDisplay += currencyTotal.total * fxRate;
      }
      finalByCurrencyTotals.push({ currency: displayCode, total: totalForDisplay });
    }

    // 2. 30-day trend chart (simplified)s
    const last30DaysSeries: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(asOfDate);
      date.setDate(asOfDate.getDate() - i);
      // In a real app, calculate net worth for each day
      last30DaysSeries.push({ date: date.toISOString().split('T')[0], value: totalNetWorthBase * (1 - i * 0.001) }); // Dummy trend
    }

    // 3. Category spend chart (simplified)
    const categoryBreakdown: { category: string; total: number }[] = [];
    const expenses = await prisma.transaction.findMany({
      where: { userId, type: 'expense', txDate: { gte: new Date(asOfDate.getFullYear(), asOfDate.getMonth(), 1) } }, // Current month expenses
      include: { category: true },
    });

    const categoryTotals: { [key: string]: number } = {};
    for (const expense of expenses) {
      if (expense.category) {
        const fxRate = await getFxRate(expense.currencyOriginal, baseCurrencyCode, expense.txDate);
        const amountInBase = expense.amountOriginal.toNumber() * fxRate;
        categoryTotals[expense.category.name] = (categoryTotals[expense.category.name] || 0) + amountInBase;
      }
    }

    for (const category in categoryTotals) {
      categoryBreakdown.push({ category, total: categoryTotals[category] });
    }

    return NextResponse.json(serializeData({
      totalNetWorthBase,
      byCurrency: finalByCurrencyTotals,
      last30DaysSeries,
      categoryBreakdown,
    }));
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}

  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
