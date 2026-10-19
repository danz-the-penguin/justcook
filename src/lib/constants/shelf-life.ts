export type StorageLocation = "fridge" | "freezer" | "pantry" | "counter";

export interface ShelfLifePreset {
  defaultDays: number;
  category: "dairy" | "produce" | "meat" | "pantry" | "spices";
  quickChips: { label: string; days: number }[];
  suggestedLocation: StorageLocation;
}

// Master smart shelf life lookup table (by item slug or category)
export const SHELF_LIFE_PRESETS: Record<
  string,
  Record<StorageLocation, number>
> = {
  egg: { fridge: 21, freezer: 0, pantry: 14, counter: 7 },
  milk: { fridge: 7, freezer: 30, pantry: 0, counter: 0 },
  butter: { fridge: 30, freezer: 180, pantry: 0, counter: 2 },
  cheese: { fridge: 28, freezer: 180, pantry: 0, counter: 0 },
  yogurt: { fridge: 14, freezer: 60, pantry: 0, counter: 0 },
  heavy_cream: { fridge: 10, freezer: 60, pantry: 0, counter: 0 },

  tomato: { fridge: 7, freezer: 60, pantry: 0, counter: 5 },
  spinach: { fridge: 5, freezer: 60, pantry: 0, counter: 1 },
  onion: { fridge: 30, freezer: 90, pantry: 45, counter: 30 },
  garlic: { fridge: 60, freezer: 180, pantry: 90, counter: 60 },
  potato: { fridge: 0, freezer: 90, pantry: 60, counter: 30 },
  carrot: { fridge: 21, freezer: 180, pantry: 0, counter: 7 },
  bell_pepper: { fridge: 10, freezer: 90, pantry: 0, counter: 4 },
  lemon: { fridge: 21, freezer: 90, pantry: 0, counter: 10 },
  mushroom: { fridge: 6, freezer: 60, pantry: 0, counter: 1 },

  chicken: { fridge: 2, freezer: 180, pantry: 0, counter: 0 },
  beef: { fridge: 3, freezer: 180, pantry: 0, counter: 0 },
  bacon: { fridge: 14, freezer: 90, pantry: 0, counter: 0 },

  rice: { fridge: 180, freezer: 365, pantry: 365, counter: 180 },
  pasta: { fridge: 180, freezer: 365, pantry: 365, counter: 180 },
  penne: { fridge: 180, freezer: 365, pantry: 365, counter: 180 },
  flour: { fridge: 180, freezer: 365, pantry: 240, counter: 180 },
  bread: { fridge: 7, freezer: 90, pantry: 5, counter: 4 },
  canned_beans: { fridge: 4, freezer: 90, pantry: 730, counter: 730 },
  canned_tomatoes: { fridge: 5, freezer: 90, pantry: 730, counter: 730 },

  olive_oil: { fridge: 0, freezer: 0, pantry: 365, counter: 180 },
  soy_sauce: { fridge: 365, freezer: 0, pantry: 365, counter: 180 },
  salt: { fridge: 0, freezer: 0, pantry: 1825, counter: 1825 },
  black_pepper: { fridge: 0, freezer: 0, pantry: 730, counter: 730 },
};

// Fallback defaults by category if specific ingredient isn't mapped
export const CATEGORY_DEFAULTS: Record<
  string,
  Record<StorageLocation, number>
> = {
  dairy: { fridge: 10, freezer: 60, pantry: 0, counter: 1 },
  produce: { fridge: 7, freezer: 60, pantry: 7, counter: 4 },
  meat: { fridge: 3, freezer: 180, pantry: 0, counter: 0 },
  pantry: { fridge: 180, freezer: 365, pantry: 365, counter: 180 },
  spices: { fridge: 365, freezer: 365, pantry: 730, counter: 730 },
};

export function getEstimatedExpiryDays(
  slug: string,
  category: string,
  location: StorageLocation,
): number {
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, "_");
  if (SHELF_LIFE_PRESETS[normalizedSlug]?.[location] !== undefined) {
    const days = SHELF_LIFE_PRESETS[normalizedSlug][location];
    return days > 0 ? days : 7;
  }
  const cat = category.toLowerCase();
  if (CATEGORY_DEFAULTS[cat]?.[location] !== undefined) {
    const days = CATEGORY_DEFAULTS[cat][location];
    return days > 0 ? days : 7;
  }
  return 7;
}

export function calculateExpiryDate(
  slug: string,
  category: string,
  location: StorageLocation,
  fromDate: Date = new Date(),
): Date {
  const days = getEstimatedExpiryDays(slug, category, location);
  const target = new Date(fromDate);
  target.setDate(target.getDate() + days);
  return target;
}

