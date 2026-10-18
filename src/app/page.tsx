'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { StorageZoneTabs } from '@/components/pantry/StorageZoneTabs';
import { TactileAssetCard } from '@/components/pantry/TactileAssetCard';
import { BatchAdjustModal } from '@/components/pantry/BatchAdjustModal';
import { QuickAddModal } from '@/components/pantry/QuickAddModal';
import { EditAssetModal } from '@/components/pantry/EditAssetModal';
import { usePantryStore, EnrichedPantryItem, PantryBatchData } from '@/stores/usePantryStore';
import { isSpiceOrJarItem } from '@/lib/constants/shelf-life';
import { ExpiryRescueCarousel } from '@/components/pantry/ExpiryRescueCarousel';
import { TactileImpactBoard } from '@/components/pantry/TactileImpactBoard';
import { sound } from '@/lib/audio';
import { Flame, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PantryKitchenPage() {
  const { items, isLoading, fetchPantry, activeLocation, rescueFilter } = usePantryStore();

  const [selectedBatch, setSelectedBatch] = useState<PantryBatchData | null>(null);
  const [selectedItem, setSelectedItem] = useState<EnrichedPantryItem | null>(null);
  const [selectedEditItem, setSelectedEditItem] = useState<EnrichedPantryItem | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddTab, setQuickAddTab] = useState<'standard' | 'upload' | 'bulk'>('standard');

  useEffect(() => {
    fetchPantry();

    // Unlock Web Audio immediately on first mobile screen touch
    const unlockAudio = () => {
      sound.init();
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio);
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, [fetchPantry]);

  const displayedItems = items
    .map((item) => {
      const matchingBatches =
        activeLocation === 'all'
          ? item.batches
          : activeLocation === 'spice'
          ? (isSpiceOrJarItem(item.category, item.defaultUnit, item.slug) ? item.batches : [])
          : item.batches.filter((b) => b.location === activeLocation);

      if (matchingBatches.length === 0) return null;

      const totalQuantity = matchingBatches.reduce((sum, b) => sum + b.quantity, 0);

      return {
        ...item,
        totalQuantity,
        batches: matchingBatches,
      };
    })
    .filter((item): item is EnrichedPantryItem => item !== null)
    .filter((item) => {
      if (rescueFilter) {
        return item.freshnessStatus === 'critical' || item.freshnessStatus === 'use_soon';
      }
      return true;
    });

  const criticalItems = items.filter(
    (i) => i.freshnessStatus === 'critical' || i.freshnessStatus === 'use_soon'
  );

  const handleEditBatch = (batch: PantryBatchData, item: EnrichedPantryItem) => {
    setSelectedBatch(batch);
    setSelectedItem(item);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#201b16] selection:bg-[#faeee8] selection:text-[#9e3a19]">
      <Navbar activePage="pantry" />

      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-10 lg:px-14 py-5 sm:py-8 pb-36 sm:pb-40">
        {/* Clear, Readable Editorial Header */}
        <div className="mb-6 sm:mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#201b16] font-normal tracking-tight">
              Your Kitchen Pantry
            </h1>
            <p className="font-sans text-sm sm:text-lg text-[#685f54] mt-1 sm:mt-1.5">
              Tap any shelf to add stock, or match recipes with what you have on hand.
            </p>
          </div>

          <Link
            href="/recipes"
            className="inline-flex items-center space-x-2.5 px-5 py-3 bg-[#201b16] hover:bg-[#383129] text-[#faf8f5] font-sans font-medium text-base rounded-xl shadow-xs active:scale-95 transition-all self-start sm:self-auto"
          >
            <ChefHat className="w-5 h-5 text-[#e69374]" />
            <span>Match Recipes ({items.filter((i) => i.totalQuantity > 0).length})</span>
            <ArrowRight className="w-5 h-5 text-[#ded7cb]" />
          </Link>
        </div>

        {/* Expiry Rescue Carousel Banner */}
        <ExpiryRescueCarousel criticalItems={criticalItems} />

        {/* Storage Zone Switcher Tabs */}
        <StorageZoneTabs
          onOpenQuickAdd={(tab = 'standard') => {
            setQuickAddTab(tab);
            setIsQuickAddOpen(true);
          }}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-[#cc5a35]/20 border-t-[#cc5a35] rounded-full animate-spin mx-auto mb-3.5" />
            <p className="font-serif italic text-lg text-[#796f64]">Opening your kitchen cupboards...</p>
          </div>
        )}

        {/* The Visual Tactile Pantry Shelf Grid - Full-Screen Multi-Column */}
        {!isLoading && displayedItems.length > 0 && (
          activeLocation === 'spice' ? (
            /* Illustrated Wooden 2-Tier Spice Rack */
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#2e1d13] via-[#3a271b] to-[#24170e] border-4 border-[#523924] shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#543b29] pb-4 mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">🧂</span>
                  <div>
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#f3eedf] font-normal tracking-wide">
                      Chef&apos;s Spice &amp; Seasoning Rack
                    </h2>
                    <p className="text-xs sm:text-sm font-sans text-[#c4b59f]">
                      Dedicated display for small jars, shakers, ground spices, and liquid condiments
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 bg-[#1f140c]/80 px-3.5 py-1.5 rounded-full border border-[#543b29] text-xs font-mono text-[#d4af37] self-start sm:self-auto">
                  <span>✨ Brass Guarded Rails</span>
                </div>
              </div>

              {/* Brass Guard Rail Line */}
              <div className="h-1.5 w-full bg-gradient-to-r from-[#8a6d2f] via-[#d4af37] to-[#8a6d2f] rounded-full mb-6 shadow-sm opacity-90" />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedItems.map((item) => (
                  <TactileAssetCard
                    key={item.id}
                    item={item}
                    onEditBatch={handleEditBatch}
                    onEditItem={(it) => setSelectedEditItem(it)}
                  />
                ))}
              </div>

              {/* Bottom Tier Wooden Ledge */}
              <div className="mt-8 pt-4 border-t-2 border-[#543b29] flex flex-col sm:flex-row items-center justify-between text-xs text-[#a39480] font-sans gap-2">
                <span>{displayedItems.length} Seasoning Container(s) on Rack</span>
                <span className="italic font-serif">A pinch of quality makes every dish</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedItems.map((item) => (
                <TactileAssetCard
                  key={item.id}
                  item={item}
                  onEditBatch={handleEditBatch}
                  onEditItem={(it) => setSelectedEditItem(it)}
                />
              ))}
            </div>
          )
        )}

        {/* Empty State */}
        {!isLoading && displayedItems.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-[#dfd7c8] p-6 sm:p-12 text-center max-w-lg mx-auto my-8 sm:my-12">
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">This shelf is empty</h3>
            <p className="font-sans text-sm sm:text-base text-[#796f64] mt-2 mb-6">
              No items stored in this zone yet. Choose from presets, paste your grocery receipt, or upload custom food artwork.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
              <button
                onClick={() => {
                  setQuickAddTab('bulk');
                  setIsQuickAddOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#f0ebe1] text-[#574f46] hover:text-[#201b16] font-sans font-medium text-sm rounded-xl border border-[#e8e2d8] shadow-2xs transition-all active:scale-95"
              >
                + Paste Receipt
              </button>
              <button
                onClick={() => {
                  setQuickAddTab('upload');
                  setIsQuickAddOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#f0ebe1] text-[#574f46] hover:text-[#201b16] font-sans font-medium text-sm rounded-xl border border-[#e8e2d8] shadow-2xs transition-all active:scale-95"
              >
                + Upload Custom Asset
              </button>
              <button
                onClick={() => {
                  setQuickAddTab('standard');
                  setIsQuickAddOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans font-medium text-sm rounded-xl shadow-xs transition-all active:scale-95"
              >
                + Add Item
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Interactive Chef's Prep Station & Sizzle Pan */}
      <TactileImpactBoard />

      {/* Modals */}
      {selectedBatch && selectedItem && (
        <BatchAdjustModal
          batch={selectedBatch}
          item={selectedItem}
          onOpenEditItem={(it) => setSelectedEditItem(it)}
          onClose={() => {
            setSelectedBatch(null);
            setSelectedItem(null);
          }}
        />
      )}

      <EditAssetModal
        item={selectedEditItem}
        isOpen={Boolean(selectedEditItem)}
        onClose={() => setSelectedEditItem(null)}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        initialTab={quickAddTab}
        onClose={() => setIsQuickAddOpen(false)}
      />
    </div>
  );
}
