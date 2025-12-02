import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET all entries
export async function GET() {
  try {
    const entries = await prisma.entry.findMany({
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}

// POST create new entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, value, name, details, date } = body;

    const entry = await prisma.entry.create({
      data: {
        type,
        value: parseFloat(value),
        name: name || '',
        details: details || null,
        date
      }
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating entry:', error);
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    );
  }
}
