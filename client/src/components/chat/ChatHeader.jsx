import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Shield, Users, ChevronLeft, MoreVertical, Trash2, UserCircle, Search, Lock, Timer, Settings, ImageIcon } from 'lucide-react';
import Avatar from '../ui/Avatar';
import ContactProfileModal from '../sidebar/ContactProfileModal';
import GroupSettingsModal from './GroupSettingsModal';
import ChatSettingsMenu from './ChatSettingsMenu';
import ChatBackgroundPicker from './ChatBackgroundPicker';

export default function ChatHeader({ convo, onBack, onSearch }) {
  const user = useAuthStore(s => s.user);
  const onlineUsers = useChatStore(s => s.onlineUsers);
  const deleteConversation = useChatStore(s => s.deleteConversation);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const chatBackgrounds = useChatStore(s => s.chatBackgrounds);

  const other = !convo.isGroup ? convo.participants?.find(p => p._id !== user?._id) : null;
  const isOnline = other ? onlineUsers.has(other._id) || other.isOnline : false;
  const name = convo.isGroup ? convo.name : other?.username || 'Unknown';
  const avatarUser = convo.isGroup ? { username: convo.name } : other;

  const subtitle = convo.isGroup
    ? `${convo.participants?.length || 0} members`
    : isOnline ? 'Online'
    : other?.lastSeen ? `Last seen ${new Date(other.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline';

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e1e2e] bg-[#0f0f1a] relative z-10">
        <button onClick={onBack} className="sm:hidden mr-1 text-[#555570] hover:text-white transition">
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => convo.isGroup ? setShowGroupSettings(true) : setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition"
        >
          <div className="relative shrink-0">
            <Avatar user={avatarUser} size={10} />
            {!convo.isGroup && isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0f0f1a] rounded-full" />}
            {convo.isGroup && <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center"><Users size={9} className="text-white" /></span>}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white text-sm truncate">{name}</p>
              {convo.isLocked && <Lock size={11} className="text-violet-400 shrink-0" />}
              {convo.disappearingTimer > 0 && <Timer size={11} className="text-orange-400 shrink-0" />}
            </div>
            <p className={`text-xs ${isOnline && !convo.isGroup ? 'text-green-400' : 'text-[#555570]'}`}>{subtitle}</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#1a1a28] rounded-lg px-2 py-1.5 mr-1">
            <Shield size={11} className="text-violet-400 shrink-0" />
            <span className="text-[10px] text-[#555570] font-medium">E2E</span>
          </div>

          <button onClick={onSearch} className="text-[#555570] hover:text-white p-1.5 rounded-lg hover:bg-[#1e1e2e] transition" title="Search">
            <Search size={16} />
          </button>

          <div className="relative">
            <button onClick={() => setShowMenu(v => !v)} className="text-[#555570] hover:text-white p-1.5 rounded-lg hover:bg-[#1e1e2e] transition">
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-9 z-30 w-52 bg-[#13131e] border border-[#2a2a3e] rounded-xl shadow-2xl py-1">
                  {!convo.isGroup && <MenuItem icon={UserCircle} label="View profile" onClick={() => { setShowMenu(false); setShowProfile(true); }} />}
                  {convo.isGroup && <MenuItem icon={Settings} label="Group settings" onClick={() => { setShowMenu(false); setShowGroupSettings(true); }} />}
                  <MenuItem icon={Search} label="Search messages" onClick={() => { setShowMenu(false); onSearch?.(); }} />
                  <MenuItem icon={ImageIcon} label="Chat background" onClick={() => { setShowMenu(false); setShowBgPicker(true); }} />
                  <MenuItem icon={Timer} label="Disappearing messages" onClick={() => { setShowMenu(false); setShowSettings('disappearing'); }} />
                  <MenuItem icon={Lock} label={convo.isLocked ? 'Manage PIN lock' : 'Lock chat'} onClick={() => { setShowMenu(false); setShowSettings('lock'); }} />
                  <div className="h-px bg-[#1e1e2e] my-1" />
                  <MenuItem icon={Trash2} label="Delete chat" onClick={async () => { setShowMenu(false); await deleteConversation(convo._id); onBack?.(); }} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showProfile && other && (
        <ContactProfileModal userId={other._id} conversationId={convo._id} onClose={() => setShowProfile(false)} onStartChat={() => setShowProfile(false)} />
      )}
      {showGroupSettings && (
        <GroupSettingsModal conversation={convo} onClose={() => setShowGroupSettings(false)} />
      )}
      {showSettings && (
        <ChatSettingsMenu type={showSettings} conversation={convo} onClose={() => setShowSettings(false)} />
      )}
      {showBgPicker && (
        <ChatBackgroundPicker
          conversationId={convo._id}
          current={chatBackgrounds[convo._id] || 'default'}
          onClose={() => setShowBgPicker(false)}
        />
      )}
    </>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-[#c0c0e0] hover:bg-[#1e1e2e]'}`}>
      <Icon size={14} className={danger ? 'text-red-400' : 'text-[#555575]'} /> {label}
    </button>
  );
}
