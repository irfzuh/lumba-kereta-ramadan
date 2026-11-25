import { PlayerBoostStatus, VehicleType } from '../types/game';

const SOUNDTRACK_PATH =
  '/assets/aistudio/Sport_Trap_Rock_by_Infraction__No_Copyright_Music__Training_Day_94db7219.mp3';

let audioCtx: AudioContext | null = null;

interface ContinuousEngineNodes {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  subOsc: OscillatorNode;
  filter: BiquadFilterNode;
  masterGain: GainNode;
}

let engineNodes: ContinuousEngineNodes | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastHoofTimestamp = 0;
let bgMusicAudio: HTMLAudioElement | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getBackgroundTrack(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!bgMusicAudio) {
    bgMusicAudio = new Audio(SOUNDTRACK_PATH);
    bgMusicAudio.loop = true;
    bgMusicAudio.preload = 'auto';
    bgMusicAudio.volume = 0.42;
  }
  return bgMusicAudio;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.5);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return buffer;
}

function updateBackgroundTrack(enabled: boolean, boostStatus: PlayerBoostStatus): void {
  const track = getBackgroundTrack();
  if (!track) return;

  if (!enabled) {
    if (!track.paused) {
      track.pause();
    }
    return;
  }

  const targetVol = boostStatus === 'nitro' ? 0.55 : boostStatus === 'stopped' ? 0.28 : 0.42;
  track.volume = targetVol;

  if (track.paused) {
    track.play().catch(() => {});
  }
}

function ensureCarEngineNodes(ctx: AudioContext): ContinuousEngineNodes {
  if (engineNodes) return engineNodes;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const masterGain = ctx.createGain();

  osc1.type = 'sawtooth';
  osc2.type = 'triangle';
  subOsc.type = 'sine';

  osc1.frequency.setValueAtTime(58, ctx.currentTime);
  osc2.frequency.setValueAtTime(116, ctx.currentTime);
  subOsc.frequency.setValueAtTime(29, ctx.currentTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(170, ctx.currentTime);
  filter.Q.setValueAtTime(3.2, ctx.currentTime);

  masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);

  const osc1Gain = ctx.createGain();
  const osc2Gain = ctx.createGain();
  const subGain = ctx.createGain();
  osc1Gain.gain.value = 0.55;
  osc2Gain.gain.value = 0.35;
  subGain.gain.value = 0.45;

  osc1.connect(osc1Gain);
  osc2.connect(osc2Gain);
  subOsc.connect(subGain);

  osc1Gain.connect(filter);
  osc2Gain.connect(filter);
  subGain.connect(filter);

  filter.connect(masterGain);
  masterGain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  subOsc.start();

  engineNodes = { osc1, osc2, subOsc, filter, masterGain };
  return engineNodes;
}

// --- UI Sound Effects ---

export function playUiClick(muted: boolean = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(640, now);
  osc.frequency.exponentialRampToValueAtTime(360, now + 0.055);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.075, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.065);
}

export function playUiSelect(muted: boolean = false): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [520, 780].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = now + idx * 0.038;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  });
}

export function playUiToggle(muted: boolean = false, active: boolean = true): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(active ? 480 : 620, now);
  osc.frequency.exponentialRampToValueAtTime(active ? 760 : 380, now + 0.07);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.07, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.085);
}

// --- Race & Vehicle Audio ---

export function stopRaceAudio(): void {
  if (bgMusicAudio) {
    try {
      bgMusicAudio.pause();
      bgMusicAudio.currentTime = 0;
    } catch {
      // Ignore cleanup errors
    }
  }

  if (engineNodes && audioCtx) {
    const { osc1, osc2, subOsc, masterGain } = engineNodes;
    try {
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(0.0001, now, 0.04);
      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          subOsc.stop();
          osc1.disconnect();
          osc2.disconnect();
          subOsc.disconnect();
          masterGain.disconnect();
        } catch {
          // Ignore already stopped oscillators
        }
      }, 120);
    } catch {
      // Ignore cleanup errors
    }
  }
  engineNodes = null;
  lastHoofTimestamp = 0;
}

