import { useEffect, useRef, useState, Fragment } from 'react';
import { format } from 'date-fns';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import PinnedBanner from './PinnedBanner';
import SearchOverlay from './SearchOverlay';
import LockScreen from './LockScreen';
import { Shield, MessageSquare, ChevronsUp } from 'lucide-react';
import { chatBgStyle } from './ChatBackgroundPicker';

function formatDateLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return format(d, 'EEEE, MMMM d');
}

function isSameDay(d1, d2) {
  return new Date(d1).toDateString() === new Date(d2).toDateString();
}

export default function ChatWindow({ onBack }) {
  const user = useAuthStore(s => s.user);
  const { activeConversation, messages, typingUsers, loadingMessages, loadingMore, hasMore, unlockedChats, fetchMessages, chatBackgrounds } = useChatStore();
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const convo = activeConversation;
  const msgs = convo ? (messages[convo._id] || []) : [];
  const typing = convo ? (typingUsers[convo._id] || []) : [];
  const typingNames = typing.map(uid => convo?.participants?.find(p => p._id === uid)?.username || 'Someone');

  const isLocked = convo?.isLocked && !unlockedChats.has(convo?._id);

  // Decrypt pinned messages
  const { _decryptMsg } = useChatStore.getState();
  const pinnedMsgs = (convo?.pinnedMessages || []).map(pm => {
    if (pm.decryptedText !== undefined) return pm;
    return _decryptMsg ? _decryptMsg(pm, convo) : pm;
  });

  // Scroll to bottom on new messages; maintain position when loading older ones
  useEffect(() => {
    if (loadingMoreRef.current) {
      const el = scrollRef.current;
      if (el && prevScrollHeightRef.current) {
        el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
        prevScrollHeightRef.current = 0;
      }
      loadingMoreRef.current = false;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [typing.length]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop < 60 && hasMore?.[convo?._id] && !loadingMore && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      prevScrollHeightRef.current = el.scrollHeight;
      fetchMessages(convo._id, msgs[0]?._id);
    }
  };

  if (!convo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0d0d14]">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1a1a28] flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={36} className="text-[#2a2a3e]" />
          </div>
          <h3 className="text-white font-semibold mb-2">Select a conversation</h3>
          <p className="text-sm text-[#555570] max-w-xs">Choose from your contacts or existing chats to start messaging</p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-[#444460]">
            <Shield size={12} className="text-violet-400" />
            <span>All messages encrypted end-to-end</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex flex-col h-full bg-[#0d0d14]">
        <ChatHeader convo={convo} onBack={onBack} onSearch={() => setShowSearch(true)} />
        <LockScreen conversationId={convo._id} name={convo.isGroup ? convo.name : convo.participants?.find(p => p._id !== user?._id)?.username || 'Chat'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d14] relative">
      <ChatHeader convo={convo} onBack={onBack} onSearch={() => setShowSearch(true)} />
      <PinnedBanner pinnedMessages={pinnedMsgs} conversationId={convo._id} />

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 relative" style={chatBgStyle(chatBackgrounds[convo._id])}>
        {showSearch && (
          <SearchOverlay conversationId={convo._id} onClose={() => setShowSearch(false)} />
        )}

        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center pb-3">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loadingMore && hasMore?.[convo._id] && msgs.length > 0 && (
          <div className="flex justify-center pb-3">
            <button
              onClick={() => {
                loadingMoreRef.current = true;
                prevScrollHeightRef.current = scrollRef.current?.scrollHeight || 0;
                fetchMessages(convo._id, msgs[0]?._id);
              }}
              className="flex items-center gap-1.5 text-xs text-[#555570] hover:text-violet-400 transition"
            >
              <ChevronsUp size={13} /> Load older messages
            </button>
          </div>
        )}

        {loadingMessages && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loadingMessages && msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a28] flex items-center justify-center mb-4">
              <Shield size={28} className="text-violet-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">Encryption active</p>
            <p className="text-xs text-[#555570]">Messages are encrypted before leaving your device</p>
          </div>
        )}

        {msgs.map((msg, i) => {
          const prevMsg = msgs[i - 1];
          const showDate = !prevMsg || !isSameDay(msg.createdAt, prevMsg.createdAt);
          const isMe = msg.sender?._id === user?._id || msg.sender?._id === 'me';
          const prevSameSender = prevMsg?.sender?._id === msg.sender?._id && !showDate;
          const showAvatar = !isMe && !prevSameSender;
          return (
            <Fragment key={msg._id}>
              {showDate && msg.createdAt && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-[#1e1e2e]" />
                  <span className="text-[11px] text-[#444460] bg-[#0d0d14] px-3 shrink-0">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-[#1e1e2e]" />
                </div>
              )}
              <MessageBubble
                msg={msg}
                isMe={isMe}
                showAvatar={showAvatar}
                prevSameSender={prevSameSender}
                conversationId={convo._id}
              />
            </Fragment>
          );
        })}

        <TypingIndicator names={typingNames} />
        <div ref={bottomRef} />
      </div>

      <MessageInput conversationId={convo._id} />
    </div>
  );
}
