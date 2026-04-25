import { create } from 'zustand';

let nextId = 0;

export const useToastStore = create((set) => ({
  toasts: [],

  addToast: ({ message, variant = 'default', duration = 3500 }) => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  return {
    success: (message) => addToast({ message, variant: 'success' }),
    error: (message) => addToast({ message, variant: 'error' }),
    info: (message) => addToast({ message, variant: 'default' }),
  };
}
