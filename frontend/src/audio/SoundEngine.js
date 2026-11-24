/**
 * Motor de Audio Procedural y Espacial 3D con Web Audio API.
 * - Dron ambiental reactivo por habitación y peligro.
 * - Latidos cardíacos dinámicos al acercarse una criatura.
 * - Sonido espacial estéreo (StereoPannerNode) para los gruñidos y pasos de El Eco.
 * - Crujido de puertas metálicas, linterna, descubrimientos y cintas magnéticas.
 */
class ProceduralSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.sfxGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
    this.isStarted = false;
    this.volumes = { master: 0.78, ambient: 0.55, sfx: 0.85 };
    this.lastHeartbeat = 0;
  }

  init() {
    if (this.isStarted) {
      if (this.ctx?.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.ambientGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.masterGain.gain.value = this.volumes.master;
    this.ambientGain.gain.value = this.volumes.ambient;
    this.sfxGain.gain.value = this.volumes.sfx;

    this.ambientGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Dron atmosférico grave de instalación subterránea
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneFilter = this.ctx.createBiquadFilter();
    const droneLocalGain = this.ctx.createGain();

    this.droneOsc1.type = 'sawtooth';
    this.droneOsc2.type = 'triangle';
    this.droneOsc1.frequency.value = 46;
    this.droneOsc2.frequency.value = 46.7;

    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 135;
    droneLocalGain.gain.value = 0.14;

    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(droneLocalGain);
    droneLocalGain.connect(this.ambientGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
    this.isStarted = true;
  }

  setVolumes({ master, ambient, sfx }) {
    if (typeof master === 'number') this.volumes.master = master;
    if (typeof ambient === 'number') this.volumes.ambient = ambient;
    if (typeof sfx === 'number') this.volumes.sfx = sfx;

    if (!this.ctx) return;
    this.masterGain.gain.setTargetAtTime(this.volumes.master, this.ctx.currentTime, 0.05);
    this.ambientGain.gain.setTargetAtTime(this.volumes.ambient, this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, this.ctx.currentTime, 0.05);
  }

  setRoomAmbience(baseFreq = 48, dangerLevel = 0) {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.droneOsc1.frequency.setTargetAtTime(baseFreq, now, 0.8);
    this.droneOsc2.frequency.setTargetAtTime(baseFreq + 0.75 + dangerLevel * 2.8, now, 0.8);
    this.droneFilter.frequency.setTargetAtTime(115 + dangerLevel * 290, now, 0.35);
  }

  updateHeartbeat(dangerLevel) {
    if (!this.isStarted || !this.ctx || dangerLevel < 0.15) return;
    const now = performance.now();
    const interval = Math.max(350, 1150 - dangerLevel * 760);
    if (now - this.lastHeartbeat < interval) return;
    this.lastHeartbeat = now;

    this.playThump(58, 0.16 * dangerLevel, 0.11);
    setTimeout(() => this.playThump(48, 0.1 * dangerLevel, 0.09), 140);
  }

  /**
   * Calcula paneo estéreo izquierda/derecha (-1..1) y atenuación por distancia 3D.
   */
  computeSpatialPan(srcX, srcZ, listenerX, listenerZ, listenerYaw) {
    const dx = srcX - listenerX;
    const dz = srcZ - listenerZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.01) return { pan: 0, attenuation: 1 };

    const rightX = Math.cos(listenerYaw);
    const rightZ = -Math.sin(listenerYaw);
    const pan = Math.max(-1, Math.min(1, (dx * rightX + dz * rightZ) / dist));
    const attenuation = Math.max(0, 1 - dist / 15);
    return { pan, attenuation };
  }

  playSpatialGrowl(srcX, srcZ, listenerX, listenerZ, listenerYaw, aggressive = false) {
    if (!this.isStarted || !this.ctx) return;
    const { pan, attenuation } = this.computeSpatialPan(srcX, srcZ, listenerX, listenerZ, listenerYaw);
    if (attenuation <= 0.04) return;

    const now = this.ctx.currentTime;
    const dur = aggressive ? 0.55 : 0.78;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(aggressive ? 115 : 74, now);
    osc.frequency.exponentialRampToValueAtTime(aggressive ? 52 : 42, now + dur);

    filter.type = 'bandpass';
    filter.frequency.value = aggressive ? 340 : 210;
    filter.Q.value = 3.5;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime((aggressive ? 0.28 : 0.16) * attenuation, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  playSpatialFootstep(srcX, srcZ, listenerX, listenerZ, listenerYaw, heavy = true) {
    if (!this.isStarted || !this.ctx) return;
    const { pan, attenuation } = this.computeSpatialPan(srcX, srcZ, listenerX, listenerZ, listenerYaw);
    if (attenuation <= 0.05) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(heavy ? 72 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.14);

    gain.gain.setValueAtTime((heavy ? 0.24 : 0.14) * attenuation, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    if (panner) {
      panner.pan.value = pan;
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playHorrorSting() {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    [220, 233.08, 466.16].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + 0.75);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.82);
    });
  }

  playMetallicBang(panValue = 0) {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.55;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 520;
    filter.Q.value = 5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.24;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    noise.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, panValue));
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }
    noise.start(now);
  }

  playWhisper(panValue = 0) {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 1.1;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.45;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.linearRampToValueAtTime(2100, now + 0.5);
    filter.frequency.linearRampToValueAtTime(950, now + dur);
    filter.Q.value = 8;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.16;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    noise.connect(filter);
    filter.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, panValue));
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }
    noise.start(now);
  }

  playDoorCreak(opening = true) {
    if (!this.isStarted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 130 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 225 : 110, now + 0.28);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playThump(freq, volume, duration) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(24, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playFootstep(isRunning = false) {
    if (!this.isStarted || !this.ctx) return;
    const duration = 0.065;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isRunning ? 390 : 230;
    const gain = this.ctx.createGain();
    gain.gain.value = isRunning ? 0.14 : 0.055;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
  }

  playFlashlightClick() {
    this.playTone(940, 0.032, 0.09, 'square');
    setTimeout(() => this.playTone(1380, 0.025, 0.06, 'triangle'), 26);
  }

  playDiscovery() {
    this.playTone(330, 0.18, 0.09, 'triangle');
    setTimeout(() => this.playTone(440, 0.22, 0.08, 'sine'), 110);
    setTimeout(() => this.playTone(659, 0.35, 0.07, 'sine'), 230);
  }

  playPuzzleSolved() {
    [293.6, 369.9, 440, 587.3].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.25, 0.1, 'triangle'), idx * 100);
    });
  }

  playError() {
    this.playTone(145, 0.16, 0.12, 'sawtooth');
    setTimeout(() => this.playTone(118, 0.2, 0.12, 'sawtooth'), 120);
  }

  playCheckpoint() {
    this.playTone(220, 0.28, 0.1, 'sine');
    setTimeout(() => this.playTone(330, 0.34, 0.1, 'sine'), 150);
    setTimeout(() => this.playTone(493.8, 0.45, 0.09, 'triangle'), 300);
  }

  playDoorUnlock() {
    this.playTone(185, 0.12, 0.12, 'square');
    setTimeout(() => this.playTone(270, 0.2, 0.1, 'sawtooth'), 120);
  }

  playDamage() {
    this.playTone(92, 0.26, 0.22, 'sawtooth');
    this.playThump(62, 0.3, 0.25);
  }

  playDeathSequence() {
    if (!this.isStarted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(24, this.ctx.currentTime + 1.35);
    gain.gain.setValueAtTime(0.26, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 1.45);
  }

  playTrailerBoom(intensity = 1) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass cinematográfico tipo tráiler de terror
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(86, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    subGain.gain.setValueAtTime(0.32 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 1.6);

    // Brillo metálico tenue de tensión
    const shimmer = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    shimmer.type = 'triangle';
    shimmer.frequency.setValueAtTime(220, now);
    shimmer.frequency.exponentialRampToValueAtTime(185, now + 0.9);
    sGain.gain.setValueAtTime(0.045 * intensity, now);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    shimmer.connect(sGain);
    sGain.connect(this.sfxGain);
    shimmer.start(now);
    shimmer.stop(now + 1.05);
  }

  playTapeSample(clarity = 0.5) {
    this.init();
    if (!this.ctx) return;
    const baseFreq = clarity > 0.92 ? 440 : 120 + (1 - clarity) * 320;
    this.playTone(baseFreq, 0.22, 0.09, clarity > 0.92 ? 'sine' : 'sawtooth');
  }

  playTone(freq, duration, volume = 0.08, type = 'sine') {
    if (!this.isStarted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.02);
  }
}

export const soundEngine = new ProceduralSoundEngine();
