import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Film, 
  Music, 
  Link as LinkIcon, 
  FileAudio, 
  Check, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Song } from '../types';

interface MediaLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMediaSong: (song: Song) => void;
}

export const MediaLoaderModal: React.FC<MediaLoaderModalProps> = ({
  isOpen,
  onClose,
  onLoadMediaSong
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [lyricsInput, setLyricsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    const isAud = file.type.startsWith('audio/');

    if (!isVid && !isAud) {
      setError('Kripya valid audio (MP3, WAV, M4A) ya video (MP4, WebM) file chunein.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setError('File size 200MB se kam honi chahiye.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setIsVideo(isVid);

    // Auto title from filename
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setSongTitle(cleanName);
    setArtistName('Custom Track');

    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadUrl = () => {
    if (!urlInput.trim()) {
      setError('Kripya valid media URL daalein');
      return;
    }
    const isVid = /\.(mp4|webm|mkv|mov)(\?.*)?$/i.test(urlInput);
    setIsVideo(isVid);
    setPreviewUrl(urlInput.trim());
    setSelectedFile(null);
    const titleFromUrl = urlInput.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') || 'Web Stream Track';
    setSongTitle(titleFromUrl);
    setArtistName('Online Stream');
  };

  const handleConfirm = () => {
    if (!previewUrl) {
      setError('Pehle koi audio ya video file chunein ya URL daalein.');
      return;
    }

    // Parse custom lyrics into lines if entered
    let parsedLines = [];
    if (lyricsInput.trim()) {
      const rawLines = lyricsInput.split('\n').map(l => l.trim()).filter(Boolean);
      parsedLines = rawLines.map((text, idx) => ({
        text,
        section: idx === 0 ? 'Verse 1' : 'Verse',
        timeSec: idx * 5
      }));
    } else {
      parsedLines = [
        { text: `🎶 [Intro - ${isVideo ? 'Video Music Track' : 'Audio Music Track'}]`, section: 'Intro', timeSec: 0 },
        { text: songTitle || 'Sing along with your loaded track', section: 'Verse 1', timeSec: 5 },
        { text: 'Mic par gaayein aur live audio effects ka anand lein', section: 'Chorus', timeSec: 12 }
      ];
    }

    const newSong: Song = {
      id: 'loaded-' + Date.now(),
      title: songTitle.trim() || (isVideo ? 'Custom Video Track' : 'Custom Audio Song'),
      artist: artistName.trim() || 'My Track',
      genre: isVideo ? 'Loaded Video Track' : 'Loaded Audio Track',
      language: 'Custom',
      tempoBpm: 90,
      key: 'Custom Scale',
      mood: 'Performance',
      vocalTips: 'Adjust backing music volume and your microphone gain in the mixer for ideal balance.',
      chords: ['C', 'G', 'Am', 'F'],
      lines: parsedLines,
      fullLyricsText: lyricsInput || '',
      sourceType: 'user-loaded',
      audioUrl: !isVideo ? previewUrl : undefined,
      videoUrl: isVideo ? previewUrl : undefined,
      isSynthBacking: false
    };

    onLoadMediaSong(newSong);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Video ya Gana Load Karein
              </h2>
              <p className="text-xs text-neutral-400">
                Apna manpasand video (MP4) ya audio gana (MP3, WAV) studio mein chalayein
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-sky-500 bg-sky-950/20' 
                : previewUrl 
                  ? 'border-emerald-500/60 bg-emerald-950/10'
                  : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.m4a,.flac,.ogg,.mp4,.webm,.mov"
              onChange={handleFileInput}
              className="hidden"
            />

            {previewUrl ? (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  {isVideo ? <Film className="w-6 h-6" /> : <FileAudio className="w-6 h-6" />}
                </div>
                <div className="text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Media URL Loaded'}
                </div>
                <div className="text-xs text-neutral-400">
                  {isVideo ? '🎥 Video Track Ready' : '🎵 Audio Song Ready'} • Click to change file
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-center gap-2 text-neutral-400">
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <Music className="w-6 h-6 text-rose-400" />
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800">
                    <Film className="w-6 h-6 text-sky-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">
                    Yahan file drop karein ya browse karein
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Supports MP3, WAV, M4A, FLAC, MP4, WebM (up to 200MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Or URL input */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ya Media URL se load karein (Direct Audio/Video Link):</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/song.mp3 or video.mp4"
                className="flex-1 px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white placeholder-neutral-500 outline-none focus:border-sky-500"
              />
              <button
                onClick={handleLoadUrl}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Fetch
              </button>
            </div>
          </div>

          {/* Details Form */}
          {previewUrl && (
            <div className="space-y-3 pt-2 border-t border-neutral-800 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Gaane ka Title:
                  </label>
                  <input
                    type="text"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Artist / Singer:
                  </label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Optional Lyrics paste */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Lyrics (Optional - bol yahan paste karein):
                </label>
                <textarea
                  value={lyricsInput}
                  onChange={(e) => setLyricsInput(e.target.value)}
                  placeholder="Line 1 lyrics...&#10;Line 2 lyrics...&#10;Chorus lyrics..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-sky-500 resize-none font-mono"
                />
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Studio Mein Load Karein</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
