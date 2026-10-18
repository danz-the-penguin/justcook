import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { resolveFoodAsset, registerCustomFoodSlug } from '@/lib/constants/shelf-life';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string | null;
    const currentSlug = formData.get('slug') as string | null;
    const name = (formData.get('name') as string)?.trim();
    const category = (formData.get('category') as string)?.trim();
    const defaultUnit = (formData.get('defaultUnit') as string)?.trim();
    const file = formData.get('file') as File | null;

    if (!id && !currentSlug) {
      return NextResponse.json(
        { success: false, error: 'Item ID or slug is required.' },
        { status: 400 }
      );
    }

    const existingItem = await prisma.pantryItem.findFirst({
      where: id ? { id } : { slug: currentSlug! },
    });

    if (!existingItem) {
      return NextResponse.json(
        { success: false, error: 'Pantry item not found.' },
        { status: 404 }
      );
    }

    let pngAssetUrl = existingItem.pngAsset;

    // Handle new asset file upload if provided
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const uploadDir = path.join(process.cwd(), 'public', 'assets', 'food');
      await mkdir(uploadDir, { recursive: true });

      const assetFileName = `${existingItem.slug}.png`;
      const filePath = path.join(uploadDir, assetFileName);
      await writeFile(filePath, buffer);

      // Also write stripped version (e.g. yeemee.png if yee_mee.png)
      const stripped = existingItem.slug.replace(/[^a-z0-9]/g, '');
      if (stripped && stripped !== existingItem.slug) {
        await writeFile(path.join(uploadDir, `${stripped}.png`), buffer);
      }

      pngAssetUrl = `/assets/food/${assetFileName}`;
      registerCustomFoodSlug(existingItem.slug);
    }

    // Update item in database
    const updated = await prisma.pantryItem.update({
      where: { id: existingItem.id },
      data: {
        name: name || existingItem.name,
        category: category || existingItem.category,
        defaultUnit: defaultUnit || existingItem.defaultUnit,
        pngAsset: pngAssetUrl,
      },
    });

    registerCustomFoodSlug(updated.slug);

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update asset.' },
      { status: 500 }
    );
  }
}
