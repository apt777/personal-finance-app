import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TransactionSchema } from '@repo/types';
import { z } from 'zod';

const prisma = new PrismaClient();

// Helper to get FX rate (simplified for now)
async function getFxRate(base: string, quote: string, date: Date): Promise<number> {
  // In a real app, fetch from FxRate table or external API
  // For MVP, assume 1:1 if same currency, otherwise a dummy rate
  if (base === quote) return 1;
  if (base === 'KRW' && quote === 'JPY') return 0.1; // Example rate
  if (base === 'JPY' && quote === 'KRW') return 10; // Example rate
  if (base === 'USD' && quote === 'KRW') return 1300; // Example rate
  if (base === 'KRW' && quote === 'USD') return 1 / 1300; // Example rate
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

// GET /api/transactions
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { account: true, category: true },
      orderBy: { txDate: 'desc' },
    });
    // Convert Decimal to number and Date to ISO string
    const serializedTransactions = transactions.map(tx => ({
      ...tx,
      amountOriginal: tx.amountOriginal.toNumber(),
      amountBase: tx.amountBase.toNumber(),
      txDate: tx.txDate.toISOString(),
      createdAt: tx.createdAt.toISOString(),
      account: tx.account ? {
        ...tx.account,
        createdAt: tx.account.createdAt.toISOString(),
        updatedAt: tx.account.updatedAt.toISOString(),
      } : tx.account,
      category: tx.category ? {
        ...tx.category,
      } : tx.category,
    }));
    return NextResponse.json(serializedTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    const createTransactionSchema = TransactionSchema.omit({
      id: true,
      userId: true,
      amountBase: true, // amountBase will be calculated
      currencyBase: true, // currencyBase will be derived from user settings
      createdAt: true,
    }).extend({
      txDate: z.string().datetime(), // Ensure txDate is a string for input
    });

    const validatedData = createTransactionSchema.parse(body);

    // Get user's base currency (from settings)
    const userSetting = await prisma.setting.findUnique({ where: { userId } });
    const baseCurrency = userSetting?.baseCurrency || 'KRW'; // Default to KRW

    // Calculate amountBase
    const txDate = new Date(validatedData.txDate);
    const fxRate = await getFxRate(validatedData.currencyOriginal, baseCurrency, txDate);
    const amountBase = validatedData.amountOriginal * fxRate;

    const newTransaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId,
        amountBase,
        currencyBase: baseCurrency,
        txDate, // Convert back to Date object for Prisma
      },
    });
    // Serialize the returned object
    const serializedNewTransaction = {
      ...newTransaction,
      amountOriginal: newTransaction.amountOriginal.toNumber(),
      amountBase: newTransaction.amountBase.toNumber(),
      txDate: newTransaction.txDate.toISOString(),
      createdAt: newTransaction.createdAt.toISOString(),
    };
    return NextResponse.json(serializedNewTransaction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// PUT /api/transactions/:id
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });

    const updateTransactionSchema = TransactionSchema.partial().omit({
      id: true,
      userId: true,
      amountBase: true,
      currencyBase: true,
      createdAt: true,
    }).extend({
      txDate: z.string().datetime().optional(),
    });
    const validatedData = updateTransactionSchema.parse(body);

    let amountBase: number | undefined;
    let currencyBase: string | undefined;

    if (validatedData.amountOriginal || validatedData.currencyOriginal || validatedData.txDate) {
      const userSetting = await prisma.setting.findUnique({ where: { userId } });
      const baseCurrency = userSetting?.baseCurrency || 'KRW';

      const existingTx = await prisma.transaction.findUnique({ where: { id } });
      const originalAmount = validatedData.amountOriginal ?? existingTx?.amountOriginal.toNumber();
      const originalCurrency = validatedData.currencyOriginal ?? existingTx?.currencyOriginal;
      const transactionDate = validatedData.txDate ? new Date(validatedData.txDate) : existingTx?.txDate;

      if (originalAmount !== undefined && originalCurrency && transactionDate) {
        const fxRate = await getFxRate(originalCurrency, baseCurrency, transactionDate);
        amountBase = originalAmount * fxRate;
        currencyBase = baseCurrency;
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id, userId },
      data: {
        ...validatedData,
        amountBase,
        currencyBase,
        txDate: validatedData.txDate ? new Date(validatedData.txDate) : undefined,
      },
    });
    // Serialize the returned object
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

// GET /api/transactions
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { account: true, category: true },
      orderBy: { txDate: 'desc' },
    });
    return NextResponse.json(serializeData(transactions));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/transactions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    const createTransactionSchema = TransactionSchema.omit({
      id: true,
      userId: true,
      amountBase: true, // amountBase will be calculated
      currencyBase: true, // currencyBase will be derived from user settings
      createdAt: true,
    }).extend({
      txDate: z.string().datetime(), // Ensure txDate is a string for input
    });

    const validatedData = createTransactionSchema.parse(body);

    // Get user's base currency (from settings)
    const userSetting = await prisma.setting.findUnique({ where: { userId } });
    const baseCurrency = userSetting?.baseCurrency || 'KRW'; // Default to KRW

    // Calculate amountBase
    const txDate = new Date(validatedData.txDate);
    const fxRate = await getFxRate(validatedData.currencyOriginal, baseCurrency, txDate);
    const amountBase = validatedData.amountOriginal * fxRate;

    const newTransaction = await prisma.transaction.create({
      data: {
        ...validatedData,
        userId,
        amountBase,
        currencyBase: baseCurrency,
        txDate, // Convert back to Date object for Prisma
      },
    });
    return NextResponse.json(serializeData(newTransaction), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

// PUT /api/transactions/:id
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });

    const updateTransactionSchema = TransactionSchema.partial().omit({
      id: true,
      userId: true,
      amountBase: true,
      currencyBase: true,
      createdAt: true,
    }).extend({
      txDate: z.string().datetime().optional(),
    });
    const validatedData = updateTransactionSchema.parse(body);

    let amountBase: number | undefined;
    let currencyBase: string | undefined;

    if (validatedData.amountOriginal || validatedData.currencyOriginal || validatedData.txDate) {
      const userSetting = await prisma.setting.findUnique({ where: { userId } });
      const baseCurrency = userSetting?.baseCurrency || 'KRW';

      const existingTx = await prisma.transaction.findUnique({ where: { id } });
      const originalAmount = validatedData.amountOriginal ?? existingTx?.amountOriginal.toNumber();
      const originalCurrency = validatedData.currencyOriginal ?? existingTx?.currencyOriginal;
      const transactionDate = validatedData.txDate ? new Date(validatedData.txDate) : existingTx?.txDate;

      if (originalAmount !== undefined && originalCurrency && transactionDate) {
        const fxRate = await getFxRate(originalCurrency, baseCurrency, transactionDate);
        amountBase = originalAmount * fxRate;
        currencyBase = baseCurrency;
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id, userId },
      data: {
        ...validatedData,
        amountBase,
        currencyBase,
        txDate: validatedData.txDate ? new Date(validatedData.txDate) : undefined,
      },
    });
    return NextResponse.json(serializeData(updatedTransaction));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

// DELETE /api/transactions/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });

    await prisma.transaction.delete({ where: { id, userId } });
    return NextResponse.json({ message: 'Transaction deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}

    return NextResponse.json(serializedUpdatedTransaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
