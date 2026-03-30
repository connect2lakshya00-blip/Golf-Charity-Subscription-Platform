import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  charity_id: string;
  charity_name: string;
  charity_contribution_percent: number;
  subscription_status?: string;
  subscription_plan?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  loading: false,

  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch {
      set({ user: null, token: null });
      localStorage.removeItem('token');
    } finally {
      set({ loading: false });
    }
  },
}));
