'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { EnrichedPantryItem, PantryBatchData, usePantryStore } from '@/stores/usePantryStore';
import {
  StorageLocation,
  isSpiceOrJarItem,
  snapToCulinaryFraction,
  formatQuantityWithCulinaryFraction,
  COMMON_PASTA_SHAPES,
  getPastaShapeEmoji,
  isPastaItem,
} from '@/lib/constants/shelf-life';
import { X, Trash2, Check, Pencil } from 'lucide-react';

interface BatchAdjustModalProps {
  batch: PantryBatchData | null;
  item: EnrichedPantryItem | null;
  onOpenEditItem?: (item: EnrichedPantryItem) => void;
  onClose: () => void;
}

export function BatchAdjustModal({ batch, item, onOpenEditItem, onClose }: BatchAdjustModalProps) {
  const { updateBatchDates, moveBatchLocation, deleteBatch, updateBatchQuantity, updateBatchSize, updateBatchSlices, updateBatchShape, addNewItemBatch } = usePantryStore();

  // All React hooks MUST be at the top level unconditionally
  const [expiryDate, setExpiryDate] = useState<string>(
    batch?.expiresAt ? batch.expiresAt.split('T')[0] : ''
  );
  const [location, setLocation] = useState<StorageLocation>(batch?.location || 'fridge');
  const [quantity, setQuantity] = useState<number>(batch?.quantity || 1);
  const [batchSize, setBatchSize] = useState<'small' | 'medium' | 'large'>(batch?.size || 'medium');
  const [pastaShape, setPastaShape] = useState<string>(batch?.pastaShape || 'Spaghetti');
  const [slicesPerLoaf, setSlicesPerLoaf] = useState<number>(batch?.slicesPerLoaf || 8);
  const [clovesPerBulb, setClovesPerBulb] = useState<number>(batch?.clovesPerBulb || batch?.slicesPerLoaf || 10);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state whenever batch prop changes
  useEffect(() => {
    if (batch) {
      setExpiryDate(batch.expiresAt ? batch.expiresAt.split('T')[0] : '');
      setLocation(batch.location);
      setQuantity(batch.quantity);
      setBatchSize(batch.size || 'medium');
      setPastaShape(batch.pastaShape || 'Spaghetti');
      setSlicesPerLoaf(batch.slicesPerLoaf || 8);
      setClovesPerBulb(batch.clovesPerBulb || batch.slicesPerLoaf || 10);
      setConfirmDelete(false);
    }
  }, [batch]);

  // Early return ONLY after all hooks have been declared
  if (!batch || !item) return null;

  const initialExpiry = batch.expiresAt ? batch.expiresAt.split('T')[0] : '';
  const initialObtained = batch.obtainedAt ? batch.obtainedAt.split('T')[0] : '';

  const handleQuickAddDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    setExpiryDate(base.toISOString().split('T')[0]);
  };

  const isSpice = isSpiceOrJarItem(item.category, batch.unit, item.slug);
  const unitLower = (batch.unit || '').toLowerCase();
  const isGrams = ['g', 'gram', 'grams'].includes(unitLower);
  const isMl = ['ml', 'milliliter'].includes(unitLower);
  const isBread =
    item.slug === 'bread' ||
    item.name.toLowerCase().includes('bread') ||
    ['slice', 'slices', 'loaf', 'loaves'].includes(unitLower);

  const isLoafUnit = ['loaf', 'loaves'].includes(unitLower);

  const isGarlic =
    item.slug === 'garlic' ||
    item.name.toLowerCase().includes('garlic') ||
    ['bulb', 'bulbs', 'head', 'heads', 'clove', 'cloves'].includes(unitLower);

  const isBulbUnit = ['bulb', 'bulbs', 'head', 'heads'].includes(unitLower);

  const isPasta = isPastaItem(item.slug, item.name);

  const pastaGramPresets = [
    { label: '100g', val: 100 },
    { label: '200g', val: 200 },
    { label: '250g', val: 250 },
    { label: '500g', val: 500 },
    { label: '750g', val: 750 },
    { label: '1kg', val: 1000 },
  ];

  const pastaGramDeltas = [
    { label: '+50g', delta: 50 },
    { label: '-50g', delta: -50 },
    { label: '+100g', delta: 100 },
    { label: '-100g', delta: -100 },
    { label: '+250g', delta: 250 },
    { label: '-250g', delta: -250 },
  ];

  const spiceGramPresets = [
    { label: '10g', val: 10 },
    { label: '25g', val: 25 },
    { label: '50g', val: 50 },
    { label: '80g', val: 80 },
    { label: '100g', val: 100 },
    { label: '250g', val: 250 },
    { label: '500g', val: 500 },
  ];

  const spiceGramDeltas = [
    { label: '+10g', delta: 10 },
    { label: '-10g', delta: -10 },
    { label: '+25g', delta: 25 },
    { label: '-25g', delta: -25 },
    { label: '+50g', delta: 50 },
    { label: '-50g', delta: -50 },
  ];

  const spiceMlPresets = [
    { label: '15ml', val: 15 },
    { label: '30ml', val: 30 },
    { label: '50ml', val: 50 },
    { label: '100ml', val: 100 },
    { label: '250ml', val: 250 },
    { label: '500ml', val: 500 },
  ];

  const spiceMlDeltas = [
    { label: '+15ml', delta: 15 },
    { label: '-15ml', delta: -15 },
    { label: '+50ml', delta: 50 },
    { label: '-50ml', delta: -50 },
  ];

  const breadLoafPresets = [
    { label: '1 loaf', val: 1 },
    { label: '½ loaf', val: 0.5 },
    { label: '2 loaves', val: 2 },
    { label: '¼ loaf', val: 0.25 },
    { label: '3 loaves', val: 3 },
  ];

  const breadLoafDeltas = [
    { label: '+1 slice', delta: 1 / slicesPerLoaf },
    { label: '-1 slice', delta: -1 / slicesPerLoaf },
    { label: '+2 slices', delta: 2 / slicesPerLoaf },
    { label: '-2 slices', delta: -2 / slicesPerLoaf },
    { label: '+½ loaf', delta: 0.5 },
    { label: '-½ loaf', delta: -0.5 },
  ];

  const breadSlicePresets = [
    { label: `${slicesPerLoaf} (1 loaf)`, val: slicesPerLoaf },
    { label: `${Math.round(slicesPerLoaf / 2)} (½ loaf)`, val: Math.round(slicesPerLoaf / 2) },
    { label: `${slicesPerLoaf * 2} (2 loaves)`, val: slicesPerLoaf * 2 },
    { label: '4 slices', val: 4 },
    { label: '2 slices', val: 2 },
    { label: '1 slice', val: 1 },
  ];

  const breadSliceDeltas = [
    { label: '+1 slice', delta: 1 },
    { label: '-1 slice', delta: -1 },
    { label: '+2 slices', delta: 2 },
    { label: '-2 slices', delta: -2 },
    { label: `+${Math.round(slicesPerLoaf / 2)} (½ loaf)`, delta: Math.round(slicesPerLoaf / 2) },
    { label: `-${Math.round(slicesPerLoaf / 2)} (½ loaf)`, delta: -Math.round(slicesPerLoaf / 2) },
  ];

  const garlicBulbPresets = [
    { label: '1 bulb', val: 1 },
    { label: '½ bulb', val: 0.5 },
    { label: '2 bulbs', val: 2 },
    { label: '¼ bulb', val: 0.25 },
    { label: '3 bulbs', val: 3 },
  ];

  const garlicBulbDeltas = [
    { label: '+1 clove', delta: 1 / clovesPerBulb },
    { label: '-1 clove', delta: -1 / clovesPerBulb },
    { label: '+2 cloves', delta: 2 / clovesPerBulb },
    { label: '-2 cloves', delta: -2 / clovesPerBulb },
    { label: '+½ bulb', delta: 0.5 },
    { label: '-½ bulb', delta: -0.5 },
  ];

  const garlicClovePresets = [
    { label: `${clovesPerBulb} (1 bulb)`, val: clovesPerBulb },
    { label: `${Math.round(clovesPerBulb / 2)} (½ bulb)`, val: Math.round(clovesPerBulb / 2) },
    { label: `${clovesPerBulb * 2} (2 bulbs)`, val: clovesPerBulb * 2 },
    { label: '4 cloves', val: 4 },
    { label: '2 cloves', val: 2 },
    { label: '1 clove', val: 1 },
  ];

  const garlicCloveDeltas = [
    { label: '+1 clove', delta: 1 },
    { label: '-1 clove', delta: -1 },
    { label: '+2 cloves', delta: 2 },
    { label: '-2 cloves', delta: -2 },
    { label: `+${Math.round(clovesPerBulb / 2)} (½ bulb)`, delta: Math.round(clovesPerBulb / 2) },
    { label: `-${Math.round(clovesPerBulb / 2)} (½ bulb)`, delta: -Math.round(clovesPerBulb / 2) },
  ];

  const producePresets = [
    { label: '⅛', val: 0.125 },
    { label: '¼', val: 0.25 },
    { label: '⅓', val: 1 / 3 },
    { label: '½', val: 0.5 },
    { label: '⅔', val: 2 / 3 },
    { label: '¾', val: 0.75 },
    { label: '1', val: 1 },
    { label: '1 ½', val: 1.5 },
    { label: '2', val: 2 },
  ];

  const produceDeltas = [
    { label: '+⅛', delta: 0.125 },
    { label: '-⅛', delta: -0.125 },
    { label: '+¼', delta: 0.25 },
    { label: '-¼', delta: -0.25 },
    { label: '+⅓', delta: 1 / 3 },
    { label: '-⅓', delta: -1 / 3 },
    { label: '+½', delta: 0.5 },
    { label: '-½', delta: -0.5 },
    { label: '+1', delta: 1 },
    { label: '-1', delta: -1 },
  ];

  const quickPresets = isPasta
    ? pastaGramPresets
    : isGarlic
    ? (isBulbUnit ? garlicBulbPresets : garlicClovePresets)
    : isBread
    ? (isLoafUnit ? breadLoafPresets : breadSlicePresets)
    : isSpice && isGrams
    ? spiceGramPresets
    : isSpice && isMl
    ? spiceMlPresets
    : producePresets;

  const quickDeltas = isPasta
    ? pastaGramDeltas
    : isGarlic
    ? (isBulbUnit ? garlicBulbDeltas : garlicCloveDeltas)
    : isBread
    ? (isLoafUnit ? breadLoafDeltas : breadSliceDeltas)
    : isSpice && isGrams
    ? spiceGramDeltas
    : isSpice && isMl
    ? spiceMlDeltas
    : produceDeltas;

  const handleSave = async () => {
    setIsSaving(true);
    if (location !== batch.location) {
      await moveBatchLocation(batch.id, location);
    }
    if (expiryDate && expiryDate !== initialExpiry) {
      await updateBatchDates(batch.id, new Date(expiryDate).toISOString());
    }
    if (batchSize !== (batch.size || 'medium')) {
      await updateBatchSize(batch.id, batchSize);
    }
    if (isPasta && pastaShape !== (batch.pastaShape || 'Spaghetti')) {
      await updateBatchShape(batch.id, pastaShape);
    }
    if (isBread && slicesPerLoaf !== (batch.slicesPerLoaf || 8)) {
      await updateBatchSlices(batch.id, slicesPerLoaf);
    }
    if (isGarlic && clovesPerBulb !== (batch.clovesPerBulb || 10)) {
      await updateBatchSlices(batch.id, clovesPerBulb);
    }
    const finalQuantity = isSpice || isPasta ? quantity : snapToCulinaryFraction(quantity);
    if (finalQuantity !== batch.quantity) {
      await updateBatchQuantity(batch.id, finalQuantity);
    }
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteBatch(batch.id);
    onClose();
  };

  const locations: { id: StorageLocation; label: string; icon: string }[] = [
    { id: 'fridge', label: 'Fridge', icon: '🧊' },
    { id: 'freezer', label: 'Freezer', icon: '❄️' },
    { id: 'pantry', label: 'Dry Cupboard', icon: '🪵' },
    { id: 'counter', label: 'Countertop', icon: '🧂' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-2xl p-6 sm:p-7 max-w-md w-full border border-[#e8e2d8] shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Food Image */}
        <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="w-16 h-16 bg-white rounded-xl p-2 border border-[#e8e2d8] flex items-center justify-center drop-shadow-xs">
            <Image src={item.pngAsset} alt={item.name} width={52} height={52} className="object-contain" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">{item.name}</h3>
            <p className="font-sans text-sm text-[#796f64]">
              Batch of {batch.quantity} {batch.unit} • Acquired: {initialObtained || 'Recently'}
            </p>
            {onOpenEditItem && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditItem(item);
                }}
                className="mt-1.5 text-xs font-sans font-medium text-[#cc5a35] hover:text-[#9e3a19] flex items-center space-x-1 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit Artwork & Item Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Quantity & Fraction Quantifier Section */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
              Stock Quantity ({batch.unit})
            </label>
            <span className="text-xs font-sans font-medium text-[#cc5a35] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
              Visual: {isPasta
                ? `${quantity}g (${getPastaShapeEmoji(pastaShape)} ${pastaShape})`
                : isGarlic
                ? isBulbUnit
                  ? `${formatQuantityWithCulinaryFraction(quantity).display} bulb (${snapToCulinaryFraction(quantity * clovesPerBulb)} cloves)`
                  : `${formatQuantityWithCulinaryFraction(quantity).display} cloves (${(quantity / clovesPerBulb).toFixed(1)} bulb)`
                : isBread
                ? isLoafUnit
                  ? `${formatQuantityWithCulinaryFraction(quantity).display} loaf (${snapToCulinaryFraction(quantity * slicesPerLoaf)} slices)`
                  : `${formatQuantityWithCulinaryFraction(quantity).display} slices (${(quantity / slicesPerLoaf).toFixed(1)} loaf)`
                : `${formatQuantityWithCulinaryFraction(quantity).display} ${batch.unit}`}
            </span>
          </div>

          <div className="flex items-center space-x-2 mb-2.5">
            <input
              type="number"
              step={isSpice && (isGrams || isMl) ? '1' : isPasta ? '25' : '0.025'}
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0.01, parseFloat(e.target.value) || 0))}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
          </div>

          {/* Quick Presets & Deltas */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[11px] font-sans font-semibold text-[#8c8276] uppercase tracking-wider shrink-0 mr-1">
                Set:
              </span>
              {quickPresets.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setQuantity(isSpice || isPasta ? chip.val : snapToCulinaryFraction(chip.val));
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-[#faeee8] text-[#201b16] hover:text-[#cc5a35] text-xs font-sans font-medium rounded-lg border border-[#e8e2d8] whitespace-nowrap active:scale-95 transition-all shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Quick Adjust Deltas */}
            <div className="flex items-center space-x-1 overflow-x-auto py-0.5 no-scrollbar">
              <span className="text-[11px] font-sans font-semibold text-[#8c8276] uppercase tracking-wider shrink-0 mr-1">
                Adjust:
              </span>
              {quickDeltas.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    if (isSpice || isPasta) {
                      setQuantity((q) => Math.max(1, Math.round(q + chip.delta)));
                    } else {
                      setQuantity((q) => snapToCulinaryFraction(Math.max(0.125, q + chip.delta)));
                    }
                  }}
                  className="px-2 py-0.5 bg-[#f7f4ef] hover:bg-[#faeee8] text-[#685f54] hover:text-[#cc5a35] text-xs font-sans font-medium rounded-lg border border-[#e8e2d8] whitespace-nowrap active:scale-95 transition-all shrink-0"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Split and Merge Group Actions */}
        {!isBread && !isGarlic && !isSpice && !isPasta && (
          <div className="mb-5 space-y-2">
            {quantity >= 2 && (
              <div className="p-3 bg-[#fbf9f5] border border-[#e8e2d8] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-[#201b16] block">Split Group</span>
                  <span className="text-[11px] text-[#796f64]">
                    Divide {quantity} {batch.unit} into 2 independent groups
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setIsSaving(true);
                    const half = Math.floor(quantity / 2);
                    const remainder = snapToCulinaryFraction(quantity - half);
                    await updateBatchQuantity(batch.id, half);
                    await addNewItemBatch({
                      slug: item.slug,
                      name: item.name,
                      category: item.category,
                      location: batch.location,
                      quantity: remainder,
                      unit: batch.unit,
                      size: batchSize,
                      expiresAt: expiryDate,
                    });
                    setIsSaving(false);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-sans font-medium bg-white hover:bg-[#faeee8] text-[#cc5a35] rounded-lg border border-[#cc5a35]/40 transition-colors cursor-pointer shadow-2xs"
                >
                  ✂️ Split into {Math.floor(quantity / 2)} + {snapToCulinaryFraction(quantity - Math.floor(quantity / 2))}
                </button>
              </div>
            )}

            {(() => {
              const siblings = item.batches.filter(
                (b) => b.id !== batch.id && (b.size || 'medium') === (batch.size || 'medium') && b.quantity > 0
              );
              if (siblings.length === 0) return null;
              return (
                <div className="p-3 bg-[#fbf9f5] border border-[#e8e2d8] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-[#201b16] block">Merge Groups</span>
                    <span className="text-[11px] text-[#796f64]">
                      Combine with {siblings.length} other {batch.size || 'medium'} group(s)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSaving(true);
                      const totalToAdd = siblings.reduce((sum, b) => sum + b.quantity, 0);
                      await updateBatchQuantity(batch.id, snapToCulinaryFraction(quantity + totalToAdd));
                      for (const sib of siblings) {
                        await deleteBatch(sib.id);
                      }
                      setIsSaving(false);
                      onClose();
                    }}
                    className="px-2.5 py-1 text-xs font-sans font-medium bg-white hover:bg-[#faeee8] text-[#cc5a35] rounded-lg border border-[#cc5a35]/40 transition-colors cursor-pointer shadow-2xs"
                  >
                    🔗 Merge All
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Loaf Slice / Bulb Clove Capacity Configuration */}
        {(isBread || isGarlic) && (
          <div className="mb-5 bg-[#fbf9f5] border border-[#e8e2d8] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                {isGarlic ? 'Bulb Clove Capacity' : 'Loaf Slice Capacity'}
              </label>
              <span className="text-xs font-mono font-bold text-[#cc5a35] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
                {isGarlic ? `${clovesPerBulb} cloves / bulb` : `${slicesPerLoaf} slices / loaf`}
              </span>
            </div>
            <p className="text-[11px] text-[#8c8276] mb-2.5">
              {isGarlic
                ? `1 bulb = ${clovesPerBulb} cloves. Taking 1 clove deducts 1/${clovesPerBulb} from the bulb without making it disappear!`
                : `1 loaf = ${slicesPerLoaf} slices. Taking 1 slice deducts 1/${slicesPerLoaf} from the loaf without making it disappear!`}
            </p>

            <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 no-scrollbar mb-2.5">
              {(isGarlic ? [4, 6, 8, 10, 12, 14, 16] : [6, 8, 10, 12, 14, 16, 20]).map((num) => {
                const isSelected = isGarlic ? clovesPerBulb === num : slicesPerLoaf === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (isGarlic) setClovesPerBulb(num);
                      else setSlicesPerLoaf(num);
                    }}
                    className={`px-2.5 py-1 text-xs font-sans rounded-lg border transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#cc5a35] text-white border-[#cc5a35] font-semibold shadow-2xs'
                        : 'bg-white hover:bg-[#faeee8] text-[#3d362e] border-[#e8e2d8]'
                    }`}
                  >
                    {num} {isGarlic ? 'cloves' : 'slices'}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#796f64] shrink-0 font-sans">Custom:</span>
              <input
                type="number"
                min="1"
                max="64"
                value={isGarlic ? clovesPerBulb : slicesPerLoaf}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || (isGarlic ? 10 : 8));
                  if (isGarlic) setClovesPerBulb(val);
                  else setSlicesPerLoaf(val);
                }}
                className="w-20 px-2.5 py-1 bg-white border border-[#e8e2d8] rounded-lg text-xs font-mono font-bold text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
              <span className="text-xs text-[#796f64]">
                {isGarlic ? 'cloves per whole bulb' : 'slices per whole loaf'}
              </span>
            </div>

            {batch.quantity > 1 && (
              <div className="mt-3 pt-2.5 border-t border-[#e8e2d8] flex items-center justify-between">
                <span className="text-[11px] text-[#796f64]">
                  Batch contains {batch.quantity} {isGarlic ? 'bulbs' : 'loaves'}.
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setIsSaving(true);
                    await updateBatchQuantity(batch.id, 1);
                    await addNewItemBatch({
                      slug: item.slug,
                      name: item.name,
                      category: item.category,
                      location: batch.location,
                      quantity: Math.max(1, Math.round(batch.quantity - 1)),
                      unit: batch.unit,
                      size: batch.size || 'medium',
                      slicesPerLoaf: isBread ? slicesPerLoaf : undefined,
                      clovesPerBulb: isGarlic ? clovesPerBulb : undefined,
                      expiresAt: batch.expiresAt,
                    });
                    setIsSaving(false);
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-sans font-medium bg-white hover:bg-[#faeee8] text-[#cc5a35] rounded-lg border border-[#cc5a35]/40 transition-colors cursor-pointer"
                >
                  ✂️ Split into Individual {isGarlic ? 'Bulbs' : 'Loaves'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pasta Shape Configuration */}
        {isPasta && (
          <div className="mb-5 bg-[#fbf9f5] border border-[#e8e2d8] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                Pasta Shape
              </label>
              <span className="text-xs font-mono font-bold text-[#cc5a35] bg-[#faeee8] px-2.5 py-0.5 rounded-full border border-[#f0d9cf] flex items-center space-x-1">
                <span>{getPastaShapeEmoji(pastaShape)}</span>
                <span>{pastaShape}</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2.5">
              {COMMON_PASTA_SHAPES.map((shape) => {
                const isSelected = pastaShape.toLowerCase() === shape.name.toLowerCase();
                return (
                  <button
                    key={shape.name}
                    type="button"
                    onClick={() => {
                      setPastaShape(shape.name);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-sans transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold ring-2 ring-[#cc5a35]/30'
                        : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    <span className="text-lg mb-0.5">{shape.emoji}</span>
                    <span className="font-medium text-xs text-[#201b16] truncate max-w-full">{shape.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-[#796f64] shrink-0 font-sans">Custom:</span>
              <input
                type="text"
                placeholder="e.g. Orecchiette, Tagliatelle, Orzo"
                value={COMMON_PASTA_SHAPES.some((s) => s.name.toLowerCase() === pastaShape.toLowerCase()) ? '' : pastaShape}
                onChange={(e) => {
                  if (e.target.value.trim()) {
                    setPastaShape(e.target.value);
                  }
                }}
                className="flex-1 px-3 py-1.5 bg-white border border-[#e8e2d8] rounded-xl text-xs font-sans font-medium text-[#201b16] placeholder:text-[#b5ab9e] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
          </div>
        )}

        {/* Physical Size Tier Switcher */}
        {!isSpice && !isPasta && (
          <div className="mb-5">
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
              Physical Size Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'small' as const, label: 'Small', scale: '0.8×', icon: '🟢' },
                { id: 'medium' as const, label: 'Medium', scale: '1.0×', icon: '🟡' },
                { id: 'large' as const, label: 'Large', scale: '1.25×', icon: '🟠' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setBatchSize(s.id);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-sans transition-all cursor-pointer ${
                    batchSize === s.id
                      ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold'
                      : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                  }`}
                >
                  <span className="text-sm mb-0.5">{s.icon}</span>
                  <span className="font-medium">{s.label}</span>
                  <span className="text-[10px] text-[#9e9488] font-mono">{s.scale}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Storage Location Switcher */}
        <div className="mb-5">
          <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2.5">
            Storage Location
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {locations.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => setLocation(loc.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border text-sm font-sans font-medium transition-all ${
                  location === loc.id
                    ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold'
                    : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                }`}
              >
                <span className="text-base">{loc.icon}</span>
                <span>{loc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expiration Date Section */}
        <div className="mb-6">
          <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
            Expiration Date & Shelf Life
          </label>
          <div className="relative mb-2.5">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
          </div>

          {/* Quick Expiration Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pt-1 scrollbar-none">
            <span className="text-xs font-sans font-medium text-[#8c8276] whitespace-nowrap">Quick Presets:</span>
            {[
              { label: '+3 Days', days: 3 },
              { label: '+1 Week', days: 7 },
              { label: '+2 Weeks', days: 14 },
              { label: '+1 Month', days: 30 },
              { label: '+3 Months', days: 90 },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleQuickAddDays(chip.days)}
                className="px-3 py-1.5 bg-[#faeee8] hover:bg-[#f5e3db] text-[#8a3319] text-xs font-sans font-medium rounded-lg border border-[#f0d9cf] whitespace-nowrap active:scale-95 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e8e2d8]">
          <button
            type="button"
            onClick={handleDelete}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-sm font-sans font-medium rounded-xl transition-all ${
              confirmDelete
                ? 'bg-[#cc5a35] text-white shadow-xs'
                : 'text-[#b34b29] hover:bg-[#faeee8]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>{confirmDelete ? 'Tap to Confirm' : 'Delete Batch'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-sm font-sans font-medium rounded-xl shadow-xs active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
