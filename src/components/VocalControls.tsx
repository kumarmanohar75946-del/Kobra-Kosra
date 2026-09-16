import React from 'react';
import { 
  Sliders, 
  Volume2, 
  Mic, 
  Sparkles, 
  Headphones, 
  Video, 
  VideoOff, 
  Flame, 
  PartyPopper, 
  Clock, 
  Megaphone,
  Radio
} from 'lucide-react';
import { AudioFxConfig, VocalPreset } from '../types';

interface VocalControlsProps {
  config: AudioFxConfig;
  onChangeConfig: (updater: (prev: AudioFxConfig) => AudioFxConfig) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
  onPlayApplause: () => void;
  onPlayCheer: () => void;
  onPlayCountIn: () => void;
  onPlayAirhorn: () => void;
}

const PRESETS: { id: VocalPreset; name: string; desc: string; icon: string }[] = [
  { id: 'studio', name: 'Studio Room', desc: 'Warm acoustic space', icon: '🎙️' },
  { id: 'concert', name: 'Concert Hall', desc: 'Spacious lush reverb', icon: '🏛️' },
  { id: 'arena', name: 'Arena Rock', desc: 'Huge stadium reflections', icon: '🏟️' },
  { id: 'echo', name: 'Karaoke Echo', desc: 'Slapback vocal delay', icon: '📻' },
  { id: 'dry', name: 'Dry Natural', desc: 'Raw voice without FX', icon: '🌿' }
];

export const VocalControls: React.FC<VocalControlsProps> = ({
  config,
  onChangeConfig,
  isWebcamActive,
  onToggleWebcam,
  onPlayApplause,
  onPlayCheer,
  onPlayCountIn,
  onPlayAirhorn
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xl">
      
      {/* Section 1: Studio Mixer Sliders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Studio Audio Mixer
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400">Independent volume levels</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Vocal Volume */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5" /> Vocal Mic Gain
              </span>
              <span className="font-mono text-neutral-400 font-bold">
                {Math.round(config.vocalVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={config.vocalVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeConfig(c => ({ ...c, vocalVolume: val }));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Music Volume */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Backing Music
              </span>
              <span className="font-mono text-neutral-400 font-bold">
                {Math.round(config.musicVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={config.musicVolume}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeConfig(c => ({ ...c, musicVolume: val }));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Vocal Studio Presets */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Vocal Reverb & Effects Presets
            </h3>
          </div>
          <span className="text-[11px] text-neutral-400">Live vocal enhancement</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PRESETS.map((p) => {
            const isSelected = config.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onChangeConfig(c => ({ ...c, preset: p.id }))}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-md shadow-rose-950/40'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="text-xl mb-1">{p.icon}</div>
                <div className="text-xs font-bold text-white">{p.name}</div>
                <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 3: Pitch Shift (Scale Transpose) & Tempo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pitch Shift */}
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300">
              Key Transposition (Sur / Scale):
            </span>
            <span className="font-mono text-rose-400 font-bold">
              {config.pitchShiftSemitones > 0 ? `+${config.pitchShiftSemitones}` : config.pitchShiftSemitones} Semitones
            </span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {[-3, -2, -1, 0, 1, 2, 3].map((semi) => (
              <button
                key={semi}
                onClick={() => onChangeConfig(c => ({ ...c, pitchShiftSemitones: semi }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  config.pitchShiftSemitones === semi
                    ? 'bg-rose-500 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {semi > 0 ? `+${semi}` : semi}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-neutral-500">
            Aapki aawaz ke anukool scale badlein (Change key to match your vocal range)
          </p>
        </div>

        {/* Headphones Monitor & Camera */}
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-850 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-sky-400" />
              <div>
                <div className="text-xs font-bold text-white">Live Vocal Monitor</div>
                <div className="text-[10px] text-neutral-500">Hear your own singing (Use headphones)</div>
              </div>
            </div>
            <button
              onClick={() => onChangeConfig(c => ({ ...c, monitorEnabled: !c.monitorEnabled }))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                config.monitorEnabled
                  ? 'bg-sky-500 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {config.monitorEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-900">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-400" />
              <div>
                <div className="text-xs font-bold text-white">Camera Selfie Sing</div>
                <div className="text-[10px] text-neutral-500">Sing on screen with lyrics</div>
              </div>
            </div>
            <button
              onClick={onToggleWebcam}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isWebcamActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isWebcamActive ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Live Soundboard Hype */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Live Performance Soundboard
          </h4>
          <span className="text-[10px] text-neutral-500">Instant crowd sound effects</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={onPlayApplause}
            className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-amber-500/50"
          >
            <span>👏</span>
            <span>Applause (Taaliyan)</span>
          </button>
          <button
            onClick={onPlayCheer}
            className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-rose-500/50"
          >
            <span>🎉</span>
            <span>Cheer & Whistle</span>
          </button>
          <button
            onClick={onPlayCountIn}
            className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-sky-500/50"
          >
            <span>⏰</span>
            <span>1-2-3-4 Count-In</span>
          </button>
          <button
            onClick={onPlayAirhorn}
            className="py-2.5 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-200 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-purple-500/50"
          >
            <span>🎺</span>
            <span>Air Horn Drop</span>
          </button>
        </div>
      </div>

    </div>
  );
};
