import { AudioFxConfig, PitchData, VocalPreset } from '../types';

// Standard chromatic note frequencies
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function frequencyToNote(freq: number): { note: string; cents: number } {
  if (!freq || freq < 50 || freq > 2000) return { note: '--', cents: 0 };
  const midi = 69 + 12 * Math.log2(freq / 440);
  const roundedMidi = Math.round(midi);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const cents = Math.round((midi - roundedMidi) * 100);
  return { note: `${NOTE_NAMES[noteIndex]}${octave}`, cents };
}

// Autocorrelation pitch detection algorithm
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  // Silence threshold
  if (rms < 0.015) return null;

  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }

  const trimmed = buffer.slice(r1, r2);
  const c = new Array(trimmed.length).fill(0);
  for (let i = 0; i < trimmed.length; i++) {
    for (let j = 0; j < trimmed.length - i; j++) {
      c[i] = c[i] + trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < trimmed.length; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;
  if (T0 === 0) return null;

  // Parabolic interpolation for fine tuning
  const x1 = c[T0 - 1] || 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] || 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

// Chord dictionary to MIDI notes
const CHORD_NOTES: Record<string, number[]> = {
  // Minor chords
  'Am': [57, 60, 64],
  'Em': [52, 55, 59],
  'Dm': [50, 53, 57],
  'Bm': [59, 62, 66],
  'F#m': [54, 57, 61],
  'C#m': [49, 52, 56],
  'Gm': [55, 58, 62],
  // Major chords
  'C': [48, 52, 55, 60],
  'G': [55, 59, 62, 67],
  'D': [50, 54, 57, 62],
  'A': [57, 61, 64, 69],
  'E': [52, 56, 59, 64],
  'F': [53, 57, 60, 65],
  'Bb': [58, 62, 65],
  // 7th chords
  'B7': [59, 63, 66, 69],
  'E7': [52, 56, 59, 62],
  'A7': [57, 61, 64, 67]
};

function midiToFreq(midi: number, semitoneShift: number = 0): number {
  return 440 * Math.pow(2, (midi + semitoneShift - 69) / 12);
}

export class SingingAudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private monitorGain: GainNode | null = null;

  // Effects
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  // Music Backing
  private musicGain: GainNode | null = null;
  private masterMusicOutput: GainNode | null = null;
  private mixedStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Synth sequencer
  private synthInterval: any = null;
  private isSynthPlaying = false;
  private currentBeat = 0;
  private chords: string[] = ['Am', 'F', 'C', 'G'];
  private bpm = 88;
  private pitchShift = 0;

  // Media element for uploaded audio/video
  private mediaElement: HTMLMediaElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;

  private onPitchCallback: ((data: PitchData) => void) | null = null;
  private pitchAnimationId: number | null = null;

  constructor() {}

  public async initContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  public async initMicrophone(onPitchUpdate?: (data: PitchData) => void): Promise<boolean> {
    const ctx = await this.initContext();
    this.onPitchCallback = onPitchUpdate || null;

    try {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
      }
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.micGain = ctx.createGain();
      this.micGain.gain.value = 1.0;

      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 2048;

      // Vocal chain setup
      this.dryGain = ctx.createGain();
      this.dryGain.gain.value = 1.0;

      // Create Reverb
      this.reverbNode = ctx.createConvolver();
      this.reverbGain = ctx.createGain();
      this.reverbGain.gain.value = 0.35;
      this.updateReverbImpulse('studio');

      // Create Delay/Echo
      this.delayNode = ctx.createDelay();
      this.delayNode.delayTime.value = 0.24; // 240ms slapback echo
      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.3;
      this.delayGain = ctx.createGain();
      this.delayGain.gain.value = 0.2;

      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);

      // Monitor gain (for headphone monitoring)
      this.monitorGain = ctx.createGain();
      this.monitorGain.gain.value = 0; // Default off to avoid speaker feedback

      // Mixed destination for recording
      this.mixedStreamDest = ctx.createMediaStreamDestination();

      // Master music gain
      if (!this.musicGain) {
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = 0.85;
      }

      // Connect vocal graph:
      // micSource -> micGain -> micAnalyser
      //                       -> dryGain -> destination & mixedDest & monitorGain
      //                       -> reverbNode -> reverbGain -> destination & mixedDest & monitorGain
      //                       -> delayNode -> delayGain -> destination & mixedDest & monitorGain
      this.micSource.connect(this.micGain);
      this.micGain.connect(this.micAnalyser);

      this.micGain.connect(this.dryGain);
      this.dryGain.connect(this.monitorGain);
      this.dryGain.connect(this.mixedStreamDest);

      this.micGain.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.monitorGain);
      this.reverbGain.connect(this.mixedStreamDest);

      this.micGain.connect(this.delayNode);
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.monitorGain);
      this.delayGain.connect(this.mixedStreamDest);

      this.monitorGain.connect(ctx.destination);

      // Music connects to master speaker and recorder
      if (!this.masterMusicOutput) {
        this.masterMusicOutput = ctx.createGain();
        this.masterMusicOutput.gain.value = 1.0;
        this.musicGain.connect(this.masterMusicOutput);
        this.masterMusicOutput.connect(ctx.destination);
        this.masterMusicOutput.connect(this.mixedStreamDest);
      }

      // Start pitch detection loop
      this.startPitchLoop();
      return true;
    } catch (err) {
      console.warn('Microphone initialization failed:', err);
      return false;
    }
  }

  private updateReverbImpulse(preset: VocalPreset) {
    if (!this.ctx || !this.reverbNode) return;
    const sampleRate = this.ctx.sampleRate;
    let duration = 1.5;
    let decay = 2.0;

    if (preset === 'dry') {
      duration = 0.05;
      decay = 20.0;
    } else if (preset === 'studio') {
      duration = 1.2;
      decay = 2.5;
    } else if (preset === 'concert') {
      duration = 2.8;
      decay = 1.6;
    } else if (preset === 'arena') {
      duration = 4.0;
      decay = 1.2;
    } else if (preset === 'echo') {
      duration = 1.8;
      decay = 2.2;
    }

    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const env = Math.pow(1 - n, decay);
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }
    this.reverbNode.buffer = impulse;
  }

  public setFxConfig(config: AudioFxConfig) {
    if (this.micGain) {
      this.micGain.gain.setTargetAtTime(config.vocalVolume, this.ctx?.currentTime || 0, 0.05);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(config.musicVolume, this.ctx?.currentTime || 0, 0.05);
    }
    if (this.monitorGain) {
      this.monitorGain.gain.setTargetAtTime(config.monitorEnabled ? 0.9 : 0, this.ctx?.currentTime || 0, 0.05);
    }
    if (this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(config.preset === 'dry' ? 0 : config.reverbMix, this.ctx?.currentTime || 0, 0.05);
    }
    if (this.delayGain && this.delayFeedback) {
      const isEchoPreset = config.preset === 'echo';
      this.delayGain.gain.setTargetAtTime(isEchoPreset ? 0.45 : config.delayMix, this.ctx?.currentTime || 0, 0.05);
      this.delayFeedback.gain.setTargetAtTime(isEchoPreset ? 0.5 : 0.25, this.ctx?.currentTime || 0, 0.05);
    }
    this.pitchShift = config.pitchShiftSemitones;
    this.updateReverbImpulse(config.preset);
  }

  private startPitchLoop() {
    if (!this.micAnalyser || !this.ctx) return;
    const buffer = new Float32Array(this.micAnalyser.fftSize);

    const checkPitch = () => {
      if (!this.micAnalyser || !this.ctx) return;
      this.micAnalyser.getFloatTimeDomainData(buffer);
      const freq = detectPitch(buffer, this.ctx.sampleRate);

      if (freq && freq >= 60 && freq <= 1500) {
        const { note, cents } = frequencyToNote(freq);
        this.onPitchCallback?.({
          note,
          frequency: Math.round(freq),
          cents,
          confidence: 0.9,
          isSinging: true
        });
      } else {
        this.onPitchCallback?.({
          note: '--',
          frequency: 0,
          cents: 0,
          confidence: 0,
          isSinging: false
        });
      }
      this.pitchAnimationId = requestAnimationFrame(checkPitch);
    };

    if (this.pitchAnimationId) cancelAnimationFrame(this.pitchAnimationId);
    this.pitchAnimationId = requestAnimationFrame(checkPitch);
  }

  public getMicAnalyser(): AnalyserNode | null {
    return this.micAnalyser;
  }

  // Backing Synthesizer Engine
  public startSynthBacking(chords: string[], bpm: number = 88) {
    this.chords = chords.length > 0 ? chords : ['Am', 'F', 'C', 'G'];
    this.bpm = bpm;
    this.isSynthPlaying = true;
    this.currentBeat = 0;

    if (this.synthInterval) clearInterval(this.synthInterval);
    const beatMs = (60 / this.bpm) * 1000;

    // Play initial beat right away
    this.triggerSynthBeat(this.currentBeat);

    this.synthInterval = setInterval(() => {
      if (!this.isSynthPlaying) return;
      this.currentBeat = (this.currentBeat + 1) % 16;
      this.triggerSynthBeat(this.currentBeat);
    }, beatMs / 2); // 8th note resolution
  }

  public stopSynthBacking() {
    this.isSynthPlaying = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  private triggerSynthBeat(step: number) {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    // 4 chords per 16 steps -> 4 steps per chord
    const chordIndex = Math.floor(step / 4) % this.chords.length;
    const chordName = this.chords[chordIndex] || 'Am';
    const notes = CHORD_NOTES[chordName] || [57, 60, 64];

    // On downbeats (steps 0, 4, 8, 12): play full acoustic chord + bass root
    if (step % 4 === 0) {
      // Bass note (one octave lower than root)
      const bassMidi = notes[0] - 12;
      this.playBassNote(midiToFreq(bassMidi, this.pitchShift), now, 0.45);

      // Warm chord pad / guitar strum
      notes.forEach((midi, idx) => {
        const strumOffset = idx * 0.025; // acoustic strum effect
        this.playChordVoice(midiToFreq(midi, this.pitchShift), now + strumOffset, 0.55);
      });

      // Soft kick drum
      this.playKick(now);
    } else if (step % 2 === 0) {
      // Arpeggio note on 8th beat
      const arpNote = notes[(step / 2) % notes.length];
      this.playChordVoice(midiToFreq(arpNote + 12, this.pitchShift), now, 0.25, 0.4);

      // Acoustic snare / rim on step 4 and 12
      if (step === 4 || step === 12) {
        this.playSnare(now);
      }
    }

    // Gentle hi-hat on every step
    this.playHiHat(now, step % 2 === 0 ? 0.06 : 0.03);
  }

  private playChordVoice(freq: number, startTime: number, duration: number = 0.5, volume: number = 0.2) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, startTime);
    filter.frequency.exponentialRampToValueAtTime(400, startTime + duration);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
  }

  private playBassNote(freq: number, startTime: number, duration: number = 0.6) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playKick(startTime: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(130, startTime);
    osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.15);

    gain.gain.setValueAtTime(0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + 0.22);
  }

  private playSnare(startTime: number) {
    if (!this.ctx || !this.musicGain) return;
    // White noise burst
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(startTime);
  }

  private playHiHat(startTime: number, volume: number = 0.05) {
    if (!this.ctx || !this.musicGain) return;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(startTime);
  }

  // Connect user-uploaded HTML5 audio or video element into the mixer
  public attachMediaElement(element: HTMLMediaElement) {
    if (!this.ctx) return;
    this.mediaElement = element;
    try {
      if (!this.mediaSourceNode) {
        this.mediaSourceNode = this.ctx.createMediaElementSource(element);
        if (!this.musicGain) {
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 0.85;
        }
        this.mediaSourceNode.connect(this.musicGain);
      }
    } catch (e) {
      // Element might already be connected
      console.log('Media element source already attached');
    }
  }

  // Soundboard triggers
  public playApplause() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const duration = 2.8;
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const l = buffer.getChannelData(0);
    const r = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const burst = Math.sin(t * 30) * 0.3 + 0.7;
      const env = Math.sin(Math.PI * t);
      l[i] = (Math.random() * 2 - 1) * env * burst * 0.3;
      r[i] = (Math.random() * 2 - 1) * env * burst * 0.3;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400;
    filter.Q.value = 1.0;

    src.connect(filter);
    filter.connect(this.ctx.destination);
    src.start(now);
  }

  public playCheer() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.8);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.0);
    this.playApplause();
  }

  public playCountIn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [0, 0.5, 1.0, 1.5].forEach((offset, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const isHigh = idx === 3;
      osc.frequency.value = isHigh ? 880 : 440;
      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.16);
    });
  }

  public playAirhorn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const freqs = [311.13, 370.0, 466.16]; // Eb4, F#4, Bb4 brassy fanfare
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  // Combined Audio & Video Recording Engine
  public startRecording(videoStream?: MediaStream | null): boolean {
    if (!this.mixedStreamDest) return false;
    try {
      this.recordedChunks = [];
      let finalStream: MediaStream;

      if (videoStream && videoStream.getVideoTracks().length > 0) {
        // Video recording: merge webcam video tracks + mixed audio tracks
        finalStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...this.mixedStreamDest.stream.getAudioTracks()
        ]);
      } else {
        // Audio-only recording
        finalStream = this.mixedStreamDest.stream;
      }

      const mimeType = videoStream
        ? (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm')
        : (MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm');

      this.mediaRecorder = new MediaRecorder(finalStream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(250); // timeslice 250ms
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public stopRecording(): Promise<{ blob: Blob; url: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url, mimeType });
      };

      this.mediaRecorder.stop();
    });
  }

  public cleanup() {
    if (this.synthInterval) clearInterval(this.synthInterval);
    if (this.pitchAnimationId) cancelAnimationFrame(this.pitchAnimationId);
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}
