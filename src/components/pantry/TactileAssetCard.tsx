'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { EnrichedPantryItem, usePantryStore, PantryBatchData } from '@/stores/usePantryStore';
import {
  StorageLocation,
  resolveFoodAsset,
  isSpiceOrJarItem,
  snapToCulinaryFraction,
  formatQuantityWithCulinaryFraction,
} from '@/lib/constants/shelf-life';
import { Plus, Minus, Calendar, Trash2, ArrowRightLeft, Pencil, MoreHorizontal, Utensils } from 'lucide-react';
import { sound } from '@/lib/audio';

interface TactileAssetCardProps {
  item: EnrichedPantryItem;
  onEditBatch: (batch: PantryBatchData, item: EnrichedPantryItem) => void;
  onEditItem?: (item: EnrichedPantryItem) => void;
}

const FRACTION_STEPS = [
  { label: '1', val: 1 },
  { label: '½', val: 0.5 },
  { label: '⅓', val: 1 / 3 },
  { label: '¼', val: 0.25 },
  { label: '⅛', val: 0.125 },
];

const SPICE_STEPS_GRAMS = [
  { label: '10g', val: 10 },
  { label: '25g', val: 25 },
  { label: '1 tsp (5g)', val: 5 },
  { label: '1 tbsp (15g)', val: 15 },
  { label: '1 pinch (1g)', val: 1 },
  { label: '50g', val: 50 },
];

const SPICE_STEPS_ML = [
  { label: '15ml (1 tbsp)', val: 15 },
  { label: '5ml (1 tsp)', val: 5 },
  { label: '50ml', val: 50 },
  { label: '100ml', val: 100 },
];

