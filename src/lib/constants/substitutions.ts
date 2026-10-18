export interface SubstitutionOption {
  substituteItems: { name: string; slug: string; amountRatio: number }[];
  note: string;
  impact: 'seamless' | 'minor_difference';
}

export const CULINARY_SUBSTITUTIONS: Record<string, SubstitutionOption[]> = {
  'heavy cream': [
    {
      substituteItems: [
        { name: 'Milk', slug: 'milk', amountRatio: 0.75 },
        { name: 'Butter', slug: 'butter', amountRatio: 0.25 },
      ],
      note: 'Melt butter into warm milk for an equivalent rich cream.',
      impact: 'seamless',
    },
    {
      substituteItems: [{ name: 'Greek Yogurt', slug: 'yogurt', amountRatio: 1 }],
      note: 'Works great in creamy soups and savory pan sauces.',
      impact: 'minor_difference',
    },
  ],
  'sour cream': [
    {
      substituteItems: [{ name: 'Greek Yogurt', slug: 'yogurt', amountRatio: 1 }],
      note: 'Nearly identical tangy flavor and thick texture.',
      impact: 'seamless',
    },
  ],
  'butter': [
    {
      substituteItems: [{ name: 'Olive Oil', slug: 'olive_oil', amountRatio: 0.75 }],
      note: 'Use 3/4 amount of olive oil in cooking and sauteing.',
      impact: 'minor_difference',
    },
  ],
  'lemon': [
    {
      substituteItems: [{ name: 'Vinegar', slug: 'vinegar', amountRatio: 0.5 }],
      note: 'Use half the amount of white or apple cider vinegar for acidity.',
      impact: 'seamless',
    },
  ],
  'breadcrumbs': [
    {
      substituteItems: [{ name: 'Flour', slug: 'flour', amountRatio: 0.8 }],
      note: 'Seasoned flour or crushed crackers provide great coating.',
      impact: 'minor_difference',
    },
  ],
  'garlic': [
    {
      substituteItems: [{ name: 'Onion', slug: 'onion', amountRatio: 0.5 }],
      note: 'Finely minced onion sauteed provides great aromatic base.',
      impact: 'minor_difference',
    },
  ],
  'soy sauce': [
    {
      substituteItems: [
        { name: 'Salt', slug: 'salt', amountRatio: 0.25 },
        { name: 'Water', slug: 'water', amountRatio: 1 },
      ],
      note: 'Use a pinch of salt plus broth or water for basic seasoning.',
      impact: 'minor_difference',
    },
  ],
};

// Check if an ingredient has viable substitutions based on what's currently in pantry
export function findSubstitutionsForMissing(
  missingIngredientName: string,
  availablePantrySlugs: Set<string>
): SubstitutionOption | null {
  const normalized = missingIngredientName.toLowerCase().trim();
  const options = CULINARY_SUBSTITUTIONS[normalized];
  if (!options) return null;

  for (const option of options) {
    const hasAllSubs = option.substituteItems.every((sub) =>
      availablePantrySlugs.has(sub.slug.toLowerCase())
    );
    if (hasAllSubs) {
      return option;
    }
  }
  return null;
}
