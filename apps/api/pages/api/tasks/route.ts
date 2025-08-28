import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { TaskSchema } from '@repo/types';
import { z } from 'zod';

const prisma = new PrismaClient();

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

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(serializeDates(tasks));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const createTaskSchema = TaskSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
    const validatedData = createTaskSchema.parse(body);

    const newTask = await prisma.task.create({
      data: { ...validatedData, userId, dueDate: new Date(validatedData.dueDate) },
    });
    return NextResponse.json(serializeDates(newTask), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT /api/tasks/:id
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

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(serializeData(tasks));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID
    const createTaskSchema = TaskSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
    const validatedData = createTaskSchema.parse(body);

    const newTask = await prisma.task.create({
      data: { ...validatedData, userId, dueDate: new Date(validatedData.dueDate) },
    });
    return NextResponse.json(serializeData(newTask), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT /api/tasks/:id
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });

    const updateTaskSchema = TaskSchema.partial().omit({ id: true, userId: true, createdAt: true, updatedAt: true });
    const validatedData = updateTaskSchema.parse(body);

    const updatedTask = await prisma.task.update({
      where: { id, userId },
      data: { ...validatedData, dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined },
    });
    return NextResponse.json(serializeData(updatedTask));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}


// DELETE /api/tasks/:id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = 'clx0000000000000000000000'; // Dummy user ID

    if (!id) return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });

    await prisma.task.delete({ where: { id, userId } });
    return NextResponse.json({ message: 'Task deleted successfully' }, { status: 204 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
