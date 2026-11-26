/**
 * Lightweight WebAudio synthesizer.
 *
 * No audio files are shipped: every cue is generated with oscillators and a
 * short noise buffer. The AudioContext is created lazily and only resumes after
 * a real user gesture, so browser autoplay policies are respected.
 */
const isBrowser = typeof window !== "undefined";

class SoundFXEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = true;
    this.unlocked = false;
  }

  ensureContext() {
    if (!isBrowser) return null;

    if (!this.ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;

      this.ctx = new AudioCtor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  /** Call from a pointer/key handler to satisfy the autoplay policy. */
  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) return false;

    this.unlocked = true;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
  }

  get ready() {
    return Boolean(this.ctx && this.master && this.enabled);
  }

  tone({
    freq,
    endFreq,
    type = "sine",
    duration = 0.15,
    volume = 0.1,
    delay = 0,
    attack = 0.006,
  }) {
    if (!this.ready) return;

    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        start + duration,
      );
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, volume),
      start + attack,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  noise({
    duration = 0.08,
    volume = 0.06,
    delay = 0,
    filter = 1800,
    type = "bandpass",
    q = 0.9,
  }) {
    if (!this.ready) return;

    const ctx = this.ctx;

    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }

    const start = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    const filterNode = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = this.noiseBuffer;
    filterNode.type = type;
    filterNode.frequency.value = filter;
    filterNode.Q.value = q;

    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  /** A single water drop. `volume` lets the caller fade it by distance. */
  playDrip(volume = 0.09) {
    if (!this.ready) return;
    const level = Math.max(0.008, Math.min(0.2, volume));

    this.tone({
      freq: 1050,
      endFreq: 420,
      type: "sine",
      duration: 0.09,
      volume: level,
    });
    this.tone({
      freq: 1560,
      endFreq: 880,
      type: "sine",
      duration: 0.05,
      volume: level * 0.32,
      delay: 0.018,
    });
  }

  /** Walkie-talkie chirp before Tato speaks. */
  playRadio() {
    if (!this.ready) return;

    this.tone({ freq: 1180, type: "square", duration: 0.045, volume: 0.045 });
    this.tone({
      freq: 1560,
      type: "square",
      duration: 0.05,
      volume: 0.04,
      delay: 0.07,
    });
    this.noise({
      duration: 0.06,
      volume: 0.025,
      delay: 0.13,
      filter: 2400,
    });
  }

  /** Turquoise sonar pulse of the acoustic detector. */
  playDetector() {
    if (!this.ready) return;

    this.tone({
      freq: 520,
      endFreq: 940,
      type: "sine",
      duration: 0.35,
      volume: 0.075,
    });
    this.tone({
      freq: 1040,
      type: "sine",
      duration: 0.45,
      volume: 0.032,
      delay: 0.05,
    });
    this.tone({
      freq: 1560,
      type: "sine",
      duration: 0.25,
      volume: 0.018,
      delay: 0.2,
    });
  }

  /** Closing a valve: short mechanical scrape plus a low thud. */
  playValve() {
    if (!this.ready) return;

    this.noise({ duration: 0.05, volume: 0.065, filter: 1200 });
    this.tone({
      freq: 220,
      endFreq: 120,
      type: "triangle",
      duration: 0.12,
      volume: 0.06,
    });
    this.tone({
      freq: 640,
      endFreq: 380,
      type: "sine",
      duration: 0.08,
      volume: 0.028,
      delay: 0.03,
    });
  }

  /** Two metallic clicks when a piece is seated. */
  playRepair() {
    if (!this.ready) return;

    this.noise({ duration: 0.04, volume: 0.08, filter: 2600 });
    this.noise({
      duration: 0.035,
      volume: 0.055,
      delay: 0.1,
      filter: 2000,
    });
    this.tone({
      freq: 1800,
      endFreq: 1200,
      type: "triangle",
      duration: 0.12,
      volume: 0.035,
      delay: 0.02,
    });
    this.tone({
      freq: 320,
      type: "sine",
      duration: 0.08,
      volume: 0.045,
      delay: 0.1,
    });
  }

  /** Soft footstep. */
  playStep() {
    if (!this.ready) return;
    this.noise({
      duration: 0.035,
      volume: 0.022,
      filter: 700,
      type: "lowpass",
    });
  }

  /** The signature "clac" of the needle stopping at 0 L/day. */
  playMeterStop() {
    if (!this.ready) return;

    this.noise({ duration: 0.05, volume: 0.09, filter: 3200 });
    this.tone({
      freq: 1320,
      endFreq: 980,
      type: "triangle",
      duration: 0.14,
      volume: 0.075,
    });
    this.tone({
      freq: 180,
      endFreq: 90,
      type: "sine",
      duration: 0.18,
      volume: 0.06,
      delay: 0.02,
    });
    this.tone({
      freq: 660,
      type: "sine",
      duration: 0.3,
      volume: 0.028,
      delay: 0.08,
    });
  }
}

export const SoundFX = new SoundFXEngine();

export const playDrip = (volume) => SoundFX.playDrip(volume);
export const playRadio = () => SoundFX.playRadio();
export const playDetector = () => SoundFX.playDetector();
export const playValve = () => SoundFX.playValve();
export const playRepair = () => SoundFX.playRepair();
export const playStep = () => SoundFX.playStep();
export const playMeterStop = () => SoundFX.playMeterStop();

export default SoundFX;
