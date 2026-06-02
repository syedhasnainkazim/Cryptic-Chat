import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Smile, Paperclip, X, CornerUpLeft } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useChatStore } from '../../store/chatStore';
import { getSocket } from '../../lib/socket';
import GifPicker from './GifPicker';

export default function MessageInput({ conversationId }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const typingRef = useRef(false);
  const typingTimer = useRef(null);
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const { sendMessage, sendFile, sendGif, replyingTo, clearReply } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 128) + 'px';
  }, [text]);

  // Focus when reply changes
  useEffect(() => { if (replyingTo) textareaRef.current?.focus(); }, [replyingTo]);

  const handleTyping = useCallback(() => {
    const socket = getSocket();
    if (!typingRef.current) { typingRef.current = true; socket?.emit('typing:start', { conversationId }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      socket?.emit('typing:stop', { conversationId });
    }, 1500);
  }, [conversationId]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
    clearTimeout(typingTimer.current);
    typingRef.current = false;
    getSocket()?.emit('typing:stop', { conversationId });
    setShowEmoji(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape' && replyingTo) clearReply();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB'); return; }
    try { await sendFile(file); } catch (err) { console.error(err); }
    e.target.value = '';
  };

  return (
    <div className="px-4 py-3 border-t border-[#1e1e2e] bg-[#0f0f1a] relative">
      {/* Reply preview */}
      {replyingTo && (
        <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-[#1a1a28] rounded-xl border-l-2 border-violet-400">
          <CornerUpLeft size={13} className="text-violet-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-violet-400 font-medium">{replyingTo.sender?.username}</p>
            <p className="text-xs text-[#666680] truncate">{replyingTo.decryptedText}</p>
          </div>
          <button onClick={clearReply} className="text-[#555575] hover:text-white transition shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* GIF picker */}
      {showGif && (
        <GifPicker
          onSelect={(url) => sendGif(url)}
          onClose={() => setShowGif(false)}
        />
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker
            theme="dark"
            onEmojiClick={(e) => { setText(t => t + e.emoji); setShowEmoji(false); textareaRef.current?.focus(); }}
            width={320}
            height={380}
            searchDisabled={false}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* File, GIF & emoji */}
        <div className="flex gap-1 pb-1.5">
          <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg text-[#555575] hover:text-violet-400 hover:bg-violet-600/10 flex items-center justify-center transition">
            <Paperclip size={16} />
          </button>
          <button
            onClick={() => { setShowGif(v => !v); setShowEmoji(false); }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition text-xs font-bold ${showGif ? 'text-violet-400 bg-violet-600/10' : 'text-[#555575] hover:text-violet-400 hover:bg-violet-600/10'}`}
          >
            GIF
          </button>
          <button onClick={() => { setShowEmoji(v => !v); setShowGif(false); }} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${showEmoji ? 'text-violet-400 bg-violet-600/10' : 'text-[#555575] hover:text-violet-400 hover:bg-violet-600/10'}`}>
            <Smile size={16} />
          </button>
        </div>

        <div className="flex-1 flex items-end bg-[#1a1a28] border border-[#2a2a3e] rounded-2xl focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition overflow-hidden">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-[#444460] resize-none focus:outline-none"
            style={{ minHeight: '44px', maxHeight: '128px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="m-1.5 w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 shadow-lg shadow-violet-900/30"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.zip" onChange={handleFile} />
    </div>
  );
}
