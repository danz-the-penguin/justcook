'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { AddNewGroupModal } from './AddNewGroupModal';

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

const BREAD_STEPS = [
  { label: '1 slice', val: 1 },
  { label: '½ slice', val: 0.5 },
  { label: '2 slices', val: 2 },
  { label: '¼ slice', val: 0.25 },
  { label: '4 slices', val: 4 },
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

export function TactileAssetCardComponent({ item, onEditBatch, onEditItem }: TactileAssetCardProps) {
  const incrementItem = usePantryStore((s) => s.incrementItem);
  const incrementBatch = usePantryStore((s) => s.incrementBatch);
  const decrementBatch = usePantryStore((s) => s.decrementBatch);
  const moveBatchLocation = usePantryStore((s) => s.moveBatchLocation);
  const deleteAsset = usePantryStore((s) => s.deleteAsset);
  const addNewItemBatch = usePantryStore((s) => s.addNewItemBatch);
  const dropItemToPrepBoard = usePantryStore((s) => s.dropItemToPrepBoard);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [isSlicing, setIsSlicing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [focusedBatchId, setFocusedBatchId] = useState<string | null>(null);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isToasted, setIsToasted] = useState(false);
  const lastDragEndTimeRef = useRef<number>(0);

  const getProduceRipenessFilter = (daysLeft?: number) => {
    if (isSpice) return undefined;
    if (isBread && isToasted) {
      return 'sepia(0.65) saturate(1.4) contrast(1.1) brightness(0.92)';
    }
    if (isBread || daysLeft === undefined) return undefined;
    if (daysLeft <= 0) {
      return 'grayscale(35%) brightness(90%) contrast(95%)';
    }
    if (daysLeft <= 2) {
      return 'saturate(125%) sepia(15%)';
    }
    return undefined;
  };

  const primaryBatch = item.batches[0];
  const focusedBatch = item.batches.find((b) => b.id === focusedBatchId) || null;
  const targetBatch = focusedBatch || primaryBatch;
  const unit = item.defaultUnit;
  const isSpice = isSpiceOrJarItem(item.category, unit, item.slug);
  const isGrams = ['g', 'gram', 'grams'].includes(unit.toLowerCase());
  const isMl = ['ml', 'milliliter'].includes(unit.toLowerCase());

  const isBread =
    item.slug === 'bread' ||
    item.name.toLowerCase().includes('bread') ||
    ['slice', 'slices', 'loaf', 'loaves'].includes(unit.toLowerCase());

  const getLoafCapacity = (batch?: PantryBatchData | null): number => {
    return batch?.slicesPerLoaf || 8;
  };

  const getBreadSlices = (qty: number, unitStr: string, capacity: number = 8) => {
    const norm = (unitStr || '').toLowerCase().trim();
    if (norm === 'loaf' || norm === 'loaves') return snapToCulinaryFraction(qty * capacity);
    return snapToCulinaryFraction(qty);
  };

  const activeBatches = item.batches.filter((b) => b.quantity > (isSpice ? 0 : 0.005));
  const hasMultipleBatches = activeBatches.length > 1;

  const totalBreadSlices = activeBatches.reduce(
    (acc, b) => acc + getBreadSlices(b.quantity, b.unit, getLoafCapacity(b)),
    0
  );
  const totalBreadLoaves = activeBatches.reduce((acc, b) => {
    const cap = getLoafCapacity(b);
    const s = getBreadSlices(b.quantity, b.unit, cap);
    return acc + Math.ceil(s / cap);
  }, 0) || (totalBreadSlices > 0 ? 1 : 0);

  const activeLoafCap = getLoafCapacity(targetBatch || primaryBatch);
  const dynamicBreadSteps = [
    { label: '1 slice', val: 1 },
    { label: '½ slice', val: 0.5 },
    { label: '2 slices', val: 2 },
    { label: '¼ slice', val: 0.25 },
    { label: `${Math.max(1, Math.round(activeLoafCap / 2))} slices (½ loaf)`, val: activeLoafCap / 2 },
  ];

  const availableSteps = isBread
    ? dynamicBreadSteps
    : isSpice && isGrams
    ? SPICE_STEPS_GRAMS
    : isSpice && isMl
    ? SPICE_STEPS_ML
    : FRACTION_STEPS;

  const currentStep = availableSteps[stepIdx % availableSteps.length];
  const totalQty = isSpice ? item.totalQuantity : snapToCulinaryFraction(item.totalQuantity);
  const assetSrc = resolveFoodAsset(item.slug, item.category);

  useEffect(() => {
    if (focusedBatchId && !item.batches.some((b) => b.id === focusedBatchId)) {
      setFocusedBatchId(null);
    }
  }, [item.batches, focusedBatchId]);

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
    batchId?: string;
    batchIndex?: number;
    daysLeft?: number;
    freshness?: 'fresh' | 'use_soon' | 'critical' | 'expired';
    fraction: number;
    isPartial: boolean;
    fractionLabel?: string;
    breadSliceLabel?: string;
    sizeTier: 'small' | 'medium' | 'large';
    scaleFactor: number;
    isJar?: boolean;
    jarIndex?: number;
    jarLabel?: string;
    fillPercent?: number;
    fillStatus?: string;
  }

  const sprites: SpriteItem[] = [];
  let overflowCount = 0;
  const displayedBatches = focusedBatch ? [focusedBatch] : activeBatches;

  if (isSpice) {
    // For spices weighed in grams, only one item should be displayed,
    // or in a small bottle or jar, unless there are two jars/bottles!
    let jarCount = 0;
    if (totalQty > 0) {
      if (['jar', 'bottle', 'shaker', 'canister', 'tin', 'can'].includes(unit.toLowerCase())) {
        jarCount = Math.max(1, Math.floor(focusedBatch ? focusedBatch.quantity : totalQty));
      } else {
        // Each displayed batch represents 1 physical container/jar
        jarCount = Math.max(1, displayedBatches.length);
      }
    }

    const jarsToShow = Math.min(jarCount, 6);
    for (let i = 0; i < jarsToShow; i++) {
      let jarLabel = '';
      let jarQty = totalQty;
      if (jarCount === 1) {
        const q = focusedBatch ? focusedBatch.quantity : totalQty;
        jarLabel = `1 Jar • ${formatQuantityWithCulinaryFraction(q).display} ${unit}`;
      } else {
        const batchQty = displayedBatches[i]?.quantity;
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
        batchId: displayedBatches[i]?.id,
        batchIndex: i,
        daysLeft: displayedBatches[i]?.daysLeft,
        freshness: displayedBatches[i]?.freshness,
        fraction: 1,
        isPartial: false,
        sizeTier: 'medium',
        scaleFactor: 1.0,
        isJar: true,
        jarIndex: i,
        jarLabel,
        fillPercent,
        fillStatus,
      });
    }
    overflowCount = Math.max(0, jarCount - 6);
  } else if (isBread) {
    // BREAD LOAF & SLICE ARCHITECTURE:
    // 1 Loaf = N slices (configured by edit, default 8). One loaf is one asset, two loaves are two assets.
    // Stepping minuses or adds in slices (1 slice, 1/2 slice, etc.)
    // Visual loaf reduces 1/N on slice without making the asset disappear until 0 slices remain!
    let spritesAdded = 0;
    let totalLogicalLoaves = 0;

    for (let bIdx = 0; bIdx < displayedBatches.length; bIdx++) {
      const batch = displayedBatches[bIdx];
      if (spritesAdded >= maxSprites) break;

      const sizeTier: 'small' | 'medium' | 'large' = batch.size || 'medium';
      const scaleFactor = sizeTier === 'small' ? 0.82 : sizeTier === 'large' ? 1.22 : 1.0;
      const capacity = getLoafCapacity(batch);
      const bSlices = getBreadSlices(batch.quantity, batch.unit, capacity);

      const fullLoaves = Math.floor((bSlices + 0.0001) / capacity);
      const remSlices = snapToCulinaryFraction(bSlices - fullLoaves * capacity);
      const loavesInBatch = fullLoaves + (remSlices >= 0.04 ? 1 : 0);
      totalLogicalLoaves += loavesInBatch;

      // Full whole loaves in this batch
      const fullToShow = Math.min(fullLoaves, maxSprites - spritesAdded);
      for (let i = 0; i < fullToShow; i++) {
        sprites.push({
          id: `${batch.id}-loaf-full-${i}`,
          batchId: batch.id,
          batchIndex: bIdx,
          daysLeft: batch.daysLeft,
          freshness: batch.freshness,
          fraction: 1,
          isPartial: false,
          breadSliceLabel: `${capacity} slices`,
          sizeTier,
          scaleFactor,
        });
        spritesAdded++;
      }

      // Partial loaf with remaining slices in this batch (does not disappear!)
      if (remSlices >= 0.04 && spritesAdded < maxSprites) {
        const fracInfo = formatQuantityWithCulinaryFraction(remSlices);
        const loafFraction = Math.min(1, Math.max(0.0625, remSlices / capacity));
        sprites.push({
          id: `${batch.id}-loaf-partial`,
          batchId: batch.id,
          batchIndex: bIdx,
          daysLeft: batch.daysLeft,
          freshness: batch.freshness,
          fraction: loafFraction,
          isPartial: true,
          fractionLabel: `${fracInfo.display}/${capacity} slices`,
          breadSliceLabel: `${fracInfo.display}/${capacity} slices`,
          sizeTier,
          scaleFactor,
        });
        spritesAdded++;
      }
    }

    overflowCount = Math.max(0, totalLogicalLoaves - maxSprites);
  } else if (displayedBatches.length > 0) {
      let spritesAdded = 0;

      for (let bIdx = 0; bIdx < displayedBatches.length; bIdx++) {
        const batch = displayedBatches[bIdx];
        if (spritesAdded >= maxSprites) break;

        const sizeTier: 'small' | 'medium' | 'large' = batch.size || 'medium';
        const scaleFactor = sizeTier === 'small' ? 0.8 : sizeTier === 'large' ? 1.25 : 1.0;
        const bQty = snapToCulinaryFraction(batch.quantity);
        const wholeCount = Math.floor(bQty);
        const remainder = snapToCulinaryFraction(bQty - wholeCount);

        const wholeToShow = Math.min(wholeCount, maxSprites - spritesAdded);
        for (let i = 0; i < wholeToShow; i++) {
          sprites.push({
            id: `${batch.id}-whole-${i}`,
            batchId: batch.id,
            batchIndex: bIdx,
            daysLeft: batch.daysLeft,
            freshness: batch.freshness,
            fraction: 1,
            isPartial: false,
            sizeTier,
            scaleFactor,
          });
          spritesAdded++;
        }

        if (remainder >= 0.04 && spritesAdded < maxSprites) {
          const fracInfo = formatQuantityWithCulinaryFraction(remainder);
          sprites.push({
            id: `${batch.id}-partial`,
            batchId: batch.id,
            batchIndex: bIdx,
            daysLeft: batch.daysLeft,
            freshness: batch.freshness,
            fraction: fracInfo.fractionValue,
            isPartial: true,
            fractionLabel: fracInfo.fractionLabel,
            sizeTier,
            scaleFactor,
          });
          spritesAdded++;
        }
      }

      const totalLogicalSprites = displayedBatches.reduce((acc, b) => {
        const w = Math.floor(b.quantity);
        const r = snapToCulinaryFraction(b.quantity - w);
        return acc + w + (r >= 0.04 ? 1 : 0);
      }, 0);
      overflowCount = Math.max(0, totalLogicalSprites - maxSprites);
    } else {
      // Fallback for empty or newly generated items
      const wholeCount = Math.floor(totalQty);
      const remainder = snapToCulinaryFraction(totalQty - wholeCount);
      const wholeToShow = Math.min(wholeCount, maxSprites);

      for (let i = 0; i < wholeToShow; i++) {
        sprites.push({
          id: `${item.id}-whole-${i}`,
          batchId: primaryBatch?.id,
          fraction: 1,
          isPartial: false,
          sizeTier: 'medium',
          scaleFactor: 1.0,
        });
      }

      if (remainder >= 0.04 && sprites.length < maxSprites) {
        const fracInfo = formatQuantityWithCulinaryFraction(remainder);
        sprites.push({
          id: `${item.id}-partial`,
          batchId: primaryBatch?.id,
          fraction: fracInfo.fractionValue,
          isPartial: true,
          fractionLabel: fracInfo.fractionLabel,
          sizeTier: 'medium',
          scaleFactor: 1.0,
        });
      }

      const totalLogicalSprites = wholeCount + (remainder >= 0.04 ? 1 : 0);
      overflowCount = Math.max(0, totalLogicalSprites - maxSprites);
    }

  const handleSpriteDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
    spriteAmount: number = 1,
    targetBatchId?: string
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
      dropItemToPrepBoard(item, spriteAmount, targetBatchId);
    } else {
      // Elastic return to shelf
      sound.playDropImpact();
    }
  };

  const handleSpriteClick = (e: React.MouseEvent, _spriteAmount?: number, targetBatchId?: string) => {
    e.stopPropagation();
    // If a drag just ended, ignore the trailing synthetic click event!
    if (Date.now() - lastDragEndTimeRef.current < 400) {
      return;
    }
    const batchToFocus = targetBatchId || primaryBatch?.id;
    if (!batchToFocus) return;

    sound.triggerHaptic('light');
    sound.playWoodTap();
    setFocusedBatchId((prev) => (prev === batchToFocus ? null : batchToFocus));
  };

  const handleChopToPan = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = targetBatch || primaryBatch;
    const amountToUse = isSpice ? currentStep.val : isBread ? currentStep.val : 1;
    if (!isSpice) {
      sound.playKnifeChop();
      setIsSlicing(true);
      setTimeout(() => setIsSlicing(false), 280);
    } else {
      sound.playPop();
    }
    dropItemToPrepBoard(item, amountToUse, target?.id);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetBatch) {
      const isLoafUnit = ['loaf', 'loaves'].includes((targetBatch.unit || '').toLowerCase());
      const cap = getLoafCapacity(targetBatch);
      const stepVal = isBread && isLoafUnit ? currentStep.val / cap : currentStep.val;
      incrementBatch(targetBatch.id, stepVal);
    } else {
      const loc: StorageLocation = isSpice ? 'pantry' : 'fridge';
      const isLoafUnit = ['loaf', 'loaves'].includes(unit.toLowerCase());
      const cap = getLoafCapacity(primaryBatch);
      const stepVal = isBread && isLoafUnit ? currentStep.val / cap : currentStep.val;
      incrementItem(item.slug, loc, stepVal);
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetBatch) {
      if (!isSpice) {
        sound.playKnifeChop();
      }
      const isLoafUnit = ['loaf', 'loaves'].includes((targetBatch.unit || '').toLowerCase());
      const cap = getLoafCapacity(targetBatch);
      const stepVal = isBread && isLoafUnit ? currentStep.val / cap : currentStep.val;
      decrementBatch(targetBatch.id, stepVal);
    }
  };

  const handleAddNewBatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const loc: StorageLocation = primaryBatch ? primaryBatch.location : (isSpice ? 'pantry' : 'fridge');
    const defaultQty = isSpice ? (isGrams ? 50 : 1) : 1;
    await addNewItemBatch({
      slug: item.slug,
      name: item.name,
      category: item.category,
      location: loc,
      quantity: defaultQty,
      unit: item.defaultUnit,
      slicesPerLoaf: isBread ? getLoafCapacity(primaryBatch) : undefined,
    });
  };

  const handleAddSecondJar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleAddNewBatch(e);
  };

  const handleQuickMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryBatch) return;
    const nextLoc: StorageLocation =
      primaryBatch.location === 'fridge' ? 'freezer' : primaryBatch.location === 'freezer' ? 'pantry' : 'fridge';
    moveBatchLocation(primaryBatch.id, nextLoc);
  };

  const activeBatchForFreshness = targetBatch || primaryBatch;
  const activeDaysLeft = activeBatchForFreshness?.daysLeft ?? 7;
  const activeStatus = activeBatchForFreshness?.freshness || item.freshnessStatus || 'fresh';

  // Claude-style muted, refined freshness pills
  const freshnessConfig = {
    critical: {
      badgeBg: 'bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf]',
      border: 'border-[#f0d9cf]',
      label: `🚨 ${activeDaysLeft}d left`,
      glow: 'shadow-[0_2px_14px_-2px_rgba(204,90,53,0.12)]',
    },
    use_soon: {
      badgeBg: 'bg-[#fef6ee] text-[#a15c07] border border-[#fae4c8]',
      border: 'border-[#fae4c8]',
      label: `⏳ ${activeDaysLeft}d left`,
      glow: '',
    },
    fresh: {
      badgeBg: 'bg-[#edf5ee] text-[#2d5930] border border-[#d2e7d3]',
      border: 'border-[#e8e2d8]',
      label: `Fresh (${activeDaysLeft}d)`,
      glow: '',
    },
    expired: {
      badgeBg: 'bg-[#f0ebe1] text-[#685f54] border border-[#ded7cb]',
      border: 'border-[#ded7cb]',
      label: 'Expired',
      glow: 'opacity-75',
    },
  }[activeStatus];

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
      {/* Top Header: Unclipped Name, Edit Button, Freshness Pill & Group Controls */}
      <div>
        {/* Row 1: Hero Food Name & Freshness Status Badge */}
        <div className="flex items-start justify-between gap-2.5 mb-1.5">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <h3
              title={item.name}
              className="font-serif text-xl sm:text-2xl font-medium text-[#201b16] capitalize tracking-tight leading-snug break-words"
            >
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

          {/* Primary Freshness Pill */}
          {targetBatch && (
            <button
              onClick={() => onEditBatch(targetBatch, item)}
              className={`text-xs font-sans font-medium px-2.5 sm:px-3 py-1 rounded-full cursor-pointer transition-transform hover:scale-105 shrink-0 whitespace-nowrap ${freshnessConfig.badgeBg}`}
              title="Click to view and adjust expiration dates"
            >
              {freshnessConfig.label}
            </button>
          )}
        </div>

        {/* Row 2: Category, Location, and Multi-Batch Controls */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs sm:text-sm font-sans text-[#787067] capitalize">
            {item.category} • {locationIcons[primaryBatch?.location || 'fridge']}
          </span>

          <div className="flex items-center space-x-1.5 shrink-0">
            {hasMultipleBatches && (
              <span
                className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#6b6255] border border-[#ded7cb]"
                title={`${activeBatches.length} separate batches with different expiry dates or sizes`}
              >
                {activeBatches.length} groups
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsAddGroupModalOpen(true)}
              className="text-xs font-sans font-medium px-2.5 py-1 rounded-full bg-white hover:bg-[#faeee8] text-[#cc5a35] border border-dashed border-[#cc5a35]/60 flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
              title="Add another group with chosen physical size, loaf slices, or expiry date"
            >
              <Plus className="w-3 h-3" />
              <span>Group</span>
            </button>
          </div>
        </div>

        {/* Tactile Visual Shelf Tray (overflow visible so sprites drag freely across screen) */}
        <div
          onClick={() => {
            if (focusedBatchId) {
              setFocusedBatchId(null);
            }
          }}
          className="relative min-h-[170px] sm:min-h-[200px] bg-[#faf8f5] border border-[#e5dec9] rounded-2xl p-3 sm:p-4 flex flex-col justify-between transition-colors group-hover:border-[#cc5a35]/40 touch-pan-y"
        >
          {/* Artisanal Segmented Group Filter Tabs */}
          {hasMultipleBatches && !isSpice && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-[#efeae1]/80 overflow-x-auto no-scrollbar z-20"
            >
              <div className="flex items-center space-x-1.5">
                {/* "All" Segment Tab */}
                <button
                  type="button"
                  onClick={() => {
                    setFocusedBatchId(null);
                    sound.playWoodTap();
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-sans transition-all shrink-0 cursor-pointer ${
                    !focusedBatchId
                      ? 'bg-[#201b16] text-[#faf8f5] font-medium shadow-2xs'
                      : 'bg-white hover:bg-[#f2ede4] text-[#685f54] border border-[#e5dec9]'
                  }`}
                >
                  All ({isBread ? `${totalBreadLoaves} loaves` : formatQuantityWithCulinaryFraction(totalQty).display})
                </button>

                {/* Individual Group Tabs */}
                {activeBatches.map((b, idx) => {
                  const isBSelected = focusedBatchId === b.id;
                  const days = b.daysLeft ?? 7;
                  const isUrgent = days <= 1;
                  const isSoon = days <= 3 && !isUrgent;
                  const cap = getLoafCapacity(b);
                  const sizeName = isBread
                    ? `Loaf ${idx + 1}`
                    : b.size
                    ? b.size.charAt(0).toUpperCase() + b.size.slice(1)
                    : `Group ${idx + 1}`;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setFocusedBatchId(b.id);
                        sound.playWoodTap();
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-sans transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
                        isBSelected
                          ? 'bg-[#cc5a35] text-white font-medium shadow-2xs'
                          : 'bg-white hover:bg-[#faeee8] text-[#3d362e] border border-[#e5dec9]'
                      }`}
                      title={isBread ? `${sizeName}: ${cap} slices capacity • ${days}d left` : `${sizeName}: ${formatQuantityWithCulinaryFraction(b.quantity).display} ${unit} • ${days}d left`}
                    >
                      <span>{sizeName}</span>
                      <span className="font-mono text-[11px] opacity-85">
                        {isBread ? `${cap} sl` : formatQuantityWithCulinaryFraction(b.quantity).display}
                      </span>
                      {isUrgent ? (
                        <span className="text-[10px] font-bold text-red-500">🚨 1d</span>
                      ) : isSoon ? (
                        <span className="text-[10px] font-bold text-amber-600">⏳ {days}d</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Add New Group Button */}
              <button
                type="button"
                onClick={() => setIsAddGroupModalOpen(true)}
                className="w-7 h-7 rounded-xl bg-white hover:bg-[#faeee8] text-[#cc5a35] hover:text-[#9e3a19] border border-dashed border-[#cc5a35]/50 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs"
                title="Add another group with chosen size, slices, or expiry date"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Group Context Strip (Slim & Elegant - no duplicate stepper buttons) */}
          <AnimatePresence>
            {focusedBatch && (
              <motion.div
                key={focusedBatch.id}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full overflow-hidden z-20"
              >
                <div className="w-full px-2.5 py-1 rounded-xl bg-[#faeee8] border border-[#f0d9cf] flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#cc5a35] ring-2 ring-[#cc5a35]/30 animate-pulse shrink-0" />
                    <span className="font-serif font-medium text-[#201b16] capitalize">
                      {isBread
                        ? `Loaf ${activeBatches.findIndex((b) => b.id === focusedBatch.id) + 1} (${focusedBatch.size || 'medium'}):`
                        : `${focusedBatch.size || 'medium'} Group:`}
                    </span>
                    <span className="font-mono font-bold text-[#cc5a35]">
                      {isBread
                        ? `${formatQuantityWithCulinaryFraction(getBreadSlices(focusedBatch.quantity, focusedBatch.unit, getLoafCapacity(focusedBatch))).display}/${getLoafCapacity(focusedBatch)} slices`
                        : `${formatQuantityWithCulinaryFraction(focusedBatch.quantity).display} ${unit}`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => onEditBatch(focusedBatch, item)}
                      className="text-[11px] font-sans font-medium px-2 py-0.5 rounded-md bg-white hover:bg-[#fff9f5] border border-[#f0d9cf] text-[#8a3319] hover:text-[#cc5a35] flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                      title={isBread ? "Edit slices for this loaf, expiry date, or size" : "Edit expiry date or size"}
                    >
                      <Pencil className="w-3 h-3 text-[#cc5a35]" />
                      <span>
                        {isBread
                          ? `Edit Slices (${getLoafCapacity(focusedBatch)})`
                          : focusedBatch.daysLeft !== undefined
                          ? focusedBatch.daysLeft <= 0
                            ? '🚨 Expired'
                            : focusedBatch.daysLeft === 1
                            ? '🚨 1d left'
                            : `Fresh (${focusedBatch.daysLeft}d)`
                          : 'Edit Group'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFocusedBatchId(null)}
                      className="text-xs text-[#8c8276] hover:text-[#201b16] px-1 hover:bg-white rounded transition-colors cursor-pointer"
                      title="View all groups"
                    >
                      ✕ Show All
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Knife Blade Slash Warm Gleam on Chop to Pan / Prep Drop */}
          <AnimatePresence>
            {isSlicing && (
              <motion.div
                initial={{ opacity: 0, x: -100, y: -40 }}
                animate={{ opacity: [0, 0.9, 0], x: [-60, 140], y: [-30, 70] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-hidden rounded-2xl"
              >
                <div className="w-[180%] h-1 bg-gradient-to-r from-transparent via-[#fff5eb] to-transparent shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_20px_rgba(204,90,53,0.6)] -rotate-12" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Visual Sprites Area: Responsive, elegant layout */}
          <div className="w-full flex-1 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 py-1.5">
            <AnimatePresence mode="popLayout">
              {sprites.map((s, idx) => {
                const spriteAmount = isBread ? currentStep.val : s.isPartial ? s.fraction : isSpice ? currentStep.val : 1;
                const isFocused = Boolean(s.batchId && s.batchId === focusedBatchId);
                const isCompact = sprites.length > 4;
                const spriteSizeClass = isCompact
                  ? 'w-16 h-16 sm:w-20 sm:h-20'
                  : 'w-20 h-20 sm:w-24 sm:h-24';
                const imageSize = isCompact ? 80 : 96;

                return (
                  <motion.div
                    key={s.id}
                    layout="position"
                    drag
                    dragSnapToOrigin
                    dragElastic={0.25}
                    whileHover={{ scale: s.scaleFactor * 1.05 }}
                    whileDrag={{
                      scale: s.scaleFactor * 1.15,
                      rotate: idx % 2 === 0 ? 5 : -5,
                      zIndex: 9999,
                      opacity: 0.95,
                    }}
                    whileTap={{ scale: s.scaleFactor * 0.95 }}
                    onDragStart={() => {
                      setIsDraggingAny(true);
                      sound.triggerHaptic('light');
                    }}
                    onDragEnd={(e, info) => {
                      handleSpriteDragEnd(e, info, spriteAmount, s.batchId);
                    }}
                    onClick={(e) => handleSpriteClick(e, spriteAmount, s.batchId)}
                    initial={{ scale: 0.72, opacity: 0, y: -6 }}
                    animate={{
                      scale: s.scaleFactor,
                      opacity: 1,
                      y: 0,
                      rotate: idx % 3 === 0 ? -2 : idx % 3 === 1 ? 2 : 0,
                    }}
                    exit={{
                      scale: 0.68,
                      opacity: 0,
                      transition: { duration: 0.18, ease: 'easeOut' },
                    }}
                    transition={{
                      layout: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
                      scale: { type: 'spring', stiffness: 380, damping: 28 },
                      opacity: { duration: 0.2, ease: 'easeOut' },
                      rotate: { type: 'spring', stiffness: 350, damping: 28 },
                    }}
                    className={`relative select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-[box-shadow,background-color,opacity] duration-200 ease-out ${
                      isFocused
                        ? 'rounded-2xl ring-2 ring-[#cc5a35] ring-offset-2 ring-offset-[#faf8f5] bg-white shadow-sm p-1.5 z-20'
                        : focusedBatchId
                        ? 'opacity-35 hover:opacity-85 p-1.5'
                        : 'p-1.5'
                    }`}
                    title={`${item.name} (${s.sizeTier.toUpperCase()}${s.isPartial ? ` • ${s.fractionLabel}` : ''}) • Tap to focus & adjust, or drag to pan`}
                  >
                  {s.isJar ? (
                    /* Spice Bottle / Jar Display with tactile dynamic fill level gauge */
                    <div className="relative flex flex-col items-center justify-center p-1 select-none">
                      <div className={`relative ${spriteSizeClass} flex items-center justify-center`}>
                        <Image
                          src={assetSrc}
                          alt={item.name}
                          width={imageSize}
                          height={imageSize}
                          className="object-contain pointer-events-none drop-shadow-md max-h-full max-w-full"
                          priority={idx < 4}
                        />
                        {/* Dynamic Glass Level Gauge */}
                        <div
                          className="absolute -right-1 bottom-1 w-3 h-12 bg-[#e8e2d8]/90 rounded-full border border-white/80 overflow-hidden flex flex-col justify-end p-[1.5px] shadow-2xs backdrop-blur-xs"
                          title={`Fill level: ${s.fillPercent}% (${s.fillStatus})`}
                        >
                          <div
                            className="w-full rounded-full transition-[height,background-color] duration-500 ease-out"
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
                        <div className="mt-1.5 flex items-center space-x-1">
                          <span className="bg-[#201b16] text-[#faf8f5] text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full shadow-xs border border-white/30 whitespace-nowrap leading-none tracking-tight">
                            {s.jarLabel}
                          </span>
                          {s.fillStatus && (
                            <span
                              className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded border leading-none ${
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
                    /* Full Whole Sprite - Spacious & Clear */
                    <div className={`relative ${spriteSizeClass} flex items-center justify-center`}>
                      <Image
                        src={assetSrc}
                        alt={item.name}
                        width={imageSize}
                        height={imageSize}
                        style={{ filter: getProduceRipenessFilter(s.daysLeft) }}
                        className="object-contain pointer-events-none drop-shadow-sm max-h-full max-w-full transition-[filter] duration-300"
                        priority={idx < 4}
                      />
                      {/* Urgent Expiry Alert Badge ONLY when critical (≤ 2 days) */}
                      {s.daysLeft !== undefined && s.daysLeft <= 2 && (
                        <span
                          className="absolute -top-1 -left-1 z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shadow-2xs bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf] leading-none"
                          title={`Cook soon: ${s.daysLeft <= 0 ? 'Expired' : `${s.daysLeft}d left`}`}
                        >
                          {s.daysLeft <= 0 ? '🚨 Exp' : `🚨 ${s.daysLeft}d`}
                        </span>
                      )}
                      {/* Subtly indicate bread slice count or non-medium size tier */}
                      {isBread && s.breadSliceLabel ? (
                        <span
                          className="absolute -bottom-1 -right-1 z-10 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full shadow-xs bg-[#201b16] text-[#faf8f5] border border-white/60 leading-none"
                        >
                          {s.breadSliceLabel}
                        </span>
                      ) : hasMultipleBatches && s.sizeTier !== 'medium' && (
                        <span
                          className="absolute -bottom-1 -right-1 z-10 text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-md shadow-2xs bg-white/95 text-[#685f54] border border-[#ded7cb] leading-none"
                        >
                          {s.sizeTier === 'small' ? 'S' : 'L'}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Fractional Cut Slice Sprite (1/8, 1/4, 1/3, 1/2, etc.) */
                    <div className={`relative ${spriteSizeClass} flex items-center justify-center`}>
                      {/* Background Silhouette Ghost */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-25 grayscale pointer-events-none">
                        <Image
                          src={assetSrc}
                          alt={item.name}
                          width={imageSize}
                          height={imageSize}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>

                      {/* Foreground Clipped Slice with smooth clip-path morph */}
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-[clip-path] duration-300 ease-out"
                        style={{
                          clipPath: `inset(0 ${Math.round((1 - s.fraction) * 1000) / 10}% 0 0)`,
                        }}
                      >
                        <Image
                          src={assetSrc}
                          alt={item.name}
                          width={imageSize}
                          height={imageSize}
                          style={{ filter: getProduceRipenessFilter(s.daysLeft) }}
                          className="object-contain drop-shadow-sm max-h-full max-w-full transition-[filter] duration-300"
                        />
                      </div>

                      {/* Knife Cut Line Edge with smooth horizontal glide */}
                      <div
                        className="absolute top-1 bottom-1 w-[1.5px] border-r border-dashed border-[#cc5a35]/80 pointer-events-none transition-[left] duration-300 ease-out"
                        style={{
                          left: `${Math.round(s.fraction * 1000) / 10}%`,
                        }}
                      />

                      {/* Urgent Expiry Alert Badge on Slice ONLY when critical (≤ 2 days) */}
                      {s.daysLeft !== undefined && s.daysLeft <= 2 && (
                        <span
                          className="absolute -top-1 -left-1 z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full shadow-2xs bg-[#faeee8] text-[#9e3a19] border border-[#f0d9cf] leading-none"
                          title={`Cook soon: ${s.daysLeft <= 0 ? 'Expired' : `${s.daysLeft}d left`}`}
                        >
                          {s.daysLeft <= 0 ? '🚨 Exp' : `🚨 ${s.daysLeft}d`}
                        </span>
                      )}

                      {/* Fraction & Size Pill Tag */}
                      <span
                        className="absolute -bottom-1 -right-1 z-10 text-[10px] font-sans font-bold px-2 py-0.5 rounded-full shadow-xs bg-[#201b16] text-[#faf8f5] border border-white/60 leading-none"
                      >
                        {s.breadSliceLabel || s.fractionLabel}{hasMultipleBatches && s.sizeTier !== 'medium' ? ` • ${s.sizeTier === 'small' ? 'S' : 'L'}` : ''}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </div>

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

      {/* Quick Step Selector Chips & Optional Bread Toast Toggle */}
      <div className="mt-3 pt-2.5 border-t border-[#efeae1] flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[11px] font-sans font-semibold text-[#8c8276] uppercase tracking-wider">
            Step
          </span>
          {isBread && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsToasted((prev) => !prev);
                sound.playToast();
              }}
              className={`px-2 py-0.5 text-[11px] font-sans font-medium rounded-md border transition-all flex items-center space-x-1 cursor-pointer ${
                isToasted
                  ? 'bg-[#b45309] text-white border-[#b45309] shadow-2xs font-semibold'
                  : 'bg-white hover:bg-[#fffbeb] text-[#92400e] border-[#fde68a]'
              }`}
              title={isToasted ? 'Bread is toasted golden-brown (tap to un-toast)' : 'Click to toast bread slices'}
            >
              <span>🍞</span>
              <span>{isToasted ? 'Toasted' : 'Toast'}</span>
            </button>
          )}
        </div>
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
        {/* Quantity display with fractions & focused batch indicator */}
        <div className="flex flex-col shrink-0 min-w-0">
          {isBread ? (
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-1.5">
                <span className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16] tabular-nums tracking-tight">
                  {totalBreadLoaves}
                </span>
                <span className="text-sm sm:text-base font-sans text-[#787067]">
                  {totalBreadLoaves === 1 ? 'Loaf' : 'Loaves'}
                </span>
              </div>
              <span className="text-[11px] font-mono font-medium text-[#cc5a35]">
                {focusedBatch
                  ? `${formatQuantityWithCulinaryFraction(getBreadSlices(focusedBatch.quantity, focusedBatch.unit, getLoafCapacity(focusedBatch))).display}/${getLoafCapacity(focusedBatch)} slices in group`
                  : `${formatQuantityWithCulinaryFraction(totalBreadSlices).display} slices in stock`}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline space-x-1.5">
              <span className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16] tabular-nums tracking-tight">
                {formatQuantityWithCulinaryFraction(focusedBatch ? focusedBatch.quantity : totalQty).display}
              </span>
              <span className="text-sm sm:text-base font-sans text-[#787067]">{unit}</span>
            </div>
          )}
          {focusedBatch ? (
            <div className="flex items-center space-x-1 text-[11px] font-sans text-[#cc5a35] font-semibold mt-0.5">
              <span className="capitalize">{focusedBatch.size || 'medium'} group</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusedBatchId(null);
                }}
                className="ml-1 text-[10px] text-[#8c8276] hover:text-[#201b16] font-bold p-0.5 hover:underline cursor-pointer"
                title="View total quantity across all groups"
              >
                (✕ Show All)
              </button>
            </div>
          ) : (
            !isBread && hasMultipleBatches && (
              <span className="text-[11px] font-sans text-[#8c8276]">
                {activeBatches.length} groups on shelf
              </span>
            )
          )}
        </div>

        {/* Stepper Buttons & Actions */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          {/* Decrement Stepper */}
          <button
            onClick={handleDecrement}
            disabled={totalQty <= 0}
            className={`w-10 h-10 rounded-xl active:scale-95 disabled:opacity-30 flex items-center justify-center transition-all duration-150 shrink-0 cursor-pointer ${
              focusedBatch
                ? 'bg-[#faeee8] hover:bg-[#f5e3db] text-[#9e3a19] border border-[#f0d9cf] ring-1 ring-[#e69374]'
                : 'bg-[#f2ede4] hover:bg-[#e5dec9] text-[#201b16]'
            }`}
            title={`Subtract ${currentStep.label}${focusedBatch ? ` from ${focusedBatch.size || 'medium'} batch` : ''}`}
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Increment Stepper */}
          <button
            onClick={handleIncrement}
            className={`w-10 h-10 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] active:scale-95 text-white flex items-center justify-center transition-all duration-150 shadow-xs shrink-0 cursor-pointer ${
              focusedBatch ? 'ring-2 ring-[#cc5a35] ring-offset-1' : ''
            }`}
            title={`Add ${currentStep.label}${focusedBatch ? ` to ${focusedBatch.size || 'medium'} batch` : ''}`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Direct "Chop to Pan" Button */}
          <button
            onClick={handleChopToPan}
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
                  {targetBatch && (
                    <button
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        handleQuickMove(e);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-[#787067]" />
                      <span>Move Location ({locationIcons[targetBatch.location || 'fridge']})</span>
                    </button>
                  )}

                  {targetBatch && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onEditBatch(targetBatch, item);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-[#787067]" />
                      <span>Expiry &amp; Dates ({targetBatch.size ? `${targetBatch.size.toUpperCase()} batch` : 'Dates'})</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                      setIsAddGroupModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-[#201b16] hover:bg-[#faf8f5] rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#cc5a35]" />
                    <span>+ Add New Group / Expiry Date</span>
                  </button>

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

      {/* Interactive Add New Group Modal */}
      <AddNewGroupModal
        isOpen={isAddGroupModalOpen}
        item={item}
        onClose={() => setIsAddGroupModalOpen(false)}
        onGroupAdded={(newBatchId) => {
          if (newBatchId) {
            setFocusedBatchId(newBatchId);
          }
        }}
      />
    </div>
  );
}

export const TactileAssetCard = React.memo(TactileAssetCardComponent);

