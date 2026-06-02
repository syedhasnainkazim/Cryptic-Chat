import { useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../store/chatStore';

export default function useSocket() {
  const {
    receiveMessage, updateMessage, handleMessageDeleted,
    handleConversationUpdated, setTyping, setOnline, setOffline, expireMessage,
  } = useChatStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlers = {
      'message:new': ({ message, tempId, conversationId }) => {
        const { phantomMode, activeConversation } = useChatStore.getState();
        // In Crypt Silence mode, don't increment unread for background conversations
        if (phantomMode && activeConversation?._id !== conversationId) {
          receiveMessage(message, tempId, conversationId, true /* silent */);
        } else {
          receiveMessage(message, tempId, conversationId);
        }
      },
      'message:updated': ({ message, conversationId }) => updateMessage(message, conversationId),
      'message:deleted': ({ messageId, conversationId }) => handleMessageDeleted(messageId, conversationId),
      'message:expired': ({ messageId, conversationId }) => expireMessage(messageId, conversationId),
      'conversation:updated': ({ conversation }) => handleConversationUpdated(conversation),
      'typing:start': ({ userId, conversationId }) => setTyping(userId, conversationId, true),
      'typing:stop': ({ userId, conversationId }) => setTyping(userId, conversationId, false),
      'user:online': ({ userId }) => setOnline(userId),
      'user:offline': ({ userId }) => setOffline(userId),
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
  }, []);
}
