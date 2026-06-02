import { useState, useEffect } from 'react';
import { useContactStore } from '../../store/contactStore';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import {
  X, MessageSquare, UserMinus, Shield, ShieldOff, MapPin, Globe,
  Calendar, Phone, FileText, Tag, Edit3, Check, AlertTriangle, Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  'from-violet-500 to-indigo-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600', 'from-fuchsia-500 to-purple-600',
];

function Avatar({ user, size = 20 }) {
  const idx = user?.username?.charCodeAt(0) % AVATAR_COLORS.length || 0;
  const initials = (user?.displayName || user?.username || '?').slice(0, 2).toUpperCase();
  const dim = `w-${size} h-${size}`;
  if (user?.avatar) return <img src={user.avatar} alt="" className={`${dim} rounded-full object-cover ring-4 ring-violet-500/20`} />;
  return (
    <div className={`${dim} rounded-full bg-linear-to-br ${AVATAR_COLORS[idx]} flex items-center justify-center text-white font-bold text-2xl ring-4 ring-violet-500/10`}>
      {initials}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#1a1a28] last:border-0">
      <Icon size={14} className="text-[#555575] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#444460] uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-[#c0c0e0] break-words">{value}</p>
      </div>
    </div>
  );
}

function EditableField({ label, icon: Icon, value, onChange, placeholder, type = 'text', multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const commit = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(value || ''); setEditing(false); };

  if (!editing) return (
    <div
      className="flex items-start gap-3 py-2.5 border-b border-[#1a1a28] last:border-0 group cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <Icon size={14} className="text-[#555575] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#444460] uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-sm ${draft ? 'text-[#c0c0e0]' : 'text-[#3a3a52] italic'} break-words`}>
          {draft || placeholder}
        </p>
      </div>
      <Edit3 size={12} className="text-[#333355] group-hover:text-violet-400 transition shrink-0 mt-0.5" />
    </div>
  );

  return (
    <div className="py-2.5 border-b border-[#1a1a28] last:border-0">
      <p className="text-xs text-[#444460] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        <Icon size={11} /> {label}
      </p>
      {multiline
        ? <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={3} maxLength={300}
            className="w-full bg-[#0d0d18] border border-violet-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-none" />
        : <input type={type} value={draft} onChange={e => setDraft(e.target.value)} maxLength={100}
            className="w-full bg-[#0d0d18] border border-violet-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
      }
      <div className="flex gap-2 mt-2">
        <button onClick={commit} className="flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 px-3 py-1.5 rounded-lg transition">
          <Check size={11} /> Save
        </button>
        <button onClick={cancel} className="text-xs text-[#555575] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1e1e2e] transition">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ContactProfileModal({ userId, onClose, onStartChat, onDeleteChat, conversationId }) {
  const { user: me } = useAuthStore();
  const { contacts, blockUser, unblockUser, removeContact, saveContactInfo, getSavedInfo, isBlocked, fetchContacts } = useContactStore();
  const { getOrCreateDM, setActiveConversation, deleteConversation } = useChatStore();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // 'block'|'remove'|'delete'
  const [saved, setSaved] = useState({ nickname: '', phone: '', notes: '' });

  const isContact = contacts.some(c => c._id === userId);
  const blocked = isBlocked(userId);

  useEffect(() => {
    const info = getSavedInfo(userId);
    if (info) setSaved({ nickname: info.nickname || '', phone: info.phone || '', notes: info.notes || '' });
    api.get(`/contacts/${userId}/profile`)
      .then(r => setProfile(r.data.user))
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const updateSavedField = async (field, value) => {
    const next = { ...saved, [field]: value };
    setSaved(next);
    try { await saveContactInfo(userId, next); }
    catch { toast.error('Failed to save'); }
  };

  const handleMessage = async () => {
    const convo = await getOrCreateDM(userId);
    setActiveConversation(convo);
    onStartChat?.();
    onClose();
  };

  const handleBlock = async () => {
    try {
      await blockUser(userId);
      toast.success(`${profile?.username} blocked`);
      onClose();
    } catch { toast.error('Failed to block'); }
  };

  const handleUnblock = async () => {
    try {
      await unblockUser(userId);
      toast.success('User unblocked');
      setConfirmAction(null);
      await fetchContacts();
    } catch { toast.error('Failed to unblock'); }
  };

  const handleRemove = async () => {
    try {
      await removeContact(userId);
      toast.success('Contact removed');
      onClose();
    } catch { toast.error('Failed to remove'); }
  };

  const handleDeleteChat = async () => {
    if (!conversationId) return;
    try {
      await deleteConversation(conversationId);
      toast.success('Chat deleted');
      onClose();
    } catch { toast.error('Failed to delete chat'); }
  };

  const age = profile?.dob
    ? Math.floor((Date.now() - new Date(profile.dob)) / (365.25 * 24 * 3600 * 1000))
    : null;

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // Confirm dialog
  if (confirmAction) {
    const actions = {
      block: { title: 'Block user', desc: `${profile?.username} won't be able to message you. They'll be removed from your contacts.`, color: 'bg-red-600 hover:bg-red-500', label: 'Block', fn: handleBlock },
      remove: { title: 'Remove contact', desc: `Remove ${profile?.username} from your contacts? You can always add them back.`, color: 'bg-orange-600 hover:bg-orange-500', label: 'Remove', fn: handleRemove },
      delete: { title: 'Delete chat', desc: 'This will delete the entire chat history for you. This cannot be undone.', color: 'bg-red-600 hover:bg-red-500', label: 'Delete chat', fn: handleDeleteChat },
    };
    const a = actions[confirmAction];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-sm p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
            <h3 className="font-semibold text-white">{a.title}</h3>
          </div>
          <p className="text-sm text-[#7070a0] mb-6">{a.desc}</p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 rounded-xl border border-[#252538] text-[#7070a0] hover:text-white text-sm transition">Cancel</button>
            <button onClick={a.fn} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${a.color}`}>{a.label}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30] shrink-0">
          <h2 className="font-semibold text-white">Profile</h2>
          <button onClick={onClose} className="text-[#555575] hover:text-white p-1 rounded-lg hover:bg-[#1e1e2e] transition"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Hero */}
          <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center border-b border-[#1a1a28]">
            <Avatar user={profile} size={20} />
            <h3 className="text-xl font-bold text-white mt-4">
              {saved.nickname || profile?.displayName || profile?.username}
            </h3>
            {saved.nickname && (
              <p className="text-sm text-[#555575] mt-0.5">@{profile?.username}</p>
            )}
            {profile?.pronouns && <p className="text-xs text-[#555575] mt-1">{profile.pronouns}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2 h-2 rounded-full ${profile?.isOnline ? 'bg-green-400' : 'bg-[#333355]'}`} />
              <span className="text-xs text-[#666688]">{profile?.isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {profile?.bio && <p className="text-sm text-[#9090b0] mt-3 max-w-xs leading-relaxed">{profile.bio}</p>}

            {/* Action buttons */}
            {!blocked && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleMessage} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition shadow-lg shadow-violet-900/30">
                  <MessageSquare size={14} /> Message
                </button>
              </div>
            )}
          </div>

          {/* Public profile info */}
          <div className="px-5 py-3 border-b border-[#1a1a28]">
            <p className="text-xs text-[#444460] uppercase tracking-widest mb-1 font-medium">About</p>
            <InfoRow icon={MapPin} label="Location" value={profile?.location} />
            <InfoRow icon={Globe} label="Website" value={profile?.website} />
            <InfoRow icon={Calendar} label="Age" value={age ? `${age} years old` : null} />
            <InfoRow icon={Calendar} label="Member since" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null} />
          </div>

          {/* Saved contact info (editable, only you see this) */}
          {isContact && (
            <div className="px-5 py-3 border-b border-[#1a1a28]">
              <p className="text-xs text-[#444460] uppercase tracking-widest mb-2 font-medium flex items-center gap-1.5">
                <Edit3 size={10} /> Your saved info <span className="text-[#2a2a42] font-normal normal-case tracking-normal">(only visible to you)</span>
              </p>
              <EditableField label="Nickname" icon={Tag} value={saved.nickname} onChange={v => updateSavedField('nickname', v)} placeholder="Add a nickname..." />
              <EditableField label="Phone number" icon={Phone} value={saved.phone} onChange={v => updateSavedField('phone', v)} placeholder="Add a phone number..." type="tel" />
              <EditableField label="Notes" icon={FileText} value={saved.notes} onChange={v => updateSavedField('notes', v)} placeholder="Add private notes..." multiline />
            </div>
          )}

          {/* Danger zone */}
          <div className="px-5 py-3 space-y-1">
            {conversationId && (
              <button onClick={() => setConfirmAction('delete')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2e] text-left group transition">
                <Trash2 size={15} className="text-[#555575] group-hover:text-red-400 transition shrink-0" />
                <span className="text-sm text-[#7070a0] group-hover:text-red-400 transition">Delete chat</span>
              </button>
            )}
            {isContact && (
              <button onClick={() => setConfirmAction('remove')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2e] text-left group transition">
                <UserMinus size={15} className="text-[#555575] group-hover:text-orange-400 transition shrink-0" />
                <span className="text-sm text-[#7070a0] group-hover:text-orange-400 transition">Remove contact</span>
              </button>
            )}
            {!blocked ? (
              <button onClick={() => setConfirmAction('block')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2e] text-left group transition">
                <Shield size={15} className="text-[#555575] group-hover:text-red-400 transition shrink-0" />
                <span className="text-sm text-[#7070a0] group-hover:text-red-400 transition">Block {profile?.username}</span>
              </button>
            ) : (
              <button onClick={handleUnblock} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#1e1e2e] text-left group transition">
                <ShieldOff size={15} className="text-violet-400 shrink-0" />
                <span className="text-sm text-violet-400">Unblock {profile?.username}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
