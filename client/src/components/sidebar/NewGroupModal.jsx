import { useState } from 'react';
import { useContactStore } from '../../store/contactStore';
import { useChatStore } from '../../store/chatStore';
import { X, Check, Users } from 'lucide-react';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

export default function NewGroupModal({ onClose, onCreated }) {
  const contacts = useContactStore(s => s.contacts);
  const createGroup = useChatStore(s => s.createGroup);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id]);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name required'); return; }
    if (selected.length < 1) { toast.error('Select at least 1 contact'); return; }
    setLoading(true);
    try {
      const convo = await createGroup(name.trim(), selected);
      toast.success('Group created!');
      onCreated?.(convo);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#13131e] border border-[#2a2a3e] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a3e]">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-violet-400" />
            <h2 className="font-semibold text-white">New Group</h2>
          </div>
          <button onClick={onClose} className="text-[#555570] hover:text-white transition"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Group name..."
            className="w-full bg-[#1a1a28] border border-[#2a2a3e] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555570] focus:outline-none focus:border-violet-500/50 transition"
          />

          <div>
            <p className="text-xs text-[#555570] uppercase tracking-wider mb-2">Select contacts</p>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {contacts.length === 0 && (
                <p className="text-xs text-[#555570] py-3 text-center">No contacts</p>
              )}
              {contacts.map(c => (
                <button key={c._id} onClick={() => toggle(c._id)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition ${selected.includes(c._id) ? 'bg-violet-600/20 border border-violet-500/30' : 'hover:bg-[#1e1e2e] border border-transparent'}`}>
                  <Avatar user={c} size={8} />
                  <span className="text-sm text-white flex-1 text-left">{c.username}</span>
                  {selected.includes(c._id) && <Check size={14} className="text-violet-400" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition"
          >
            {loading ? 'Creating...' : `Create Group${selected.length ? ` (${selected.length + 1})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
