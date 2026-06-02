import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../ui/Avatar';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { MoreVertical, Trash2, UserCircle, Lock, Timer } from 'lucide-react';
import ContactProfileModal from './ContactProfileModal';

export default function ConversationItem({ convo, active, onClick }) {
  const user = useAuthStore(s => s.user);
  const onlineUsers = useChatStore(s => s.onlineUsers);
  const deleteConversation = useChatStore(s => s.deleteConversation);
  const [showMenu, setShowMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef(null);

  const other = !convo.isGroup ? convo.participants?.find(p => p._id !== user?._id) : null;
  const isOnline = other ? onlineUsers.has(other._id) || other.isOnline : false;
  const name = convo.isGroup ? convo.name : other?.username || 'Unknown';
  const avatarUser = convo.isGroup ? { username: convo.name } : other;
  const lastMsg = convo.lastMessage;
  const preview = convo.isLocked ? '🔒 Locked' : (lastMsg?.decryptedText || (lastMsg ? '🔐 encrypted' : 'No messages yet'));
  const time = convo.updatedAt ? formatDistanceToNow(new Date(convo.updatedAt), { addSuffix: false }) : '';
  const unread = useChatStore.getState().getUnreadCount(convo._id);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handle = (e) => { if (!menuRef.current?.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showMenu]);

  return (
    <>
      <div
        className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 group ${
          active ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-[#1e1e2e] border border-transparent'
        }`}
      >
        {/* Main click area */}
        <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={onClick}>
          <div className="relative shrink-0">
            <Avatar user={avatarUser} size={10} />
            {!convo.isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#13131e] rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-sm text-white truncate">{name}</span>
                {convo.isLocked && <Lock size={10} className="text-violet-400 shrink-0" />}
                {convo.disappearingTimer > 0 && <Timer size={10} className="text-orange-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {time && <span className="text-[10px] text-[#555570]">{time}</span>}
                {unread > 0 && (
                  <span className="min-w-4.5 h-4.5 bg-violet-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
            </div>
            <p className={`text-xs truncate mt-0.5 ${unread > 0 ? 'text-[#9090b0]' : 'text-[#555575]'}`}>
              {String(preview).length > 45 ? String(preview).slice(0, 45) + '…' : String(preview)}
            </p>
          </div>
        </button>

        {/* ⋮ kebab */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="opacity-0 group-hover:opacity-100 text-[#555570] hover:text-white p-1 rounded-lg hover:bg-[#2a2a3e] transition"
          >
            <MoreVertical size={14} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-7 z-40 w-44 bg-[#13131e] border border-[#2a2a3e] rounded-xl shadow-2xl py-1 overflow-hidden">
              {!convo.isGroup && other && (
                <button
                  onClick={() => { setShowMenu(false); setShowProfile(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#c0c0e0] hover:bg-[#1e1e2e] transition text-left"
                >
                  <UserCircle size={14} className="text-[#555570]" /> View profile
                </button>
              )}
              <button
                onClick={async () => { setShowMenu(false); await deleteConversation(convo._id); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition text-left"
              >
                <Trash2 size={14} /> Delete chat
              </button>
            </div>
          )}
        </div>
      </div>

      {showProfile && other && (
        <ContactProfileModal
          userId={other._id}
          conversationId={convo._id}
          onClose={() => setShowProfile(false)}
          onStartChat={() => setShowProfile(false)}
        />
      )}
    </>
  );
}
