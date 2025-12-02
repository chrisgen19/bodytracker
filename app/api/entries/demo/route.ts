import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST() {
  try {
    const getDate = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    const mockData: Array<{
      type: string;
      value: number;
      name: string;
      details: string;
      date: string;
    }> = [];

    // Long term history
    for (let i = 365; i > 30; i -= 14) {
      const progress = (365 - i) / 365;
      const estimatedWeight = 95 - (progress * 9) + (Math.random() * 1 - 0.5);

      mockData.push({
        type: 'weight',
        value: parseFloat(estimatedWeight.toFixed(1)),
        date: getDate(i),
        name: '',
        details: ''
      });

      if (Math.random() > 0.5) {
        mockData.push({
          type: 'exercise',
          value: 30 + Math.floor(Math.random() * 30),
          name: 'Walking',
          date: getDate(i),
          details: ''
        });
      }
    }

    // Medium term
    for (let i = 30; i > 7; i -= 3) {
      const estimatedWeight = 86 - ((30 - i) / 30) * 1 + (Math.random() * 0.6 - 0.3);

      mockData.push({
        type: 'weight',
        value: parseFloat(estimatedWeight.toFixed(1)),
        date: getDate(i),
        name: '',
        details: ''
      });

      mockData.push({
        type: 'food',
        value: 2000 + Math.floor(Math.random() * 600),
        name: 'Daily Total',
        date: getDate(i),
        details: ''
      });

      if (Math.random() > 0.3) {
        mockData.push({
          type: 'exercise',
          value: 45 + Math.floor(Math.random() * 30),
          name: 'Gym Session',
          date: getDate(i),
          details: ''
        });
      }
    }

    // Recent detail
    const recentEvents = [
      { d: 7, w: 85.0, f: 2800, e: 0, fn: 'Cheat Day Pizza', en: '', detail: 'Felt heavy' },
      { d: 6, w: 85.2, f: 1800, e: 30, fn: 'Salad & Chicken', en: 'Jogging', detail: '' },
      { d: 5, w: 84.9, f: 1900, e: 60, fn: 'Healthy Wrap', en: 'Weight Lifting', detail: '' },
      { d: 4, w: 84.7, f: 2000, e: 0, fn: 'Steak Dinner', en: '', detail: 'Rest day' },
      { d: 3, w: 84.5, f: 1700, e: 45, fn: 'Smoothie Bowl', en: 'HIIT', detail: '' },
      { d: 2, w: 84.3, f: 1800, e: 0, fn: 'Fish & Rice', en: '', detail: '' },
      { d: 1, w: 84.1, f: 1900, e: 90, fn: 'Protein Pasta', en: 'Long Run', detail: '' },
      { d: 0, w: 84.0, f: 500, e: 0, fn: 'Oatmeal Breakfast', en: '', detail: 'Morning weigh-in' },
    ];

    recentEvents.forEach(evt => {
      mockData.push({ type: 'weight', value: evt.w, date: getDate(evt.d), name: '', details: evt.detail || '' });
      if (evt.f) mockData.push({ type: 'food', value: evt.f, date: getDate(evt.d), name: evt.fn, details: '' });
      if (evt.e) mockData.push({ type: 'exercise', value: evt.e, date: getDate(evt.d), name: evt.en || 'Workout', details: '' });
    });

    // Insert all mock data
    await prisma.entry.createMany({
      data: mockData
    });

    return NextResponse.json({ success: true, count: mockData.length });
  } catch (error) {
    console.error('Error generating mock data:', error);
    return NextResponse.json(
      { error: 'Failed to generate mock data' },
      { status: 500 }
    );
  }
}
