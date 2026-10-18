import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { normalizeIngredientName } from '@/lib/matcher';
import { CULINARY_SUBSTITUTIONS } from '@/lib/constants/substitutions';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipeTitle, ingredients } = body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ success: false, error: 'Ingredients array required' }, { status: 400 });
    }

    const deducted: { name: string; amount: number; unit: string }[] = [];
    const rescued: { name: string; savedDays: number }[] = [];
    const now = new Date();

    const deductFromItem = async (targetSlugOrName: string, qtyToDeduct: number) => {
      const item = await prisma.pantryItem.findFirst({
        where: {
          OR: [
            { slug: targetSlugOrName },
            { name: { contains: targetSlugOrName } },
          ],
        },
        include: {
          batches: {
            orderBy: { expiresAt: 'asc' }, // FIFO: oldest/soonest expiring first
          },
        },
      });

      if (!item || item.batches.length === 0) return false;

      let remainingNeeded = qtyToDeduct;
      for (const batch of item.batches) {
        if (remainingNeeded <= 0) break;

        const daysLeft = Math.ceil((batch.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const deductQty = Math.min(batch.quantity, remainingNeeded);

        // Check if rescued from expiring
        if (daysLeft <= 3 && daysLeft >= 0) {
          rescued.push({ name: item.name, savedDays: daysLeft });
          await prisma.rescuedStat.create({
            data: {
              itemName: item.name,
              quantity: deductQty,
              unit: batch.unit,
              recipeTitle: recipeTitle || 'Homemade Meal',
              savedDaysBeforeExpiry: daysLeft,
              estimatedValue: 1.50,
            },
          });
        }

        const remaining = Math.round((batch.quantity - deductQty) * 100) / 100;
        remainingNeeded -= deductQty;

        if (remaining <= 0) {
          await prisma.pantryItemBatch.delete({ where: { id: batch.id } });
        } else {
          await prisma.pantryItemBatch.update({
            where: { id: batch.id },
            data: { quantity: remaining },
          });
        }

        deducted.push({ name: item.name, amount: deductQty, unit: batch.unit });
      }
      return true;
    };

    for (const reqIng of ingredients) {
      const norm = normalizeIngredientName(reqIng.name || '');
      const requiredQty = Number(reqIng.amount) || 1;

      const wasDeducted = await deductFromItem(norm, requiredQty);

      // If primary ingredient wasn't in pantry, check culinary substitutes and deduct from them
      if (!wasDeducted && CULINARY_SUBSTITUTIONS[norm]) {
        for (const subOption of CULINARY_SUBSTITUTIONS[norm]) {
          // Check if all substitute items exist in pantry
          let allExist = true;
          for (const subItem of subOption.substituteItems) {
            const found = await prisma.pantryItem.findFirst({
              where: { slug: subItem.slug, batches: { some: { quantity: { gt: 0 } } } },
            });
            if (!found) {
              allExist = false;
              break;
            }
          }
          if (allExist) {
            for (const subItem of subOption.substituteItems) {
              await deductFromItem(subItem.slug, Math.max(0.5, Math.round(requiredQty * subItem.amountRatio * 10) / 10));
            }
            break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      deducted,
      rescuedCount: rescued.length,
      rescued,
    });
  } catch (error) {
    console.error('Error in POST /api/recipes/cook:', error);
    return NextResponse.json({ success: false, error: 'Failed to cook recipe' }, { status: 500 });
  }
}
