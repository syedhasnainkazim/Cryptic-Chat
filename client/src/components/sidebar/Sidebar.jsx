import { useState } from 'react';
import { MessageSquare, Users, LogOut, Plus, Shield, Search, X, Sun, Moon, Ghost } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useContactStore } from '../../store/contactStore';
import { useThemeStore } from '../../store/themeStore';
import Avatar from '../ui/Avatar';
import ConversationItem from './ConversationItem';
import ContactsPanel from './ContactsPanel';
import NewGroupModal from './NewGroupModal';
import ProfileModal from './ProfileModal';
import toast from 'react-hot-toast';

const NAV = [
  { id: 'chats', icon: MessageSquare, label: 'Chats' },
  { id: 'contacts', icon: Users, label: 'Contacts' },
];

export default function Sidebar() {
  const [tab, setTab] = useState('chats');
  const [showGroup, setShowGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const { conversations, activeConversation, setActiveConversation, getUnreadCount, phantomMode, togglePhantomMode } = useChatStore();
  const { user, logout } = useAuthStore();
  const pendingRequests = useContactStore(s => s.pendingRequests);
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    logout();
    toast.success('Signed out');
  };

  const handlePhantomToggle = () => {
    togglePhantomMode();
    toast(phantomMode ? '👻 Crypt Silence OFF — you\'re back among the living' : '👻 Crypt Silence ON — ghosts don\'t read notifications', { icon: phantomMode ? '🔔' : '🔕' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + getUnreadCount(c._id), 0);

  const filteredConvos = searchQ.trim()
    ? conversations.filter(c => {
        const name = c.isGroup
          ? (c.name || '')
          : (c.participants?.find(p => p._id !== user?._id)?.username || '');
        return name.toLowerCase().includes(searchQ.toLowerCase());
      })
    : conversations;

  return (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="w-14 flex flex-col items-center py-4 gap-2 border-r border-[#1e1e2e] bg-[#0d0d14] shrink-0">
        <div className="mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Shield size={16} className="text-white" />
          </div>
        </div>

        {NAV.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${tab === id ? 'bg-violet-600/20 text-violet-400' : 'text-[#555570] hover:text-white hover:bg-[#1e1e2e]'}`}
          >
            <Icon size={18} />
            {id === 'chats' && totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-violet-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            {id === 'contacts' && pendingRequests.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}

        <div className="mt-auto flex flex-col items-center gap-2">
          <button onClick={() => setShowGroup(true)} title="New Group" className="w-10 h-10 rounded-xl text-[#555570] hover:text-violet-400 hover:bg-violet-600/10 flex items-center justify-center transition">
            <Plus size={18} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-10 h-10 rounded-xl text-[#555570] hover:text-amber-400 hover:bg-amber-400/10 flex items-center justify-center transition"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Crypt Silence (DND) */}
          <button
            onClick={handlePhantomToggle}
            title={phantomMode ? 'Crypt Silence ON — click to disable' : 'Enable Crypt Silence (DND)'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${phantomMode ? 'text-violet-400 bg-violet-600/20' : 'text-[#555570] hover:text-violet-400 hover:bg-violet-600/10'}`}
          >
            <Ghost size={16} />
          </button>

          <button onClick={() => setShowProfile(true)} title="Profile" className="w-10 h-10 rounded-xl hover:bg-[#1e1e2e] flex items-center justify-center transition">
            <Avatar user={user} size={7} />
          </button>
          <button onClick={handleLogout} title="Logout" className="w-10 h-10 rounded-xl text-[#555570] hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f1a]">
        <div className="px-3 pt-4 pb-3 border-b border-[#1e1e2e]">
          <h2 className="text-sm font-semibold text-white mb-3">
            {tab === 'chats' ? 'Messages' : 'Contacts'}
          </h2>
          {tab === 'chats' && (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555570]" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-[#1a1a28] border border-[#2a2a3e] rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-[#555570] focus:outline-none focus:border-violet-500/50 transition"
              />
              {searchQ && (
                <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555570] hover:text-white transition">
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {tab === 'chats' && (
            <div className="px-2 space-y-0.5">
              {filteredConvos.length === 0 && (
                <p className="text-xs text-[#555570] text-center py-10 px-4">
                  {searchQ ? `No results for "${searchQ}"` : 'No conversations yet. Find contacts to start chatting.'}
                </p>
              )}
              {filteredConvos.map(c => (
                <ConversationItem
                  key={c._id}
                  convo={c}
                  active={activeConversation?._id === c._id}
                  onClick={() => setActiveConversation(c)}
                />
              ))}
            </div>
          )}
          {tab === 'contacts' && (
            <ContactsPanel onOpenConvo={() => setTab('chats')} />
          )}
        </div>
      </div>

      {showGroup && (
        <NewGroupModal
          onClose={() => setShowGroup(false)}
          onCreated={(c) => setActiveConversation(c)}
        />
      )}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}
