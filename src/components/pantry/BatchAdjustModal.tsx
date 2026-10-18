'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { EnrichedPantryItem, PantryBatchData, usePantryStore } from '@/stores/usePantryStore';
import {
  StorageLocation,
  isSpiceOrJarItem,
  snapToCulinaryFraction,
  formatQuantityWithCulinaryFraction,
} from '@/lib/constants/shelf-life';
import { X, Trash2, Check, Pencil } from 'lucide-react';

interface BatchAdjustModalProps {
  batch: PantryBatchData | null;
  item: EnrichedPantryItem | null;
  onOpenEditItem?: (item: EnrichedPantryItem) => void;
  onClose: () => void;
}

export function BatchAdjustModal({ batch, item, onOpenEditItem, onClose }: BatchAdjustModalProps) {
  const { updateBatchDates, moveBatchLocation, deleteBatch, updateBatchQuantity, updateBatchSize } = usePantryStore();

  // All React hooks MUST be at the top level unconditionally
  const [expiryDate, setExpiryDate] = useState<string>(
    batch?.expiresAt ? batch.expiresAt.split('T')[0] : ''
  );
  const [location, setLocation] = useState<StorageLocation>(batch?.location || 'fridge');
  const [quantity, setQuantity] = useState<number>(batch?.quantity || 1);
  const [batchSize, setBatchSize] = useState<'small' | 'medium' | 'large'>(batch?.size || 'medium');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state whenever batch prop changes
  useEffect(() => {
    if (batch) {
      setExpiryDate(batch.expiresAt ? batch.expiresAt.split('T')[0] : '');
      setLocation(batch.location);
      setQuantity(batch.quantity);
      setBatchSize(batch.size || 'medium');
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

  const quickPresets = isSpice && isGrams
    ? spiceGramPresets
    : isSpice && isMl
    ? spiceMlPresets
    : producePresets;

  const quickDeltas = isSpice && isGrams
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
    const finalQuantity = isSpice ? quantity : snapToCulinaryFraction(quantity);
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
      <div className="bg-[#faf8f5] rounded-2xl p-6 sm:p-7 max-w-md w-full border border-[#e8e2d8] shadow-2xl relative">
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
              Visual: {formatQuantityWithCulinaryFraction(quantity).display} {batch.unit}
            </span>
          </div>

          <div className="flex items-center space-x-2 mb-2.5">
            <input
              type="number"
              step={isSpice && (isGrams || isMl) ? '1' : '0.025'}
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
                    setQuantity(isSpice ? chip.val : snapToCulinaryFraction(chip.val));
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
                    if (isSpice) {
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

        {/* Physical Size Tier Switcher */}
        {!isSpice && (
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
