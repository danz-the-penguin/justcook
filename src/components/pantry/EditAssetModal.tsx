'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePantryStore, EnrichedPantryItem } from '@/stores/usePantryStore';
import { X, Upload, Check, Trash2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { sound } from '@/lib/audio';

interface EditAssetModalProps {
  item: EnrichedPantryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditAssetModal({ item, isOpen, onClose }: EditAssetModalProps) {
  const { editCustomAsset, deleteAsset } = usePantryStore();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('pantry');
  const [defaultUnit, setDefaultUnit] = useState('piece');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name || '');
      setCategory(item.category || 'pantry');
      setDefaultUnit(item.defaultUnit || 'piece');
      setNewFile(null);
      setPreviewUrl(null);
      setError(null);
      setConfirmDelete(false);
    }
  }, [item, isOpen]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!isOpen || !item) return null;

  const handleFileChange = (file: File) => {
    if (!file) return;
    setNewFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('id', item.id);
    formData.append('slug', item.slug);
    formData.append('name', name.trim());
    formData.append('category', category);
    formData.append('defaultUnit', defaultUnit.trim());
    if (newFile) {
      formData.append('file', newFile);
    }

    const res = await editCustomAsset(formData);
    setIsSaving(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to save changes.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setIsSaving(true);
    const res = await deleteAsset(item.slug);
    setIsSaving(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to delete asset.');
    }
  };

  const currentDisplaySrc = previewUrl || item.pngAsset;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-2xl p-5 sm:p-7 max-w-lg w-full border border-[#e8e2d8] shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-lg border border-[#f0d9cf] shrink-0">
            <Sparkles className="w-5 h-5 text-[#cc5a35]" />
          </div>
          <div className="pr-6">
            <h3 className="font-serif text-2xl font-medium text-[#201b16] leading-snug">
              Edit Asset & Ingredient
            </h3>
            <p className="font-sans text-xs sm:text-sm text-[#796f64]">
              Update artwork sprite, naming, or category for <strong className="text-[#201b16]">{item.name}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#faeee8] border border-[#f0d9cf] text-[#8a3319] rounded-xl text-sm font-sans flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Visual Sprite Editor / Dropzone */}
          <div>
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
              Visual Asset Sprite
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`bg-white border rounded-2xl p-4 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isDragging
                  ? 'border-[#cc5a35] bg-[#faeee8]'
                  : 'border-[#e8e2d8]'
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Checkerboard transparency container */}
                <div
                  className="w-20 h-20 rounded-xl border border-[#e8e2d8] flex items-center justify-center p-2 relative overflow-hidden shrink-0 shadow-2xs"
                  style={{
                    backgroundImage: `linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)`,
                    backgroundSize: '16px 16px',
                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  }}
                >
                  <img
                    src={currentDisplaySrc}
                    alt={name}
                    className="max-h-full max-w-full object-contain drop-shadow-sm"
                  />
                </div>
                <div>
                  <h4 className="font-sans font-semibold text-sm text-[#201b16]">
                    {newFile ? newFile.name : `${item.slug}.png`}
                  </h4>
                  <p className="font-sans text-xs text-[#796f64] mt-0.5">
                    {newFile
                      ? `${(newFile.size / 1024).toFixed(1)} KB · Ready to replace`
                      : 'Current active sprite on shelf'}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-[#201b16] bg-[#faf8f5] hover:bg-[#f0ebe1] rounded-xl border border-[#e8e2d8] transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-[#cc5a35]" />
                  <span>Replace PNG</span>
                </button>
                {newFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewFile(null);
                      setPreviewUrl(null);
                    }}
                    className="px-3 py-1.5 text-xs font-sans text-[#796f64] hover:text-[#201b16] transition-colors text-center"
                  >
                    Revert
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] font-sans text-[#8c8276] mt-1.5 ml-1">
              Drop a transparent PNG here to swap the visual sprite for this food item.
            </p>
          </div>

          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                Ingredient Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              >
                <option value="pantry">Dry Pantry / Noodle / Sauce</option>
                <option value="produce">Produce / Vegetable / Mushroom</option>
                <option value="meat">Meat / Seafood / Protein</option>
                <option value="dairy">Dairy / Egg</option>
                <option value="spices">Spices / Seasoning / Oil</option>
              </select>
            </div>
          </div>

          {/* Default Unit */}
          <div>
            <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
              Default Measurement Unit
            </label>
            <input
              type="text"
              required
              placeholder="e.g. piece, g, ml, clove, slice, pack"
              value={defaultUnit}
              onChange={(e) => setDefaultUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-base font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#e8e2d8] gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSaving}
              className={`px-3.5 py-2.5 text-xs sm:text-sm font-sans font-medium rounded-xl border transition-all flex items-center space-x-1.5 ${
                confirmDelete
                  ? 'bg-[#cc5a35] text-white border-[#b54926] font-semibold'
                  : 'bg-white text-[#9e9488] hover:text-[#b34b29] hover:bg-[#faeee8] border-[#e8e2d8]'
              }`}
              title={confirmDelete ? 'Tap again to permanently delete this asset & file' : 'Delete asset completely'}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? 'Confirm Delete Asset?' : 'Delete Asset'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs sm:text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-xs sm:text-sm font-sans font-medium rounded-xl shadow-xs active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
