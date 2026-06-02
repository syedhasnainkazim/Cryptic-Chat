import { create } from 'zustand';
import api from '../lib/api';

export const useContactStore = create((set, get) => ({
  contacts: [],
  pendingRequests: [],
  sentRequests: [],
  blockedUsers: [],
  savedContacts: [],  // [{userId, nickname, phone, notes}]
  searchResults: [],
  searching: false,

  fetchContacts: async () => {
    const { data } = await api.get('/contacts');
    set({
      contacts: data.contacts,
      pendingRequests: data.pendingRequests,
      sentRequests: data.sentRequests,
      blockedUsers: data.blockedUsers || [],
      savedContacts: data.savedContacts || [],
    });
  },

  search: async (q) => {
    if (!q.trim()) { set({ searchResults: [] }); return; }
    set({ searching: true });
    const { data } = await api.get(`/contacts/search?q=${encodeURIComponent(q)}`);
    set({ searchResults: data.users, searching: false });
  },

  sendRequest: async (userId) => {
    await api.post(`/contacts/request/${userId}`);
    set(s => ({ sentRequests: [...s.sentRequests, { _id: userId }] }));
  },

  acceptRequest: async (userId) => {
    await api.put(`/contacts/accept/${userId}`);
    await get().fetchContacts();
  },

  declineRequest: async (userId) => {
    await api.put(`/contacts/decline/${userId}`);
    set(s => ({ pendingRequests: s.pendingRequests.filter(u => u._id !== userId) }));
  },

  removeContact: async (userId) => {
    await api.delete(`/contacts/${userId}`);
    set(s => ({ contacts: s.contacts.filter(u => u._id !== userId) }));
  },

  blockUser: async (userId) => {
    await api.put(`/contacts/block/${userId}`);
    set(s => ({
      contacts: s.contacts.filter(u => u._id !== userId),
      blockedUsers: [...s.blockedUsers, { _id: userId }],
    }));
  },

  unblockUser: async (userId) => {
    await api.put(`/contacts/unblock/${userId}`);
    set(s => ({ blockedUsers: s.blockedUsers.filter(u => u._id !== userId) }));
  },

  saveContactInfo: async (userId, info) => {
    const { data } = await api.put(`/contacts/${userId}/info`, info);
    set(s => {
      const existing = s.savedContacts.findIndex(c => c.userId === userId);
      if (existing >= 0) {
        const updated = [...s.savedContacts];
        updated[existing] = { ...updated[existing], ...info };
        return { savedContacts: updated };
      }
      return { savedContacts: [...s.savedContacts, { userId, ...info }] };
    });
    return data.savedContact;
  },

  getSavedInfo: (userId) => {
    return get().savedContacts.find(c => c.userId?.toString() === userId?.toString()) || null;
  },

  isBlocked: (userId) => get().blockedUsers.some(u => u._id === userId),
}));
