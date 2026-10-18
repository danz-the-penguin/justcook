'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, Check, Trash2, ShoppingBag, Plus, Sparkles } from 'lucide-react';
import { sound } from '@/lib/audio';
import { usePantryStore } from '@/stores/usePantryStore';

interface ShoppingItemData {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  category: string;
  isChecked: boolean;
  sourceRecipe?: string | null;
}

interface ShoppingListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingListDrawer({ isOpen, onClose }: ShoppingListDrawerProps) {
  const { fetchPantry, fetchShopCount } = usePantryStore();
  const [items, setItems] = useState<ShoppingItemData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [transferMessage, setTransferMessage] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/shopping');
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
      }
      await fetchShopCount();
    } catch (e) {
      console.error('Failed to load shopping items:', e);
    } finally {
      setIsLoading(false);
    }
  }, [fetchShopCount]);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  const handleToggle = async (id: string, current: boolean) => {
    sound.playPop();
    try {
      await fetch('/api/shopping', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isChecked: !current }),
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isChecked: !current } : item))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    sound.playPop();
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: newItemName.trim(), amount: Number(newItemQty) || 1, unit: 'piece' }],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewItemName('');
        setNewItemQty('1');
        loadItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteItem = async (id: string) => {
    sound.playPop();
    try {
      await fetch(`/api/shopping?id=${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((i) => i.id !== id));
      fetchShopCount();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTransferToPantry = async () => {
    sound.playDing();
    try {
      const res = await fetch('/api/shopping/transfer', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchPantry();
        await loadItems();
        setTransferMessage(`Stocked ${data.transferredCount} item(s) into your kitchen pantry with smart expiry dates!`);
        setTimeout(() => setTransferMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const checkedCount = items.filter((i) => i.isChecked).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#faf8f5] h-full shadow-2xl flex flex-col justify-between border-l border-[#e8e2d8]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[#e8e2d8] flex items-center justify-between bg-[#f5efe6]/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold border border-[#f0d9cf] shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-[#201b16]">Kitchen Shopping List</h3>
              <p className="font-sans text-xs sm:text-sm text-[#796f64]">Missing ingredients to grab at the market</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
          {transferMessage && (
            <div className="p-3.5 bg-[#edf5ee] border border-[#d2e7d3] text-[#2d5930] rounded-xl text-sm font-sans font-medium flex items-center space-x-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{transferMessage}</span>
            </div>
          )}

          {/* Quick Manual Add Form */}
          <form onSubmit={handleAddItem} className="flex items-center space-x-2 mb-4">
            <input
              type="text"
              placeholder="Add item (e.g. Garlic, Cream)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
            <input
              type="number"
              min="1"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="w-16 px-2.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans text-center focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white font-sans text-sm rounded-xl shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Items List */}
          {isLoading ? (
            <div className="py-14 text-center text-sm font-serif italic text-[#8c8276]">Loading list...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-14 text-[#8c8276] space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto opacity-30" />
              <p className="font-serif text-lg text-[#201b16]">Your shopping list is empty</p>
              <p className="font-sans text-sm">Click &quot;+ Add Missing to Shopping List&quot; on any recipe.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggle(item.id, item.isChecked)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    item.isChecked
                      ? 'bg-[#edf5ee]/70 border-[#d2e7d3] text-[#2d5930] opacity-80'
                      : 'bg-white border-[#e8e2d8] hover:bg-[#fbf9f6] text-[#201b16]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        item.isChecked
                          ? 'bg-[#2d5930] border-[#2d5930] text-white'
                          : 'border-[#ded7cb] bg-white'
                      }`}
                    >
                      {item.isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p
                        className={`text-sm font-sans capitalize ${
                          item.isChecked ? 'line-through text-[#2d5930]' : 'font-medium text-[#201b16]'
                        }`}
                      >
                        {item.name}
                      </p>
                      {item.sourceRecipe && (
                        <p className="text-xs text-[#8c8276]">For {item.sourceRecipe}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-sans font-medium bg-[#f0ebe1] text-[#685f54] px-2.5 py-1 rounded-lg">
                      {item.amount || 1} {item.unit || 'pc'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="text-[#9e9488] hover:text-[#b34b29] p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#e8e2d8] bg-[#f5efe6]/60 space-y-2.5">
          {checkedCount > 0 && (
            <button
              onClick={handleTransferToPantry}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-[#201b16] hover:bg-[#383129] active:scale-95 text-[#faf8f5] text-sm font-sans font-medium rounded-xl shadow-xs transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#e69374]" />
              <span>Stock {checkedCount} Checked to Pantry</span>
            </button>
          )}

          <div className="flex items-center justify-between text-xs sm:text-sm font-sans text-[#796f64] px-1">
            <span>{items.length} item{items.length !== 1 ? 's' : ''} total</span>
            <span>{checkedCount} checked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
