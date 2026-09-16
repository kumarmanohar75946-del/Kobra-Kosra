import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Play, 
  Music, 
  Sparkles, 
  Mic2,
  Heart,
  Flame,
  Radio
} from 'lucide-react';
import { Song } from '../types';
import { PRELOADED_SONGS } from '../data/songs';

interface SongLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSongId: string;
  onSelectSong: (song: Song) => void;
}

export const SongLibraryDrawer: React.FC<SongLibraryDrawerProps> = ({
  isOpen,
  onClose,
  activeSongId,
  onSelectSong
}) => {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  if (!isOpen) return null;

  const genres = ['All', 'Bollywood', 'Classical', 'Punjabi', 'Acoustic'];

  const filteredSongs = PRELOADED_SONGS.filter((s) => {
    const matchesSearch = 
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      s.genre.toLowerCase().includes(search.toLowerCase());
    
    if (selectedGenre === 'All') return matchesSearch;
    if (selectedGenre === 'Bollywood') return matchesSearch && s.genre.includes('Bollywood');
    if (selectedGenre === 'Classical') return matchesSearch && (s.genre.includes('Classical') || s.genre.includes('Soulful'));
    if (selectedGenre === 'Punjabi') return matchesSearch && (s.genre.includes('Punjabi') || s.language.includes('Punjabi'));
    if (selectedGenre === 'Acoustic') return matchesSearch && (s.genre.includes('Acoustic') || s.genre.includes('Pop'));
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Pre-Loaded Songs Library
              </h2>
              <p className="text-xs text-neutral-400">
                Pehle se shamil gaane chunein aur gaana shuru karein
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

        {/* Search & Genre filter */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-950/40 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gaana ya singer khojein..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Songs List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-2.5">
          {filteredSongs.map((song) => {
            const isCurrent = song.id === activeSongId;
            return (
              <div
                key={song.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">
                        {song.title}
                      </h3>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-500 text-black rounded-full uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectSong(song);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'bg-neutral-800 hover:bg-emerald-600 text-neutral-200 hover:text-white'
                    }`}
                  >
                    <Mic2 className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Playing' : 'Sing'}</span>
                  </button>
                </div>

                {/* Metadata tags */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-900 text-[11px] text-neutral-400">
                  <span className="font-mono text-amber-400/90">{song.key}</span>
                  <span>•</span>
                  <span>{song.tempoBpm} BPM</span>
                  <span>•</span>
                  <span className="truncate">{song.genre}</span>
                </div>

                {/* Lyric preview snippet */}
                {song.lines.length > 1 && (
                  <p className="text-[11px] text-neutral-500 italic truncate mt-1.5">
                    "{song.lines[1].text}"
                  </p>
                )}
              </div>
            );
          })}

          {filteredSongs.length === 0 && (
            <div className="p-8 text-center text-neutral-500 text-xs">
              Koi gaana nahi mila. "Gana Maangey" par click karke Gemini se mangwayein!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
