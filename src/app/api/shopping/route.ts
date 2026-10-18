import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const items = await prisma.shoppingItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('Error in GET /api/shopping:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch shopping list' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body; // Array of { name, amount, unit, category, sourceRecipe }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Items array required' }, { status: 400 });
    }

    const createdList = [];
    for (const item of items) {
      if (!item.name) continue;
      const created = await prisma.shoppingItem.create({
        data: {
          name: item.name,
          amount: Number(item.amount) || 1,
          unit: item.unit || 'piece',
          category: item.category || 'produce',
          sourceRecipe: item.sourceRecipe || null,
        },
      });
      createdList.push(created);
    }

    return NextResponse.json({ success: true, count: createdList.length, items: createdList });
  } catch (error) {
    console.error('Error in POST /api/shopping:', error);
    return NextResponse.json({ success: false, error: 'Failed to add shopping items' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isChecked } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: { isChecked: Boolean(isChecked) },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error in PATCH /api/shopping:', error);
    return NextResponse.json({ success: false, error: 'Failed to update shopping item' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearChecked = searchParams.get('clearChecked') === 'true';

    if (clearChecked) {
      await prisma.shoppingItem.deleteMany({ where: { isChecked: true } });
      return NextResponse.json({ success: true });
    }

    if (id) {
      await prisma.shoppingItem.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'id or clearChecked required' }, { status: 400 });
  } catch (error) {
    console.error('Error in DELETE /api/shopping:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete shopping item' }, { status: 500 });
  }
}
