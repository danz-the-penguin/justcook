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

export function TactileImpactBoard({ onCookPrepared }: TactileImpactBoardProps) {
  const { prepItems, clearPrepItems, removePrepItem, isPrepBoardOpen, setPrepBoardOpen } = usePantryStore();
  const [lastImpactTime, setLastImpactTime] = useState<number>(0);
  const [impactSlug, setImpactSlug] = useState<string | null>(null);

  // Trigger visual impact flash whenever prepItems updates
  React.useEffect(() => {
    if (prepItems.length > 0) {
      const latest = prepItems[prepItems.length - 1];
      setImpactSlug(latest.slug);
      setLastImpactTime(Date.now());
      const timer = setTimeout(() => setImpactSlug(null), 600);
      return () => clearTimeout(timer);
    }
  }, [prepItems]);

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

            {/* Skillet Hot Surface Drop Zone */}
            <div
              id="prep-board-dropzone"
              className={`relative min-h-[96px] sm:min-h-[116px] rounded-2xl p-3 border-2 border-dashed transition-all flex flex-wrap items-center justify-center gap-3 overflow-hidden ${
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

                  return (
                    <motion.div
                      key={pi.id}
                      layout
                      initial={{ scale: 0, y: -20, rotate: -15 }}
                      animate={{ scale: 1, y: 0, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0, y: 15 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="group/item relative flex items-center space-x-2 bg-[#2c1f16] border border-[#5a4430] rounded-xl px-2.5 py-1.5 shadow-md hover:border-[#cc5a35] transition-all select-none"
                    >
                      <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
                        <Image
                          src={assetSrc}
                          alt={pi.name}
                          width={44}
                          height={44}
                          className="object-contain drop-shadow"
                        />
                      </div>
                      <div className="text-left pr-1">
                        <span className="block text-xs sm:text-sm font-medium text-[#f5efe6] capitalize leading-tight">
                          {pi.name}
                        </span>
                        <span className="text-[10px] sm:text-xs font-mono text-[#cc5a35]">
                          {qtyInfo.display} {pi.unit}
                        </span>
                      </div>

                      {/* Remove single item button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePrepItem(pi.id);
                        }}
                        className="opacity-60 hover:opacity-100 p-1 rounded hover:bg-white/10 text-[#a39480] hover:text-red-400 transition-colors"
                        title="Remove from pan"
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
