export interface StarterPreset {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  badge: string;
  items: {
    slug: string;
    name: string;
    category: string;
    defaultUnit: string;
    location: 'fridge' | 'freezer' | 'pantry' | 'counter';
    quantity: number;
    daysLeft: number;
  }[];
}

export const STARTER_PRESETS: StarterPreset[] = [
  {
    id: 'asian-stirfry',
    title: 'Asian Sizzle & Stir-Fry',
    subtitle: 'Yee Mee, eggs, cabbage, aromatics & chili crisp',
    icon: '🍜',
    badge: 'Popular',
    description: 'Perfect for wok-tossed noodles, egg stir-fries, and sizzling hotpot bowls.',
    items: [
      { slug: 'yeemee', name: 'Yee Mee', category: 'pantry', defaultUnit: 'piece', location: 'pantry', quantity: 2, daysLeft: 120 },
      { slug: 'cabbage', name: 'Cabbage', category: 'produce', defaultUnit: 'head', location: 'fridge', quantity: 1, daysLeft: 14 },
      { slug: 'egg', name: 'Egg', category: 'dairy', defaultUnit: 'piece', location: 'fridge', quantity: 6, daysLeft: 21 },
      { slug: 'garlic', name: 'Garlic', category: 'pantry', defaultUnit: 'clove', location: 'pantry', quantity: 6, daysLeft: 30 },
      { slug: 'chili-crisp', name: 'Chili Crisp', category: 'spices', defaultUnit: 'jar', location: 'pantry', quantity: 1, daysLeft: 180 },
      { slug: 'soy-sauce', name: 'Soy Sauce', category: 'spices', defaultUnit: 'ml', location: 'pantry', quantity: 150, daysLeft: 365 },
      { slug: 'sesame-oil', name: 'Sesame Oil', category: 'spices', defaultUnit: 'ml', location: 'pantry', quantity: 100, daysLeft: 300 },
      { slug: 'chicken', name: 'Chicken Breast', category: 'meat', defaultUnit: 'g', location: 'fridge', quantity: 300, daysLeft: 3 },
    ],
  },
  {
    id: 'italian-pasta',
    title: 'Italian Trattoria & Pasta',
    subtitle: 'Spaghetti, tomatoes, extra virgin olive oil, herbs & garlic',
    icon: '🍝',
    badge: 'Classic',
    description: 'Everything you need for silky Aglio e Olio, rich Pomodoro, and rustic pasta nights.',
    items: [
      { slug: 'pasta', name: 'Spaghetti', category: 'pantry', defaultUnit: 'g', location: 'pantry', quantity: 500, daysLeft: 365 },
      { slug: 'tomato-can', name: 'Canned Tomatoes', category: 'pantry', defaultUnit: 'can', location: 'pantry', quantity: 2, daysLeft: 700 },
      { slug: 'garlic', name: 'Garlic', category: 'pantry', defaultUnit: 'clove', location: 'pantry', quantity: 5, daysLeft: 30 },
      { slug: 'olive-oil', name: 'Extra Virgin Olive Oil', category: 'spices', defaultUnit: 'ml', location: 'pantry', quantity: 250, daysLeft: 365 },
      { slug: 'parmesan', name: 'Parmesan', category: 'dairy', defaultUnit: 'g', location: 'fridge', quantity: 100, daysLeft: 45 },
      { slug: 'onion', name: 'Yellow Onion', category: 'produce', defaultUnit: 'piece', location: 'pantry', quantity: 2, daysLeft: 20 },
      { slug: 'egg', name: 'Egg', category: 'dairy', defaultUnit: 'piece', location: 'fridge', quantity: 4, daysLeft: 21 },
    ],
  },
  {
    id: 'brunch-breakfast',
    title: 'Weekend Brunch & Breakfast',
    subtitle: 'Eggs, milk, butter, toast, avocado & cheddar',
    icon: '🥑',
    badge: 'Fresh',
    description: 'Golden morning scrambles, French toast, avocado sourdough, and cheesy omelets.',
    items: [
      { slug: 'egg', name: 'Egg', category: 'dairy', defaultUnit: 'piece', location: 'fridge', quantity: 8, daysLeft: 21 },
      { slug: 'milk', name: 'Whole Milk', category: 'dairy', defaultUnit: 'ml', location: 'fridge', quantity: 1000, daysLeft: 7 },
      { slug: 'butter', name: 'Unsalted Butter', category: 'dairy', defaultUnit: 'g', location: 'fridge', quantity: 250, daysLeft: 60 },
      { slug: 'bread', name: 'Sourdough Bread', category: 'pantry', defaultUnit: 'loaf', location: 'counter', quantity: 1, daysLeft: 5 },
      { slug: 'avocado', name: 'Avocado', category: 'produce', defaultUnit: 'piece', location: 'counter', quantity: 2, daysLeft: 4 },
      { slug: 'cheddar', name: 'Cheddar Cheese', category: 'dairy', defaultUnit: 'g', location: 'fridge', quantity: 150, daysLeft: 30 },
    ],
  },
  {
    id: 'clean-slate',
    title: 'Clean Slate (Empty Cupboards)',
    subtitle: 'Start with 0 items and stock completely from scratch',
    icon: '🧼',
    badge: 'Reset',
    description: 'Clears all current stock so you can inventory your real kitchen from zero.',
    items: [],
  },
];
