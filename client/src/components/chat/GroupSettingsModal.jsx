import { useState } from 'react';
import { X, UserPlus, UserMinus, Crown, Camera, Users } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useContactStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function GroupSettingsModal({ conversation, onClose }) {
  const { user } = useAuthStore();
  const { handleConversationUpdated } = useChatStore();
  const { contacts } = useContactStore();
  const [name, setName] = useState(conversation.name || '');
  const [description, setDescription] = useState(conversation.description || '');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('info'); // 'info' | 'members'

  const isAdmin = conversation.admins?.some(a => (a._id || a) === user?._id || (a._id || a)?.toString() === user?._id);
  const nonMembers = contacts.filter(c => !conversation.participants?.some(p => (p._id || p) === c._id));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await api.put(`/conversations/${conversation._id}/group`, { name, description });
      handleConversationUpdated(data.conversation);
      toast.success('Group updated');
      onClose();
    } catch { toast.error('Failed to update'); } finally { setLoading(false); }
  };

  const addMember = async (userId) => {
    try {
      const { data } = await api.post(`/conversations/${conversation._id}/members`, { userId });
      handleConversationUpdated(data.conversation);
      toast.success('Member added');
    } catch { toast.error('Failed to add member'); }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/conversations/${conversation._id}/members/${userId}`);
      handleConversationUpdated({
        ...conversation,
        participants: conversation.participants.filter(p => (p._id || p) !== userId),
      });
      toast.success('Member removed');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-indigo-400" />
            <h2 className="font-semibold text-white">Group Settings</h2>
          </div>
          <button onClick={onClose} className="text-[#555575] hover:text-white transition"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1e1e30]">
          {['info', 'members'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-sm font-medium capitalize transition ${tab === t ? 'text-violet-400 border-b-2 border-violet-500' : 'text-[#555575] hover:text-white'}`}>
              {t} {t === 'members' && `(${conversation.participants?.length || 0})`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 mb-2">
                <div className="relative">
                  <Avatar user={{ username: conversation.name }} size={16} />
                </div>
                <div className="text-center">
                  <p className="text-xs text-[#555575]">Created {conversation.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : ''}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#7070a0] uppercase tracking-widest mb-2">Group name</label>
                <input value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} className="w-full bg-[#0d0d18] border border-[#252538] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs text-[#7070a0] uppercase tracking-widest mb-2">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={!isAdmin} rows={3} maxLength={200} className="w-full bg-[#0d0d18] border border-[#252538] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 transition resize-none disabled:opacity-50" placeholder="Group description…" />
              </div>
              {isAdmin && (
                <button onClick={handleSave} disabled={loading} className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-2">
              {/* Current members */}
              {conversation.participants?.map(p => {
                const pid = p._id || p;
                const isParticipantAdmin = conversation.admins?.some(a => (a._id || a) === pid || (a._id || a)?.toString() === pid?.toString());
                const isSelf = pid === user?._id || pid?.toString() === user?._id;
                return (
                  <div key={pid} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1a1a28] group">
                    <Avatar user={p} size={9} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-white font-medium truncate">{p.username || 'Unknown'}</span>
                        {isParticipantAdmin && <Crown size={11} className="text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-xs text-[#555575]">{isSelf ? 'You' : p.isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                    {isAdmin && !isSelf && (
                      <button onClick={() => removeMember(pid)} className="opacity-0 group-hover:opacity-100 text-[#555575] hover:text-red-400 transition p-1.5 rounded-lg hover:bg-red-500/10">
                        <UserMinus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add members */}
              {isAdmin && nonMembers.length > 0 && (
                <>
                  <div className="h-px bg-[#1e1e30] my-3" />
                  <p className="text-xs text-[#444460] uppercase tracking-widest mb-2">Add contacts</p>
                  {nonMembers.map(c => (
                    <div key={c._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1a1a28] group">
                      <Avatar user={c} size={9} />
                      <span className="text-sm text-white flex-1">{c.username}</span>
                      <button onClick={() => addMember(c._id)} className="text-[#555575] hover:text-violet-400 transition p-1.5 rounded-lg hover:bg-violet-600/10">
                        <UserPlus size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
