'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { RecipeMatchResult } from '@/lib/matcher';
import { resolveFoodAsset } from '@/lib/constants/shelf-life';
import { Clock, Users, Flame, Sparkles, Check, ChevronDown, ChevronUp, Scale, Utensils, ShoppingBag, Trash2, Pencil, Plus } from 'lucide-react';
import { sound } from '@/lib/audio';

interface RecipeMatchCardProps {
  matchResult: RecipeMatchResult;
  onScale: (match: RecipeMatchResult) => void;
  onCookRecipe: (recipe: any) => void;
  onStartCookingMode: (recipe: any) => void;
  onAddMissingToShopping: (missingIngredients: { name: string; amount: number; unit: string }[], recipeTitle: string) => void;
  onEditRecipe?: (recipe: any) => void;
  onDeleteRecipe?: (recipeId: string) => void;
  onQuickStockIngredient?: (ing: { name: string; amount: number; unit: string }) => void;
}

export function RecipeMatchCard({
  matchResult,
  onScale,
  onCookRecipe,
  onStartCookingMode,
  onAddMissingToShopping,
  onEditRecipe,
  onDeleteRecipe,
  onQuickStockIngredient,
}: RecipeMatchCardProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [addedToShop, setAddedToShop] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    recipe,
    matchPercentage,
    isCookableNow,
    isCookableScaled,
    isCookableWithSubstitutes,
    rescuedIngredients,
    ingredientsDetail,
    limitingIngredient,
  } = matchResult;

  const missingList = ingredientsDetail
    .filter((i) => i.status === 'missing')
    .map((i) => ({ name: i.name, amount: i.requiredAmount, unit: i.requiredUnit }));

  const ownedCount = ingredientsDetail.filter((i) => i.status === 'available' || i.status === 'partial').length;

  const handleAddMissing = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playPop();
    onAddMissingToShopping(missingList, recipe.title);
    setAddedToShop(true);
    setTimeout(() => setAddedToShop(false), 2500);
  };

  // Pick up to 5 distinct ingredient sprites for the visual header tray
  const previewSprites = ingredientsDetail.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-7 border border-[#e8e2d8] shadow-[0_2px_10px_-2px_rgba(32,27,22,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(32,27,22,0.08)] transition-all duration-300 flex flex-col justify-between">
      {/* Top Banner / Hero */}
      <div>
        {/* Match Percentage & Action Controls (Edit / Scale / Delete) */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center space-x-2 flex-wrap gap-1.5">
            {isCookableNow ? (
              <span className="bg-[#edf5ee] text-[#2d5930] border border-[#d2e7d3] text-xs sm:text-sm font-sans font-semibold px-3.5 py-1 rounded-full flex items-center space-x-1.5">
                <Check className="w-4 h-4" />
                <span>100% Ready to Cook</span>
              </span>
            ) : isCookableScaled ? (
              <span className="bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf] text-xs sm:text-sm font-sans font-semibold px-3.5 py-1 rounded-full flex items-center space-x-1.5">
                <Scale className="w-4 h-4 text-[#cc5a35]" />
                <span>Ready (Scale to Fit)</span>
              </span>
            ) : isCookableWithSubstitutes ? (
              <span className="bg-[#fef6ee] text-[#a15c07] border border-[#fae4c8] text-xs sm:text-sm font-sans font-semibold px-3.5 py-1 rounded-full flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Cookable with Swap</span>
              </span>
            ) : (
              <span className="bg-[#f5f1ea] text-[#5c5349] text-xs sm:text-sm font-sans font-semibold px-3.5 py-1 rounded-full border border-[#e2dacf]">
                {matchPercentage}% In Stock
              </span>
            )}

            {recipe.source === 'themealdb' && (
              <span className="bg-[#edf2f7] text-[#2b6cb0] border border-[#d3e2ee] text-xs sm:text-sm font-sans font-semibold px-3 py-1 rounded-full">
                TheMealDB
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Edit Recipe Button (works on any recipe) */}
            {onEditRecipe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sound.playWoodTap();
                  onEditRecipe(recipe);
                }}
                className="h-9 px-3 rounded-lg bg-[#faf8f5] hover:bg-[#f0ebe1] border border-[#e8e2d8] text-[#5c5349] hover:text-[#201b16] text-xs sm:text-sm font-sans font-medium flex items-center space-x-1.5 transition-all"
                title="Edit recipe title, ingredients, or steps"
              >
                <Pencil className="w-3.5 h-3.5 text-[#cc5a35]" />
                <span>Edit</span>
              </button>
            )}

            {/* Delete Recipe Button (Inline two-tap confirmation) */}
            {recipe.source !== 'themealdb' && onDeleteRecipe && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 3000);
                    return;
                  }
                  onDeleteRecipe(recipe.id);
                }}
                className={`h-9 rounded-lg flex items-center justify-center transition-all border ${
                  confirmDelete
                    ? 'px-3 bg-[#cc5a35] text-white border-[#b54926] text-xs font-sans font-semibold'
                    : 'w-9 bg-[#faf8f5] border-[#e8e2d8] text-[#9e9488] hover:text-[#b34b29] hover:bg-[#faeee8]'
                }`}
                title={confirmDelete ? 'Tap again to delete recipe' : 'Delete this recipe'}
              >
                {confirmDelete ? <span>Sure?</span> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Visual Dish & Ingredient Sprite Banner */}
        <div className="mb-4 bg-[#faf8f5] border border-[#ece5d8] rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center space-x-2.5 sm:space-x-3 overflow-hidden">
            {recipe.imageUrl && (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#e8e2d8] shrink-0"
              />
            )}
            <div className="flex items-center -space-x-2 overflow-hidden py-0.5 pl-0.5">
              {previewSprites.map((ing, i) => {
                const isOwned = ing.status === 'available' || ing.status === 'partial';
                return (
                  <div
                    key={i}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 border-white shadow-2xs transition-transform hover:scale-110 hover:z-10 ${
                      isOwned ? 'bg-[#edf5ee]' : 'bg-[#f3efe8] opacity-80'
                    }`}
                    title={ing.name}
                  >
                    <Image
                      src={resolveFoodAsset(ing.name)}
                      alt={ing.name}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  </div>
                );
              })}
              {ingredientsDetail.length > 5 && (
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#eae4d8] border-2 border-white flex items-center justify-center text-[10px] sm:text-xs font-sans font-semibold text-[#5c5349]">
                  +{ingredientsDetail.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Match Progress Bar */}
          <div className="w-full sm:w-36 text-right shrink-0">
            <div className="flex items-center justify-between text-xs font-sans text-[#685f54] mb-1">
              <span>Pantry Match</span>
              <span className="font-semibold text-[#201b16]">{ownedCount}/{ingredientsDetail.length}</span>
            </div>
            <div className="w-full h-2 bg-[#eae4d8] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  matchPercentage === 100
                    ? 'bg-[#2d5930]'
                    : matchPercentage >= 50
                    ? 'bg-[#cc5a35]'
                    : 'bg-[#b59e84]'
                }`}
                style={{ width: `${Math.max(6, matchPercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Title & Metadata - Claude Editorial Serif */}
        <h3 className="font-serif text-2xl sm:text-3xl text-[#201b16] font-medium tracking-tight leading-snug mb-2">
          {recipe.title}
        </h3>
        {recipe.description && (
          <p className="font-sans text-base text-[#685f54] line-clamp-2 mb-4 leading-relaxed">
            {recipe.description}
          </p>
        )}

        {/* Rescued Expiry Alert */}
        {rescuedIngredients.length > 0 && (
          <div className="mb-4 bg-[#faeee8] border border-[#f0d9cf] rounded-xl p-3.5 flex items-center space-x-2.5">
            <Flame className="w-4 h-4 text-[#cc5a35] flex-shrink-0" />
            <span className="text-sm font-sans font-medium text-[#9e3a19]">
              Rescues: {rescuedIngredients.map((r) => `${r.name} (${r.daysLeft}d left)`).join(', ')}
            </span>
          </div>
        )}

        {/* Prep & Cook Time Info */}
        <div className="flex items-center space-x-3 text-base font-sans text-[#685f54] mb-4">
          <span className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-[#b34b29]" />
            <span>{(recipe.prepTimeMinutes || 5) + (recipe.cookTimeMinutes || 10)} mins</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1.5">
            <Users className="w-4 h-4 text-[#b34b29]" />
            <span>{recipe.servings || 2} servings</span>
          </span>
        </div>

        {/* Ingredient Breakdown Chips (Interactive: click missing chip to mark owned!) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[#787067]">
              Ingredients ({ownedCount}/{ingredientsDetail.length} owned)
            </span>
            {missingList.length > 0 && onQuickStockIngredient && (
              <span className="text-xs font-sans text-[#8c8276] italic">
                Tap missing item to stock
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {ingredientsDetail.map((ing, idx) => {
              const isOwned = ing.status === 'available';
              const isPartial = ing.status === 'partial';
              const isSub = ing.status === 'substituted';
              const isMissing = !isOwned && !isPartial && !isSub;

              return (
                <button
                  type="button"
                  key={idx}
                  disabled={!isMissing || !onQuickStockIngredient}
                  onClick={() => {
                    if (isMissing && onQuickStockIngredient) {
                      onQuickStockIngredient({
                        name: ing.name,
                        amount: ing.requiredAmount || 1,
                        unit: ing.requiredUnit || 'piece',
                      });
                    }
                  }}
                  className={`text-sm font-sans px-3 py-1.5 rounded-lg flex items-center space-x-1.5 border transition-all ${
                    isOwned
                      ? 'bg-[#edf5ee] text-[#2d5930] border-[#d2e7d3] font-medium default'
                      : isPartial
                      ? 'bg-[#faeee8] text-[#9e3a19] border-[#f0d9cf] font-medium default'
                      : isSub
                      ? 'bg-[#fef6ee] text-[#a15c07] border-[#fae4c8] font-medium default'
                      : 'bg-[#f8f5ef] hover:bg-[#faeee8] text-[#685f54] hover:text-[#9e3a19] border-[#e8e2d8] hover:border-[#f0d9cf] cursor-pointer active:scale-95'
                  }`}
                  title={
                    isSub && ing.substitution
                      ? `Can substitute with: ${ing.substitution.substituteItems.map((s) => s.name).join(' + ')}`
                      : isPartial
                      ? `Have ${ing.pantryAmount}, recipe calls for ${ing.requiredAmount} ${ing.requiredUnit}`
                      : isMissing
                      ? `Click to mark "${ing.name}" as in stock (${ing.requiredAmount} ${ing.requiredUnit})`
                      : ing.rawText
                  }
                >
                  <span className="text-xs opacity-80">{isOwned ? '✓' : isPartial ? '⚖️' : isSub ? '💡' : '+'}</span>
                  <span className="capitalize">{ing.name.replace(/_/g, ' ')}</span>
                  {isPartial && (
                    <span className="font-semibold text-[#9e3a19]">
                      ({ing.pantryAmount}/{ing.requiredAmount})
                    </span>
                  )}
                  {isSub && <span className="font-semibold text-[#a15c07]">(Swap)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Substitutions Available Callout Banner */}
        {ingredientsDetail.some((i) => i.substitution) && (
          <div className="mb-4 bg-[#fef8f0] border border-[#fae4c8] rounded-xl p-3 text-xs text-[#8a520a] space-y-1">
            <div className="font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#cc7a19]" />
              <span>Smart Pantry Substitutions:</span>
            </div>
            {ingredientsDetail
              .filter((i) => i.substitution)
              .map((i, sIdx) => (
                <div key={sIdx} className="text-[11px] leading-relaxed text-[#754407] pl-5">
                  • <strong className="capitalize">{i.name}</strong>: {i.substitution?.note} (Use {i.substitution?.substituteItems.map((s) => s.name).join(' + ')})
                </div>
              ))}
          </div>
        )}

        {/* 1-Tap Add Missing to Shopping List */}
        {missingList.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleAddMissing}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm sm:text-base font-sans font-medium transition-all border ${
                addedToShop
                  ? 'bg-[#edf5ee] border-[#d2e7d3] text-[#2d5930]'
                  : missingList.length === 1
                  ? 'bg-[#faeee8] border-[#f0d9cf] text-[#8a3319] hover:bg-[#f5e3db]'
                  : 'bg-[#fcfbf9] border-[#e8e2d8] text-[#4a4238] hover:bg-[#faeee8] hover:text-[#9e3a19] hover:border-[#f0d9cf]'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {addedToShop
                  ? `✓ Added ${missingList.length === 1 ? missingList[0].name : `${missingList.length} items`} to Shopping List`
                  : missingList.length === 1
                  ? `+ Add 1 Missing (${missingList[0].name}) to Shopping List`
                  : `+ Add ${missingList.length} Missing to Shopping List`}
              </span>
            </button>
          </div>
        )}

        {/* Culinary Substitution Note (if any) */}
        {ingredientsDetail.some((i) => i.status === 'substituted') && (
          <div className="mb-4 bg-[#fef6ee] border border-[#fae4c8] rounded-xl p-3.5 text-sm font-sans">
            {ingredientsDetail
              .filter((i) => i.status === 'substituted' && i.substitution)
              .map((i, idx) => (
                <div key={idx} className="text-[#7a4205]">
                  <strong className="font-medium">💡 Swap:</strong> {i.substitution?.note}
                </div>
              ))}
          </div>
        )}

        {/* Step-by-Step Instructions Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center space-x-1.5 text-base font-serif italic text-[#787067] hover:text-[#201b16] transition-colors"
          >
            <span>{showInstructions ? 'Hide recipe steps' : 'View recipe steps'}</span>
            {showInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showInstructions && (
            <div className="mt-3 p-4 bg-[#fcfbf8] rounded-xl border border-[#e8e2d8] space-y-3 text-sm sm:text-base font-sans text-[#4a4238] max-h-64 overflow-y-auto">
              {(recipe.instructions || []).map((step: string, sIdx: number) => (
                <div key={sIdx} className="flex items-start space-x-3">
                  <span className="w-6 h-6 rounded-full bg-[#f0ebe1] text-[#685f54] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {sIdx + 1}
                  </span>
                  <p className="leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-3.5 sm:pt-4 border-t border-[#f0ebe1] flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button
          onClick={() => onScale(matchResult)}
          className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#e8e2d8] hover:bg-[#fbf9f6] text-xs sm:text-base font-sans font-medium text-[#5c5349] active:scale-95 transition-all"
        >
          <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc5a35]" />
          <span>Scale</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStartCookingMode(recipe)}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#201b16] hover:bg-[#383129] text-[#faf8f5] text-xs sm:text-base font-sans font-medium shadow-xs active:scale-95 transition-all"
            title="Open Hands-Free Cooking Mode"
          >
            <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e69374]" />
            <span>Cook Steps</span>
          </button>

          <button
            onClick={() => onCookRecipe(recipe)}
            className={`p-2 sm:p-2.5 rounded-xl text-base font-medium shadow-xs active:scale-95 transition-all ${
              isCookableNow || isCookableWithSubstitutes
                ? 'bg-[#cc5a35] hover:bg-[#b54926] text-white'
                : 'bg-[#f0ebe1] text-[#9e9488] hover:bg-[#e8e2d8]'
            }`}
            title="Quick Cook & Auto-Deduct"
          >
            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
