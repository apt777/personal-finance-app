import { NextResponse } from 'next/server';
import { PrismaClient } from '@repo/db';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function GET() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const holdings = await prisma.holding.findMany({
    where: { userId: user.id },
    orderBy: { symbol: 'asc' },
  });

  return NextResponse.json(holdings);
}

export async function POST(request: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  // Add Zod validation here later

  const { symbol, exchange, quantity, avgCost, currencyCode, note } = body;

  const holding = await prisma.holding.create({
    data: {
      userId: user.id,
      symbol,
      exchange,
      quantity,
      avgCost,
      currencyCode,
      note,
    },
  });

  return NextResponse.json(holding, { status: 201 });
}
