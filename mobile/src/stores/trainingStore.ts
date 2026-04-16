import { create } from 'zustand';
import type {
  StravaActivity,
  TrainingPlan,
  Workout,
  WeeklyStats,
  FitnessMetrics,
  CoachInsight,
  PerformanceRecord,
} from '@/types';

interface TrainingState {
  activities: StravaActivity[];
  plan: TrainingPlan | null;
  todayWorkout: Workout | null;
  weeklyStats: WeeklyStats[];
  metrics: FitnessMetrics | null;
  insights: CoachInsight[];
  records: PerformanceRecord[];
  lastSyncAt: string | null;
  isSyncing: boolean;

  setActivities: (activities: StravaActivity[]) => void;
  setPlan: (plan: TrainingPlan | null) => void;
  setTodayWorkout: (workout: Workout | null) => void;
  setWeeklyStats: (stats: WeeklyStats[]) => void;
  setMetrics: (metrics: FitnessMetrics) => void;
  addInsight: (insight: CoachInsight) => void;
  markInsightRead: (id: string) => void;
  setRecords: (records: PerformanceRecord[]) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSync: (iso: string) => void;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  activities: [],
  plan: null,
  todayWorkout: null,
  weeklyStats: [],
  metrics: null,
  insights: [],
  records: [],
  lastSyncAt: null,
  isSyncing: false,

  setActivities: (activities) => set({ activities }),
  setPlan: (plan) => set({ plan }),
  setTodayWorkout: (todayWorkout) => set({ todayWorkout }),
  setWeeklyStats: (weeklyStats) => set({ weeklyStats }),
  setMetrics: (metrics) => set({ metrics }),
  addInsight: (insight) =>
    set((state) => ({ insights: [insight, ...state.insights].slice(0, 20) })),
  markInsightRead: (id) =>
    set((state) => ({
      insights: state.insights.map((i) => (i.id === id ? { ...i, read: true } : i)),
    })),
  setRecords: (records) => set({ records }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSync: (iso) => set({ lastSyncAt: iso }),
}));
