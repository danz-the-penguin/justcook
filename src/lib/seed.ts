import { prisma } from './db';
import { calculateExpiryDate } from './constants/shelf-life';

export async function seedDatabase() {
  console.log('Seeding database...');

  // Check if already seeded
  const existingItemsCount = await prisma.pantryItem.count();
  if (existingItemsCount > 0) {
    console.log('Database already has pantry items. Skipping master seed.');
    return;
  }

  // 1. Master Pantry Catalog
  const masterItems = [
    // Dairy & Fridge
    { slug: 'egg', name: 'Egg', category: 'dairy', defaultUnit: 'piece', pngAsset: '/assets/food/egg.png', displayLimit: 12 },
    { slug: 'milk', name: 'Whole Milk', category: 'dairy', defaultUnit: 'ml', pngAsset: '/assets/food/milk.png', displayLimit: 6 },
    { slug: 'butter', name: 'Butter', category: 'dairy', defaultUnit: 'g', pngAsset: '/assets/food/butter.png', displayLimit: 6 },
    { slug: 'cheese', name: 'Cheddar Cheese', category: 'dairy', defaultUnit: 'g', pngAsset: '/assets/food/cheese.png', displayLimit: 6 },

    // Produce
    { slug: 'tomato', name: 'Tomato', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/tomato.png', displayLimit: 8 },
    { slug: 'spinach', name: 'Baby Spinach', category: 'produce', defaultUnit: 'g', pngAsset: '/assets/food/spinach.png', displayLimit: 6 },
    { slug: 'onion', name: 'Yellow Onion', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/onion.png', displayLimit: 8 },
    { slug: 'garlic', name: 'Garlic', category: 'produce', defaultUnit: 'clove', pngAsset: '/assets/food/garlic.png', displayLimit: 10 },
    { slug: 'potato', name: 'Potato', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/potato.png', displayLimit: 8 },
    { slug: 'carrot', name: 'Carrot', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/carrot.png', displayLimit: 8 },

    // Meat
    { slug: 'chicken', name: 'Chicken Breast', category: 'meat', defaultUnit: 'g', pngAsset: '/assets/food/chicken.png', displayLimit: 6 },

    // Dry Pantry & Grains
    { slug: 'rice', name: 'Jasmine Rice', category: 'pantry', defaultUnit: 'g', pngAsset: '/assets/food/rice.png', displayLimit: 6 },
    { slug: 'pasta', name: 'Penne Pasta', category: 'pantry', defaultUnit: 'g', pngAsset: '/assets/food/pasta.png', displayLimit: 6 },
    { slug: 'yee_mee', name: 'Yee Mee', category: 'pantry', defaultUnit: 'piece', pngAsset: '/assets/food/yeemee.png', displayLimit: 8 },
    { slug: 'flour', name: 'All-Purpose Flour', category: 'pantry', defaultUnit: 'g', pngAsset: '/assets/food/flour.png', displayLimit: 6 },
    { slug: 'bread', name: 'Artisan Bread', category: 'pantry', defaultUnit: 'slice', pngAsset: '/assets/food/bread.png', displayLimit: 8 },

    // Spices & Condiments
    { slug: 'olive_oil', name: 'Extra Virgin Olive Oil', category: 'spices', defaultUnit: 'ml', pngAsset: '/assets/food/olive_oil.png', displayLimit: 4 },
    { slug: 'soy_sauce', name: 'Soy Sauce', category: 'spices', defaultUnit: 'ml', pngAsset: '/assets/food/soy_sauce.png', displayLimit: 4 },
    { slug: 'salt', name: 'Sea Salt', category: 'spices', defaultUnit: 'g', pngAsset: '/assets/food/salt.png', displayLimit: 4 },
    { slug: 'black_pepper', name: 'Black Pepper', category: 'spices', defaultUnit: 'g', pngAsset: '/assets/food/black_pepper.png', displayLimit: 4 },
  ];

  for (const item of masterItems) {
    await prisma.pantryItem.create({ data: item });
  }

  // 2. Create Initial Pantry Stock Batches
  const now = new Date();
  const daysFromNow = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d;
  };

  const initialBatches = [
    // In Fridge: 6 eggs (fresh), 200ml milk (use soon: 2 days left!), 250g butter
    { slug: 'egg', quantity: 6, unit: 'piece', location: 'fridge', obtainedAt: now, expiresAt: daysFromNow(14) },
    { slug: 'milk', quantity: 200, unit: 'ml', location: 'fridge', obtainedAt: daysFromNow(-5), expiresAt: daysFromNow(2), notes: 'Opened 5 days ago' },
    { slug: 'butter', quantity: 250, unit: 'g', location: 'fridge', obtainedAt: now, expiresAt: daysFromNow(25) },
    { slug: 'spinach', quantity: 150, unit: 'g', location: 'fridge', obtainedAt: daysFromNow(-3), expiresAt: daysFromNow(2), notes: 'Crisper drawer' },
    { slug: 'cheese', quantity: 200, unit: 'g', location: 'fridge', obtainedAt: now, expiresAt: daysFromNow(20) },

    // In Dry Pantry
    { slug: 'bread', quantity: 4, unit: 'slice', location: 'pantry', obtainedAt: daysFromNow(-2), expiresAt: daysFromNow(3) },
    { slug: 'pasta', quantity: 500, unit: 'g', location: 'pantry', obtainedAt: now, expiresAt: daysFromNow(300) },
    { slug: 'rice', quantity: 1000, unit: 'g', location: 'pantry', obtainedAt: now, expiresAt: daysFromNow(365) },
    { slug: 'flour', quantity: 500, unit: 'g', location: 'pantry', obtainedAt: now, expiresAt: daysFromNow(240) },

    // In Counter / Spice Rack
    { slug: 'tomato', quantity: 4, unit: 'piece', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(4) },
    { slug: 'garlic', quantity: 6, unit: 'clove', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(45) },
    { slug: 'onion', quantity: 2, unit: 'piece', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(20) },
    { slug: 'olive_oil', quantity: 500, unit: 'ml', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(365) },
    { slug: 'soy_sauce', quantity: 250, unit: 'ml', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(365) },
    { slug: 'salt', quantity: 200, unit: 'g', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(730) },
    { slug: 'black_pepper', quantity: 50, unit: 'g', location: 'counter', obtainedAt: now, expiresAt: daysFromNow(365) },

    // In Freezer
    { slug: 'chicken', quantity: 400, unit: 'g', location: 'freezer', obtainedAt: now, expiresAt: daysFromNow(120) },
  ];

  for (const batch of initialBatches) {
    const item = await prisma.pantryItem.findUnique({ where: { slug: batch.slug } });
    if (item) {
      await prisma.pantryItemBatch.create({
        data: {
          pantryItemId: item.id,
          quantity: batch.quantity,
          unit: batch.unit,
          location: batch.location,
          obtainedAt: batch.obtainedAt,
          expiresAt: batch.expiresAt,
          notes: batch.notes,
        },
      });
    }
  }

  // 3. Seed Starter Recipes
  const recipes = [
    {
      title: 'Golden Scrambled Eggs on Toast',
      description: 'Velvety, soft-curd scrambled eggs served on warm golden toasted artisan bread.',
      source: 'seeded',
      prepTimeMinutes: 5,
      cookTimeMinutes: 5,
      servings: 1,
      tags: 'Breakfast,Quick,High-Protein,Vegetarian',
      instructions: JSON.stringify([
        'Crack 2 eggs into a bowl, season with a pinch of salt and pepper, and whisk gently with a fork.',
        'Melt 15g butter in a small non-stick skillet over low heat until gently foaming.',
        'Pour in the eggs. Using a silicone spatula, slowly sweep the curds across the pan for 2–3 minutes until soft and creamy.',
        'Toast 2 slices of bread until golden brown. Spoon eggs over toast and serve immediately.',
      ]),
      ingredients: [
        { name: 'egg', rawText: '2 large eggs', amount: 2, unit: 'piece', category: 'dairy' },
        { name: 'butter', rawText: '15g butter', amount: 15, unit: 'g', category: 'dairy' },
        { name: 'bread', rawText: '2 slices artisan bread', amount: 2, unit: 'slice', category: 'pantry' },
        { name: 'salt', rawText: 'Pinch of sea salt', amount: 1, unit: 'g', category: 'spices' },
        { name: 'black_pepper', rawText: 'Fresh cracked black pepper', amount: 1, unit: 'g', category: 'spices' },
      ],
    },
    {
      title: "McDonald's Style Fluffy Scrambled Eggs",
      description: 'The iconic soft, velvety folded eggs using the fast-food steam pocket ratio: 1 tbsp water or milk per egg.',
      source: 'seeded',
      prepTimeMinutes: 2,
      cookTimeMinutes: 3,
      servings: 1,
      tags: 'Breakfast,Quick,High-Protein,Golden Ratio',
      instructions: JSON.stringify([
        "The Steam Ratio: McDonald's adds 1 tbsp (15ml) water or milk per egg. The liquid turns into steam pockets in the pan, expanding curds into signature velvety soft folds.",
        'Crack 2 large eggs into a bowl. Add 30ml (2 tbsp) cold water or whole milk, plus a pinch of sea salt.',
        'Whisk vigorously for 30–45 seconds until the mixture is uniform and aerated with tiny bubbles.',
        'Melt 15g butter in a small non-stick pan over medium-low heat until frothy and coating the base.',
        'Pour in the egg mixture. Wait 10–15 seconds until the bottom layer begins to set.',
        'Using a silicone spatula, sweep broad folds from the outer rim into the center, letting raw egg flow into the hot spots.',
        'Remove from heat while the eggs are still glossy and slightly wet—residual pan heat will finish them to perfection.',
      ]),
      ingredients: [
        { name: 'egg', rawText: '2 large eggs', amount: 2, unit: 'piece', category: 'dairy' },
        { name: 'water', rawText: '30ml water (or whole milk)', amount: 30, unit: 'ml', category: 'dairy' },
        { name: 'butter', rawText: '15g unsalted butter', amount: 15, unit: 'g', category: 'dairy' },
        { name: 'salt', rawText: '1g sea salt', amount: 1, unit: 'g', category: 'spices' },
        { name: 'black_pepper', rawText: '0.5g fresh ground black pepper', amount: 0.5, unit: 'g', category: 'spices' },
      ],
    },
    {
      title: 'Classic Fluffy Diner Pancakes',
      description: 'Golden, fluffy breakfast pancakes made with standard pantry staples.',
      source: 'seeded',
      prepTimeMinutes: 10,
      cookTimeMinutes: 10,
      servings: 2,
      tags: 'Breakfast,Sweet,Comfort Food,Vegetarian',
      instructions: JSON.stringify([
        'Whisk together 150g flour, a pinch of salt, and a splash of milk in a mixing bowl.',
        'Whisk in 1 egg and 25g melted butter until batter is smooth with small lumps remaining.',
        'Heat a skillet over medium heat and lightly butter the surface.',
        'Pour 1/4 cup batter for each pancake. Cook until bubbles pop on top (about 2 minutes), then flip and cook 1-2 minutes until golden.',
      ]),
      ingredients: [
        { name: 'flour', rawText: '150g all-purpose flour', amount: 150, unit: 'g', category: 'pantry' },
        { name: 'milk', rawText: '180ml whole milk', amount: 180, unit: 'ml', category: 'dairy' },
        { name: 'egg', rawText: '1 large egg', amount: 1, unit: 'piece', category: 'dairy' },
        { name: 'butter', rawText: '25g butter, melted', amount: 25, unit: 'g', category: 'dairy' },
      ],
    },
    {
      title: 'Garlic Butter Pasta with Wilted Spinach',
      description: 'Quick 15-minute weeknight pasta tossed in aromatic garlic, rich butter, fresh spinach, and cheese.',
      source: 'seeded',
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      servings: 2,
      tags: 'Dinner,Quick,Vegetarian,Comfort Food',
      instructions: JSON.stringify([
        'Boil pasta in well-salted water according to package directions (around 8–10 minutes). Reserve 1/4 cup pasta water.',
        'In a large pan, melt 30g butter with 1 tbsp olive oil over medium-low heat. Add 3 cloves minced garlic and sizzle until fragrant (1 minute).',
        'Add 100g fresh spinach and toss until just wilted (about 60 seconds).',
        'Add drained pasta and reserved pasta water into the skillet. Toss vigorously to create a silky sauce.',
        'Top with grated cheddar cheese and black pepper before serving.',
      ]),
      ingredients: [
        { name: 'pasta', rawText: '200g penne pasta', amount: 200, unit: 'g', category: 'pantry' },
        { name: 'garlic', rawText: '3 cloves garlic, minced', amount: 3, unit: 'clove', category: 'produce' },
        { name: 'butter', rawText: '30g butter', amount: 30, unit: 'g', category: 'dairy' },
        { name: 'spinach', rawText: '100g fresh spinach', amount: 100, unit: 'g', category: 'produce' },
        { name: 'cheese', rawText: '40g grated cheese', amount: 40, unit: 'g', category: 'dairy' },
        { name: 'olive_oil', rawText: '15ml olive oil', amount: 15, unit: 'ml', category: 'spices' },
      ],
    },
    {
      title: 'Rustic Skillet Shakshuka',
      description: 'Eggs gently poached in a rich spiced simmer of ripe tomatoes, onions, and garlic.',
      source: 'seeded',
      prepTimeMinutes: 10,
      cookTimeMinutes: 15,
      servings: 2,
      tags: 'Breakfast,Lunch,One-Pan,Vegetarian',
      instructions: JSON.stringify([
        'Heat 2 tbsp olive oil in a skillet. Saute chopped onion and minced garlic until translucent and sweet (5 minutes).',
        'Add diced ripe tomatoes, salt, and black pepper. Simmer over medium heat for 8 minutes until a thick sauce forms.',
        'Use a spoon to create 3 wells in the sauce. Crack an egg into each well.',
        'Cover with a lid and cook on low heat for 5–7 minutes until egg whites are set but yolks remain runny.',
        'Serve hot straight from the skillet with warm crusty bread.',
      ]),
      ingredients: [
        { name: 'egg', rawText: '3 large eggs', amount: 3, unit: 'piece', category: 'dairy' },
        { name: 'tomato', rawText: '3 ripe tomatoes, diced', amount: 3, unit: 'piece', category: 'produce' },
        { name: 'onion', rawText: '1 medium yellow onion, diced', amount: 1, unit: 'piece', category: 'produce' },
        { name: 'garlic', rawText: '2 cloves garlic, sliced', amount: 2, unit: 'clove', category: 'produce' },
        { name: 'olive_oil', rawText: '20ml olive oil', amount: 20, unit: 'ml', category: 'spices' },
        { name: 'bread', rawText: '2 slices bread for dipping', amount: 2, unit: 'slice', category: 'pantry' },
      ],
    },
    {
      title: 'Savory Egg Fried Rice',
      description: 'The ultimate pantry clean-out comfort food: fragrant garlic, scrambled eggs, and golden rice.',
      source: 'seeded',
      prepTimeMinutes: 5,
      cookTimeMinutes: 8,
      servings: 2,
      tags: 'Dinner,Quick,Asian,Budget-Friendly',
      instructions: JSON.stringify([
        'In a hot wok or skillet, heat 1 tbsp oil. Pour in 2 beaten eggs and scramble quickly for 45 seconds until soft. Remove to a plate.',
        'Add remaining oil to the pan. Sizzle 2 cloves minced garlic and diced onion for 1 minute until fragrant.',
        'Add cold cooked rice, breaking up clumps with a wooden spoon over high heat for 3 minutes.',
        'Drizzle 2 tbsp soy sauce around the rim of the pan and toss evenly into the rice.',
        'Fold the scrambled eggs back in, season with black pepper, and serve piping hot.',
      ]),
      ingredients: [
        { name: 'rice', rawText: '300g cooked jasmine rice', amount: 300, unit: 'g', category: 'pantry' },
        { name: 'egg', rawText: '2 large eggs, beaten', amount: 2, unit: 'piece', category: 'dairy' },
        { name: 'garlic', rawText: '2 cloves garlic, minced', amount: 2, unit: 'clove', category: 'produce' },
        { name: 'onion', rawText: '0.5 onion, finely diced', amount: 0.5, unit: 'piece', category: 'produce' },
        { name: 'soy_sauce', rawText: '25ml soy sauce', amount: 25, unit: 'ml', category: 'spices' },
        { name: 'olive_oil', rawText: '15ml cooking oil', amount: 15, unit: 'ml', category: 'spices' },
      ],
    },
  ];

  for (const r of recipes) {
    const { ingredients, ...recipeData } = r;
    const createdRecipe = await prisma.recipe.create({ data: recipeData });

    for (const ing of ingredients) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: createdRecipe.id,
          name: ing.name,
          rawText: ing.rawText,
          amount: ing.amount,
          unit: ing.unit,
          category: ing.category,
        },
      });
    }
  }

  // 4. Seed Rescued Stat Trophy Data
  await prisma.rescuedStat.createMany({
    data: [
      { itemName: 'Baby Spinach', quantity: 100, unit: 'g', recipeTitle: 'Garlic Butter Pasta with Wilted Spinach', savedDaysBeforeExpiry: 1, estimatedValue: 2.25 },
      { itemName: 'Egg', quantity: 2, unit: 'piece', recipeTitle: 'Golden Scrambled Eggs on Toast', savedDaysBeforeExpiry: 2, estimatedValue: 1.00 },
    ],
  });

  console.log('Seeding completed successfully!');
}

// Allow direct CLI execution: node -r ts-node/register or npx tsx src/lib/seed.ts
if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
