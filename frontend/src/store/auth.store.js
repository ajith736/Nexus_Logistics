import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      dark: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken: refreshToken ?? null, user }),

      setAccessToken: (accessToken) => set({ accessToken }),

      patchUser: (fields) =>
        set((state) => ({ user: state.user ? { ...state.user, ...fields } : state.user })),

      toggleDark: () => set((s) => ({ dark: !s.dark })),

      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null, dark: false }),
    }),
    {
      name: 'nexus-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        dark: state.dark,
      }),
    }
  )
);
