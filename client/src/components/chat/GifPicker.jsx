import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader } from 'lucide-react';

const TENOR_KEY = 'AIzaSyAyimkuYQYF_y4y_yx2TAIW0hVQTiO8pFM'; // public demo key
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

async function fetchGifs(query, next = '') {
  const params = new URLSearchParams({
    key: TENOR_KEY,
    q: query || 'trending',
    limit: 20,
    media_filter: 'gif',
    ...(next ? { pos: next } : {}),
  });
  const endpoint = query ? 'search' : 'featured';
  const res = await fetch(`${TENOR_BASE}/${endpoint}?${params}`);
  return res.json();
}

export default function GifPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState('');
  const debounce = useRef(null);
  const inputRef = useRef(null);

  const load = async (q = query, cursor = '') => {
    setLoading(true);
    try {
      const data = await fetchGifs(q, cursor);
      const results = (data.results || []).map(r => ({
        id: r.id,
        url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url || '',
        preview: r.media_formats?.nanogif?.url || r.media_formats?.tinygif?.url || '',
        dims: r.media_formats?.gif?.dims || [200, 200],
      })).filter(g => g.url);
      setGifs(cursor ? prev => [...prev, ...results] : results);
      setNext(data.next || '');
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(''); inputRef.current?.focus(); }, []);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { setGifs([]); load(query, ''); }, 400);
    return () => clearTimeout(debounce.current);
  }, [query]);

  return (
    <div className="absolute bottom-full right-0 mb-2 z-50 w-80 bg-[#13131e] border border-[#2a2a3e] rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 380 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#1e1e2e]">
        <Search size={13} className="text-[#555570] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="flex-1 bg-transparent text-sm text-white placeholder-[#444460] focus:outline-none"
        />
        <button onClick={onClose} className="text-[#555575] hover:text-white transition shrink-0"><X size={15} /></button>
      </div>

      {/* Grid */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading && gifs.length === 0 && (
          <div className="flex justify-center py-8"><Loader size={20} className="text-violet-400 animate-spin" /></div>
        )}
        {!loading && gifs.length === 0 && (
          <p className="text-center text-xs text-[#555570] py-8">No GIFs found</p>
        )}
        <div className="columns-2 gap-1.5 space-y-1.5">
          {gifs.map(gif => (
            <button
              key={gif.id}
              onClick={() => { onSelect(gif.url); onClose(); }}
              className="w-full rounded-xl overflow-hidden hover:opacity-90 transition block"
            >
              <img
                src={gif.preview || gif.url}
                alt="gif"
                loading="lazy"
                className="w-full object-cover"
                style={{ minHeight: 60 }}
              />
            </button>
          ))}
        </div>
        {next && !loading && (
          <button
            onClick={() => load(query, next)}
            className="w-full text-xs text-[#555570] hover:text-violet-400 py-2 transition mt-1"
          >
            Load more
          </button>
        )}
        {loading && gifs.length > 0 && (
          <div className="flex justify-center py-2"><Loader size={16} className="text-violet-400 animate-spin" /></div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-[#1e1e2e] flex justify-end">
        <span className="text-[10px] text-[#333355]">Powered by Tenor</span>
      </div>
    </div>
  );
}
