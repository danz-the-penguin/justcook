'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import {
  Trophy,
  Flame,
  DollarSign,
  ChefHat,
  Sparkles,
  Download,
  Upload,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
  Check,
  Pencil,
  X,
  Coins,
} from 'lucide-react';
import { sound } from '@/lib/audio';
import {
  CURRENCIES,
  getPreferredCurrency,
  setPreferredCurrency,
  formatCurrencyAmount,
  CurrencyConfig,
} from '@/lib/constants/currency';
import Link from 'next/link';

interface TrophyData {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  progress: number;
  current: number;
  target: number;
}

interface RescuedHistoryItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  rescuedAt: string;
  recipeTitle?: string | null;
  savedDaysBeforeExpiry?: number | null;
  estimatedValue: number;
}

export default function TrophiesPage() {
  const [trophies, setTrophies] = useState<TrophyData[]>([]);
  const [history, setHistory] = useState<RescuedHistoryItem[]>([]);
  const [totalRescued, setTotalRescued] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [recipesCooked, setRecipesCooked] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Currency configuration
  const [currency, setCurrency] = useState<CurrencyConfig>({ symbol: '$', position: 'prefix' });
  const [isEditCurrencyOpen, setIsEditCurrencyOpen] = useState<boolean>(false);
  const [customSymbol, setCustomSymbol] = useState<string>('$');
  const [customPosition, setCustomPosition] = useState<'prefix' | 'suffix'>('prefix');

  // Log editing state
  const [editingLog, setEditingLog] = useState<RescuedHistoryItem | null>(null);
  const [editLogName, setEditLogName] = useState('');
  const [editLogQuantity, setEditLogQuantity] = useState<number>(1);
  const [editLogUnit, setEditLogUnit] = useState('pieces');
  const [editLogRecipe, setEditLogRecipe] = useState('');
  const [editLogEstimatedValue, setEditLogEstimatedValue] = useState<number>(1.5);
  const [editLogDaysSaved, setEditLogDaysSaved] = useState<number>(1);
  const [editLogDate, setEditLogDate] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Clear all confirmation
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  useEffect(() => {
    const config = getPreferredCurrency();
    setCurrency(config);
    setCustomSymbol(config.symbol);
    setCustomPosition(config.position);

    const handleCurrencyChange = () => {
      const updated = getPreferredCurrency();
      setCurrency(updated);
    };
    window.addEventListener('justcook_currency_change', handleCurrencyChange);
    return () => window.removeEventListener('justcook_currency_change', handleCurrencyChange);
  }, []);

  const handleOpenCurrencyModal = () => {
    sound.playWoodTap();
    setCustomSymbol(currency.symbol);
    setCustomPosition(currency.position);
    setIsEditCurrencyOpen(true);
  };

  const handleSaveCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playDing();
    const symbolToSave = customSymbol.trim() || '$';
    setPreferredCurrency(symbolToSave, customPosition);
    setCurrency({ symbol: symbolToSave, position: customPosition });
    setIsEditCurrencyOpen(false);
  };

  const handleSelectPresetCurrency = (presetSymbol: string, presetPosition?: 'prefix' | 'suffix') => {
    sound.playWoodTap();
    setCustomSymbol(presetSymbol);
    if (presetPosition) {
      setCustomPosition(presetPosition);
    }
  };

  // Log Edit Handlers
  const handleStartEditLog = (item: RescuedHistoryItem) => {
    sound.playWoodTap();
    setEditingLog(item);
    setEditLogName(item.itemName);
    setEditLogQuantity(item.quantity);
    setEditLogUnit(item.unit || 'pieces');
    setEditLogRecipe(item.recipeTitle || '');
    setEditLogEstimatedValue(item.estimatedValue ?? 1.5);
    setEditLogDaysSaved(item.savedDaysBeforeExpiry ?? 1);
    setEditLogDate(
      item.rescuedAt
        ? new Date(item.rescuedAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    );
  };

  const handleSaveEditedLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setIsSavingLog(true);

    try {
      const res = await fetch('/api/trophies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingLog.id,
          itemName: editLogName,
          quantity: editLogQuantity,
          unit: editLogUnit,
          recipeTitle: editLogRecipe,
          estimatedValue: editLogEstimatedValue,
          savedDaysBeforeExpiry: editLogDaysSaved,
          rescuedAt: new Date(editLogDate).toISOString(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        sound.playDing();
        setEditingLog(null);
        await loadTrophies();
      } else {
        alert(data.error || 'Failed to update log entry');
      }
    } catch (err) {
      console.error('Failed to update log:', err);
    } finally {
      setIsSavingLog(false);
    }
  };

  const handleDeleteSingleLog = async (id: string) => {
    sound.playWoodTap();
    try {
      const res = await fetch(`/api/trophies?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory((prev) => prev.filter((h) => h.id !== id));
        loadTrophies();
      }
    } catch (err) {
      console.error('Failed to delete log entry:', err);
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirmClearAll) {
      sound.playWoodTap();
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 4000);
      return;
    }

    sound.playDing();
    try {
      const res = await fetch('/api/trophies?all=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
        setConfirmClearAll(false);
        loadTrophies();
      }
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const loadTrophies = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trophies');
      const data = await res.json();
      if (data.success) {
        setTrophies(data.trophies);
        setHistory(data.history);
        setTotalRescued(data.totalRescuedCount);
        setTotalSaved(data.totalEstimatedSavings);
        setRecipesCooked(data.recipesCookedCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrophies();
  }, []);

  const handleExportBackup = () => {
    sound.playDing();
    window.location.href = '/api/backup';
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (data.success) {
        sound.playDing();
        setRestoreMessage({ text: 'Success! Your kitchen data has been restored from backup.' });
        loadTrophies();
        setTimeout(() => setRestoreMessage(null), 5000);
      } else {
        setRestoreMessage({ text: data.error || 'Failed to restore backup.', isError: true });
      }
    } catch (err) {
      console.error(err);
      setRestoreMessage({ text: 'Invalid backup JSON file.', isError: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#201b16] selection:bg-[#faeee8] selection:text-[#9e3a19]">
      <Navbar activePage="trophies" />

      <main className="w-full max-w-[1800px] mx-auto px-6 sm:px-10 lg:px-14 py-8">
        {/* Editorial Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#ece7df]">
          <div>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#201b16] font-normal tracking-tight">
              Waste Rescued & Impact
            </h1>
            <p className="font-sans text-base sm:text-lg text-[#787067] mt-1.5">
              Track ingredients saved from spoiling, customize currency, and edit kitchen logs.
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportBackup}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-[#e8e2d8] hover:bg-[#f5f1ea] active:scale-95 text-base font-sans font-medium text-[#201b16] rounded-xl transition-all shadow-2xs"
            >
              <Download className="w-5 h-5 text-[#cc5a35]" />
              <span>Export JSON</span>
            </button>

            <label className="flex items-center space-x-2 px-5 py-2.5 bg-[#201b16] hover:bg-[#383129] active:scale-95 text-base font-sans font-medium text-[#faf8f5] rounded-xl cursor-pointer transition-all shadow-2xs">
              <Upload className="w-5 h-5 text-[#e69374]" />
              <span>Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Restore Notification Toast */}
        {restoreMessage && (
          <div
            className={`mb-6 rounded-2xl px-5 py-4 flex items-center justify-between border ${
              restoreMessage.isError
                ? 'bg-[#faeee8] border-[#f0d9cf] text-[#9e3a19]'
                : 'bg-[#edf5ee] border-[#d2e7d3] text-[#2d5930]'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-5 h-5" />
              <p className="text-base font-sans font-medium">{restoreMessage.text}</p>
            </div>
            <button
              onClick={() => setRestoreMessage(null)}
              className="opacity-70 hover:opacity-100 text-base font-medium px-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Impact Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-7 border border-[#e8e2d8] shadow-xs">
            <span className="font-serif text-4xl sm:text-5xl font-normal text-[#201b16] block mb-1.5">
              {totalRescued}
            </span>
            <span className="text-base font-sans text-[#796f64]">
              Ingredients Rescued
            </span>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-[#e8e2d8] shadow-xs relative">
            <div className="flex items-start justify-between mb-1.5">
              <span className="font-serif text-4xl sm:text-5xl font-normal text-[#cc5a35] block">
                {formatCurrencyAmount(totalSaved, currency)}
              </span>
              <button
                type="button"
                onClick={handleOpenCurrencyModal}
                className="px-3 py-1.5 text-xs font-sans font-medium rounded-xl bg-[#faf8f5] hover:bg-[#f0ebe1] border border-[#e8e2d8] text-[#5c544a] flex items-center space-x-1.5 transition-all shadow-2xs"
                title="Edit Currency Symbol and Format"
              >
                <Pencil className="w-3.5 h-3.5 text-[#cc5a35]" />
                <span>Currency ({currency.symbol})</span>
              </button>
            </div>
            <span className="text-base font-sans text-[#796f64]">
              Estimated Saved
            </span>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-[#e8e2d8] shadow-xs">
            <span className="font-serif text-4xl sm:text-5xl font-normal text-[#201b16] block mb-1.5">
              {recipesCooked}
            </span>
            <span className="text-base font-sans text-[#796f64]">
              Rescue Meals Cooked
            </span>
          </div>
        </div>

        {/* Achievement Trophies Section */}
        <div className="mb-10">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16] mb-5">Milestones</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trophies.map((trophy) => (
              <div
                key={trophy.id}
                className={`rounded-2xl p-7 border transition-all ${
                  trophy.isUnlocked
                    ? 'bg-white border-[#f0d9cf] shadow-xs ring-1 ring-[#f0d9cf]'
                    : 'bg-white/60 border-[#e8e2d8] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#fbf9f6] border border-[#e8e2d8] flex items-center justify-center text-3xl shadow-inner">
                    {trophy.icon}
                  </div>
                  {trophy.isUnlocked ? (
                    <span className="flex items-center space-x-1.5 text-xs sm:text-sm font-sans font-semibold uppercase tracking-wider bg-[#edf5ee] text-[#2d5930] px-3 py-1 rounded-full border border-[#d2e7d3]">
                      <CheckCircle2 className="w-4 h-4 text-[#2d5930]" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-sans font-medium text-[#796f64] bg-[#f0ebe1] px-3 py-1 rounded-full">
                      {trophy.current}/{trophy.target}
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-medium text-[#201b16] mb-1.5">
                  {trophy.title}
                </h3>
                <p className="font-sans text-base text-[#796f64] mb-5 leading-relaxed">
                  {trophy.description}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-[#f0ebe1] rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 transition-all duration-500 ${
                      trophy.isUnlocked ? 'bg-[#cc5a35]' : 'bg-[#ded7cb]'
                    }`}
                    style={{ width: `${Math.round(trophy.progress * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rescued Timeline History */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-6 h-6 text-[#cc5a35]" />
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#201b16]">Recent Rescued Food Log</h2>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllLogs}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-sans font-medium rounded-xl border transition-all ${
                  confirmClearAll
                    ? 'bg-[#cc5a35] text-white border-[#cc5a35]'
                    : 'bg-white hover:bg-[#faeee8] text-[#8a3319] border-[#f0d9cf]'
                }`}
                title="Clear all rescued food logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmClearAll ? 'Confirm Clear All Logs?' : 'Clear Log History'}</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#e8e2d8] shadow-xs overflow-hidden">
            {history.length === 0 ? (
              <div className="p-12 text-center text-base font-sans text-[#796f64]">
                No rescued ingredients recorded yet. Cook recipes utilizing expiring items to earn trophies!
              </div>
            ) : (
              <div className="divide-y divide-[#f0ebe1]">
                {history.map((item) => (
                  <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#faf8f5]/50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-xl border border-[#f0d9cf] shrink-0">
                        🌱
                      </div>
                      <div>
                        <p className="font-serif text-lg sm:text-xl font-medium text-[#201b16]">
                          {item.quantity} {item.unit} {item.itemName}
                        </p>
                        <p className="font-sans text-sm sm:text-base text-[#796f64]">
                          Used in: <strong className="text-[#201b16] font-medium">{item.recipeTitle || 'Delicious Meal'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3">
                      <div className="text-left sm:text-right flex sm:flex-col gap-1 items-baseline sm:items-end">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs sm:text-sm font-sans font-semibold text-[#2d5930] bg-[#edf5ee] border border-[#d2e7d3] px-2.5 py-0.5 rounded-lg">
                            +{formatCurrencyAmount(item.estimatedValue ?? 1.5, currency)}
                          </span>
                          <span className="text-xs sm:text-sm font-sans font-medium text-[#685f54] bg-[#f0ebe1] px-2.5 py-0.5 rounded-lg">
                            +{item.savedDaysBeforeExpiry ?? 1}d saved
                          </span>
                        </div>
                        <span className="text-xs font-sans text-[#9e9488]">
                          {new Date(item.rescuedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditLog(item)}
                          className="p-2 rounded-lg text-[#796f64] hover:text-[#201b16] hover:bg-[#f0ebe1] transition-colors"
                          title="Edit this log entry"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleLog(item.id)}
                          className="p-2 rounded-lg text-[#b8ab99] hover:text-[#cc5a35] hover:bg-[#faeee8] transition-colors"
                          title="Delete this log entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* EDIT CURRENCY MODAL                                                       */}
      {/* ========================================================================= */}
      {isEditCurrencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#201b16]/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#faf8f5] border border-[#e8e2d8] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#ece7df] mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-medium text-[#201b16]">Currency Settings</h3>
                  <p className="text-xs sm:text-sm font-sans text-[#796f64]">Customize display symbol and formatting</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCurrencyOpen(false)}
                className="p-2 text-[#796f64] hover:text-[#201b16] hover:bg-[#f0ebe1] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrency} className="space-y-6">
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelectPresetCurrency(c.symbol, c.position)}
                      className={`px-3 py-2 text-xs font-sans font-medium rounded-xl border transition-all text-left flex items-center justify-between ${
                        customSymbol === c.symbol
                          ? 'bg-[#faeee8] border-[#e69374] text-[#cc5a35] font-semibold ring-1 ring-[#e69374]'
                          : 'bg-white border-[#e8e2d8] text-[#201b16] hover:bg-[#f5f1ea]'
                      }`}
                    >
                      <span className="truncate">{c.code} ({c.symbol})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Symbol Input */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-2">
                  Currency Symbol or Code
                </label>
                <input
                  type="text"
                  required
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  placeholder="e.g. $, RM, kr, CHF, €, £"
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                />
              </div>

              {/* Position Toggle */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-2">
                  Placement
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomPosition('prefix')}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-sans font-medium transition-all text-center ${
                      customPosition === 'prefix'
                        ? 'bg-[#201b16] text-[#faf8f5] border-[#201b16]'
                        : 'bg-white border-[#e8e2d8] text-[#5c544a] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    Prefix ({customSymbol || '$'}15.00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomPosition('suffix')}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-sans font-medium transition-all text-center ${
                      customPosition === 'suffix'
                        ? 'bg-[#201b16] text-[#faf8f5] border-[#201b16]'
                        : 'bg-white border-[#e8e2d8] text-[#5c544a] hover:bg-[#f5f1ea]'
                    }`}
                  >
                    Suffix (15.00 {customSymbol || '$'})
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-4 bg-white rounded-2xl border border-[#e8e2d8] flex items-center justify-between">
                <span className="text-xs font-sans font-medium text-[#796f64] uppercase tracking-wider">
                  Live Preview
                </span>
                <span className="font-serif text-2xl font-medium text-[#cc5a35]">
                  {formatCurrencyAmount(24.5, { symbol: customSymbol || '$', position: customPosition })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditCurrencyOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#e8e2d8] bg-white hover:bg-[#f5f1ea] text-sm font-sans font-medium text-[#5c544a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#cc5a35] hover:bg-[#b84e2c] active:scale-95 text-sm font-sans font-medium text-white transition-all shadow-xs"
                >
                  Save Currency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT RESCUED LOG MODAL                                                    */}
      {/* ========================================================================= */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#201b16]/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#faf8f5] border border-[#e8e2d8] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#ece7df] mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-medium text-[#201b16]">Edit Rescued Food Log</h3>
                  <p className="text-xs sm:text-sm font-sans text-[#796f64]">Update entry values, recipe, or rescue date</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="p-2 text-[#796f64] hover:text-[#201b16] hover:bg-[#f0ebe1] rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLog} className="space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                  Ingredient Name
                </label>
                <input
                  type="text"
                  required
                  value={editLogName}
                  onChange={(e) => setEditLogName(e.target.value)}
                  placeholder="e.g. Spinach, Tomato, Eggs"
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                />
              </div>

              {/* Quantity & Unit Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editLogQuantity}
                    onChange={(e) => setEditLogQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={editLogUnit}
                    onChange={(e) => setEditLogUnit(e.target.value)}
                    placeholder="e.g. bunch, pieces, cups"
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                  />
                </div>
              </div>

              {/* Recipe Used In */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                  Recipe Cooked
                </label>
                <input
                  type="text"
                  value={editLogRecipe}
                  onChange={(e) => setEditLogRecipe(e.target.value)}
                  placeholder="e.g. Creamy Tuscan Garlic Chicken"
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                />
              </div>

              {/* Estimated Value & Days Saved */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                    Est. Value ({currency.symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editLogEstimatedValue}
                    onChange={(e) => setEditLogEstimatedValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                    Days Saved
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editLogDaysSaved}
                    onChange={(e) => setEditLogDaysSaved(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                  />
                </div>
              </div>

              {/* Rescued Date */}
              <div>
                <label className="block text-xs font-sans font-semibold text-[#5c544a] uppercase tracking-wider mb-1.5">
                  Date Rescued
                </label>
                <input
                  type="date"
                  required
                  value={editLogDate}
                  onChange={(e) => setEditLogDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#e8e2d8] focus:border-[#cc5a35] focus:outline-hidden rounded-xl font-sans text-base text-[#201b16] shadow-2xs"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#ece7df]">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  disabled={isSavingLog}
                  className="px-5 py-2.5 rounded-xl border border-[#e8e2d8] bg-white hover:bg-[#f5f1ea] text-sm font-sans font-medium text-[#5c544a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLog}
                  className="px-6 py-2.5 rounded-xl bg-[#cc5a35] hover:bg-[#b84e2c] active:scale-95 text-sm font-sans font-medium text-white transition-all shadow-xs disabled:opacity-50"
                >
                  {isSavingLog ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
