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

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  // Add Zod validation here later

  const { title, dueDate, status, note } = body;

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title,
      dueDate: dueDate ? new Date(dueDate) : null,
      status,
      note,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
