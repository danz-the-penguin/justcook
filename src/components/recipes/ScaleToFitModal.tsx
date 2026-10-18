'use client';

import React, { useState, useEffect } from 'react';
import { RecipeMatchResult, scaleRecipeAmounts } from '@/lib/matcher';
import { formatQuantityWithCulinaryFraction } from '@/lib/constants/shelf-life';
import { X, Sparkles, Scale, Check, Users, Egg, SlidersHorizontal, ArrowRight } from 'lucide-react';
import { sound } from '@/lib/audio';

interface ScaleToFitModalProps {
  matchResult: RecipeMatchResult | null;
  onClose: () => void;
  onCookScaled: (scaledRecipe: any) => void;
  onOpenRatioStudio?: () => void;
}

export function ScaleToFitModal({
  matchResult,
  onClose,
  onCookScaled,
  onOpenRatioStudio,
}: ScaleToFitModalProps) {
  const [scaleMode, setScaleMode] = useState<'servings' | 'ingredient'>('servings');
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [selectedAnchorIdx, setSelectedAnchorIdx] = useState<number>(0);
  const [customAnchorAmount, setCustomAnchorAmount] = useState<number>(2);

  useEffect(() => {
    if (matchResult) {
      const initialFactor = matchResult.limitingIngredient
        ? matchResult.limitingIngredient.scaleFactor
        : 1.0;
      setScaleFactor(initialFactor);

      // Default anchor ingredient to the first prominent ingredient (e.g. egg, flour, pasta, chicken)
      const ingList = matchResult.recipe.ingredients || [];
      const eggOrMeatIdx = ingList.findIndex((i: any) =>
        ['egg', 'chicken', 'pasta', 'rice', 'flour', 'beef'].some((k) =>
          (i.name || '').toLowerCase().includes(k)
        )
      );
      const chosenIdx = eggOrMeatIdx >= 0 ? eggOrMeatIdx : 0;
      setSelectedAnchorIdx(chosenIdx);

      const baseAmount = ingList[chosenIdx]?.amount || 1;
      setCustomAnchorAmount(Math.round(baseAmount * initialFactor * 10) / 10);
    }
  }, [matchResult]);

  if (!matchResult) return null;

  const { recipe, limitingIngredient } = matchResult;
  const baseServings = recipe.servings || 2;
  const ingredientsList = recipe.ingredients || [];
  const currentAnchor = ingredientsList[selectedAnchorIdx] || ingredientsList[0];

  const scaled = scaleRecipeAmounts(recipe, scaleFactor);

  const handleApplyLimiting = () => {
    if (limitingIngredient) {
      sound.playPop();
      setScaleFactor(limitingIngredient.scaleFactor);
      if (currentAnchor) {
        setCustomAnchorAmount(
          Math.round(currentAnchor.amount * limitingIngredient.scaleFactor * 10) / 10
        );
      }
    }
  };

  const handleStepServings = (newServings: number) => {
    if (newServings < 1) return;
    sound.playPop();
    const factor = newServings / baseServings;
    setScaleFactor(Math.round(factor * 100) / 100);
    if (currentAnchor) {
      setCustomAnchorAmount(Math.round(currentAnchor.amount * factor * 10) / 10);
    }
  };

  const handleSelectAnchor = (idx: number) => {
    sound.playWoodTap();
    setSelectedAnchorIdx(idx);
    const ing = ingredientsList[idx];
    if (ing) {
      setCustomAnchorAmount(Math.round(ing.amount * scaleFactor * 10) / 10);
    }
  };

  const handleUpdateAnchorAmount = (newAmount: number) => {
    if (newAmount <= 0) return;
    sound.playPop();
    setCustomAnchorAmount(newAmount);
    const base = currentAnchor?.amount || 1;
    const factor = Math.max(0.1, newAmount / base);
    setScaleFactor(Math.round(factor * 100) / 100);
  };

  // Nice culinary measurement formatter (e.g. 75 ml -> 75 ml (5 tbsp))
  const formatCulinaryAmount = (amount: number, unit: string) => {
    const frac = formatQuantityWithCulinaryFraction(amount);
    const cleanUnit = (unit || '').toLowerCase().trim();

    if (cleanUnit === 'ml') {
      if (amount % 15 === 0 && amount <= 90) {
        return `${amount} ml (${amount / 15} tbsp)`;
      }
      if (amount === 240) return `${amount} ml (1 cup)`;
      if (amount === 120) return `${amount} ml (½ cup)`;
    }
    if (cleanUnit === 'g' && amount >= 14 && amount <= 60 && amount % 14 === 0) {
      return `${amount}g (~${Math.round(amount / 14)} tbsp)`;
    }

    return `${frac.display} ${unit}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/35 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-[#e8e2d8] shadow-2xl relative max-h-[94vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all cursor-pointer shadow-xs z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 pb-4 border-b border-[#e8e2d8] shrink-0 pr-8">
          <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-base border border-[#f0d9cf] shrink-0">
            <Scale className="w-5 h-5 text-[#cc5a35]" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">Scale Recipe to Fit</h3>
            <p className="font-sans text-xs sm:text-sm text-[#796f64]">{recipe.title}</p>
          </div>
        </div>

        {/* Limiting Ingredient Smart Recommendation Callout */}
        {limitingIngredient && (
          <div className="mt-3 bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-3.5 flex items-start justify-between gap-3 shrink-0">
            <div>
              <p className="text-xs font-semibold text-[#8a3319] flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#cc5a35]" />
                <span>Pantry Limiter Detected</span>
              </p>
              <p className="text-xs text-[#524940] mt-0.5">
                Recipe needs <strong className="text-[#201b16]">{limitingIngredient.required}</strong> {limitingIngredient.name}, but you only have <strong className="text-[#201b16]">{limitingIngredient.available}</strong>.
              </p>
            </div>
            <button
              onClick={handleApplyLimiting}
              className="px-3 py-1.5 bg-[#cc5a35] hover:bg-[#b94b28] active:scale-95 text-white text-xs font-medium rounded-xl shadow-xs whitespace-nowrap transition-all cursor-pointer"
            >
              Fit to {limitingIngredient.available}
            </button>
          </div>
        )}

        {/* Mode Selector Tabs: By Servings vs By Anchor Ingredient */}
        <div className="flex items-center space-x-1 bg-[#ede7dc] p-1 rounded-xl mt-3 shrink-0">
          <button
            onClick={() => {
              sound.playWoodTap();
              setScaleMode('servings');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              scaleMode === 'servings'
                ? 'bg-white text-[#201b16] shadow-xs'
                : 'text-[#685f54] hover:text-[#201b16]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>By Servings</span>
          </button>
          <button
            onClick={() => {
              sound.playWoodTap();
              setScaleMode('ingredient');
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              scaleMode === 'ingredient'
                ? 'bg-white text-[#cc5a35] shadow-xs font-semibold'
                : 'text-[#685f54] hover:text-[#201b16]'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-[#cc5a35]" />
            <span>By Anchor Ingredient (e.g. Eggs)</span>
          </button>
        </div>

        {/* Scrollable Center Body */}
        <div className="overflow-y-auto flex-1 py-3.5 space-y-4 pr-1">
          {/* ========================================================================= */}
          {/* MODE 1: SCALE BY SERVINGS                                                 */}
          {/* ========================================================================= */}
          {scaleMode === 'servings' && (
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d8] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#796f64] uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-[#cc5a35]" />
                  <span>Target Servings</span>
                </span>
                <span className="text-xs font-medium text-[#8a3319] bg-[#faeee8] border border-[#f0d9cf] px-2.5 py-0.5 rounded-full">
                  {Math.round(scaleFactor * 100)}% of original recipe
                </span>
              </div>

              <div className="flex items-center justify-center space-x-6 py-1">
                <button
                  onClick={() => handleStepServings(scaled.servings - 1)}
                  disabled={scaled.servings <= 1}
                  className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  -
                </button>
                <div className="text-center px-4">
                  <span className="font-serif text-4xl font-medium text-[#201b16]">{scaled.servings}</span>
                  <span className="text-xs block font-sans text-[#796f64]">
                    serving{scaled.servings > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => handleStepServings(scaled.servings + 1)}
                  className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: SCALE BY ANCHOR INGREDIENT RATIO                                  */}
          {/* ========================================================================= */}
          {scaleMode === 'ingredient' && (
            <div className="space-y-3">
              {/* Anchor Selection Chips */}
              <div className="bg-white p-3.5 rounded-2xl border border-[#e8e2d8] space-y-2">
                <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider block">
                  Select Anchor Ingredient:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {ingredientsList.map((ing: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnchor(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer border ${
                        selectedAnchorIdx === idx
                          ? 'bg-[#cc5a35] text-white border-[#cc5a35] shadow-xs'
                          : 'bg-[#faf8f5] text-[#4a4238] border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      <span className="capitalize">{ing.name}</span>{' '}
                      <span className={selectedAnchorIdx === idx ? 'text-white/80' : 'text-[#796f64]'}>
                        ({ing.amount} {ing.unit})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Anchor Quantity Stepper & Direct Ratio Display */}
              {currentAnchor && (
                <div className="bg-white p-4 rounded-2xl border border-[#e8e2d8] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#796f64] uppercase tracking-wider flex items-center space-x-1.5">
                      <Scale className="w-4 h-4 text-[#cc5a35]" />
                      <span>I have this much {currentAnchor.name}:</span>
                    </span>
                    <span className="text-xs font-semibold text-[#8a3319] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
                      {Math.round(scaleFactor * 100)}% ({scaleFactor}x ratio)
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center justify-center space-x-6 py-1">
                    <button
                      onClick={() =>
                        handleUpdateAnchorAmount(
                          Math.max(
                            currentAnchor.unit === 'piece' ? 1 : 0.5,
                            customAnchorAmount - (currentAnchor.unit === 'piece' ? 1 : currentAnchor.amount >= 50 ? 25 : 1)
                          )
                        )
                      }
                      className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      -
                    </button>

                    <div className="text-center px-4">
                      <span className="font-serif text-4xl font-medium text-[#201b16]">
                        {customAnchorAmount}
                      </span>
                      <span className="text-xs block font-sans text-[#796f64] capitalize">
                        {currentAnchor.unit || 'units'}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        handleUpdateAnchorAmount(
                          customAnchorAmount + (currentAnchor.unit === 'piece' ? 1 : currentAnchor.amount >= 50 ? 25 : 1)
                        )
                      }
                      className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick-Pick Amount Buttons (e.g. 1, 2, 3, 4, 5, 6 for discrete items) */}
                  {currentAnchor.unit === 'piece' && (
                    <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t border-[#f0ebe1]">
                      {[1, 2, 3, 4, 5, 6, 8].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => handleUpdateAnchorAmount(qty)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            customAnchorAmount === qty
                              ? 'bg-[#201b16] text-white font-semibold'
                              : 'bg-[#faf8f5] text-[#5c5349] border border-[#e8e2d8] hover:bg-[#ede7dc]'
                          }`}
                        >
                          {qty}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Scaled Ingredients Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                Scaled Proportions ({scaled.servings} Servings)
              </label>
              <span className="text-[11px] text-[#796f64]">All ingredients balanced</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {scaled.ingredients.map((ing: any, idx: number) => {
                const isAnchor = scaleMode === 'ingredient' && idx === selectedAnchorIdx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-sm border transition-all ${
                      isAnchor
                        ? 'bg-[#faeee8] border-[#f0d9cf] font-medium text-[#8a3319]'
                        : 'bg-white border-[#e8e2d8] text-[#201b16]'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {isAnchor && <span className="text-xs">⚖️</span>}
                      <span className="capitalize">{ing.name}</span>
                    </div>
                    <span className="font-semibold text-[#8a3319] bg-white/90 border border-[#e8e2d8] px-2.5 py-0.5 rounded-lg text-xs sm:text-sm">
                      {formatCulinaryAmount(ing.amount, ing.unit)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Golden Ratio Studio Direct Shortcut */}
          {onOpenRatioStudio && (
            <button
              onClick={() => {
                sound.playWoodTap();
                onClose();
                onOpenRatioStudio();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#fdfaf5] border border-[#eee5d8] hover:bg-[#faeee8] hover:border-[#f0d9cf] text-xs text-[#8a3319] transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#cc5a35]" />
                <span className="font-medium">Need standalone ratios (Rice, McDonald&apos;s Eggs, Vinaigrette)?</span>
              </div>
              <span className="flex items-center space-x-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>Ratio Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2.5 pt-3.5 border-t border-[#e8e2d8] shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-[#796f64] hover:bg-[#f0ebe1] rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCookScaled(scaled);
              onClose();
            }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b94b28] text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Cook Scaled Recipe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
