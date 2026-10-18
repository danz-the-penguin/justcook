'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  ChefHat,
  Sparkles,
  ShoppingBag,
  Utensils,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { usePantryStore } from '@/stores/usePantryStore';

export interface PlannedMeal {
  id: string;
  dayIndex: number; // 0 = Mon, 6 = Sun
  mealType: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  recipeId?: string;
  servings?: number;
}

const DAYS_OF_WEEK = [
  { name: 'Monday', short: 'Mon' },
  { name: 'Tuesday', short: 'Tue' },
  { name: 'Wednesday', short: 'Wed' },
  { name: 'Thursday', short: 'Thu' },
  { name: 'Friday', short: 'Fri' },
  { name: 'Saturday', short: 'Sat' },
  { name: 'Sunday', short: 'Sun' },
];

const MEAL_TYPES: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];

interface MealPlannerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recipes?: any[];
  onCookRecipe?: (recipe: any) => void;
}

export function MealPlannerDrawer({ isOpen, onClose, recipes = [], onCookRecipe }: MealPlannerDrawerProps) {
  const { items: pantryItems, fetchShopCount } = usePantryStore();
  const [plans, setPlans] = useState<PlannedMeal[]>([]);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [isAddingMeal, setIsAddingMeal] = useState<{ dayIdx: number; mealType: 'breakfast' | 'lunch' | 'dinner' } | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('justcook_meal_plans');
        if (raw) setPlans(JSON.parse(raw));
      } catch {}
    }
  }, [isOpen]);

  const savePlans = (updated: PlannedMeal[]) => {
    setPlans(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('justcook_meal_plans', JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAddMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddingMeal) return;

    let title = customTitle.trim();
    if (selectedRecipeId) {
      const found = recipes.find((r) => r.id === selectedRecipeId);
      if (found) title = found.title;
    }

    if (!title) return;

    const newMeal: PlannedMeal = {
      id: `meal-${Date.now()}`,
      dayIndex: isAddingMeal.dayIdx,
      mealType: isAddingMeal.mealType,
      title,
      recipeId: selectedRecipeId || undefined,
      servings: 2,
    };

    const updated = [...plans, newMeal];
    savePlans(updated);
    sound.playDing();
    showToast(`Added "${title}" to ${DAYS_OF_WEEK[isAddingMeal.dayIdx].name}!`);
    setIsAddingMeal(null);
    setCustomTitle('');
    setSelectedRecipeId('');
  };

  const handleDeleteMeal = (id: string) => {
    const updated = plans.filter((p) => p.id !== id);
    savePlans(updated);
    sound.playWoodTap();
  };

  // Add all ingredients for planned recipes to shopping list
  const handleAddWeekToShoppingList = async () => {
    sound.playDing();
    const itemsToAdd: Array<{ name: string; amount: number; unit: string; category: string; sourceRecipe?: string }> = [];
    for (const plan of plans) {
      if (plan.recipeId) {
        const found = recipes.find((r) => r.id === plan.recipeId);
        if (found && Array.isArray(found.ingredients)) {
          for (const ing of found.ingredients) {
            itemsToAdd.push({
              name: ing.name,
              amount: Number(ing.amount) || 1,
              unit: ing.unit || 'piece',
              category: 'produce',
              sourceRecipe: found.title,
            });
          }
        }
      }
    }

    if (itemsToAdd.length > 0) {
      try {
        await fetch('/api/shopping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsToAdd }),
        });
        await fetchShopCount();
        showToast(`Added ${itemsToAdd.length} recipe ingredients to your Grocery Shopping List!`);
      } catch (err) {
        console.error('Failed to sync meal plan ingredients to shopping list:', err);
        showToast('Error syncing items to shopping list.');
      }
    } else {
      showToast('No recipe ingredients found to add.');
    }
  };

  if (!isOpen) return null;

  const currentDayPlans = plans.filter((p) => p.dayIndex === selectedDayIdx);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#faf8f5] h-full shadow-2xl border-l border-[#e8e2d8] flex flex-col justify-between"
      >
        {/* Top Header */}
        <div className="p-4 sm:p-6 border-b border-[#e8e2d8] bg-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-[#cc5a35]" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-medium text-[#201b16]">
                Weekly Meal Planner
              </h2>
              <p className="text-xs text-[#787067] font-sans">
                Organize your kitchen cooking schedule and rescue expiring staples
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#787067] flex items-center justify-center border border-[#e5dec9] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Alert */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-medium flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Day Selector Tabs */}
        <div className="flex border-b border-[#e8e2d8] bg-[#f2ece2] p-1.5 overflow-x-auto no-scrollbar gap-1">
          {DAYS_OF_WEEK.map((day, idx) => {
            const isSelected = selectedDayIdx === idx;
            const dayMealCount = plans.filter((p) => p.dayIndex === idx).length;
            return (
              <button
                key={day.short}
                onClick={() => {
                  sound.playWoodTap();
                  setSelectedDayIdx(idx);
                }}
                className={`flex-1 py-2 px-1 text-center rounded-xl transition-all min-w-[50px] cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#cc5a35] font-semibold shadow-xs border border-[#ded7cb]'
                    : 'text-[#685f54] hover:bg-white/50'
                }`}
              >
                <div className="text-xs font-sans">{day.short}</div>
                {dayMealCount > 0 && (
                  <div className="text-[10px] text-[#cc5a35] font-mono mt-0.5 font-bold">
                    {dayMealCount} meal{dayMealCount > 1 ? 's' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Day Meal Slots */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-lg font-medium text-[#201b16]">
              {DAYS_OF_WEEK[selectedDayIdx].name}&apos;s Menu
            </h3>
            <span className="text-xs text-[#787067] font-sans">
              {currentDayPlans.length} meal{currentDayPlans.length === 1 ? '' : 's'} planned
            </span>
          </div>

          {MEAL_TYPES.map((type) => {
            const mealsOfType = currentDayPlans.filter((p) => p.mealType === type);
            const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

            return (
              <div key={type} className="bg-white rounded-2xl p-4 border border-[#e8e2d8] shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-sans font-semibold uppercase tracking-wider text-[#cc5a35]">
                    {typeLabel}
                  </span>
                  <button
                    onClick={() => {
                      sound.playWoodTap();
                      setIsAddingMeal({ dayIdx: selectedDayIdx, mealType: type });
                      setCustomTitle('');
                      setSelectedRecipeId('');
                    }}
                    className="text-xs text-[#787067] hover:text-[#cc5a35] flex items-center space-x-1 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Plan {typeLabel}</span>
                  </button>
                </div>

                {mealsOfType.length === 0 ? (
                  <p className="text-xs font-serif italic text-[#a39a8e] py-2">
                    No meal planned for {type} yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {mealsOfType.map((meal) => {
                      const recipeMatch = recipes.find((r) => r.id === meal.recipeId);
                      return (
                        <div
                          key={meal.id}
                          className="flex items-center justify-between p-3 bg-[#faf8f5] rounded-xl border border-[#efeae1] group hover:border-[#cc5a35]/40 transition-all"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-serif text-base font-medium text-[#201b16] block truncate">
                              {meal.title}
                            </span>
                            {recipeMatch && (
                              <span className="text-[11px] font-sans text-[#787067] flex items-center space-x-1 mt-0.5">
                                <Clock className="w-3 h-3 text-[#cc5a35]" />
                                <span>{(recipeMatch.prepTimeMinutes || 5) + (recipeMatch.cookTimeMinutes || 10)} mins • {recipeMatch.servings || 2} servings</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            {recipeMatch && onCookRecipe && (
                              <button
                                onClick={() => {
                                  sound.playDing();
                                  onCookRecipe(recipeMatch);
                                  onClose();
                                }}
                                className="px-2.5 py-1.5 bg-[#201b16] hover:bg-[#383129] text-white text-xs font-sans font-medium rounded-lg flex items-center space-x-1 transition-all active:scale-95 cursor-pointer"
                                title="Open Cooking Mode"
                              >
                                <Utensils className="w-3 h-3 text-[#cc5a35]" />
                                <span>Cook</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 text-[#787067] hover:text-red-600 flex items-center justify-center border border-[#e5dec9] transition-all cursor-pointer"
                              title="Remove from plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quick Add Meal Modal Form */}
          {isAddingMeal && (
            <div className="bg-[#fff9f5] border-2 border-[#cc5a35]/40 rounded-2xl p-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-sans font-semibold text-[#cc5a35] uppercase tracking-wider">
                  Plan {DAYS_OF_WEEK[isAddingMeal.dayIdx].name} {isAddingMeal.mealType}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingMeal(null)}
                  className="text-stone-400 hover:text-stone-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleAddMeal} className="space-y-3">
                {recipes.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-sans font-medium text-[#787067] mb-1">
                      Pick from Saved Recipes:
                    </label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => {
                        setSelectedRecipeId(e.target.value);
                        if (e.target.value) setCustomTitle('');
                      }}
                      className="w-full px-3 py-2 bg-white border border-[#e5dec9] rounded-xl text-xs font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                    >
                      <option value="">-- Choose a Recipe (or type custom below) --</option>
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({(r.prepTimeMinutes || 5) + (r.cookTimeMinutes || 10)}m)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-sans font-medium text-[#787067] mb-1">
                    Or Enter Custom Meal Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leftover Fried Rice, Quick Salad..."
                    value={customTitle}
                    onChange={(e) => {
                      setCustomTitle(e.target.value);
                      if (e.target.value) setSelectedRecipeId('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#e5dec9] rounded-xl text-xs font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingMeal(null)}
                    className="px-3 py-1.5 rounded-xl border border-[#ded7cb] text-xs font-sans text-[#685f54]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!customTitle.trim() && !selectedRecipeId}
                    className="px-4 py-1.5 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] text-white text-xs font-sans font-medium transition-all shadow-xs disabled:opacity-40"
                  >
                    Save Meal
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 sm:p-6 border-t border-[#e8e2d8] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleAddWeekToShoppingList}
            disabled={plans.length === 0}
            className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-[#faf8f5] hover:bg-[#f5efe4] text-[#201b16] border border-[#ded7cb] text-xs sm:text-sm font-sans font-medium rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-[#cc5a35]" />
            <span>Add Week to Shopping List</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#201b16] hover:bg-[#383129] text-white text-xs sm:text-sm font-sans font-medium rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
