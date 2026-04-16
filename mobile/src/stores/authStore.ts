import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { StravaTokens, UserProfile } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: StravaTokens | null;
  user: UserProfile | null;

  hydrate: () => Promise<void>;
  setTokens: (tokens: StravaTokens) => Promise<void>;
  setUser: (user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const STORAGE_KEYS = {
  TOKENS: 'vincere_strava_tokens',
  USER: 'vincere_user_profile',
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  tokens: null,
  user: null,

  hydrate: async () => {
    try {
      const tokensRaw = await SecureStore.getItemAsync(STORAGE_KEYS.TOKENS);
      const userRaw = await SecureStore.getItemAsync(STORAGE_KEYS.USER);

      const tokens = tokensRaw ? (JSON.parse(tokensRaw) as StravaTokens) : null;
      const user = userRaw ? (JSON.parse(userRaw) as UserProfile) : null;

      set({
        tokens,
        user,
        isAuthenticated: !!tokens && !!user?.onboarded,
        isLoading: false,
      });
    } catch (err) {
      console.error('[auth] hydrate failed', err);
      set({ isLoading: false });
    }
  },

  setTokens: async (tokens) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
    set({ tokens });
  },

  setUser: async (user) => {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
    set({ user, isAuthenticated: !!user.onboarded });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKENS);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    set({ tokens: null, user: null, isAuthenticated: false });
  },
}));
