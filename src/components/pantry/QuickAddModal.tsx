'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { usePantryStore } from '@/stores/usePantryStore';
import {
  StorageLocation,
  calculateExpiryDate,
  CORE_DEFAULT_FOOD_SLUGS,
  snapToCulinaryFraction,
  formatQuantityWithCulinaryFraction,
  resolveFoodAsset,
} from '@/lib/constants/shelf-life';
import {
  X,
  Plus,
  Calendar,
  MapPin,
  Sparkles,
  Check,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Trash2,
  FileText,
  Wand2,
  ScanLine,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import { BarcodeScannerModal } from '@/components/pantry/BarcodeScannerModal';

interface QuickAddModalProps {
  isOpen: boolean;
  initialTab?: 'standard' | 'upload' | 'bulk';
  onClose: () => void;
}

interface ParsedBulkItem {
  id: string;
  name: string;
  slug: string;
  quantity: number;
  unit: string;
  category: string;
  location: StorageLocation;
  selected: boolean;
}

function processCanvasBackgroundRemoval(
  imgElement: HTMLImageElement,
  tolerance: number
): { blob: Promise<Blob | null>; dataUrl: string } {
  const canvas = document.createElement('canvas');
  canvas.width = imgElement.naturalWidth || imgElement.width;
  canvas.height = imgElement.naturalHeight || imgElement.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: Promise.resolve(null), dataUrl: '' };

  ctx.drawImage(imgElement, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Sample 4 corners to find background color
  const samplePoints = [
    [0, 0],
    [canvas.width - 1, 0],
    [0, canvas.height - 1],
    [canvas.width - 1, canvas.height - 1],
  ];

  let totalR = 0,
    totalG = 0,
    totalB = 0;
  for (const [x, y] of samplePoints) {
    const idx = (y * canvas.width + x) * 4;
    totalR += data[idx];
    totalG += data[idx + 1];
    totalB += data[idx + 2];
  }
  const bgR = totalR / 4;
  const bgG = totalG / 4;
  const bgB = totalB / 4;

  const tolDist = (tolerance / 100) * 441.67;
  const featherDist = tolDist * 1.25;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);

    if (dist <= tolDist) {
      data[i + 3] = 0;
    } else if (dist < featherDist) {
      const factor = (dist - tolDist) / (featherDist - tolDist);
      data[i + 3] = Math.round(data[i + 3] * factor);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const blobPromise = new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  return { blob: blobPromise, dataUrl };
}

export function QuickAddModal({ isOpen, initialTab = 'standard', onClose }: QuickAddModalProps) {
  const { items, activeLocation, addNewItemBatch, uploadCustomAsset, deleteAsset } = usePantryStore();

  const [modalTab, setModalTab] = useState<'standard' | 'upload' | 'bulk'>(initialTab);

  // Standard Stock state
  const [selectedSlug, setSelectedSlug] = useState<string>('egg');
  const [customName, setCustomName] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('pantry');
  const [location, setLocation] = useState<StorageLocation>(
    activeLocation === 'all' || activeLocation === 'spice' ? 'fridge' : activeLocation
  );
  const [quantity, setQuantity] = useState<number>(6);
  const [unit, setUnit] = useState<string>('piece');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload Custom Asset state
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawPreview, setRawPreview] = useState<string | null>(null);
  const [isAutoRemoveBg, setIsAutoRemoveBg] = useState<boolean>(false);
  const [bgTolerance, setBgTolerance] = useState<number>(32);
  const [isProcessingBg, setIsProcessingBg] = useState<boolean>(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('pantry');
  const [uploadLocation, setUploadLocation] = useState<StorageLocation>('pantry');
  const [uploadQuantity, setUploadQuantity] = useState<number>(4);
  const [uploadUnit, setUploadUnit] = useState<string>('piece');
  const [uploadExpiry, setUploadExpiry] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Receipt state
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkItems, setBulkItems] = useState<ParsedBulkItem[]>([]);
  const [isStockingBulk, setIsStockingBulk] = useState<boolean>(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);

  const handleProductFromBarcode = async (product: {
    name: string;
    category: string;
    imageUrl?: string;
    barcode: string;
  }) => {
    setIsBarcodeScannerOpen(false);
    setModalTab('upload');
    setUploadName(product.name);
    if (['produce', 'dairy', 'meat', 'pantry', 'frozen', 'spices', 'bakery'].includes(product.category)) {
      setUploadCategory(product.category);
    }
    if (product.imageUrl) {
      setUploadPreview(product.imageUrl);
      setRawPreview(product.imageUrl);
      try {
        const res = await fetch(product.imageUrl);
        const blob = await res.blob();
        const file = new File(
          [blob],
          `${product.name.replace(/[^a-z0-9]/gi, '_')}.jpg`,
          { type: blob.type || 'image/jpeg' }
        );
        setUploadFile(file);
        setRawFile(file);
      } catch (err) {
        console.warn('Could not fetch remote barcode image as blob:', err);
      }
    }
    sound.playSuccess();
  };

  // Sync tab with initialTab prop when opening
  useEffect(() => {
    if (isOpen) {
      setModalTab(initialTab);
      setUploadError(null);
    }
  }, [isOpen, initialTab]);

  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    };
  }, [uploadPreview]);

  // Available master food items
  const catalog = items.length > 0 ? items : [
    { slug: 'egg', name: 'Egg', category: 'dairy', defaultUnit: 'piece', pngAsset: '/assets/food/egg.png' },
    { slug: 'milk', name: 'Whole Milk', category: 'dairy', defaultUnit: 'ml', pngAsset: '/assets/food/milk.png' },
    { slug: 'butter', name: 'Butter', category: 'dairy', defaultUnit: 'g', pngAsset: '/assets/food/butter.png' },
    { slug: 'cheese', name: 'Cheddar Cheese', category: 'dairy', defaultUnit: 'g', pngAsset: '/assets/food/cheese.png' },
    { slug: 'tomato', name: 'Tomato', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/tomato.png' },
    { slug: 'spinach', name: 'Baby Spinach', category: 'produce', defaultUnit: 'g', pngAsset: '/assets/food/spinach.png' },
    { slug: 'garlic', name: 'Garlic', category: 'produce', defaultUnit: 'clove', pngAsset: '/assets/food/garlic.png' },
    { slug: 'onion', name: 'Yellow Onion', category: 'produce', defaultUnit: 'piece', pngAsset: '/assets/food/onion.png' },
    { slug: 'chicken', name: 'Chicken Breast', category: 'meat', defaultUnit: 'g', pngAsset: '/assets/food/chicken.png' },
    { slug: 'pasta', name: 'Penne Pasta', category: 'pantry', defaultUnit: 'g', pngAsset: '/assets/food/pasta.png' },
    { slug: 'yee_mee', name: 'Yee Mee', category: 'pantry', defaultUnit: 'piece', pngAsset: '/assets/food/yeemee.png' },
    { slug: 'rice', name: 'Jasmine Rice', category: 'pantry', defaultUnit: 'g', pngAsset: '/assets/food/rice.png' },
    { slug: 'bread', name: 'Artisan Bread', category: 'pantry', defaultUnit: 'slice', pngAsset: '/assets/food/bread.png' },
  ];

  // Auto-calculate smart expiry for standard stock
  useEffect(() => {
    if (customName.trim()) {
      const slug = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const exp = calculateExpiryDate(slug, customCategory, location);
      setExpiryDate(exp.toISOString().split('T')[0]);
      return;
    }
    const selected = catalog.find((i) => i.slug === selectedSlug);
    if (selected) {
      setUnit(selected.defaultUnit);
      if (['piece', 'slice', 'clove'].includes(selected.defaultUnit)) {
        setQuantity(6);
      } else {
        setQuantity(200);
      }

      const exp = calculateExpiryDate(selected.slug, selected.category, location);
      setExpiryDate(exp.toISOString().split('T')[0]);
    }
  }, [selectedSlug, location, customName, customCategory]);

  // Auto-calculate smart expiry for custom upload
  useEffect(() => {
    const slug = uploadName.trim()
      ? uploadName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : 'custom_item';
    const exp = calculateExpiryDate(slug, uploadCategory, uploadLocation);
    setUploadExpiry(exp.toISOString().split('T')[0]);
  }, [uploadName, uploadCategory, uploadLocation]);

  if (!isOpen) return null;

  const handleFileSelection = (file: File) => {
    if (!file) return;
    setRawFile(file);
    const objectUrl = URL.createObjectURL(file);
    setRawPreview(objectUrl);
    setUploadPreview(objectUrl);
    setUploadFile(file);
    setIsAutoRemoveBg(false);
    setUploadError(null);

    // If user hasn't typed a name yet, auto-generate clean readable title from filename
    if (!uploadName.trim()) {
      const baseName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      setUploadName(baseName);
    }
  };

  const handleApplyRemoveBg = async (enabled: boolean, tol: number) => {
    setIsAutoRemoveBg(enabled);
    if (!enabled) {
      if (rawFile && rawPreview) {
        setUploadFile(rawFile);
        setUploadPreview(rawPreview);
      }
      return;
    }

    if (!rawPreview) return;
    setIsProcessingBg(true);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = rawPreview;
    img.onload = async () => {
      const { blob: blobPromise, dataUrl } = processCanvasBackgroundRemoval(img, tol);
      const blob = await blobPromise;
      if (blob) {
        const processedFile = new File(
          [blob],
          (rawFile?.name || 'custom_artwork').replace(/\.[^/.]+$/, '') + '_transparent.png',
          { type: 'image/png' }
        );
        setUploadFile(processedFile);
        setUploadPreview(dataUrl);
      }
      setIsProcessingBg(false);
    };
  };

  const handleBulkTextChange = (text: string) => {
    setBulkText(text);
    const lines = text.split('\n');
    const parsed: ParsedBulkItem[] = [];

    const fractionUnicodeMap: Record<string, number> = {
      '½': 0.5,
      '¼': 0.25,
      '⅓': 1 / 3,
      '⅛': 0.125,
      '⅜': 0.375,
      '⅝': 0.625,
      '⅔': 2 / 3,
      '¾': 0.75,
      '⅞': 0.875,
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim().replace(/^[-*•]\s*/, '');
      if (!trimmed || trimmed.startsWith('#')) return;

      let qty = 1;
      let rest = trimmed;

      for (const [char, val] of Object.entries(fractionUnicodeMap)) {
        if (rest.startsWith(char)) {
          qty = val;
          rest = rest.slice(char.length).trim();
          break;
        }
      }

      const numMatch = rest.match(/^(\d+(?:\.\d+)?|\d+\/\d+)\s*(.*)$/);
      if (numMatch) {
        const rawNum = numMatch[1];
        if (rawNum.includes('/')) {
          const [num, den] = rawNum.split('/').map(Number);
          qty = den ? num / den : 1;
        } else {
          qty = parseFloat(rawNum) || 1;
        }
        rest = numMatch[2].trim();
      }

      let unit = 'piece';
      const unitMatch = rest.match(
        /^(g|gram|grams|kg|ml|l|liter|liters|bottle|bottles|jar|jars|can|cans|tin|tins|clove|cloves|slice|slices|head|heads|bunch|bunches|piece|pieces|tbsp|tsp|pinch)\b\s*(.*)$/i
      );
      if (unitMatch) {
        unit = unitMatch[1].toLowerCase();
        rest = unitMatch[2].trim();
      }

      rest = rest.replace(/^(of|in)\s+/i, '').trim();
      if (!rest) rest = 'Ingredient';

      const name = rest;
      const norm = name.toLowerCase();

      let category = 'produce';
      let loc: StorageLocation = 'fridge';

      if (/(milk|cheese|butter|yogurt|cream|egg)/i.test(norm)) {
        category = 'dairy';
        loc = 'fridge';
        if (!unitMatch && norm.includes('egg')) unit = 'piece';
      } else if (/(chicken|beef|pork|meat|fish|salmon|shrimp|bacon|prawn)/i.test(norm)) {
        category = 'meat';
        loc = 'fridge';
        if (!unitMatch) unit = 'g';
      } else if (/(pepper|salt|paprika|cumin|turmeric|spice|cinnamon|oregano|seasoning)/i.test(norm)) {
        category = 'spices';
        loc = 'pantry';
        if (!unitMatch) unit = 'g';
      } else if (/(sauce|oil|soy|vinegar|ketchup|mayo|pasta|rice|flour|noodle|yeemee)/i.test(norm)) {
        category = 'pantry';
        loc = 'pantry';
      } else if (/(lemon|lime|banana|apple|avocado|onion|garlic|potato|bread)/i.test(norm)) {
        category = 'produce';
        loc = 'counter';
      }

      parsed.push({
        id: `bulk-${idx}-${name}`,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        quantity: snapToCulinaryFraction(qty),
        unit,
        category,
        location: loc,
        selected: true,
      });
    });

    setBulkItems(parsed);
  };

  const handleStockBulk = async () => {
    setIsStockingBulk(true);
    sound.playDing();
    const toStock = bulkItems.filter((i) => i.selected);
    for (const item of toStock) {
      await addNewItemBatch({
        slug: item.slug,
        name: item.name,
        category: item.category,
        location: item.location,
        quantity: item.quantity,
        unit: item.unit,
      });
    }
    setIsStockingBulk(false);
    onClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelection(files[0]);
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const isCustom = customName.trim().length > 0;
    const selected = catalog.find((i) => i.slug === selectedSlug);
    const finalName = isCustom ? customName.trim() : selected?.name || selectedSlug;
    const finalSlug = isCustom
      ? customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
      : selectedSlug;
    const finalCategory = isCustom ? customCategory : selected?.category || 'produce';

    await addNewItemBatch({
      slug: finalSlug,
      name: finalName,
      category: finalCategory,
      location,
      quantity: Number(quantity),
      unit,
      obtainedAt: new Date().toISOString(),
      expiresAt: expiryDate ? new Date(expiryDate).toISOString() : undefined,
    });

    setCustomName('');
    setIsSubmitting(false);
    onClose();
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose or drop an image file first.');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('Please provide an ingredient name.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName.trim());
    formData.append('category', uploadCategory);
    formData.append('defaultUnit', uploadUnit.trim() || 'piece');
    formData.append('location', uploadLocation);
    formData.append('quantity', String(uploadQuantity));
    if (uploadExpiry) formData.append('expiresAt', uploadExpiry);

    const res = await uploadCustomAsset(formData);
    setIsUploading(false);

    if (res.success) {
      // Reset upload state
      setUploadFile(null);
      setUploadPreview(null);
      setUploadName('');
      onClose();
    } else {
      setUploadError(res.error || 'Failed to upload custom asset.');
    }
  };

  const locations: { id: StorageLocation; label: string; icon: string }[] = [
    { id: 'fridge', label: 'Fridge', icon: '🧊' },
    { id: 'freezer', label: 'Freezer', icon: '❄️' },
    { id: 'pantry', label: 'Dry Cupboard', icon: '🪵' },
    { id: 'counter', label: 'Countertop', icon: '🧂' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#faf8f5] rounded-2xl p-4 sm:p-7 max-w-xl w-full border border-[#e8e2d8] shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-9 h-9 rounded-full bg-white hover:bg-[#f0ebe1] flex items-center justify-center text-[#685f54] border border-[#e8e2d8] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3.5 mb-5 pb-4 border-b border-[#e8e2d8]">
          <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-lg border border-[#f0d9cf]">
            {modalTab === 'upload' ? (
              <Upload className="w-5 h-5 text-[#cc5a35]" />
            ) : modalTab === 'bulk' ? (
              <FileText className="w-5 h-5 text-[#cc5a35]" />
            ) : (
              '+'
            )}
          </div>
          <div>
            <h3 className="font-serif text-2xl font-medium text-[#201b16]">
              {modalTab === 'upload'
                ? 'Upload Custom Asset'
                : modalTab === 'bulk'
                ? 'Paste Grocery Receipt / Bulk'
                : 'Stock Pantry Item'}
            </h3>
            <p className="font-sans text-sm text-[#796f64]">
              {modalTab === 'upload'
                ? 'Upload artwork with automatic background removal & register ingredients'
                : modalTab === 'bulk'
                ? 'Paste shopping lists or receipt text to auto-parse and stock in 1 click'
                : 'Pick a preset below or type any custom ingredient'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-[#f0ebe1] rounded-xl mb-5 gap-1">
          <button
            type="button"
            onClick={() => {
              sound.playPop();
              setModalTab('standard');
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-sans font-medium rounded-lg transition-all text-center ${
              modalTab === 'standard'
                ? 'bg-white text-[#201b16] shadow-2xs font-semibold'
                : 'text-[#685f54] hover:text-[#201b16]'
            }`}
          >
            Presets &amp; Stock
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playPop();
              setModalTab('upload');
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-sans font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all text-center ${
              modalTab === 'upload'
                ? 'bg-white text-[#cc5a35] shadow-2xs font-semibold'
                : 'text-[#685f54] hover:text-[#201b16]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Artwork</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playPop();
              setModalTab('bulk');
            }}
            className={`py-2 px-2 text-xs sm:text-sm font-sans font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all text-center ${
              modalTab === 'bulk'
                ? 'bg-white text-[#cc5a35] shadow-2xs font-semibold'
                : 'text-[#685f54] hover:text-[#201b16]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playPop();
              setIsBarcodeScannerOpen(true);
            }}
            className="py-2 px-2 text-xs sm:text-sm font-sans font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all text-[#685f54] hover:text-[#201b16] hover:bg-white/60 text-center"
          >
            <ScanLine className="w-3.5 h-3.5 text-[#cc5a35]" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD CUSTOM ARTWORK */}
        {modalTab === 'upload' ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {uploadError && (
              <div className="p-3 bg-[#faeee8] border border-[#f0d9cf] text-[#8a3319] rounded-xl text-sm font-sans flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Dropzone & Preview */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
                Transparent PNG / Sprite Image *
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelection(e.target.files[0]);
                  }
                }}
              />

              {!uploadPreview ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-[#cc5a35] bg-[#faeee8]'
                      : 'border-[#dfd7c8] hover:border-[#cc5a35] bg-white'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[#faeee8] text-[#cc5a35] flex items-center justify-center mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <p className="font-serif text-lg text-[#201b16] font-medium">
                    Click to browse or drop PNG here
                  </p>
                  <p className="font-sans text-xs text-[#796f64] mt-1">
                    Recommended: 512×512 px transparent PNG (Max 1024×1024)
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="bg-white border border-[#e8e2d8] rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      {/* Checkered transparency background box */}
                      <div
                        className="w-18 h-18 rounded-xl border border-[#e8e2d8] flex items-center justify-center p-2 relative overflow-hidden"
                        style={{
                          backgroundImage: `linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)`,
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                        }}
                      >
                        <img
                          src={uploadPreview}
                          alt="Upload preview"
                          className="max-h-full max-w-full object-contain drop-shadow-sm"
                        />
                      </div>
                      <div>
                        <h4 className="font-sans font-semibold text-sm text-[#201b16] truncate max-w-[200px] sm:max-w-[260px]">
                          {uploadFile?.name}
                        </h4>
                        <p className="font-sans text-xs text-[#796f64] mt-0.5">
                          {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : ''} · Transparent Sprite Ready
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-sans font-medium text-[#685f54] hover:text-[#201b16] bg-[#faf8f5] hover:bg-[#f0ebe1] rounded-lg border border-[#e8e2d8] transition-colors"
                    >
                      Change File
                    </button>
                  </div>

                  {/* In-Browser Auto-Background Removal Tool */}
                  <div className="p-3.5 bg-white border border-[#e8e2d8] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer text-xs font-sans font-semibold text-[#201b16] select-none">
                        <input
                          type="checkbox"
                          checked={isAutoRemoveBg}
                          onChange={(e) => handleApplyRemoveBg(e.target.checked, bgTolerance)}
                          className="rounded border-[#cfc5b4] text-[#cc5a35] focus:ring-[#cc5a35] w-4 h-4"
                        />
                        <span className="flex items-center space-x-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-[#cc5a35]" />
                          <span>Auto-Remove Background (In-Browser)</span>
                        </span>
                      </label>
                      {isProcessingBg && (
                        <span className="text-[11px] font-sans font-medium text-[#cc5a35] animate-pulse">
                          Clipping alpha...
                        </span>
                      )}
                    </div>

                    {isAutoRemoveBg && (
                      <div className="pt-2 border-t border-[#f0ebe1] flex items-center space-x-3">
                        <span className="text-xs font-sans text-[#796f64] shrink-0 font-medium">
                          Tolerance: {bgTolerance}%
                        </span>
                        <input
                          type="range"
                          min="10"
                          max="70"
                          value={bgTolerance}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setBgTolerance(val);
                            handleApplyRemoveBg(true, val);
                          }}
                          className="w-full accent-[#cc5a35] cursor-pointer"
                        />
                      </div>
                    )}
                    <p className="text-[11px] font-sans text-[#8c8276] leading-relaxed">
                      Auto-detects corner cutting-board / solid colors and cuts them to transparent alpha on your device.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Ingredient Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                  Ingredient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yee Mee, Chili Crisp..."
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                >
                  <option value="pantry">Dry Pantry / Noodles / Sauce</option>
                  <option value="produce">Produce / Fresh / Mushroom</option>
                  <option value="meat">Meat / Seafood / Protein</option>
                  <option value="dairy">Dairy / Egg</option>
                  <option value="spices">Spices / Seasoning / Oil</option>
                </select>
              </div>
            </div>

            {/* Storage Zone */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
                Storage Zone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setUploadLocation(loc.id)}
                    className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl border text-xs sm:text-sm font-sans font-medium transition-all ${
                      uploadLocation === loc.id
                        ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold'
                        : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    <span>{loc.icon}</span>
                    <span>{loc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity, Unit & Expiry */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1">
                  Qty to Stock
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={uploadQuantity}
                  onChange={(e) => setUploadQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  required
                  value={uploadUnit}
                  onChange={(e) => setUploadUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  required
                  value={uploadExpiry}
                  onChange={(e) => setUploadExpiry(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-[#e8e2d8] rounded-xl text-xs sm:text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#e8e2d8]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-sm font-sans font-medium rounded-xl shadow-xs active:scale-95 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Uploading & Registering...' : 'Upload & Stock Shelf'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* TAB 2: PRESETS & QUICK ADD */
          <form onSubmit={handleStandardSubmit} className="space-y-5">
            {/* Custom Ingredient Type-In Bar */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2">
                Type Any Custom Ingredient (or pick a preset below)
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="e.g. Yee Mee, Oyster Sauce, Ginger, Dried Chillis..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                {customName.trim() && (
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                  >
                    <option value="pantry">Pantry / Sauce</option>
                    <option value="produce">Produce</option>
                    <option value="meat">Meat / Protein</option>
                    <option value="dairy">Dairy / Egg</option>
                  </select>
                )}
              </div>
              {/* Quick-Tap Asian & Global Staples */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-xs font-sans text-[#8c8276] mr-1">Popular Staples:</span>
                {[
                  { name: 'Yee Mee', cat: 'pantry', loc: 'pantry' as StorageLocation, unit: 'piece', qty: 4 },
                  { name: 'Light Soy Sauce', cat: 'pantry', loc: 'pantry' as StorageLocation, unit: 'ml', qty: 500 },
                  { name: 'Dark Soy Sauce', cat: 'pantry', loc: 'pantry' as StorageLocation, unit: 'ml', qty: 500 },
                  { name: 'Oyster Sauce', cat: 'pantry', loc: 'fridge' as StorageLocation, unit: 'ml', qty: 350 },
                  { name: 'Ginger', cat: 'produce', loc: 'counter' as StorageLocation, unit: 'piece', qty: 3 },
                  { name: 'Dried Chillis', cat: 'pantry', loc: 'pantry' as StorageLocation, unit: 'g', qty: 100 },
                  { name: 'Shiitake Mushroom', cat: 'produce', loc: 'pantry' as StorageLocation, unit: 'piece', qty: 10 },
                  { name: 'White Pepper', cat: 'pantry', loc: 'pantry' as StorageLocation, unit: 'g', qty: 80 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCustomName(preset.name);
                      setCustomCategory(preset.cat);
                      setLocation(preset.loc);
                      setUnit(preset.unit);
                      setQuantity(preset.qty);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-sans font-medium border transition-colors ${
                      customName.toLowerCase() === preset.name.toLowerCase()
                        ? 'bg-[#201b16] text-white border-[#201b16]'
                        : 'bg-white text-[#574f46] border-[#e8e2d8] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    +{preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Food Selection Grid */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2.5">
                Or Choose Preset Ingredient
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-52 overflow-y-auto p-2.5 bg-white rounded-xl border border-[#e8e2d8]">
                {catalog.map((item) => {
                  const isSelected = !customName.trim() && selectedSlug === item.slug;
                  const isCustom = !CORE_DEFAULT_FOOD_SLUGS.has(item.slug);
                  return (
                    <div key={item.slug} className="relative group/preset">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomName('');
                          setSelectedSlug(item.slug);
                        }}
                        className={`w-full flex flex-col items-center p-2.5 rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-[#faeee8] text-[#8a3319] border-[#cc5a35] shadow-xs scale-[1.02]'
                            : 'bg-[#faf8f5] hover:bg-[#f5f1ea] text-[#201b16] border-transparent'
                        }`}
                      >
                        <div className="w-12 h-12 relative flex items-center justify-center mb-1.5">
                          <Image
                            src={item.pngAsset}
                            alt={item.name}
                            width={48}
                            height={48}
                            className="object-contain drop-shadow-xs"
                          />
                        </div>
                        <span className="text-xs font-sans font-medium truncate max-w-full">
                          {item.name}
                        </span>
                      </button>

                      {/* Delete Custom Asset Button */}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (deletingSlug !== item.slug) {
                              setDeletingSlug(item.slug);
                              setTimeout(() => setDeletingSlug(null), 3000);
                              return;
                            }
                            await deleteAsset(item.slug);
                            setDeletingSlug(null);
                            if (selectedSlug === item.slug) {
                              setSelectedSlug('egg');
                            }
                          }}
                          className={`absolute top-1 right-1 p-1 rounded-md text-xs transition-all ${
                            deletingSlug === item.slug
                              ? 'bg-[#cc5a35] text-white shadow-xs z-10 px-1.5 text-[10px] font-bold'
                              : 'opacity-0 group-hover/preset:opacity-100 bg-white/90 hover:bg-[#faeee8] text-[#787067] hover:text-[#cc5a35] shadow-2xs'
                          }`}
                          title={deletingSlug === item.slug ? 'Click again to confirm asset deletion' : 'Delete custom asset'}
                        >
                          {deletingSlug === item.slug ? 'Del?' : <Trash2 className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-2.5">
                Storage Zone
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {locations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocation(loc.id)}
                    className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-sm font-sans font-medium transition-all ${
                      location === loc.id
                        ? 'bg-[#faeee8] border-[#cc5a35] text-[#8a3319] shadow-xs font-semibold'
                        : 'bg-white border-[#e8e2d8] text-[#685f54] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    <span>{loc.icon}</span>
                    <span>{loc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                  Unit
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
              </div>
            </div>

            {/* Smart Auto-Filled Expiry Date */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  Expiration Date
                </label>
                <span className="text-xs font-sans font-medium text-[#8a3319] bg-[#faeee8] border border-[#f0d9cf] px-2.5 py-0.5 rounded-full">
                  ✨ Smart Preset Auto-Filled
                </span>
              </div>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#e8e2d8]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-sm font-sans font-medium rounded-xl shadow-xs active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Adding...' : 'Add to Shelf'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: BULK / PASTE RECEIPT */}
        {modalTab === 'bulk' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider mb-1.5">
                Paste Grocery Receipt or Shopping Text
              </label>
              <p className="text-xs font-sans text-[#8c8276] mb-2 leading-relaxed">
                Type or paste one ingredient per line. Automatically parses fractions, weights, units, and assigns kitchen zones (Fridge, Cupboard, Counter):
              </p>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => handleBulkTextChange(e.target.value)}
                placeholder={"3 lemons\n500g chicken breast\n1 bottle soy sauce\n1/2 cabbage\n6 eggs\n50g black pepper"}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e8e2d8] rounded-xl text-sm font-sans font-medium text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35] placeholder:text-[#a89e92]"
              />
            </div>

            {bulkItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-sans font-semibold text-[#796f64] uppercase tracking-wider">
                  <span>
                    Parsed Items ({bulkItems.filter((i) => i.selected).length} of {bulkItems.length} selected)
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {bulkItems.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setBulkItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, selected: !it.selected } : it))
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        item.selected
                          ? 'bg-white border-[#cc5a35]/40 shadow-2xs'
                          : 'bg-[#f4efe8]/60 border-transparent opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                            item.selected
                              ? 'bg-[#cc5a35] border-[#cc5a35] text-white shadow-2xs'
                              : 'border-[#cfc5b4] bg-white'
                          }`}
                        >
                          {item.selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-[#faf8f5] border border-[#e8e2d8] flex items-center justify-center shrink-0 p-1">
                          <Image
                            src={resolveFoodAsset(item.slug, item.category)}
                            alt={item.name}
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <span className="font-sans font-medium text-xs sm:text-sm text-[#201b16] truncate">
                          {item.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 text-xs font-sans">
                        <span className="font-semibold text-[#201b16]">
                          {formatQuantityWithCulinaryFraction(item.quantity).display} {item.unit}
                        </span>
                        <span className="px-2 py-0.5 bg-[#f0ebe1] text-[#685f54] rounded-md text-[11px] capitalize">
                          {item.location}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2.5 pt-4 border-t border-[#e8e2d8]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-sans font-medium text-[#685f54] hover:bg-[#f0ebe1] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isStockingBulk || bulkItems.filter((i) => i.selected).length === 0}
                onClick={handleStockBulk}
                className="flex items-center space-x-2 px-5 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] disabled:opacity-40 text-white text-sm font-sans font-semibold rounded-xl shadow-xs active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isStockingBulk
                    ? 'Stocking...'
                    : `Stock All (${bulkItems.filter((i) => i.selected).length} Items)`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onProductFound={handleProductFromBarcode}
      />
    </div>
  );
}
