import { create } from 'zustand';
import { sound } from '@/lib/audio';
import { StorageLocation, registerCustomFoodSlug, snapToCulinaryFraction } from '@/lib/constants/shelf-life';

export interface PantryBatchData {
  id: string;
  pantryItemId: string;
  quantity: number;
  unit: string;
  obtainedAt: string;
  expiresAt: string;
  location: StorageLocation;
  notes?: string | null;
  size?: 'small' | 'medium' | 'large';
  slicesPerLoaf?: number;
  freshness: 'fresh' | 'use_soon' | 'critical' | 'expired';
  daysLeft: number;
}

export interface EnrichedPantryItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  defaultUnit: string;
  pngAsset: string;
  displayLimit: number;
  totalQuantity: number;
  soonestExpiry: string | null;
  oldestObtained: string | null;
  freshnessStatus: 'fresh' | 'use_soon' | 'critical' | 'expired';
  batches: PantryBatchData[];
}

export interface PrepItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  amount: number;
  unit: string;
  size?: 'small' | 'medium' | 'large';
  batchId?: string;
  droppedAt: number;
}

interface PantryStore {
  items: EnrichedPantryItem[];
  isLoading: boolean;
  activeLocation: 'all' | StorageLocation | 'spice';
  rescueFilter: boolean;
  isMuted: boolean;
  shopCount: number;
  prepItems: PrepItem[];
  isPrepBoardOpen: boolean;

  // Actions
  fetchPantry: () => Promise<void>;
  fetchShopCount: () => Promise<void>;
  setActiveLocation: (loc: 'all' | StorageLocation | 'spice') => void;
  toggleRescueFilter: () => void;
  toggleMute: () => void;
  setPrepBoardOpen: (open: boolean) => void;
  dropItemToPrepBoard: (item: EnrichedPantryItem, amount?: number, targetBatchId?: string) => Promise<void>;
  clearPrepItems: () => void;
  removePrepItem: (id: string) => void;
  incrementItem: (slug: string, location: StorageLocation, amount?: number) => Promise<void>;
  incrementBatch: (batchId: string, amount?: number) => Promise<void>;
  decrementBatch: (batchId: string, amount?: number) => Promise<void>;
  updateBatchQuantity: (batchId: string, newQuantity: number) => Promise<void>;
  updateBatchSize: (batchId: string, size: 'small' | 'medium' | 'large') => Promise<void>;
  deleteBatch: (batchId: string) => Promise<void>;
  deleteItem: (slug: string) => Promise<void>;
  deleteAsset: (slug: string) => Promise<{ success: boolean; error?: string }>;
  moveBatchLocation: (batchId: string, newLocation: StorageLocation) => Promise<void>;
  updateBatchDates: (batchId: string, expiresAt: string) => Promise<void>;
  updateBatchSlices: (batchId: string, slicesPerLoaf: number) => Promise<void>;
  addNewItemBatch: (payload: {
    slug: string;
    name?: string;
    category?: string;
    location: StorageLocation;
    quantity: number;
    unit?: string;
    size?: 'small' | 'medium' | 'large';
    slicesPerLoaf?: number;
    obtainedAt?: string;
    expiresAt?: string;
    notes?: string;
  }) => Promise<PantryBatchData | null>;
  uploadCustomAsset: (formData: FormData) => Promise<{ success: boolean; error?: string; item?: any }>;
  editCustomAsset: (formData: FormData) => Promise<{ success: boolean; error?: string; item?: any }>;
}

let lastDropKey = '';
let lastDropTimestamp = 0;

