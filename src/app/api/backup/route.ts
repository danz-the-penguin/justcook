import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import JSZip from 'jszip';
import { prisma } from '@/lib/db';

// Transactional Database Record Restoration
async function restoreDatabaseRecords(backupData: any) {
  await prisma.$transaction(async (tx) => {
    // 1. Restore Custom Recipes
    if (Array.isArray(backupData.recipes)) {
      for (const rec of backupData.recipes) {
        const { ingredients, id, ...recipeFields } = rec;
        const upserted = await tx.recipe.upsert({
          where: { id: id || 'temp-id' },
          update: recipeFields,
          create: {
            ...recipeFields,
            id: id || undefined,
          },
        });

        if (Array.isArray(ingredients)) {
          await tx.recipeIngredient.deleteMany({ where: { recipeId: upserted.id } });
          for (const ing of ingredients) {
            const { id: ingId, recipeId, ...ingFields } = ing;
            await tx.recipeIngredient.create({
              data: {
                ...ingFields,
                recipeId: upserted.id,
              },
            });
          }
        }
      }
    }

    // 2. Restore Pantry Items & Batches
    if (backupData.cleanRestore) {
      await tx.pantryItemBatch.deleteMany({});
    }

    if (Array.isArray(backupData.pantryItems)) {
      for (const item of backupData.pantryItems) {
        const { batches, id, ...itemFields } = item;
        const upsertedItem = await tx.pantryItem.upsert({
          where: { slug: itemFields.slug },
          update: itemFields,
          create: itemFields,
        });

        if (Array.isArray(batches)) {
          await tx.pantryItemBatch.deleteMany({ where: { pantryItemId: upsertedItem.id } });
          for (const b of batches) {
            const { id: batchId, pantryItemId, obtainedAt, expiresAt, createdAt, updatedAt, ...batchFields } = b;
            await tx.pantryItemBatch.create({
              data: {
                ...batchFields,
                pantryItemId: upsertedItem.id,
                obtainedAt: new Date(obtainedAt),
                expiresAt: new Date(expiresAt),
              },
            });
          }
        }
      }
    }

    // 3. Restore Shopping Items
    if (Array.isArray(backupData.shoppingItems)) {
      await tx.shoppingItem.deleteMany({});
      for (const s of backupData.shoppingItems) {
        const { id, createdAt, ...shopFields } = s;
        await tx.shoppingItem.create({
          data: shopFields,
        });
      }
    }

    // 4. Restore Rescued Stats
    if (Array.isArray(backupData.rescuedStats)) {
      await tx.rescuedStat.deleteMany({});
      for (const r of backupData.rescuedStats) {
        const { id, rescuedAt, ...statFields } = r;
        await tx.rescuedStat.create({
          data: {
            ...statFields,
            rescuedAt: new Date(rescuedAt),
          },
        });
      }
    }
  });
}

