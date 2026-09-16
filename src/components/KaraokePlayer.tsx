import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  Mic, 
  Radio, 
  Music2, 
  Layers, 
  Sparkles,
  ChevronRight,
  Disc,
  Video as VideoIcon
} from 'lucide-react';
import { Song, PitchData } from '../types';

interface KaraokePlayerProps {
  song: Song;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  pitchData: PitchData;
  analyserNode: AnalyserNode | null;
  videoStream: MediaStream | null;
  isWebcamActive: boolean;
  isRecording: boolean;
  onToggleRecord: () => void;
  activeLineIndex: number;
  onSelectLine: (index: number) => void;
}

export const KaraokePlayer: React.FC<KaraokePlayerProps> = ({
  song,
  isPlaying,
  onTogglePlay,
  onRestart,
  currentTime,
  duration,
  onSeek,
  pitchData,
  analyserNode,
  videoStream,
  isWebcamActive,
  isRecording,
  onToggleRecord,
  activeLineIndex,
  onSelectLine
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lyricsViewMode, setLyricsViewMode] = useState<'prompter' | 'sheet'>('prompter');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const songVideoRef = useRef<HTMLVideoElement>(null);
  const lyricsScrollRef = useRef<HTMLDivElement>(null);

  // Webcam stream binding
  useEffect(() => {
    if (webcamVideoRef.current && videoStream) {
      webcamVideoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Sync song video element if custom video loaded
  useEffect(() => {
    if (songVideoRef.current) {
      if (isPlaying) {
        songVideoRef.current.play().catch(() => {});
      } else {
        songVideoRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (songVideoRef.current && Math.abs(songVideoRef.current.currentTime - currentTime) > 0.5) {
      songVideoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Auto-scroll lyrics prompter so active line stays in view
  useEffect(() => {
    if (lyricsScrollRef.current && lyricsViewMode === 'prompter') {
      const activeEl = lyricsScrollRef.current.querySelector(`[data-line-index="${activeLineIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIndex, lyricsViewMode]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);

        // Draw dynamic frequency bars
        const barCount = 48;
        const barWidth = (width / barCount) - 2;
        let x = 0;

        for (let i = 0; i < barCount; i++) {
          const dataIndex = Math.floor((i / barCount) * (bufferLength / 2));
          const value = dataArray[dataIndex] || 0;
          const barHeight = (value / 255) * (height * 0.75);

          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, 'rgba(244, 63, 94, 0.2)');
          gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.7)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.9)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
          ctx.fill();

          x += barWidth + 2;
        }
      } else {
        // Subtle ambient idle wave
        const time = Date.now() * 0.002;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let x = 0; x < width; x += 5) {
          const y = (height / 2) + Math.sin(x * 0.02 + time) * (isPlaying ? 15 : 6);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = isPlaying ? 'rgba(244, 63, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [analyserNode, isPlaying]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeLine = song.lines[activeLineIndex] || song.lines[0];

  return (
    <div 
      ref={containerRef}
      className={`relative bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
        isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full min-h-[560px]'
      }`}
    >
      {/* Top Banner / Song Meta */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/30">
            <Music2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              {song.title}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-amber-300 font-mono border border-neutral-700">
                Key: {song.key}
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              {song.artist} • <span className="text-neutral-500">{song.genre}</span>
            </p>
          </div>
        </div>

        {/* View toggles & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Lyrics View Switch */}
          <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setLyricsViewMode('prompter')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                lyricsViewMode === 'prompter' ? 'bg-rose-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Karaoke Prompter
            </button>
            <button
              onClick={() => setLyricsViewMode('sheet')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                lyricsViewMode === 'sheet' ? 'bg-rose-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Full Lyrics
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stage: Video / Visualizer + Live Pitch Feedback */}
      <div className="relative flex-1 flex flex-col justify-between overflow-hidden bg-radial from-neutral-900 to-neutral-950 min-h-[320px]">
        
        {/* Background Visual Layer */}
        <div className="absolute inset-0 z-0">
          {/* If user uploaded a video track */}
          {song.videoUrl ? (
            <video
              ref={songVideoRef}
              src={song.videoUrl}
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          ) : isWebcamActive ? (
            /* Webcam Selfie Karaoke Mode */
            <div className="relative w-full h-full bg-black">
              <video
                ref={webcamVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs text-white flex items-center gap-1.5">
                <VideoIcon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                <span>Camera Sing Mode</span>
              </div>
            </div>
          ) : (
            /* Audio Visualizer Canvas */
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={260}
                className="w-full h-full max-h-72 opacity-80 pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent pointer-events-none" />
            </div>
          )}
        </div>

        {/* Real-time Pitch Detector Ribbon */}
        <div className="relative z-10 mx-auto mt-4 px-4 py-1.5 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-700/60 shadow-lg flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-neutral-300">
            <Radio className={`w-3.5 h-3.5 ${pitchData.isSinging ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span>Pitch Tuner:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-base font-mono font-extrabold px-2.5 py-0.5 rounded-md ${
              pitchData.isSinging 
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-neutral-800 text-neutral-500'
            }`}>
              {pitchData.note}
            </span>

            {pitchData.frequency > 0 && (
              <span className="text-[11px] font-mono text-neutral-400">
                {pitchData.frequency} Hz
              </span>
            )}

            {/* Flat / In Tune / Sharp Cents Meter */}
            {pitchData.isSinging && (
              <div className="flex items-center gap-1 text-[10px]">
                <span className={pitchData.cents < -10 ? 'text-amber-400 font-bold' : 'text-neutral-500'}>
                  {pitchData.cents < -10 ? '♭ Flat' : ''}
                </span>
                <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                  <div 
                    className={`h-full w-2 rounded-full absolute top-0 transition-all ${
                      Math.abs(pitchData.cents) <= 10 ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ left: `${Math.min(Math.max((pitchData.cents + 50), 0), 100)}%` }}
                  />
                </div>
                <span className={pitchData.cents > 10 ? 'text-amber-400 font-bold' : 'text-neutral-500'}>
                  {pitchData.cents > 10 ? '♯ Sharp' : ''}
                </span>
                {Math.abs(pitchData.cents) <= 10 && (
                  <span className="text-emerald-400 font-bold ml-1">In Tune! ✨</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Karaoke Lyrics Display Area */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-12 py-4">
          {lyricsViewMode === 'prompter' ? (
            <div 
              ref={lyricsScrollRef}
              className="max-h-56 overflow-y-auto space-y-4 text-center py-6 no-scrollbar scroll-smooth"
            >
              {song.lines.map((line, idx) => {
                const isActive = idx === activeLineIndex;
                const isPast = idx < activeLineIndex;

                return (
                  <div
                    key={idx}
                    data-line-index={idx}
                    onClick={() => onSelectLine(idx)}
                    className={`cursor-pointer transition-all duration-300 py-1.5 px-4 rounded-2xl mx-auto max-w-2xl ${
                      isActive 
                        ? 'scale-105 bg-neutral-900/90 backdrop-blur-md border border-rose-500/50 shadow-xl shadow-rose-950/40 text-white' 
                        : isPast 
                          ? 'opacity-40 text-neutral-400 hover:opacity-75' 
                          : 'opacity-60 text-neutral-300 hover:opacity-90'
                    }`}
                  >
                    {/* Musical Chord badge */}
                    {line.chord && (
                      <div className="mb-0.5">
                        <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          isActive ? 'bg-rose-500 text-white' : 'bg-neutral-800/80 text-amber-300'
                        }`}>
                          {line.chord}
                        </span>
                      </div>
                    )}
                    {/* Lyrics Text */}
                    <p className={`font-semibold tracking-tight transition-all ${
                      isActive 
                        ? 'text-lg sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-300 to-white' 
                        : 'text-sm sm:text-base'
                    }`}>
                      {line.text}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Full Lyrics Sheet View */
            <div className="max-h-64 overflow-y-auto p-4 rounded-xl bg-neutral-900/80 backdrop-blur-md border border-neutral-800 space-y-2 text-left max-w-xl mx-auto text-xs sm:text-sm">
              <div className="text-neutral-400 font-semibold mb-2 flex items-center justify-between">
                <span>Complete Lyrics & Chords:</span>
                <span className="text-[11px] text-neutral-500">Click any line to jump</span>
              </div>
              {song.lines.map((line, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectLine(idx)}
                  className={`p-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    idx === activeLineIndex 
                      ? 'bg-rose-500/20 text-white font-bold border-l-2 border-rose-500' 
                      : 'hover:bg-neutral-800/50 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {line.chord && (
                      <span className="font-mono text-xs text-rose-400 bg-neutral-950 px-1.5 py-0.5 rounded">
                        [{line.chord}]
                      </span>
                    )}
                    <span>{line.text}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {formatTime(line.timeSec)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Active Floating Subtitle in Video/Camera Mode */}
        {(song.videoUrl || isWebcamActive) && activeLine && (
          <div className="relative z-10 pb-3 px-4 text-center">
            <div className="inline-block px-4 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-base sm:text-lg font-bold shadow-2xl">
              {activeLine.chord && <span className="text-rose-400 text-xs font-mono mr-2">[{activeLine.chord}]</span>}
              {activeLine.text}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Transport Controls */}
      <div className="p-4 sm:px-6 border-t border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md z-20 space-y-3">
        {/* Progress Scrubber */}
        <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="flex-1 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Playback Buttons & Record */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Restart */}
            <button
              onClick={onRestart}
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Play / Pause */}
            <button
              onClick={onTogglePlay}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Play Music'}</span>
            </button>
          </div>

          {/* Record Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleRecord}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-lg shadow-red-950/50'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white' : 'bg-red-500'}`} />
              <span>{isRecording ? 'Stop Recording' : 'Record Take'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
