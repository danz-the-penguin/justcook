import { findSubstitutionsForMissing, SubstitutionOption } from './constants/substitutions';

export interface PantryItemSnapshot {
  slug: string;
  name: string;
  totalQuantity: number;
  unit: string;
  freshnessStatus: 'fresh' | 'use_soon' | 'critical' | 'expired';
  soonestDaysLeft: number;
}

export interface MatchedIngredientDetail {
  name: string;
  rawText: string;
  requiredAmount: number;
  requiredUnit: string;
  pantryAmount: number;
  status: 'available' | 'partial' | 'missing' | 'substituted';
  freshness?: 'fresh' | 'use_soon' | 'critical' | 'expired';
  daysLeft?: number;
  substitution?: SubstitutionOption | null;
}

export interface RecipeMatchResult {
  recipe: any;
  matchPercentage: number;
  isCookableNow: boolean;
  isCookableScaled: boolean;
  isCookableWithSubstitutes: boolean;
  urgencyScore: number;
  rankingScore: number;
  rescuedIngredients: { name: string; daysLeft: number; status: string }[];
  missingCount: number;
  ingredientsDetail: MatchedIngredientDetail[];
  limitingIngredient: { name: string; required: number; available: number; scaleFactor: number } | null;
}

// Always-available basic staples that won't penalize a recipe match
const PANTRY_STAPLES = new Set(['water', 'salt', 'tap water', 'ice', 'black pepper', 'oil']);

// Extended kitchen staples (sauces, oils, spices) when "Assume Kitchen Staples" is toggled on
export const EXTENDED_KITCHEN_STAPLES = new Set([
  'water',
  'salt',
  'tap water',
  'ice',
  'black pepper',
  'white pepper',
  'pepper',
  'sugar',
  'brown sugar',
  'oil',
  'olive oil',
  'olive_oil',
  'cooking oil',
  'vegetable oil',
  'sesame oil',
  'soy sauce',
  'soy_sauce',
  'light soy sauce',
  'dark soy sauce',
  'oyster sauce',
  'vinegar',
  'cornstarch',
]);

// Fuzzy name normalizer (e.g., "Large Eggs" -> "egg", "Yellow Onions" -> "onion")
export function normalizeIngredientName(name: string): string {
  let clean = name.toLowerCase().trim().replace(/_/g, ' ');
  clean = clean.replace(/^(large|small|medium|fresh|chopped|diced|sliced|minced|beaten|clove|cloves of)\s+/, '');
  clean = clean.replace(/\s+(pieces?|slices?|cloves?|stalks?|leaves?)$/, '');

  if (clean.endsWith('oes')) clean = clean.slice(0, -2); // tomatoes -> tomato
  else if (clean.endsWith('ies')) clean = clean.slice(0, -3) + 'y'; // berries -> berry
  else if (clean.endsWith('s') && !clean.endsWith('ss')) clean = clean.slice(0, -1); // eggs -> egg

  return clean.trim();
}

