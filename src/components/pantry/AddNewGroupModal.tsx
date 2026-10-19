'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { EnrichedPantryItem, usePantryStore } from '@/stores/usePantryStore';
import { StorageLocation, isSpiceOrJarItem, calculateExpiryDate, COMMON_PASTA_SHAPES, getPastaShapeEmoji } from '@/lib/constants/shelf-life';
import { X, Plus, Minus, Check } from 'lucide-react';
import { sound } from '@/lib/audio';

interface AddNewGroupModalProps {
  isOpen: boolean;
  item: EnrichedPantryItem;
  onClose: () => void;
  onGroupAdded?: (newBatchId?: string) => void;
}

export function AddNewGroupModal({ isOpen, item, onClose, onGroupAdded }: AddNewGroupModalProps) {
  const addNewItemBatch = usePantryStore((s) => s.addNewItemBatch);

  const primaryBatch = item.batches[0];
  const unitLower = (item.defaultUnit || '').toLowerCase();
  const isSpice = isSpiceOrJarItem(item.category, item.defaultUnit, item.slug);
  const isGrams = ['g', 'gram', 'grams'].includes(unitLower);
  const isMl = ['ml', 'milliliter'].includes(unitLower);
  const isBread =
    item.slug === 'bread' ||
    item.name.toLowerCase().includes('bread') ||
    ['slice', 'slices', 'loaf', 'loaves'].includes(unitLower);

  const isGarlic =
    item.slug === 'garlic' ||
    item.name.toLowerCase().includes('garlic') ||
    ['bulb', 'bulbs', 'head', 'heads', 'clove', 'cloves'].includes(unitLower);

  const isPasta =
    item.slug === 'pasta' ||
    item.name.toLowerCase().includes('pasta');

  const defaultLoc: StorageLocation = primaryBatch
    ? primaryBatch.location
    : isSpice || isBread || isPasta
    ? 'pantry'
    : isGarlic
    ? 'counter'
    : 'fridge';

  const [location, setLocation] = useState<StorageLocation>(defaultLoc);
  const [sizeTier, setSizeTier] = useState<'small' | 'medium' | 'large'>('medium');
  const [pastaShape, setPastaShape] = useState<string>('Spaghetti');
  const [quantity, setQuantity] = useState<number>(isPasta ? 500 : isSpice ? (isGrams ? 50 : isMl ? 100 : 1) : 1);
  const [slicesPerLoaf, setSlicesPerLoaf] = useState<number>(primaryBatch?.slicesPerLoaf || 8);
  const [clovesPerBulb, setClovesPerBulb] = useState<number>(primaryBatch?.clovesPerBulb || primaryBatch?.slicesPerLoaf || 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default expiry date based on storage location
  const [expiryDate, setExpiryDate] = useState<string>(() => {
    const autoExp = calculateExpiryDate(item.slug, item.category, defaultLoc);
    return autoExp.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const handleLocationChange = (newLoc: StorageLocation) => {
    setLocation(newLoc);
    const autoExp = calculateExpiryDate(item.slug, item.category, newLoc);
    setExpiryDate(autoExp.toISOString().split('T')[0]);
  };

  const handleQuickAddDays = (days: number) => {
    const base = new Date();
    base.setDate(base.getDate() + days);
    setExpiryDate(base.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    sound.playPop();

    try {
      const finalUnit = isPasta ? 'g' : isBread ? 'loaf' : isGarlic ? 'bulb' : item.defaultUnit;
      const finalQuantity = Math.max(1, quantity);

      const newBatch = await addNewItemBatch({
        slug: item.slug,
        name: item.name,
        category: item.category,
        location,
        quantity: finalQuantity,
        unit: finalUnit,
        size: sizeTier,
        pastaShape: isPasta ? pastaShape : undefined,
        slicesPerLoaf: isBread ? slicesPerLoaf : undefined,
        clovesPerBulb: isGarlic ? clovesPerBulb : undefined,
        obtainedAt: new Date().toISOString(),
        expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
        notes: `size:${sizeTier}${isBread ? ` slices:${slicesPerLoaf}` : isGarlic ? ` cloves:${clovesPerBulb}` : ''}${isPasta && pastaShape ? ` shape:${pastaShape}` : ''}`,
      });

      setIsSubmitting(false);
      onClose();
      if (onGroupAdded && newBatch?.id) {
        onGroupAdded(newBatch.id);
      }
    } catch {
      setIsSubmitting(false);
      onClose();
    }
  };

  const scaleMultiplier = sizeTier === 'small' ? 0.8 : sizeTier === 'large' ? 1.25 : 1.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#e8e2d8] shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all cursor-pointer shadow-2xs"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Scaled Food Preview */}
        <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="w-16 h-16 bg-white rounded-2xl p-2 border border-[#e8e2d8] flex items-center justify-center drop-shadow-xs shrink-0 overflow-hidden">
            <div
              className="transition-transform duration-300 ease-out"
              style={{ transform: `scale(${scaleMultiplier})` }}
            >
              <Image src={item.pngAsset} alt={item.name} width={50} height={50} className="object-contain" />
            </div>
          </div>
          <div>
            <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-[#cc5a35] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
              + Add New Group
            </span>
            <h3 className="font-serif text-2xl font-medium text-[#201b16] mt-0.5">{item.name}</h3>
            <p className="font-sans text-xs text-[#796f64]">
              Add a separate group with distinct physical size, loaf slices, or expiry date.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* 1. Pasta Shape Selector (if pasta) */}
          {isPasta && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  Pasta Shape for New Group
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
                        sound.triggerHaptic('light');
                        sound.playWoodTap();
                        setPastaShape(shape.name);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-sans transition-all cursor-pointer ${
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
                <span className="text-xs text-[#796f64] shrink-0 font-sans">Custom Shape:</span>
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

          {/* 1b. Physical Size Selector (for non-spices and non-pasta) */}
          {!isSpice && !isPasta && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  Physical Size of New Group
                </label>
                <span className="text-xs font-mono font-bold text-[#cc5a35] capitalize">
                  {sizeTier} ({scaleMultiplier}× scale)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'small' as const, label: 'Small', scale: '0.8×', icon: '🟢', desc: 'Mini / Small' },
                  { id: 'medium' as const, label: 'Medium', scale: '1.0×', icon: '🟡', desc: 'Standard' },
                  { id: 'large' as const, label: 'Large', scale: '1.25×', icon: '🟠', desc: 'Jumbo / Large' },
                ].map((s) => {
                  const isSelected = sizeTier === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        sound.triggerHaptic('light');
                        sound.playWoodTap();
                        setSizeTier(s.id);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-sans transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold ring-2 ring-[#cc5a35]/30'
                          : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                      }`}
                    >
                      <span className="text-lg mb-1">{s.icon}</span>
                      <span className="font-medium text-sm text-[#201b16]">{s.label}</span>
                      <span className="text-[10px] text-[#9e9488] font-mono mt-0.5">{s.scale}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Quantity Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                {isPasta ? 'Net Weight to Add' : 'Asset Quantity to Add'}
              </label>
              <span className="text-xs font-sans font-medium text-[#201b16] bg-[#faeee8] px-2.5 py-0.5 rounded-full border border-[#f0d9cf]">
                {quantity} {isPasta ? 'g' : isGarlic ? (quantity === 1 ? 'Bulb' : 'Bulbs') : isBread ? (quantity === 1 ? 'Loaf' : 'Loaves') : (item.defaultUnit || 'piece')}
              </span>
            </div>

            {isPasta ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 bg-white border border-[#e8e2d8] rounded-2xl p-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.triggerHaptic('light');
                      setQuantity((q) => Math.max(25, q - 50));
                    }}
                    disabled={quantity <= 25}
                    className="w-12 h-10 rounded-xl bg-[#faf8f5] hover:bg-[#f0ebe1] disabled:opacity-30 text-[#201b16] flex items-center justify-center transition-all cursor-pointer font-bold text-xs"
                  >
                    -50g
                  </button>

                  <div className="flex-1 text-center flex items-center justify-center space-x-1">
                    <input
                      type="number"
                      min="1"
                      step="25"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-24 text-center font-serif text-2xl font-bold text-[#201b16] tabular-nums bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-[#796f64] font-sans">grams</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      sound.triggerHaptic('light');
                      setQuantity((q) => q + 50);
                    }}
                    className="w-12 h-10 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs font-bold text-xs"
                  >
                    +50g
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 no-scrollbar">
                  {[250, 400, 500, 750, 1000].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        sound.triggerHaptic('light');
                        setQuantity(g);
                      }}
                      className={`px-2.5 py-1 text-xs font-sans rounded-lg border transition-all cursor-pointer shrink-0 ${
                        quantity === g
                          ? 'bg-[#cc5a35] text-white border-[#cc5a35] font-semibold shadow-2xs'
                          : 'bg-white hover:bg-[#faeee8] text-[#3d362e] border-[#e8e2d8]'
                      }`}
                    >
                      {g >= 1000 ? `${g / 1000}kg` : `${g}g`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 bg-white border border-[#e8e2d8] rounded-2xl p-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.triggerHaptic('light');
                    setQuantity((q) => Math.max(1, q - 1));
                  }}
                  disabled={quantity <= 1}
                  className="w-10 h-10 rounded-xl bg-[#faf8f5] hover:bg-[#f0ebe1] disabled:opacity-30 text-[#201b16] flex items-center justify-center transition-all cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 text-center">
                  <span className="font-serif text-2xl font-bold text-[#201b16] tabular-nums">
                    {quantity}
                  </span>
                  <span className="text-xs text-[#796f64] ml-1.5 font-sans">
                    {isGarlic ? (quantity === 1 ? 'Bulb' : 'Bulbs') : isBread ? (quantity === 1 ? 'Loaf' : 'Loaves') : 'Asset'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.triggerHaptic('light');
                    setQuantity((q) => q + 1);
                  }}
                  className="w-10 h-10 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
            <p className="text-[11px] text-[#8c8276] mt-1.5">
              {isPasta ? 'Add an individual pasta pack or box with specified shape.' : `Default is strictly 1 asset. Each ${isGarlic ? 'bulb' : isBread ? 'loaf' : 'produce item'} is created individually.`}
            </p>
          </div>

          {/* 3. Loaf Slice Capacity (if bread) */}
          {isBread && (
            <div className="bg-[#fbf9f5] border border-[#e8e2d8] rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  Slices for This Loaf
                </label>
                <span className="text-xs font-mono font-bold text-[#cc5a35] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
                  {slicesPerLoaf} slices
                </span>
              </div>
              <p className="text-[11px] text-[#8c8276] mb-2.5">
                This loaf will have {slicesPerLoaf} slices. Taking 1 slice deducts 1/{slicesPerLoaf} from this loaf asset without disappearing!
              </p>

              <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 no-scrollbar mb-2.5">
                {[6, 8, 10, 12, 14, 16, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      sound.triggerHaptic('light');
                      setSlicesPerLoaf(num);
                    }}
                    className={`px-2.5 py-1 text-xs font-sans rounded-lg border transition-all cursor-pointer shrink-0 ${
                      slicesPerLoaf === num
                        ? 'bg-[#cc5a35] text-white border-[#cc5a35] font-semibold shadow-2xs'
                        : 'bg-white hover:bg-[#faeee8] text-[#3d362e] border-[#e8e2d8]'
                    }`}
                  >
                    {num} slices
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#796f64] shrink-0 font-sans">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={slicesPerLoaf}
                  onChange={(e) => setSlicesPerLoaf(Math.max(1, parseInt(e.target.value) || 8))}
                  className="w-20 px-2.5 py-1 bg-white border border-[#e8e2d8] rounded-lg text-xs font-mono font-bold text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                <span className="text-xs text-[#796f64]">slices per whole loaf</span>
              </div>
            </div>
          )}

          {/* 3b. Bulb Clove Capacity (if garlic) */}
          {isGarlic && (
            <div className="bg-[#fbf9f5] border border-[#e8e2d8] rounded-2xl p-3.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  Cloves for This Bulb
                </label>
                <span className="text-xs font-mono font-bold text-[#cc5a35] bg-[#faeee8] px-2 py-0.5 rounded-md border border-[#f0d9cf]">
                  {clovesPerBulb} cloves
                </span>
              </div>
              <p className="text-[11px] text-[#8c8276] mb-2.5">
                This bulb will have {clovesPerBulb} cloves. Taking 1 clove deducts 1/{clovesPerBulb} from this bulb asset without disappearing!
              </p>

              <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5 no-scrollbar mb-2.5">
                {[4, 6, 8, 10, 12, 14, 16].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      sound.triggerHaptic('light');
                      setClovesPerBulb(num);
                    }}
                    className={`px-2.5 py-1 text-xs font-sans rounded-lg border transition-all cursor-pointer shrink-0 ${
                      clovesPerBulb === num
                        ? 'bg-[#cc5a35] text-white border-[#cc5a35] font-semibold shadow-2xs'
                        : 'bg-white hover:bg-[#faeee8] text-[#3d362e] border-[#e8e2d8]'
                    }`}
                  >
                    {num} cloves
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-[#796f64] shrink-0 font-sans">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={clovesPerBulb}
                  onChange={(e) => setClovesPerBulb(Math.max(1, parseInt(e.target.value) || 10))}
                  className="w-20 px-2.5 py-1 bg-white border border-[#e8e2d8] rounded-lg text-xs font-mono font-bold text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                <span className="text-xs text-[#796f64]">cloves per whole bulb</span>
              </div>
            </div>
          )}

          {/* 4. Storage Location Switcher */}
          <div>
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
              Storage Location
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'fridge' as const, label: 'Fridge', icon: '🧊' },
                { id: 'freezer' as const, label: 'Freezer', icon: '❄️' },
                { id: 'pantry' as const, label: 'Dry Cupboard', icon: '🪵' },
                { id: 'counter' as const, label: 'Countertop', icon: '🧂' },
              ].map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => handleLocationChange(loc.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-sans font-medium transition-all cursor-pointer ${
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

          {/* 5. Expiration Date Section */}
          <div>
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
              Expiration Date
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35] mb-2"
            />
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-sans font-semibold text-[#8c8276] uppercase tracking-wider shrink-0 mr-1">
                Presets:
              </span>
              {[
                { label: '+3 Days', days: 3 },
                { label: '+1 Week', days: 7 },
                { label: '+2 Weeks', days: 14 },
                { label: '+1 Month', days: 30 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleQuickAddDays(chip.days)}
                  className="px-2.5 py-1 bg-white hover:bg-[#faeee8] text-[#3d362e] text-xs font-sans font-medium rounded-lg border border-[#e8e2d8] whitespace-nowrap active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center space-x-2 pt-2 border-t border-[#e8e2d8]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-[#e8e2d8] text-[#685f54] hover:bg-[#f0ebe1] text-sm font-sans font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-[#cc5a35] hover:bg-[#b54926] text-white text-sm font-sans font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Adding Group...'
                  : isPasta
                  ? `Add ${pastaShape} Group (${quantity}g)`
                  : `Add 1 ${sizeTier.charAt(0).toUpperCase() + sizeTier.slice(1)} ${isBread ? 'Loaf' : isGarlic ? 'Bulb' : 'Group'}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
