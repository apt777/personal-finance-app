import { NextResponse } from 'next/server';
import { PrismaClient } from '@repo/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSettings = await prisma.setting.findUnique({ where: { userId: user.id } });
    if (!userSettings) {
        return NextResponse.json({ error: 'User settings not found.' }, { status: 400 });
    }

    // This is a simplified example. A real implementation would involve more complex queries and calculations.
    // 1. Calculate total account balances in base currency.
    // 2. Calculate total holdings value in base currency.
    // 3. Sum them up for net worth.
    // 4. Get data for charts.

    const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        include: { transactions: true },
    });

    let totalNetWorthBase = 0;
    for (const account of accounts) {
        const balance = account.transactions.reduce((acc, tx) => {
            if (tx.type === 'income') return acc + tx.amountOriginal;
            if (tx.type === 'expense') return acc - tx.amountOriginal;
            return acc;
        }, 0);
        // In a real app, you would convert this balance to the base currency.
        totalNetWorthBase += Number(balance);
    }

    const response = {
        totalNetWorthBase,
        byCurrency: [], // Placeholder
        last30DaysSeries: [], // Placeholder
        categoryBreakdown: [], // Placeholder
    };

    return NextResponse.json(response);
}
