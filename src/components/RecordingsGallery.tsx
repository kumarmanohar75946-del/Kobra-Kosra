import React, { useState } from 'react';
import { 
  X, 
  Disc, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Film, 
  FileAudio, 
  Calendar, 
  Clock,
  Share2
} from 'lucide-react';
import { RecordingItem } from '../types';

interface RecordingsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  recordings: RecordingItem[];
  onDeleteRecording: (id: string) => void;
}

export const RecordingsGallery: React.FC<RecordingsGalleryProps> = ({
  isOpen,
  onClose,
  recordings,
  onDeleteRecording
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Disc className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Aapke Recorded Gaane (My Takes)
              </h2>
              <p className="text-xs text-neutral-400">
                Aapki aawaz mein record kiye gaye audio aur video gaane
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
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {recordings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-500">
                <Disc className="w-6 h-6" />
              </div>
              <p className="text-sm text-neutral-300 font-medium">Abhi tak koi recording nahi hui hai</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Studio mein kisi bhi gaane par "Record" button dabayein, apna gaana gaayein aur yahan save ho jayega!
              </p>
            </div>
          ) : (
            recordings.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-purple-400 shrink-0">
                      {rec.isVideo ? <Film className="w-5 h-5 text-indigo-400" /> : <FileAudio className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{rec.songTitle}</h4>
                      <p className="text-xs text-neutral-400">{rec.artist}</p>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(rec.recordedAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(rec.durationSec)}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-neutral-400">
                          {rec.isVideo ? 'Video Recording' : 'Audio Track'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={rec.blobUrl}
                      download={`SingStudio_${rec.songTitle.replace(/\s+/g, '_')}_${Date.now()}.${rec.isVideo ? 'webm' : 'webm'}`}
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      title="Download recording"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => onDeleteRecording(rec.id)}
                      className="p-2 rounded-lg bg-neutral-900 hover:bg-red-950/40 border border-neutral-800 hover:border-red-800/60 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* In-app media player */}
                <div className="pt-2 border-t border-neutral-900">
                  {rec.isVideo ? (
                    <video
                      src={rec.blobUrl}
                      controls
                      className="w-full max-h-48 rounded-lg bg-black object-contain"
                    />
                  ) : (
                    <audio
                      src={rec.blobUrl}
                      controls
                      className="w-full h-10 rounded-lg accent-purple-500"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
