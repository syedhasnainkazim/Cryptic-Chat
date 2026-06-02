import { create } from 'zustand';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { encrypt, decrypt, deriveKey, deriveGroupKey } from '../lib/crypto';

const getUserId = () => {
  try { return JSON.parse(atob(localStorage.getItem('cc_token').split('.')[1])).id; } catch { return null; }
};

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  hasMore: {},
  typingUsers: {},
  onlineUsers: new Set(),
  replyingTo: null,
  searchQuery: '',
  loadingConvos: false,
  loadingMessages: false,
  loadingMore: false,
  unlockedChats: new Set(),
  phantomMode: false, // "Crypt Silence" — suppresses notification toasts
  chatBackgrounds: JSON.parse(localStorage.getItem('cc_chat_bgs') || '{}'),

  togglePhantomMode: () => set(s => ({ phantomMode: !s.phantomMode })),

  setChatBackground: (conversationId, bg) => set(s => {
    const next = { ...s.chatBackgrounds, [conversationId]: bg };
    localStorage.setItem('cc_chat_bgs', JSON.stringify(next));
    return { chatBackgrounds: next };
  }),

  fetchConversations: async () => {
    set({ loadingConvos: true });
    const { data } = await api.get('/conversations');
    set({ conversations: data.conversations, loadingConvos: false });
  },

  setActiveConversation: async (convo) => {
    set({ activeConversation: convo, replyingTo: null });
    if (!convo) return;
    if (!get().messages[convo._id]) await get().fetchMessages(convo._id);
    const socket = getSocket();
    socket?.emit('message:read', { conversationId: convo._id });
    api.put(`/conversations/${convo._id}/read`).catch(() => {});
    // Reset unread in local state
    set(s => ({
      conversations: s.conversations.map(c =>
        c._id === convo._id ? { ...c, unreadCounts: { ...(c.unreadCounts || {}), [getUserId()]: 0 } } : c
      ),
    }));
  },

  fetchMessages: async (conversationId, before = null) => {
    if (before) {
      set({ loadingMore: true });
    } else {
      set({ loadingMessages: true });
    }
    const params = before ? `?before=${before}&limit=50` : '?limit=50';
    const { data } = await api.get(`/conversations/${conversationId}/messages${params}`);
    const convo = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
    const msgs = data.messages.map(m => get()._decryptMsg(m, convo));
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: before
          ? [...msgs, ...(s.messages[conversationId] || [])]
          : msgs,
      },
      hasMore: { ...s.hasMore, [conversationId]: data.messages.length >= 50 },
      ...(before ? { loadingMore: false } : { loadingMessages: false }),
    }));
  },

  sendMessage: (text, options = {}) => {
    const { activeConversation, replyingTo } = get();
    if (!activeConversation) return;
    const socket = getSocket();
    const key = get()._getKey(activeConversation);
    const { encryptedContent, iv } = encrypt(text, key);
    const tempId = Date.now().toString();

    const payload = { conversationId: activeConversation._id, encryptedContent, iv, tempId };
    if (replyingTo) {
      const replySnippet = encrypt(replyingTo.decryptedText || '', key);
      payload.replyTo = {
        messageId: replyingTo._id,
        senderUsername: replyingTo.sender?.username,
        snippet: replySnippet.encryptedContent,
        snippetIv: replySnippet.iv,
      };
    }
    if (options.expiresInSeconds) payload.expiresInSeconds = options.expiresInSeconds;

    // Optimistic UI
    const tempMsg = {
      _id: tempId, tempId,
      sender: { _id: 'me' },
      decryptedText: text,
      createdAt: new Date().toISOString(),
      pending: true,
      replyTo: replyingTo ? { senderUsername: replyingTo.sender?.username, snippet: replyingTo.decryptedText } : null,
    };
    set(s => ({
      messages: { ...s.messages, [activeConversation._id]: [...(s.messages[activeConversation._id] || []), tempMsg] },
      replyingTo: null,
    }));
    socket?.emit('message:send', payload);
  },

  sendFile: async (file) => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    const socket = getSocket();
    const key = get()._getKey(activeConversation);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const isImage = file.type.startsWith('image/');
        const { encryptedContent, iv } = encrypt(isImage ? 'image' : 'file', key);
        const tempId = Date.now().toString();
        socket?.emit('message:send', {
          conversationId: activeConversation._id,
          encryptedContent,
          iv,
          tempId,
          type: isImage ? 'image' : 'file',
          fileUrl: dataUrl,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  sendGif: (gifUrl) => {
    const { activeConversation } = get();
    if (!activeConversation) return;
    const socket = getSocket();
    const key = get()._getKey(activeConversation);
    const { encryptedContent, iv } = encrypt('gif', key);
    const tempId = Date.now().toString();
    socket?.emit('message:send', {
      conversationId: activeConversation._id,
      encryptedContent,
      iv,
      tempId,
      type: 'gif',
      fileUrl: gifUrl,
    });
  },

  reactToMessage: (messageId, emoji, conversationId) => {
    getSocket()?.emit('message:react', { messageId, emoji, conversationId });
  },

  editMessage: (messageId, newText, conversationId) => {
    const convo = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
    const key = get()._getKey(convo);
    const { encryptedContent, iv } = encrypt(newText, key);
    getSocket()?.emit('message:edit', { messageId, encryptedContent, iv, conversationId });
  },

  deleteMessage: (messageId, conversationId) => {
    getSocket()?.emit('message:delete', { messageId, conversationId });
  },

  pinMessage: (messageId, conversationId, pin = true) => {
    getSocket()?.emit('message:pin', { messageId, conversationId, pin });
  },

  setDisappearing: async (conversationId, seconds) => {
    const { data } = await api.put(`/conversations/${conversationId}/disappearing`, { seconds });
    getSocket()?.emit('conversation:disappearing', { conversationId, seconds });
    set(s => ({
      conversations: s.conversations.map(c => c._id === conversationId ? { ...c, disappearingTimer: seconds } : c),
      activeConversation: s.activeConversation?._id === conversationId
        ? { ...s.activeConversation, disappearingTimer: seconds } : s.activeConversation,
    }));
  },

  setReplyingTo: (msg) => set({ replyingTo: msg }),
  clearReply: () => set({ replyingTo: null }),

  unlockChat: (conversationId) => set(s => {
    const next = new Set(s.unlockedChats);
    next.add(conversationId);
    return { unlockedChats: next };
  }),

  receiveMessage: (msg, tempId, conversationId, silent = false) => {
    const convo = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
    const decrypted = get()._decryptMsg(msg, convo);
    const activeId = get().activeConversation?._id;
    const isActive = activeId === conversationId;
    set(s => {
      const existing = s.messages[conversationId] || [];
      const filtered = tempId ? existing.filter(m => m.tempId !== tempId) : existing;
      const uid = getUserId();
      return {
        messages: { ...s.messages, [conversationId]: [...filtered, decrypted] },
        conversations: s.conversations.map(c =>
          c._id === conversationId
            ? {
                ...c,
                lastMessage: msg,
                updatedAt: new Date().toISOString(),
                unreadCounts: (isActive || silent)
                  ? c.unreadCounts
                  : { ...(c.unreadCounts || {}), [uid]: ((c.unreadCounts?.[uid] || c.unreadCounts?.get?.(uid) || 0) + 1) },
              }
            : c
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      };
    });
    if (isActive) getSocket()?.emit('message:read', { conversationId });
  },

  updateMessage: (msg, conversationId) => {
    const convo = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
    const decrypted = get()._decryptMsg(msg, convo);
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m => m._id === msg._id ? decrypted : m),
      },
    }));
  },

  handleMessageDeleted: (messageId, conversationId) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).map(m =>
          m._id === messageId ? { ...m, deletedForEveryone: true, decryptedText: '' } : m
        ),
      },
    }));
  },

  handleConversationUpdated: (convo) => {
    set(s => ({
      conversations: s.conversations.map(c => c._id === convo._id ? { ...c, ...convo } : c),
      activeConversation: s.activeConversation?._id === convo._id ? { ...s.activeConversation, ...convo } : s.activeConversation,
    }));
  },

  expireMessage: (messageId, conversationId) => {
    set(s => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] || []).filter(m => m._id !== messageId),
      },
    }));
  },

  setTyping: (userId, conversationId, isTyping) => {
    set(s => {
      const prev = s.typingUsers[conversationId] || [];
      const next = isTyping ? [...new Set([...prev, userId])] : prev.filter(id => id !== userId);
      return { typingUsers: { ...s.typingUsers, [conversationId]: next } };
    });
  },

  setOnline: (userId) => set(s => { const n = new Set(s.onlineUsers); n.add(userId); return { onlineUsers: n }; }),
  setOffline: (userId) => set(s => { const n = new Set(s.onlineUsers); n.delete(userId); return { onlineUsers: n }; }),

  getOrCreateDM: async (userId) => {
    const { data } = await api.post(`/conversations/dm/${userId}`);
    const convo = data.conversation;
    set(s => ({ conversations: s.conversations.find(c => c._id === convo._id) ? s.conversations : [convo, ...s.conversations] }));
    return convo;
  },

  createGroup: async (name, participantIds) => {
    const { data } = await api.post('/conversations/group', { name, participantIds });
    const convo = data.conversation;
    set(s => ({ conversations: [convo, ...s.conversations] }));
    getSocket()?.emit('room:join', { conversationId: convo._id });
    return convo;
  },

  deleteConversation: async (conversationId) => {
    await api.delete(`/conversations/${conversationId}`);
    set(s => {
      const msgs = { ...s.messages };
      delete msgs[conversationId];
      return {
        conversations: s.conversations.filter(c => c._id !== conversationId),
        messages: msgs,
        activeConversation: s.activeConversation?._id === conversationId ? null : s.activeConversation,
      };
    });
  },

  getUnreadCount: (conversationId) => {
    const uid = getUserId();
    const convo = get().conversations.find(c => c._id === conversationId);
    if (!convo?.unreadCounts) return 0;
    return typeof convo.unreadCounts.get === 'function'
      ? (convo.unreadCounts.get(uid) || 0)
      : (convo.unreadCounts[uid] || 0);
  },

  _getKey: (convo) => {
    const userId = getUserId();
    if (!convo) return '';
    if (convo.isGroup) return deriveGroupKey(convo._id);
    const other = convo.participants?.find(p => p._id !== userId);
    return deriveKey(userId, other?._id || '');
  },

  _decryptMsg: (msg, convo) => {
    if (!convo || msg.type === 'system' || msg.deletedForEveryone) return { ...msg, decryptedText: msg.deletedForEveryone ? '' : msg.encryptedContent };
    try {
      const key = get()._getKey(convo);
      const text = msg.type === 'image' || msg.type === 'file' ? '' : decrypt(msg.encryptedContent, msg.iv, key);
      let replySnippet = null;
      if (msg.replyTo?.snippet && msg.replyTo?.snippetIv) {
        try { replySnippet = decrypt(msg.replyTo.snippet, msg.replyTo.snippetIv, key); } catch {}
      }
      return { ...msg, decryptedText: text, replySnippet };
    } catch {
      return { ...msg, decryptedText: '[encrypted]' };
    }
  },
}));
