import { create } from 'zustand';
import type { UserProfile, UserGoal, GoalType } from '@/types';

interface UserState {
  profile: UserProfile | null;
  onboarded: boolean;

  setProfile: (profile: UserProfile) => void;
  updateGoal: (goal: UserGoal) => void;
  setMainGoal: (type: GoalType, targetDate?: string, raceName?: string) => void;
  completeOnboarding: () => void;
  reset: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  onboarded: false,

  setProfile: (profile) => set({ profile, onboarded: profile.onboarded }),

  updateGoal: (goal) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: { ...state.profile, mainGoal: goal },
      };
    }),

  setMainGoal: (type, targetDate, raceName) =>
    set((state) => {
      if (!state.profile) return state;
      const goal: UserGoal = {
        id: `goal_${Date.now()}`,
        type,
        targetDate,
        raceName,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      return {
        profile: { ...state.profile, mainGoal: goal },
      };
    }),

  completeOnboarding: () =>
    set((state) => ({
      onboarded: true,
      profile: state.profile ? { ...state.profile, onboarded: true } : null,
    })),

  reset: () => set({ profile: null, onboarded: false }),
}));
