import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCheck, Check, Pencil, Trash2, Pin, Reply, Copy, Clock, SmilePlus, CornerUpLeft } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

function ReactionPill({ emoji, count, isMe, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${isMe ? 'bg-violet-600/30 border-violet-500/50' : 'bg-[#1e1e2e] border-[#2a2a3e] hover:border-violet-500/30'}`}
    >
      <span>{emoji}</span>
      {count > 1 && <span className="text-[#9090b0]">{count}</span>}
    </button>
  );
}

export default function MessageBubble({ msg, isMe, showAvatar, prevSameSender, conversationId }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.decryptedText || '');
  const [expiryPct, setExpiryPct] = useState(100);
  const menuRef = useRef(null);
  const { reactToMessage, editMessage, deleteMessage, pinMessage, setReplyingTo } = useChatStore();
  const { user } = useAuthStore();

  const time = msg.createdAt ? format(new Date(msg.createdAt), 'HH:mm') : '';
  const text = msg.decryptedText || '';

  // Disappearing message countdown
  useEffect(() => {
    if (!msg.expiresAt) return;
    const total = new Date(msg.expiresAt) - new Date(msg.createdAt);
    const tick = () => {
      const remaining = new Date(msg.expiresAt) - Date.now();
      setExpiryPct(Math.max(0, (remaining / total) * 100));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [msg.expiresAt]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu && !showEmojiPicker) return;
    const handle = (e) => {
      if (!menuRef.current?.contains(e.target)) { setShowMenu(false); setShowEmojiPicker(false); }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMenu, showEmojiPicker]);

  // Group reactions by emoji
  const reactionMap = {};
  (msg.reactions || []).forEach(r => {
    if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, isMine: false };
    reactionMap[r.emoji].count++;
    if (r.userId === user?._id || r.userId?.toString() === user?._id) reactionMap[r.emoji].isMine = true;
  });

  const handleReact = (emoji) => {
    reactToMessage(msg._id, emoji, conversationId);
    setShowEmojiPicker(false);
    setShowMenu(false);
  };

  const handleEdit = () => {
    if (!editText.trim() || editText === msg.decryptedText) { setEditing(false); return; }
    editMessage(msg._id, editText, conversationId);
    setEditing(false);
  };

  const handleDelete = () => {
    deleteMessage(msg._id, conversationId);
    setShowMenu(false);
  };

  const handlePin = () => {
    pinMessage(msg._id, conversationId, true);
    setShowMenu(false);
    toast.success('Message pinned');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
    setShowMenu(false);
  };

  const handleReply = () => {
    setReplyingTo(msg);
    setShowMenu(false);
  };

  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-[#555570] bg-[#1a1a28] px-3 py-1 rounded-full">{text}</span>
      </div>
    );
  }

  if (msg.deletedForEveryone) {
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${prevSameSender ? 'mt-0.5' : 'mt-3'}`}>
        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#2a2a3e] text-[#555570] text-xs italic ${isMe ? 'mr-9' : 'ml-9'}`}>
          <Trash2 size={11} /> Message deleted
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${prevSameSender ? 'mt-0.5' : 'mt-3'} group`}>
      {/* Avatar spacer */}
      {!isMe && <div className="w-7 shrink-0">{showAvatar && <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">{msg.sender?.username?.slice(0,2).toUpperCase()}</div>}</div>}

      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[70%]`} ref={menuRef}>
        {!isMe && showAvatar && <span className="text-xs text-[#555570] ml-1 mb-1">{msg.sender?.username}</span>}

        {/* Reply preview */}
        {msg.replyTo && (
          <div className={`flex items-start gap-2 mb-1 px-3 py-1.5 rounded-lg border-l-2 border-violet-400 bg-[#1a1a28]/80 text-xs max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
            <CornerUpLeft size={10} className="text-violet-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span className="text-violet-400 font-medium">{msg.replyTo.senderUsername}</span>
              <p className="text-[#7070a0] truncate">{msg.replySnippet || msg.replyTo.snippet || '...'}</p>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div className="relative">
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="bg-[#1a1a28] border border-violet-500/50 rounded-xl px-3 py-2 text-sm text-white focus:outline-none resize-none w-64"
                rows={2}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditing(false); }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-[#555570] hover:text-white px-2 py-1 rounded-lg transition">Cancel</button>
                <button onClick={handleEdit} className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-lg transition">Save</button>
              </div>
            </div>
          ) : (
            <>
              {/* Image or GIF type */}
              {(msg.type === 'image' || msg.type === 'gif') && msg.fileUrl ? (
                <div className={`rounded-2xl overflow-hidden cursor-pointer ${isMe ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                  <img src={msg.fileUrl} alt={msg.type === 'gif' ? 'GIF' : (msg.fileName || 'image')} className="max-w-xs max-h-64 object-cover" onClick={() => window.open(msg.fileUrl)} />
                  {msg.type === 'gif' && <span className="absolute bottom-1.5 left-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded font-bold">GIF</span>}
                </div>
              ) : msg.type === 'file' && msg.fileUrl ? (
                <a href={msg.fileUrl} download={msg.fileName} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm ${isMe ? 'msg-bubble-me text-white' : 'msg-bubble-them text-[#e2e2f0]'}`}>
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0">📄</div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{msg.fileName}</p>
                    <p className="text-xs opacity-60">{msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : 'File'}</p>
                  </div>
                </a>
              ) : (
                <div
                  className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed wrap-break-word shadow-sm fade-in-up cursor-default ${isMe ? 'msg-bubble-me text-white rounded-br-md' : 'msg-bubble-them text-[#e2e2f0] rounded-bl-md'} ${msg.pending ? 'opacity-60' : ''}`}
                  onContextMenu={e => { e.preventDefault(); setShowMenu(true); }}
                >
                  {text}
                  {/* Expiry bar */}
                  {msg.expiresAt && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#2a2a3e] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 transition-all duration-1000" style={{ width: `${expiryPct}%` }} />
                    </div>
                  )}
                </div>
              )}

              {/* Hover actions */}
              <div className={`absolute top-0 ${isMe ? 'right-full mr-1' : 'left-full ml-1'} flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
                {QUICK_EMOJIS.slice(0,3).map(e => (
                  <button key={e} onClick={() => handleReact(e)} className="text-sm hover:scale-125 transition-transform">{e}</button>
                ))}
                <button onClick={() => setShowMenu(v => !v)} className="w-6 h-6 rounded-full bg-[#1e1e2e] hover:bg-[#2a2a3e] flex items-center justify-center text-[#7070a0] hover:text-white transition">
                  <SmilePlus size={12} />
                </button>
              </div>
            </>
          )}

          {/* Context menu */}
          {showMenu && !editing && (
            <div className={`absolute top-0 ${isMe ? 'right-full mr-8' : 'left-full ml-2'} z-50 w-44 bg-[#13131e] border border-[#2a2a3e] rounded-xl shadow-2xl py-1 overflow-hidden`}>
              {/* Quick emoji row */}
              <div className="flex items-center justify-around px-2 py-2 border-b border-[#1e1e2e]">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => handleReact(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>
                ))}
              </div>
              <MenuItem icon={Reply} label="Reply" onClick={handleReply} />
              <MenuItem icon={Copy} label="Copy text" onClick={handleCopy} />
              <MenuItem icon={Pin} label="Pin message" onClick={handlePin} />
              {isMe && <MenuItem icon={Pencil} label="Edit" onClick={() => { setEditing(true); setShowMenu(false); }} />}
              {isMe && <MenuItem icon={Trash2} label="Delete for all" onClick={handleDelete} danger />}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(reactionMap).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {Object.entries(reactionMap).map(([emoji, { count, isMine }]) => (
              <ReactionPill key={emoji} emoji={emoji} count={count} isMe={isMine} onClick={() => handleReact(emoji)} />
            ))}
          </div>
        )}

        {/* Time + status */}
        <div className={`flex items-center gap-1 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          {msg.expiresAt && <Clock size={10} className="text-orange-400" />}
          <span className="text-[10px] text-[#444460]">{time}</span>
          {msg.isEdited && <span className="text-[10px] text-[#444460]">· edited</span>}
          {isMe && (msg.readBy?.length > 1 ? <CheckCheck size={12} className="text-violet-400" /> : <Check size={12} className="text-[#444460]" />)}
        </div>
      </div>

      {isMe && <div className="w-7 shrink-0" />}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-[#c0c0e0] hover:bg-[#1e1e2e]'}`}>
      <Icon size={13} className={danger ? 'text-red-400' : 'text-[#555575]'} /> {label}
    </button>
  );
}
