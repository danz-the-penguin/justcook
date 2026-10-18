'use client';

import React, { useState } from 'react';
import { usePantryStore } from '@/stores/usePantryStore';
import { sound } from '@/lib/audio';
import {
  X,
  Scale,
  Sparkles,
  Egg,
  Droplets,
  Flame,
  Check,
  Copy,
  Plus,
  Minus,
  ChefHat,
  Info,
  Utensils,
  BookOpen,
} from 'lucide-react';

interface CulinaryRatioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCookRecipe?: (recipe: any) => void;
}

type RatioPresetId = 'mcd_eggs' | 'rice_grains' | 'pancakes' | 'vinaigrette' | 'pasta_water' | 'custom';

interface GrainConfig {
  name: string;
  waterRatio: number;
  simmerMinutes: number;
  restMinutes: number;
  note: string;
}

const GRAIN_CONFIGS: Record<string, GrainConfig> = {
  jasmine: {
    name: 'Jasmine Rice',
    waterRatio: 1.25,
    simmerMinutes: 12,
    restMinutes: 10,
    note: 'Fragrant and tender. 1 cup rice to 1¼ cups water.',
  },
  basmati: {
    name: 'Basmati Rice',
    waterRatio: 1.5,
    simmerMinutes: 15,
    restMinutes: 10,
    note: 'Long, distinct grains. Rinse well before cooking.',
  },
  sushi: {
    name: 'Japanese / Sushi Rice',
    waterRatio: 1.15,
    simmerMinutes: 14,
    restMinutes: 15,
    note: 'Short, plump and slightly sticky.',
  },
  brown: {
    name: 'Brown Rice',
    waterRatio: 2.0,
    simmerMinutes: 40,
    restMinutes: 10,
    note: 'Whole grain bran requires 2x water and longer simmer.',
  },
  quinoa: {
    name: 'Quinoa',
    waterRatio: 2.0,
    simmerMinutes: 15,
    restMinutes: 5,
    note: 'Fluffy ancient grain. 1 cup quinoa to 2 cups liquid.',
  },
};

