import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { format } from 'date-fns';

export default function SearchOverlay({ conversationId, onClose }) {
  const [q, setQ] = useState('');
  const messages = useChatStore(s => s.messages[conversationId] || []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return messages.filter(m =>
      m.decryptedText?.toLowerCase().includes(q.toLowerCase()) && !m.deletedForEveryone
    );
  }, [q, messages]);

  return (
    <div className="absolute inset-0 z-20 bg-[#0d0d14]/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e2e]">
        <Search size={16} className="text-[#555575] shrink-0" />
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search messages…"
          className="flex-1 bg-transparent text-white text-sm placeholder-[#444460] focus:outline-none"
        />
        <button onClick={onClose} className="text-[#555575] hover:text-white transition"><X size={18} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!q && <p className="text-center text-sm text-[#444460] py-12">Type to search messages</p>}
        {q && results.length === 0 && <p className="text-center text-sm text-[#444460] py-12">No results for "{q}"</p>}
        {results.map(msg => (
          <div key={msg._id} className="px-4 py-3 border-b border-[#1a1a28] hover:bg-[#1a1a28] transition cursor-pointer">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-violet-400">{msg.sender?.username}</span>
              <span className="text-[10px] text-[#444460]">{msg.createdAt ? format(new Date(msg.createdAt), 'MMM d, HH:mm') : ''}</span>
            </div>
            <p className="text-sm text-[#c0c0e0]">
              {msg.decryptedText?.split(new RegExp(`(${q})`, 'gi')).map((part, i) =>
                part.toLowerCase() === q.toLowerCase()
                  ? <mark key={i} className="bg-violet-500/40 text-white rounded px-0.5">{part}</mark>
                  : part
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
