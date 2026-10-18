'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame, ArrowRight, Sparkles, ChefHat, Clock } from 'lucide-react';
import { EnrichedPantryItem } from '@/stores/usePantryStore';
import { RecipeMatchResult } from '@/lib/matcher';
import { sound } from '@/lib/audio';

interface ExpiryRescueCarouselProps {
  criticalItems: EnrichedPantryItem[];
  onStartCooking?: (recipe: any) => void;
}

export function ExpiryRescueCarousel({ criticalItems, onStartCooking }: ExpiryRescueCarouselProps) {
  const [rescueRecipes, setRescueRecipes] = useState<RecipeMatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (criticalItems.length === 0) {
      setRescueRecipes([]);
      return;
    }

    let isMounted = true;
    const fetchRescue = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/recipes?filter=rescue');
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.recipes)) {
          // Take top 4 highest match rescue recipes
          setRescueRecipes(data.recipes.slice(0, 4));
        }
      } catch (e) {
        console.error('Failed to fetch rescue recipes:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRescue();
    return () => {
      isMounted = false;
    };
  }, [criticalItems.length]);

  if (criticalItems.length === 0 || rescueRecipes.length === 0) {
    return null;
  }

  const criticalNames = criticalItems.map((c) => c.name).slice(0, 3).join(', ');

  return (
    <div className="mb-7 bg-gradient-to-r from-[#faeee8] via-[#fff5f0] to-[#fcf8f3] border border-[#f0d9cf] rounded-3xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
      {/* Decorative Warm Glow Circle */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#cc5a35]/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-[#cc5a35] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#201b16]">
              Tonight&apos;s Rescue Specials
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#7a2e16]">
              Cook <span className="font-semibold">{criticalNames}</span> before they expire to prevent food waste.
            </p>
          </div>
        </div>

        <Link
          href="/recipes?filter=rescue"
          className="text-xs sm:text-sm font-sans font-semibold text-[#9e3a19] hover:text-[#7a2e16] flex items-center space-x-1.5 self-start sm:self-auto transition-colors"
        >
          <span>View all rescue meals</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Carousel Scroll Row */}
      <div className="flex items-stretch space-x-3.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar relative z-10">
        {rescueRecipes.map((match) => {
          const rec = match.recipe;
          const rescueCount = match.rescuedIngredients?.length || 0;

          return (
            <div
              key={rec.id}
              className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#ecdcd3] hover:border-[#cc5a35] shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between shrink-0 w-[240px] sm:w-[270px] group"
            >
              <div>
                {/* Photo & Rescue Tag */}
                <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-[#faf8f5] mb-2.5">
                  <Image
                    src={rec.imageUrl || '/assets/food/chicken.png'}
                    alt={rec.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-[#cc5a35] text-white text-[10px] font-sans font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center space-x-1">
                    <Flame className="w-3 h-3" />
                    <span>Rescues {rescueCount}</span>
                  </div>
                </div>

                {/* Title & Info */}
                <h4 className="font-serif text-base sm:text-lg font-medium text-[#201b16] line-clamp-1 group-hover:text-[#cc5a35] transition-colors">
                  {rec.title}
                </h4>

                <div className="flex items-center space-x-2 text-xs font-sans text-[#787067] mt-1">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-[#cc5a35]" />
                    <span>{rec.cookTimeMinutes} min</span>
                  </span>
                  <span>•</span>
                  <span className="text-[#2d5930] font-semibold">{match.matchPercentage}% match</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2.5 border-t border-[#f2ede4] flex items-center justify-between">
                <span className="text-[11px] font-sans text-[#8c8276] truncate pr-1">
                  {match.rescuedIngredients?.map((r) => r.name).join(', ')}
                </span>
                <Link
                  href={`/recipes?filter=rescue`}
                  onClick={() => sound.playWoodTap()}
                  className="px-2.5 py-1 bg-[#faeee8] hover:bg-[#cc5a35] text-[#9e3a19] hover:text-white rounded-lg text-xs font-sans font-semibold transition-all shrink-0"
                >
                  Cook →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