export const KNOWN_FOOD_SLUGS = new Set([
  "black_pepper",
  "bread",
  "butter",
  "carrot",
  "cheese",
  "chicken",
  "egg",
  "flour",
  "garlic",
  "milk",
  "olive_oil",
  "onion",
  "pasta",
  "potato",
  "rice",
  "salt",
  "soy_sauce",
  "spinach",
  "tomato",
  "yeemee",
  "yee_mee",
]);

export function registerCustomFoodSlug(slug: string) {
  if (!slug) return;
  const normalized = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
  KNOWN_FOOD_SLUGS.add(normalized);
  const stripped = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
  if (stripped) KNOWN_FOOD_SLUGS.add(stripped);
}

const CATEGORY_FALLBACK_ASSETS: Record<string, string> = {
  dairy: "/assets/food/milk.png",
  meat: "/assets/food/chicken.png",
  pantry: "/assets/food/flour.png",
  spices: "/assets/food/olive_oil.png",
  produce: "/assets/food/tomato.png",
};

export function resolveFoodAsset(
  slug: string,
  category: string = "produce",
): string {
  const normalized = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
  if (
    normalized === "yeemee" ||
    normalized === "yee_mee" ||
    normalized.includes("yeemee") ||
    normalized.includes("yee_mee")
  ) {
    return "/assets/food/yeemee.png";
  }
  if (KNOWN_FOOD_SLUGS.has(normalized)) {
    return `/assets/food/${normalized}.png`;
  }
  // Exact substring match against known slugs
  for (const known of KNOWN_FOOD_SLUGS) {
    if (normalized.includes(known) || known.includes(normalized)) {
      return `/assets/food/${known}.png`;
    }
  }
  // Smart culinary family mappings for custom / Asian / global ingredients
  if (
    /(noodle|ramen|spaghetti|macaroni|udon|vermicelli|fettuccine|penne|fusilli|rigatoni|farfalle|linguine|pasta)/.test(
      normalized,
    )
  ) {
    return "/assets/food/pasta.png";
  }
  if (
    /(sauce|oyster|soy|tamari|vinegar|mirin|ketchup|mayo|mustard|sriracha|paste)/.test(
      normalized,
    )
  ) {
    return "/assets/food/soy_sauce.png";
  }
  if (
    /(pepper|chilli|chili|spice|paprika|cumin|turmeric|cinnamon|curry|seasoning|herb)/.test(
      normalized,
    )
  ) {
    return "/assets/food/black_pepper.png";
  }
  if (/(salt|sugar|msg|bouillon|stock|broth)/.test(normalized)) {
    return "/assets/food/salt.png";
  }
  if (/(oil|sesame|ghee|lard)/.test(normalized)) {
    return "/assets/food/olive_oil.png";
  }
  if (/(ginger|shallot|scallion|leek|chive|spring_onion)/.test(normalized)) {
    return "/assets/food/garlic.png";
  }
  if (
    /(mushroom|shiitake|enoki|cabbage|bok_choy|lettuce|kale|broccoli|celery|cucumber|zucchini|bean|pea|herb|cilantro|parsley|basil)/.test(
      normalized,
    )
  ) {
    return "/assets/food/spinach.png";
  }
  if (
    /(beef|pork|bacon|ham|sausage|fish|salmon|shrimp|prawn|seafood|meat|duck|turkey|lamb|tofu)/.test(
      normalized,
    )
  ) {
    return "/assets/food/chicken.png";
  }
  if (/(cornstarch|starch|oat|grain|quinoa|barley|baking)/.test(normalized)) {
    return "/assets/food/flour.png";
  }
  if (/(cream|yogurt|curd|whey)/.test(normalized)) {
    return "/assets/food/milk.png";
  }
  return (
    CATEGORY_FALLBACK_ASSETS[category.toLowerCase()] ||
    "/assets/food/tomato.png"
  );
}

export const CORE_DEFAULT_FOOD_SLUGS = new Set([
  "egg",
  "milk",
  "butter",
  "cheese",
  "tomato",
  "spinach",
  "garlic",
  "onion",
  "chicken",
  "pasta",
  "rice",
  "bread",
  "avocado",
  "lemon",
  "flour",
  "sugar",
  "olive_oil",
  "salt",
  "pepper",
  "black_pepper",
  "soy_sauce",
]);

export interface CulinaryFraction {
  label: string;
  value: number;
}

