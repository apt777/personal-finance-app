import { NextResponse } from 'next/server';
import { PrismaClient } from '@repo/db';
import { CreateTransactionSchema } from '@repo/types';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// A placeholder for a real FX rate service
async function getFxRate(base: string, quote: string, date: Date): Promise<number> {
    if (base === quote) return 1;
    // In a real app, you would fetch this from an API (e.g., Finnhub, Alpha Vantage)
    // and store it in the FxRate table.
    console.log(`Fetching FX rate for ${base}/${quote} on ${date.toISOString()}`);
    // For demo purposes, let's use a mock rate.
    if (base === 'KRW' && quote === 'JPY') return 0.1; // 1 KRW = 0.1 JPY
    if (base === 'JPY' && quote === 'KRW') return 10; // 1 JPY = 10 KRW
    if (base === 'USD' && quote === 'JPY') return 150;
    if (base === 'JPY' && quote === 'USD') return 1/150;
    return 1;
}

export async function GET() {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
        where: { userId: user.id },
        orderBy: { txDate: 'desc' },
        include: { account: true, category: true },
    });

    return NextResponse.json(transactions);
}

export async function POST(request: Request) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateTransactionSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json(validation.error.format(), { status: 400 });
    }

    const userSettings = await prisma.setting.findUnique({ where: { userId: user.id } });
    if (!userSettings) {
        return NextResponse.json({ error: 'User settings not found. Please set a base currency.' }, { status: 400 });
    }

    const { amountOriginal, currencyOriginal, txDate, ...rest } = validation.data;
    const transactionDate = new Date(txDate);

    // Calculate base currency amount
    const rate = await getFxRate(currencyOriginal, userSettings.baseCurrencyCode, transactionDate);
    const amountBase = amountOriginal * rate;

    const transaction = await prisma.transaction.create({
        data: {
            userId: user.id,
            amountOriginal,
            currencyOriginal,
            amountBase,
            currencyBase: userSettings.baseCurrencyCode,
            txDate: transactionDate,
            ...rest,
        },
    });

    return NextResponse.json(transaction, { status: 201 });
}
