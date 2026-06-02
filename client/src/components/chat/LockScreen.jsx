import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function LockScreen({ conversationId, name }) {
  const [pin, setPin] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const { unlockChat } = useChatStore();

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (pin.length < 4) { toast.error('Enter your PIN'); return; }
    setLoading(true);
    try {
      await api.post(`/conversations/${conversationId}/verify-pin`, { pin });
      unlockChat(conversationId);
    } catch {
      toast.error('Wrong PIN');
      setPin('');
    } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d14] px-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl bg-[#1a1a28] border border-[#2a2a3e] flex items-center justify-center mx-auto mb-5">
          <Lock size={36} className="text-violet-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
        <p className="text-sm text-[#555575]">This chat is protected with a PIN</p>
      </div>

      <form onSubmit={handleUnlock} className="w-full max-w-xs space-y-4">
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter PIN"
            inputMode="numeric"
            className="w-full bg-[#1a1a28] border border-[#2a2a3e] rounded-xl px-4 py-3.5 text-center text-2xl text-white tracking-[1rem] placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-violet-500/50 transition"
          />
          <button type="button" onClick={() => setShow(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555575]">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading || pin.length < 4}
          className="w-full py-3.5 rounded-xl text-white font-semibold disabled:opacity-50 transition"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}
        >
          {loading ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>

      <div className="flex items-center gap-2 mt-8 text-xs text-[#333355]">
        <Shield size={11} className="text-violet-600" /> PIN never leaves your device
      </div>
    </div>
  );
}
