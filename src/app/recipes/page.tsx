'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { RecipeMatchCard } from '@/components/recipes/RecipeMatchCard';
import { ScaleToFitModal } from '@/components/recipes/ScaleToFitModal';
import { CookingModeModal } from '@/components/cooking/CookingModeModal';
import { CookDeductionModal } from '@/components/cooking/CookDeductionModal';
import { CreateRecipeModal } from '@/components/recipes/CreateRecipeModal';
import { CulinaryRatioModal } from '@/components/recipes/CulinaryRatioModal';
import { RecipeMatchResult } from '@/lib/matcher';
import { usePantryStore } from '@/stores/usePantryStore';
import { sound } from '@/lib/audio';
import { ChefHat, Sparkles, Flame, Check, Search, Globe, Plus, ArrowLeft, Scale } from 'lucide-react';
import Link from 'next/link';

export default function RecipesPage() {
  const { fetchPantry, fetchShopCount, addNewItemBatch } = usePantryStore();
  const [recipes, setRecipes] = useState<RecipeMatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'cookable' | 'rescue' | 'missing1'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [includeExternal, setIncludeExternal] = useState(false);
  const [assumeStaples, setAssumeStaples] = useState(true);
  const [isStockingStaples, setIsStockingStaples] = useState(false);

  // Modals state
  const [scaleTarget, setScaleTarget] = useState<RecipeMatchResult | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<any | null>(null);
  const [deductionRecipe, setDeductionRecipe] = useState<any | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any | null>(null);
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [cookSuccessMessage, setCookSuccessMessage] = useState<string | null>(null);

  // Sync initial filter from URL query parameter (e.g. /recipes?filter=rescue)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlFilter = params.get('filter');
      if (urlFilter && ['all', 'cookable', 'rescue', 'missing1'].includes(urlFilter)) {
        setActiveFilter(urlFilter as 'all' | 'cookable' | 'rescue' | 'missing1');
      }
    }
  }, []);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadRecipes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set('q', debouncedQuery);
      if (activeFilter !== 'all') params.set('filter', activeFilter);
      if (includeExternal) params.set('external', 'true');
      if (assumeStaples) params.set('staples', 'true');

      const res = await fetch(`/api/recipes?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRecipes(data.recipes);
      }
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, activeFilter, includeExternal, assumeStaples]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleCookRecipe = (recipe: any) => {
    sound.playDing();
    setDeductionRecipe(recipe);
  };

  const handleConfirmDeduction = async (
    deductions: { name: string; amount: number; unit: string }[]
  ) => {
    if (!deductionRecipe) return;
    try {
      const res = await fetch('/api/recipes/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeTitle: deductionRecipe.title,
          ingredients: deductions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPantry(); // Update pantry counts
        loadRecipes(); // Recalculate match percentages
        const rescuedMsg = data.rescuedCount > 0 ? ` Rescued ${data.rescuedCount} expiring item(s)!` : '';
        setCookSuccessMessage(
          `Delicious! Cooked "${deductionRecipe.title}". Deducted ${deductions.length} item(s) from your pantry.${rescuedMsg}`
        );
        setTimeout(() => setCookSuccessMessage(null), 5000);
      }
    } catch (e) {
      console.error('Failed to cook recipe:', e);
    }
  };

  const handleAddMissingToShopping = async (missingIngredients: { name: string; amount: number; unit: string }[], recipeTitle: string) => {
    try {
      await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: missingIngredients.map((m) => ({
            name: m.name,
            amount: m.amount,
            unit: m.unit,
            sourceRecipe: recipeTitle,
          })),
        }),
      });
      await fetchShopCount();
    } catch (e) {
      console.error('Failed to add missing items to shopping list:', e);
    }
  };

  const handleQuickStockIngredient = async (ing: { name: string; amount: number; unit: string }) => {
    sound.playPop();
    const cleanName = ing.name.replace(/_/g, ' ').trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    await addNewItemBatch({
      slug,
      name: cleanName,
      category: 'pantry',
      location: 'pantry',
      quantity: Math.max(1, Number(ing.amount) || 1),
      unit: ing.unit || 'piece',
    });
    await loadRecipes();
  };

  const handleStockKitchenStaples = async () => {
    setIsStockingStaples(true);
    sound.playDing();
    const essentials = [
      { slug: 'light_soy_sauce', name: 'Light Soy Sauce', category: 'pantry', location: 'pantry' as const, quantity: 250, unit: 'ml' },
      { slug: 'dark_soy_sauce', name: 'Dark Soy Sauce', category: 'pantry', location: 'pantry' as const, quantity: 250, unit: 'ml' },
      { slug: 'oyster_sauce', name: 'Oyster Sauce', category: 'pantry', location: 'pantry' as const, quantity: 250, unit: 'ml' },
      { slug: 'olive_oil', name: 'Olive Oil', category: 'pantry', location: 'pantry' as const, quantity: 500, unit: 'ml' },
      { slug: 'white_pepper', name: 'White Pepper', category: 'spices', location: 'pantry' as const, quantity: 50, unit: 'g' },
      { slug: 'garlic', name: 'Garlic', category: 'produce', location: 'pantry' as const, quantity: 8, unit: 'clove' },
      { slug: 'ginger', name: 'Ginger', category: 'produce', location: 'fridge' as const, quantity: 100, unit: 'g' },
    ];
    for (const item of essentials) {
      await addNewItemBatch(item);
    }
    await loadRecipes();
    setIsStockingStaples(false);
    setCookSuccessMessage('Stocked Kitchen Staples (Soy Sauces, Oyster Sauce, Olive Oil, White Pepper, Garlic & Ginger) into your pantry!');
    setTimeout(() => setCookSuccessMessage(null), 5000);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    sound.playPop();
    try {
      const res = await fetch(`/api/recipes?id=${recipeId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadRecipes();
      }
    } catch (e) {
      console.error('Failed to delete recipe:', e);
    }
  };

  const filters = [
    { id: 'all', label: 'All Dishes', icon: <ChefHat className="w-4 h-4" /> },
    { id: 'cookable', label: 'Ready to Cook', icon: <Check className="w-4 h-4" /> },
    { id: 'rescue', label: 'Rescue Specials', icon: <Flame className="w-4 h-4 text-[#cc5a35]" /> },
    { id: 'missing1', label: 'Missing 1 Item', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#201b16] selection:bg-[#faeee8] selection:text-[#9e3a19]">
      <Navbar activePage="recipes" />

      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-10 lg:px-14 py-5 sm:py-8">
        {/* Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-7">
          <div>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#201b16] font-normal tracking-tight">
              Recipe Matcher
            </h1>
            <p className="font-sans text-sm sm:text-lg text-[#787067] mt-1 sm:mt-1.5">
              Ranked by your current stock and ingredients nearing expiration.
            </p>
          </div>

          {/* Action Buttons: Assume Staples + Stock Essentials + TheMealDB + New Recipe */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1 lg:flex-wrap">
            <button
              onClick={() => {
                sound.playPop();
                setAssumeStaples(!assumeStaples);
              }}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans font-medium border transition-all whitespace-nowrap shrink-0 ${
                assumeStaples
                  ? 'bg-[#edf5ee] text-[#2d5930] border-[#d2e7d3]'
                  : 'bg-white text-[#685f54] border-[#e8e2d8] hover:bg-[#f5f1ea]'
              }`}
              title="Automatically assume basic sauces, oils, salt & pepper are in your kitchen"
            >
              <Check className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${assumeStaples ? 'text-[#2d5930]' : 'opacity-40'}`} />
              <span>{assumeStaples ? 'Sauces Assumed' : 'Assume Sauces'}</span>
            </button>

            <button
              onClick={handleStockKitchenStaples}
              disabled={isStockingStaples}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans font-medium bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf] hover:bg-[#f5e3db] transition-all whitespace-nowrap shrink-0"
              title="1-Click add Soy Sauce, Oyster Sauce, Olive Oil, Pepper, Garlic & Ginger to Pantry"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc5a35]" />
              <span>{isStockingStaples ? 'Stocking...' : '+ Stock Staples'}</span>
            </button>

            <button
              onClick={() => setIncludeExternal(!includeExternal)}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans font-medium border transition-all whitespace-nowrap shrink-0 ${
                includeExternal
                  ? 'bg-[#2b6cb0] text-white border-[#2b6cb0]'
                  : 'bg-white text-[#685f54] border-[#e8e2d8] hover:bg-[#f5f1ea]'
              }`}
              title="Include free recipes from TheMealDB"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{includeExternal ? 'TheMealDB On' : '+ TheMealDB'}</span>
            </button>

            <button
              onClick={() => {
                sound.playWoodTap();
                setIsRatioOpen(true);
              }}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans font-medium bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#faeee8] hover:text-[#9e3a19] hover:border-[#f0d9cf] transition-all whitespace-nowrap shrink-0 shadow-2xs cursor-pointer"
              title="Culinary Ratio & Portion Studio (McDonald's steam eggs, rice-to-water, pancake batter, vinaigrette)"
            >
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc5a35]" />
              <span>Ratio Studio</span>
            </button>

            <button
              onClick={() => {
                setEditingRecipe(null);
                setIsCreateOpen(true);
              }}
              className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans font-medium text-xs sm:text-base rounded-xl shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              <span>New Recipe</span>
            </button>
          </div>
        </div>

        {/* Cook Success Toast Alert */}
        {cookSuccessMessage && (
          <div className="mb-5 sm:mb-6 bg-[#edf5ee] border border-[#d2e7d3] text-[#2d5930] rounded-2xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between text-xs sm:text-base">
            <p className="font-sans font-medium">{cookSuccessMessage}</p>
            <button
              onClick={() => setCookSuccessMessage(null)}
              className="text-[#2d5930]/70 hover:text-[#2d5930] font-medium ml-3 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Unified Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-7 pb-4 sm:pb-5 border-b border-[#ece7df]">
          <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
            {filters.map((f) => {
              const isActive = activeFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    sound.playWoodTap();
                    setActiveFilter(f.id as any);
                  }}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#201b16] text-[#faf8f5] font-medium shadow-xs'
                      : 'text-[#685f54] hover:text-[#201b16] hover:bg-[#efeae1]'
                  }`}
                >
                  <span>{f.icon}</span>
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8c8276] absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-[#cc5a35]/20 border-t-[#cc5a35] rounded-full animate-spin mx-auto mb-3.5" />
            <p className="font-serif italic text-lg text-[#796f64]">Matching recipes with your pantry...</p>
          </div>
        )}

        {/* Recipe Grid - Full-Screen 3-Column Responsive Grid */}
        {!isLoading && recipes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {recipes.map((match, idx) => (
              <RecipeMatchCard
                key={match.recipe.id || idx}
                matchResult={match}
                onScale={(m) => setScaleTarget(m)}
                onCookRecipe={handleCookRecipe}
                onStartCookingMode={(rec) => setCookingRecipe(rec)}
                onAddMissingToShopping={handleAddMissingToShopping}
                onEditRecipe={(rec) => {
                  setEditingRecipe(rec);
                  setIsCreateOpen(true);
                }}
                onDeleteRecipe={handleDeleteRecipe}
                onQuickStockIngredient={handleQuickStockIngredient}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recipes.length === 0 && (
          <div className="bg-white/80 rounded-2xl border border-dashed border-[#e8e2d8] p-12 text-center max-w-lg mx-auto my-12">
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">No matching recipes found</h3>
            <p className="font-sans text-base text-[#796f64] mt-2 mb-6">
              Try resetting filters or searching TheMealDB.
            </p>
            <button
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
                setIncludeExternal(true);
              }}
              className="px-6 py-3 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans font-medium text-base rounded-xl shadow-xs transition-all active:scale-95"
            >
              Reset & Search TheMealDB
            </button>
          </div>
        )}
      </main>

      {/* Scale To Fit Modal */}
      <ScaleToFitModal
        matchResult={scaleTarget}
        onClose={() => setScaleTarget(null)}
        onCookScaled={handleCookRecipe}
        onOpenRatioStudio={() => setIsRatioOpen(true)}
      />

      {/* Culinary Golden Ratio Studio Modal */}
      <CulinaryRatioModal
        isOpen={isRatioOpen}
        onClose={() => setIsRatioOpen(false)}
        onCookRecipe={handleCookRecipe}
      />

      {/* Hands-Free Cooking Mode Fullscreen Modal */}
      {cookingRecipe && (
        <CookingModeModal
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
          onFinishCooking={handleCookRecipe}
        />
      )}

      {/* Custom Recipe Creation & Editing Studio Modal */}
      <CreateRecipeModal
        isOpen={isCreateOpen}
        editingRecipe={editingRecipe}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingRecipe(null);
        }}
        onRecipeCreated={loadRecipes}
      />

      {/* Cook Deduction Confirmation Modal */}
      <CookDeductionModal
        recipe={deductionRecipe}
        isOpen={Boolean(deductionRecipe)}
        onClose={() => setDeductionRecipe(null)}
        onConfirmDeduction={handleConfirmDeduction}
      />
    </div>
  );
}