export const usePantryStore = create<PantryStore>((set, get) => ({
  items: [],
  isLoading: true,
  activeLocation: 'all',
  rescueFilter: false,
  isMuted: sound.isMuted(),
  shopCount: 0,
  prepItems: [],
  isPrepBoardOpen: false,

  setPrepBoardOpen: (open) => set({ isPrepBoardOpen: open }),

  dropItemToPrepBoard: async (item, amount = 1, targetBatchId?: string) => {
    const targetBatch = (targetBatchId ? item.batches.find((b) => b.id === targetBatchId) : null) || item.batches[0];
    const itemSize: 'small' | 'medium' | 'large' = targetBatch?.size || 'medium';
    const dropKey = `${item.slug}:${itemSize}:${targetBatch?.id || 'default'}`;

    const now = Date.now();
    // Guard against identical item double-drop within 350ms
    if (lastDropKey === dropKey && now - lastDropTimestamp < 350) {
      return;
    }
    lastDropKey = dropKey;
    lastDropTimestamp = now;

    sound.playPanImpact();
    const isLoafUnit = ['loaf', 'loaves'].includes((targetBatch?.unit || '').toLowerCase());
    const loafCap = targetBatch?.slicesPerLoaf || 8;
    const deductAmt = isLoafUnit
      ? Math.min(amount / loafCap, targetBatch ? targetBatch.quantity : (item.totalQuantity > 0 ? amount / loafCap : 0))
      : Math.min(amount, targetBatch ? targetBatch.quantity : (item.totalQuantity > 0 ? amount : 0));

    // Optimistically deduct from inventory if in stock
    if (targetBatch && deductAmt > 0) {
      get().decrementBatch(targetBatch.id, deductAmt);
    }

    // Add to prep board - keep distinct size tiers separate!
    const currentPrep = get().prepItems;
    const existing = currentPrep.find(
      (p) => p.slug === item.slug && (p.size || 'medium') === itemSize
    );

    let nextPrep: PrepItem[];
    if (existing) {
      nextPrep = currentPrep.map((p) =>
        p.id === existing.id
          ? { ...p, amount: snapToCulinaryFraction(p.amount + amount), droppedAt: Date.now() }
          : p
      );
    } else {
      nextPrep = [
        ...currentPrep,
        {
          id: `${item.slug}-${itemSize}-${Date.now()}`,
          slug: item.slug,
          name: item.name,
          category: item.category,
          amount: amount,
          unit: item.slug === 'bread' ? 'slice' : item.defaultUnit,
          size: itemSize,
          batchId: targetBatch?.id,
          droppedAt: Date.now(),
        },
      ];
    }

    set({ prepItems: nextPrep, isPrepBoardOpen: true });
  },

  clearPrepItems: () => {
    sound.playWoodTap();
    const currentPrep = get().prepItems;
    const allBatches = get().items.flatMap((i) => i.batches);
    // Refund prepped items back to their pantry batches
    for (const p of currentPrep) {
      if (p.batchId && p.amount > 0) {
        const b = allBatches.find((batch) => batch.id === p.batchId);
        const isLoaf = ['loaf', 'loaves'].includes((b?.unit || '').toLowerCase());
        const loafCap = b?.slicesPerLoaf || 8;
        const refundAmt = isLoaf ? p.amount / loafCap : p.amount;
        get().incrementBatch(p.batchId, refundAmt);
      }
    }
    set({ prepItems: [] });
  },

  removePrepItem: (id) => {
    sound.playDropImpact();
    const currentPrep = get().prepItems;
    const itemToRemove = currentPrep.find((p) => p.id === id);
    // Refund removed item back to its specific batch
    if (itemToRemove?.batchId && itemToRemove.amount > 0) {
      const allBatches = get().items.flatMap((i) => i.batches);
      const b = allBatches.find((batch) => batch.id === itemToRemove.batchId);
      const isLoaf = ['loaf', 'loaves'].includes((b?.unit || '').toLowerCase());
      const loafCap = b?.slicesPerLoaf || 8;
      const refundAmt = isLoaf ? itemToRemove.amount / loafCap : itemToRemove.amount;
      get().incrementBatch(itemToRemove.batchId, refundAmt);
    }
    set({ prepItems: currentPrep.filter((p) => p.id !== id) });
  },

  toggleMute: () => {
    const nextMuted = sound.toggleMute();
    set({ isMuted: nextMuted });
  },

  setActiveLocation: (loc) => {
    if (loc === 'fridge' || loc === 'freezer') {
      sound.playFridgeChime();
    } else {
      sound.playWoodTap();
    }
    set({ activeLocation: loc });
  },

  toggleRescueFilter: () => {
    sound.playPop();
    set((state) => ({ rescueFilter: !state.rescueFilter }));
  },

  fetchShopCount: async () => {
    try {
      const res = await fetch('/api/shopping');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        set({ shopCount: data.items.length });
      }
    } catch {}
  },

  fetchPantry: async () => {
    const isInitial = get().items.length === 0;
    if (isInitial) set({ isLoading: true });
    try {
      const res = await fetch('/api/pantry');
      const data = await res.json();
      if (data.success) {
        data.items.forEach((item: any) => {
          registerCustomFoodSlug(item.slug);
        });
        set({ items: data.items, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Error fetching pantry:', e);
      set({ isLoading: false });
    }
  },

  incrementItem: async (slug, location, amount = 1) => {
    sound.playPop();
    const prevItems = get().items;
    const item = prevItems.find((i) => i.slug === slug);
    const batch = item?.batches.find((b) => b.location === location);

    // Optimistic UI update for instant sprite pop
    if (item && batch) {
      const nextBatchQty = snapToCulinaryFraction(batch.quantity + amount);
      set({
        items: prevItems.map((i) =>
          i.slug === slug
            ? {
                ...i,
                totalQuantity: snapToCulinaryFraction(i.totalQuantity + amount),
                batches: i.batches.map((b) =>
                  b.id === batch.id ? { ...b, quantity: nextBatchQty } : b
                ),
              }
            : i
        ),
      });
    }

    try {
      if (batch) {
        const res = await fetch('/api/pantry', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId: batch.id, quantityChange: amount }),
        });
        if (!res.ok) set({ items: prevItems });
      } else {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, location, quantity: amount }),
        });
        await get().fetchPantry();
      }
    } catch (e) {
      console.error('Failed to increment item:', e);
      set({ items: prevItems });
    }
  },

  incrementBatch: async (batchId, amount = 1) => {
    sound.playPop();
    const prevItems = get().items;

    // Optimistic UI update for instant sprite pop
    set({
      items: prevItems.map((i) => {
        const hasBatch = i.batches.some((b) => b.id === batchId);
        if (!hasBatch) return i;
        const updatedBatches = i.batches.map((b) =>
          b.id === batchId
            ? { ...b, quantity: snapToCulinaryFraction(b.quantity + amount) }
            : b
        );
        const total = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);
        return {
          ...i,
          totalQuantity: snapToCulinaryFraction(total),
          batches: updatedBatches,
        };
      }),
    });

    try {
      const res = await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, quantityChange: amount }),
      });
      if (!res.ok) {
        set({ items: prevItems });
      }
    } catch (e) {
      console.error('Failed to increment batch:', e);
      set({ items: prevItems });
    }
  },

  decrementBatch: async (batchId, amount = 1) => {
    sound.playPop();
    const prevItems = get().items;

    // Optimistic UI update for instant sprite exit animation
    set({
      items: prevItems.map((i) => {
        const hasBatch = i.batches.some((b) => b.id === batchId);
        if (!hasBatch) return i;
        const updatedBatches = i.batches
          .map((b) =>
            b.id === batchId
              ? { ...b, quantity: snapToCulinaryFraction(Math.max(0, b.quantity - amount)) }
              : b
          )
          .filter((b) => b.quantity > 0.005);
        const total = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);
        return {
          ...i,
          totalQuantity: snapToCulinaryFraction(total),
          batches: updatedBatches,
        };
      }),
    });

    try {
      const res = await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, quantityChange: -amount }),
      });
      if (!res.ok) {
        set({ items: prevItems });
      }
    } catch (e) {
      console.error('Failed to decrement batch:', e);
      set({ items: prevItems });
    }
  },

  updateBatchQuantity: async (batchId, newQuantity) => {
    sound.playPop();
    const prevItems = get().items;
    const sanitizedQty = Math.max(0, snapToCulinaryFraction(newQuantity));

    set({
      items: prevItems.map((i) => {
        const hasBatch = i.batches.some((b) => b.id === batchId);
        if (!hasBatch) return i;
        const updatedBatches = i.batches
          .map((b) => (b.id === batchId ? { ...b, quantity: sanitizedQty } : b))
          .filter((b) => b.quantity > 0.005);
        const total = updatedBatches.reduce((acc, b) => acc + b.quantity, 0);
        return {
          ...i,
          totalQuantity: snapToCulinaryFraction(total),
          batches: updatedBatches,
        };
      }),
    });

    try {
      await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, newQuantity: sanitizedQty }),
      });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to update batch quantity:', e);
      set({ items: prevItems });
    }
  },

  updateBatchSize: async (batchId, size) => {
    sound.playPop();
    try {
      await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, newSize: size }),
      });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to update batch size:', e);
    }
  },

  deleteBatch: async (batchId) => {
    sound.playPop();
    try {
      await fetch(`/api/pantry?batchId=${batchId}`, { method: 'DELETE' });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to delete batch:', e);
    }
  },

  deleteItem: async (slug) => {
    sound.playPop();
    const prevItems = get().items;
    set({
      items: prevItems.map((i) =>
        i.slug === slug ? { ...i, totalQuantity: 0, batches: [] } : i
      ),
    });
    try {
      await fetch(`/api/pantry?slug=${slug}`, { method: 'DELETE' });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to delete item:', e);
      set({ items: prevItems });
    }
  },

  deleteAsset: async (slug) => {
    sound.playPop();
    const prevItems = get().items;
    set({
      items: prevItems.filter((i) => i.slug !== slug),
    });
    try {
      const res = await fetch(`/api/pantry?slug=${slug}&deleteAsset=true`, { method: 'DELETE' });
      const data = await res.json();
      await get().fetchPantry();
      return { success: data.success, error: data.error };
    } catch (e: any) {
      console.error('Failed to delete asset:', e);
      set({ items: prevItems });
      return { success: false, error: e?.message || 'Failed to delete asset' };
    }
  },

  moveBatchLocation: async (batchId, newLocation) => {
    if (newLocation === 'fridge' || newLocation === 'freezer') {
      sound.playFridgeChime();
    } else {
      sound.playWoodTap();
    }
    try {
      await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, newLocation }),
      });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to move batch location:', e);
    }
  },

  updateBatchDates: async (batchId, expiresAt) => {
    sound.playPop();
    try {
      await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, newExpiresAt: expiresAt }),
      });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to update batch dates:', e);
    }
  },

  updateBatchSlices: async (batchId, slicesPerLoaf) => {
    sound.playPop();
    try {
      await fetch('/api/pantry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, slicesPerLoaf }),
      });
      await get().fetchPantry();
    } catch (e) {
      console.error('Failed to update batch slices:', e);
    }
  },

  addNewItemBatch: async (payload) => {
    sound.playPop();
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await get().fetchPantry();
      return (data.batch as PantryBatchData) || null;
    } catch (e) {
      console.error('Failed to add new batch:', e);
      return null;
    }
  },

  uploadCustomAsset: async (formData: FormData) => {
    sound.playDing();
    try {
      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (data.item?.slug) {
          registerCustomFoodSlug(data.item.slug);
        }
        await get().fetchPantry();
        return { success: true, item: data.item };
      }
      return { success: false, error: data.error || 'Upload failed' };
    } catch (e: any) {
      console.error('Failed to upload custom asset:', e);
      return { success: false, error: e?.message || 'Network error' };
    }
  },

  editCustomAsset: async (formData: FormData) => {
    sound.playDing();
    try {
      const res = await fetch('/api/assets/edit', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        if (data.item?.slug) {
          registerCustomFoodSlug(data.item.slug);
        }
        await get().fetchPantry();
        return { success: true, item: data.item };
      }
      return { success: false, error: data.error || 'Edit failed' };
    } catch (e: any) {
      console.error('Failed to edit custom asset:', e);
      return { success: false, error: e?.message || 'Network error' };
    }
  },
}));
