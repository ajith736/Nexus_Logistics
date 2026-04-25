import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      dark: false,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    {
      name: 'nexus-theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** Call once at app boot to sync <html> class with persisted preference. */
export function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
