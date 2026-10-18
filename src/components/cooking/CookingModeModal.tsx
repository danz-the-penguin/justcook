'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Timer,
  Utensils,
  Sparkles,
  Sun,
  Mic,
  MicOff,
} from 'lucide-react';
import { sound } from '@/lib/audio';

interface CookingModeModalProps {
  recipe: any;
  onClose: () => void;
  onFinishCooking: (recipe: any) => void;
}

export function CookingModeModal({ recipe, onClose, onFinishCooking }: CookingModeModalProps) {
  const steps: string[] = recipe.instructions || [];
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  // Screen Wake Lock State
  const [isWakeLocked, setIsWakeLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Voice Assistant States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [lastHeardCommand, setLastHeardCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [initialTimerSeconds, setInitialTimerSeconds] = useState<number>(0);

  // 1. Screen Wake Lock API (keeps phone screen on with messy hands)
  useEffect(() => {
    let released = false;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && !released) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsWakeLocked(true);

          wakeLockRef.current.addEventListener('release', () => {
            if (!released) setIsWakeLocked(false);
          });
        }
      } catch (err) {
        console.warn('Wake Lock request failed or not supported:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !released) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      setIsWakeLocked(false);
    };
  }, []);

  // Extract timer duration from current step text (e.g. "8 minutes" or "30 seconds")
  useEffect(() => {
    const currentStepText = steps[currentStepIdx] || '';
    const matchMin = currentStepText.match(/(\d+)\s*(?:-|to)?\s*(?:\d+)?\s*(?:min|minute|minutes)/i);
    const matchSec = currentStepText.match(/(\d+)\s*(?:-|to)?\s*(?:\d+)?\s*(?:sec|second|seconds)/i);

    let secs: number | null = null;
    if (matchMin) {
      secs = parseInt(matchMin[1], 10) * 60;
    } else if (matchSec) {
      secs = parseInt(matchSec[1], 10);
    }

    if (secs && secs > 0) {
      setTimerSeconds(secs);
      setInitialTimerSeconds(secs);
      setTimerRunning(false);
    } else {
      setTimerSeconds(null);
      setTimerRunning(false);
    }
  }, [currentStepIdx, steps]);

  // Countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds !== null && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev !== null && prev <= 1) {
            setTimerRunning(false);
            sound.playDing();
            return 0;
          }
          return prev !== null ? prev - 1 : 0;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  const readCurrentStep = (stepText?: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = stepText || steps[currentStepIdx] || '';
      const utterance = new SpeechSynthesisUtterance(`Step ${currentStepIdx + 1}. ${text}`);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNextStep = () => {
    sound.playWoodTap();
    if (currentStepIdx < steps.length - 1) {
      setCurrentStepIdx((prev) => {
        const next = prev + 1;
        if (isVoiceActive) readCurrentStep(steps[next]);
        return next;
      });
    }
  };

  const handlePrevStep = () => {
    sound.playWoodTap();
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => {
        const next = prev - 1;
        if (isVoiceActive) readCurrentStep(steps[next]);
        return next;
      });
    }
  };

  // 2. Web Speech Recognition for Hands-Free voice commands ("next", "back", "repeat")
  const toggleVoiceControl = () => {
    if (isVoiceActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsVoiceActive(false);
      setLastHeardCommand(null);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice control is supported in modern browsers like Chrome, Edge, and Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcript = event.results[lastIndex][0].transcript.toLowerCase().trim();
        setLastHeardCommand(transcript);

        if (
          transcript.includes('next') ||
          transcript.includes('forward') ||
          transcript.includes('continue')
        ) {
          handleNextStep();
        } else if (transcript.includes('back') || transcript.includes('previous')) {
          handlePrevStep();
        } else if (
          transcript.includes('repeat') ||
          transcript.includes('read') ||
          transcript.includes('say')
        ) {
          readCurrentStep();
        } else if (transcript.includes('start timer') || transcript.includes('resume')) {
          setTimerRunning(true);
        } else if (transcript.includes('pause timer') || transcript.includes('stop timer')) {
          setTimerRunning(false);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
      };

      recognition.onend = () => {
        if (isVoiceActive && recognitionRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsVoiceActive(true);
      sound.playDing();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFinish = () => {
    sound.playDing();
    onFinishCooking(recipe);
    onClose();
  };

  // Keyboard navigation (ArrowRight / Space to advance, ArrowLeft to go back, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (currentStepIdx < steps.length - 1) {
          sound.playWoodTap();
          setCurrentStepIdx((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStepIdx > 0) {
          sound.playWoodTap();
          setCurrentStepIdx((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIdx, steps.length, onClose]);

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handlePrevStep();
    } else {
      handleNextStep();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isLastStep = currentStepIdx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-[#191613] text-[#faf8f5] flex flex-col justify-between select-none animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div>
          <span className="text-[11px] font-sans font-medium uppercase tracking-widest text-[#e69374] block mb-0.5">
            Hands-Free Cooking Mode
          </span>
          <h2 className="font-serif text-lg sm:text-xl font-medium text-white truncate max-w-md">
            {recipe.title}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {/* Screen Wake Lock Indicator */}
          {isWakeLocked && (
            <span
              className="hidden md:inline-flex items-center space-x-1.5 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-medium"
              title="Screen Wake Lock is active: display will not turn off while cooking"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span>Screen Awake</span>
            </span>
          )}

          {/* Read Current Step Aloud */}
          <button
            onClick={() => readCurrentStep()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs text-white transition-all cursor-pointer"
            title="Read current step aloud using speech synthesis"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#e69374]" />
            <span className="hidden sm:inline">Read Step</span>
          </button>

          {/* Voice Assistant Toggle */}
          <button
            onClick={toggleVoiceControl}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer border ${
              isVoiceActive
                ? 'bg-[#cc5a35] text-white border-[#cc5a35] shadow-[0_0_15px_rgba(204,90,53,0.6)]'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
            title="Say 'Next', 'Back', 'Repeat', or 'Start timer'"
          >
            {isVoiceActive ? (
              <>
                <Mic className="w-3.5 h-3.5 text-white animate-bounce" />
                <span>Listening...</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Voice Control</span>
              </>
            )}
          </button>

          {lastHeardCommand && isVoiceActive && (
            <span className="hidden lg:inline text-xs text-[#e69374] font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-white/10">
              🎙️ &ldquo;{lastHeardCommand}&rdquo;
            </span>
          )}

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full bg-white/10 h-1.5">
        <div
          className="bg-[#cc5a35] h-1.5 transition-all duration-300"
          style={{ width: `${((currentStepIdx + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Central Screen Body (Large Tap Targets) */}
      <div
        onClick={handleStageClick}
        title="Tap right side for next step, left side for previous step"
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center w-full max-w-5xl mx-auto relative cursor-pointer"
      >
        {/* Step Indicator */}
        <div className="mb-6 inline-flex items-center space-x-2 bg-white/10 border border-white/20 text-[#e69374] px-4 py-1.5 rounded-full text-xs font-sans font-medium">
          <span>Step {currentStepIdx + 1} of {steps.length}</span>
        </div>

        {/* Extra Large Step Instruction Text - Claude Editorial Serif */}
        <p className="text-2xl sm:text-4xl md:text-5xl font-serif font-normal leading-relaxed tracking-tight text-[#faf8f5] max-w-3xl drop-shadow-xs">
          {steps[currentStepIdx] || 'All done! Enjoy your delicious meal.'}
        </p>

        {/* Interactive Step Timer (if detected in step) */}
        {timerSeconds !== null && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-8 bg-white/10 border border-white/20 rounded-2xl p-4 sm:p-6 flex flex-col items-center max-w-xs w-full shadow-2xl backdrop-blur-md cursor-default"
          >
            <span className="text-xs font-sans font-medium uppercase tracking-wider text-[#e69374] flex items-center space-x-1.5 mb-2">
              <Timer className="w-4 h-4" />
              <span>Step Countdown Timer</span>
            </span>

            <div className="text-4xl sm:text-5xl font-mono font-medium text-white tracking-tight mb-4">
              {formatTime(timerSeconds)}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className={`px-5 py-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 shadow-lg transition-all active:scale-95 ${
                  timerRunning
                    ? 'bg-[#cc5a35] text-white hover:bg-[#b94b28]'
                    : 'bg-[#2f7344] text-white hover:bg-[#276239]'
                }`}
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{timerRunning ? 'Pause' : 'Start Timer'}</span>
              </button>

              <button
                onClick={() => {
                  setTimerSeconds(initialTimerSeconds);
                  setTimerRunning(false);
                }}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
                title="Reset timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Large Bottom Control Bar (Hands-free easy touch targets) */}
      <div className="p-4 sm:p-6 border-t border-white/10 bg-black/30 flex items-center justify-between gap-4">
        <button
          onClick={handlePrevStep}
          disabled={currentStepIdx === 0}
          className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white font-medium text-sm active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        {isLastStep ? (
          <button
            onClick={handleFinish}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-[#2f7344] hover:bg-[#276239] text-white font-medium text-sm shadow-xl active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Finish & Deduct Ingredients!</span>
          </button>
        ) : (
          <button
            onClick={handleNextStep}
            className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-[#cc5a35] hover:bg-[#b94b28] text-white font-medium text-sm shadow-xl active:scale-95 transition-all"
          >
            <span>Next Step</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
