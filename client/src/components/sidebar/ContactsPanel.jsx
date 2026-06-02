import { useEffect, useState } from 'react';
import { useContactStore } from '../../store/contactStore';
import { useChatStore } from '../../store/chatStore';
import { Search, UserPlus, Check, X, UserMinus, UserCircle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import ContactProfileModal from './ContactProfileModal';
import toast from 'react-hot-toast';

export default function ContactsPanel({ onOpenConvo }) {
  const { contacts, pendingRequests, sentRequests, searchResults, searching, fetchContacts, search, sendRequest, acceptRequest, declineRequest, removeContact } = useContactStore();
  const { getOrCreateDM, setActiveConversation } = useChatStore();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('contacts');
  const [viewingProfile, setViewingProfile] = useState(null);

  useEffect(() => { fetchContacts(); }, []);
  useEffect(() => {
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleMessage = async (userId) => {
    const convo = await getOrCreateDM(userId);
    setActiveConversation(convo);
    onOpenConvo?.();
  };

  const handleSend = async (userId) => {
    try {
      await sendRequest(userId);
      toast.success('Request sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555570]" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-[#1a1a28] border border-[#2a2a3e] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#555570] focus:outline-none focus:border-violet-500/50 transition"
          />
        </div>
      </div>

      {q ? (
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          {searching && <p className="text-xs text-[#555570] text-center py-4">Searching...</p>}
          {!searching && searchResults.length === 0 && (
            <p className="text-xs text-[#555570] text-center py-4">No users found</p>
          )}
          {searchResults.map(u => {
            const isSent = sentRequests.some(r => r._id === u._id);
            const isContact = contacts.some(c => c._id === u._id);
            return (
              <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1e1e2e] group">
                <Avatar user={u} size={9} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.username}</p>
                  <p className="text-xs text-[#555570] truncate">{u.email}</p>
                </div>
                {isContact ? (
                  <button onClick={() => handleMessage(u._id)} className="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-3 py-1.5 rounded-lg transition">
                    Message
                  </button>
                ) : isSent ? (
                  <span className="text-xs text-[#555570] px-2">Sent</span>
                ) : (
                  <button onClick={() => handleSend(u._id)} className="text-[#555570] hover:text-violet-400 transition p-1.5 rounded-lg hover:bg-violet-600/10">
                    <UserPlus size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 px-3 mb-3">
            {[['contacts', `Contacts (${contacts.length})`], ['requests', `Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ''}`]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-xl text-xs font-medium transition ${tab === t ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30' : 'text-[#555570] hover:text-white hover:bg-[#1e1e2e]'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {tab === 'contacts' && (
              contacts.length === 0
                ? <p className="text-xs text-[#555570] text-center py-8">No contacts yet. Search to find people.</p>
                : contacts.map(c => (
                  <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1e1e2e] group">
                    <div className="relative">
                      <Avatar user={c} size={9} />
                      {c.isOnline && <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-[#13131e] rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.username}</p>
                      <p className="text-xs text-[#555570]">{c.isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setViewingProfile(c._id)} className="text-[#555570] hover:text-violet-400 transition p-1.5 rounded-lg hover:bg-violet-600/10" title="View profile">
                        <UserCircle size={13} />
                      </button>
                      <button onClick={() => handleMessage(c._id)} className="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition">
                        Chat
                      </button>
                      <button onClick={() => removeContact(c._id)} className="text-[#555570] hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-500/10">
                        <UserMinus size={13} />
                      </button>
                    </div>
                  </div>
                ))
            )}

            {tab === 'requests' && (
              pendingRequests.length === 0
                ? <p className="text-xs text-[#555570] text-center py-8">No pending requests</p>
                : pendingRequests.map(u => (
                  <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1a1a2a] border border-[#2a2a3e]">
                    <Avatar user={u} size={9} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.username}</p>
                      <p className="text-xs text-[#555570] truncate">{u.email}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => acceptRequest(u._id).then(() => toast.success('Contact added!'))} className="bg-violet-600 hover:bg-violet-500 text-white p-1.5 rounded-lg transition">
                        <Check size={13} />
                      </button>
                      <button onClick={() => declineRequest(u._id)} className="bg-[#2a2a3e] hover:bg-red-500/20 text-[#888] hover:text-red-400 p-1.5 rounded-lg transition">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </>
      )}

      {viewingProfile && (
        <ContactProfileModal
          userId={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onStartChat={() => { setViewingProfile(null); onOpenConvo?.(); }}
        />
      )}
    </div>
  );
}