export function playCamelHoofStep(muted: boolean, isNitro: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const thudGain = ctx.createGain();
  osc.type = 'sine';
  const pitch = isNitro ? 145 + Math.random() * 22 : 115 + Math.random() * 18;
  osc.frequency.setValueAtTime(pitch, now);
  osc.frequency.exponentialRampToValueAtTime(48, now + 0.085);

  thudGain.gain.setValueAtTime(0.001, now);
  thudGain.gain.linearRampToValueAtTime(isNitro ? 0.14 : 0.1, now + 0.01);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

  osc.connect(thudGain);
  thudGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.11);

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(isNitro ? 1600 : 1200, now);
  bandpass.Q.setValueAtTime(1.4, now);

  const sandGain = ctx.createGain();
  sandGain.gain.setValueAtTime(isNitro ? 0.055 : 0.035, now);
  sandGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

  src.connect(bandpass);
  bandpass.connect(sandGain);
  sandGain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.07);
}

export function updateRaceAudio(params: {
  active: boolean;
  muted: boolean;
  musicMuted?: boolean;
  vehicle: VehicleType;
  speed: number;
  boostStatus: PlayerBoostStatus;
  nowMs: number;
}): void {
  const { active, muted, musicMuted = false, vehicle, speed, boostStatus, nowMs } = params;
  if (!active || muted) {
    if (engineNodes && audioCtx) {
      engineNodes.masterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05);
    }
    updateBackgroundTrack(false, boostStatus);
    return;
  }

  updateBackgroundTrack(!musicMuted, boostStatus);

  const ctx = getAudioContext();
  if (!ctx) return;

  if (vehicle === 'car') {
    const nodes = ensureCarEngineNodes(ctx);
    const now = ctx.currentTime;
    const isStopped = boostStatus === 'stopped' || speed <= 1;
    const isNitro = boostStatus === 'nitro';

    const baseFreq = isStopped ? 38 : 48 + speed * 0.52 + (isNitro ? 18 : 0);
    const cutoff = isStopped ? 110 : isNitro ? 540 : 210 + speed * 1.4;
    const targetVol = isStopped ? 0.012 : isNitro ? 0.075 : 0.042;

    nodes.osc1.frequency.setTargetAtTime(baseFreq, now, 0.08);
    nodes.osc2.frequency.setTargetAtTime(baseFreq * 1.98, now, 0.08);
    nodes.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.08);
    nodes.filter.frequency.setTargetAtTime(cutoff, now, 0.08);
    nodes.masterGain.gain.setTargetAtTime(targetVol, now, 0.08);
  } else {
    if (engineNodes) {
      engineNodes.masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
    }
    if (boostStatus === 'stopped' || speed <= 1) return;

    const intervalMs = boostStatus === 'nitro' ? 165 : Math.max(210, 440 - speed * 2.2);
    if (nowMs - lastHoofTimestamp >= intervalMs) {
      lastHoofTimestamp = nowMs;
      playCamelHoofStep(muted, boostStatus === 'nitro');
    }
  }
}

export function playCarExhaustNitroBurst(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(240, now);
  filter.frequency.exponentialRampToValueAtTime(980, now + 0.35);
  filter.Q.setValueAtTime(2.2, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start(now);
  src.stop(now + 0.5);
}

export function playCorrectNitro(muted: boolean, vehicle: VehicleType = 'car'): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (vehicle === 'car') {
    playCarExhaustNitroBurst(muted);
  } else {
    playCamelHoofStep(muted, true);
    setTimeout(() => playCamelHoofStep(muted, true), 110);
  }

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.055);
    gain.gain.setValueAtTime(0.001, now + idx * 0.055);
    gain.gain.exponentialRampToValueAtTime(0.095, now + idx * 0.055 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.055);
    osc.stop(now + idx * 0.055 + 0.2);
  });
}

export function playWrongBrake(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(85, now + 0.28);
  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

export function playStartRace(
  muted: boolean,
  vehicle: VehicleType = 'car',
  musicMuted: boolean = false
): void {
  if (!muted && !musicMuted) {
    const track = getBackgroundTrack();
    if (track) {
      track.currentTime = 0;
      track.volume = 0.42;
      track.play().catch(() => {});
    }
  }

  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [440, 554.37, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.08);
    gain.gain.setValueAtTime(0.08, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.18);
  });

  if (vehicle === 'car') {
    setTimeout(() => playCarExhaustNitroBurst(muted), 180);
  } else {
    setTimeout(() => playCamelHoofStep(muted, false), 180);
  }
}

export function playVictory(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  fanfare.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.09);
    gain.gain.setValueAtTime(0.11, now + idx * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.09);
    osc.stop(now + idx * 0.09 + 0.35);
  });
}

export function playDefeat(muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  [349.23, 311.13, 261.63].forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.14);
    gain.gain.setValueAtTime(0.09, now + idx * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.14);
    osc.stop(now + idx * 0.14 + 0.3);
  });
}