export function matchRecipeWithPantry(
  recipe: any,
  pantryItems: PantryItemSnapshot[],
  assumeStaples: boolean = false
): RecipeMatchResult {
  const pantryMap = new Map<string, PantryItemSnapshot>();
  const availableSlugs = new Set<string>();

  for (const p of pantryItems) {
    if (p.totalQuantity > 0) {
      const normSlug = normalizeIngredientName(p.slug);
      const normName = normalizeIngredientName(p.name);
      pantryMap.set(normSlug, p);
      pantryMap.set(normName, p);
      availableSlugs.add(normSlug);
      availableSlugs.add(normName);
    }
  }

  const recipeIngredients = recipe.ingredients || [];
  let coreCount = 0;
  let ownedCount = 0;
  let fullQtyCount = 0;
  let urgencyScore = 0;
  const rescuedIngredients: { name: string; daysLeft: number; status: string }[] = [];
  const ingredientsDetail: MatchedIngredientDetail[] = [];

  let lowestRatio = 1.0;
  let limitingCandidate: { name: string; required: number; available: number; scaleFactor: number } | null = null;

  for (const ing of recipeIngredients) {
    const rawName = ing.name || ing.rawText || '';
    const norm = normalizeIngredientName(rawName);

    // Skip always-available basics (or extended sauces/spices when assumeStaples is active)
    if (PANTRY_STAPLES.has(norm) || (assumeStaples && EXTENDED_KITCHEN_STAPLES.has(norm))) {
      ingredientsDetail.push({
        name: rawName,
        rawText: ing.rawText || rawName,
        requiredAmount: ing.amount || 1,
        requiredUnit: ing.unit || '',
        pantryAmount: 999,
        status: 'available',
      });
      continue;
    }

    coreCount++;
    const inPantry = pantryMap.get(norm);

    if (inPantry && inPantry.totalQuantity > 0) {
      const required = ing.amount || 1;
      const available = inPantry.totalQuantity;

      // Track limiting ingredient ratio for dynamic portion scaling
      if (available < required) {
        const ratio = available / required;
        if (ratio < lowestRatio && ratio > 0) {
          lowestRatio = ratio;
          limitingCandidate = {
            name: inPantry.name,
            required,
            available,
            scaleFactor: Math.round(ratio * 100) / 100,
          };
        }
      } else {
        fullQtyCount++;
      }

      // Calculate freshness urgency points
      if (inPantry.freshnessStatus === 'critical') {
        urgencyScore += 50;
        rescuedIngredients.push({
          name: inPantry.name,
          daysLeft: inPantry.soonestDaysLeft,
          status: 'critical',
        });
      } else if (inPantry.freshnessStatus === 'use_soon') {
        urgencyScore += 25;
        rescuedIngredients.push({
          name: inPantry.name,
          daysLeft: inPantry.soonestDaysLeft,
          status: 'use_soon',
        });
      }

      ownedCount++;
      ingredientsDetail.push({
        name: rawName,
        rawText: ing.rawText || rawName,
        requiredAmount: required,
        requiredUnit: ing.unit || inPantry.unit,
        pantryAmount: available,
        status: available >= required ? 'available' : 'partial',
        freshness: inPantry.freshnessStatus,
        daysLeft: inPantry.soonestDaysLeft,
      });
    } else {
      // Check culinary substitution engine
      const sub = findSubstitutionsForMissing(norm, availableSlugs);

      if (sub) {
        ingredientsDetail.push({
          name: rawName,
          rawText: ing.rawText || rawName,
          requiredAmount: ing.amount || 1,
          requiredUnit: ing.unit || '',
          pantryAmount: 0,
          status: 'substituted',
          substitution: sub,
        });
      } else {
        ingredientsDetail.push({
          name: rawName,
          rawText: ing.rawText || rawName,
          requiredAmount: ing.amount || 1,
          requiredUnit: ing.unit || '',
          pantryAmount: 0,
          status: 'missing',
        });
      }
    }
  }

  const matchPercentage = coreCount === 0 ? 100 : Math.round((ownedCount / coreCount) * 100);
  const substitutedCount = ingredientsDetail.filter((i) => i.status === 'substituted').length;
  const isCookableNow = fullQtyCount === coreCount;
  const isCookableScaled = ownedCount === coreCount && fullQtyCount < coreCount;
  const isCookableWithSubstitutes = !isCookableNow && !isCookableScaled && (ownedCount + substitutedCount) === coreCount;
  const missingCount = coreCount - ownedCount - substitutedCount;

  // Formula: Availability + Urgency Multiplier
  const rankingScore = matchPercentage * 1.0 + urgencyScore * 1.5;

  return {
    recipe,
    matchPercentage,
    isCookableNow,
    isCookableScaled,
    isCookableWithSubstitutes,
    urgencyScore,
    rankingScore,
    rescuedIngredients,
    missingCount,
    ingredientsDetail,
    limitingIngredient: limitingCandidate,
  };
}

// Proportionally scale all ingredients and servings in a recipe
export function scaleRecipeAmounts(recipe: any, factor: number) {
  return {
    ...recipe,
    servings: Math.max(1, Math.round((recipe.servings || 2) * factor)),
    ingredients: (recipe.ingredients || []).map((ing: any) => ({
      ...ing,
      amount: Math.round(ing.amount * factor * 10) / 10,
    })),
  };
}