export const CULINARY_FRACTIONS: CulinaryFraction[] = [
  { label: "⅛", value: 0.125 },
  { label: "¼", value: 0.25 },
  { label: "⅓", value: 1 / 3 },
  { label: "⅜", value: 0.375 },
  { label: "½", value: 0.5 },
  { label: "⅝", value: 0.625 },
  { label: "⅔", value: 2 / 3 },
  { label: "¾", value: 0.75 },
  { label: "⅞", value: 0.875 },
];

export function snapToCulinaryFraction(qty: number): number {
  if (qty <= 0) return 0;
  const rounded = Math.round(qty * 1000) / 1000;
  const whole = Math.floor(rounded);
  const rem = rounded - whole;

  if (rem < 0.03) return whole;
  if (rem > 0.97) return whole + 1;

  let bestFrac = CULINARY_FRACTIONS[0];
  let minDiff = Math.abs(rem - bestFrac.value);

  for (const frac of CULINARY_FRACTIONS) {
    const diff = Math.abs(rem - frac.value);
    if (diff < minDiff) {
      minDiff = diff;
      bestFrac = frac;
    }
  }

  if (minDiff < 0.04) {
    return Math.round((whole + bestFrac.value) * 1000) / 1000;
  }
  return Math.round(qty * 1000) / 1000;
}

export function formatQuantityWithCulinaryFraction(qty: number): {
  display: string;
  whole: number;
  fractionLabel: string;
  fractionValue: number;
} {
  const snapped = snapToCulinaryFraction(qty);
  const whole = Math.floor(snapped);
  const rem = Math.round((snapped - whole) * 1000) / 1000;

  if (rem < 0.035) {
    return {
      display: whole > 0 ? `${whole}` : "0",
      whole,
      fractionLabel: "",
      fractionValue: 0,
    };
  }

  let matchedFrac = CULINARY_FRACTIONS[0];
  let minDiff = Math.abs(rem - matchedFrac.value);
  for (const f of CULINARY_FRACTIONS) {
    const diff = Math.abs(rem - f.value);
    if (diff < minDiff) {
      minDiff = diff;
      matchedFrac = f;
    }
  }

  if (minDiff < 0.05) {
    const display =
      whole > 0 ? `${whole} ${matchedFrac.label}` : matchedFrac.label;
    return {
      display,
      whole,
      fractionLabel: matchedFrac.label,
      fractionValue: matchedFrac.value,
    };
  }

  const decimalStr = (Math.round(rem * 100) / 100).toString().replace(/^0/, "");
  const display = whole > 0 ? `${whole}${decimalStr}` : `${decimalStr}`;
  return {
    display,
    whole,
    fractionLabel: decimalStr,
    fractionValue: rem,
  };
}

export function isSpiceOrJarItem(
  category?: string,
  unit?: string,
  slug?: string,
): boolean {
  const normCat = (category || "").toLowerCase();
  const normUnit = (unit || "").toLowerCase();
  const normSlug = (slug || "").toLowerCase();

  if (normCat === "spices") return true;
  if (["jar", "bottle", "shaker", "canister", "tin", "can"].includes(normUnit))
    return true;
  if (
    ["g", "gram", "grams", "ml", "pinch", "dash", "tsp", "tbsp"].includes(
      normUnit,
    ) &&
    normCat !== "meat" &&
    normCat !== "produce"
  ) {
    return true;
  }
  if (
    /(pepper|salt|paprika|turmeric|cumin|garlic_powder|cinnamon|oregano|curry|sauce|soy|vinegar|olive_oil|sesame)/i.test(
      normSlug,
    )
  ) {
    return true;
  }
  return false;
}

export interface PastaShapeInfo {
  name: string;
  emoji: string;
  description?: string;
}

export const COMMON_PASTA_SHAPES: PastaShapeInfo[] = [
  { name: 'Spaghetti', emoji: '🍝' },
  { name: 'Penne', emoji: '🥢' },
  { name: 'Fusilli', emoji: '🌀' },
  { name: 'Macaroni', emoji: '🥟' },
  { name: 'Fettuccine', emoji: '🎗️' },
  { name: 'Farfalle', emoji: '🎀' },
  { name: 'Rigatoni', emoji: '🥫' },
  { name: 'Linguine', emoji: '🍜' },
];

export function getPastaShapeEmoji(shape?: string): string {
  if (!shape) return '🍝';
  const match = COMMON_PASTA_SHAPES.find((s) => s.name.toLowerCase() === shape.toLowerCase());
  return match ? match.emoji : '🍝';
}
