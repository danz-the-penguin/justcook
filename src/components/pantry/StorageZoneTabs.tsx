'use client';

import React from 'react';
import { usePantryStore } from '@/stores/usePantryStore';
import { StorageLocation, isSpiceOrJarItem } from '@/lib/constants/shelf-life';
import { Sparkles, Flame, Plus, Upload, FileText } from 'lucide-react';

interface StorageZoneTabsProps {
  onOpenQuickAdd: (tab?: 'standard' | 'upload' | 'bulk') => void;
}

export function StorageZoneTabs({ onOpenQuickAdd }: StorageZoneTabsProps) {
  const { items, activeLocation, setActiveLocation, rescueFilter, toggleRescueFilter } = usePantryStore();

  const getZoneCount = (loc: StorageLocation | 'all' | 'spice') => {
    if (loc === 'all') {
      return items.reduce((sum, item) => sum + item.batches.length, 0);
    }
    if (loc === 'spice') {
      return items.filter(
        (item) => isSpiceOrJarItem(item.category, item.defaultUnit, item.slug) && item.batches.length > 0
      ).length;
    }
    return items.reduce((sum, item) => {
      const match = item.batches.filter((b) => b.location === loc);
      return sum + match.length;
    }, 0);
  };

  const rescueItemsCount = items.filter(
    (item) => item.freshnessStatus === 'critical' || item.freshnessStatus === 'use_soon'
  ).length;

  const zones: { id: 'all' | StorageLocation | 'spice'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'fridge', label: 'Fridge' },
    { id: 'freezer', label: 'Freezer' },
    { id: 'pantry', label: 'Cupboard' },
    { id: 'counter', label: 'Counter' },
    { id: 'spice', label: '🧂 Spice Rack' },
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-7 pb-4 sm:pb-5 border-b border-[#e5dec9]">
      {/* Zone Tabs (Smooth horizontal swipe on mobile) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
        {zones.map((zone) => {
          const isActive = activeLocation === zone.id;
          const count = getZoneCount(zone.id);

          return (
            <button
              key={zone.id}
              onClick={() => setActiveLocation(zone.id)}
              className={`flex items-center space-x-1.5 sm:space-x-2.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#201b16] text-[#faf8f5] font-semibold shadow-2xs'
                  : 'text-[#5c5349] hover:text-[#201b16] hover:bg-[#ebe4d8]'
              }`}
            >
              <span>{zone.label}</span>
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#e5dec9] text-[#5c5349]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons: Expiring Filter, Paste Receipt, Upload Asset & Stock Food */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 overflow-x-auto scrollbar-none w-full lg:w-auto justify-start sm:justify-end pb-1 sm:pb-0">
        {rescueItemsCount > 0 && (
          <button
            onClick={toggleRescueFilter}
            className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans font-medium transition-all border whitespace-nowrap shrink-0 ${
              rescueFilter
                ? 'bg-[#cc5a35] text-white border-[#cc5a35]'
                : 'bg-[#faeee8] text-[#9e3a19] border-[#f0d9cf] hover:bg-[#f5e3db]'
            }`}
            title="Show only ingredients expiring soon"
          >
            <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Use Soon ({rescueItemsCount})</span>
          </button>
        )}

        <button
          onClick={() => onOpenQuickAdd('bulk')}
          className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-[#f0ebe1] text-[#574f46] hover:text-[#201b16] font-sans font-medium text-xs sm:text-base rounded-xl border border-[#e8e2d8] shadow-2xs active:scale-95 transition-all whitespace-nowrap shrink-0"
          title="Paste grocery receipt or natural text to auto-parse and stock"
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc5a35]" />
          <span>Paste Receipt</span>
        </button>

        <button
          onClick={() => onOpenQuickAdd('upload')}
          className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-[#f0ebe1] text-[#574f46] hover:text-[#201b16] font-sans font-medium text-xs sm:text-base rounded-xl border border-[#e8e2d8] shadow-2xs active:scale-95 transition-all whitespace-nowrap shrink-0"
          title="Upload transparent PNG sprite & create custom ingredient"
        >
          <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#cc5a35]" />
          <span>Upload Asset</span>
        </button>

        <button
          onClick={() => onOpenQuickAdd('standard')}
          className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans font-medium text-xs sm:text-base rounded-xl shadow-xs active:scale-95 transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Add Item</span>
        </button>
      </div>
    </div>
  );
}
