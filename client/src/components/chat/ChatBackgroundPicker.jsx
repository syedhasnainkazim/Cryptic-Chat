import { X, Check } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

const BACKGROUNDS = [
  { id: 'default', label: 'Default', preview: null },
  { id: 'violet-haze', label: 'Violet Haze', preview: 'radial-gradient(ellipse at top left, #3b1f6a 0%, #0d0d14 60%)' },
  { id: 'midnight-ocean', label: 'Midnight Ocean', preview: 'radial-gradient(ellipse at bottom right, #0d2a4a 0%, #0d0d14 60%)' },
  { id: 'aurora', label: 'Aurora', preview: 'linear-gradient(135deg, #0d1a2a 0%, #1a0d2e 40%, #0d2218 100%)' },
  { id: 'cherry-night', label: 'Cherry Night', preview: 'radial-gradient(ellipse at top, #3a0d1a 0%, #0d0d14 60%)' },
  { id: 'cosmic', label: 'Cosmic', preview: 'linear-gradient(160deg, #0d0d14 0%, #1a1040 50%, #0d0d14 100%)' },
  { id: 'forest-dark', label: 'Dark Forest', preview: 'radial-gradient(ellipse at bottom left, #0d2a1a 0%, #0d0d14 60%)' },
  { id: 'ember', label: 'Ember', preview: 'radial-gradient(ellipse at top right, #3a1a0d 0%, #0d0d14 60%)' },
  { id: 'galaxy', label: 'Galaxy', preview: 'linear-gradient(135deg, #0d0d1f 0%, #1a0d3a 30%, #0d1a2a 70%, #0d0d1f 100%)' },
  { id: 'rose-dust', label: 'Rose Dust', preview: 'radial-gradient(ellipse at center, #2a0d1f 0%, #0d0d14 60%)' },
];

export function chatBgStyle(bgId) {
  const bg = BACKGROUNDS.find(b => b.id === bgId);
  if (!bg || !bg.preview) return {};
  return { background: bg.preview };
}

export default function ChatBackgroundPicker({ conversationId, current, onClose }) {
  const { setChatBackground } = useChatStore();

  const pick = (id) => {
    setChatBackground(conversationId, id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#10101a] border border-[#1e1e30] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e30]">
          <h2 className="font-semibold text-white text-sm">Chat Background</h2>
          <button onClick={onClose} className="text-[#555575] hover:text-white transition"><X size={18} /></button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-3">
          {BACKGROUNDS.map(bg => (
            <button
              key={bg.id}
              onClick={() => pick(bg.id)}
              className={`relative h-20 rounded-xl border-2 overflow-hidden transition ${current === bg.id ? 'border-violet-500' : 'border-[#2a2a3e] hover:border-violet-500/50'}`}
              style={bg.preview ? { background: bg.preview } : { background: '#0d0d14' }}
            >
              <span className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/70 font-medium">{bg.label}</span>
              {current === bg.id && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
