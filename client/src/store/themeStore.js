import { create } from 'zustand';

const stored = localStorage.getItem('cc_theme') || 'dark';
document.documentElement.setAttribute('data-theme', stored);

export const useThemeStore = create((set, get) => ({
  theme: stored,

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cc_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },
}));
