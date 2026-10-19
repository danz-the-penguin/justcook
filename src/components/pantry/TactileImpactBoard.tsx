'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { usePantryStore, PrepItem } from '@/stores/usePantryStore';
import { resolveFoodAsset, formatQuantityWithCulinaryFraction } from '@/lib/constants/shelf-life';
import { ChefHat, Flame, Trash2, X, ChevronUp, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import { sound } from '@/lib/audio';
import Link from 'next/link';

interface TactileImpactBoardProps {
  onCookPrepared?: () => void;
}

interface SizzleParticle {
  id: number;
  type: 'steam' | 'sparkle';
  x: number;
  targetX: number;
  targetY: number;
  size: number;
  duration: number;
  delay: number;
}

const RECIPE_TARGETS = [
  { title: 'Scrambled Eggs', slug: 'scrambled-eggs', icon: '🍳', required: ['egg'], optional: ['milk', 'butter', 'bread'] },
  { title: 'French Toast', slug: 'french-toast', icon: '🍞', required: ['bread', 'egg'], optional: ['milk', 'butter'] },
  { title: 'Tomato Egg Stir-Fry', slug: 'tomato-egg', icon: '🍅', required: ['tomato', 'egg'], optional: ['garlic', 'onion', 'soy_sauce'] },
  { title: 'Grilled Cheese', slug: 'grilled-cheese', icon: '🥪', required: ['bread', 'cheese'], optional: ['butter'] },
  { title: 'Bruschetta', slug: 'bruschetta', icon: '🥖', required: ['bread', 'tomato'], optional: ['garlic', 'olive_oil'] },
  { title: 'Egg Toast', slug: 'egg-toast', icon: '🍳', required: ['bread', 'egg'], optional: ['butter', 'cheese'] },
  { title: 'Shakshuka', slug: 'shakshuka', icon: '🍳', required: ['egg', 'tomato'], optional: ['onion', 'bell_pepper'] },
  { title: 'Pasta Pomodoro', slug: 'pasta-pomodoro', icon: '🍝', required: ['pasta', 'tomato'], optional: ['garlic', 'cheese', 'olive_oil'] },
  { title: 'Egg Fried Rice', slug: 'egg-fried-rice', icon: '🍚', required: ['rice', 'egg'], optional: ['soy_sauce', 'onion', 'garlic'] },
];

export function TactileImpactBoard({ onCookPrepared }: TactileImpactBoardProps) {
  const { prepItems, clearPrepItems, removePrepItem, isPrepBoardOpen, setPrepBoardOpen, addNewItemBatch } = usePantryStore();
  const [heatLevel, setHeatLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [lastImpactTime, setLastImpactTime] = useState<number>(0);
  const [impactSlug, setImpactSlug] = useState<string | null>(null);
  const [particles, setParticles] = useState<SizzleParticle[]>([]);
  const [mealPrepMessage, setMealPrepMessage] = useState<string | null>(null);
  const [isPacking, setIsPacking] = useState(false);

  // Trigger visual impact flash & steam/sizzle particles whenever prepItems updates
  React.useEffect(() => {
    if (prepItems.length > 0) {
      const latest = prepItems[prepItems.length - 1];
      setImpactSlug(latest.slug);
      setLastImpactTime(Date.now());
      sound.playSizzle(heatLevel);

      const now = Date.now();
      const newParticles: SizzleParticle[] = [];
      const steamCount = heatLevel === 'low' ? 4 : heatLevel === 'high' ? 14 : 8;
      const sparkCount = heatLevel === 'low' ? 3 : heatLevel === 'high' ? 16 : 8;

      for (let i = 0; i < steamCount; i++) {
        newParticles.push({
          id: now + i,
          type: 'steam',
          x: 35 + Math.random() * 30,
          targetX: (Math.random() - 0.5) * 60,
          targetY: -(30 + Math.random() * 50),
          size: 20 + Math.random() * 24,
          duration: 0.9 + Math.random() * 0.4,
          delay: Math.random() * 0.15,
        });
      }
      for (let i = steamCount; i < steamCount + sparkCount; i++) {
        newParticles.push({
          id: now + i,
          type: 'sparkle',
          x: 45 + Math.random() * 10,
          targetX: (Math.random() - 0.5) * 110,
          targetY: -(20 + Math.random() * 45),
          size: 3 + Math.random() * 4,
          duration: 0.45 + Math.random() * 0.25,
          delay: Math.random() * 0.08,
        });
      }
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setImpactSlug(null);
        setParticles([]);
      }, 1300);
      return () => clearTimeout(timer);
    }
  }, [prepItems, heatLevel]);

  const topMatch = React.useMemo(() => {
    if (prepItems.length === 0) return null;
    const slugs = prepItems.map((p) => p.slug.toLowerCase());

    let best: { title: string; icon: string; matchPercent: number; missing: string[] } | null = null;

    for (const r of RECIPE_TARGETS) {
      const matchedRequired = r.required.filter((req) => slugs.some((s) => s.includes(req) || req.includes(s)));
      const missing = r.required.filter((req) => !slugs.some((s) => s.includes(req) || req.includes(s)));

      const percent = Math.round((matchedRequired.length / r.required.length) * 100);
      if (percent > 0 && (!best || percent > best.matchPercent)) {
        best = {
          title: r.title,
          icon: r.icon,
          matchPercent: percent,
          missing,
        };
      }
    }
    return best;
  }, [prepItems]);

  const handlePackMealPrep = async () => {
    if (prepItems.length === 0 || isPacking) return;
    setIsPacking(true);
    sound.playSnap();

    const uniqueNames = Array.from(new Set(prepItems.map((p) => p.name)));
    const summary = uniqueNames.slice(0, 2).join(' & ') + (uniqueNames.length > 2 ? ' etc.' : '');
    const dishName = `Meal Prep: ${summary}`;

    await addNewItemBatch({
      slug: `meal-prep-${Date.now().toString(36)}`,
      name: dishName,
      category: 'ready-to-eat',
      location: 'fridge',
      quantity: 1,
      unit: 'box',
      notes: `Skillet prep: ${prepItems.map((p) => `${formatQuantityWithCulinaryFraction(p.amount).display} ${p.unit} ${p.name}`).join(', ')}`,
    });

    clearPrepItems();
    sound.playSuccess();
    setIsPacking(false);
    setMealPrepMessage(`🍱 Packed "${dishName}" into Fridge (fresh for 4 days)!`);
    setTimeout(() => setMealPrepMessage(null), 4500);
  };

  const totalIngredientsCount = prepItems.length;

  return (
    <aside
      id="tactile-prep-board"
      aria-label="Chef's Impact Prep Station"
      className="fixed bottom-0 left-0 right-0 z-40 px-3 sm:px-6 pb-2 sm:pb-4 pointer-events-none"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        {/* Floating Toggle Bar when closed or on mobile */}
        {!isPrepBoardOpen ? (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => {
              sound.playWoodTap();
              setPrepBoardOpen(true);
            }}
            className="w-full bg-[#201b16] hover:bg-[#322a22] text-[#faf8f5] px-4 py-3 sm:py-3.5 rounded-2xl shadow-2xl border border-[#483d31] flex items-center justify-between transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl animate-bounce">🍳</span>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="font-serif text-base sm:text-lg text-white font-medium">
                    Chef&apos;s Impact Prep Station
                  </span>
                  {totalIngredientsCount > 0 && (
                    <span className="bg-[#cc5a35] text-white text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                      {totalIngredientsCount} in pan
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-[#b8ab99]">
                  {totalIngredientsCount === 0
                    ? 'Drag food here to chop & sizzle on impact'
                    : 'Ingredients ready • Tap to view pan & cook'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-sans text-[#ded7cb]">
              <span className="hidden sm:inline">Open Station</span>
              <ChevronUp className="w-5 h-5 text-[#cc5a35] group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </motion.button>
        ) : (
          /* Expanded Tactile Skillet & Cutting Board Station */
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="relative bg-gradient-to-b from-[#251b14] via-[#1d1510] to-[#140e0b] text-[#faf8f5] rounded-3xl p-4 sm:p-5 border-2 border-[#543f2c] shadow-[0_-12px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Cast Iron Rim Texture Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#433222] mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#cc5a35]/20 border border-[#cc5a35]/40 flex items-center justify-center text-lg">
                  🍳
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl text-[#f5efe6] font-medium leading-none">
                    Cast-Iron Sizzle Pan &amp; Prep Board
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#a89a87] mt-0.5">
                    Drag ingredients from the shelves and drop them here for instant impact chop
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Heat Level Selector */}
                <div className="flex items-center space-x-1 bg-[#150e0a] p-1 rounded-xl border border-[#483726]">
                  {(['low', 'medium', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setHeatLevel(lvl);
                        sound.playSizzle(lvl);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-sans font-medium transition-all cursor-pointer ${
                        heatLevel === lvl
                          ? 'bg-[#cc5a35] text-white shadow-2xs font-semibold'
                          : 'text-[#9c8e7e] hover:text-[#f5efe6] hover:bg-white/5'
                      }`}
                      title={`Set skillet heat to ${lvl}`}
                    >
                      {lvl === 'low' ? '🔥 Low' : lvl === 'medium' ? '🔥🔥 Med' : '🔥🔥🔥 Sear'}
                    </button>
                  ))}
                </div>

                {totalIngredientsCount > 0 && (
                  <button
                    onClick={() => {
                      sound.playWoodTap();
                      clearPrepItems();
                    }}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[#d4c6b5] hover:text-white text-xs font-sans transition-colors flex items-center space-x-1"
                    title="Clear ingredients from pan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Empty</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    sound.playWoodTap();
                    setPrepBoardOpen(false);
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#d4c6b5] hover:text-white transition-colors"
                  title="Minimize station"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meal Prep Success Alert */}
            {mealPrepMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-2.5 px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-600/40 text-emerald-200 text-xs font-sans flex items-center justify-between"
              >
                <span>{mealPrepMessage}</span>
                <button
                  onClick={() => setMealPrepMessage(null)}
                  className="text-emerald-400 hover:text-white ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </motion.div>
            )}

            {/* Live Recipe Matcher Suggestion */}
            {topMatch && (
              <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#2f1f14] via-[#3a2719] to-[#2f1f14] border border-[#cc5a35]/40 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{topMatch.icon}</span>
                  <span className="text-[#f5efe6] font-medium font-serif">
                    {topMatch.matchPercent === 100 ? '✨ 100% Match:' : '⚡ Recipe Match:'} {topMatch.title}
                  </span>
                  {topMatch.missing.length > 0 && (
                    <span className="text-[#d4af37] text-[11px] font-sans">
                      (Add: {topMatch.missing.join(', ')})
                    </span>
                  )}
                </div>
                <Link
                  href={`/recipes?q=${encodeURIComponent(topMatch.title)}`}
                  className="text-[11px] font-sans text-[#e69374] hover:text-white flex items-center space-x-1 underline"
                >
                  <span>View Recipe</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            {/* Skillet Hot Surface Drop Zone */}
            <div
              id="prep-board-dropzone"
              className={`relative min-h-[96px] sm:min-h-[116px] rounded-2xl p-3 border-2 border-dashed transition-all flex flex-wrap items-center justify-center gap-3 overflow-visible ${
                impactSlug
                  ? 'bg-[#cc5a35]/20 border-[#cc5a35] shadow-[inset_0_0_24px_rgba(204,90,53,0.4)]'
                  : 'bg-[#18100b]/80 border-[#4a3726] hover:border-[#cc5a35]/60'
              }`}
            >
              {/* Hot Sear Sizzle Smoke & Glow on Impact */}
              <AnimatePresence>
                {impactSlug && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.8, 1.2, 1.4] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center"
                  >
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-[#cc5a35]/30 to-transparent blur-md" />
                    <span className="absolute text-2xl sm:text-3xl font-serif italic font-bold text-[#fce8e1] drop-shadow-[0_0_12px_rgba(204,90,53,1)]">
                      💥 SIZZLE!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Dynamic Steam & Sizzle Pan Particles */}
              <AnimatePresence>
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{
                      opacity: p.type === 'steam' ? 0.65 : 1,
                      scale: p.type === 'steam' ? 0.5 : 1,
                      x: 0,
                      y: 0,
                    }}
                    animate={{
                      opacity: 0,
                      scale: p.type === 'steam' ? [0.5, 1.3, 2.1] : [1, 1.6, 0],
                      x: p.targetX,
                      y: p.targetY,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: 'easeOut',
                    }}
                    style={{
                      left: `${p.x}%`,
                      top: '50%',
                      width: p.size,
                      height: p.size,
                    }}
                    className={`absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      p.type === 'steam'
                        ? 'bg-white/40 blur-xs'
                        : 'bg-amber-300 shadow-[0_0_8px_#fbbf24]'
                    }`}
                  />
                ))}
              </AnimatePresence>

              {/* Empty State / Prompt */}
              {totalIngredientsCount === 0 && (
                <div className="text-center py-2 select-none pointer-events-none">
                  <span className="text-2xl sm:text-3xl block mb-1 opacity-80">🪵 🔪 🍳</span>
                  <p className="font-serif italic text-sm sm:text-base text-[#c4b6a3]">
                    Drop ingredients here to chop on impact!
                  </p>
                  <p className="text-[11px] text-[#7d7061] mt-0.5 font-sans">
                    Tap and drag any ingredient sprite from the pantry shelf above
                  </p>
                </div>
              )}

              {/* Ingredients inside the pan */}
              <AnimatePresence mode="popLayout">
                {prepItems.map((pi) => {
                  const assetSrc = resolveFoodAsset(pi.slug, pi.category);
                  const qtyInfo = formatQuantityWithCulinaryFraction(pi.amount);
                  const sizeTier = pi.size || 'medium';
                  const scaleFactor = sizeTier === 'small' ? 0.82 : sizeTier === 'large' ? 1.22 : 1.0;

                  return (
                    <motion.div
                      key={pi.id}
                      layout="position"
                      initial={{ scale: 0.75, y: -16, opacity: 0, rotate: -8 }}
                      animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.7, opacity: 0, y: 12, transition: { duration: 0.18, ease: 'easeOut' } }}
                      transition={{
                        layout: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
                        scale: { type: 'spring', stiffness: 380, damping: 26 },
                        y: { type: 'spring', stiffness: 380, damping: 26 },
                      }}
                      className="group/item relative flex items-center space-x-2 bg-[#2c1f16] border border-[#5a4430] rounded-xl px-2.5 py-1.5 shadow-md hover:border-[#cc5a35] transition-[border-color,background-color] duration-150 select-none"
                    >
                      <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center overflow-visible">
                        <div
                          style={{ transform: `scale(${scaleFactor})` }}
                          className="transition-transform duration-200 flex items-center justify-center"
                        >
                          <Image
                            src={assetSrc}
                            alt={pi.name}
                            width={44}
                            height={44}
                            className="object-contain drop-shadow"
                          />
                        </div>
                      </div>
                      <div className="text-left pr-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="block text-xs sm:text-sm font-medium text-[#f5efe6] capitalize leading-tight">
                            {pi.pastaShape
                              ? pi.name
                              : sizeTier === 'small'
                              ? `Small ${pi.name}`
                              : sizeTier === 'large'
                              ? `Large ${pi.name}`
                              : pi.name}
                          </span>
                          {pi.pastaShape ? (
                            <span className="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded leading-none bg-[#faeee8] text-[#cc5a35] border border-[#f0d9cf]">
                              {pi.pastaShape}
                            </span>
                          ) : sizeTier !== 'medium' && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded leading-none ${
                                sizeTier === 'small'
                                  ? 'bg-[#3b2a1e] text-[#e69374] border border-[#543b29]'
                                  : 'bg-[#4a2e1d] text-[#ffab8f] border border-[#7a482b]'
                              }`}
                            >
                              {sizeTier === 'small' ? 'S' : 'L'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs font-mono text-[#cc5a35]">
                          {qtyInfo.display} {pi.unit}
                        </span>
                      </div>

                      {/* Remove single item button with refund */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrepItem(pi.id);
                        }}
                        className="opacity-60 hover:opacity-100 p-1 rounded hover:bg-white/10 text-[#a39480] hover:text-red-400 transition-colors"
                        title="Remove from pan (returns to pantry)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Bottom Actions Bar */}
            {totalIngredientsCount > 0 && (
              <div className="mt-3 pt-2.5 border-t border-[#433222] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <span className="text-xs text-[#b8ab99] font-sans text-center sm:text-left">
                  🔥 {totalIngredientsCount} fresh ingredient{totalIngredientsCount > 1 ? 's' : ''} prepped &amp; ready to cook
                </span>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handlePackMealPrep}
                    disabled={isPacking}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#2d221a] hover:bg-[#3d2f25] text-[#e69374] hover:text-white font-sans font-medium text-xs sm:text-sm rounded-xl border border-[#543f2c] active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Pack all pan ingredients into a sealed meal prep container saved in your fridge"
                  >
                    <span>🍱</span>
                    <span>{isPacking ? 'Packing...' : 'Pack Meal Prep'}</span>
                  </button>

                  <Link
                    href="/recipes"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans font-medium text-xs sm:text-sm rounded-xl shadow-xs active:scale-95 transition-all"
                  >
                    <ChefHat className="w-4 h-4" />
                    <span>Cook with These ({totalIngredientsCount})</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </aside>
  );
}
