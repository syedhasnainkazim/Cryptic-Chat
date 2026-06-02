import { useState } from 'react';
import { Pin, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export default function PinnedBanner({ pinnedMessages, conversationId }) {
  const [idx, setIdx] = useState(0);
  const { pinMessage } = useChatStore();
  if (!pinnedMessages?.length) return null;

  const pinned = pinnedMessages[idx];
  const text = pinned?.decryptedText || '📎 Pinned message';

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#13131e] border-b border-[#1e1e2e]">
      <Pin size={13} className="text-violet-400 shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {/* scroll to message */}}>
        <p className="text-xs text-[#7070a0]">Pinned by {pinned?.sender?.username}</p>
        <p className="text-sm text-[#c0c0e0] truncate">{text}</p>
      </div>
      {pinnedMessages.length > 1 && (
        <div className="flex flex-col gap-0.5">
          <button onClick={() => setIdx(i => (i - 1 + pinnedMessages.length) % pinnedMessages.length)} className="text-[#555575] hover:text-white transition">
            <ChevronUp size={12} />
          </button>
          <span className="text-[10px] text-[#444460] text-center">{idx + 1}/{pinnedMessages.length}</span>
          <button onClick={() => setIdx(i => (i + 1) % pinnedMessages.length)} className="text-[#555575] hover:text-white transition">
            <ChevronDown size={12} />
          </button>
        </div>
      )}
      <button onClick={() => pinMessage(pinned._id, conversationId, false)} className="text-[#555575] hover:text-red-400 transition shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
