import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Upload, 
  ListMusic, 
  Disc, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Volume2,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { Song, AudioFxConfig, PitchData, RecordingItem } from './types';
import { PRELOADED_SONGS } from './data/songs';
import { SingingAudioEngine } from './utils/audioEngine';
import { Navbar } from './components/Navbar';
import { KaraokePlayer } from './components/KaraokePlayer';
import { VocalControls } from './components/VocalControls';
import { SongSearchModal } from './components/SongSearchModal';
import { MediaLoaderModal } from './components/MediaLoaderModal';
import { SongLibraryDrawer } from './components/SongLibraryDrawer';
import { RecordingsGallery } from './components/RecordingsGallery';

export default function App() {
  // Current active song
  const [currentSong, setCurrentSong] = useState<Song>(PRELOADED_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(110);

  // Audio FX state
  const [fxConfig, setFxConfig] = useState<AudioFxConfig>({
    vocalVolume: 1.0,
    musicVolume: 0.85,
    preset: 'studio',
    reverbMix: 0.35,
    delayMix: 0.2,
    pitchShiftSemitones: 0,
    playbackRate: 1.0,
    monitorEnabled: false
  });

  // Pitch state
  const [pitchData, setPitchData] = useState<PitchData>({
    note: '--',
    frequency: 0,
    cents: 0,
    confidence: 0,
    isSinging: false
  });

  // Mic & Webcam state
  const [micActive, setMicActive] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordings, setRecordings] = useState<RecordingItem[]>(() => {
    try {
      const saved = localStorage.getItem('sursangam_takes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLibraryDrawerOpen, setIsLibraryDrawerOpen] = useState(false);
  const [isRecordingsModalOpen, setIsRecordingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // References
  const audioEngineRef = useRef<SingingAudioEngine | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);

  // Initialize Audio Engine once
  useEffect(() => {
    const engine = new SingingAudioEngine();
    audioEngineRef.current = engine;

    return () => {
      engine.cleanup();
    };
  }, []);

  // Sync FX config changes to audio engine
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setFxConfig(fxConfig);
    }
  }, [fxConfig]);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3500);
  };

  // Toggle Microphone
  const handleToggleMic = async () => {
    if (!audioEngineRef.current) return;

    if (micActive) {
      setMicActive(false);
      showToast('Microphone disconnected');
    } else {
      const success = await audioEngineRef.current.initMicrophone((pitch) => {
        setPitchData(pitch);
      });
      if (success) {
        setMicActive(true);
        showToast('Microphone connected! Sing to test your pitch');
      } else {
        showToast('Microphone access denied or not available');
      }
    }
  };

  // Toggle Webcam
  const handleToggleWebcam = async () => {
    if (isWebcamActive) {
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        setWebcamStream(null);
      }
      setIsWebcamActive(false);
      showToast('Camera turned off');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        setWebcamStream(stream);
        setIsWebcamActive(true);
        showToast('Camera active! Selfie Karaoke Mode ON');
      } catch (err) {
        console.warn('Webcam access error:', err);
        showToast('Could not access camera');
      }
    }
  };

  // Update total duration when song changes
  useEffect(() => {
    if (currentSong.lines.length > 0) {
      const lastLine = currentSong.lines[currentSong.lines.length - 1];
      setDuration(Math.max(lastLine.timeSec + 12, 60));
    } else {
      setDuration(100);
    }
    setCurrentTime(0);
    setIsPlaying(false);
    if (audioEngineRef.current) {
      audioEngineRef.current.stopSynthBacking();
    }
  }, [currentSong]);

  // Playback timer ticker
  useEffect(() => {
    if (isPlaying) {
      // Auto enable mic if not enabled
      if (!micActive) {
        handleToggleMic();
      }

      // If synthetic backing track, start synth sequence
      if (currentSong.isSynthBacking && audioEngineRef.current) {
        audioEngineRef.current.startSynthBacking(currentSong.chords, currentSong.tempoBpm);
      } else if (currentSong.audioUrl && audioElementRef.current) {
        audioElementRef.current.play().catch(() => {});
      }

      playbackTimerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            handlePause();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioEngineRef.current) {
        audioEngineRef.current.stopSynthBacking();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, currentSong, duration]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (isPlaying) handlePause();
    else handlePlay();
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = newTime;
    }
  };

  // Determine active lyric line
  const activeLineIndex = currentSong.lines.reduce((acc, line, idx) => {
    return line.timeSec <= currentTime ? idx : acc;
  }, 0);

  const handleSelectLine = (index: number) => {
    const targetLine = currentSong.lines[index];
    if (targetLine) {
      handleSeek(targetLine.timeSec);
    }
  };

  // Handle Recording Start / Stop
  const handleToggleRecord = async () => {
    if (!audioEngineRef.current) return;

    // Ensure mic is on
    if (!micActive) {
      const micOk = await audioEngineRef.current.initMicrophone((pitch) => setPitchData(pitch));
      if (!micOk) {
        showToast('Please enable microphone permissions to record.');
        return;
      }
      setMicActive(true);
    }

    if (isRecording) {
      // STOP recording
      try {
        const result = await audioEngineRef.current.stopRecording();
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);

        const newRec: RecordingItem = {
          id: 'take-' + Date.now(),
          songTitle: currentSong.title,
          artist: currentSong.artist,
          recordedAt: Date.now(),
          blobUrl: result.url,
          mimeType: result.mimeType,
          durationSec: recordingDuration,
          isVideo: isWebcamActive
        };

        setRecordings(prev => {
          const updated = [newRec, ...prev];
          try {
            localStorage.setItem('sursangam_takes', JSON.stringify(updated));
          } catch {}
          return updated;
        });

        showToast(`🎉 Recording saved! (${recordingDuration}s take)`);
        setIsRecordingsModalOpen(true);
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
    } else {
      // START recording
      const started = audioEngineRef.current.startRecording(isWebcamActive ? webcamStream : null);
      if (started) {
        setIsRecording(true);
        setRecordingDuration(0);
        showToast('🔴 Recording started! Sing along with the music');

        // Start playback if not already playing
        if (!isPlaying) {
          handlePlay();
        }

        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(d => d + 1);
        }, 1000);
      }
    }
  };

  const handleDeleteRecording = (id: string) => {
    setRecordings(prev => {
      const updated = prev.filter(r => r.id !== id);
      try {
        localStorage.setItem('sursangam_takes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSelectSong = (song: Song) => {
    setCurrentSong(song);
    showToast(`Loaded: ${song.title}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-rose-500 selection:text-white">
      
      {/* Hidden Audio Element for custom audio files */}
      {currentSong.audioUrl && (
        <audio
          ref={(el) => {
            audioElementRef.current = el;
            if (el && audioEngineRef.current) {
              audioEngineRef.current.attachMediaElement(el);
            }
          }}
          src={currentSong.audioUrl}
          onEnded={handlePause}
        />
      )}

      {/* Navigation Top Bar */}
      <Navbar
        micActive={micActive}
        onToggleMic={handleToggleMic}
        videoActive={isWebcamActive}
        onToggleVideo={handleToggleWebcam}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenLibrary={() => setIsLibraryDrawerOpen(true)}
        onOpenRecordings={() => setIsRecordingsModalOpen(true)}
        recordingsCount={recordings.length}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
      />

      {/* Floating Toast Notice */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-neutral-900/95 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-medium shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
        
        {/* Quick Suggestion Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">Current Track:</span>
            <span className="font-bold text-amber-400">{currentSong.title}</span>
            <span className="text-neutral-500 hidden sm:inline">• {currentSong.artist}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gana Mangaayein (Fetch Song)</span>
            </button>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Load Video / Audio</span>
            </button>
          </div>
        </div>

        {/* Primary Stage: Karaoke Player with Lyrics, Video, and Pitch Graph */}
        <KaraokePlayer
          song={currentSong}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          pitchData={pitchData}
          analyserNode={audioEngineRef.current?.getMicAnalyser() || null}
          videoStream={webcamStream}
          isWebcamActive={isWebcamActive}
          isRecording={isRecording}
          onToggleRecord={handleToggleRecord}
          activeLineIndex={activeLineIndex}
          onSelectLine={handleSelectLine}
        />

        {/* Studio Controls: Mixer, Vocal FX Presets, Key Transpose, Soundboard */}
        <VocalControls
          config={fxConfig}
          onChangeConfig={setFxConfig}
          isWebcamActive={isWebcamActive}
          onToggleWebcam={handleToggleWebcam}
          onPlayApplause={() => audioEngineRef.current?.playApplause()}
          onPlayCheer={() => audioEngineRef.current?.playCheer()}
          onPlayCountIn={() => audioEngineRef.current?.playCountIn()}
          onPlayAirhorn={() => audioEngineRef.current?.playAirhorn()}
        />
      </main>

      {/* Modals & Drawers */}
      <SongSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectSong={handleSelectSong}
      />

      <MediaLoaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onLoadMediaSong={handleSelectSong}
      />

      <SongLibraryDrawer
        isOpen={isLibraryDrawerOpen}
        onClose={() => setIsLibraryDrawerOpen(false)}
        activeSongId={currentSong.id}
        onSelectSong={handleSelectSong}
      />

      <RecordingsGallery
        isOpen={isRecordingsModalOpen}
        onClose={() => setIsRecordingsModalOpen(false)}
        recordings={recordings}
        onDeleteRecording={handleDeleteRecording}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
        <p>SurSangam Singing Studio • Sing, Record, and Harmonize with AI</p>
      </footer>
    </div>
  );
}
