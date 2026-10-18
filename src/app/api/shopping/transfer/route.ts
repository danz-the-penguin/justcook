import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateExpiryDate, resolveFoodAsset, StorageLocation } from '@/lib/constants/shelf-life';
import { normalizeIngredientName } from '@/lib/matcher';

export async function POST() {
  try {
    const checkedItems = await prisma.shoppingItem.findMany({
      where: { isChecked: true },
    });

    if (checkedItems.length === 0) {
      return NextResponse.json({ success: false, error: 'No checked items to transfer' }, { status: 400 });
    }

    const transferred = [];

    for (const shopItem of checkedItems) {
      const slug = normalizeIngredientName(shopItem.name).replace(/[^a-z0-9]/g, '_');
      const category = (shopItem.category as any) || 'produce';
      const location: StorageLocation =
        category === 'dairy' ? 'fridge' : category === 'meat' ? 'fridge' : category === 'pantry' ? 'pantry' : 'counter';

      // Find or create master PantryItem
      let item = await prisma.pantryItem.findFirst({
        where: {
          OR: [{ slug }, { name: { contains: shopItem.name } }],
        },
      });

      if (!item) {
        item = await prisma.pantryItem.create({
          data: {
            slug,
            name: shopItem.name.charAt(0).toUpperCase() + shopItem.name.slice(1),
            category,
            defaultUnit: shopItem.unit || 'piece',
            pngAsset: resolveFoodAsset(slug, category),
            displayLimit: 12,
          },
        });
      }

      // Calculate smart expiry date
      const expiry = calculateExpiryDate(item.slug, item.category, location);

      // Create new batch
      const batch = await prisma.pantryItemBatch.create({
        data: {
          pantryItemId: item.id,
          quantity: shopItem.amount || 1,
          unit: shopItem.unit || item.defaultUnit,
          location,
          obtainedAt: new Date(),
          expiresAt: expiry,
          notes: shopItem.sourceRecipe ? `Purchased for ${shopItem.sourceRecipe}` : 'Purchased via Shopping List',
        },
      });

      transferred.push({ name: item.name, quantity: batch.quantity, unit: batch.unit });
    }

    // Delete transferred checked items from shopping list
    await prisma.shoppingItem.deleteMany({ where: { isChecked: true } });

    return NextResponse.json({
      success: true,
      transferredCount: transferred.length,
      transferred,
    });
  } catch (error) {
    console.error('Error in POST /api/shopping/transfer:', error);
    return NextResponse.json({ success: false, error: 'Failed to transfer shopping items to pantry' }, { status: 500 });
  }
}
