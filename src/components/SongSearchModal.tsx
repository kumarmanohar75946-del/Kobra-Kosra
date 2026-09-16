import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Music, 
  Loader2, 
  CheckCircle2, 
  Wand2,
  BookOpen,
  ArrowRight,
  Flame
} from 'lucide-react';
import { Song } from '../types';

interface SongSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSong: (song: Song) => void;
}

const QUICK_SONG_CHIPS = [
  'Pasoori - Ali Sethi, Shae Gill',
  'Agar Tum Saath Ho - Alka Yagnik, Arijit Singh',
  'O Maahi - Dunki / Arijit Singh',
  'Shape of You - Ed Sheeran',
  'Chura Liya Hai Tumne Jo Dil Ko',
  'Hawayein - Jab Harry Met Sejal',
  'Apna Bana Le - Bhediya',
  'Tujh Mein Rab Dikhta Hai',
  'Believer - Imagine Dragons',
  'Dil Diyan Gallan - Atif Aslam'
];

export const SongSearchModal: React.FC<SongSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectSong
}) => {
  const [activeTab, setActiveTab] = useState<'request' | 'generate'>('request');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('Hindi / Bollywood');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSong, setPreviewSong] = useState<Song | null>(null);

  // Custom song generator state
  const [customTopic, setCustomTopic] = useState('');
  const [customMood, setCustomMood] = useState('Romantic & Melodic');
  const [customGenre, setCustomGenre] = useState('Acoustic Bollywood Ballad');

  if (!isOpen) return null;

  const handleRequestSong = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) {
      setError('Kripya gaane ka naam daalein (Please enter song name)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewSong(null);

    try {
      const res = await fetch('/api/song/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, language })
      });

      if (!res.ok) {
        throw new Error('Could not fetch song details');
      }

      const data = await res.json();
      if (data.song) {
        const fullSong: Song = {
          id: 'requested-' + Date.now(),
          title: data.song.title || q,
          artist: data.song.artist || 'Requested Artist',
          genre: data.song.genre || 'Melody / Pop',
          language: data.song.language || language,
          tempoBpm: Number(data.song.tempoBpm) || 88,
          key: data.song.key || 'C Major',
          mood: data.song.mood || 'Soulful',
          vocalTips: data.song.vocalTips,
          chords: Array.isArray(data.song.chords) ? data.song.chords : ['Am', 'F', 'C', 'G'],
          lines: Array.isArray(data.song.lines) && data.song.lines.length > 0 
            ? data.song.lines.map((l: any, idx: number) => ({
                text: l.text || '',
                section: l.section || 'Verse',
                chord: l.chord || 'Am',
                timeSec: typeof l.timeSec === 'number' ? l.timeSec : idx * 6
              }))
            : [
                { text: `🎶 [Intro Melody]`, section: 'Intro', chord: 'Am', timeSec: 0 },
                { text: q, section: 'Verse 1', chord: 'Am', timeSec: 5 }
              ],
          fullLyricsText: data.song.fullLyricsText || '',
          sourceType: 'ai-requested',
          isSynthBacking: true
        };

        setPreviewSong(fullSong);
      }
    } catch (err: any) {
      console.error('Request failed:', err);
      setError('Gaana laane mein dikkat aayi. Kripya dobara try karein.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCustom = async () => {
    if (!customTopic.trim()) {
      setError('Kripya gaane ka topic ya subject likhein (e.g. Dosti, Pyaar, Sapne)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewSong(null);

    try {
      const res = await fetch('/api/song/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: customTopic,
          mood: customMood,
          genre: customGenre,
          language
        })
      });

      if (!res.ok) throw new Error('Custom song generation failed');
      const data = await res.json();
      if (data.song) {
        const fullSong: Song = {
          id: 'custom-' + Date.now(),
          title: data.song.title || customTopic,
          artist: data.song.artist || 'SurSangam AI Original',
          genre: data.song.genre || customGenre,
          language: data.song.language || language,
          tempoBpm: Number(data.song.tempoBpm) || 90,
          key: data.song.key || 'G Major',
          mood: data.song.mood || customMood,
          vocalTips: data.song.vocalTips,
          chords: Array.isArray(data.song.chords) ? data.song.chords : ['G', 'D', 'Em', 'C'],
          lines: Array.isArray(data.song.lines) ? data.song.lines : [],
          fullLyricsText: data.song.fullLyricsText || '',
          sourceType: 'custom-ai',
          isSynthBacking: true
        };
        setPreviewSong(fullSong);
      }
    } catch (err: any) {
      setError('Naya gaana banane mein samasya aayi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmLoad = () => {
    if (previewSong) {
      onSelectSong(previewSong);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Gana Maangey (Request Any Song)
              </h2>
              <p className="text-xs text-neutral-400">
                AI se koi bhi gaana mangwayein aur uske suron par gaayein
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

        {/* Tab switch */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/30">
          <button
            onClick={() => { setActiveTab('request'); setError(null); }}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'request'
                ? 'border-rose-500 text-rose-400 bg-neutral-900/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Search & Request Song</span>
          </button>
          <button
            onClick={() => { setActiveTab('generate'); setError(null); }}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'generate'
                ? 'border-amber-500 text-amber-400 bg-neutral-900/50'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>AI Custom Song Creator</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
              {error}
            </div>
          )}

          {activeTab === 'request' ? (
            <div className="space-y-4">
              {/* Search Box */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Gaane ka naam ya artist likhein:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRequestSong(query)}
                      placeholder="e.g. Tum Hi Ho, Kesariya, Pasoori, Shape of You..."
                      className="w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-xl text-sm text-white placeholder-neutral-500 outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => handleRequestSong(query)}
                    disabled={isLoading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium text-xs sm:text-sm hover:brightness-110 disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Mangaao</span>
                  </button>
                </div>
              </div>

              {/* Language selection */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">Language:</span>
                {['Hindi / Bollywood', 'Punjabi', 'English', 'Any'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                      language === lang 
                        ? 'border-rose-500/70 bg-rose-500/10 text-rose-300' 
                        : 'border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Quick Popular Song Chips */}
              <div>
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Popular Trending Songs:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SONG_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => {
                        setQuery(chip);
                        handleRequestSong(chip);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 text-neutral-300 text-xs text-left transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Custom Generator Form */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Gaana kis vishay par chahiye? (Topic / Story)
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Sachi Dosti, Pehla Pyaar, Monsoon Romance, Zindagi ka safar..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl text-sm text-white placeholder-neutral-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Mood / Bhavana:
                  </label>
                  <select
                    value={customMood}
                    onChange={(e) => setCustomMood(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white outline-none"
                  >
                    <option value="Romantic & Melodic">Romantic & Melodic</option>
                    <option value="Heartbreak & Soulful">Heartbreak & Soulful</option>
                    <option value="Energetic & Celebration">Energetic & Celebration</option>
                    <option value="Peaceful & Acoustic">Peaceful & Acoustic</option>
                    <option value="Motivational">Motivational</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Musical Style:
                  </label>
                  <select
                    value={customGenre}
                    onChange={(e) => setCustomGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-white outline-none"
                  >
                    <option value="Acoustic Bollywood Ballad">Acoustic Bollywood Ballad</option>
                    <option value="Sufi Rock">Sufi Rock</option>
                    <option value="Punjabi Pop Groove">Punjabi Pop Groove</option>
                    <option value="Piano Classical Romance">Piano Classical Romance</option>
                    <option value="Indie Folk">Indie Folk</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateCustom}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium text-sm hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                <span>Naya Gaana Banao (Generate Song)</span>
              </button>
            </div>
          )}

          {/* Song Preview Card once loaded */}
          {previewSong && (
            <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-emerald-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                      Gaana Tayar Hai! (Song Ready)
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{previewSong.title}</h3>
                  <p className="text-xs text-neutral-400">{previewSong.artist} • {previewSong.genre}</p>
                </div>
                <div className="text-right text-xs text-neutral-400">
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 font-mono text-amber-300">
                    {previewSong.key}
                  </span>
                  <div className="mt-1">{previewSong.tempoBpm} BPM</div>
                </div>
              </div>

              {previewSong.vocalTips && (
                <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300">
                  <span className="text-amber-400 font-semibold">Vocal Tips:</span> {previewSong.vocalTips}
                </div>
              )}

              {/* Lyrics snippet */}
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800/80 max-h-36 overflow-y-auto space-y-1 text-xs">
                <div className="text-neutral-400 font-medium mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Lyrics Preview ({previewSong.lines.length} lines):</span>
                </div>
                {previewSong.lines.slice(0, 5).map((l, i) => (
                  <div key={i} className="flex items-center gap-2 text-neutral-300">
                    {l.chord && <span className="text-[10px] font-mono text-rose-400 bg-neutral-950 px-1 rounded">[{l.chord}]</span>}
                    <span>{l.text}</span>
                  </div>
                ))}
                {previewSong.lines.length > 5 && (
                  <div className="text-[11px] text-neutral-500 italic pt-1">
                    ...aur {previewSong.lines.length - 5} panktiyan (more lines)
                  </div>
                )}
              </div>

              {/* Confirm Load Button */}
              <button
                onClick={handleConfirmLoad}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <span>Studio Mein Load Karein aur Gaayein</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
