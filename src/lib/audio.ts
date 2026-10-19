// Web Audio API procedural sound effects for tactile kitchen interactions

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 1.0;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMuted = localStorage.getItem('justcook_muted');
      this.muted = savedMuted === 'true';
      const savedVol = localStorage.getItem('justcook_volume');
      if (savedVol) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
    }
  }

  private initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (typeof window !== 'undefined') {
      localStorage.setItem('justcook_muted', mute ? 'true' : 'false');
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('justcook_volume', String(this.volume));
    }
  }

  // Soft bouncy pop / crack (for adding or consuming eggs & produce)
  public playPop() {
    this.triggerHaptic('light');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  // Warm tactile wood tap (for wooden cupboard / dry pantry)
  public playWoodTap() {
    this.triggerHaptic('medium');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // Refreshing cool chime (for fridge & freezer)
  public playFridgeChime() {
    this.triggerHaptic('light');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);

        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.2);
      });
    } catch {}
  }

  // Crisp knife slice / cutting board chop sound
  public playKnifeChop() {
    this.triggerHaptic('slice');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Wood cutting board thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(220, now);
      thudOsc.frequency.exponentialRampToValueAtTime(70, now + 0.07);

      thudGain.gain.setValueAtTime(0.28, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);

      thudOsc.start(now);
      thudOsc.stop(now + 0.08);

      // 2. High-frequency blade slice friction
      const bufferSize = ctx.sampleRate * 0.06;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(1.5, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.06);
    } catch {}
  }

  // Mobile Web Haptics
  public triggerHaptic(type: 'light' | 'medium' | 'slice' | 'success' | 'impact' | 'sizzle' | 'toast' | 'snap' | 'tick' = 'light') {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
    try {
      switch (type) {
        case 'light':
        case 'tick':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'slice':
          navigator.vibrate([15, 20, 10]);
          break;
        case 'impact':
          navigator.vibrate([30, 35, 25]);
          break;
        case 'sizzle':
          navigator.vibrate([12, 35, 15, 50, 15]);
          break;
        case 'toast':
          navigator.vibrate([20, 15, 25]);
          break;
        case 'snap':
          navigator.vibrate([25, 40]);
          break;
        case 'success':
          navigator.vibrate([20, 40, 30]);
          break;
      }
    } catch {}
  }

  // Hot pan sizzle on ingredient drop with adjustable heat level
  public playSizzle(heatLevel: 'low' | 'medium' | 'high' = 'medium') {
    this.triggerHaptic('sizzle');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = heatLevel === 'low' ? 0.7 : heatLevel === 'high' ? 1.15 : 0.85;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      const microBurstProb = heatLevel === 'low' ? 0.015 : heatLevel === 'high' ? 0.065 : 0.035;
      const microBurstAmp = heatLevel === 'low' ? 1.0 : heatLevel === 'high' ? 2.2 : 1.8;

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const baseNoise = Math.random() * 2 - 1;
        const microBurst = Math.random() < microBurstProb ? (Math.random() * microBurstAmp - microBurstAmp / 2) : 0;
        const envelope = t < 0.08 ? t / 0.08 : Math.pow(1 - (t - 0.08) / 0.92, 1.4);
        output[i] = (baseNoise * 0.7 + microBurst * 0.3) * envelope;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filterFreq = heatLevel === 'low' ? 2400 : heatLevel === 'high' ? 4400 : 3200;
      const filterQ = heatLevel === 'low' ? 1.4 : heatLevel === 'high' ? 2.2 : 1.8;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(filterFreq, now);
      filter.Q.setValueAtTime(filterQ, now);

      const baseGain = (heatLevel === 'low' ? 0.22 : heatLevel === 'high' ? 0.46 : 0.35) * this.volume;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(baseGain, now);
      gain.gain.linearRampToValueAtTime(baseGain * 0.92, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    } catch {}
  }

  // Crispy toast crunch sound (golden browned bread)
  public playToast() {
    this.triggerHaptic('toast');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.22;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.exp(-t * 14);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {}
  }

  // Meal prep container lid snap sound
  public playSnap() {
    this.triggerHaptic('snap');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);

      gain.gain.setValueAtTime(0.3 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.055);
    } catch {}
  }

  // Cast-iron pan / cutting board heavy impact thud
  public playPanImpact() {
    this.triggerHaptic('impact');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Heavy bass thud (cast iron impact)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);

      // Simultaneous hot sear sizzle
      this.playSizzle();
    } catch {}
  }

  // Elastic bounce sound when dropped back onto shelf
  public playDropImpact() {
    this.triggerHaptic('light');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // Initialize and unlock audio context on mobile
  public init() {
    this.initCtx();
  }

  // Gentle dinner bell chime (for recipe complete / timer)
  public playDing() {
    this.triggerHaptic('success');
    if (this.muted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(1046.5, now); // C6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  // Cheerful success chime
  public playSuccess() {
    this.playDing();
  }
}

export const sound = new SoundEngine();