export function TactileAssetCard({ item, onEditBatch, onEditItem }: TactileAssetCardProps) {
  const {
    incrementItem,
    decrementBatch,
    moveBatchLocation,
    deleteAsset,
    addNewItemBatch,
    dropItemToPrepBoard,
  } = usePantryStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const lastDragEndTimeRef = useRef<number>(0);

  const primaryBatch = item.batches[0];
  const unit = item.defaultUnit;
  const isSpice = isSpiceOrJarItem(item.category, unit, item.slug);
  const isGrams = ['g', 'gram', 'grams'].includes(unit.toLowerCase());
  const isMl = ['ml', 'milliliter'].includes(unit.toLowerCase());

  const availableSteps = isSpice && isGrams
    ? SPICE_STEPS_GRAMS
    : isSpice && isMl
    ? SPICE_STEPS_ML
    : FRACTION_STEPS;

  const currentStep = availableSteps[stepIdx % availableSteps.length];
  const totalQty = isSpice ? item.totalQuantity : snapToCulinaryFraction(item.totalQuantity);
  const assetSrc = resolveFoodAsset(item.slug, item.category);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3500);
      return;
    }
    await deleteAsset(item.slug);
  };

  const maxSprites = item.displayLimit || 12;

  // Build sprite list supporting whole, fractional slices, and spice jars
  interface SpriteItem {
    id: string;
    fraction: number;
    isPartial: boolean;
    fractionLabel?: string;
    isJar?: boolean;
    jarIndex?: number;
    jarLabel?: string;
    fillPercent?: number;
    fillStatus?: string;
  }

  const sprites: SpriteItem[] = [];
  let overflowCount = 0;

  if (isSpice) {
    // For spices weighed in grams, only one item should be displayed,
    // or in a small bottle or jar, unless there are two jars/bottles!
    const activeBatches = item.batches.filter((b) => b.quantity > 0);
    let jarCount = 0;
    if (totalQty > 0) {
      if (['jar', 'bottle', 'shaker', 'canister', 'tin', 'can'].includes(unit.toLowerCase())) {
        jarCount = Math.max(1, Math.floor(totalQty));
      } else {
        // Each active batch represents 1 physical container/jar
        jarCount = Math.max(1, activeBatches.length);
      }
    }

    const jarsToShow = Math.min(jarCount, 6);
    for (let i = 0; i < jarsToShow; i++) {
      let jarLabel = '';
      let jarQty = totalQty;
      if (jarCount === 1) {
        jarLabel = `1 Jar • ${formatQuantityWithCulinaryFraction(totalQty).display} ${unit}`;
      } else {
        const batchQty = activeBatches[i]?.quantity;
        jarQty = batchQty !== undefined ? batchQty : totalQty / jarCount;
        const qtyDisplay = formatQuantityWithCulinaryFraction(jarQty).display;
        jarLabel = `Jar ${i + 1} • ${qtyDisplay} ${unit}`;
      }

      // Compute dynamic liquid / powder fill level
      const nominalCap = isGrams ? 100 : isMl ? 250 : 10;
      const fillPercent = Math.min(100, Math.max(12, Math.round((jarQty / nominalCap) * 100)));
      const fillStatus =
        fillPercent >= 85 ? 'Full' : fillPercent >= 60 ? '¾' : fillPercent >= 40 ? '½' : fillPercent >= 25 ? '¼' : 'Low';

      sprites.push({
        id: `${item.id}-jar-${i}`,
        fraction: 1,
        isPartial: false,
        isJar: true,
        jarIndex: i,
        jarLabel,
        fillPercent,
        fillStatus,
      });
    }
    overflowCount = Math.max(0, jarCount - 6);
  } else {
    // Discrete items with fractional slicing (1/8, 1/4, 1/3, 1/2, etc.)
    const wholeCount = Math.floor(totalQty);
    const remainder = snapToCulinaryFraction(totalQty - wholeCount);
    const wholeToShow = Math.min(wholeCount, maxSprites);

    for (let i = 0; i < wholeToShow; i++) {
      sprites.push({ id: `${item.id}-whole-${i}`, fraction: 1, isPartial: false });
    }

    if (remainder >= 0.04 && sprites.length < maxSprites) {
      const fracInfo = formatQuantityWithCulinaryFraction(remainder);
      sprites.push({
        id: `${item.id}-partial`,
        fraction: fracInfo.fractionValue,
        isPartial: true,
        fractionLabel: fracInfo.fractionLabel,
      });
    }

    const totalLogicalSprites = wholeCount + (remainder >= 0.04 ? 1 : 0);
    overflowCount = Math.max(0, totalLogicalSprites - maxSprites);
  }

  const handleSpriteDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
    spriteAmount: number = 1
  ) => {
    setIsDraggingAny(false);
    lastDragEndTimeRef.current = Date.now();

    // If movement is very small, treat as click/tap rather than a full drag
    const dragDistance = Math.hypot(info.offset.x, info.offset.y);
    if (dragDistance < 10) {
      return;
    }

    // Check if dropped near or over the prep station / sizzle pan
    const dropZone = document.getElementById('prep-board-dropzone') || document.getElementById('tactile-prep-board');
    let isOverDropZone = false;

    if (dropZone) {
      const rect = dropZone.getBoundingClientRect();
      const px = info.point.x;
      const py = info.point.y;
      if (px >= rect.left - 60 && px <= rect.right + 60 && py >= rect.top - 80 && py <= rect.bottom + 60) {
        isOverDropZone = true;
      }
    }
    
    // Also trigger if dropped in lower 25% of the screen
    if (!isOverDropZone && info.point.y >= window.innerHeight - 200) {
      isOverDropZone = true;
    }

    if (isOverDropZone) {
      setIsSlicing(true);
      setTimeout(() => setIsSlicing(false), 280);
      dropItemToPrepBoard(item, spriteAmount);
    } else {
      // Elastic return to shelf
      sound.playDropImpact();
    }
  };

  const handleSpriteClick = (e: React.MouseEvent, spriteAmount?: number) => {
    e.stopPropagation();
    // If a drag just ended, ignore the trailing synthetic click event!
    if (Date.now() - lastDragEndTimeRef.current < 400) {
      return;
    }
    const amountToUse = spriteAmount ?? (isSpice ? currentStep.val : 1);
    if (!isSpice) {
      sound.playKnifeChop();
      setIsSlicing(true);
      setTimeout(() => setIsSlicing(false), 280);
    } else {
      sound.playPop();
    }
    dropItemToPrepBoard(item, amountToUse);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const loc = primaryBatch ? primaryBatch.location : (isSpice ? 'pantry' : 'fridge');
    incrementItem(item.slug, loc, currentStep.val);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryBatch) {
      if (!isSpice) {
        sound.playKnifeChop();
        setIsSlicing(true);
        setTimeout(() => setIsSlicing(false), 280);
      }
      decrementBatch(primaryBatch.id, currentStep.val);
    }
  };

  const handleAddSecondJar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const loc = primaryBatch ? (primaryBatch.location === 'fridge' ? 'pantry' : 'counter') : 'pantry';
    const qty = primaryBatch ? primaryBatch.quantity : (isGrams ? 50 : 1);
    await addNewItemBatch({
      slug: item.slug,
      name: item.name,
      category: item.category,
      location: loc,
      quantity: qty,
      unit: item.defaultUnit,
    });
  };

  const handleQuickMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryBatch) return;
    const nextLoc: StorageLocation =
      primaryBatch.location === 'fridge' ? 'freezer' : primaryBatch.location === 'freezer' ? 'pantry' : 'fridge';
    moveBatchLocation(primaryBatch.id, nextLoc);
  };

  // Claude-style muted, refined freshness pills
  const freshnessConfig = {
    critical: {
      badgeBg: 'bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf]',
      border: 'border-[#f0d9cf]',
      label: `🚨 ${primaryBatch?.daysLeft ?? 0}d left`,
      glow: 'shadow-[0_2px_14px_-2px_rgba(204,90,53,0.12)]',
    },
    use_soon: {
      badgeBg: 'bg-[#fef6ee] text-[#a15c07] border border-[#fae4c8]',
      border: 'border-[#fae4c8]',
      label: `⏳ ${primaryBatch?.daysLeft ?? 2}d left`,
      glow: '',
    },
    fresh: {
      badgeBg: 'bg-[#edf5ee] text-[#2d5930] border border-[#d2e7d3]',
      border: 'border-[#e8e2d8]',
      label: `Fresh (${primaryBatch?.daysLeft ?? 7}d)`,
      glow: '',
    },
    expired: {
      badgeBg: 'bg-[#f0ebe1] text-[#685f54] border border-[#ded7cb]',
      border: 'border-[#ded7cb]',
      label: 'Expired',
      glow: 'opacity-75',
    },
  }[item.freshnessStatus || 'fresh'];

  const locationIcons: Record<StorageLocation, string> = {
    fridge: 'Fridge',
    freezer: 'Freezer',
    pantry: 'Cupboard',
    counter: 'Counter',
  };

  return (
    <div
      className={`group relative flex flex-col justify-between bg-white rounded-2xl p-4 sm:p-6 border border-[#e5dec9] hover:border-[#cfc5b4] shadow-xs transition-all duration-200 ${freshnessConfig.glow} ${isDraggingAny ? 'z-50' : 'z-0'}`}
    >
      {/* Top Header: Name, Edit Button, Category, Freshness Pill */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 pr-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#201b16] capitalize tracking-tight leading-snug truncate">
                {item.name}
              </h3>
              {onEditItem && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditItem(item);
                  }}
                  className="w-7 h-7 rounded-lg bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#787067] hover:text-[#cc5a35] flex items-center justify-center border border-[#e5dec9] transition-colors shrink-0"
                  title="Edit item name, category, or replace artwork"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs sm:text-sm font-sans text-[#787067] capitalize">
              {item.category} • {locationIcons[primaryBatch?.location || 'fridge']}
            </span>
          </div>

          {/* Freshness Badge */}
          {primaryBatch && (
            <button
              onClick={() => onEditBatch(primaryBatch, item)}
              className={`text-xs font-sans font-medium px-2.5 sm:px-3 py-1 rounded-full cursor-pointer transition-transform hover:scale-105 shrink-0 whitespace-nowrap ${freshnessConfig.badgeBg}`}
              title="Click to view and adjust expiration dates"
            >
              {freshnessConfig.label}
            </button>
          )}
        </div>

        {/* Tactile Visual Shelf Tray (overflow visible so sprites drag freely across screen) */}
        <div
          className="relative min-h-[124px] sm:min-h-[148px] bg-[#faf8f5] border border-[#e5dec9] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3 transition-colors group-hover:border-[#cc5a35]/40 touch-pan-y"
        >
          {/* Knife Blade Slash Flash Effect on Slice */}
          <AnimatePresence>
            {isSlicing && (
              <motion.div
                initial={{ opacity: 0, x: -100, y: -40 }}
                animate={{ opacity: [0, 1, 0], x: [-60, 140], y: [-30, 70] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden rounded-xl"
              >
                <div className="w-[180%] h-1 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,1),0_0_24px_rgba(204,90,53,0.8)] -rotate-12" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Visual Sprites with Framer Motion AnimatePresence */}
          <AnimatePresence mode="popLayout">
            {sprites.map((s, idx) => {
              const spriteAmount = s.isPartial ? s.fraction : (isSpice ? currentStep.val : 1);
              return (
                <motion.div
                  key={s.id}
                  layout
                  drag
                  dragSnapToOrigin
                  dragElastic={0.25}
                  whileDrag={{
                    scale: 1.25,
                    rotate: idx % 2 === 0 ? 8 : -8,
                    zIndex: 9999,
                    filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.35))',
                  }}
                  whileTap={{ scale: 0.95 }}
                  onDragStart={() => {
                    setIsDraggingAny(true);
                    sound.triggerHaptic('light');
                  }}
                  onDragEnd={(e, info) => {
                    handleSpriteDragEnd(e, info, spriteAmount);
                  }}
                  onClick={(e) => handleSpriteClick(e, spriteAmount)}
                initial={{ scale: 0, y: -12, rotate: idx % 2 === 0 ? -6 : 6 }}
                animate={{ scale: 1, y: 0, rotate: idx % 3 === 0 ? -3 : idx % 3 === 1 ? 3 : 0 }}
                exit={{
                  scale: 0,
                  y: -15,
                  opacity: 0,
                  rotate: idx % 2 === 0 ? 15 : -15,
                  transition: { duration: 0.18 },
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 25 }}
                className="relative select-none cursor-grab active:cursor-grabbing touch-none"
                title="Drag to Chef's Prep Pan or tap to chop on impact!"
              >
                {s.isJar ? (
                  /* Spice Bottle / Jar Display with tactile dynamic fill level gauge */
                  <div className="relative flex flex-col items-center justify-center p-1 hover:scale-105 transition-transform select-none">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
                      <Image
                        src={assetSrc}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="object-contain pointer-events-none drop-shadow-md max-h-16 sm:max-h-18"
                        priority={idx < 4}
                      />
                      {/* Dynamic Glass Level Gauge */}
                      <div
                        className="absolute -right-1 bottom-1 w-2.5 h-10 bg-[#e8e2d8]/90 rounded-full border border-white/80 overflow-hidden flex flex-col justify-end p-[1.5px] shadow-2xs backdrop-blur-xs"
                        title={`Fill level: ${s.fillPercent}% (${s.fillStatus})`}
                      >
                        <div
                          className="w-full rounded-full transition-all duration-300"
                          style={{
                            height: `${s.fillPercent}%`,
                            backgroundColor:
                              (s.fillPercent || 100) > 40
                                ? '#cc5a35'
                                : (s.fillPercent || 100) > 20
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        />
                      </div>
                    </div>
                    {s.jarLabel && (
                      <div className="mt-1 flex items-center space-x-1">
                        <span className="bg-[#201b16] text-[#faf8f5] text-[10px] font-mono font-medium px-2 py-0.5 rounded-full shadow-xs border border-white/30 whitespace-nowrap leading-none tracking-tight">
                          {s.jarLabel}
                        </span>
                        {s.fillStatus && (
                          <span
                            className={`text-[9px] font-sans font-bold px-1 py-0.5 rounded border leading-none ${
                              s.fillStatus === 'Low'
                                ? 'bg-[#faeee8] text-[#cc5a35] border-[#f0d9cf]'
                                : 'bg-[#f4efe6] text-[#6b6255] border-[#e2dacb]'
                            }`}
                          >
                            {s.fillStatus}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : !s.isPartial ? (
                  /* Full Whole Sprite */
                  <div className="relative w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center hover:scale-110 transition-transform">
                    <Image
                      src={assetSrc}
                      alt={item.name}
                      width={72}
                      height={72}
                      className="object-contain pointer-events-none drop-shadow-sm"
                      priority={idx < 4}
                    />
                  </div>
                ) : (
                  /* Fractional Cut Slice Sprite (1/8, 1/4, 1/3, 1/2, etc.) */
                  <div className="relative w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center hover:scale-110 transition-transform">
                    {/* Background Silhouette Ghost: full item faded so original shape is recognizable */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-25 grayscale pointer-events-none">
                      <Image
                        src={assetSrc}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="object-contain"
                      />
                    </div>

                    {/* Foreground Clipped Slice */}
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{
                        clipPath: `inset(0 ${Math.round((1 - s.fraction) * 1000) / 10}% 0 0)`,
                      }}
                    >
                      <Image
                        src={assetSrc}
                        alt={item.name}
                        width={72}
                        height={72}
                        className="object-contain drop-shadow-sm"
                      />
                    </div>

                    {/* Knife Cut Line Edge */}
                    <div
                      className="absolute top-1 bottom-1 w-[1.5px] border-r border-dashed border-[#cc5a35]/80 pointer-events-none"
                      style={{
                        left: `${Math.round(s.fraction * 1000) / 10}%`,
                      }}
                    />

                    {/* Fraction Pill Tag */}
                    <span className="absolute -bottom-1 -right-1 z-10 bg-[#201b16] text-[#faf8f5] text-[10px] font-sans font-bold px-1.5 py-0.5 rounded-full shadow-xs border border-white/60 leading-none">
                      {s.fractionLabel}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>

          {/* Quick "Add 2nd Jar" option for spices when only 1 jar exists */}
          {isSpice && sprites.length === 1 && totalQty > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              type="button"
              onClick={handleAddSecondJar}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-[#cc5a35]/40 hover:border-[#cc5a35] text-[#8a3319] hover:bg-[#faeee8] text-xs font-sans font-medium transition-all flex items-center space-x-1 shadow-2xs self-center"
              title="Add a 2nd jar/bottle of this spice to your shelf"
            >
              <Plus className="w-3.5 h-3.5 text-[#cc5a35]" />
              <span>+ 2nd Jar</span>
            </motion.button>
          )}

          {/* If 0 items, display empty outline */}
          {totalQty <= 0 && (
            <motion.button
              type="button"
              onClick={handleIncrement}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-6 text-[#8c8276] hover:text-[#cc5a35] flex flex-col items-center space-y-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-7 h-7 opacity-50" />
              <span className="text-base font-serif italic">
                {isSpice ? 'Empty jar • Tap to stock' : 'Empty • Tap to stock'}
              </span>
            </motion.button>
          )}

          {/* Overflow Multiplier Pill */}
          {overflowCount > 0 && (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="bg-[#201b16] text-[#faf8f5] text-xs sm:text-sm font-sans font-semibold px-3 py-1 rounded-full"
            >
              +{overflowCount} more
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick Step Selector Chips */}
      <div className="mt-3 pt-2.5 border-t border-[#efeae1] flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-sans font-semibold text-[#8c8276] uppercase tracking-wider shrink-0">
          Step
        </span>
        <div className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar">
          {availableSteps.map((st, idx) => {
            const isSelected = (stepIdx % availableSteps.length) === idx;
            return (
              <button
                key={st.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStepIdx(idx);
                }}
                className={`px-2 py-0.5 text-xs font-sans rounded-lg border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-[#cc5a35] text-white border-[#cc5a35] font-semibold shadow-2xs'
                    : 'bg-white hover:bg-[#faf8f5] text-[#685f54] border-[#e5dec9]'
                }`}
              >
                ±{st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="mt-2 pt-2 border-t border-dashed border-[#efeae1] flex items-center justify-between gap-2">
        {/* Quantity display with fractions */}
        <div className="flex items-baseline space-x-1.5 shrink-0">
          <span className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16]">
            {formatQuantityWithCulinaryFraction(totalQty).display}
          </span>
          <span className="text-sm sm:text-base font-sans text-[#787067]">{unit}</span>
        </div>

        {/* Stepper Buttons & Actions */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Decrement Stepper */}
          <button
            onClick={handleDecrement}
            disabled={totalQty <= 0}
            className="w-10 h-10 rounded-xl bg-[#f2ede4] hover:bg-[#e5dec9] active:scale-90 disabled:opacity-30 text-[#201b16] flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title={`Use ${currentStep.label} (Decrease item)`}
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Increment Stepper */}
          <button
            onClick={handleIncrement}
            className="w-10 h-10 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] active:scale-90 text-white flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer"
            title={`Add ${currentStep.label} (Spawn visual item)`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Direct "Chop to Pan" Button */}
          <button
            onClick={handleSpriteClick}
            disabled={totalQty <= 0}
            className="w-10 h-10 rounded-xl bg-[#faeee8] hover:bg-[#f5e3db] active:scale-90 text-[#9e3a19] flex items-center justify-center transition-all border border-[#f0d9cf] shrink-0 disabled:opacity-30 cursor-pointer"
            title="Chop 1 portion into Cooking Pan on impact"
          >
            <Utensils className="w-4 h-4" />
          </button>

          {/* Item Management Popover Menu (Move, Dates, Edit, Delete) */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all border shrink-0 cursor-pointer ${
                mobileMenuOpen
                  ? 'bg-[#201b16] text-white border-[#201b16]'
                  : 'bg-white hover:bg-[#f2ede4] text-[#5c5349] border-[#e5dec9]'
              }`}
              title="More item actions (Move, Dates, Delete)"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {mobileMenuOpen && (
              <>
                {/* Backdrop to close menu on click outside */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMobileMenuOpen(false);
                  }}
                />

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 bottom-12 w-52 bg-white border border-[#e5dec9] rounded-2xl shadow-xl p-1.5 z-50 flex flex-col space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150"
                >
                  {primaryBatch && (
                    <button
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        handleQuickMove(e);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-[#787067]" />
                      <span>Move Location ({locationIcons[primaryBatch.location || 'fridge']})</span>
                    </button>
                  )}

                  {primaryBatch && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onEditBatch(primaryBatch, item);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-[#787067]" />
                      <span>Expiry &amp; Dates</span>
                    </button>
                  )}

                  {onEditItem && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onEditItem(item);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 text-[#787067]" />
                      <span>Edit Custom Asset</span>
                    </button>
                  )}

                  <div className="h-px bg-[#efeae1] my-0.5" />

                  <button
                    onClick={(e) => {
                      handleDelete(e);
                      if (confirmDelete) setMobileMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium rounded-xl flex items-center space-x-2 transition-colors cursor-pointer ${
                      confirmDelete
                        ? 'bg-[#cc5a35] text-white font-semibold'
                        : 'text-[#b34b29] hover:bg-[#faeee8]'
                    }`}
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>{confirmDelete ? 'Confirm Delete (Sure?)' : 'Delete Asset'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
