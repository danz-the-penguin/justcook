'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePantryStore } from '@/stores/usePantryStore';
import { Volume2, VolumeX, ChefHat, BookOpen, Trophy, ShoppingBag, Save } from 'lucide-react';
import { ShoppingListDrawer } from '@/components/shopping/ShoppingListDrawer';
import { SaveLoadModal } from '@/components/pantry/SaveLoadModal';
import { sound } from '@/lib/audio';

export function Navbar({ activePage = 'pantry' }: { activePage?: 'pantry' | 'recipes' | 'trophies' }) {
  const router = useRouter();
  const { isMuted, toggleMute, shopCount, fetchShopCount, items } = usePantryStore();
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);

  useEffect(() => {
    fetchShopCount();
  }, [isShoppingOpen, fetchShopCount]);

  // Touch Swipe Navigation between Pantry ↔ Recipes ↔ Impact
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest?.('.touch-none') ||
        target?.closest?.('[data-no-swipe]') ||
        target?.closest?.('#tactile-prep-board') ||
        target?.closest?.('input, select, textarea, button')
      ) {
        touchStartX = 0;
        return;
      }
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartX) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - touchStartX;
      const deltaY = endY - touchStartY;
      const duration = Date.now() - touchStartTime;

      touchStartX = 0;

      // Deliberate horizontal swipe (>55px horizontal, <450ms, Math.abs(deltaX) > 1.8 * deltaY)
      if (duration > 450 || Math.abs(deltaX) < 55 || Math.abs(deltaX) < 1.8 * Math.abs(deltaY)) {
        return;
      }

      if (deltaX < -55) {
        // Swiped Left -> Advance
        if (activePage === 'pantry') {
          sound.playWoodTap();
          router.push('/recipes');
        } else if (activePage === 'recipes') {
          sound.playWoodTap();
          router.push('/trophies');
        }
      } else if (deltaX > 55) {
        // Swiped Right -> Go Back
        if (activePage === 'trophies') {
          sound.playWoodTap();
          router.push('/recipes');
        } else if (activePage === 'recipes') {
          sound.playWoodTap();
          router.push('/');
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activePage, router]);

  const availableCount = items.filter((i) => i.totalQuantity > 0).length;

  const navItems: { id: 'pantry' | 'recipes' | 'trophies'; label: string; href: string; badge?: number }[] = [
    { id: 'pantry', label: 'Pantry', href: '/', badge: availableCount > 0 ? availableCount : undefined },
    { id: 'recipes', label: 'Recipes', href: '/recipes' },
    { id: 'trophies', label: 'Impact', href: '/trophies' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#e5dec9]">
        <div className="w-full max-w-[1800px] mx-auto px-3.5 sm:px-10 lg:px-14 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Editorial Brand + Desktop Navigation */}
          <div className="flex items-center space-x-3 sm:space-x-8 min-w-0">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group shrink-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#cc5a35] group-hover:scale-125 transition-transform" />
              <span className="font-serif text-lg sm:text-2xl lg:text-3xl tracking-tight text-[#1f1b16] font-medium whitespace-nowrap">
                Pantry Chef
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center space-x-1 sm:space-x-2">
              {navItems.map((nav) => {
                const isActive = activePage === nav.id;
                return (
                  <Link
                    key={nav.id}
                    href={nav.href}
                    className={`relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-base font-sans transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#ebe4d8] text-[#1f1b16] font-semibold'
                        : 'text-[#685f54] hover:text-[#1f1b16] hover:bg-[#f2ede4]'
                    }`}
                  >
                    <span>{nav.label}</span>
                    {nav.badge !== undefined && (
                      <span
                        className={`text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-[#201b16] text-[#faf8f5] font-semibold'
                            : 'bg-[#e5dec9] text-[#524b42]'
                        }`}
                      >
                        {nav.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Larger Utility Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {/* Save / Load Snapshots & Starter Presets */}
            <button
              onClick={() => {
                sound.playWoodTap();
                setIsSaveLoadOpen(true);
              }}
              className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 h-9 sm:h-11 rounded-xl text-xs sm:text-base font-sans font-medium bg-white border border-[#e2d9cc] text-[#201b16] hover:bg-[#f5f1ea] shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Save Snapshots, Load Starter Presets, or Backup File"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc5a35]" />
              <span className="hidden lg:inline">Save / Load</span>
            </button>

            <button
              onClick={() => setIsShoppingOpen(true)}
              className="flex items-center space-x-1.5 sm:space-x-2.5 px-2.5 sm:px-4 py-1.5 sm:py-2.5 h-9 sm:h-11 rounded-xl text-xs sm:text-base font-sans font-medium bg-white border border-[#e2d9cc] text-[#201b16] hover:bg-[#f5f1ea] shadow-2xs transition-all"
              title="Open Grocery Shopping List"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc5a35]" />
              <span className="hidden md:inline">Shopping List</span>
              {shopCount > 0 && (
                <span className="bg-[#cc5a35] text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full">
                  {shopCount}
                </span>
              )}
            </button>

            <button
              onClick={toggleMute}
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white border border-[#e2d9cc] text-[#685f54] hover:text-[#1f1b16] hover:bg-[#f5f1ea] transition-all"
              title={isMuted ? 'Unmute kitchen sounds' : 'Mute kitchen sounds'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-[#9e9488]" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#cc5a35]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide Navigation Bar (Pantry ↔ Recipes ↔ Impact) */}
      <div className="sm:hidden sticky top-16 z-30 bg-[#faf8f5]/95 backdrop-blur-md px-3 py-2 border-b border-[#e5dec9]">
        <div className="relative flex items-center bg-[#eee7db] p-1 rounded-2xl border border-[#ded7cb] shadow-2xs">
          {navItems.map((nav) => {
            const isActive = activePage === nav.id;
            return (
              <Link
                key={nav.id}
                href={nav.href}
                className={`relative flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-sans rounded-xl transition-all select-none text-center ${
                  isActive ? 'text-[#1f1b16] font-semibold' : 'text-[#787067] hover:text-[#1f1b16]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-navbar-active-pill"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-xl shadow-xs border border-[#ded7cb]"
                  />
                )}
                <span className="relative z-10">{nav.label}</span>
                {nav.badge !== undefined && (
                  <span
                    className={`relative z-10 text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-[#201b16] text-[#faf8f5]' : 'bg-[#ded7cb] text-[#524b42]'
                    }`}
                  >
                    {nav.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Shopping List Slide-Over Drawer */}
      <ShoppingListDrawer
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
      />

      {/* Save & Load Snapshots / Starter Presets Modal */}
      <SaveLoadModal
        isOpen={isSaveLoadOpen}
        onClose={() => setIsSaveLoadOpen(false)}
      />
    </>
  );
}
