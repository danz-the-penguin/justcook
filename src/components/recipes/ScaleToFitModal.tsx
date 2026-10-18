'use client';

import React, { useState, useEffect } from 'react';
import { RecipeMatchResult, scaleRecipeAmounts } from '@/lib/matcher';
import { X, Sparkles, Scale, Check, Users } from 'lucide-react';
import { sound } from '@/lib/audio';

interface ScaleToFitModalProps {
  matchResult: RecipeMatchResult | null;
  onClose: () => void;
  onCookScaled: (scaledRecipe: any) => void;
}

export function ScaleToFitModal({ matchResult, onClose, onCookScaled }: ScaleToFitModalProps) {
  const [scaleFactor, setScaleFactor] = useState<number>(
    matchResult?.limitingIngredient ? matchResult.limitingIngredient.scaleFactor : 1.0
  );

  useEffect(() => {
    if (matchResult) {
      setScaleFactor(matchResult.limitingIngredient ? matchResult.limitingIngredient.scaleFactor : 1.0);
    }
  }, [matchResult]);

  if (!matchResult) return null;

  const { recipe, limitingIngredient } = matchResult;
  const baseServings = recipe.servings || 2;

  const scaled = scaleRecipeAmounts(recipe, scaleFactor);

  const handleApplyLimiting = () => {
    if (limitingIngredient) {
      sound.playPop();
      setScaleFactor(limitingIngredient.scaleFactor);
    }
  };

  const handleStepServings = (newServings: number) => {
    if (newServings < 1) return;
    sound.playPop();
    const factor = newServings / baseServings;
    setScaleFactor(Math.round(factor * 100) / 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-2xl p-6 sm:p-7 max-w-lg w-full border border-[#e8e2d8] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-base border border-[#f0d9cf]">
            <Scale className="w-5 h-5 text-[#cc5a35]" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">Scale Recipe to Fit</h3>
            <p className="font-sans text-sm text-[#796f64]">{recipe.title}</p>
          </div>
        </div>

        {/* Limiting Ingredient Smart Recommendation Callout */}
        {limitingIngredient && (
          <div className="mb-5 bg-[#faeee8] border border-[#f0d9cf] rounded-xl p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#8a3319] flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[#cc5a35]" />
                <span>Pantry Limiter Detected</span>
              </p>
              <p className="text-sm text-[#524940] mt-1">
                Recipe calls for <strong className="text-[#201b16]">{limitingIngredient.required}</strong> {limitingIngredient.name}, but you only have <strong className="text-[#201b16]">{limitingIngredient.available}</strong>.
              </p>
            </div>
            <button
              onClick={handleApplyLimiting}
              className="px-3.5 py-2 bg-[#cc5a35] hover:bg-[#b94b28] active:scale-95 text-white text-xs font-medium rounded-xl shadow-xs whitespace-nowrap transition-all"
            >
              Fit to My {limitingIngredient.available} {limitingIngredient.name}
            </button>
          </div>
        )}

        {/* Servings Stepper */}
        <div className="mb-5 bg-white p-4 rounded-xl border border-[#e8e2d8]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#796f64] uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-[#cc5a35]" />
              <span>Target Servings</span>
            </span>
            <span className="text-xs font-medium text-[#8a3319] bg-[#faeee8] border border-[#f0d9cf] px-2.5 py-0.5 rounded-full">
              {Math.round(scaleFactor * 100)}% of original recipe
            </span>
          </div>

          <div className="flex items-center justify-center space-x-5">
            <button
              onClick={() => handleStepServings(scaled.servings - 1)}
              className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all"
            >
              -
            </button>
            <div className="text-center px-5">
              <span className="font-serif text-4xl font-medium text-[#201b16]">{scaled.servings}</span>
              <span className="text-sm block font-sans text-[#796f64]">serving{scaled.servings > 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={() => handleStepServings(scaled.servings + 1)}
              className="w-11 h-11 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Scaled Ingredients Preview */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-[#796f64] uppercase tracking-wider mb-2.5">
            Scaled Ingredient Quantities
          </label>
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {scaled.ingredients.map((ing: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2.5 bg-white rounded-xl text-sm border border-[#e8e2d8]"
              >
                <span className="font-medium text-[#201b16] capitalize">{ing.name}</span>
                <span className="font-medium text-[#8a3319] bg-[#faeee8] border border-[#f0d9cf] px-2.5 py-0.5 rounded-lg">
                  {ing.amount} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#e8e2d8]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-[#796f64] hover:bg-[#f0ebe1] rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onCookScaled(scaled);
              onClose();
            }}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b94b28] text-white text-sm font-medium rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Cook Scaled Recipe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
