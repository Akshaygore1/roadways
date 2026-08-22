import { CONFIG } from '../config';

/**
* Web Audio API engine sound and horn system for Desi Roads.
 * Features:
 * 1. Authentic heavy dump truck diesel engine sound extracted from user video
 * 2. Dynamic 5-gear transmission RPM & playback pitch modulation
 * 3. Dynamic throttle roar, intake filter opening, and engine load response
 * 4. Pneumatic air brake pressure release hiss
 * 5. Authentic heavy truck horn playback
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isHornPlaying: boolean = false;
  private isEngineRunning: boolean = false;

  // Engine transmission state
  private currentPitch: number = 0.85;
  private targetPitch: number = 0.85;
  private wasBrakingHard: boolean = false;
  private lastBrakeReleaseTime: number = 0;

  // Master Engine Nodes
  private engineMasterGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Audio Buffers
  private bufferEngine: AudioBuffer | null = null;
  private bufferHorn: AudioBuffer | null = null;
  private bufferAirBrake: AudioBuffer | null = null;

  // Looped AudioBufferSourceNode
  private srcEngine: AudioBufferSourceNode | null = null;

  private isSamplesLoaded: boolean = false;

  constructor() {
    // AudioContext initialized on first user interaction
  }

  /**
   * Initializes the AudioContext and loads truck audio sample assets.
   */
  public initContext(): void {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(CONFIG.audio.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.loadAllSamples();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Loads and decodes a WAV audio sample file into an AudioBuffer.
   */
  private async loadSample(url: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return await this.ctx.decodeAudioData(arrayBuffer);
    } catch {
      return null;
    }
  }

  /**
   * Loads all engine sound and effect files from /audio/.
   */
  private async loadAllSamples(): Promise<void> {
    if (!this.ctx || this.isSamplesLoaded) return;

    const [engine, horn, brake] = await Promise.all([
      this.loadSample('/audio/truck_engine.wav'),
      this.loadSample('/audio/truck_horn.wav'),
      this.loadSample('/audio/air_brake.wav')
    ]);

    this.bufferEngine = engine;
    this.bufferHorn = horn;
    this.bufferAirBrake = brake;
    this.isSamplesLoaded = true;

    if (this.isEngineRunning) {
      this.startEngineSource();
    }
  }

  /**
   * Starts the seamless looped engine source node.
   */
  private startEngineSource(): void {
    if (!this.ctx || !this.engineFilter || !this.bufferEngine || this.srcEngine) return;
    const now = this.ctx.currentTime;

    this.srcEngine = this.ctx.createBufferSource();
    this.srcEngine.buffer = this.bufferEngine;
    this.srcEngine.loop = true;
    this.srcEngine.playbackRate.setValueAtTime(this.currentPitch, now);

    this.srcEngine.connect(this.engineFilter);
    this.srcEngine.start(now);
  }

  /**
   * Starts the continuous truck engine sound.
   */
  public startEngine(): void {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isEngineRunning) return;

    const now = this.ctx.currentTime;

    // Master Engine Gain Node
    this.engineMasterGain = this.ctx.createGain();
    this.engineMasterGain.gain.setValueAtTime(0.001, now);
    this.engineMasterGain.gain.exponentialRampToValueAtTime(CONFIG.audio.engineVolume, now + 0.25);
    this.engineMasterGain.connect(this.masterGain);

    // Dynamic Tone / Intake Lowpass Filter
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(1200, now);
    this.engineFilter.Q.setValueAtTime(1.5, now);
    this.engineFilter.connect(this.engineMasterGain);

    this.isEngineRunning = true;

    if (this.isSamplesLoaded) {
      this.startEngineSource();
    }
  }

  /**
   * Resets engine sound state back to idle.
   */
  public resetEngine(): void {
    this.currentPitch = 0.85;
    this.targetPitch = 0.85;
    this.wasBrakingHard = false;
  }

  /**
   * Plays the authentic truck horn sound effect.
   */
  public playIndianAirHorn(): void {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isHornPlaying) return;

    this.isHornPlaying = true;
    const now = this.ctx.currentTime;

    if (this.bufferHorn) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.bufferHorn;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, now);
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);

      const duration = this.bufferHorn.duration;
      setTimeout(() => {
        this.isHornPlaying = false;
      }, duration * 1000 + 50);
    } else {
      // Procedural fallback if sample not yet loaded
      this.playSynthHorn(now);
    }
  }

  /**
   * Fallback dual-tone horn synthesizer if audio file is still loading.
   */
  private playSynthHorn(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.frequency.setValueAtTime(353, now);
    osc2.frequency.setValueAtTime(531, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.2);
    osc2.stop(now + 1.2);

    setTimeout(() => {
      this.isHornPlaying = false;
    }, 1250);
  }

  /**
   * Plays the authentic pneumatic air brake release hiss.
   */
  public playAirBrakeHiss(intensity: number = 1.0): void {
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    if (now - this.lastBrakeReleaseTime < 0.8) return;
    this.lastBrakeReleaseTime = now;

    if (this.bufferAirBrake) {
      const source = this.ctx.createBufferSource();
      source.buffer = this.bufferAirBrake;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(CONFIG.audio.airBrakeVolume * Math.min(1.0, intensity), now);
      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(now);
    }
  }

  /**
   * Updates dynamic engine sound playback rate, throttle growl, and gear modulation.
   */
  public update(speedKmh: number, throttle: number, isBraking: boolean, dt: number): void {
    if (!this.ctx || !this.isEngineRunning) return;

    const absSpeed = Math.abs(speedKmh);
    const forwardSpeed = speedKmh;
    const now = this.ctx.currentTime;

    // 1. Transmission & Multi-Gear Pitch Simulation
    const shiftSpeeds = CONFIG.audio.shiftSpeeds;

    if (absSpeed < 1.0) {
      // Stationary: idle pitch or revving with throttle
      if (throttle > 0.05) {
        this.targetPitch = 0.85 + throttle * 0.45;
      } else {
        this.targetPitch = 0.85;
      }
    } else if (forwardSpeed < -0.5 || (throttle < -0.1 && forwardSpeed <= 0)) {
      // Reverse gear
      const revProgress = Math.min(1, absSpeed / CONFIG.physics.reverseMaxSpeed);
      this.targetPitch = 0.85 + revProgress * 0.4 + Math.abs(throttle) * 0.15;
    } else {
      // Forward gears (1 to 5)
      let currentGear = 0;
      for (let i = shiftSpeeds.length - 1; i >= 0; i--) {
        if (absSpeed >= shiftSpeeds[i]) {
          currentGear = i;
          break;
        }
      }

      const minGearSpeed = shiftSpeeds[currentGear];
      const maxGearSpeed =
        currentGear < shiftSpeeds.length - 1 ? shiftSpeeds[currentGear + 1] : CONFIG.physics.maxSpeed;
      const gearProgress = Math.min(
        1.0,
        Math.max(0.0, (absSpeed - minGearSpeed) / (maxGearSpeed - minGearSpeed + 0.1))
      );

      // Pitch scales from base gear pitch up to peak gear pitch
      const gearBasePitch = currentGear === 0 ? 0.88 : 0.92 + currentGear * 0.05;
      const gearPeakPitch = 1.35 + currentGear * 0.04;
      const basePitch = gearBasePitch + gearProgress * (gearPeakPitch - gearBasePitch);

      const throttleLoadBonus = throttle > 0.05 ? throttle * 0.18 : -0.08;
      this.targetPitch = Math.max(0.75, Math.min(1.65, basePitch + throttleLoadBonus));
    }

    // Smooth Pitch / RPM Inertia
    const pitchInterpSpeed = throttle > 0.05 ? 7.5 : 4.5;
    this.currentPitch += (this.targetPitch - this.currentPitch) * Math.min(1, dt * pitchInterpSpeed);

    if (this.srcEngine) {
      this.srcEngine.playbackRate.setTargetAtTime(this.currentPitch, now, 0.04);
    }

    // 2. Dynamic Throttle Roar, Intake Filter & Gain Modulation
    if (this.engineFilter && this.engineMasterGain) {
      // Filter cutoff opens widely under throttle for crisp, throaty diesel bark
      const baseCutoff = 1000 + (this.currentPitch - 0.85) * 800;
      const throttleCutoffBonus = throttle > 0.05 ? throttle * 1800 : 0;
      const targetCutoff = Math.max(800, Math.min(4500, baseCutoff + throttleCutoffBonus));
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.05);

      // Engine volume increases on throttle load
      const throttleGainBonus = throttle > 0.05 ? throttle * 0.35 : 0;
      const targetGain = (CONFIG.audio.engineVolume * 0.65) + (throttleGainBonus * CONFIG.audio.engineVolume);
      this.engineMasterGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }

    // 3. Air Brake Release Hiss Triggering
    if (isBraking && absSpeed > 10) {
      this.wasBrakingHard = true;
    } else if (this.wasBrakingHard) {
      if (!isBraking || absSpeed < 2.0) {
        this.playAirBrakeHiss(1.0);
        this.wasBrakingHard = false;
      }
    }
  }
}

