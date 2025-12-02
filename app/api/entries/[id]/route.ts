import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// DELETE entry by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.entry.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    );
  }
}

// PUT/PATCH update entry by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, value, name, details, date } = body;

    const entry = await prisma.entry.update({
      where: { id },
      data: {
        type,
        value: parseFloat(value),
        name: name || '',
        details: details || null,
        date
      }
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error updating entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry' },
      { status: 500 }
    );
  }
}