export function CulinaryRatioModal({ isOpen, onClose, onCookRecipe }: CulinaryRatioModalProps) {
  const { items, dropItemToPrepBoard } = usePantryStore();
  const [activePreset, setActivePreset] = useState<RatioPresetId>('mcd_eggs');
  const [copied, setCopied] = useState(false);
  const [droppedToBoard, setDroppedToBoard] = useState(false);

  // 1. McDonald's Scrambled Eggs State
  const [mcdEggsCount, setMcdEggsCount] = useState<number>(3);
  const [mcdLiquidType, setMcdLiquidType] = useState<'water' | 'milk'>('water');

  // 2. Rice & Grains State
  const [selectedGrain, setSelectedGrain] = useState<string>('jasmine');
  const [riceCups, setRiceCups] = useState<number>(1);

  // 3. Pancake Batter State
  const [pancakeEggs, setPancakeEggs] = useState<number>(2);

  // 4. French Vinaigrette State
  const [vinaigretteAcidTbsp, setVinaigretteAcidTbsp] = useState<number>(2);

  // 5. Pasta Boiling State
  const [pastaGrams, setPastaGrams] = useState<number>(200);

  // 6. Custom Ratio State
  const [customAnchorName, setCustomAnchorName] = useState('Flour');
  const [customAnchorQty, setCustomAnchorQty] = useState<number>(200);
  const [customAnchorUnit, setCustomAnchorUnit] = useState('g');
  const [customCompanion1Name, setCustomCompanion1Name] = useState('Water / Milk');
  const [customCompanion1Ratio, setCustomCompanion1Ratio] = useState<number>(0.65); // 65% hydration
  const [customCompanion1Unit, setCustomCompanion1Unit] = useState('ml');
  const [customCompanion2Name, setCustomCompanion2Name] = useState('Butter / Fat');
  const [customCompanion2Ratio, setCustomCompanion2Ratio] = useState<number>(0.1); // 10%
  const [customCompanion2Unit, setCustomCompanion2Unit] = useState('g');

  if (!isOpen) return null;

  // Helper to check pantry availability
  const getPantryStock = (slugPattern: string) => {
    const matched = items.find((i) => i.slug.toLowerCase().includes(slugPattern.toLowerCase()));
    return matched ? { quantity: matched.totalQuantity, unit: matched.defaultUnit } : null;
  };

  const eggStock = getPantryStock('egg');
  const butterStock = getPantryStock('butter');
  const milkStock = getPantryStock('milk');
  const riceStock = getPantryStock('rice');
  const pastaStock = getPantryStock('pasta');

  // Calculation for McDonald's Style Eggs
  // Formula: 1 egg : 1 tbsp (15ml) liquid : 7g butter : 0.5g salt
  const mcdLiquidMl = mcdEggsCount * 15;
  const mcdLiquidTbsp = mcdEggsCount;
  const mcdButterGrams = Math.round(mcdEggsCount * 7 * 10) / 10;
  const mcdSaltGrams = Math.round(mcdEggsCount * 0.5 * 10) / 10;

  // Calculation for Rice
  const currentGrain = GRAIN_CONFIGS[selectedGrain] || GRAIN_CONFIGS.jasmine;
  const riceWaterCups = Math.round(riceCups * currentGrain.waterRatio * 100) / 100;
  const riceWaterMl = Math.round(riceCups * currentGrain.waterRatio * 240);
  const riceSaltTsp = Math.round(riceCups * 0.5 * 10) / 10;
  const riceButterG = Math.round(riceCups * 7);

  // Calculation for Pancakes (Base: 1 egg = 100g flour = 120ml milk = 15g butter = 1 tsp baking powder = 1 tbsp sugar)
  const pancakeFlourG = Math.round(pancakeEggs * 100);
  const pancakeMilkMl = Math.round(pancakeEggs * 120);
  const pancakeButterG = Math.round(pancakeEggs * 15);
  const pancakeBakingPowderTsp = pancakeEggs;
  const pancakeSugarTbsp = pancakeEggs;
  const pancakeYield = pancakeEggs * 3; // Approx 3 golden pancakes per egg ratio

  // Calculation for Vinaigrette (3 : 1)
  const vinOilTbsp = vinaigretteAcidTbsp * 3;
  const vinOilMl = vinOilTbsp * 15;
  const vinAcidMl = vinaigretteAcidTbsp * 15;
  const vinDijonTsp = Math.round(vinaigretteAcidTbsp * 0.5 * 10) / 10;

  // Calculation for Pasta Water (100g pasta : 1L water : 10g salt)
  const pastaWaterLiters = Math.round((pastaGrams / 100) * 1.0 * 10) / 10;
  const pastaSaltGrams = Math.round((pastaGrams / 100) * 10);
  const pastaSaltTbsp = Math.round((pastaSaltGrams / 15) * 10) / 10;

  // Format summary text for copy
  const getCalculatedSummaryText = () => {
    if (activePreset === 'mcd_eggs') {
      return `McDonald's Style Fluffy Scrambled Eggs (${mcdEggsCount} Eggs):\n` +
        `• ${mcdEggsCount} Large Eggs\n` +
        `• ${mcdLiquidMl} ml (${mcdLiquidTbsp} tbsp) ${mcdLiquidType === 'water' ? 'Cold Water (Steam Secret)' : 'Whole Milk'}\n` +
        `• ${mcdButterGrams}g Butter\n` +
        `• ${mcdSaltGrams}g Fine Sea Salt (approx. ${mcdSaltGrams >= 1 ? `${Math.round(mcdSaltGrams * 2) / 2} pinch(es)` : 'pinch'})\n` +
        `• Technique: Whisk vigorously 30s until aerated. Cook in medium-low foaming butter. Sweep ribbon folds from edge to center.`;
    }
    if (activePreset === 'rice_grains') {
      return `Perfect ${currentGrain.name} (${riceCups} Cup${riceCups > 1 ? 's' : ''}):\n` +
        `• ${riceCups} cup(s) Dry ${currentGrain.name}\n` +
        `• ${riceWaterCups} cup(s) (${riceWaterMl} ml) Water\n` +
        `• ${riceSaltTsp} tsp Sea Salt\n` +
        `• ${riceButterG}g Butter or Olive Oil (optional)\n` +
        `• Cook time: Simmer covered ${currentGrain.simmerMinutes} min, rest off heat ${currentGrain.restMinutes} min.`;
    }
    if (activePreset === 'pancakes') {
      return `Fluffy Diner Pancakes (${pancakeEggs} Egg Base ~ ${pancakeYield} Pancakes):\n` +
        `• ${pancakeEggs} Large Egg(s)\n` +
        `• ${pancakeFlourG}g All-Purpose Flour\n` +
        `• ${pancakeMilkMl} ml Whole Milk\n` +
        `• ${pancakeButterG}g Melted Butter\n` +
        `• ${pancakeBakingPowderTsp} tsp Baking Powder\n` +
        `• ${pancakeSugarTbsp} tbsp Sugar + pinch salt`;
    }
    if (activePreset === 'vinaigrette') {
      return `Classic French Vinaigrette (3 : 1 Ratio):\n` +
        `• ${vinOilTbsp} tbsp (${vinOilMl} ml) Extra Virgin Olive Oil\n` +
        `• ${vinaigretteAcidTbsp} tbsp (${vinAcidMl} ml) Vinegar or Lemon Juice\n` +
        `• ${vinDijonTsp} tsp Dijon Mustard\n` +
        `• Pinch salt & freshly cracked black pepper`;
    }
    if (activePreset === 'pasta_water') {
      return `The Italian Pasta Boiling Rule (100 : 10 : 1):\n` +
        `• ${pastaGrams}g Dry Pasta\n` +
        `• ${pastaWaterLiters} Liters Boiling Water\n` +
        `• ${pastaSaltGrams}g Salt (~${pastaSaltTbsp} tbsp) - "Water should taste like a pleasant sea broth"`;
    }
    return `Custom Scaled Ratio:\n• ${customAnchorName}: ${customAnchorQty} ${customAnchorUnit}\n• ${customCompanion1Name}: ${Math.round(customAnchorQty * customCompanion1Ratio * 10) / 10} ${customCompanion1Unit}\n• ${customCompanion2Name}: ${Math.round(customAnchorQty * customCompanion2Ratio * 10) / 10} ${customCompanion2Unit}`;
  };

  const handleCopy = () => {
    sound.playDing();
    navigator.clipboard.writeText(getCalculatedSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 1-Click Drop to Prep Board
  const handleDropToPrepBoard = async () => {
    sound.playPop();
    try {
      if (activePreset === 'mcd_eggs') {
        const eggItem = items.find((i) => i.slug === 'egg');
        const butterItem = items.find((i) => i.slug === 'butter');
        if (eggItem) await dropItemToPrepBoard(eggItem, mcdEggsCount);
        if (butterItem) await dropItemToPrepBoard(butterItem, mcdButterGrams);
      } else if (activePreset === 'rice_grains') {
        const riceItem = items.find((i) => i.slug === 'rice');
        if (riceItem) await dropItemToPrepBoard(riceItem, riceCups * 180);
      } else if (activePreset === 'pasta_water') {
        const pastaItem = items.find((i) => i.slug === 'pasta');
        if (pastaItem) await dropItemToPrepBoard(pastaItem, pastaGrams);
      }
      setDroppedToBoard(true);
      setTimeout(() => setDroppedToBoard(false), 2500);
    } catch (e) {
      console.error('Failed to drop items to prep board:', e);
    }
  };

  // 1-Click Cook Scaled Recipe
  const handleCookCurrent = () => {
    if (!onCookRecipe) return;
    sound.playDing();
    if (activePreset === 'mcd_eggs') {
      onCookRecipe({
        title: `McDonald's Fluffy Scrambled Eggs (${mcdEggsCount} Eggs)`,
        servings: Math.max(1, Math.round(mcdEggsCount / 2)),
        ingredients: [
          { name: 'egg', amount: mcdEggsCount, unit: 'piece' },
          { name: mcdLiquidType === 'water' ? 'water' : 'milk', amount: mcdLiquidMl, unit: 'ml' },
          { name: 'butter', amount: mcdButterGrams, unit: 'g' },
          { name: 'salt', amount: mcdSaltGrams, unit: 'g' },
        ],
      });
      onClose();
    } else if (activePreset === 'rice_grains') {
      onCookRecipe({
        title: `Steamed ${currentGrain.name} (${riceCups} Cup)`,
        servings: Math.max(1, riceCups * 2),
        ingredients: [
          { name: 'rice', amount: riceCups * 180, unit: 'g' },
          { name: 'water', amount: riceWaterMl, unit: 'ml' },
          { name: 'salt', amount: riceSaltTsp * 5, unit: 'g' },
        ],
      });
      onClose();
    } else if (activePreset === 'pasta_water') {
      onCookRecipe({
        title: `Boiled Pasta (${pastaGrams}g)`,
        servings: Math.max(1, Math.round(pastaGrams / 100)),
        ingredients: [
          { name: 'pasta', amount: pastaGrams, unit: 'g' },
          { name: 'salt', amount: pastaSaltGrams, unit: 'g' },
        ],
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-3xl p-5 sm:p-8 max-w-2xl w-full border border-[#e8e2d8] shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all cursor-pointer shadow-xs z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 pb-4 border-b border-[#e8e2d8] shrink-0 pr-10">
          <div className="w-11 h-11 rounded-2xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center border border-[#f0d9cf] shadow-2xs shrink-0">
            <Scale className="w-6 h-6 text-[#cc5a35]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16] tracking-tight">
                Culinary Ratio Studio
              </h2>
              <span className="hidden sm:inline bg-[#faeee8] text-[#9e3a19] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#f0d9cf]">
                Golden Formulas
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-[#796f64] mt-0.5">
              Scale liquid, fat, and seasonings proportionally from your anchor ingredient.
            </p>
          </div>
        </div>

        {/* Preset Category Switcher */}
        <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-3 border-b border-[#ece6db] shrink-0 -mx-1 px-1">
          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('mcd_eggs');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'mcd_eggs'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <Egg className="w-4 h-4" />
            <span>🍳 McDonald&apos;s Folded Eggs</span>
          </button>

          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('rice_grains');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'rice_grains'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <span>🍚 Rice &amp; Grains</span>
          </button>

          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('pancakes');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'pancakes'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <span>🥞 Pancakes</span>
          </button>

          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('vinaigrette');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'vinaigrette'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <span>🥗 Vinaigrette (3:1)</span>
          </button>

          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('pasta_water');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'pasta_water'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <span>🍝 Pasta Boiling</span>
          </button>

          <button
            onClick={() => {
              sound.playWoodTap();
              setActivePreset('custom');
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
              activePreset === 'custom'
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'bg-white text-[#5c5349] border border-[#e8e2d8] hover:bg-[#f2ede4]'
            }`}
          >
            <span>⚙️ Custom</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto flex-1 py-4 space-y-5 pr-1">
          {/* ========================================================================= */}
          {/* PRESET 1: MCDONALD'S STYLE FLUFFY SCRAMBLED EGGS                          */}
          {/* ========================================================================= */}
          {activePreset === 'mcd_eggs' && (
            <div className="space-y-4">
              {/* Formula Badge & Secret Explanation */}
              <div className="bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <span className="font-serif text-lg font-medium text-[#8a3319] flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#cc5a35]" />
                    <span>The McDonald&apos;s Steam-Pocket Ratio</span>
                  </span>
                  <span className="text-xs font-mono font-medium bg-white/90 text-[#8a3319] px-2.5 py-1 rounded-full border border-[#f0d9cf]">
                    1 Egg : 1 tbsp (15ml) Liquid : 7g Butter : 0.5g Salt
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#5a483a] leading-relaxed">
                  <strong>Why water or milk?</strong> McDonald&apos;s whisks exactly <strong>1 tbsp (15 ml)</strong> liquid into each egg.
                  When poured onto a hot buttered pan, the liquid instantly flashes into micro-steam pockets, blowing up the curds into signature pillow-soft, velvety folds without turning dry or rubbery!
                </p>
              </div>

              {/* Liquid Switcher */}
              <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#e8e2d8] text-xs sm:text-sm">
                <span className="font-medium text-[#4a4238]">Liquid Technique:</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      sound.playPop();
                      setMcdLiquidType('water');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                      mcdLiquidType === 'water'
                        ? 'bg-[#cc5a35] text-white shadow-2xs'
                        : 'bg-[#faf8f5] text-[#6b6256] border border-[#e8e2d8]'
                    }`}
                  >
                    💧 Cold Water (Authentic Steam)
                  </button>
                  <button
                    onClick={() => {
                      sound.playPop();
                      setMcdLiquidType('milk');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                      mcdLiquidType === 'milk'
                        ? 'bg-[#cc5a35] text-white shadow-2xs'
                        : 'bg-[#faf8f5] text-[#6b6256] border border-[#e8e2d8]'
                    }`}
                  >
                    🥛 Whole Milk (Creamier)
                  </button>
                </div>
              </div>

              {/* Egg Stepper & Direct Chip Selector */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                    How many eggs are you cooking?
                  </label>
                  {eggStock && (
                    <span className="text-xs font-medium text-[#2d5930] bg-[#edf5ee] border border-[#d2e7d3] px-2 py-0.5 rounded-full">
                      Pantry Stock: {eggStock.quantity} eggs
                    </span>
                  )}
                </div>

                {/* Main Stepper */}
                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={() => {
                      if (mcdEggsCount > 1) {
                        sound.playPop();
                        setMcdEggsCount(mcdEggsCount - 1);
                      }
                    }}
                    disabled={mcdEggsCount <= 1}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5 text-[#4a4238]" />
                  </button>

                  <div className="text-center px-4">
                    <span className="font-serif text-5xl font-medium text-[#201b16]">{mcdEggsCount}</span>
                    <span className="text-xs block font-sans text-[#796f64] mt-0.5">
                      Large Egg{mcdEggsCount > 1 ? 's' : ''} ({Math.round((mcdEggsCount / 2) * 10) / 10} serving{mcdEggsCount > 2 ? 's' : ''})
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (mcdEggsCount < 24) {
                        sound.playPop();
                        setMcdEggsCount(mcdEggsCount + 1);
                      }
                    }}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                </div>

                {/* Quick Number Selector Chips */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t border-[#f0ebe1]">
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        sound.playPop();
                        setMcdEggsCount(num);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        mcdEggsCount === num
                          ? 'bg-[#201b16] text-white shadow-xs font-semibold'
                          : 'bg-[#faf8f5] text-[#5c5349] border border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      {num} {num === 1 ? 'Egg' : 'Eggs'}
                    </button>
                  ))}
                  {eggStock && eggStock.quantity > 0 && (
                    <button
                      onClick={() => {
                        sound.playDing();
                        setMcdEggsCount(Math.min(12, eggStock.quantity));
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#faeee8] text-[#8a3319] border border-[#f0d9cf] hover:bg-[#f5e1d7] transition-all cursor-pointer"
                      title="Use all available pantry eggs"
                    >
                      All My Eggs ({eggStock.quantity})
                    </button>
                  )}
                </div>
              </div>

              {/* Exact Proportional Measurements Result Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e2d8] space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#f0ebe1] pb-2.5">
                  <span className="font-serif text-lg font-medium text-[#201b16]">
                    Calculated Portions for {mcdEggsCount} Egg{mcdEggsCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-medium text-[#cc5a35] bg-[#faeee8] px-2.5 py-0.5 rounded-full border border-[#f0d9cf]">
                    100% Balanced
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Eggs */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d8]">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🥚</span>
                      <div>
                        <span className="font-medium text-sm text-[#201b16] block">Eggs</span>
                        <span className="text-[11px] text-[#796f64]">Whisk until bubbly</span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-[#8a3319] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]">
                      {mcdEggsCount} piece{mcdEggsCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Liquid */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d8]">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{mcdLiquidType === 'water' ? '💧' : '🥛'}</span>
                      <div>
                        <span className="font-medium text-sm text-[#201b16] block capitalize">
                          {mcdLiquidType === 'water' ? 'Water' : 'Whole Milk'}
                        </span>
                        <span className="text-[11px] text-[#796f64]">{mcdLiquidTbsp} tbsp (1 tbsp / egg)</span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-[#8a3319] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]">
                      {mcdLiquidMl} ml
                    </span>
                  </div>

                  {/* Butter */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d8]">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🧈</span>
                      <div>
                        <span className="font-medium text-sm text-[#201b16] block">Unsalted Butter</span>
                        <span className="text-[11px] text-[#796f64]">
                          ~{Math.round((mcdButterGrams / 14) * 10) / 10} tbsp for pan
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-[#8a3319] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]">
                      {mcdButterGrams}g
                    </span>
                  </div>

                  {/* Sea Salt */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d8]">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🧂</span>
                      <div>
                        <span className="font-medium text-sm text-[#201b16] block">Sea Salt</span>
                        <span className="text-[11px] text-[#796f64]">
                          {mcdEggsCount === 1 ? '1 small pinch' : `${Math.round(mcdEggsCount * 0.5 * 2) / 2} pinch(es)`}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-[#8a3319] bg-white px-2.5 py-1 rounded-lg border border-[#e8e2d8]">
                      {mcdSaltGrams}g
                    </span>
                  </div>
                </div>

                {/* 30-Second Technique Guide */}
                <div className="mt-3 p-3.5 bg-[#fdfaf5] border border-[#eee5d8] rounded-xl text-xs text-[#524940] space-y-1.5">
                  <span className="font-semibold text-[#8a3319] flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-[#cc5a35]" />
                    <span>Chef&apos;s Pan Sweep Technique:</span>
                  </span>
                  <p className="leading-relaxed">
                    1. Whisk eggs, liquid &amp; salt for 30s until frothy.<br />
                    2. Melt butter over <strong>medium-low</strong> heat until foaming.<br />
                    3. Pour eggs in. Let sit 10s until the bottom begins setting.<br />
                    4. Gently sweep a silicone spatula from the outer edges to the center in broad ribbon folds.<br />
                    5. Pull off heat while still glossy—residual heat finishes cooking them into velvety clouds!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRESET 2: RICE & GRAINS WATER RATIO                                       */}
          {/* ========================================================================= */}
          {activePreset === 'rice_grains' && (
            <div className="space-y-4">
              <div className="bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-4 sm:p-5">
                <span className="font-serif text-lg font-medium text-[#8a3319] block mb-1">
                  Water Absorption Rule for Grains
                </span>
                <p className="text-xs sm:text-sm text-[#5a483a] leading-relaxed">
                  Different rice varieties have drastically different starch and moisture profiles. Jasmine requires tight water control, while Basmati and Brown rice need generous liquid for grain expansion.
                </p>
              </div>

              {/* Grain Selector Chips */}
              <div className="bg-white p-4 rounded-2xl border border-[#e8e2d8] space-y-2.5">
                <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider block">
                  Select Grain Type:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(GRAIN_CONFIGS).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        sound.playPop();
                        setSelectedGrain(key);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-medium text-left transition-all cursor-pointer border ${
                        selectedGrain === key
                          ? 'bg-[#cc5a35] text-white border-[#cc5a35] shadow-xs'
                          : 'bg-[#faf8f5] text-[#4a4238] border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      <div className="font-semibold">{config.name}</div>
                      <div className={`text-[10px] ${selectedGrain === key ? 'text-white/80' : 'text-[#796f64]'}`}>
                        Ratio 1 : {config.waterRatio}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rice Amount Stepper */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                    Cups of Dry {currentGrain.name}
                  </label>
                  {riceStock && (
                    <span className="text-xs font-medium text-[#2d5930] bg-[#edf5ee] border border-[#d2e7d3] px-2 py-0.5 rounded-full">
                      Pantry: {riceStock.quantity}g in stock
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={() => {
                      if (riceCups > 0.5) {
                        sound.playPop();
                        setRiceCups(Math.max(0.5, Math.round((riceCups - 0.5) * 10) / 10));
                      }
                    }}
                    disabled={riceCups <= 0.5}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5 text-[#4a4238]" />
                  </button>

                  <div className="text-center px-4">
                    <span className="font-serif text-5xl font-medium text-[#201b16]">{riceCups}</span>
                    <span className="text-xs block font-sans text-[#796f64] mt-0.5">
                      Cup{riceCups > 1 ? 's' : ''} ({Math.round(riceCups * 180)}g dry / ~{Math.round(riceCups * 2)} bowls)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (riceCups < 8) {
                        sound.playPop();
                        setRiceCups(Math.round((riceCups + 0.5) * 10) / 10);
                      }
                    }}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t border-[#f0ebe1]">
                  {[0.5, 1, 1.5, 2, 3, 4].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        sound.playPop();
                        setRiceCups(c);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        riceCups === c
                          ? 'bg-[#201b16] text-white shadow-xs font-semibold'
                          : 'bg-[#faf8f5] text-[#5c5349] border border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      {c} Cup{c > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Water Result */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e2d8] space-y-3">
                <span className="font-serif text-lg font-medium text-[#201b16] block border-b border-[#f0ebe1] pb-2">
                  Water &amp; Seasoning Required
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#faeee8] border border-[#f0d9cf]">
                    <span className="text-xs text-[#8a3319] font-medium block">Total Water Required:</span>
                    <span className="font-serif text-2xl font-bold text-[#8a3319]">
                      {riceWaterCups} cups <span className="text-sm font-sans font-normal">({riceWaterMl} ml)</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#faf8f5] border border-[#e8e2d8]">
                    <span className="text-xs text-[#796f64] font-medium block">Salt &amp; Fat:</span>
                    <span className="font-serif text-lg font-medium text-[#201b16]">
                      {riceSaltTsp} tsp salt • {riceButterG}g butter/oil
                    </span>
                  </div>
                </div>
                <div className="text-xs text-[#524940] bg-[#fdfaf5] p-3 rounded-xl border border-[#eee5d8]">
                  ⏱️ <strong>Cook Timing:</strong> Bring to boil, cover tightly, reduce heat to low and simmer for{' '}
                  <strong>{currentGrain.simmerMinutes} minutes</strong>. Remove from heat and let steam rest for{' '}
                  <strong>{currentGrain.restMinutes} minutes</strong> without opening lid!
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRESET 3: FLUFFY DINER PANCAKES                                           */}
          {/* ========================================================================= */}
          {activePreset === 'pancakes' && (
            <div className="space-y-4">
              <div className="bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-4 sm:p-5">
                <span className="font-serif text-lg font-medium text-[#8a3319] block mb-1">
                  Golden Pancake Batter Ratio
                </span>
                <p className="text-xs sm:text-sm text-[#5a483a] leading-relaxed">
                  The balanced pancake ratio: <strong>1 egg : 100g flour : 120ml milk : 15g melted butter</strong>. Yields fluffy, golden diner-style cakes with tender crumb.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                    Anchor: Number of Eggs
                  </label>
                  <span className="text-xs text-[#cc5a35] font-medium">
                    Yields ~{pancakeYield} golden pancakes
                  </span>
                </div>

                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={() => {
                      if (pancakeEggs > 1) {
                        sound.playPop();
                        setPancakeEggs(pancakeEggs - 1);
                      }
                    }}
                    disabled={pancakeEggs <= 1}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5 text-[#4a4238]" />
                  </button>

                  <div className="text-center px-4">
                    <span className="font-serif text-5xl font-medium text-[#201b16]">{pancakeEggs}</span>
                    <span className="text-xs block font-sans text-[#796f64] mt-0.5">
                      Egg{pancakeEggs > 1 ? 's' : ''} ({Math.round(pancakeEggs * 1.5)} servings)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (pancakeEggs < 10) {
                        sound.playPop();
                        setPancakeEggs(pancakeEggs + 1);
                      }
                    }}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t border-[#f0ebe1]">
                  {[1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        sound.playPop();
                        setPancakeEggs(num);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        pancakeEggs === num
                          ? 'bg-[#201b16] text-white shadow-xs font-semibold'
                          : 'bg-[#faf8f5] text-[#5c5349] border border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      {num} {num === 1 ? 'Egg' : 'Eggs'} (~{num * 3} cakes)
                    </button>
                  ))}
                </div>
              </div>

              {/* Pancake Ingredients List */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e2d8] space-y-2.5">
                <span className="font-serif text-lg font-medium text-[#201b16] block border-b border-[#f0ebe1] pb-2">
                  Batter Ingredients Breakdown
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block">All-Purpose Flour</span>
                    <strong className="text-sm text-[#201b16]">{pancakeFlourG}g (~{Math.round((pancakeFlourG / 125) * 10) / 10} cups)</strong>
                  </div>
                  <div className="p-2.5 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block">Whole Milk</span>
                    <strong className="text-sm text-[#201b16]">{pancakeMilkMl} ml (~{Math.round((pancakeMilkMl / 240) * 10) / 10} cups)</strong>
                  </div>
                  <div className="p-2.5 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block">Melted Butter</span>
                    <strong className="text-sm text-[#201b16]">{pancakeButterG}g ({Math.round(pancakeButterG / 14)} tbsp)</strong>
                  </div>
                  <div className="p-2.5 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block">Baking Powder &amp; Sugar</span>
                    <strong className="text-sm text-[#201b16]">{pancakeBakingPowderTsp} tsp powder • {pancakeSugarTbsp} tbsp sugar</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRESET 4: FRENCH VINAIGRETTE (3:1)                                        */}
          {/* ========================================================================= */}
          {activePreset === 'vinaigrette' && (
            <div className="space-y-4">
              <div className="bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-4 sm:p-5">
                <span className="font-serif text-lg font-medium text-[#8a3319] block mb-1">
                  The Golden 3 : 1 Salad Dressing Rule
                </span>
                <p className="text-xs sm:text-sm text-[#5a483a] leading-relaxed">
                  3 parts Extra Virgin Olive Oil to 1 part Acid (Vinegar or Lemon Juice), emulsified with Dijon mustard.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider block">
                  Acid Amount (Vinegar / Lemon Juice):
                </label>
                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={() => {
                      if (vinaigretteAcidTbsp > 1) {
                        sound.playPop();
                        setVinaigretteAcidTbsp(vinaigretteAcidTbsp - 1);
                      }
                    }}
                    disabled={vinaigretteAcidTbsp <= 1}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                  <div className="text-center px-4">
                    <span className="font-serif text-5xl font-medium text-[#201b16]">{vinaigretteAcidTbsp}</span>
                    <span className="text-xs block font-sans text-[#796f64] mt-0.5">
                      tbsp Vinegar / Lemon ({vinAcidMl} ml)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (vinaigretteAcidTbsp < 8) {
                        sound.playPop();
                        setVinaigretteAcidTbsp(vinaigretteAcidTbsp + 1);
                      }
                    }}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e2d8] space-y-2">
                <span className="font-serif text-lg font-medium text-[#201b16] block border-b border-[#f0ebe1] pb-2">
                  Balanced Emulsion
                </span>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-[#faeee8] rounded-xl border border-[#f0d9cf]">
                    <span className="text-[#8a3319] block font-medium">Extra Virgin Olive Oil:</span>
                    <strong className="text-lg text-[#8a3319]">{vinOilTbsp} tbsp ({vinOilMl} ml)</strong>
                  </div>
                  <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block font-medium">Dijon Mustard &amp; Seasoning:</span>
                    <strong className="text-sm text-[#201b16]">{vinDijonTsp} tsp Dijon • salt &amp; pepper</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRESET 5: PASTA BOILING RULE (100 : 10 : 1)                               */}
          {/* ========================================================================= */}
          {activePreset === 'pasta_water' && (
            <div className="space-y-4">
              <div className="bg-[#faeee8] border border-[#f0d9cf] rounded-2xl p-4 sm:p-5">
                <span className="font-serif text-lg font-medium text-[#8a3319] block mb-1">
                  The Italian 100 : 10 : 1 Boiling Rule
                </span>
                <p className="text-xs sm:text-sm text-[#5a483a] leading-relaxed">
                  For every <strong>100g dry pasta</strong>, boil in <strong>1 Liter of water</strong> with <strong>10g salt</strong>. This ensures pasta cooks evenly without turning gummy and seasons the noodles right to their core.
                </p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                    Dry Pasta to Boil:
                  </label>
                  {pastaStock && (
                    <span className="text-xs font-medium text-[#2d5930] bg-[#edf5ee] border border-[#d2e7d3] px-2 py-0.5 rounded-full">
                      Pantry: {pastaStock.quantity}g pasta
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-6 py-2">
                  <button
                    onClick={() => {
                      if (pastaGrams > 50) {
                        sound.playPop();
                        setPastaGrams(pastaGrams - 50);
                      }
                    }}
                    disabled={pastaGrams <= 50}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 disabled:opacity-30 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                  <div className="text-center px-4">
                    <span className="font-serif text-5xl font-medium text-[#201b16]">{pastaGrams}</span>
                    <span className="text-xs block font-sans text-[#796f64] mt-0.5">
                      Grams (~{Math.round(pastaGrams / 80)} portion{pastaGrams > 80 ? 's' : ''})
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (pastaGrams < 1000) {
                        sound.playPop();
                        setPastaGrams(pastaGrams + 50);
                      }
                    }}
                    className="w-12 h-12 rounded-2xl bg-[#faf8f5] border border-[#e8e2d8] hover:bg-[#f0ebe1] active:scale-95 text-2xl font-medium text-[#201b16] shadow-xs flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5 text-[#4a4238]" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-2 border-t border-[#f0ebe1]">
                  {[80, 160, 200, 300, 500].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        sound.playPop();
                        setPastaGrams(g);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        pastaGrams === g
                          ? 'bg-[#201b16] text-white shadow-xs font-semibold'
                          : 'bg-[#faf8f5] text-[#5c5349] border border-[#e8e2d8] hover:bg-[#ede7dc]'
                      }`}
                    >
                      {g}g ({g <= 100 ? 'Solo' : g <= 200 ? 'Couple' : 'Family'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8e2d8] space-y-2.5">
                <span className="font-serif text-lg font-medium text-[#201b16] block border-b border-[#f0ebe1] pb-2">
                  Pot Requirements
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-[#faeee8] rounded-xl border border-[#f0d9cf]">
                    <span className="text-[#8a3319] block font-medium">Water Volume:</span>
                    <strong className="text-xl text-[#8a3319]">{pastaWaterLiters} Liters</strong>
                  </div>
                  <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e8e2d8]">
                    <span className="text-[#796f64] block font-medium">Cooking Salt:</span>
                    <strong className="text-lg text-[#201b16]">{pastaSaltGrams}g (~{pastaSaltTbsp} tbsp)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PRESET 6: CUSTOM RATIO BUILDER                                            */}
          {/* ========================================================================= */}
          {activePreset === 'custom' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <span className="font-serif text-lg font-medium text-[#201b16] block">
                  Anchor Ingredient (What you have on hand)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customAnchorName}
                    onChange={(e) => setCustomAnchorName(e.target.value)}
                    placeholder="Name (e.g. Flour)"
                    className="col-span-2 px-3 py-2 bg-[#faf8f5] border border-[#e8e2d8] rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    value={customAnchorUnit}
                    onChange={(e) => setCustomAnchorUnit(e.target.value)}
                    placeholder="Unit (g/ml)"
                    className="px-3 py-2 bg-[#faf8f5] border border-[#e8e2d8] rounded-xl text-sm"
                  />
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <label className="text-xs font-semibold text-[#796f64] uppercase tracking-wider">
                    Quantity:
                  </label>
                  <input
                    type="number"
                    value={customAnchorQty}
                    onChange={(e) => setCustomAnchorQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-28 px-3 py-1.5 bg-[#faf8f5] border border-[#e8e2d8] rounded-xl text-sm font-semibold"
                  />
                  <span className="text-sm font-medium text-[#4a4238]">{customAnchorUnit}</span>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e8e2d8] space-y-3">
                <span className="font-serif text-lg font-medium text-[#201b16] block">
                  Companion Ingredients Scaled Proportionally
                </span>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e8e2d8] flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <span className="font-semibold text-[#201b16] block">{customCompanion1Name}</span>
                      <span className="text-[#796f64]">Ratio factor: {customCompanion1Ratio}x of anchor</span>
                    </div>
                    <span className="text-base font-bold text-[#8a3319] bg-white px-3 py-1 rounded-lg border border-[#e8e2d8]">
                      {Math.round(customAnchorQty * customCompanion1Ratio * 10) / 10} {customCompanion1Unit}
                    </span>
                  </div>

                  <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e8e2d8] flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <span className="font-semibold text-[#201b16] block">{customCompanion2Name}</span>
                      <span className="text-[#796f64]">Ratio factor: {customCompanion2Ratio}x of anchor</span>
                    </div>
                    <span className="text-base font-bold text-[#8a3319] bg-white px-3 py-1 rounded-lg border border-[#e8e2d8]">
                      {Math.round(customAnchorQty * customCompanion2Ratio * 10) / 10} {customCompanion2Unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="pt-4 border-t border-[#e8e2d8] flex items-center justify-between gap-2 shrink-0 flex-wrap">
          {/* Copy Summary Button */}
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border ${
              copied
                ? 'bg-[#edf5ee] border-[#d2e7d3] text-[#2d5930]'
                : 'bg-white border-[#e8e2d8] text-[#5c5349] hover:bg-[#f0ebe1]'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-[#2d5930]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Portions'}</span>
          </button>

          {/* Action Buttons: Drop to Prep Board + Cook */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDropToPrepBoard}
              className={`flex items-center space-x-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all border ${
                droppedToBoard
                  ? 'bg-[#edf5ee] border-[#d2e7d3] text-[#2d5930]'
                  : 'bg-[#faf8f5] hover:bg-[#ede7dc] text-[#5c5349] border-[#e8e2d8]'
              }`}
              title="Drop ingredients onto Tactile Prep Board"
            >
              <Utensils className="w-4 h-4 text-[#cc5a35]" />
              <span>{droppedToBoard ? 'Dropped to Board ✓' : 'Drop in Prep Board'}</span>
            </button>

            {onCookRecipe && (
              <button
                onClick={handleCookCurrent}
                className="flex items-center space-x-1.5 px-4 sm:px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-xs sm:text-sm font-medium rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Cook Scaled Recipe</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
