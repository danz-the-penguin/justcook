import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { matchRecipeWithPantry, PantryItemSnapshot } from '@/lib/matcher';
import { searchTheMealDB, searchTheMealDBByIngredient } from '@/lib/themealdb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const filter = searchParams.get('filter') || 'all'; // 'all', 'cookable', 'rescue', 'missing1'
    const includeExternal = searchParams.get('external') === 'true';
    const assumeStaples = searchParams.get('staples') === 'true';

    // 1. Fetch current pantry state
    const pantryDbItems = await prisma.pantryItem.findMany({
      include: {
        batches: {
          orderBy: { expiresAt: 'asc' },
        },
      },
    });

    const now = new Date();
    const pantrySnapshots: PantryItemSnapshot[] = pantryDbItems.map((item) => {
      const totalQty = item.batches.reduce((sum, b) => sum + b.quantity, 0);
      let soonestDays = 999;
      let status: 'fresh' | 'use_soon' | 'critical' | 'expired' = 'fresh';

      if (item.batches.length > 0) {
        const soonest = item.batches[0];
        soonestDays = Math.ceil((soonest.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (soonestDays <= 1) status = 'critical';
        else if (soonestDays <= 4) status = 'use_soon';
      }

      return {
        slug: item.slug,
        name: item.name,
        totalQuantity: totalQty,
        unit: item.defaultUnit,
        freshnessStatus: status,
        soonestDaysLeft: soonestDays,
      };
    });

    // 2. Fetch local database recipes
    const whereClause: any = {};
    if (query && !includeExternal) {
      whereClause.OR = [
        { title: { contains: query } },
        { tags: { contains: query } },
      ];
    }

    const localRecipes = await prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse instructions JSON safely
    const parsedLocal = localRecipes.map((r) => {
      let instructions: string[] = [];
      try {
        instructions = JSON.parse(r.instructions);
      } catch {
        instructions = [r.instructions];
      }
      return {
        ...r,
        instructions,
      };
    });

    // 3. Optionally fetch TheMealDB recipes if requested or searching
    let allRecipes: any[] = [...parsedLocal];

    if (includeExternal || (query && parsedLocal.length < 3)) {
      const externalMeals = query
        ? await searchTheMealDB(query)
        : await searchTheMealDBByIngredient('chicken');
      allRecipes = [...allRecipes, ...externalMeals];
    }

    // 4. Run matching algorithm for each recipe
    const matched = allRecipes.map((r) => matchRecipeWithPantry(r, pantrySnapshots, assumeStaples));

    // 5. Filter based on user selection
    let filtered = matched;
    if (filter === 'cookable') {
      filtered = matched.filter((m) => m.isCookableNow || m.isCookableScaled || m.isCookableWithSubstitutes);
    } else if (filter === 'rescue') {
      filtered = matched.filter((m) => m.rescuedIngredients.length > 0);
    } else if (filter === 'missing1') {
      filtered = matched.filter((m) => m.missingCount === 1);
    }

    // 6. Sort by ranking score descending (Availability + Expiry Urgency)
    filtered.sort((a, b) => b.rankingScore - a.rankingScore);

    return NextResponse.json({
      success: true,
      totalCount: filtered.length,
      recipes: filtered,
    });
  } catch (error) {
    console.error('Error in GET /api/recipes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

// Create a custom recipe
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, imageUrl, prepTimeMinutes, cookTimeMinutes, servings, tags, instructions, ingredients } = body;

    if (!title || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ success: false, error: 'Title and ingredients are required' }, { status: 400 });
    }

    const created = await prisma.recipe.create({
      data: {
        title,
        description: description || '',
        imageUrl: imageUrl || null,
        source: 'custom',
        prepTimeMinutes: Number(prepTimeMinutes) || 10,
        cookTimeMinutes: Number(cookTimeMinutes) || 15,
        servings: Number(servings) || 2,
        tags: tags || 'Custom',
        instructions: JSON.stringify(instructions || []),
        ingredients: {
          create: ingredients.map((ing: any) => ({
            name: ing.name.toLowerCase().trim(),
            rawText: ing.rawText || `${ing.amount || 1} ${ing.unit || 'piece'} ${ing.name}`,
            amount: Number(ing.amount) || 1,
            unit: ing.unit || 'piece',
            category: ing.category || 'produce',
          })),
        },
      },
      include: { ingredients: true },
    });

    return NextResponse.json({ success: true, recipe: created });
  } catch (error) {
    console.error('Error in POST /api/recipes:', error);
    return NextResponse.json({ success: false, error: 'Failed to create recipe' }, { status: 500 });
  }
}

// Update an existing recipe (or save an edited external recipe locally)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, imageUrl, prepTimeMinutes, cookTimeMinutes, servings, tags, instructions, ingredients } = body;

    if (!title || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ success: false, error: 'Title and ingredients are required' }, { status: 400 });
    }

    const formattedIngredients = ingredients.map((ing: any) => ({
      name: ing.name.toLowerCase().trim(),
      rawText: ing.rawText || `${ing.amount || 1} ${ing.unit || 'piece'} ${ing.name}`,
      amount: Number(ing.amount) || 1,
      unit: ing.unit || 'piece',
      category: ing.category || 'produce',
    }));

    const existing = id ? await prisma.recipe.findUnique({ where: { id } }) : null;

    if (existing) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        return tx.recipe.update({
          where: { id },
          data: {
            title: title.trim(),
            description: description || '',
            imageUrl: imageUrl !== undefined ? imageUrl || null : existing.imageUrl,
            prepTimeMinutes: Number(prepTimeMinutes) || 10,
            cookTimeMinutes: Number(cookTimeMinutes) || 15,
            servings: Number(servings) || 2,
            tags: tags || existing.tags || 'Custom',
            instructions: JSON.stringify(instructions || []),
            ingredients: {
              create: formattedIngredients,
            },
          },
          include: { ingredients: true },
        });
      });

      return NextResponse.json({ success: true, recipe: updated });
    } else {
      // Editing an external (e.g. TheMealDB) recipe saves it as a local custom recipe
      const created = await prisma.recipe.create({
        data: {
          title: title.trim(),
          description: description || '',
          imageUrl: imageUrl || null,
          source: 'custom',
          prepTimeMinutes: Number(prepTimeMinutes) || 10,
          cookTimeMinutes: Number(cookTimeMinutes) || 15,
          servings: Number(servings) || 2,
          tags: tags || 'Custom',
          instructions: JSON.stringify(instructions || []),
          ingredients: {
            create: formattedIngredients,
          },
        },
        include: { ingredients: true },
      });

      return NextResponse.json({ success: true, recipe: created });
    }
  } catch (error) {
    console.error('Error in PUT /api/recipes:', error);
    return NextResponse.json({ success: false, error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/recipes:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete recipe' }, { status: 500 });
  }
}
