'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Upload,
  Download,
  Sparkles,
  Check,
  Trash2,
  Clock,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Image as ImageIcon,
  FolderArchive,
  FileArchive,
  Package,
} from 'lucide-react';
import { usePantryStore } from '@/stores/usePantryStore';
import { sound } from '@/lib/audio';
import { STARTER_PRESETS, StarterPreset } from '@/lib/constants/starter-presets';
import {
  LocalSaveSlot,
  getAllSaveSlots,
  saveSlot,
  deleteSaveSlot,
} from '@/lib/storage/save-slots-db';

export type { LocalSaveSlot };

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveLoadModal({ isOpen, onClose }: SaveLoadModalProps) {
  const { fetchPantry, fetchShopCount } = usePantryStore();
  const [activeTab, setActiveTab] = useState<'slots' | 'presets' | 'file'>('slots');
  const [slots, setSlots] = useState<LocalSaveSlot[]>([]);
  const [newSlotName, setNewSlotName] = useState('');
  const [notification, setNotification] = useState<{ message: string; isError?: boolean } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load slots from IndexedDB (with localStorage fallback & auto-migration) on mount / modal open
  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      getAllSaveSlots()
        .then((loaded) => {
          if (isMounted) setSlots(loaded);
        })
        .catch((err) => console.error('Failed to load slots:', err));
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const reloadSlots = async () => {
    try {
      const updated = await getAllSaveSlots();
      setSlots(updated);
    } catch (err) {
      console.error('Failed to reload slots:', err);
    }
  };

  const showNotify = (message: string, isError = false) => {
    setNotification({ message, isError });
    setTimeout(() => setNotification(null), 3800);
  };

  // 1. Create a new Save Slot from current kitchen state (with all embedded image assets)
  const handleSaveCurrentState = async () => {
    setIsLoadingAction(true);
    try {
      const res = await fetch('/api/backup');
      const backupData = await res.json();
      if (!backupData || !backupData.pantryItems) {
        throw new Error('Failed to capture current kitchen state');
      }

      const totalItems = backupData.pantryItems.reduce(
        (sum: number, it: any) => sum + (it.batches?.length || 0),
        0
      );

      const assetCount = backupData.assets ? Object.keys(backupData.assets).length : 0;
      const name = newSlotName.trim() || `Save Slot ${slots.length + 1}`;
      const newSlot: LocalSaveSlot = {
        id: `slot-${Date.now()}`,
        name,
        savedAt: new Date().toISOString(),
        itemCount: totalItems,
        hasAssets: assetCount > 0,
        assetCount,
        payload: backupData,
      };

      await saveSlot(newSlot);
      await reloadSlots();
      setNewSlotName('');
      sound.playDing();
      sound.triggerHaptic('success');
      showNotify(`Snapshot "${name}" saved (${assetCount} assets preserved)!`);
    } catch (e: any) {
      showNotify(e.message || 'Error saving snapshot', true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // 2. Load a Save Slot (restores DB & recreates image files on disk)
  const handleLoadSlot = async (slot: LocalSaveSlot) => {
    setIsLoadingAction(true);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...slot.payload,
          cleanRestore: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        sound.playDing();
        sound.triggerHaptic('success');
        await fetchPantry();
        await fetchShopCount();
        showNotify(`Restored "${slot.name}" snapshot!`);
      } else {
        throw new Error(data.error || 'Failed to restore slot');
      }
    } catch (e: any) {
      showNotify(e.message || 'Error restoring snapshot', true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // 3. Overwrite an existing slot with current state
  const handleOverwriteSlot = async (slotId: string) => {
    setIsLoadingAction(true);
    try {
      const res = await fetch('/api/backup');
      const backupData = await res.json();
      const existing = slots.find((s) => s.id === slotId);
      const totalItems = backupData.pantryItems.reduce(
        (sum: number, it: any) => sum + (it.batches?.length || 0),
        0
      );
      const assetCount = backupData.assets ? Object.keys(backupData.assets).length : 0;

      const updatedSlot: LocalSaveSlot = {
        id: slotId,
        name: existing?.name || 'Save Slot',
        savedAt: new Date().toISOString(),
        itemCount: totalItems,
        hasAssets: assetCount > 0,
        assetCount,
        payload: backupData,
      };

      await saveSlot(updatedSlot);
      await reloadSlots();
      sound.playDing();
      showNotify('Slot overwritten with current kitchen inventory & assets!');
    } catch (e: any) {
      showNotify('Failed to overwrite slot', true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // 4. Delete slot
  const handleDeleteSlot = async (slotId: string) => {
    await deleteSaveSlot(slotId);
    await reloadSlots();
    setConfirmDeleteId(null);
    sound.playWoodTap();
    showNotify('Slot deleted');
  };

  // 5. Load a Starter Preset
  const handleLoadPreset = async (preset: StarterPreset) => {
    setIsLoadingAction(true);
    try {
      // Build backup payload representing this preset
      const pantryItems = preset.items.map((it, idx) => ({
        slug: it.slug,
        name: it.name,
        category: it.category,
        defaultUnit: it.defaultUnit,
        pngAsset: `/assets/food/${it.slug}.png`,
        displayLimit: 12,
        batches: [
          {
            quantity: it.quantity,
            unit: it.defaultUnit,
            location: it.location,
            obtainedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + it.daysLeft * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Seeded from ${preset.title}`,
          },
        ],
      }));

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          appName: 'Pantry Chef',
          exportedAt: new Date().toISOString(),
          cleanRestore: true,
          pantryItems,
          shoppingItems: [],
        }),
      });

      const data = await res.json();
      if (data.success) {
        sound.playDing();
        sound.triggerHaptic('success');
        await fetchPantry();
        await fetchShopCount();
        showNotify(`Loaded "${preset.title}" preset cleanly!`);
      } else {
        throw new Error(data.error || 'Failed to load preset');
      }
    } catch (e: any) {
      showNotify(e.message || 'Error loading preset', true);
    } finally {
      setIsLoadingAction(false);
    }
  };

  // 6. Export file (.zip archive with raw image files as-is, or standalone .json)
  const handleExportFile = (format: 'zip' | 'json' = 'zip') => {
    sound.playWoodTap();
    window.location.href = `/api/backup?format=${format}`;
    showNotify(
      format === 'zip'
        ? 'Exporting full archive (.zip) with raw image files...'
        : 'Exporting standalone data file (.json)...'
    );
  };

  // 7. Import file (.zip, .pantry, or .json)
  const handleProcessFile = async (file: File) => {
    if (!file) return;

    setIsLoadingAction(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/backup', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        sound.playDing();
        sound.triggerHaptic('success');
        await fetchPantry();
        await fetchShopCount();
        showNotify(data.message || 'Kitchen and image assets restored cleanly!');
      } else {
        throw new Error(data.error || 'Failed to restore backup archive');
      }
    } catch (err: any) {
      showNotify(err.message || 'Invalid backup file', true);
    } finally {
      setIsLoadingAction(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#faf8f5] rounded-3xl border border-[#ded7cb] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#e5dec9] bg-white">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">💾</span>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-medium text-[#201b16] leading-none">
                Save &amp; Load Kitchen
              </h2>
              <p className="text-xs text-[#787067] font-sans mt-0.5">
                Save snapshots, load starter setups, or export/import save files
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playWoodTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#787067] flex items-center justify-center border border-[#e5dec9] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toast Notification Banner */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-5 py-2.5 text-xs font-sans font-medium flex items-center space-x-2 ${
                notification.isError
                  ? 'bg-red-50 text-red-800 border-b border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              }`}
            >
              {notification.isError ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#e5dec9] bg-[#f5f1ea] px-4 pt-2">
          <button
            onClick={() => setActiveTab('slots')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-sans font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'slots'
                ? 'border-[#cc5a35] text-[#cc5a35] bg-[#faf8f5] rounded-t-xl'
                : 'border-transparent text-[#787067] hover:text-[#201b16]'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Slots ({slots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-sans font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'presets'
                ? 'border-[#cc5a35] text-[#cc5a35] bg-[#faf8f5] rounded-t-xl'
                : 'border-transparent text-[#787067] hover:text-[#201b16]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Kitchen Presets</span>
          </button>

          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-sans font-medium border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'file'
                ? 'border-[#cc5a35] text-[#cc5a35] bg-[#faf8f5] rounded-t-xl'
                : 'border-transparent text-[#787067] hover:text-[#201b16]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Import / Export File</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* TAB 1: LOCAL SAVE SLOTS */}
          {activeTab === 'slots' && (
            <div className="space-y-4">
              {/* Quick Save Bar */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#e5dec9] shadow-2xs flex flex-col sm:flex-row gap-2.5 items-center">
                <input
                  type="text"
                  placeholder="Snapshot name (e.g. Sunday Restock, Post-Costco)..."
                  value={newSlotName}
                  onChange={(e) => setNewSlotName(e.target.value)}
                  className="w-full sm:flex-1 px-3.5 py-2.5 bg-[#faf8f5] border border-[#e5dec9] rounded-xl text-xs sm:text-sm font-sans text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
                />
                <button
                  onClick={handleSaveCurrentState}
                  disabled={isLoadingAction}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-xs sm:text-sm font-sans font-medium rounded-xl transition-all shadow-xs flex items-center justify-center space-x-1.5 disabled:opacity-50 shrink-0 active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>+ Quick Save Current Kitchen</span>
                </button>
              </div>

              {/* Slots List */}
              <div className="space-y-2.5">
                {slots.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-[#e5dec9] p-6 text-[#787067]">
                    <Clock className="w-8 h-8 opacity-40 mx-auto mb-2 text-[#cc5a35]" />
                    <p className="font-serif italic text-base text-[#201b16]">No save slots yet</p>
                    <p className="text-xs text-[#787067] mt-1">
                      Type a name above and tap Quick Save to bookmark your kitchen state.
                    </p>
                  </div>
                ) : (
                  slots.map((slot) => {
                    const formattedDate = new Date(slot.savedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={slot.id}
                        className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#e5dec9] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#cc5a35]/40 transition-all"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-serif text-base sm:text-lg font-medium text-[#201b16]">
                              {slot.name}
                            </span>
                            <span className="bg-[#f0ebe1] text-[#787067] text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border border-[#e2d9cc]">
                              {slot.itemCount} items
                            </span>
                            {slot.hasAssets && (
                              <span
                                className="bg-[#dcf0e2] text-[#22673a] text-[10px] font-sans font-medium px-2 py-0.5 rounded-full border border-[#c3e3cb] flex items-center space-x-1"
                                title="Includes user custom artwork and sprites"
                              >
                                <ImageIcon className="w-2.5 h-2.5" />
                                <span>{slot.assetCount || 0} Assets Saved</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#9c9183] flex items-center space-x-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{formattedDate}</span>
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                          <button
                            onClick={() => handleLoadSlot(slot)}
                            disabled={isLoadingAction}
                            className="px-3 py-1.5 bg-[#201b16] hover:bg-[#383129] active:scale-95 text-[#faf8f5] text-xs font-sans font-medium rounded-xl transition-all shadow-2xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            title="Load this kitchen state"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#cc5a35]" />
                            <span>Load</span>
                          </button>

                          <button
                            onClick={() => handleOverwriteSlot(slot.id)}
                            disabled={isLoadingAction}
                            className="px-2.5 py-1.5 bg-white hover:bg-[#f5f1ea] active:scale-95 text-[#685f54] text-xs font-sans rounded-xl border border-[#ded7cb] transition-all cursor-pointer"
                            title="Overwrite with current pantry"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (confirmDeleteId === slot.id) {
                                handleDeleteSlot(slot.id);
                              } else {
                                setConfirmDeleteId(slot.id);
                                setTimeout(() => setConfirmDeleteId(null), 3000);
                              }
                            }}
                            className={`px-2.5 py-1.5 text-xs font-sans rounded-xl border transition-all cursor-pointer ${
                              confirmDeleteId === slot.id
                                ? 'bg-[#cc5a35] text-white border-[#b54926]'
                                : 'bg-white hover:bg-red-50 text-[#9e3a19] border-[#ded7cb]'
                            }`}
                            title="Delete this save slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {confirmDeleteId === slot.id && <span className="ml-1 text-[10px]">Sure?</span>}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STARTER PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-[#787067] font-sans">
                Instantly populate your shelves with curated ingredient presets to test recipes, sound effects, and cooking flows:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="bg-white p-4 rounded-2xl border border-[#e5dec9] shadow-2xs flex flex-col justify-between hover:border-[#cc5a35]/60 transition-all group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{preset.icon}</span>
                          <h4 className="font-serif text-base sm:text-lg font-medium text-[#201b16]">
                            {preset.title}
                          </h4>
                        </div>
                        <span className="bg-[#f0ebe1] text-[#787067] text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full border border-[#ded7cb]">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#685f54] font-sans leading-relaxed mb-2">
                        {preset.description}
                      </p>
                      <p className="text-[11px] text-[#9c9183] font-mono">
                        {preset.items.length === 0 ? 'Empty pantry (0 items)' : `${preset.items.length} items (${preset.subtitle})`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleLoadPreset(preset)}
                      disabled={isLoadingAction}
                      className="mt-3.5 w-full py-2 bg-[#faf8f5] hover:bg-[#cc5a35] text-[#201b16] hover:text-white border border-[#ded7cb] hover:border-[#cc5a35] text-xs font-sans font-medium rounded-xl transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#cc5a35] group-hover:text-white transition-colors" />
                      <span>Load Preset</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FILE IMPORT / EXPORT */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              {/* Asset Protection Callout Banner */}
              <div className="bg-[#f0f7f2] border border-[#cbe1d0] p-4 rounded-2xl flex items-start space-x-3 text-xs text-[#204a2c]">
                <FolderArchive className="w-5 h-5 text-[#246e3d] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-xs text-[#1c4826] flex items-center space-x-1.5">
                    <span>Raw Binary Image Preservation (.zip / .pantry)</span>
                    <span className="text-[10px] bg-[#dcf0e2] text-[#1c633a] font-mono px-1.5 py-0.2 rounded-full font-normal">
                      Native Files
                    </span>
                  </div>
                  <div className="text-[11px] leading-relaxed text-[#2c5f38]">
                    Your custom sprites, cropped photos, and background-removed assets are stored as{' '}
                    <strong className="font-semibold text-[#1c4826]">actual bit-for-bit raw PNG image files</strong> inside an{' '}
                    <code className="bg-[#e2efe5] px-1 py-0.2 rounded font-mono text-[10px]">assets/food/</code> folder inside the archive. You can double-click or unzip the file in macOS Finder or Windows Explorer to view or edit the original images anytime!
                  </div>
                </div>
              </div>

              {/* Export Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Full ZIP Archive */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5dec9] shadow-2xs flex flex-col justify-between hover:border-[#cc5a35]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-serif text-base sm:text-lg text-[#201b16] font-medium flex items-center space-x-1.5">
                        <FolderArchive className="w-4 h-4 text-[#cc5a35]" />
                        <span>Kitchen Archive</span>
                      </span>
                      <span className="text-[10px] font-mono bg-[#cc5a35]/10 text-[#cc5a35] font-semibold px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-[#787067] font-sans leading-relaxed">
                      Packages <code className="font-mono text-[11px] bg-[#f2ece2] px-1 py-0.2 rounded">kitchen.json</code> + all raw original PNG image assets into an inspectable <code className="font-mono text-[11px]">.zip</code> file.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportFile('zip')}
                    className="mt-4 w-full py-2.5 bg-[#201b16] hover:bg-[#383129] text-white text-xs sm:text-sm font-sans font-medium rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#cc5a35]" />
                    <span>Download .zip Archive</span>
                  </button>
                </div>

                {/* 2. Standalone JSON */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e5dec9] shadow-2xs flex flex-col justify-between hover:border-[#cc5a35]/40 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-serif text-base sm:text-lg text-[#201b16] font-medium flex items-center space-x-1.5">
                        <FileText className="w-4 h-4 text-[#685f54]" />
                        <span>Standalone JSON</span>
                      </span>
                      <span className="text-[10px] font-mono bg-[#f2ede4] text-[#787067] font-medium px-2 py-0.5 rounded-full">
                        Data Only
                      </span>
                    </div>
                    <p className="text-xs text-[#787067] font-sans leading-relaxed">
                      Single text document containing all pantry items, batches, locations, recipes, and shopping list data.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportFile('json')}
                    className="mt-4 w-full py-2.5 bg-white hover:bg-[#f5f1ea] text-[#201b16] border border-[#ded7cb] text-xs sm:text-sm font-sans font-medium rounded-xl transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#787067]" />
                    <span>Download .json File</span>
                  </button>
                </div>
              </div>

              {/* Import Box / Dropzone */}
              <div className="bg-white p-5 rounded-2xl border border-[#e5dec9] shadow-2xs">
                <h4 className="font-serif text-lg text-[#201b16] font-medium flex items-center space-x-2 mb-1">
                  <Upload className="w-5 h-5 text-[#cc5a35]" />
                  <span>Restore Kitchen Archive or Save File</span>
                </h4>
                <p className="text-xs text-[#787067] font-sans mb-3.5">
                  Select or drop a <code className="font-mono text-[11px] bg-[#f2ece2] px-1 py-0.2 rounded">.zip</code>, <code className="font-mono text-[11px] bg-[#f2ece2] px-1 py-0.2 rounded">.pantry</code>, or <code className="font-mono text-[11px] bg-[#f2ece2] px-1 py-0.2 rounded">.json</code> backup. The built-in decoder unpacks raw PNG files directly to disk and refreshes your pantry instantly.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.pantry,.json,application/zip,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) handleProcessFile(dropped);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-8 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center space-y-2 cursor-pointer ${
                    isDraggingOver
                      ? 'border-[#cc5a35] bg-[#fff5f0] scale-[1.01]'
                      : 'border-[#ded7cb] hover:border-[#cc5a35] bg-[#faf8f5] hover:bg-[#f5efe4]'
                  } ${isLoadingAction ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <FileArchive className="w-8 h-8 text-[#cc5a35] opacity-80" />
                  <span className="text-xs sm:text-sm font-sans font-medium text-[#201b16]">
                    Click to choose or drag &amp; drop archive
                  </span>
                  <span className="text-[11px] text-[#8c8275] font-mono">
                    Supports .zip, .pantry, and .json
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
