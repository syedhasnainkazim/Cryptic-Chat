import { useState } from 'react';
import { X, Timer, Lock, LockOpen, Eye, EyeOff } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const DISAPPEARING_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30 seconds', value: 30 },
  { label: '5 minutes', value: 300 },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
];

export default function ChatSettingsMenu({ type, conversation, onClose }) {
  const { setDisappearing, handleConversationUpdated } = useChatStore();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDisappearing = async (seconds) => {
    await setDisappearing(conversation._id, seconds);
    toast.success(seconds ? `Messages disappear after ${DISAPPEARING_OPTIONS.find(o => o.value === seconds)?.label}` : 'Disappearing messages off');
    onClose();
  };

  const handleLock = async () => {
    if (!pin || pin.length < 4) { toast.error('PIN must be 4+ digits'); return; }
    setLoading(true);
    try {
      const { data } = await api.put(`/conversations/${conversation._id}/lock`, { pin });
      handleConversationUpdated({ ...conversation, isLocked: data.isLocked });
      toast.success('Chat locked with PIN');
      onClose();
    } catch { toast.error('Failed to lock chat'); } finally { setLoading(false); }
  };

  const handleUnlock = async () => {
    if (!pin || pin.length < 4) { toast.error('Enter your PIN'); return; }
    setLoading(true);
    try {
      const { data } = await api.put(`/conversations/${conversation._id}/lock`, { pin, unlock: true });
      handleConversationUpdated({ ...conversation, isLocked: false });
      toast.success('Chat unlocked');
      onClose();
    } catch { toast.error('Wrong PIN'); setPin(''); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30]">
          <div className="flex items-center gap-2">
            {type === 'disappearing' ? <Timer size={16} className="text-orange-400" /> : <Lock size={16} className="text-violet-400" />}
            <h2 className="font-semibold text-white">{type === 'disappearing' ? 'Disappearing Messages' : conversation.isLocked ? 'Manage Lock' : 'Lock Chat'}</h2>
          </div>
          <button onClick={onClose} className="text-[#555575] hover:text-white transition"><X size={18} /></button>
        </div>

        <div className="p-5">
          {type === 'disappearing' && (
            <div className="space-y-1">
              <p className="text-xs text-[#555575] mb-3">New messages will auto-delete after the timer</p>
              {DISAPPEARING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleDisappearing(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition text-left ${conversation.disappearingTimer === opt.value ? 'bg-violet-600/20 border border-violet-500/30 text-violet-300' : 'hover:bg-[#1e1e2e] text-[#c0c0e0] border border-transparent'}`}
                >
                  <span className="text-sm">{opt.label}</span>
                  {conversation.disappearingTimer === opt.value && <span className="text-xs text-violet-400">Active</span>}
                </button>
              ))}
            </div>
          )}

          {type === 'lock' && (
            <div className="space-y-4">
              <p className="text-xs text-[#555575]">
                {conversation.isLocked ? 'Enter your PIN to remove the lock, or set a new one.' : 'Set a 4–6 digit PIN to protect this conversation.'}
              </p>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter PIN (4-6 digits)"
                  inputMode="numeric"
                  className="w-full bg-[#0d0d18] border border-[#252538] rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white focus:outline-none focus:border-violet-500/50 transition"
                />
                <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555575]">
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="flex gap-3">
                {conversation.isLocked && (
                  <button onClick={handleUnlock} disabled={loading} className="flex-1 py-3 rounded-xl border border-[#252538] text-[#7070a0] hover:text-white text-sm transition flex items-center justify-center gap-2 disabled:opacity-50">
                    <LockOpen size={14} /> Remove lock
                  </button>
                )}
                <button onClick={handleLock} disabled={loading} className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  {loading ? 'Saving…' : conversation.isLocked ? 'Change PIN' : 'Lock chat'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
