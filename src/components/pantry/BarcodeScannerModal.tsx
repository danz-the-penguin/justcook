'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, ScanLine, Search, AlertCircle, Loader2, Sparkles, Check, RefreshCw } from 'lucide-react';
import { sound } from '@/lib/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: {
    name: string;
    category: string;
    imageUrl?: string;
    barcode: string;
  }) => void;
}

export function BarcodeScannerModal({ isOpen, onClose, onProductFound }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  // Start Camera Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let scanInterval: NodeJS.Timeout | null = null;

    if (isOpen) {
      setCameraError(null);
      setDetectedBarcode(null);
      setManualBarcode('');

      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        .then((s) => {
          activeStream = s;
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }

          // Check if native BarcodeDetector API is available
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'],
            });

            scanInterval = setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    const rawValue = barcodes[0].rawValue;
                    if (rawValue) {
                      sound.playDing();
                      sound.triggerHaptic('success');
                      setDetectedBarcode(rawValue);
                      lookupOpenFoodFacts(rawValue);
                      if (scanInterval) clearInterval(scanInterval);
                    }
                  }
                } catch {}
              }
            }, 400);
          }
        })
        .catch((err) => {
          console.warn('Camera access denied or unavailable:', err);
          setHasCamera(false);
          setCameraError('Camera access unavailable. You can type or paste the barcode numbers below.');
        });
    }

    return () => {
      if (scanInterval) clearInterval(scanInterval);
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  const mapOpenFoodFactsCategory = (categoriesTags: string[] = []): string => {
    const joined = categoriesTags.join(' ').toLowerCase();
    if (joined.includes('dairy') || joined.includes('cheese') || joined.includes('milk') || joined.includes('yogurt') || joined.includes('butter')) {
      return 'dairy';
    }
    if (joined.includes('meat') || joined.includes('chicken') || joined.includes('beef') || joined.includes('pork') || joined.includes('fish') || joined.includes('seafood')) {
      return 'meat';
    }
    if (joined.includes('fruit') || joined.includes('vegetable') || joined.includes('produce') || joined.includes('salad')) {
      return 'produce';
    }
    if (joined.includes('spice') || joined.includes('condiment') || joined.includes('sauce') || joined.includes('oil') || joined.includes('vinegar')) {
      return 'spices';
    }
    return 'pantry';
  };

  const lookupOpenFoodFacts = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    setIsLoadingProduct(true);
    setCameraError(null);

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${clean}.json`);
      const data = await res.json();

      if (data.status === 1 && data.product) {
        const prod = data.product;
        const name = prod.product_name || prod.product_name_en || prod.generic_name || 'Grocery Item';
        const category = mapOpenFoodFactsCategory(prod.categories_tags || []);
        const imageUrl = prod.image_front_url || prod.image_url || undefined;

        sound.playDing();
        onProductFound({
          name,
          category,
          imageUrl,
          barcode: clean,
        });
        onClose();
      } else {
        setCameraError(`Product not found for barcode ${clean}. Try entering the item name manually.`);
      }
    } catch (err: any) {
      setCameraError('Failed to lookup barcode database. Check your internet connection.');
    } finally {
      setIsLoadingProduct(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      lookupOpenFoodFacts(manualBarcode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#faf8f5] rounded-3xl border border-[#ded7cb] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5dec9] bg-white">
          <div className="flex items-center space-x-2.5">
            <ScanLine className="w-5 h-5 text-[#cc5a35]" />
            <h3 className="font-serif text-lg font-medium text-[#201b16]">
              Barcode Scanner
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#faf8f5] hover:bg-[#f0ebe1] text-[#787067] flex items-center justify-center border border-[#e5dec9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Camera Feed */}
        <div className="relative bg-black aspect-video sm:aspect-square flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Target Reticle Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
            <div className="relative w-48 h-32 sm:w-60 sm:h-36 border-2 border-[#cc5a35] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
              {/* Laser Scan Line */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#cc5a35] to-transparent shadow-[0_0_10px_#cc5a35] animate-pulse" />
              <span className="absolute -bottom-6 text-[10px] font-mono text-white/80 font-medium tracking-wider uppercase">
                Align barcode within box
              </span>
            </div>
          </div>

          {isLoadingProduct && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center space-y-2 text-white z-10">
              <Loader2 className="w-8 h-8 text-[#cc5a35] animate-spin" />
              <span className="text-xs font-sans font-medium">Looking up product info...</span>
            </div>
          )}
        </div>

        {/* Manual Barcode Fallback Box */}
        <div className="p-4 sm:p-5 bg-white space-y-3">
          {cameraError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              placeholder="Or enter barcode numbers (e.g. 737628064502)..."
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="flex-1 px-3 py-2.5 bg-[#faf8f5] border border-[#e5dec9] rounded-xl text-xs font-mono text-[#201b16] focus:outline-none focus:ring-1 focus:ring-[#cc5a35]"
            />
            <button
              type="submit"
              disabled={isLoadingProduct || !manualBarcode.trim()}
              className="px-4 py-2.5 bg-[#cc5a35] hover:bg-[#b54926] text-white text-xs font-sans font-medium rounded-xl shadow-xs transition-all flex items-center space-x-1 disabled:opacity-50 shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Lookup</span>
            </button>
          </form>

          <p className="text-[11px] text-[#8c8276] text-center font-sans">
            Powered by the global Open Food Facts grocery database.
          </p>
        </div>
      </div>
    </div>
  );
}
