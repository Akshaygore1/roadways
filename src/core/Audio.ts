/**
 * Web Audio API procedural sound synthesizer for Desi Slow Roads
 * Features the iconic Indian multi-tone musical pressure air horn!
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private isHornPlaying: boolean = false;
  private masterGain: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Plays the famous Indian highway musical multi-tone pressure horn melody!
   * (e.g. 5-note fanfare: G4 -> C5 -> E5 -> G5 -> C6)
   */
  public playIndianAirHorn(): void {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isHornPlaying) return;

    this.isHornPlaying = true;
    const now = this.ctx.currentTime;

    // Classic catchy Indian truck pressure horn melody
    // Melody notes (frequencies in Hz) and durations
    const melody: { freq: number; duration: number; delay: number }[] = [
      { freq: 392.00, duration: 0.12, delay: 0.00 }, // G4
      { freq: 523.25, duration: 0.12, delay: 0.12 }, // C5
      { freq: 659.25, duration: 0.12, delay: 0.24 }, // E5
      { freq: 783.99, duration: 0.16, delay: 0.36 }, // G5
      { freq: 1046.50, duration: 0.45, delay: 0.52 }  // C6 (held)
    ];

    melody.forEach((note) => {
      if (!this.ctx || !this.masterGain) return;
      const startTime = now + note.delay;
      const stopTime = startTime + note.duration;

      // Create dual oscillators for rich, bright brassy horn timbre
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      subOsc.type = 'triangle';

      osc1.frequency.setValueAtTime(note.freq, startTime);
      osc2.frequency.setValueAtTime(note.freq * 1.006, startTime); // subtle detune for fat horn chorus
      subOsc.frequency.setValueAtTime(note.freq / 2, startTime); // deep pressure sub

      // Note envelope
      const noteGain = this.ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02); // sharp attack
      noteGain.gain.setValueAtTime(0.4, stopTime - 0.03);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      // Low pass filter for warm brass body
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2800, startTime);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      subOsc.connect(noteGain);

      noteGain.connect(filter);
      filter.connect(this.masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      subOsc.start(startTime);

      osc1.stop(stopTime);
      osc2.stop(stopTime);
      subOsc.stop(stopTime);
    });

    const totalDuration = melody[melody.length - 1].delay + melody[melody.length - 1].duration;
    setTimeout(() => {
      this.isHornPlaying = false;
    }, totalDuration * 1000 + 50);
  }
}
