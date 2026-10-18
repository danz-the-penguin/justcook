'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Trophy, Flame, DollarSign, ChefHat, Sparkles, Download, Upload, ArrowLeft, CheckCircle2, Clock, Trash2, ChevronDown, Check } from 'lucide-react';
import { sound } from '@/lib/audio';
import { CURRENCIES, getPreferredCurrency, setPreferredCurrency } from '@/lib/constants/currency';
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

  // Currency state
  const [currency, setCurrency] = useState<string>('$');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState<boolean>(false);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  useEffect(() => {
    setCurrency(getPreferredCurrency());
    const handleCurrencyChange = () => setCurrency(getPreferredCurrency());
    window.addEventListener('justcook_currency_change', handleCurrencyChange);
    return () => window.removeEventListener('justcook_currency_change', handleCurrencyChange);
  }, []);

  const handleSelectCurrency = (sym: string) => {
    sound.playDing();
    setPreferredCurrency(sym);
    setCurrency(sym);
    setShowCurrencyDropdown(false);
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
              Track ingredients saved from spoiling and manage offline kitchen backups.
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportBackup}
              className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-[#e8e2d8] hover:bg-[#f5f1ea] active:scale-95 text-base font-sans font-medium text-[#201b16] rounded-xl transition-all"
            >
              <Download className="w-5 h-5 text-[#cc5a35]" />
              <span>Export JSON</span>
            </button>

            <label className="flex items-center space-x-2 px-5 py-2.5 bg-[#201b16] hover:bg-[#383129] active:scale-95 text-base font-sans font-medium text-[#faf8f5] rounded-xl cursor-pointer transition-all">
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
                {currency}{totalSaved.toFixed(2)}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                  className="px-2.5 py-1 text-xs font-sans font-semibold rounded-lg bg-[#faf8f5] hover:bg-[#f0ebe1] border border-[#e8e2d8] text-[#685f54] flex items-center space-x-1 transition-all"
                  title="Change Currency"
                >
                  <span>{currency} Currency</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showCurrencyDropdown && (
                  <div className="absolute right-0 top-8 z-50 bg-white border border-[#e8e2d8] rounded-xl shadow-xl p-1.5 w-48 max-h-60 overflow-y-auto space-y-1">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCurrency(c.symbol)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-sans rounded-lg flex items-center justify-between transition-colors ${
                          currency === c.symbol
                            ? 'bg-[#faeee8] text-[#cc5a35] font-semibold'
                            : 'hover:bg-[#faf8f5] text-[#201b16]'
                        }`}
                      >
                        <span>{c.name}</span>
                        {currency === c.symbol && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                  <div key={item.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-[#faeee8] text-[#cc5a35] flex items-center justify-center font-bold text-xl border border-[#f0d9cf]">
                        🌱
                      </div>
                      <div>
                        <p className="font-serif text-lg sm:text-xl font-medium text-[#201b16]">
                          {item.quantity} {item.unit} {item.itemName}
                        </p>
                        <p className="font-sans text-sm sm:text-base text-[#796f64]">
                          Used in: <strong className="text-[#201b16]">{item.recipeTitle || 'Delicious Meal'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-sans font-medium text-[#2d5930] bg-[#edf5ee] border border-[#d2e7d3] px-3 py-1 rounded-lg block sm:inline">
                          +{item.savedDaysBeforeExpiry ?? 1}d before expiry
                        </span>
                        <span className="text-xs sm:text-sm font-sans text-[#9e9488] block sm:inline sm:ml-3">
                          {new Date(item.rescuedAt).toLocaleDateString()}
                        </span>
                      </div>
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
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
