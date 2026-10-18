import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const stats = await prisma.rescuedStat.findMany({
      orderBy: { rescuedAt: 'desc' },
    });

    const totalRescuedCount = stats.length;
    const totalEstimatedSavings = stats.reduce((sum, s) => sum + (s.estimatedValue || 1.5), 0);

    // Compute distinct recipes cooked
    const distinctRecipes = new Set(stats.map((s) => s.recipeTitle).filter(Boolean));

    // Achievements calculation
    const eggCount = stats.filter((s) => s.itemName.toLowerCase().includes('egg')).length;
    const produceCount = stats.filter((s) =>
      ['spinach', 'tomato', 'onion', 'garlic', 'potato', 'carrot', 'pepper'].some((k) =>
        s.itemName.toLowerCase().includes(k)
      )
    ).length;

    const trophies = [
      {
        id: 'first_rescue',
        title: 'Waste Fighter Initiate',
        description: 'Rescue your first ingredient before it expires.',
        icon: '🌱',
        isUnlocked: totalRescuedCount >= 1,
        progress: Math.min(1, totalRescuedCount / 1),
        current: Math.min(1, totalRescuedCount),
        target: 1,
      },
      {
        id: 'egg_saver',
        title: 'Golden Egg Guardian',
        description: 'Rescue 5 or more eggs from spoiling.',
        icon: '🥚',
        isUnlocked: eggCount >= 5,
        progress: Math.min(1, eggCount / 5),
        current: eggCount,
        target: 5,
      },
      {
        id: 'crisper_hero',
        title: 'Crisper Drawer Hero',
        description: 'Rescue 5 fresh produce items before expiry.',
        icon: '🥦',
        isUnlocked: produceCount >= 5,
        progress: Math.min(1, produceCount / 5),
        current: produceCount,
        target: 5,
      },
      {
        id: 'chef_saver',
        title: 'Zero Waste Chef',
        description: 'Cook 3 meals that use expiring ingredients.',
        icon: '🏆',
        isUnlocked: distinctRecipes.size >= 3,
        progress: Math.min(1, distinctRecipes.size / 3),
        current: distinctRecipes.size,
        target: 3,
      },
      {
        id: 'dollar_saver',
        title: 'Frugal Gourmet',
        description: 'Save over $15 by cooking with expiring groceries.',
        icon: '💰',
        isUnlocked: totalEstimatedSavings >= 15,
        progress: Math.min(1, totalEstimatedSavings / 15),
        current: Math.round(totalEstimatedSavings),
        target: 15,
      },
    ];

    return NextResponse.json({
      success: true,
      totalRescuedCount,
      totalEstimatedSavings: Math.round(totalEstimatedSavings * 100) / 100,
      recipesCookedCount: distinctRecipes.size,
      trophies,
      history: stats,
    });
  } catch (error) {
    console.error('Error in GET /api/trophies:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trophies' }, { status: 500 });
  }
}