// GET /api/backup?format=zip (default) | format=json | format=pantry
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'zip';

    const pantryItems = await prisma.pantryItem.findMany({
      include: { batches: true },
    });

    const recipes = await prisma.recipe.findMany({
      include: { ingredients: true },
    });

    const shoppingItems = await prisma.shoppingItem.findMany();
    const rescuedStats = await prisma.rescuedStat.findMany();

    const publicDir = path.resolve(process.cwd(), 'public');
    const assetPathsToInclude = new Set<string>();

    for (const item of pantryItems) {
      if (item.pngAsset && item.pngAsset.startsWith('/')) {
        assetPathsToInclude.add(item.pngAsset);
      }
    }

    for (const recipe of recipes) {
      if (recipe.imageUrl && recipe.imageUrl.startsWith('/assets/')) {
        assetPathsToInclude.add(recipe.imageUrl);
      }
    }

    const cleanManifest = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'Pantry Chef',
      archiveType: format === 'json' ? 'json-bundle' : 'zip-package',
      pantryItems,
      recipes,
      shoppingItems,
      rescuedStats,
    };

    // Return pure JSON if requested
    if (format === 'json') {
      // Also embed assets as base64 for standalone single-file json use
      const assets: Record<string, string> = {};
      for (const assetPath of assetPathsToInclude) {
        try {
          const cleanPath = assetPath.replace(/^\//, '');
          const fullPath = path.resolve(publicDir, cleanPath);
          if (fullPath.startsWith(publicDir)) {
            const buffer = await readFile(fullPath);
            const ext = path.extname(fullPath).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            assets[assetPath] = `data:${mimeType};base64,${buffer.toString('base64')}`;
          }
        } catch {}
      }

      const jsonPayload = { ...cleanManifest, assets };
      return new Response(JSON.stringify(jsonPayload, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="pantry-chef-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    // Default: Return actual ZIP archive containing kitchen.json + raw binary image files as-is
    const zip = new JSZip();

    // 1. Add kitchen.json manifest
    zip.file('kitchen.json', JSON.stringify(cleanManifest, null, 2));

    // 2. Add raw image files directly to the zip under assets/ (bit-for-bit original files)
    let addedAssetCount = 0;
    for (const assetPath of assetPathsToInclude) {
      try {
        const cleanPath = assetPath.replace(/^\//, '');
        const fullPath = path.resolve(publicDir, cleanPath);
        if (fullPath.startsWith(publicDir)) {
          const rawBuffer = await readFile(fullPath);
          zip.file(cleanPath, rawBuffer);
          addedAssetCount++;
        }
      } catch {
        // Skip missing files
      }
    }

    // Generate ZIP buffer (compression: DEFLATE)
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const fileExt = format === 'pantry' ? 'pantry' : 'zip';
    const dateStr = new Date().toISOString().split('T')[0];

    return new Response(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="pantry-chef-backup-${dateStr}.${fileExt}"`,
        'X-Assets-Count': String(addedAssetCount),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/backup:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate backup' }, { status: 500 });
  }
}

// POST /api/backup
// Decodes and restores from either:
// 1. Multipart FormData (.zip, .pantry, or .json file)
// 2. Application JSON (raw JSON payload or snapshot slot)
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const publicDir = path.resolve(process.cwd(), 'public');

    // CASE 1: Multipart file upload (.zip, .pantry, or .json)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Check ZIP magic signature: PK\x03\x04
      const isZip =
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04;

      if (isZip) {
        // === ZIP ARCHIVE DECODER ===
        const zip = await JSZip.loadAsync(buffer);

        // Find kitchen manifest
        let manifestFile = zip.file('kitchen.json') || zip.file('manifest.json');
        if (!manifestFile) {
          const jsonEntries = zip.file(/\.json$/i);
          if (jsonEntries.length > 0) manifestFile = jsonEntries[0];
        }

        if (!manifestFile) {
          return NextResponse.json(
            { success: false, error: 'Invalid archive: kitchen.json manifest not found inside zip' },
            { status: 400 }
          );
        }

        const manifestContent = await manifestFile.async('string');
        const backupData = JSON.parse(manifestContent);

        if (!backupData || !backupData.version) {
          return NextResponse.json(
            { success: false, error: 'Invalid manifest format inside zip' },
            { status: 400 }
          );
        }

        // Unpack raw binary assets directly to public/assets/ (with Zip-Slip traversal protection)
        let extractedAssetCount = 0;
        const imageRegex = /\.(png|jpe?g|webp|svg|gif)$/i;

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          if (relativePath.startsWith('assets/') || imageRegex.test(relativePath)) {
            // Guard against directory traversal
            const cleanRelative = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
            const targetPath = path.resolve(publicDir, cleanRelative);

            if (targetPath.startsWith(publicDir)) {
              const rawAssetBuffer = await zipEntry.async('nodebuffer');
              await mkdir(path.dirname(targetPath), { recursive: true });
              await writeFile(targetPath, rawAssetBuffer);
              extractedAssetCount++;

              // Also write stripped version if applicable (e.g. yeemee.png for yee_mee.png)
              const baseName = path.basename(targetPath);
              const ext = path.extname(baseName);
              const stem = baseName.replace(ext, '');
              const stripped = stem.replace(/[^a-z0-9]/gi, '');
              if (stripped && stripped !== stem) {
                const strippedPath = path.join(path.dirname(targetPath), `${stripped}${ext}`);
                await writeFile(strippedPath, rawAssetBuffer);
              }
            }
          }
        }

        // Transactional Database Restore
        backupData.cleanRestore = true;
        await restoreDatabaseRecords(backupData);

        return NextResponse.json({
          success: true,
          message: `Archive unpacked! Restored kitchen and extracted ${extractedAssetCount} raw image assets as-is.`,
          extractedAssetCount,
        });
      } else {
        // Standard JSON file uploaded as multipart file
        const text = buffer.toString('utf-8');
        const backupData = JSON.parse(text);
        backupData.cleanRestore = true;
        await restoreDatabaseRecords(backupData);

        return NextResponse.json({
          success: true,
          message: 'Kitchen restored from JSON file.',
        });
      }
    }

    // CASE 2: Raw Application JSON (from local save slots or starter presets)
    const backupData = await request.json();

    if (!backupData || !backupData.version) {
      return NextResponse.json({ success: false, error: 'Invalid backup data signature' }, { status: 400 });
    }

    // Restore any embedded base64 assets if provided
    if (backupData.assets && typeof backupData.assets === 'object') {
      for (const [assetPath, dataUri] of Object.entries(backupData.assets)) {
        if (typeof dataUri === 'string' && dataUri.startsWith('data:image/')) {
          try {
            const base64Index = dataUri.indexOf(';base64,');
            if (base64Index !== -1) {
              const base64Data = dataUri.substring(base64Index + 8);
              const rawBuffer = Buffer.from(base64Data, 'base64');
              const cleanPath = assetPath.replace(/^\//, '');
              const targetPath = path.resolve(publicDir, cleanPath);
              if (targetPath.startsWith(publicDir)) {
                await mkdir(path.dirname(targetPath), { recursive: true });
                await writeFile(targetPath, rawBuffer);

                const baseName = path.basename(targetPath);
                const ext = path.extname(baseName);
                const stem = baseName.replace(ext, '');
                const stripped = stem.replace(/[^a-z0-9]/gi, '');
                if (stripped && stripped !== stem) {
                  const strippedPath = path.join(path.dirname(targetPath), `${stripped}${ext}`);
                  await writeFile(strippedPath, rawBuffer);
                }
              }
            }
          } catch (err) {
            console.error(`Error restoring base64 asset ${assetPath}:`, err);
          }
        }
      }
    }

    await restoreDatabaseRecords(backupData);

    return NextResponse.json({
      success: true,
      message: 'Kitchen data restored cleanly!',
    });
  } catch (error) {
    console.error('Error in POST /api/backup:', error);
    return NextResponse.json({ success: false, error: 'Failed to restore backup archive' }, { status: 500 });
  }
}
