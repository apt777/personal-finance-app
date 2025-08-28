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

  const settings = await prisma.setting.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  // Add Zod validation here later

  const { baseCurrencyCode, displayCurrencyCodes, locale, roundingRule } = body;

  const settings = await prisma.setting.upsert({
    where: { userId: user.id },
    update: {
      baseCurrencyCode,
      displayCurrencyCodes,
      locale,
      roundingRule,
    },
    create: {
      userId: user.id,
      baseCurrencyCode,
      displayCurrencyCodes,
      locale,
      roundingRule,
    },
  });

  return NextResponse.json(settings);
}
