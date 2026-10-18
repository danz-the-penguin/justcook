import { NextResponse } from 'next/server';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { calculateExpiryDate, getEstimatedExpiryDays, resolveFoodAsset, StorageLocation } from '@/lib/constants/shelf-life';

// Helper to determine freshness status
export function getFreshnessStatus(expiresAt: Date): 'fresh' | 'use_soon' | 'critical' | 'expired' {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 1) return 'critical';
  if (diffDays <= 4) return 'use_soon';
  return 'fresh';
}

export function extractBatchSize(notes?: string | null): 'small' | 'medium' | 'large' {
  if (!notes) return 'medium';
  const lower = notes.toLowerCase();
  if (lower.includes('size:small') || lower.includes('small') || lower.includes('mini')) return 'small';
  if (lower.includes('size:large') || lower.includes('large') || lower.includes('jumbo')) return 'large';
  return 'medium';
}

export function extractLoafSlices(notes?: string | null): number {
  if (!notes) return 8;
  const match = notes.match(/slices:\s*(\d+)/i);
  if (match && match[1]) {
    const val = parseInt(match[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 8;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') as StorageLocation | null;

    const whereBatch = location ? { location } : {};

    const items = await prisma.pantryItem.findMany({
      include: {
        batches: {
          where: whereBatch,
          orderBy: { expiresAt: 'asc' }, // FIFO: oldest/soonest expiring first
        },
      },
      orderBy: { name: 'asc' },
    });

    const enriched = items.map((item) => {
      const activeBatches = item.batches;
      const totalQuantity = activeBatches.reduce((sum, b) => sum + b.quantity, 0);

      // Determine most urgent batch
      let itemFreshness: 'fresh' | 'use_soon' | 'critical' | 'expired' = 'fresh';
      let soonestExpiry: Date | null = null;
      let oldestObtained: Date | null = null;

      if (activeBatches.length > 0) {
        soonestExpiry = activeBatches[0].expiresAt;
        itemFreshness = getFreshnessStatus(soonestExpiry);
        oldestObtained = activeBatches.reduce(
          (oldest, b) => (b.obtainedAt < oldest ? b.obtainedAt : oldest),
          activeBatches[0].obtainedAt
        );
      }

      return {
        ...item,
        pngAsset: resolveFoodAsset(item.slug, item.category),
        totalQuantity,
        soonestExpiry,
        oldestObtained,
        freshnessStatus: itemFreshness,
        batches: activeBatches.map((b) => ({
          ...b,
          size: extractBatchSize(b.notes),
          slicesPerLoaf: extractLoafSlices(b.notes),
          freshness: getFreshnessStatus(b.expiresAt),
          daysLeft: Math.ceil((b.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        })),
      };
    });

    return NextResponse.json({ success: true, items: enriched });
  } catch (error) {
    console.error('Error in GET /api/pantry:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pantry items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, location = 'fridge', quantity = 1, unit, obtainedAt, expiresAt, notes, size } = body;

    let item = await prisma.pantryItem.findUnique({ where: { slug } });
    if (!item) {
      const cat = body.category || 'produce';
      // Create master item if not yet registered
      item = await prisma.pantryItem.create({
        data: {
          slug,
          name: body.name || slug.charAt(0).toUpperCase() + slug.slice(1),
          category: cat,
          defaultUnit: unit || 'piece',
          pngAsset: resolveFoodAsset(slug, cat),
          displayLimit: 12,
        },
      });
    }

    const finalObtainedAt = obtainedAt ? new Date(obtainedAt) : new Date();
    const finalExpiresAt = expiresAt
      ? new Date(expiresAt)
      : calculateExpiryDate(item.slug, item.category, location as StorageLocation, finalObtainedAt);

    const finalSize = size || extractBatchSize(notes) || 'medium';
    const slicesCount = body.slicesPerLoaf || body.newSlices;
    let finalNotes = notes || null;
    if (finalSize) {
      finalNotes = finalNotes ? `${finalNotes} size:${finalSize}` : `size:${finalSize}`;
    }
    if (slicesCount && Number(slicesCount) > 0) {
      finalNotes = finalNotes ? `${finalNotes} slices:${slicesCount}` : `slices:${slicesCount}`;
    }

    const batch = await prisma.pantryItemBatch.create({
      data: {
        pantryItemId: item.id,
        quantity: Number(quantity),
        unit: unit || item.defaultUnit,
        location,
        obtainedAt: finalObtainedAt,
        expiresAt: finalExpiresAt,
        notes: finalNotes,
      },
    });

    const enrichedBatch = {
      ...batch,
      size: finalSize,
      slicesPerLoaf: slicesCount ? Number(slicesCount) : extractLoafSlices(batch.notes),
      freshness: getFreshnessStatus(batch.expiresAt),
      daysLeft: Math.ceil((batch.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    };

    return NextResponse.json({ success: true, batch: enrichedBatch, item });
  } catch (error) {
    console.error('Error in POST /api/pantry:', error);
    return NextResponse.json({ success: false, error: 'Failed to add pantry batch' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { batchId, quantityChange, newLocation, newExpiresAt, newNotes, newSize, newSlices, slicesPerLoaf } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'batchId is required' }, { status: 400 });
    }

    const existingBatch = await prisma.pantryItemBatch.findUnique({
      where: { id: batchId },
      include: { pantryItem: true },
    });

    if (!existingBatch) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    // Decrement or increment
    if (quantityChange !== undefined) {
      const updatedQty = existingBatch.quantity + Number(quantityChange);
      if (updatedQty <= 0) {
        // Quantity exhausted, delete batch
        await prisma.pantryItemBatch.delete({ where: { id: batchId } });
        return NextResponse.json({ success: true, deleted: true, remainingQty: 0 });
      } else {
        const updated = await prisma.pantryItemBatch.update({
          where: { id: batchId },
          data: { quantity: updatedQty },
        });
        return NextResponse.json({ success: true, batch: updated, remainingQty: updatedQty });
      }
    }

    // Direct quantity override
    if (body.newQuantity !== undefined) {
      const targetQty = Number(body.newQuantity);
      if (targetQty <= 0) {
        await prisma.pantryItemBatch.delete({ where: { id: batchId } });
        return NextResponse.json({ success: true, deleted: true, remainingQty: 0 });
      } else {
        const updated = await prisma.pantryItemBatch.update({
          where: { id: batchId },
          data: { quantity: targetQty },
        });
        return NextResponse.json({ success: true, batch: updated, remainingQty: targetQty });
      }
    }

    // Relocation, size, slices, or date update
    const updateData: { location?: string; expiresAt?: Date; notes?: string } = {};
    if (newLocation && newLocation !== existingBatch.location) {
      updateData.location = newLocation;
      // Auto-adapt expiry if moving to freezer or fridge
      if (!newExpiresAt) {
        const addedDays = getEstimatedExpiryDays(existingBatch.pantryItem.slug, existingBatch.pantryItem.category, newLocation as StorageLocation);
        const autoExp = new Date();
        autoExp.setDate(autoExp.getDate() + addedDays);
        updateData.expiresAt = autoExp;
      }
    }
    if (newExpiresAt) {
      updateData.expiresAt = new Date(newExpiresAt);
    }
    
    // Notes, Size, and SlicesPerLoaf updates
    const targetSlices = newSlices !== undefined ? Number(newSlices) : slicesPerLoaf !== undefined ? Number(slicesPerLoaf) : undefined;
    if (newNotes !== undefined || newSize || targetSlices !== undefined) {
      let baseNotes = (newNotes !== undefined ? newNotes : existingBatch.notes) || '';
      if (newSize) {
        baseNotes = baseNotes.replace(/size:\s*(small|medium|large)/gi, '').trim();
        if (newSize !== 'medium') {
          baseNotes = baseNotes ? `${baseNotes} size:${newSize}` : `size:${newSize}`;
        }
      }
      if (targetSlices !== undefined) {
        baseNotes = baseNotes.replace(/slices:\s*\d+/gi, '').trim();
        if (targetSlices > 0) {
          baseNotes = baseNotes ? `${baseNotes} slices:${targetSlices}` : `slices:${targetSlices}`;
        }
      }
      updateData.notes = baseNotes || undefined;
    }

    const updated = await prisma.pantryItemBatch.update({
      where: { id: batchId },
      data: updateData,
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (error) {
    console.error('Error in PATCH /api/pantry:', error);
    return NextResponse.json({ success: false, error: 'Failed to update pantry batch' }, { status: 500 });
  }
}

const CORE_PROTECTED_SLUGS = new Set([
  'black_pepper', 'bread', 'butter', 'carrot', 'cheese', 'chicken', 'egg',
  'flour', 'garlic', 'milk', 'olive_oil', 'onion', 'pasta', 'potato',
  'rice', 'salt', 'soy_sauce', 'spinach', 'tomato'
]);

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const slug = searchParams.get('slug');
    const itemId = searchParams.get('itemId');
    const deleteAsset = searchParams.get('deleteAsset') === 'true';

    if (batchId) {
      await prisma.pantryItemBatch.delete({ where: { id: batchId } });
      return NextResponse.json({ success: true });
    }

    if (slug || itemId) {
      const item = slug
        ? await prisma.pantryItem.findUnique({ where: { slug } })
        : await prisma.pantryItem.findUnique({ where: { id: itemId! } });

      if (item) {
        // Delete all batches
        await prisma.pantryItemBatch.deleteMany({ where: { pantryItemId: item.id } });

        // If deleteAsset is requested or item is being removed completely:
        if (deleteAsset) {
          await prisma.pantryItem.delete({ where: { id: item.id } });

          // If not a default core asset, clean up the png file from disk
          if (!CORE_PROTECTED_SLUGS.has(item.slug)) {
            const uploadDir = path.join(process.cwd(), 'public', 'assets', 'food');
            try {
              await unlink(path.join(uploadDir, `${item.slug}.png`));
            } catch {}
            const stripped = item.slug.replace(/[^a-z0-9]/g, '');
            if (stripped && stripped !== item.slug) {
              try {
                await unlink(path.join(uploadDir, `${stripped}.png`));
              } catch {}
            }
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'batchId, slug, or itemId required' }, { status: 400 });
  } catch (error) {
    console.error('Error in DELETE /api/pantry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
