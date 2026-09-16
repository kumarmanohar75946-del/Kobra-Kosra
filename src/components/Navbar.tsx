import React from 'react';
import { 
  Mic, 
  MicOff, 
  Search, 
  Upload, 
  ListMusic, 
  Disc, 
  Video, 
  VideoOff,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  micActive: boolean;
  onToggleMic: () => void;
  videoActive: boolean;
  onToggleVideo: () => void;
  onOpenSearch: () => void;
  onOpenUpload: () => void;
  onOpenLibrary: () => void;
  onOpenRecordings: () => void;
  recordingsCount: number;
  isRecording: boolean;
  recordingDuration: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  micActive,
  onToggleMic,
  videoActive,
  onToggleVideo,
  onOpenSearch,
  onOpenUpload,
  onOpenLibrary,
  onOpenRecordings,
  recordingsCount,
  isRecording,
  recordingDuration
}) => {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                SurSangam <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-medium border border-rose-500/30">Karaoke Studio</span>
              </h1>
            </div>
            <p className="text-xs text-neutral-400">
              Gaao, Record Karo aur Sur Milaao
            </p>
          </div>
        </div>

        {/* Live Recording Indicator if active */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider">Recording {formatTime(recordingDuration)}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Gana Maango (Request Song) */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium text-xs sm:text-sm hover:brightness-110 shadow-md shadow-rose-950/30 transition-all cursor-pointer"
            title="Search or ask Gemini for any song lyrics & chords"
          >
            <Sparkles className="w-4 h-4 text-amber-100" />
            <span>Gana Maangey (Request Song)</span>
          </button>

          {/* Load Audio / Video file */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 text-xs sm:text-sm transition-all cursor-pointer"
            title="Load your own video or audio file"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Load Video / Song</span>
            <span className="sm:hidden">Load</span>
          </button>

          {/* Preloaded Library */}
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 text-xs sm:text-sm transition-all cursor-pointer"
            title="Explore built-in songs"
          >
            <ListMusic className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Song Library</span>
          </button>

          {/* Microphone toggle */}
          <button
            onClick={onToggleMic}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              micActive 
                ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={micActive ? 'Microphone Connected' : 'Connect Microphone'}
          >
            {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{micActive ? 'Mic Active' : 'Enable Mic'}</span>
          </button>

          {/* Video Camera toggle */}
          <button
            onClick={onToggleVideo}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              videoActive 
                ? 'bg-indigo-950/40 border-indigo-600/60 text-indigo-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title={videoActive ? 'Camera On' : 'Turn On Camera for Video Singing'}
          >
            {videoActive ? <Video className="w-4 h-4 text-indigo-400" /> : <VideoOff className="w-4 h-4" />}
            <span className="hidden md:inline">{videoActive ? 'Camera On' : 'Camera'}</span>
          </button>

          {/* Recordings list */}
          <button
            onClick={onOpenRecordings}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 hover:border-neutral-500 text-neutral-200 text-xs sm:text-sm transition-all cursor-pointer"
            title="View saved recordings"
          >
            <Disc className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Takes</span>
            {recordingsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-purple-500 text-white">
                {recordingsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
