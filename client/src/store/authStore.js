import { create } from 'zustand';
import api from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('cc_token') || null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('cc_token');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, loading: false });
      connectSocket(token);
    } catch {
      localStorage.removeItem('cc_token');
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cc_token', data.token);
    set({ user: data.user, token: data.token });
    connectSocket(data.token);
    return data.user;
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('cc_token', data.token);
    set({ user: data.user, token: data.token });
    connectSocket(data.token);
    return data.user;
  },

  logout: () => {
    localStorage.removeItem('cc_token');
    disconnectSocket();
    set({ user: null, token: null });
  },

  updateUser: (fields) => set(s => ({ user: { ...s.user, ...fields } })),
}));
