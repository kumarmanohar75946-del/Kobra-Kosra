export interface LyricLine {
  text: string;
  section?: string; // 'Intro' | 'Verse 1' | 'Chorus' | 'Verse 2' | 'Bridge' | 'Outro'
  chord?: string;
  timeSec: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  language: string;
  tempoBpm: number;
  key: string;
  mood: string;
  vocalTips?: string;
  chords: string[];
  lines: LyricLine[];
  fullLyricsText?: string;
  sourceType: 'preset' | 'ai-requested' | 'user-loaded' | 'custom-ai';
  audioUrl?: string; // custom uploaded audio URL
  videoUrl?: string; // custom uploaded video URL
  isSynthBacking?: boolean;
}

export type VocalPreset = 'dry' | 'studio' | 'concert' | 'arena' | 'echo';

export interface AudioFxConfig {
  vocalVolume: number; // 0 to 2
  musicVolume: number; // 0 to 2
  preset: VocalPreset;
  reverbMix: number; // 0 to 1
  delayMix: number; // 0 to 1
  pitchShiftSemitones: number; // -6 to +6
  playbackRate: number; // 0.75 to 1.25
  monitorEnabled: boolean; // mic passthrough
}

export interface PitchData {
  note: string; // e.g. "C4", "F#3"
  frequency: number; // e.g. 440
  cents: number; // deviation -50 to +50
  confidence: number; // 0 to 1
  isSinging: boolean;
}

export interface RecordingItem {
  id: string;
  songTitle: string;
  artist: string;
  recordedAt: number;
  blobUrl: string;
  mimeType: string;
  durationSec: number;
  isVideo: boolean;
}
