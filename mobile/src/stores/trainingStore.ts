import { create } from 'zustand';
import type {
  StravaActivity,
  TrainingPlan,
  Workout,
  WorkoutFeedback,
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
  /** Attach user feedback to a specific workout by ID and mark it completed. */
  recordWorkoutFeedback: (workoutId: string, feedback: WorkoutFeedback) => void;
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

  recordWorkoutFeedback: (workoutId, feedback) =>
    set((state) => {
      if (!state.plan) return state;
      return {
        plan: {
          ...state.plan,
          weeks: state.plan.weeks.map((week) => ({
            ...week,
            workouts: week.workouts.map((w) =>
              w.id === workoutId ? { ...w, completed: true, feedback } : w,
            ),
          })),
        },
      };
    }),
}));
