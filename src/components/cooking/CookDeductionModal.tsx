'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Check, Utensils, AlertCircle, Sparkles, Minus, Plus } from 'lucide-react';
import { resolveFoodAsset, formatQuantityWithCulinaryFraction, snapToCulinaryFraction } from '@/lib/constants/shelf-life';
import { sound } from '@/lib/audio';

export interface DeductionIngredientItem {
  name: string;
  amount: number;
  unit: string;
  selected: boolean;
}

interface CookDeductionModalProps {
  recipe: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDeduction: (deductions: { name: string; amount: number; unit: string }[]) => Promise<void>;
}

export function CookDeductionModal({
  recipe,
  isOpen,
  onClose,
  onConfirmDeduction,
}: CookDeductionModalProps) {
  const [items, setItems] = useState<DeductionIngredientItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recipe && recipe.ingredients) {
      const initial: DeductionIngredientItem[] = recipe.ingredients.map((ing: any) => ({
        name: ing.name || '',
        amount: Number(ing.amount) || 1,
        unit: ing.unit || 'piece',
        selected: true,
      }));
      setItems(initial);
    }
  }, [recipe]);

  if (!isOpen || !recipe) return null;

  const toggleSelect = (index: number) => {
    sound.playPop();
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, selected: !it.selected } : it))
    );
  };

  const updateAmount = (index: number, delta: number) => {
    sound.playPop();
    setItems((prev) =>
      prev.map((it, idx) => {
        if (idx !== index) return it;
        const newAmt = Math.max(0.125, snapToCulinaryFraction(it.amount + delta));
        return { ...it, amount: newAmt };
      })
    );
  };

  const selectedCount = items.filter((i) => i.selected).length;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    sound.playDing();
    const deductions = items
      .filter((i) => i.selected && i.amount > 0)
      .map((i) => ({
        name: i.name,
        amount: i.amount,
        unit: i.unit,
      }));
    await onConfirmDeduction(deductions);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#e8e2d8] shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="flex items-center space-x-2 text-[#cc5a35] text-xs font-sans font-bold uppercase tracking-wider mb-1">
            <Utensils className="w-4 h-4" />
            <span>Recipe Finished • Pantry Stock Deduction</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16]">
            {recipe.title}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#796f64] mt-1">
            Check the ingredients you used so your visual kitchen shelf stays accurately stocked.
          </p>
        </div>

        {/* Scrollable Ingredients Checklist */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 my-1">
          {items.map((ing, idx) => {
            const assetSrc = resolveFoodAsset(ing.name);
            const isSelected = ing.selected;
            const formatted = formatQuantityWithCulinaryFraction(ing.amount);

            return (
              <div
                key={idx}
                onClick={() => toggleSelect(idx)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#cc5a35]/40 shadow-2xs'
                    : 'bg-[#f4efe8]/60 border-transparent opacity-60'
                }`}
              >
                {/* Left: Checkbox & Food Asset Icon & Name */}
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#cc5a35] border-[#cc5a35] text-white shadow-2xs'
                        : 'border-[#cfc5b4] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-[#faf8f5] border border-[#e8e2d8] flex items-center justify-center shrink-0 p-1">
                    <Image
                      src={assetSrc}
                      alt={ing.name}
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <span className="font-sans font-medium text-sm text-[#201b16] capitalize truncate block">
                      {ing.name}
                    </span>
                    <span className="font-sans text-xs text-[#8c8276]">
                      {formatted.display} {ing.unit}
                    </span>
                  </div>
                </div>

                {/* Right: Stepper Amount Controls */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center space-x-1.5 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => updateAmount(idx, -0.5)}
                    className="w-7 h-7 rounded-lg bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#201b16] border border-[#e8e2d8] flex items-center justify-center transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs font-semibold px-2 py-1 bg-white border border-[#e8e2d8] rounded-lg min-w-[48px] text-center">
                    {formatted.display}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateAmount(idx, 0.5)}
                    className="w-7 h-7 rounded-lg bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#201b16] border border-[#e8e2d8] flex items-center justify-center transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-3 border-t border-[#e8e2d8] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
          >
            Skip / Keep Stock
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || selectedCount === 0}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] disabled:opacity-40 text-white font-sans font-semibold text-xs sm:text-sm rounded-xl shadow-xs active:scale-95 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{isSubmitting ? 'Deducting...' : `Deduct ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
