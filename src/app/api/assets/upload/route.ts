import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { calculateExpiryDate, StorageLocation } from '@/lib/constants/shelf-life';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as string)?.trim() || 'pantry';
    const defaultUnit = (formData.get('defaultUnit') as string)?.trim() || 'piece';
    const location = ((formData.get('location') as string)?.trim() || 'pantry') as StorageLocation;
    const quantity = parseFloat((formData.get('quantity') as string) || '1');
    const customExpiry = (formData.get('expiresAt') as string)?.trim();

    if (!file || !name) {
      return NextResponse.json(
        { success: false, error: 'File and ingredient name are required.' },
        { status: 400 }
      );
    }

    // Generate safe normalized slugs
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const strippedSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Invalid ingredient name.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public/assets/food/
    const uploadDir = path.join(process.cwd(), 'public', 'assets', 'food');
    await mkdir(uploadDir, { recursive: true });

    const primaryFileName = `${slug}.png`;
    const primaryFilePath = path.join(uploadDir, primaryFileName);
    await writeFile(primaryFilePath, buffer);

    // Also write stripped version (e.g. yeemee.png if slug is yee_mee.png)
    if (strippedSlug && strippedSlug !== slug) {
      const strippedFilePath = path.join(uploadDir, `${strippedSlug}.png`);
      await writeFile(strippedFilePath, buffer);
    }

    const pngAssetUrl = `/assets/food/${primaryFileName}`;

    // Upsert PantryItem in database
    const item = await prisma.pantryItem.upsert({
      where: { slug },
      update: {
        name,
        category,
        defaultUnit,
        pngAsset: pngAssetUrl,
      },
      create: {
        slug,
        name,
        category,
        defaultUnit,
        pngAsset: pngAssetUrl,
        displayLimit: 8,
      },
    });

    // Create initial batch if quantity > 0
    let batch = null;
    if (quantity > 0) {
      const now = new Date();
      const expiresAt = customExpiry
        ? new Date(customExpiry)
        : calculateExpiryDate(slug, category, location, now);

      batch = await prisma.pantryItemBatch.create({
        data: {
          pantryItemId: item.id,
          quantity,
          unit: defaultUnit,
          location,
          obtainedAt: now,
          expiresAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      item,
      batch,
      assetUrl: pngAssetUrl,
    });
  } catch (error) {
    console.error('Error uploading asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload ingredient asset.' },
      { status: 500 }
    );
  }
}
