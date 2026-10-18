// TheMealDB Public Free API Connector

export interface TheMealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strTags?: string;
  strYoutube?: string;
  [key: string]: string | undefined;
}

export interface NormalizedMealRecipe {
  id: string;
  externalId: string;
  title: string;
  description: string;
  source: 'themealdb';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  imageUrl: string;
  tags: string;
  instructions: string[];
  ingredients: {
    name: string;
    rawText: string;
    amount: number;
    unit: string;
    category: string;
    isOptional: boolean;
  }[];
}

// Map common food names to categories
function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (['egg', 'milk', 'butter', 'cheese', 'cream', 'yogurt'].some((k) => n.includes(k))) return 'dairy';
  if (['chicken', 'beef', 'pork', 'bacon', 'turkey', 'lamb', 'fish', 'prawn', 'salmon'].some((k) => n.includes(k))) return 'meat';
  if (['rice', 'pasta', 'flour', 'bread', 'noodle', 'oat', 'sugar', 'bean'].some((k) => n.includes(k))) return 'pantry';
  if (['oil', 'soy sauce', 'salt', 'pepper', 'vinegar', 'sauce', 'oregano', 'cumin', 'paprika'].some((k) => n.includes(k))) return 'spices';
  return 'produce';
}

// Parse measure string (e.g. "2 cups", "100g", "2 tbsp", "1")
function parseMeasure(measure: string = ''): { amount: number; unit: string } {
  const clean = measure.trim();
  if (!clean) return { amount: 1, unit: 'piece' };

  // Match numbers/fractions at beginning
  const match = clean.match(/^([\d\s\/\.\-]+)\s*(.*)$/);
  if (match) {
    let numStr = match[1].trim();
    const unitStr = match[2].trim() || 'piece';

    // Handle simple fractions e.g. "1/2"
    if (numStr.includes('/')) {
      const parts = numStr.split('/');
      if (parts.length === 2) {
        const val = parseFloat(parts[0]) / parseFloat(parts[1]);
        if (!isNaN(val)) return { amount: Math.round(val * 100) / 100, unit: unitStr };
      }
    }

    const val = parseFloat(numStr);
    if (!isNaN(val)) {
      return { amount: val, unit: unitStr };
    }
  }

  return { amount: 1, unit: clean };
}

// Convert raw TheMealDB object into our clean standard schema
export function normalizeTheMealDBRecipe(meal: TheMealDBMeal): NormalizedMealRecipe {
  const ingredients: NormalizedMealRecipe['ingredients'] = [];

  for (let i = 1; i <= 20; i++) {
    const ingName = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingName && ingName.trim().length > 0) {
      const parsed = parseMeasure(measure);
      ingredients.push({
        name: ingName.trim().toLowerCase(),
        rawText: `${measure ? measure.trim() + ' ' : ''}${ingName.trim()}`,
        amount: parsed.amount,
        unit: parsed.unit,
        category: inferCategory(ingName),
        isOptional: false,
      });
    }
  }

  // Split instructions into step-by-step array
  const rawSteps = (meal.strInstructions || '')
    .split(/\r\n|\n|\r/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  return {
    id: `themealdb-${meal.idMeal}`,
    externalId: meal.idMeal,
    title: meal.strMeal,
    description: `${meal.strCategory || 'International'} dish from ${meal.strArea || 'global'} cuisine.`,
    source: 'themealdb',
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    imageUrl: meal.strMealThumb,
    tags: [meal.strCategory, meal.strArea, meal.strTags].filter(Boolean).join(', '),
    instructions: rawSteps.length > 0 ? rawSteps : [meal.strInstructions],
    ingredients,
  };
}

// Search TheMealDB by recipe name
export async function searchTheMealDB(query: string): Promise<NormalizedMealRecipe[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.meals) return [];
    return data.meals.map(normalizeTheMealDBRecipe);
  } catch (error) {
    console.error('Failed to query TheMealDB:', error);
    return [];
  }
}

// Search TheMealDB by main ingredient
export async function searchTheMealDBByIngredient(ingredient: string): Promise<NormalizedMealRecipe[]> {
  try {
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.meals) return [];

    // Filter endpoint returns only { idMeal, strMeal, strMealThumb }. Fetch full details for first 5
    const topMeals = data.meals.slice(0, 5);
    const fullMeals: NormalizedMealRecipe[] = [];

    for (const m of topMeals) {
      const detailRes = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`, {
        next: { revalidate: 86400 },
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        if (detailData.meals && detailData.meals[0]) {
          fullMeals.push(normalizeTheMealDBRecipe(detailData.meals[0]));
        }
      }
    }

    return fullMeals;
  } catch (error) {
    console.error('Failed to query TheMealDB by ingredient:', error);
    return [];
  }
}
