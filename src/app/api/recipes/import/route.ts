import { NextResponse } from 'next/server';

function parseDurationMinutes(isoDuration?: string): number {
  if (!isoDuration || typeof isoDuration !== 'string') return 15;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return 15;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  return hours * 60 + minutes || 15;
}

function parseIngredientString(raw: string) {
  const clean = raw.trim();
  // Regex to match e.g. "2 1/2 cups all-purpose flour" or "1 tbsp olive oil" or "3 eggs"
  const match = clean.match(/^([\d\s\/\.\u00BC-\u00BE\u2150-\u215E]+)?\s*([a-zA-Z]+)?\s*(.*)$/);
  
  let amount = 1;
  let unit = 'piece';
  let name = clean;

  if (match) {
    const rawAmt = match[1]?.trim();
    const rawUnit = match[2]?.trim().toLowerCase();
    const rawName = match[3]?.trim();

    if (rawAmt) {
      if (rawAmt.includes('/')) {
        const parts = rawAmt.split('/');
        amount = parseFloat(parts[0]) / parseFloat(parts[1]) || 1;
      } else {
        amount = parseFloat(rawAmt) || 1;
      }
    }

    const commonUnits = ['cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'g', 'gram', 'grams', 'kg', 'ml', 'l', 'oz', 'pound', 'pounds', 'clove', 'cloves', 'pinch', 'slice', 'slices', 'piece', 'pieces'];
    if (rawUnit && commonUnits.includes(rawUnit)) {
      unit = rawUnit.replace(/s$/, '');
      name = rawName || clean;
    } else {
      name = (rawUnit ? `${rawUnit} ` : '') + (rawName || '');
    }
  }

  // Clean name
  name = name.replace(/^(of\s+|for\s+)/i, '').replace(/,\s*divided.*$/i, '').trim();

  return {
    rawText: clean,
    name: name || clean,
    amount: amount || 1,
    unit: unit || 'piece',
    category: 'produce',
    isOptional: clean.toLowerCase().includes('optional'),
  };
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Please enter a valid recipe website URL (e.g. https://...)' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Could not reach website (HTTP ${response.status})` }, { status: 400 });
    }

    const html = await response.text();

    // 1. Search for JSON-LD schema scripts
    const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let recipeData: any = null;
    let match: RegExpExecArray | null;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);

        // Helper to inspect an object for Recipe type
        const inspect = (obj: any): any => {
          if (!obj) return null;
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const res = inspect(item);
              if (res) return res;
            }
          } else if (typeof obj === 'object') {
            const type = obj['@type'];
            if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
              return obj;
            }
            if (obj['@graph']) {
              return inspect(obj['@graph']);
            }
          }
          return null;
        };

        const found = inspect(parsed);
        if (found) {
          recipeData = found;
          break;
        }
      } catch {
        // Skip malformed JSON-LD scripts
      }
    }

    if (!recipeData) {
      // Fallback: extract OpenGraph metadata
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["'](.*?)["']/i)?.[1];
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["'](.*?)["']/i)?.[1];
      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["'](.*?)["']/i)?.[1];

      if (ogTitle) {
        return NextResponse.json({
          success: true,
          partial: true,
          recipe: {
            title: ogTitle,
            description: ogDesc || 'Imported from web',
            imageUrl: ogImage || null,
            prepTimeMinutes: 15,
            cookTimeMinutes: 20,
            servings: 2,
            ingredients: [],
            instructions: [],
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No Recipe metadata (JSON-LD) found on this page. Try a dedicated recipe site like NYT Cooking, BBC Good Food, Serious Eats, or Allrecipes.',
      }, { status: 422 });
    }

    // Extract Title
    const title = recipeData.name || recipeData.headline || 'Imported Recipe';

    // Extract Description
    const description = recipeData.description || '';

    // Extract Image
    let imageUrl = null;
    if (typeof recipeData.image === 'string') {
      imageUrl = recipeData.image;
    } else if (Array.isArray(recipeData.image) && recipeData.image[0]) {
      imageUrl = typeof recipeData.image[0] === 'string' ? recipeData.image[0] : recipeData.image[0].url;
    } else if (recipeData.image && typeof recipeData.image === 'object') {
      imageUrl = recipeData.image.url;
    }

    // Extract Times & Servings
    const prepTimeMinutes = parseDurationMinutes(recipeData.prepTime);
    const cookTimeMinutes = parseDurationMinutes(recipeData.cookTime || recipeData.totalTime);
    let servings = 2;
    if (recipeData.recipeYield) {
      const yieldStr = Array.isArray(recipeData.recipeYield) ? recipeData.recipeYield[0] : String(recipeData.recipeYield);
      const yieldNum = parseInt(yieldStr.replace(/[^\d]/g, ''), 10);
      if (yieldNum > 0) servings = yieldNum;
    }

    // Extract Ingredients
    const rawIngredients: string[] = recipeData.recipeIngredient || [];
    const ingredients = rawIngredients.map((raw) => parseIngredientString(raw));

    // Extract Instructions
    let instructions: string[] = [];
    if (Array.isArray(recipeData.recipeInstructions)) {
      instructions = recipeData.recipeInstructions
        .map((step: any) => {
          if (typeof step === 'string') return step.trim();
          if (step && typeof step === 'object') {
            return (step.text || step.name || '').trim();
          }
          return '';
        })
        .filter((t: string) => t.length > 0);
    } else if (typeof recipeData.recipeInstructions === 'string') {
      instructions = recipeData.recipeInstructions
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }

    return NextResponse.json({
      success: true,
      recipe: {
        title,
        description,
        imageUrl,
        prepTimeMinutes,
        cookTimeMinutes,
        servings,
        ingredients,
        instructions,
        source: 'imported',
        externalId: url,
      },
    });
  } catch (error: any) {
    console.error('Error in recipe import API:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to import recipe' }, { status: 500 });
  }
}
